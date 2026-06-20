-- 0034 — Perf & passage à l'échelle des classements.
-- À exécuter dans le SQL Editor de Supabase après 0033.
--
-- Trois changements pour que la page Classement et le profil n'aient plus à
-- matérialiser tout le classement à chaque rendu :
--   1. monthly_leaderboard renvoie aussi avatar_url → l'app n'a plus besoin de
--      scanner toute la table profiles côté JS pour récupérer les avatars.
--   2. my_monthly_rank() : le rang du joueur courant en une seule ligne, sans
--      construire l'intégralité du classement.
--   3. xp_standings ouvert à anon → l'app peut le lire via un client anon sans
--      cookie et mettre le résultat en cache (unstable_cache).

-- ---------------------------------------------------------------------------
-- 1. Classement mensuel + avatar. Le type de retour change → drop + recreate.
-- ---------------------------------------------------------------------------
drop function if exists public.monthly_leaderboard(int);

create function public.monthly_leaderboard(limit_count int default 100)
returns table (
  rank          bigint,
  user_id       uuid,
  username      text,
  avatar_url    text,
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
    pr.avatar_url,
    m.points,
    m.exact_scores
  from monthly m
  join public.profiles pr on pr.id = m.user_id
  order by rank, pr.username
  limit limit_count;
$$;

grant execute on function public.monthly_leaderboard(int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Rang mensuel du joueur courant (une seule ligne).
--
-- Reproduit exactement l'ordre de monthly_leaderboard
-- (points desc, exact_scores desc, ex æquo partagés) : le rang vaut 1 + le
-- nombre de joueurs strictement devant. Un joueur sans prono réglé ce mois est
-- traité comme (0, 0) — même résultat que l'ancien calcul JS qui listait tous
-- les profils.
-- ---------------------------------------------------------------------------
create or replace function public.my_monthly_rank()
returns table (points bigint, exact_scores bigint, rank bigint)
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
  ),
  me as (
    select
      coalesce(max(points), 0)       as points,
      coalesce(max(exact_scores), 0) as exact_scores
    from monthly
    where user_id = auth.uid()
  )
  select
    me.points,
    me.exact_scores,
    (1 + (
      select count(*)
      from monthly m
      where (m.points, m.exact_scores) > (me.points, me.exact_scores)
    ))::bigint as rank
  from me;
$$;

grant execute on function public.my_monthly_rank() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Lecture anon de xp_standings (pour le cache global côté app).
--    Données déjà publiques (pseudo, points, succès), comme monthly_leaderboard.
-- ---------------------------------------------------------------------------
grant execute on function public.xp_standings() to anon;
