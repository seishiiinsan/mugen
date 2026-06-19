-- ---------------------------------------------------------------------------
-- 0029 — Réglages de groupe : nombre max de membres + niveau requis.
--
-- Le propriétaire édite les réglages depuis la page paramètres. La capacité est
-- vérifiée côté base (atomique, anti-course) dans les RPC d'adhésion.
--
-- ⚠️ Le niveau requis (min_level) est, lui, un GARDE-FOU UX, pas une barrière :
-- il n'est vérifié QUE côté app (Server Action blockedByGate via getMyLevel),
-- car le barème d'XP (XP par succès + levelFromXp) vit dans
-- lib/domain/economy.ts et n'est volontairement jamais stocké en base (cf.
-- 0022). Ces RPC `authenticated` étant appelables directement (clé anon + JWT),
-- le palier est techniquement contournable. Compromis assumé : enjeu faible
-- (appartenance à un groupe, ni argent ni classement). Note durable attachée
-- aux fonctions en 0033. Pour une vraie barrière : mirrorer le barème en SQL
-- (achievement_xp + level_from_xp) et l'imposer dans join_group/join_public_group.
-- À exécuter dans le SQL Editor APRÈS 0028.
-- ---------------------------------------------------------------------------

alter table public.groups
  add column if not exists max_members int,
  add column if not exists min_level   int not null default 0;

alter table public.groups
  drop constraint if exists groups_max_members_pos,
  add  constraint groups_max_members_pos check (max_members is null or max_members >= 1),
  drop constraint if exists groups_min_level_nonneg,
  add  constraint groups_min_level_nonneg check (min_level >= 0);

-- ---------------------------------------------------------------------------
-- update_group_settings : le propriétaire modifie nom / visibilité / capacité /
-- niveau requis. Réduire la capacité sous l'effectif actuel n'exclut personne.
-- ---------------------------------------------------------------------------
create or replace function public.update_group_settings(
  p_group       uuid,
  p_name        text,
  p_public      boolean,
  p_max_members int,
  p_min_level   int
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from public.groups
                 where id = p_group and owner_id = v_uid) then
    raise exception 'Seul le propriétaire peut modifier les réglages';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'Le nom du groupe doit faire entre 2 et 40 caractères';
  end if;
  if p_max_members is not null and p_max_members < 1 then
    raise exception 'Le nombre max de membres doit être ≥ 1';
  end if;
  if coalesce(p_min_level, 0) < 0 then
    raise exception 'Niveau requis invalide';
  end if;

  update public.groups set
    name        = v_name,
    is_public   = coalesce(p_public, false),
    max_members = p_max_members,
    min_level   = coalesce(p_min_level, 0)
  where id = p_group;
end;
$$;
grant execute on function public.update_group_settings(uuid, text, boolean, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- group_gate : réglages/état d'un groupe pour les contrôles d'adhésion (par id
-- ou par code). Visible si le groupe est public, si l'appelant est membre, ou
-- si le code correspond — pas de fuite des groupes privés par id seul.
-- ---------------------------------------------------------------------------
create or replace function public.group_gate(
  p_group uuid default null,
  p_code  text default null
)
returns table (
  group_id     uuid,
  name         text,
  min_level    int,
  max_members  int,
  member_count bigint,
  is_member    boolean,
  is_public    boolean
)
language sql security definer set search_path = public stable
as $$
  select
    g.id, g.name, g.min_level, g.max_members,
    (select count(*) from public.group_members m2 where m2.group_id = g.id),
    exists (select 1 from public.group_members m
            where m.group_id = g.id and m.user_id = auth.uid()),
    g.is_public
  from public.groups g
  where (
      (p_group is not null and g.id = p_group)
      or (p_code is not null and upper(g.invite_code) = upper(trim(p_code)))
    )
    and (
      g.is_public
      or exists (select 1 from public.group_members m
                 where m.group_id = g.id and m.user_id = auth.uid())
      or (p_code is not null and upper(g.invite_code) = upper(trim(p_code)))
    )
  limit 1;
$$;
grant execute on function public.group_gate(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_group (recréée) : applique la capacité max. min_level n'est PAS vérifié
-- ici — garde-fou UX côté app (blockedByGate), contournable par appel direct
-- à la RPC. Voir l'entête de cette migration + 0033.
-- ---------------------------------------------------------------------------
create or replace function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_max int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;

  select g.id, g.max_members into v_id, v_max
  from public.groups g
  where upper(g.invite_code) = upper(trim(coalesce(p_code, '')));

  if v_id is null then
    raise exception 'Code d''invitation invalide';
  end if;

  if not exists (select 1 from public.group_members
                 where group_id = v_id and user_id = v_uid) then
    if v_max is not null
       and (select count(*) from public.group_members where group_id = v_id) >= v_max then
      raise exception 'Groupe complet';
    end if;
  end if;

  -- Pas de contrôle de min_level ici : garde-fou UX côté app (cf. entête).
  insert into public.group_members (group_id, user_id)
    values (v_id, v_uid) on conflict do nothing;
  return v_id;
end;
$$;
grant execute on function public.join_group(text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_public_group (recréée) : capacité max incluse. min_level idem join_group
-- — garde-fou UX côté app (blockedByGate), non imposé ici. Voir entête + 0033.
-- ---------------------------------------------------------------------------
create or replace function public.join_public_group(p_group uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_max int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from public.groups
                 where id = p_group and is_public = true) then
    raise exception 'Groupe introuvable ou privé';
  end if;

  select max_members into v_max from public.groups where id = p_group;
  if not exists (select 1 from public.group_members
                 where group_id = p_group and user_id = v_uid) then
    if v_max is not null
       and (select count(*) from public.group_members where group_id = p_group) >= v_max then
      raise exception 'Groupe complet';
    end if;
  end if;

  -- Pas de contrôle de min_level ici : garde-fou UX côté app (cf. entête).
  insert into public.group_members (group_id, user_id)
    values (p_group, v_uid) on conflict do nothing;
  return p_group;
end;
$$;
grant execute on function public.join_public_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- public_groups (recréée) : expose niveau requis + capacité pour l'affichage.
-- ---------------------------------------------------------------------------
drop function if exists public.public_groups(text);
create or replace function public.public_groups(p_query text default null)
returns table (
  id           uuid,
  name         text,
  member_count bigint,
  owner_id     uuid,
  is_member    boolean,
  min_level    int,
  max_members  int
)
language sql security definer set search_path = public stable
as $$
  select
    g.id,
    g.name,
    (select count(*) from public.group_members m2 where m2.group_id = g.id) as member_count,
    g.owner_id,
    exists (select 1 from public.group_members m
            where m.group_id = g.id and m.user_id = auth.uid()) as is_member,
    g.min_level,
    g.max_members
  from public.groups g
  where g.is_public = true
    and (p_query is null or trim(p_query) = '' or g.name ilike '%' || trim(p_query) || '%')
  order by member_count desc, g.name
  limit 100;
$$;
grant execute on function public.public_groups(text) to authenticated;
