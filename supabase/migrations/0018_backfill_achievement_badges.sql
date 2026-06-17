-- ---------------------------------------------------------------------------
-- 0018 — backfill rétroactif des badges de succès.
--
-- Les succès débloqués avant que l'attribution de badge ne soit en place (ou
-- avant que les items de badge ne soient seedés) n'ont jamais reçu leur badge
-- dans l'inventaire. Ce script rejoue l'attribution pour TOUS les succès déjà
-- obtenus, sans rien dupliquer.
--
-- Le mapping (clé de succès → item badge) reflète ACHIEVEMENTS dans
-- lib/domain/economy.ts. « first_prediction » n'a pas de badge, donc absent.
-- Idempotent : `on conflict do nothing` — relançable sans effet de bord.
-- ---------------------------------------------------------------------------

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
-- Garde-fou clé étrangère : le badge doit exister dans le catalogue.
join public.shop_items si on si.key = m.badge_key
on conflict (user_id, item_key) do nothing;
