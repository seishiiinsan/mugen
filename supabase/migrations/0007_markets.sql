-- Mugen — Marchés additionnels : buteurs, Over/Under 2.5, BTTS.
-- À exécuter dans le SQL Editor de Supabase après 0006.
--
-- Le calcul des points reste applicatif (lib/domain/markets.ts + lib/settle.ts) :
-- la base de données ne fait que stocker les sélections. Les triggers existants
-- (enforce_lock, protect_points) s'appliquent automatiquement à ces colonnes
-- puisqu'elles vivent sur `predictions`.

alter table public.predictions
  add column if not exists ou_25   text,
  add column if not exists btts    text,
  add column if not exists scorers jsonb not null default '[]'::jsonb;

alter table public.predictions
  drop constraint if exists predictions_ou_25_chk,
  add  constraint predictions_ou_25_chk check (ou_25 in ('over', 'under'));

alter table public.predictions
  drop constraint if exists predictions_btts_chk,
  add  constraint predictions_btts_chk check (btts in ('yes', 'no'));

-- Cap anti-abus : au plus 5 buteurs pronostiqués (le malus −2 dissuade déjà).
alter table public.predictions
  drop constraint if exists predictions_scorers_max,
  add  constraint predictions_scorers_max check (jsonb_array_length(scorers) <= 5);
