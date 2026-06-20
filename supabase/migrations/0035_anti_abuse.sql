-- 0035 — Anti-abus : rate-limiting léger + blocage de joueurs.
-- À exécuter dans le SQL Editor de Supabase après 0034.
--
-- Les RPC visées (send_friend_request, submit_report, search_users) sont toutes
-- réservées aux utilisateurs authentifiés : un limiteur PAR UTILISATEUR
-- (auth.uid()) couvre l'abus sans infra. Un vrai « par IP » distribué
-- demanderait Redis/edge, hors périmètre « léger ».

-- ===========================================================================
-- 1. RATE-LIMITING (fenêtre fixe par (utilisateur, action))
-- ===========================================================================
create table if not exists public.rate_limits (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  action       text not null,
  window_start timestamptz not null default now(),
  count        int not null default 0,
  primary key (user_id, action)
);

-- RLS activée, aucune policy : la table n'est touchée que par rl_hit (definer).
alter table public.rate_limits enable row level security;

-- Incrémente le compteur de l'action pour l'appelant et lève si le plafond est
-- dépassé dans la fenêtre. Appelée uniquement par d'autres fonctions definer
-- (pas de grant : current_user = propriétaire au moment de l'appel imbriqué).
create or replace function public.rl_hit(p_action text, p_max int, p_window interval)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;

  insert into public.rate_limits as rl (user_id, action, window_start, count)
    values (v_uid, p_action, now(), 1)
  on conflict (user_id, action) do update
    set count = case
          when rl.window_start < now() - p_window then 1
          else rl.count + 1
        end,
        window_start = case
          when rl.window_start < now() - p_window then now()
          else rl.window_start
        end
  returning count into v_count;

  if v_count > p_max then
    raise exception 'Trop de requêtes, réessaie dans un instant.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- ===========================================================================
-- 2. BLOCAGE (dirigé : blocker → blocked ; effets appliqués dans les deux sens)
-- ===========================================================================
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Bloque un joueur : enregistre le blocage ET coupe tout lien social existant
-- (amitié + demandes + notifications d'ami, dans les deux sens).
create or replace function public.block_user(p_target uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_target = v_uid then raise exception 'Impossible de se bloquer soi-même'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'Joueur introuvable';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
    values (v_uid, p_target)
    on conflict (blocker_id, blocked_id) do nothing;

  delete from public.friendships
    where (requester_id = v_uid and addressee_id = p_target)
       or (requester_id = p_target and addressee_id = v_uid);

  delete from public.notifications
    where type in ('friend_request', 'friend_accept')
      and ((user_id = v_uid and actor_id = p_target)
        or (user_id = p_target and actor_id = v_uid));

  return true;
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  delete from public.blocks where blocker_id = v_uid and blocked_id = p_target;
  return true;
end;
$$;

-- Joueurs que l'appelant a bloqués (pour un éventuel écran de gestion).
create or replace function public.my_blocks()
returns table (id uuid, username text, avatar_url text, created_at timestamptz)
language sql security definer set search_path = public stable
as $$
  select p.id, p.username, p.avatar_url, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

grant execute on function public.block_user(uuid)   to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.my_blocks()        to authenticated;

-- ===========================================================================
-- 3. INTÉGRATION dans les RPC existantes (rate-limit + respect des blocages)
-- ===========================================================================

-- search_users : limité (40/min — la recherche est un submit, pas un keystroke)
-- et exclut les joueurs bloqués (deux sens). Passe en plpgsql (l'écriture du
-- compteur interdit `stable`).
create or replace function public.search_users(p_query text)
returns table (
  id              uuid,
  username        text,
  avatar_url      text,
  equipped_title  text,
  equipped_color  text,
  equipped_badge  text,
  relation        text
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.rl_hit('search_users', 40, interval '1 minute');

  return query
    select p.id, p.username, p.avatar_url,
           p.equipped_title, p.equipped_color, p.equipped_badge,
           public.friendship_status(p.id) as relation
    from public.profiles p
    where p.id <> auth.uid()
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = auth.uid())
      )
      and char_length(trim(coalesce(p_query, ''))) >= 1
      and p.username ilike '%' || trim(p_query) || '%'
    order by
      (lower(p.username) = lower(trim(p_query))) desc,
      (lower(p.username) like lower(trim(p_query)) || '%') desc,
      p.username
    limit 20;
end;
$$;

grant execute on function public.search_users(text) to authenticated;

-- submit_report : limité (10/h).
create or replace function public.submit_report(
  p_category text,
  p_title    text,
  p_message  text,
  p_page_url text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  perform public.rl_hit('submit_report', 10, interval '1 hour');
  if p_category not in ('bug', 'suggestion', 'other') then
    raise exception 'Catégorie invalide';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Titre trop court';
  end if;
  if char_length(trim(coalesce(p_message, ''))) < 5 then
    raise exception 'Message trop court';
  end if;

  insert into public.reports (user_id, category, title, message, page_url)
    values (v_uid, p_category, trim(p_title), trim(p_message), nullif(trim(coalesce(p_page_url, '')), ''))
    returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_report(text, text, text, text) to authenticated;

-- send_friend_request : limité (20/h) + refuse si l'un des deux a bloqué l'autre.
create or replace function public.send_friend_request(p_target uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_target = v_uid then raise exception 'Impossible de s''ajouter soi-même'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'Joueur introuvable';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = v_uid and blocked_id = p_target)
       or (blocker_id = p_target and blocked_id = v_uid)
  ) then
    raise exception 'Action impossible';
  end if;
  perform public.rl_hit('friend_request', 20, interval '1 hour');

  -- Déjà amis ?
  if exists (
    select 1 from public.friendships where status = 'accepted'
      and ((requester_id = v_uid and addressee_id = p_target)
        or (requester_id = p_target and addressee_id = v_uid))
  ) then
    return 'friends';
  end if;

  -- Demande inverse en attente → on l'accepte directement.
  if exists (
    select 1 from public.friendships
    where status = 'pending' and requester_id = p_target and addressee_id = v_uid
  ) then
    update public.friendships set status = 'accepted', updated_at = now()
      where requester_id = p_target and addressee_id = v_uid;
    update public.notifications
      set read_at = coalesce(read_at, now()), resolved_at = now()
      where user_id = v_uid and type = 'friend_request'
        and actor_id = p_target and resolved_at is null;
    insert into public.notifications (user_id, type, actor_id, actionable)
      values (p_target, 'friend_accept', v_uid, false);
    return 'friends';
  end if;

  -- Nouvelle demande, idempotente côté amitié ET notification.
  insert into public.friendships (requester_id, addressee_id, status)
    values (v_uid, p_target, 'pending')
    on conflict (requester_id, addressee_id) do nothing;
  insert into public.notifications (user_id, type, actor_id, actionable)
    values (p_target, 'friend_request', v_uid, true)
    on conflict (user_id, actor_id, type) where actionable and resolved_at is null
    do nothing;
  return 'pending_out';
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

-- profile_overview : masque le profil si la cible m'a bloqué (→ aucune ligne,
-- donc notFound côté app) et expose `blocked` = « je l'ai bloqué » pour que la
-- page affiche l'état bloqué + le bouton Débloquer. Type de retour modifié →
-- drop + recreate.
drop function if exists public.profile_overview(text);

create function public.profile_overview(p_username text)
returns table (
  id                       uuid,
  username                 text,
  avatar_url               text,
  equipped_frame           text,
  equipped_title           text,
  equipped_color           text,
  equipped_badge           text,
  created_at               timestamptz,
  relation                 text,
  predictions_visibility   text,
  stats_visibility         text,
  achievements_visibility  text,
  friends_visibility       text,
  friend_count             bigint,
  lifetime_points          bigint,
  exact_scores             bigint,
  achievement_keys         text[],
  blocked                  boolean
)
language sql security definer set search_path = public stable
as $$
  with base as (
    select p.*, public.friendship_status(p.id) as rel
    from public.profiles p
    where lower(p.username) = lower(trim(coalesce(p_username, '')))
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = p.id and b.blocked_id = auth.uid()
      )
  )
  select
    b.id, b.username, b.avatar_url,
    b.equipped_frame, b.equipped_title, b.equipped_color, b.equipped_badge,
    b.created_at, b.rel,
    b.predictions_visibility, b.stats_visibility,
    b.achievements_visibility, b.friends_visibility,
    case when public.can_see(b.friends_visibility, b.rel) then
      (select count(*) from public.friendships
        where status = 'accepted' and (requester_id = b.id or addressee_id = b.id))::bigint
    end,
    case when public.can_see(b.stats_visibility, b.rel) then
      coalesce((select sum(points) from public.predictions
        where user_id = b.id and points is not null), 0)::bigint
    end,
    case when public.can_see(b.stats_visibility, b.rel) then
      coalesce((select count(*) from public.predictions
        where user_id = b.id and base_points = 10), 0)::bigint
    end,
    case when public.can_see(b.achievements_visibility, b.rel) then
      coalesce((select array_agg(key) from public.user_achievements where user_id = b.id), '{}')
    end,
    exists (
      select 1 from public.blocks bk
      where bk.blocker_id = auth.uid() and bk.blocked_id = b.id
    )
  from base b;
$$;

grant execute on function public.profile_overview(text) to authenticated;
