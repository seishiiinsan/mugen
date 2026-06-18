-- Mugen — entrée de changelog v1.4 (détails match, pronos, succès).
-- À exécuter dans le SQL Editor de Supabase APRÈS la migration 0031.
-- (Puis lancer une fois /api/backfill pour rattraper les succès rétroactifs.)
-- Idempotent : ne réinsère pas si une entrée v1.4 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.4',
  'Matchs détaillés, pronos gamifiés et pluie de succès',
  $md$La plus grosse mise à jour côté matchs : une page de détails repensée, des pronos plus vivants, et une vague de succès à débloquer.

## Détails du match
- **Faits de match** revus : une vraie frise chronologique à deux camps, avec buts ⚽ et cartons.
- **Compositions au bon schéma** : le terrain affiche enfin la **vraie formation** (4-4-2, 4-2-3-1…) et plus une grille générique.
- **Remplaçants des deux équipes** : un seul bouton déroule les bancs des deux côtés en même temps.
- **Classement enrichi** : victoires / nuls / défaites, rang mis en avant et tes deux équipes surlignées.
- **Moins de bruit** : la section « Confrontations » disparaît quand il n'y a aucun face-à-face passé.

## Mes pronos
- **Boosts gamifiés** : chaque boost a son emoji (⚡ 🎲 🎰) et une petite animation à l'activation.
- **Buteurs par poste** : la sélection des buteurs est rangée par poste — attaquants, milieux, défenseurs, gardien.

## Cartes de pronostic
- **Détail des points** sur les matchs terminés : score de base **+ boost + buteurs = total**, tout est expliqué.
- **Buteurs notés** : chaque buteur pronostiqué passe au vert (réussi, avec ses points) ou au rouge (raté, −2).

## Succès
- **Une grande vague de succès** sur cinq thèmes : pronostics, **buteurs**, **amis**, **cosmétiques** et **monnaie** — chacun avec son badge.
- **Page Succès par onglets** : un onglet par thème pour s'y retrouver.
- **Taux de réussite** : chaque succès affiche le **pourcentage de joueurs** qui l'ont débloqué.
- **Rattrapage rétroactif** : ce que tu avais déjà accompli avant l'ajout d'un succès (un bon buteur, des amis, des achats…) est reconnu automatiquement.

Bon jeu — et visez le score exact. 🎯$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.4'
);
