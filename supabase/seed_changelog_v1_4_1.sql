-- Mugen — entrée de changelog v1.4.1 (mise à jour du wiki).
-- À exécuter dans le SQL Editor de Supabase (aucune migration requise).
-- Idempotent : ne réinsère pas si une entrée v1.4.1 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.4.1',
  'Le wiki fait le plein',
  $md$Le guide se met à niveau : toutes les nouveautés des dernières versions y sont enfin expliquées.

## Wiki
- **La page d'un match** : nouvelle section sur les compositions au bon schéma, les faits de match, les stats, le classement et le détail de tes points.
- **Classements** : les trois classements sont décrits — mensuel récompensé, « Plus riches » et « Plus d'XP » (prestige, jamais remis à zéro).
- **Amis & profils** : ajout d'amis, profils publics, confidentialité à la carte et cadeaux.
- **Groupes** : cagnotte commune, groupes publics, cosmétiques de groupe et réglages.
- **Boutique** : on explique les cadeaux entre amis et l'onglet « Possédés » rangé par type.
- **Succès** : rangés par thème, avec leur taux de réussite et le rattrapage rétroactif.

Bonne lecture — et visez le score exact. 🎯$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.4.1'
);
