-- Mugen — Frontières de mois : marge de grâce d'agrégation + éligibilité stricte.
-- À exécuter dans le SQL Editor de Supabase après 0005.
--
-- Principe (cf. lib/domain/boosts.ts → MONTH_GRACE_HOURS) :
--   • Agrégation (classements, stock de boosts affiché) : le mois SORTANT reste
--     actif ~3h après minuit UTC le 1er, le temps que ses derniers matchs (coup
--     d'envoi tard le dernier jour, fin/règlement après minuit) entrent dans le
--     classement final avant la bascule. → active_month_start().
--   • Éligibilité au prono : mois calendaire STRICT par now(). Un match n'est
--     pronosticable que pendant son propre mois (sinon les matchs de début de
--     mois, 00:00–03:00 UTC le 1er, ne seraient jamais ouverts).

-- ---------------------------------------------------------------------------
-- Début du mois actif d'agrégation (décalé de la marge de grâce).
-- ---------------------------------------------------------------------------
create or replace function public.active_month_start()
returns timestamp
language sql stable set search_path = public
as $$
  select date_trunc('month', timezone('utc', now()) - interval '3 hours');
$$;

grant execute on function public.active_month_start() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Classement mensuel global — fenêtre = mois actif (avec grâce).
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
      and f.kickoff >= public.active_month_start()
      and f.kickoff <  public.active_month_start() + interval '1 month'
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

-- ---------------------------------------------------------------------------
-- Classement de groupe — même fenêtre (mois actif), 0-point inclus.
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
      and f.kickoff >= public.active_month_start()
      and f.kickoff <  public.active_month_start() + interval '1 month'
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

grant execute on function public.group_leaderboard(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Verrou de prono : 15 min avant le coup d'envoi + éligibilité au mois STRICT.
-- (La service-role contourne toujours.)
-- ---------------------------------------------------------------------------
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
  -- Seuls les matchs du mois calendaire en cours (UTC) sont pronosticables.
  if date_trunc('month', timezone('utc', k))
       <> date_trunc('month', timezone('utc', now())) then
    raise exception 'Ce match n''appartient pas au mois en cours';
  end if;
  if st <> 'upcoming' or now() >= k - interval '15 minutes' then
    raise exception 'Pronostics clôturés pour ce match';
  end if;
  return new;
end;
$$;
