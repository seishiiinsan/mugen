-- Mugen — Groupes (ligues privées).
-- À exécuter dans le SQL Editor de Supabase après 0004.
--
-- Modèle d'accès : les tables sont verrouillées (RLS activée, aucune policy →
-- accès direct refusé). Tout passe par des RPC `security definer` (comme
-- `monthly_leaderboard`), ce qui évite la récursion RLS classique sur une table
-- d'appartenance qui se référence elle-même.

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 40),
  invite_code text not null unique,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

-- RLS activée, aucune policy : accès direct interdit, seul le service-role et
-- les fonctions `security definer` ci-dessous peuvent lire/écrire.
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- ---------------------------------------------------------------------------
-- Génération d'un code d'invitation court, sans caractères ambigus.
-- ---------------------------------------------------------------------------
create or replace function public.gen_invite_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- pas de I, L, O, 0, 1
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_group : crée le groupe + ajoute le créateur comme membre.
-- ---------------------------------------------------------------------------
create or replace function public.create_group(p_name text)
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
  insert into public.groups (name, invite_code, owner_id)
    values (v_name, v_code, v_uid)
    returning groups.id into v_id;
  insert into public.group_members (group_id, user_id) values (v_id, v_uid);

  return query select v_id, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_group : rejoint un groupe via son code d'invitation.
-- ---------------------------------------------------------------------------
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  select g.id into v_id
  from public.groups g
  where upper(g.invite_code) = upper(trim(coalesce(p_code, '')));

  if v_id is null then
    raise exception 'Code d''invitation invalide';
  end if;

  insert into public.group_members (group_id, user_id)
    values (v_id, v_uid)
    on conflict do nothing;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_group : quitte un groupe (le créateur ne peut pas, il doit supprimer).
-- ---------------------------------------------------------------------------
create or replace function public.leave_group(p_group uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  if exists (select 1 from public.groups where id = p_group and owner_id = v_uid) then
    raise exception 'Le créateur ne peut pas quitter le groupe ; supprimez-le.';
  end if;
  delete from public.group_members where group_id = p_group and user_id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_group : supprime le groupe (créateur uniquement).
-- ---------------------------------------------------------------------------
create or replace function public.delete_group(p_group uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  delete from public.groups where id = p_group and owner_id = v_uid;
  if not found then
    raise exception 'Seul le créateur peut supprimer le groupe';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- my_groups : les groupes du joueur, avec nombre de membres.
-- ---------------------------------------------------------------------------
create or replace function public.my_groups()
returns table (
  id           uuid,
  name         text,
  invite_code  text,
  owner_id     uuid,
  member_count bigint,
  created_at   timestamptz
)
language sql security definer set search_path = public stable
as $$
  select
    g.id,
    g.name,
    g.invite_code,
    g.owner_id,
    (select count(*) from public.group_members m2 where m2.group_id = g.id) as member_count,
    g.created_at
  from public.groups g
  join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- group_leaderboard : classement mensuel restreint aux membres du groupe.
-- Inclut les membres à 0 point. N'expose rien si l'appelant n'est pas membre.
-- ---------------------------------------------------------------------------
create or replace function public.group_leaderboard(p_group uuid)
returns table (
  rank         bigint,
  user_id      uuid,
  username     text,
  avatar_url   text,
  points       bigint,
  exact_scores bigint
)
language sql security definer set search_path = public stable
as $$
  with allowed as (
    select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid()
  ),
  members as (
    select m.user_id
    from public.group_members m
    where m.group_id = p_group and exists (select 1 from allowed)
  ),
  monthly as (
    select p.user_id, p.points, p.base_points
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.points is not null
      and f.kickoff >= date_trunc('month', timezone('utc', now()))
      and f.kickoff <  date_trunc('month', timezone('utc', now())) + interval '1 month'
  ),
  scored as (
    select
      mb.user_id,
      coalesce(sum(p.points), 0)                   as points,
      count(p.*) filter (where p.base_points = 10) as exact_scores
    from members mb
    left join monthly p on p.user_id = mb.user_id
    group by mb.user_id
  )
  select
    rank() over (order by s.points desc, s.exact_scores desc) as rank,
    s.user_id,
    pr.username,
    pr.avatar_url,
    s.points,
    s.exact_scores
  from scored s
  join public.profiles pr on pr.id = s.user_id
  order by rank, pr.username;
$$;

grant execute on function public.create_group(text)      to authenticated;
grant execute on function public.join_group(text)        to authenticated;
grant execute on function public.leave_group(uuid)       to authenticated;
grant execute on function public.delete_group(uuid)      to authenticated;
grant execute on function public.my_groups()             to authenticated;
grant execute on function public.group_leaderboard(uuid) to authenticated;
