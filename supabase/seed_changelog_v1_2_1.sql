-- Mugen — entrée de changelog v1.2.1 (corrections : photo de profil, buteurs).
-- À exécuter dans le SQL Editor de Supabase APRÈS la migration 0026.
-- Idempotent : ne réinsère pas si une entrée v1.2.1 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.2.1',
  'Photo de profil et buteurs — corrections',
  $md$Une mise à jour de finition qui répare deux blocages signalés.

## Profil
- **Photo de profil réparée** : l'envoi d'un avatar échouait avec « Échec de l'envoi de l'image ». C'est corrigé — tu peux de nouveau changer ta photo (JPG ou PNG, 2 Mo max).

## Pronostics
- **Buteurs enfin modifiables** : en éditant un pronostic, tu revois les buteurs déjà sélectionnés et tu peux les retirer — même quand la composition n'est pas encore affichée ou a changé depuis ton choix. Fini les buteurs « collés » impossibles à enlever d'un appareil à l'autre.

Merci pour vos retours — continuez à viser le score exact. 🎯$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.2.1'
);
