-- ---------------------------------------------------------------------------
-- 0020 — badge du succès « Premier pronostic ».
--
-- Le succès first_prediction n'avait pas de badge ; on lui en donne un (⭐,
-- visuel défini dans lib/domain/cosmetics.ts → BADGE_META). On enregistre
-- l'item au catalogue puis on le rattrape pour tous ceux qui ont déjà le succès.
-- Idempotent.
-- ---------------------------------------------------------------------------

-- 1) Item au catalogue (non vendable, comme les autres badges de succès).
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('badge_first_prediction', 'badge', 'Premier pronostic', 'Ton tout premier pronostic réglé.', 0, 99, false)
on conflict (key) do nothing;

-- 2) Rattrapage : pose le badge à qui a déjà le succès first_prediction.
insert into public.user_items (user_id, item_key)
select ua.user_id, 'badge_first_prediction'
from public.user_achievements ua
where ua.key = 'first_prediction'
on conflict (user_id, item_key) do nothing;
