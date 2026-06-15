-- Mugen — 0002 : stocker les logos (et ids) d'équipes/ligue dans le cache
-- `fixtures`, pour les afficher hors de la liste du jour (ex. Mes pronostics).
-- À exécuter dans le SQL Editor de Supabase.

alter table public.fixtures
  add column if not exists league_logo text,
  add column if not exists home_id     int,
  add column if not exists home_logo   text,
  add column if not exists away_id      int,
  add column if not exists away_logo    text;
