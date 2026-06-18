-- Mugen — entrée de changelog v1.3 (groupes : cagnottes, cosmétiques, public, réglages).
-- À exécuter dans le SQL Editor de Supabase APRÈS les migrations 0027 → 0029.
-- Idempotent : ne réinsère pas si une entrée v1.3 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.3',
  'Les groupes passent à la vitesse supérieure',
  $md$Cagnottes communes, cosmétiques de groupe, groupes publics et réglages : vos groupes deviennent de vraies équipes.

## Nouveau — Cagnotte de groupe
- **Une cagnotte commune** : chaque membre y dépose ses pièces depuis la page du groupe. Le montant quitte ton solde perso et rejoint la cagnotte.
- **Cosmétiques de groupe** : dans la boutique, une nouvelle section « Cosmétiques de groupes » — fonds, icônes (drapeaux & co) et titres — payés avec la cagnotte. **Seul le propriétaire** peut la dépenser, et choisit le groupe concerné via un sélecteur.
- **Équité garantie** : si tu quittes un groupe ou qu'il est supprimé, le solde restant est **remboursé au prorata** de ce que chacun a déposé.

## Nouveau — Groupes publics
- **Crée un groupe public** : visible et rejoignable par tous, sans code.
- **Découverte** : dans « Rejoindre », le lien **« Je n'ai pas de code »** ouvre la liste des groupes publics, avec **recherche en direct** — un clic pour rejoindre.

## Nouveau — Réglages de groupe
- Le propriétaire ajuste, depuis les paramètres du groupe : **nom**, **visibilité** (public/privé), **nombre max de membres** et **niveau requis** pour rejoindre.
- Les cosmétiques achetés s'équipent aussi depuis cette page.

## Corrections
- Les récompenses **non vendables** (badges, titre « First »…) ne proposent plus de bouton « cadeau » : seules les pièces achetables peuvent être offertes.

Bon jeu — et formez les meilleures équipes. 🏆$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.3'
);
