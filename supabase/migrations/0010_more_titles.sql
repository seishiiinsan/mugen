-- Mugen — Échelle de titres (tags) : beaucoup plus de titres, en paliers de
-- prix croissants (rareté), pour donner un objectif d'achat à long terme.
-- À exécuter dans le SQL Editor de Supabase après 0009.

-- Réajuste les prix des titres existants (plus prestigieux = plus cher).
update public.shop_items set price = 150  where key = 'title_rookie';
update public.shop_items set price = 1000 where key = 'title_tacticien';
update public.shop_items set price = 4000 where key = 'title_visionnaire';

-- Nouveaux titres (visuels dans lib/domain/cosmetics.ts).
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('title_parieur',      'title', 'Titre « Parieur »',      'Affiche le titre Parieur.',       300,  33, true),
  ('title_pronostiqueur','title', 'Titre « Pronostiqueur »', 'Affiche le titre Pronostiqueur.', 600,  34, true),
  ('title_analyste',     'title', 'Titre « Analyste »',      'Affiche le titre Analyste.',     1500,  35, true),
  ('title_stratege',     'title', 'Titre « Stratège »',      'Affiche le titre Stratège.',     2200,  36, true),
  ('title_oracle',       'title', 'Titre « Oracle »',        'Affiche le titre Oracle.',       3000,  37, true),
  ('title_maestro',      'title', 'Titre « Maestro »',       'Affiche le titre Maestro.',      5500,  38, true),
  ('title_devin',        'title', 'Titre « Devin »',         'Affiche le titre Devin.',        7000,  39, true),
  ('title_legende',      'title', 'Titre « Légende »',       'Affiche le titre Légende.',     10000,  40, true),
  ('title_mugen',        'title', 'Titre « 無限 »',           'Le titre ultime, 無限 (Mugen).',  20000,  41, true)
on conflict (key) do nothing;
