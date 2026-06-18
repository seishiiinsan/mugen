-- Mugen — entrée de changelog v1.4.1 (wiki + page d'accueil à niveau).
-- À exécuter dans le SQL Editor de Supabase (aucune migration requise).
-- Idempotent : ne réinsère pas si une entrée v1.4.1 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.4.1',
  'Wiki et page d''accueil à niveau',
  $md$Le guide et la vitrine se mettent à jour : toutes les nouveautés des dernières versions y sont enfin présentées.

## Wiki
- **La page d'un match** : nouvelle section sur les compositions au bon schéma, les faits de match, les stats, le classement et le détail de tes points.
- **Classements** : les trois classements sont décrits — mensuel récompensé, « Plus riches » et « Plus d'XP » (prestige, jamais remis à zéro).
- **Amis & profils** : ajout d'amis, profils publics, confidentialité à la carte et cadeaux.
- **Groupes** : cagnotte commune, groupes publics, cosmétiques de groupe et réglages.
- **Boutique** : on explique les cadeaux entre amis et l'onglet « Possédés » rangé par type.
- **Succès** : rangés par thème, avec leur taux de réussite et le rattrapage rétroactif.

## Page d'accueil
- **« Vis le match en entier »** : nouvelle section qui montre compositions, faits de match, stats et détail des points.
- **« Formez vos équipes »** : une section dédiée aux groupes — privés ou publics, cagnotte commune et cosmétiques de groupe.
- **Succès** : la vitrine reflète les nouveaux thèmes (buteurs, amis, cosmétiques…).

Bonne lecture — et visez le score exact. 🎯$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.4.1'
);
