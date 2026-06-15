-- Mugen — Boosts (power-ups mensuels).
-- À exécuter dans le SQL Editor de Supabase après 0002.
-- 1 boost de chaque type par joueur et par mois de classement (mois du match).

-- ---------------------------------------------------------------------------
-- Type de boost
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.boost_type as enum ('double_points', 'double_chance', 'banco');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Colonnes sur predictions
-- ---------------------------------------------------------------------------
alter table public.predictions
  add column if not exists boost        public.boost_type,
  add column if not exists home_goals_2 int,
  add column if not exists away_goals_2 int,
  add column if not exists base_points  int,           -- score non boosté (compte des exacts)
  add column if not exists bonus_month  text;          -- 'YYYY-MM' dérivé du match, null si pas de boost

-- Bornes du second pronostic (double chance).
alter table public.predictions
  drop constraint if exists predictions_secondary_range,
  add  constraint predictions_secondary_range check (
    (home_goals_2 is null or home_goals_2 between 0 and 20) and
    (away_goals_2 is null or away_goals_2 between 0 and 20)
  );

-- Le second score n'existe que pour double_chance, et est obligatoire alors.
alter table public.predictions
  drop constraint if exists predictions_double_chance_scores,
  add  constraint predictions_double_chance_scores check (
    (boost = 'double_chance' and home_goals_2 is not null and away_goals_2 is not null)
    or
    (boost is distinct from 'double_chance' and home_goals_2 is null and away_goals_2 is null)
  );

-- Backfill : les pronos existants n'avaient pas de boost → base = points.
update public.predictions set base_points = points where base_points is null;

-- 1 boost de chaque type par mois (mois du match).
create unique index if not exists predictions_boost_month_idx
  on public.predictions (user_id, boost, bonus_month)
  where boost is not null;

-- ---------------------------------------------------------------------------
-- bonus_month dérivé du coup d'envoi du match (serveur autoritaire)
-- ---------------------------------------------------------------------------
create or replace function public.set_prediction_bonus_month()
returns trigger language plpgsql as $$
declare k timestamptz;
begin
  if new.boost is null then
    new.bonus_month := null;
  else
    select kickoff into k from public.fixtures where id = new.fixture_id;
    new.bonus_month := to_char(date_trunc('month', timezone('utc', k)), 'YYYY-MM');
  end if;
  return new;
end;
$$;

drop trigger if exists predictions_set_bonus_month on public.predictions;
create trigger predictions_set_bonus_month
  before insert or update on public.predictions
  for each row execute function public.set_prediction_bonus_month();

-- ---------------------------------------------------------------------------
-- protect_points : le client n'écrit ni points ni base_points
-- ---------------------------------------------------------------------------
create or replace function public.protect_prediction_points()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.points      := old.points;
    new.base_points := old.base_points;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Le client ne peut pas s'attribuer de points à l'insertion non plus.
drop policy if exists "Chacun crée ses pronostics" on public.predictions;
create policy "Chacun crée ses pronostics"
  on public.predictions for insert
  with check (auth.uid() = user_id and points is null and base_points is null);

-- ---------------------------------------------------------------------------
-- Classement mensuel : compter les exacts sur base_points (et non points,
-- qui peut désormais être boosté à 20 ou 30).
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
      sum(coalesce(p.points, 0))                  as points,
      count(*) filter (where p.base_points = 10)  as exact_scores
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
