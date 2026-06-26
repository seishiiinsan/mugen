-- 0038 — Cosmétiques (cadre, couleur, titre, badge) sur tous les classements.
--
-- monthly_leaderboard, group_leaderboard et hall_of_fame ne renvoyaient que
-- pseudo + avatar : le podium, le classement mensuel, le classement de groupe
-- et le Hall of Fame affichaient donc un pseudo "nu", sans les cosmétiques
-- équipés (visibles eux sur /profil et /joueur/[username]). search_users
-- (recherche d'amis) manquait equipped_frame pour la même raison.
--
-- Les types de retour changent → drop + recreate (Postgres l'exige).

drop function if exists public.monthly_leaderboard(int);

create function public.monthly_leaderboard(limit_count int default 100)
returns table (
  rank           bigint,
  user_id        uuid,
  username       text,
  avatar_url     text,
  points         bigint,
  exact_scores   bigint,
  equipped_frame text,
  equipped_color text,
  equipped_title text,
  equipped_badge text
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
    m.exact_scores,
    pr.equipped_frame,
    pr.equipped_color,
    pr.equipped_title,
    pr.equipped_badge
  from monthly m
  join public.profiles pr on pr.id = m.user_id
  order by rank, pr.username
  limit limit_count;
$$;

grant execute on function public.monthly_leaderboard(int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- group_leaderboard — même ajout, même fenêtre (mois actif).
-- ---------------------------------------------------------------------------
drop function if exists public.group_leaderboard(uuid);

create function public.group_leaderboard(p_group uuid)
returns table (
  rank           bigint,
  user_id        uuid,
  username       text,
  avatar_url     text,
  points         bigint,
  exact_scores   bigint,
  equipped_frame text,
  equipped_color text,
  equipped_title text,
  equipped_badge text
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
    s.exact_scores,
    pr.equipped_frame,
    pr.equipped_color,
    pr.equipped_title,
    pr.equipped_badge
  from scored s
  join public.profiles pr on pr.id = s.user_id
  order by rank, pr.username;
$$;

grant execute on function public.group_leaderboard(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- hall_of_fame — podiums figés, mêmes 4 champs cosmétiques.
-- ---------------------------------------------------------------------------
drop function if exists public.hall_of_fame(int);

create function public.hall_of_fame(limit_count int default 60)
returns table (
  month          text,
  rank           int,
  user_id        uuid,
  username       text,
  avatar_url     text,
  points         int,
  exacts         int,
  equipped_frame text,
  equipped_color text,
  equipped_title text,
  equipped_badge text
)
language sql security definer set search_path = public stable
as $$
  select c.month, c.rank, c.user_id, pr.username, pr.avatar_url, c.points, c.exacts,
         pr.equipped_frame, pr.equipped_color, pr.equipped_title, pr.equipped_badge
  from public.monthly_champions c
  join public.profiles pr on pr.id = c.user_id
  order by c.month desc, c.rank asc
  limit limit_count;
$$;

grant execute on function public.hall_of_fame(int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- search_users — ajoute equipped_frame (couleur/titre/badge déjà présents).
-- ---------------------------------------------------------------------------
drop function if exists public.search_users(text);

create function public.search_users(p_query text)
returns table (
  id              uuid,
  username        text,
  avatar_url      text,
  equipped_frame  text,
  equipped_title  text,
  equipped_color  text,
  equipped_badge  text,
  relation        text
)
language sql security definer set search_path = public stable
as $$
  select p.id, p.username, p.avatar_url,
         p.equipped_frame, p.equipped_title, p.equipped_color, p.equipped_badge,
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

grant execute on function public.search_users(text) to authenticated;

-- ---------------------------------------------------------------------------
-- my_friend_requests — manquait equipped_frame (déjà sur my_friends).
-- ---------------------------------------------------------------------------
drop function if exists public.my_friend_requests();

create function public.my_friend_requests()
returns table (
  id              uuid,
  username        text,
  avatar_url      text,
  equipped_frame  text,
  equipped_title  text,
  equipped_color  text,
  equipped_badge  text,
  direction       text,
  created_at      timestamptz
)
language sql security definer set search_path = public stable
as $$
  select p.id, p.username, p.avatar_url,
         p.equipped_frame, p.equipped_title, p.equipped_color, p.equipped_badge,
         'incoming'::text as direction, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  union all
  select p.id, p.username, p.avatar_url,
         p.equipped_frame, p.equipped_title, p.equipped_color, p.equipped_badge,
         'outgoing'::text as direction, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = auth.uid() and f.status = 'pending'
  order by created_at desc;
$$;

grant execute on function public.my_friend_requests() to authenticated;
