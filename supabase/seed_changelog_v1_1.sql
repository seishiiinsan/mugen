-- Mugen — entrée de changelog v1.1 (amis, profils, fiabilité).
-- À exécuter dans le SQL Editor de Supabase APRÈS les migrations 0014 + 0015.
-- Idempotent : ne réinsère pas si une entrée v1.1 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.1',
  'Amis, profils publics et fiabilité',
  $md$Une grosse mise à jour orientée social — et des corrections importantes sur les points.

## Nouveau — Amis & profils
- **Ajoute des amis** : recherche un joueur par pseudo, envoie une demande, accepte ou refuse les demandes reçues.
- **Profils publics** : visite le profil d'un joueur pour voir son niveau, ses stats, ses succès et ses pronostics à venir.
- **Confidentialité à la carte** : règle séparément qui peut voir tes **pronostics**, tes **statistiques**, tes **succès** et ta **liste d'amis** — *tout le monde*, *amis seulement* ou *moi uniquement* (dans Modifier le profil).
- **Notifications** : une cloche t'avertit des demandes d'amis reçues et acceptées.

## Nouveau — Pronostics
- Tes **buteurs choisis** s'affichent maintenant directement sous chaque pronostic.

## Fiabilité
- Les **points, le classement, les pièces, l'XP et les succès** se mettent désormais à jour **automatiquement** après chaque match terminé.
- Correction du **décompte des buteurs** : un buteur correctement pronostiqué pouvait, dans certains cas, ne pas être validé. C'est réglé, et les pronostics concernés ont été recalculés.

Merci pour vos retours — continuez à viser le score exact. 🎯$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.1'
);
