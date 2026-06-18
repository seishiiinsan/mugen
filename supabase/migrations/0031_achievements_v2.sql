-- ---------------------------------------------------------------------------
-- 0031 — Vague de succès v2 : buteurs / amis / cosmétiques / monnaie.
--
-- Ajoute :
--   1. predictions.scorer_hits : nb de bons buteurs d'un prono (peuplé au
--      settle dès maintenant ; l'historique est comblé par /api/backfill, qui
--      re-récupère les vrais buteurs via l'API).
--   2. Les badges des nouveaux succès (non vendables).
--   3. Le rattrapage rétroactif SQL des succès « comptables » (amis,
--      cosmétiques, dépenses) — sans API, sans pièces (cf. 0019, pas
--      d'inflation des soldes). Les succès buteurs sont rattrapés par la route
--      /api/backfill une fois scorer_hits recalculé.
--   4. achievement_rates() : taux de déblocage par succès (carte « % joueurs »).
--
-- Idempotent (`on conflict do nothing`, `if not exists`) — relançable.
-- Seuils/mapping repris de ACHIEVEMENTS (lib/domain/economy.ts).
-- ---------------------------------------------------------------------------

-- 1) Colonne du nb de bons buteurs par pronostic.
alter table public.predictions
  add column if not exists scorer_hits int;

-- 2) Badges des nouveaux succès (kind 'badge', non vendables).
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('badge_scorer_first',  'badge', 'Premier bon buteur', 'Trouver un premier buteur.',        0, 120, false),
  ('badge_scorer_10',     'badge', '10 buteurs trouvés', 'Trouver dix buteurs.',              0, 121, false),
  ('badge_scorer_25',     'badge', '25 buteurs trouvés', 'Trouver vingt-cinq buteurs.',       0, 122, false),
  ('badge_scorer_50',     'badge', '50 buteurs trouvés', 'Trouver cinquante buteurs.',        0, 123, false),
  ('badge_friend_first',  'badge', 'Premier ami',        'Ajouter un premier ami.',           0, 124, false),
  ('badge_friends_5',     'badge', '5 amis',             'Compter cinq amis.',                0, 125, false),
  ('badge_friends_10',    'badge', '10 amis',            'Compter dix amis.',                 0, 126, false),
  ('badge_friends_25',    'badge', '25 amis',            'Compter vingt-cinq amis.',          0, 127, false),
  ('badge_cosmetic_first','badge', 'Premier cosmétique', 'Posséder un premier cosmétique.',   0, 128, false),
  ('badge_cosmetic_5',    'badge', 'Collectionneur',     'Posséder cinq cosmétiques.',        0, 129, false),
  ('badge_cosmetic_15',   'badge', 'Garde-robe garnie',  'Posséder quinze cosmétiques.',      0, 130, false),
  ('badge_spend_500',     'badge', 'Premiers achats',    'Dépenser 500 pièces.',              0, 131, false),
  ('badge_spend_2000',    'badge', 'Bon client',         'Dépenser 2 000 pièces.',            0, 132, false),
  ('badge_spend_5000',    'badge', 'Grand dépensier',    'Dépenser 5 000 pièces.',            0, 133, false),
  ('badge_spend_10000',   'badge', 'Magnat de la mode',  'Dépenser 10 000 pièces.',           0, 134, false)
on conflict (key) do nothing;

-- 3) Rattrapage rétroactif des succès comptables (amis / cosmétiques / dépenses).
with fr as (
  select user_id, count(*) as n
  from (
    select requester_id as user_id from public.friendships where status = 'accepted'
    union all
    select addressee_id as user_id from public.friendships where status = 'accepted'
  ) x
  group by user_id
),
cos as (
  select ui.user_id, count(*) as n
  from public.user_items ui
  join public.shop_items si on si.key = ui.item_key
  where si.kind in ('frame', 'title', 'color')
  group by ui.user_id
),
spend as (
  select user_id, sum(-amount) as n
  from public.coin_ledger
  where reason = 'purchase'
  group by user_id
)
insert into public.user_achievements (user_id, key)
select user_id, key from (
  select user_id, 'friend_first'   as key from fr  where n >= 1
  union all select user_id, 'friends_5'      from fr  where n >= 5
  union all select user_id, 'friends_10'     from fr  where n >= 10
  union all select user_id, 'friends_25'     from fr  where n >= 25
  union all select user_id, 'cosmetic_first' from cos where n >= 1
  union all select user_id, 'cosmetic_5'     from cos where n >= 5
  union all select user_id, 'cosmetic_15'    from cos where n >= 15
  union all select user_id, 'spend_500'      from spend where n >= 500
  union all select user_id, 'spend_2000'     from spend where n >= 2000
  union all select user_id, 'spend_5000'     from spend where n >= 5000
  union all select user_id, 'spend_10000'    from spend where n >= 10000
) e
on conflict (user_id, key) do nothing;

-- 4) Pose les badges des succès comptables débloqués.
insert into public.user_items (user_id, item_key)
select ua.user_id, m.badge_key
from public.user_achievements ua
join (values
  ('friend_first',   'badge_friend_first'),
  ('friends_5',      'badge_friends_5'),
  ('friends_10',     'badge_friends_10'),
  ('friends_25',     'badge_friends_25'),
  ('cosmetic_first', 'badge_cosmetic_first'),
  ('cosmetic_5',     'badge_cosmetic_5'),
  ('cosmetic_15',    'badge_cosmetic_15'),
  ('spend_500',      'badge_spend_500'),
  ('spend_2000',     'badge_spend_2000'),
  ('spend_5000',     'badge_spend_5000'),
  ('spend_10000',    'badge_spend_10000')
) as m(ach_key, badge_key) on m.ach_key = ua.key
join public.shop_items si on si.key = m.badge_key
on conflict (user_id, item_key) do nothing;

-- 5) Taux de déblocage par succès (pour la carte « X % des joueurs »).
create or replace function public.achievement_rates()
returns table (key text, unlocked bigint, total bigint)
language sql security definer set search_path = public stable
as $$
  select ua.key,
         count(distinct ua.user_id) as unlocked,
         (select count(*) from public.profiles) as total
  from public.user_achievements ua
  group by ua.key;
$$;
grant execute on function public.achievement_rates() to authenticated;
