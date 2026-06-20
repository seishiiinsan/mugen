-- Mugen — Profil de pronostiqueur : agrégats perso + club de cœur.
-- À exécuter dans le SQL Editor de Supabase après 0036.
--
-- Tout existe déjà (predictions + cache fixtures) : c'est de l'agrégation. Les
-- métriques de SKILL portent sur base_points (score non boosté, depuis 0003),
-- pour mesurer le flair du pronostiqueur et non la chance des boosts.

-- ---------------------------------------------------------------------------
-- Club de cœur : id d'équipe API-Football (le nom/logo vit dans le cache).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists favorite_team_id int;

-- ---------------------------------------------------------------------------
-- player_stats : tableau de bord de l'appelant en un seul jsonb (un aller-
-- retour, tout le group by reste en SQL). Lit ses propres pronostics réglés.
-- ---------------------------------------------------------------------------
create or replace function public.player_stats()
returns jsonb
language sql security definer set search_path = public stable
as $$
  with settled as (
    select
      p.points,
      p.base_points as base,
      f.league_id, f.league_name, f.league_logo,
      f.home_id, f.home_team, f.home_logo,
      f.away_id, f.away_team, f.away_logo,
      f.kickoff
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.user_id = auth.uid()
      and p.points is not null
      and p.base_points is not null
  ),
  teams as (
    -- une ligne par (prono, camp) — base de l'agrégat « par équipe ».
    select home_id as team_id, home_team as name, home_logo as logo, base
      from settled where home_id is not null
    union all
    select away_id, away_team, away_logo, base
      from settled where away_id is not null
  ),
  fav as (select favorite_team_id as fid from public.profiles where id = auth.uid())
  select jsonb_build_object(
    'overall', (
      select jsonb_build_object(
        'settled',     count(*),
        'hits',        count(*) filter (where base > 0),
        'exacts',      count(*) filter (where base = 10),
        'avgBase',     coalesce(round(avg(base)::numeric, 2), 0),
        'totalPoints', coalesce(sum(points), 0)
      ) from settled
    ),
    'form', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'home', home_team, 'away', away_team,
                 'basePoints', base, 'points', points, 'kickoff', kickoff
               ) order by kickoff desc
             ), '[]'::jsonb)
      from (select * from settled order by kickoff desc limit 5) last5
    ),
    'distribution', (
      select coalesce(jsonb_agg(
               jsonb_build_object('base', b.base, 'count', coalesce(c.n, 0))
               order by b.base desc
             ), '[]'::jsonb)
      from (values (10), (6), (4), (3), (2), (0)) b(base)
      left join (select base, count(*) as n from settled group by base) c
        on c.base = b.base
    ),
    'byLeague', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'leagueId', league_id, 'leagueName', league_name,
                 'leagueLogo', league_logo, 'count', n,
                 'avgBase', avg_base, 'hitRate', hit_rate
               ) order by avg_base desc, n desc
             ), '[]'::jsonb)
      from (
        select league_id,
               max(league_name) as league_name,
               max(league_logo) as league_logo,
               count(*) as n,
               round(avg(base)::numeric, 2) as avg_base,
               round((count(*) filter (where base > 0))::numeric / count(*), 3) as hit_rate
        from settled
        where league_id is not null
        group by league_id
        having count(*) >= 3
      ) lg
    ),
    'byTeam', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'teamId', team_id, 'name', name, 'logo', logo,
                 'count', n, 'avgBase', avg_base
               ) order by avg_base desc, n desc
             ), '[]'::jsonb)
      from (
        select team_id, max(name) as name, max(logo) as logo,
               count(*) as n, round(avg(base)::numeric, 2) as avg_base
        from teams
        group by team_id
        having count(*) >= 3
      ) tm
    ),
    'favoriteTeam', (
      select case when f.fid is null then null else jsonb_build_object(
        'teamId', f.fid,
        'name', coalesce(
          (select home_team from public.fixtures where home_id = f.fid limit 1),
          (select away_team from public.fixtures where away_id = f.fid limit 1)),
        'logo', coalesce(
          (select home_logo from public.fixtures where home_id = f.fid limit 1),
          (select away_logo from public.fixtures where away_id = f.fid limit 1)),
        'count',   (select count(*) from teams t where t.team_id = f.fid),
        'avgBase', (select round(avg(t.base)::numeric, 2) from teams t where t.team_id = f.fid)
      ) end
      from fav f
    )
  );
$$;
grant execute on function public.player_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- list_teams : équipes distinctes du cache fixtures (sélecteur club de cœur).
-- Données publiques (fixtures lisibles par tous) → invoker rights suffisent.
-- ---------------------------------------------------------------------------
create or replace function public.list_teams()
returns table (id int, name text, logo text)
language sql stable set search_path = public
as $$
  select team_id as id, max(name) as name, max(logo) as logo
  from (
    select home_id as team_id, home_team as name, home_logo as logo
      from public.fixtures where home_id is not null
    union all
    select away_id, away_team, away_logo
      from public.fixtures where away_id is not null
  ) u
  group by team_id
  order by name;
$$;
grant execute on function public.list_teams() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- set_favorite_team : définit (ou efface avec null) le club de cœur, en
-- validant que l'équipe existe dans le cache. Réservé à l'appelant.
-- ---------------------------------------------------------------------------
create or replace function public.set_favorite_team(p_team_id int)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_team_id is not null and not exists (
    select 1 from public.fixtures where home_id = p_team_id or away_id = p_team_id
  ) then
    raise exception 'Équipe inconnue';
  end if;
  update public.profiles set favorite_team_id = p_team_id where id = v_uid;
end;
$$;
grant execute on function public.set_favorite_team(int) to authenticated;
