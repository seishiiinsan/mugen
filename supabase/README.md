# Supabase — configuration Mugen

## 1. Créer le projet

1. Créez un projet sur [supabase.com](https://supabase.com).
2. **Project Settings → API** : copiez `Project URL` et la clé `anon` (publique)
   ainsi que la clé `service_role` (secrète).
3. À la racine du repo, copiez `.env.local.example` en `.env.local` et collez ces
   valeurs.

## 2. Appliquer le schéma

Dans le **SQL Editor** du dashboard, exécutez le contenu de
[`migrations/0001_init.sql`](./migrations/0001_init.sql).

Ce script crée :

- `profiles` (pseudo unique, création automatique à l'inscription via trigger) ;
- `fixtures` (cache des matchs API-Football, écriture service-role uniquement) ;
- `predictions` (un prono par match/joueur, RLS stricte) ;
  - les points ne sont jamais modifiables par le client (trigger `protect_points`) ;
  - le verrou J-15 min est imposé côté base (trigger `enforce_lock`) ;
- `monthly_leaderboard()` : fonction `SECURITY DEFINER` pour le classement mensuel.

## 3. Activer l'authentification

### E-mail / mot de passe
**Authentication → Providers → Email** : activé par défaut. Pour le développement,
vous pouvez désactiver la confirmation d'e-mail (Authentication → Providers → Email
→ *Confirm email*), sinon l'inscription renvoie « vérifiez votre e-mail ».

### Google OAuth
1. Console Google Cloud → *APIs & Services → Credentials → OAuth client ID* (type
   *Web application*).
2. **Authorized redirect URI** :
   `https://VOTRE-PROJET.supabase.co/auth/v1/callback`
3. Copiez *Client ID* / *Client secret* dans **Supabase → Authentication →
   Providers → Google**.

### URLs de redirection
**Authentication → URL Configuration** :

- *Site URL* : `http://localhost:3000` (puis votre domaine de prod)
- *Redirect URLs* : ajoutez `http://localhost:3000/auth/callback` et l'équivalent
  de production.

## 4. Lancer

```bash
npm run dev
```

Sans `.env.local`, l'app tourne sur des données fictives (mock) et `/login`
affiche un message de configuration. Une fois les variables renseignées,
l'authentification et la protection des routes (`proxy.ts`) s'activent
automatiquement.
