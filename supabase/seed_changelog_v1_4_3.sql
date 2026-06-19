-- Mugen — entrée de changelog v1.4.3 (retour de la connexion par e-mail).
-- À exécuter dans le SQL Editor de Supabase (aucune migration requise).
-- Idempotent : ne réinsère pas si une entrée v1.4.3 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.4.3',
  'La connexion par e-mail est de retour',
  $md$Tu peux de nouveau créer ton compte et te connecter avec une adresse e-mail et un mot de passe — en plus de « Continuer avec Google ».

## Connexion
- **E-mail + mot de passe** : inscription et connexion réactivées, aux côtés de Google.
- **Onglets Connexion / Inscription** : bascule de l'un à l'autre sans quitter la page.
- **Inscription immédiate** : ton compte est créé et tu es connecté dans la foulée.

Bon retour sur Mugen. ⚽$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.4.3'
);
