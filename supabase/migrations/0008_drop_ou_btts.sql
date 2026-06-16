-- Mugen — Retrait des marchés Over/Under 2.5 et BTTS.
-- À exécuter dans le SQL Editor de Supabase après 0007.
--
-- Ces marchés étaient redondants avec le score exact (un 4-2 implique
-- mécaniquement « +2,5 buts » et « les deux marquent »). On ne garde que les
-- buteurs, dont le barème dépend désormais du poste (lib/domain/markets.ts).
-- Les buteurs restent stockés dans predictions.scorers (jsonb), qui contient
-- maintenant aussi la position de chaque joueur pronostiqué.

alter table public.predictions drop constraint if exists predictions_ou_25_chk;
alter table public.predictions drop constraint if exists predictions_btts_chk;

alter table public.predictions drop column if exists ou_25;
alter table public.predictions drop column if exists btts;
