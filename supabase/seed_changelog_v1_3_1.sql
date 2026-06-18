-- Mugen — entrée de changelog v1.3.1 (cagnottes réparées, boutique réorganisée).
-- À exécuter dans le SQL Editor de Supabase APRÈS la migration 0030.
-- Idempotent : ne réinsère pas si une entrée v1.3.1 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.3.1',
  'Cagnottes réparées et boutique réorganisée',
  $md$Un patch de finition pour les groupes : les cagnottes refonctionnent et la boutique gagne en clarté.

## Corrections
- **Cagnotte de nouveau opérationnelle** : les dépôts et les achats échouaient avec « Dépôt impossible. » / « Achat impossible. ». C'est corrigé — tu peux à nouveau alimenter la cagnotte et y dépenser.

## Boutique
- **Onglet « Cosmétiques de groupes »** : les fonds, icônes et titres de groupe ont leur propre onglet, entre *Titres* et *Possédés*.
- **« Possédés » par type** : ton inventaire se filtre désormais par catégorie (cadres, couleurs, titres, badges…) via des sous-onglets, pour t'y retrouver d'un coup d'œil.

Merci pour vos retours. 🏆$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.3.1'
);
