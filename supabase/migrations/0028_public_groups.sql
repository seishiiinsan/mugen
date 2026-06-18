-- ---------------------------------------------------------------------------
-- 0028 — Groupes publics : visibilité + découverte/adhésion sans code.
--
-- Un groupe peut être public (visible et rejoignable par tous) ou privé (sur
-- code d'invitation, comportement historique = défaut). La liste des groupes
-- publics passe par une RPC dédiée (les tables restent RLS-verrouillées).
-- À exécuter dans le SQL Editor APRÈS 0027.
-- ---------------------------------------------------------------------------

alter table public.groups
  add column if not exists is_public boolean not null default false;

-- create_group : ajout du flag public. On remplace la signature (text) par
-- (text, boolean default false) pour rester rétro-compatible côté appelant.
drop function if exists public.create_group(text);
create or replace function public.create_group(p_name text, p_public boolean default false)
returns table (id uuid, invite_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_id   uuid;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'Le nom du groupe doit faire entre 2 et 40 caractères';
  end if;

  v_code := public.gen_invite_code();
  insert into public.groups (name, invite_code, owner_id, is_public)
    values (v_name, v_code, v_uid, coalesce(p_public, false))
    returning groups.id into v_id;
  insert into public.group_members (group_id, user_id) values (v_id, v_uid);

  return query select v_id, v_code;
end;
$$;
grant execute on function public.create_group(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- public_groups : groupes publics (recherche optionnelle par nom) + flag membre.
-- ---------------------------------------------------------------------------
create or replace function public.public_groups(p_query text default null)
returns table (
  id           uuid,
  name         text,
  member_count bigint,
  owner_id     uuid,
  is_member    boolean
)
language sql security definer set search_path = public stable
as $$
  select
    g.id,
    g.name,
    (select count(*) from public.group_members m2 where m2.group_id = g.id) as member_count,
    g.owner_id,
    exists (select 1 from public.group_members m
            where m.group_id = g.id and m.user_id = auth.uid()) as is_member
  from public.groups g
  where g.is_public = true
    and (p_query is null or trim(p_query) = '' or g.name ilike '%' || trim(p_query) || '%')
  order by member_count desc, g.name
  limit 100;
$$;
grant execute on function public.public_groups(text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_public_group : rejoint un groupe public par son id (sans code).
-- ---------------------------------------------------------------------------
create or replace function public.join_public_group(p_group uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  if not exists (select 1 from public.groups where id = p_group and is_public = true) then
    raise exception 'Groupe introuvable ou privé';
  end if;
  insert into public.group_members (group_id, user_id)
    values (p_group, v_uid)
    on conflict do nothing;
  return p_group;
end;
$$;
grant execute on function public.join_public_group(uuid) to authenticated;
