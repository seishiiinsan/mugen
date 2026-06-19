-- Mugen — entrée de changelog v1.5 (tests & intégration continue).
-- À exécuter dans le SQL Editor de Supabase (aucune migration requise).
-- Idempotent : ne réinsère pas si une entrée v1.5 existe déjà.
--
-- BROUILLON (published = false) : le chantier tests + CI n'est pas encore livré
-- ("Aucun test n'existe" au moment de la rédaction). La note reste cachée du
-- /changelog public et n'apparaît que dans /admin/changelog. Passe published à
-- true (ici ou depuis /admin/changelog) quand v1.5 sortira réellement.

insert into public.changelog (version, title, body, published)
select
  'v1.5',
  'Sous le capot : un vrai filet de sécurité',
  $md$Pas de nouveauté visible cette fois — Mugen se renforce en coulisses.

## Fiabilité
- **Logique de jeu testée** : le calcul des points, les marchés (buteurs & co), les niveaux et les boosts sont couverts par des tests automatiques.
- **Vérifs à chaque mise à jour** : chaque changement passe une série de contrôles automatiques avant d'arriver jusqu'à toi.
- **Moins de régressions** : on ajoute des fonctionnalités sans casser l'existant.

Du solide pour la suite. 🛡️$md$,
  false
where not exists (
  select 1 from public.changelog where version = 'v1.5'
);
