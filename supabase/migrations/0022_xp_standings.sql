-- ---------------------------------------------------------------------------
-- 0022 — classement XP à vie (board "Plus d'XP").
--
-- L'XP n'est jamais stockée : elle dérive des points à vie (× XP_PER_POINT) et
-- de l'XP des succès. `predictions` et `user_achievements` sont en RLS « own
-- only », donc on expose un agrégat par joueur via une fonction SECURITY
-- DEFINER. Le calcul final (XP + niveau) se fait côté app, qui détient le
-- barème (lib/domain/economy.ts).
--
-- Le classement des pièces, lui, lit directement profiles.coins (lecture
-- publique depuis 0001), donc pas de RPC dédiée.
-- ---------------------------------------------------------------------------

create or replace function public.xp_standings()
returns table (
  user_id      uuid,
  username     text,
  avatar_url   text,
  points       bigint,
  achievements text[]
)
language sql security definer set search_path = public stable
as $$
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce((
      select sum(pr.points) from public.predictions pr
      where pr.user_id = p.id and pr.points is not null
    ), 0)::bigint,
    coalesce((
      select array_agg(ua.key) from public.user_achievements ua
      where ua.user_id = p.id
    ), '{}')
  from public.profiles p;
$$;

grant execute on function public.xp_standings() to authenticated;
