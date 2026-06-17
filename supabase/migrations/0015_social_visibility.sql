-- Mugen — Couche sociale (suite) : visibilité granulaire par aspect du profil
-- + liste des demandes d'amis en attente.
-- À exécuter dans le SQL Editor de Supabase APRÈS 0014.
--
-- 0014 ne gère qu'une visibilité (les pronostics). Ici chaque ASPECT du profil
-- — pronostics, statistiques, succès, liste d'amis — devient réglable
-- indépendamment en 'everyone' | 'friends' | 'private'. Le filtrage est
-- appliqué côté serveur dans `profile_overview` (security definer) : un aspect
-- non autorisé revient à NULL, jamais exposé au client.

-- ===========================================================================
-- PROFILES — visibilité par aspect (predictions_visibility existe déjà en 0014)
-- ===========================================================================
alter table public.profiles
  add column if not exists stats_visibility text not null default 'everyone'
    check (stats_visibility in ('everyone', 'friends', 'private')),
  add column if not exists achievements_visibility text not null default 'everyone'
    check (achievements_visibility in ('everyone', 'friends', 'private')),
  add column if not exists friends_visibility text not null default 'friends'
    check (friends_visibility in ('everyone', 'friends', 'private'));

-- ---------------------------------------------------------------------------
-- Règle de visibilité : l'appelant (relation donnée) peut-il voir un aspect ?
--   relation ∈ {self, friends, pending_out, pending_in, none} (cf. 0014)
-- ---------------------------------------------------------------------------
create or replace function public.can_see(p_visibility text, p_relation text)
returns boolean language sql immutable set search_path = public
as $$
  select case
    when p_relation = 'self'        then true
    when p_visibility = 'everyone'  then true
    when p_visibility = 'friends'   then p_relation = 'friends'
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Setter généralisé : règle la visibilité d'un aspect pour l'appelant.
-- ---------------------------------------------------------------------------
create or replace function public.set_profile_visibility(p_aspect text, p_value text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if p_value not in ('everyone', 'friends', 'private') then
    raise exception 'Valeur invalide';
  end if;
  case p_aspect
    when 'predictions'  then update public.profiles set predictions_visibility  = p_value where id = auth.uid();
    when 'stats'        then update public.profiles set stats_visibility        = p_value where id = auth.uid();
    when 'achievements' then update public.profiles set achievements_visibility = p_value where id = auth.uid();
    when 'friends'      then update public.profiles set friends_visibility      = p_value where id = auth.uid();
    else raise exception 'Aspect invalide';
  end case;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aperçu d'un profil public (par pseudo) — chaque aspect filtré par sa
-- visibilité. L'identité (pseudo, avatar, cosmétiques) reste toujours visible ;
-- les aspects non autorisés reviennent à NULL.
--
-- DROP requis : 0014 a déjà créé profile_overview avec un autre jeu de colonnes
-- (Postgres interdit de changer le type de retour via CREATE OR REPLACE).
-- ---------------------------------------------------------------------------
drop function if exists public.profile_overview(text);

create or replace function public.profile_overview(p_username text)
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
  achievement_keys         text[]
)
language sql security definer set search_path = public stable
as $$
  with base as (
    select p.*, public.friendship_status(p.id) as rel
    from public.profiles p
    where lower(p.username) = lower(trim(coalesce(p_username, '')))
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
    end
  from base b;
$$;

-- ---------------------------------------------------------------------------
-- Mes demandes d'amis en attente (entrantes + sortantes), avec profil de
-- l'autre joueur. Comble le trou laissé par 0014 (qui n'expose que les amis
-- acceptés et les notifications).
-- ---------------------------------------------------------------------------
create or replace function public.my_friend_requests()
returns table (
  id              uuid,
  username        text,
  avatar_url      text,
  equipped_title  text,
  equipped_color  text,
  equipped_badge  text,
  direction       text,
  created_at      timestamptz
)
language sql security definer set search_path = public stable
as $$
  select p.id, p.username, p.avatar_url,
         p.equipped_title, p.equipped_color, p.equipped_badge,
         'incoming'::text as direction, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  union all
  select p.id, p.username, p.avatar_url,
         p.equipped_title, p.equipped_color, p.equipped_badge,
         'outgoing'::text as direction, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = auth.uid() and f.status = 'pending'
  order by created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
grant execute on function public.can_see(text, text)               to authenticated;
grant execute on function public.set_profile_visibility(text, text) to authenticated;
grant execute on function public.profile_overview(text)            to authenticated;
grant execute on function public.my_friend_requests()              to authenticated;
