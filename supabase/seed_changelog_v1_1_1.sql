-- Mugen — entrée de changelog v1.1.1 (notifications, badges, corrections).
-- À exécuter dans le SQL Editor de Supabase APRÈS les migrations 0016 → 0020.
-- Idempotent : ne réinsère pas si une entrée v1.1.1 existe déjà.
-- Une fois en base, tu peux la modifier depuis /admin/changelog.

insert into public.changelog (version, title, body, published)
select
  'v1.1.1',
  'Notifications, badges et corrections',
  $md$Une mise à jour de finition : un centre de notifications plus propre, des badges enfin complets, et plusieurs corrections demandées par la communauté.

## Boutique & inventaire
- **Onglet « Possédés »** : tout ce que tu possèdes est réuni au même endroit — cadres, couleurs, titres, récompenses **et badges**. Tu équipes ton badge de profil directement d'ici. *(anciennement « Reçus »)*

## Badges & succès
- **Chaque succès donne bien son badge** — y compris **« Premier pronostic »**, qui décroche désormais une ⭐.
- **Rattrapage** : tes succès déjà accomplis sont reconnus et leurs badges ajoutés à ton inventaire.
- **Badges du podium cumulables** : remporter plusieurs fois le même rang affiche ton badge avec un **×2**, **×3**… au lieu d'un doublon.

## Notifications
- Fini les **demandes d'ami en double** : une demande annulée puis renvoyée ne crée plus deux notifications.
- **Centre de notifications plus clair** : les notifications d'information disparaissent une fois lues, et les demandes à traiter restent visibles tant que tu n'as pas répondu — puis s'effacent.

## Corrections
- **Meilleure performance** : le profil ne comptait que le score de base ; il inclut maintenant le **boost** et les **buteurs**. Ton record reflète enfin tes meilleurs matchs.
- **Récompenses du classement** : l'info indiquait « top 3 » alors que **le top 50** est récompensé chaque mois. C'est corrigé partout.

## Interface
- Les **messages de confirmation** sont plus lisibles : un titre, une description, une taille plus généreuse.
- L'accès aux **amis** se fait désormais depuis ton **profil** (l'onglet dédié a quitté la barre de navigation).

Merci pour vos retours — continuez à viser le score exact. 🎯$md$,
  true
where not exists (
  select 1 from public.changelog where version = 'v1.1.1'
);
