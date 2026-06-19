-- Mugen — entrée de changelog v1.4.3 (navigation : accès aux profils).
-- À exécuter dans le SQL Editor de Supabase (aucune migration requise).
-- Idempotent : ne réinsère pas si une entrée v1.4.3 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.4.3',
  'Navigation plus cohérente',
  $md$Quelques corrections discrètes sur la navigation.

## Accès
- **Profils de joueurs** : consultés sans être connecté, ils te redirigent désormais vers la connexion plutôt que d'afficher une page incomplète.
- **Retour automatique** : une fois identifié, tu reviens directement sur la page que tu voulais voir.

Merci de faire vivre Mugen. ⚽$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.4.3'
);
