-- Mugen — entrée de changelog v1.4.2 (logo & identité visuelle).
-- À exécuter dans le SQL Editor de Supabase (aucune migration requise).
-- Idempotent : ne réinsère pas si une entrée v1.4.2 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.4.2',
  'Le logo entre en jeu',
  $md$Mugen a enfin son logo, affiché partout où il faut.

## Identité
- **Onglet du navigateur** : le logo remplace le favicon par défaut.
- **Écran d'accueil & PWA** : une icône dédiée (dont la version Apple) quand tu ajoutes Mugen à ton écran d'accueil.
- **À côté du nom** : le logo accompagne désormais « Mugen » dans la barre de navigation, le pied de page et la page de connexion.

Merci de faire vivre Mugen. 🏆$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.4.2'
);
