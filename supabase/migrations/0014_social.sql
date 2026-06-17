-- Mugen — Couche sociale : amis, notifications, visibilité des pronostics.
-- À exécuter dans le SQL Editor de Supabase APRÈS 0013.
--
-- Modèle d'accès (cf. 0005_groups.sql) : `friendships` et `notifications` sont
-- verrouillées (RLS activée, aucune policy) ; tout passe par des RPC
-- `security definer`. Ces fonctions peuvent lire les pronos/succès d'autrui
-- (que la RLS interdit en direct) en appliquant elles-mêmes la règle de
-- visibilité choisie par le joueur.

-- ===========================================================================
-- PROFILES — réglage de confidentialité des pronostics
-- ===========================================================================
alter table public.profiles
  add column if not exists predictions_visibility text not null default 'friends'
  check (predictions_visibility in ('everyone', 'friends', 'private'));

create or replace function public.set_predictions_visibility(p_value text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if p_value not in ('everyone', 'friends', 'private') then
    raise exception 'Valeur invalide';
  end if;
  update public.profiles set predictions_visibility = p_value where id = auth.uid();
  return true;
end;
$$;

-- ===========================================================================
-- AMITIÉS (dirigées : requester → addressee ; lues dans les deux sens)
-- ===========================================================================
create table if not exists public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

-- ===========================================================================
-- NOTIFICATIONS (centre générique, extensible)
-- ===========================================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in ('friend_request', 'friend_accept')),
  actor_id   uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- Statut relationnel entre l'appelant et un autre joueur.
--   none | pending_out (j'ai demandé) | pending_in (on m'a demandé) | friends
-- ---------------------------------------------------------------------------
create or replace function public.friendship_status(p_other uuid)
returns text language sql security definer set search_path = public stable
as $$
  select case
    when p_other = auth.uid() then 'self'
    when exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = p_other)
          or (requester_id = p_other and addressee_id = auth.uid()))
    ) then 'friends'
    when exists (
      select 1 from public.friendships
      where status = 'pending' and requester_id = auth.uid() and addressee_id = p_other
    ) then 'pending_out'
    when exists (
      select 1 from public.friendships
      where status = 'pending' and requester_id = p_other and addressee_id = auth.uid()
    ) then 'pending_in'
    else 'none'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Recherche de joueurs par sous-chaîne de pseudo (avec statut relationnel).
-- ---------------------------------------------------------------------------
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
language sql security definer set search_path = public stable
as $$
  select p.id, p.username, p.avatar_url,
         p.equipped_title, p.equipped_color, p.equipped_badge,
         public.friendship_status(p.id) as relation
  from public.profiles p
  where p.id <> auth.uid()
    and char_length(trim(coalesce(p_query, ''))) >= 1
    and p.username ilike '%' || trim(p_query) || '%'
  order by
    (lower(p.username) = lower(trim(p_query))) desc,
    (lower(p.username) like lower(trim(p_query)) || '%') desc,
    p.username
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Envoyer une demande d'ami (ou accepter une demande inverse existante).
-- ---------------------------------------------------------------------------
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
    update public.notifications set read_at = now()
      where user_id = v_uid and type = 'friend_request' and actor_id = p_target and read_at is null;
    insert into public.notifications (user_id, type, actor_id)
      values (p_target, 'friend_accept', v_uid);
    return 'friends';
  end if;

  -- Nouvelle demande (idempotent), + notification pour la cible.
  insert into public.friendships (requester_id, addressee_id, status)
    values (v_uid, p_target, 'pending')
    on conflict (requester_id, addressee_id) do nothing;
  insert into public.notifications (user_id, type, actor_id)
    values (p_target, 'friend_request', v_uid);
  return 'pending_out';
end;
$$;

-- ---------------------------------------------------------------------------
-- Répondre à une demande reçue (accepter ou refuser).
-- ---------------------------------------------------------------------------
create or replace function public.respond_friend_request(p_requester uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;

  if not exists (
    select 1 from public.friendships
    where requester_id = p_requester and addressee_id = v_uid and status = 'pending'
  ) then
    return false;
  end if;

  -- La notification de demande est consommée dans tous les cas.
  update public.notifications set read_at = now()
    where user_id = v_uid and type = 'friend_request' and actor_id = p_requester and read_at is null;

  if p_accept then
    update public.friendships set status = 'accepted', updated_at = now()
      where requester_id = p_requester and addressee_id = v_uid;
    insert into public.notifications (user_id, type, actor_id)
      values (p_requester, 'friend_accept', v_uid);
  else
    delete from public.friendships
      where requester_id = p_requester and addressee_id = v_uid;
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Annuler une demande sortante.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_friend_request(p_target uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  delete from public.friendships
    where requester_id = v_uid and addressee_id = p_target and status = 'pending';
  delete from public.notifications
    where user_id = p_target and type = 'friend_request' and actor_id = v_uid and read_at is null;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retirer un ami (supprime l'amitié dans les deux sens).
-- ---------------------------------------------------------------------------
create or replace function public.remove_friend(p_other uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  delete from public.friendships
    where status = 'accepted'
      and ((requester_id = v_uid and addressee_id = p_other)
        or (requester_id = p_other and addressee_id = v_uid));
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mes amis (avec points cumulés + clés de succès → niveau calculé côté app).
-- ---------------------------------------------------------------------------
create or replace function public.my_friends()
returns table (
  id               uuid,
  username         text,
  avatar_url       text,
  equipped_frame   text,
  equipped_title   text,
  equipped_color   text,
  equipped_badge   text,
  lifetime_points  bigint,
  achievement_keys text[]
)
language sql security definer set search_path = public stable
as $$
  with friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from public.friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select
    p.id, p.username, p.avatar_url,
    p.equipped_frame, p.equipped_title, p.equipped_color, p.equipped_badge,
    coalesce((select sum(points) from public.predictions where user_id = p.id and points is not null), 0)::bigint,
    coalesce((select array_agg(key) from public.user_achievements where user_id = p.id), '{}')
  from friends f
  join public.profiles p on p.id = f.fid
  order by p.username;
$$;

-- ---------------------------------------------------------------------------
-- Aperçu d'un profil public (par pseudo), avec statut relationnel.
-- ---------------------------------------------------------------------------
create or replace function public.profile_overview(p_username text)
returns table (
  id                     uuid,
  username               text,
  avatar_url             text,
  equipped_frame         text,
  equipped_title         text,
  equipped_color         text,
  equipped_badge         text,
  created_at             timestamptz,
  predictions_visibility text,
  friend_count           bigint,
  lifetime_points        bigint,
  achievement_keys       text[],
  relation               text
)
language sql security definer set search_path = public stable
as $$
  select
    p.id, p.username, p.avatar_url,
    p.equipped_frame, p.equipped_title, p.equipped_color, p.equipped_badge,
    p.created_at, p.predictions_visibility,
    (select count(*) from public.friendships
      where status = 'accepted' and (requester_id = p.id or addressee_id = p.id))::bigint,
    coalesce((select sum(points) from public.predictions where user_id = p.id and points is not null), 0)::bigint,
    coalesce((select array_agg(key) from public.user_achievements where user_id = p.id), '{}'),
    public.friendship_status(p.id)
  from public.profiles p
  where lower(p.username) = lower(trim(coalesce(p_username, '')));
$$;

-- ---------------------------------------------------------------------------
-- Pronostics à venir d'un joueur — soumis à sa règle de visibilité.
-- ---------------------------------------------------------------------------
create or replace function public.user_upcoming_predictions(p_uid uuid)
returns table (
  fixture_id   bigint,
  home_team    text,
  away_team    text,
  home_logo    text,
  away_logo    text,
  league_name  text,
  league_logo  text,
  kickoff      timestamptz,
  home_goals   int,
  away_goals   int
)
language plpgsql security definer set search_path = public stable
as $$
declare
  v_uid uuid := auth.uid();
  v_vis text;
  v_allowed boolean;
begin
  if v_uid is null then return; end if;
  select predictions_visibility into v_vis from public.profiles where id = p_uid;
  if v_vis is null then return; end if;

  v_allowed := (p_uid = v_uid)
    or (v_vis = 'everyone')
    or (v_vis = 'friends' and exists (
          select 1 from public.friendships where status = 'accepted'
            and ((requester_id = v_uid and addressee_id = p_uid)
              or (requester_id = p_uid and addressee_id = v_uid))
       ));
  if not v_allowed then return; end if;

  return query
    select f.id, f.home_team, f.away_team, f.home_logo, f.away_logo,
           f.league_name, f.league_logo, f.kickoff, pr.home_goals, pr.away_goals
    from public.predictions pr
    join public.fixtures f on f.id = pr.fixture_id
    where pr.user_id = p_uid
      and f.status = 'upcoming'
      and f.kickoff > now()
    order by f.kickoff;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications de l'appelant (+ profil de l'acteur, flag "encore pending").
-- ---------------------------------------------------------------------------
create or replace function public.my_notifications()
returns table (
  id             uuid,
  type           text,
  actor_id       uuid,
  actor_username text,
  actor_avatar   text,
  created_at     timestamptz,
  read_at        timestamptz,
  pending        boolean
)
language sql security definer set search_path = public stable
as $$
  select
    n.id, n.type, n.actor_id, a.username, a.avatar_url, n.created_at, n.read_at,
    case when n.type = 'friend_request' then exists (
      select 1 from public.friendships
      where status = 'pending' and requester_id = n.actor_id and addressee_id = n.user_id
    ) else false end as pending
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit 50;
$$;

create or replace function public.unread_notification_count()
returns bigint language sql security definer set search_path = public stable
as $$
  select count(*)::bigint from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;

create or replace function public.mark_notifications_read()
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  update public.notifications set read_at = now()
    where user_id = auth.uid() and read_at is null;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
grant execute on function public.set_predictions_visibility(text)        to authenticated;
grant execute on function public.friendship_status(uuid)                 to authenticated;
grant execute on function public.search_users(text)                      to authenticated;
grant execute on function public.send_friend_request(uuid)               to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean)   to authenticated;
grant execute on function public.cancel_friend_request(uuid)             to authenticated;
grant execute on function public.remove_friend(uuid)                     to authenticated;
grant execute on function public.my_friends()                            to authenticated;
grant execute on function public.profile_overview(text)                  to authenticated;
grant execute on function public.user_upcoming_predictions(uuid)         to authenticated;
grant execute on function public.my_notifications()                      to authenticated;
grant execute on function public.unread_notification_count()             to authenticated;
grant execute on function public.mark_notifications_read()               to authenticated;
