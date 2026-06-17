-- ---------------------------------------------------------------------------
-- 0019 — rattrapage rétroactif des succès ET de leurs badges.
--
-- Le settle ne débloque les succès que pour les pronostics réglés pendant son
-- run ; un seuil franchi « hors run » (ex. avant que la logique n'existe)
-- n'était jamais rattrapé. Ce script re-évalue les succès de TOUS les joueurs
-- depuis leurs stats à vie, débloque ceux qui manquent, puis pose les badges
-- correspondants. Supersède 0018 (qui ne posait que les badges).
--
-- Seuils et mapping repris de ACHIEVEMENTS (lib/domain/economy.ts).
-- Idempotent : `on conflict do nothing` — relançable sans effet de bord.
--
-- NB : l'XP (et donc le niveau) se recalcule tout seul, car il dérive des
-- succès débloqués. Les PIÈCES ne sont volontairement PAS versées ici, pour
-- ne pas gonfler les soldes rétroactivement.
-- ---------------------------------------------------------------------------

-- 1) Débloque les succès manquants à partir des stats à vie.
with stats as (
  select
    user_id,
    count(*) filter (where points is not null) as settled,
    count(*) filter (where base_points = 10)   as exacts
  from public.predictions
  group by user_id
)
insert into public.user_achievements (user_id, key)
select user_id, key from (
  select user_id, 'first_prediction' as key from stats where settled >= 1
  union all select user_id, 'played_10'   from stats where settled >= 10
  union all select user_id, 'played_50'   from stats where settled >= 50
  union all select user_id, 'played_100'  from stats where settled >= 100
  union all select user_id, 'first_exact' from stats where exacts  >= 1
  union all select user_id, 'exact_10'    from stats where exacts  >= 10
  union all select user_id, 'exact_25'    from stats where exacts  >= 25
) e
on conflict (user_id, key) do nothing;

-- 2) Pose les badges des succès débloqués qui en ont un.
insert into public.user_items (user_id, item_key)
select ua.user_id, m.badge_key
from public.user_achievements ua
join (values
  ('played_10',  'badge_played_10'),
  ('first_exact','badge_first_exact'),
  ('exact_10',   'badge_exact_10'),
  ('exact_25',   'badge_exact_25'),
  ('played_50',  'badge_played_50'),
  ('played_100', 'badge_played_100')
) as m(ach_key, badge_key) on m.ach_key = ua.key
join public.shop_items si on si.key = m.badge_key
on conflict (user_id, item_key) do nothing;
