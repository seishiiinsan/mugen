-- Mugen — schéma initial.
-- À exécuter dans le SQL Editor de Supabase (ou via `supabase db push`).
-- Tout est protégé par RLS ; les écritures sensibles (points, résultats de match)
-- ne passent que par la service-role côté serveur.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Pseudo unique, insensible à la casse.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "Profiles visibles par tous"
  on public.profiles for select using (true);

create policy "Chacun insère son profil"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Chacun modifie son profil"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Création automatique du profil à l'inscription (email ou OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1),
    'joueur'
  );
  base_username := left(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'), 20);
  if base_username = '' then
    base_username := 'joueur';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = lower(final_username)) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, avatar_url)
  values (new.id, final_username, new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- FIXTURES (cache des données API-Football — source pour le calcul des points)
-- ---------------------------------------------------------------------------
create table if not exists public.fixtures (
  id          bigint primary key,           -- id de fixture API-Football
  league_id   int,
  league_name text,
  home_team   text not null,
  away_team   text not null,
  venue       text,
  kickoff     timestamptz not null,
  status      text not null default 'upcoming',
  elapsed     int,
  home_goals  int,
  away_goals  int,
  updated_at  timestamptz not null default now()
);

create index if not exists fixtures_kickoff_idx on public.fixtures (kickoff);

alter table public.fixtures enable row level security;

create policy "Matchs visibles par tous"
  on public.fixtures for select using (true);
-- Aucune policy d'écriture : seules les requêtes en service-role peuvent écrire.

-- ---------------------------------------------------------------------------
-- PREDICTIONS
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  fixture_id  bigint not null references public.fixtures (id) on delete cascade,
  home_goals  int not null check (home_goals between 0 and 20),
  away_goals  int not null check (away_goals between 0 and 20),
  points      int,                          -- null tant que non calculé (service-role)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, fixture_id)
);

create index if not exists predictions_user_idx on public.predictions (user_id);
create index if not exists predictions_fixture_idx on public.predictions (fixture_id);

alter table public.predictions enable row level security;

create policy "Chacun voit ses pronostics"
  on public.predictions for select using (auth.uid() = user_id);

create policy "Chacun crée ses pronostics"
  on public.predictions for insert with check (auth.uid() = user_id and points is null);

create policy "Chacun modifie ses pronostics"
  on public.predictions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Empêche un client de s'attribuer des points : seul le service-role les écrit.
create or replace function public.protect_prediction_points()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.points := old.points;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists predictions_protect_points on public.predictions;
create trigger predictions_protect_points
  before update on public.predictions
  for each row execute function public.protect_prediction_points();

-- Verrou de clôture autoritatif : 15 min avant le coup d'envoi (§2.3).
create or replace function public.enforce_prediction_lock()
returns trigger language plpgsql as $$
declare
  k timestamptz;
  st text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  select kickoff, status into k, st from public.fixtures where id = new.fixture_id;
  if k is null then
    raise exception 'Match inconnu';
  end if;
  if st <> 'upcoming' or now() >= k - interval '15 minutes' then
    raise exception 'Pronostics clôturés pour ce match';
  end if;
  return new;
end;
$$;

drop trigger if exists predictions_enforce_lock on public.predictions;
create trigger predictions_enforce_lock
  before insert or update on public.predictions
  for each row execute function public.enforce_prediction_lock();

-- ---------------------------------------------------------------------------
-- CLASSEMENT MENSUEL (agrégat global → SECURITY DEFINER pour contourner la RLS)
-- ---------------------------------------------------------------------------
create or replace function public.monthly_leaderboard(limit_count int default 100)
returns table (
  rank          bigint,
  user_id       uuid,
  username      text,
  points        bigint,
  exact_scores  bigint
)
language sql security definer set search_path = public stable
as $$
  with monthly as (
    select
      p.user_id,
      sum(coalesce(p.points, 0))            as points,
      count(*) filter (where p.points = 10) as exact_scores
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.points is not null
      and f.kickoff >= date_trunc('month', timezone('utc', now()))
      and f.kickoff <  date_trunc('month', timezone('utc', now())) + interval '1 month'
    group by p.user_id
  )
  select
    rank() over (order by m.points desc, m.exact_scores desc) as rank,
    m.user_id,
    pr.username,
    m.points,
    m.exact_scores
  from monthly m
  join public.profiles pr on pr.id = m.user_id
  order by rank
  limit limit_count;
$$;

grant execute on function public.monthly_leaderboard(int) to anon, authenticated;
