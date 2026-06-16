-- Mugen — première entrée de changelog (v1.0).
-- À exécuter dans le SQL Editor de Supabase APRÈS la migration 0013.
-- Idempotent : ne réinsère pas si une entrée v1.0 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.0',
  'Lancement de Mugen',
  $md$Bienvenue sur **Mugen**, le jeu de pronostics où seul le **score exact** compte vraiment.

## Au programme
- **Pronostics** sur les grands championnats, mis à jour chaque jour.
- **Barème de précision** : score exact, bon vainqueur, bon écart — chaque justesse rapporte.
- **Classement mondial** remis à zéro chaque mois, avec un podium récompensé.
- **Boosts mensuels** : Points ×2, Double chance et Banco, à dégainer au bon moment.
- **Groupes privés** pour défier tes amis dans un classement à part.

## Progression & récompenses
- **Pièces** gagnées en jouant + **bonus quotidien**, à dépenser dans la **boutique** (cadres, couleurs, titres, badges).
- **Niveaux & XP** et des **succès** à débloquer au fil de tes pronostics.

## Et aussi
- Un **wiki** complet pour tout comprendre, et une page **Nouveautés** (celle-ci !) pour suivre les évolutions.
- Un bouton **Signaler** pour nous remonter bugs et idées — on lit tout.

Bon jeu, et vise le sommet. 🏆$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.0'
);
