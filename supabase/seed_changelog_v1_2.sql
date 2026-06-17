-- Mugen — entrée de changelog v1.2 (cadeaux, classements, signalements).
-- À exécuter dans le SQL Editor de Supabase APRÈS les migrations 0021 → 0025.
-- Idempotent : ne réinsère pas si une entrée v1.2 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.2',
  'Cadeaux entre amis, nouveaux classements et signalements',
  $md$De nouvelles façons de jouer ensemble — et de gérer tes retours.

## Nouveau — Amis
- **Offre des cosmétiques à tes amis** : dans la boutique, le bouton 🎁 sur un cadre, une couleur ou un titre te laisse choisir un ami à qui l'offrir. Le cadeau atterrit directement dans son inventaire, et il reçoit une notification.
- **Zéro doublon, zéro dépense inutile** : les amis qui possèdent déjà l'article sont indiqués et grisés dans le sélecteur — et l'achat est de toute façon annulé s'ils l'ont déjà.

## Nouveau — Classements
- **Deux classements de plus, à onglets** : **Plus riches** (solde de pièces) et **Plus d'XP** (expérience à vie). Ils ne se remettent **jamais** à zéro et ne rapportent rien d'autre que le prestige — une nouvelle façon de viser le sommet, en plus du classement mensuel récompensé.

## Signalements
- **Tri par onglets** dans « Mes signalements » : **Bugs**, **Suggestions**, **Autres**.
- **Modifie ou supprime** tes propres signalements tant qu'ils n'ont pas encore été pris en charge.

Merci de faire vivre Mugen — et pensez à gâter vos amis. 🎁$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.2'
);
