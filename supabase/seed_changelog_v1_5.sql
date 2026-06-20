-- Mugen — entrée de changelog v1.5 (Saison & prestige).
-- À exécuter dans le SQL Editor de Supabase APRÈS la migration 0036.
-- Idempotent : ne réinsère pas si une entrée v1.5 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.5',
  'Saison & prestige : pass mensuel, podium animé et Hall of Fame',
  $md$Une nouvelle raison de jouer tout le mois : un pass saisonnier à paliers, une fin de mois mise en scène, et un Hall of Fame pour les champions.

## Pass saisonnier
- **Des paliers en jouant** : plus tu marques de points dans le mois, plus tu débloques de paliers — **gratuits et cosmétiques**, jamais d'avantage compétitif.
- **À réclamer** : chaque palier atteint se réclame d'un geste pour empocher des **pièces**, et le palier ultime offre un **badge Saison** exclusif, cumulable (×N) au fil des mois.
- **Nouvelle page Saison** : suis ta progression, le prochain palier et tes récompenses en attente.

## Ton mois en chiffres
- **Récap perso** : points, rang, scores exacts et paliers atteints, d'un coup d'œil.

## Classement
- **Podium animé** : le top 3 du mois s'anime à l'ouverture du classement.
- **Hall of Fame** : un nouvel onglet qui archive les podiums passés — les champions ne disparaissent plus à la remise à zéro mensuelle.

Joue, grimpe, réclame. 🎖️$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.5'
);
