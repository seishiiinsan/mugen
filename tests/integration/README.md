# Tests d'intégration (Supabase local)

Ces tests valident les RPC critiques (`security definer`) contre une **vraie**
base Supabase locale — jamais staging/prod. Ils se **désactivent tout seuls**
quand la base n'est pas configurée (`describe.skipIf`), donc `npm test` et la CI
restent verts sans base.

## Mise en place (une fois)

1. Installe la [CLI Supabase](https://supabase.com/docs/guides/cli) et démarre
   Docker.
2. À la racine du repo :

   ```bash
   supabase init        # crée supabase/config.toml (si absent)
   supabase start       # lance la stack locale (Postgres + Auth + ...)
   supabase db reset    # applique supabase/migrations/*.sql dans l'ordre
   ```

3. Récupère les clés locales :

   ```bash
   supabase status      # affiche API URL, anon key, service_role key
   ```

## Lancer la suite

Exporte les trois variables (valeurs par défaut de `supabase start` ci-dessous)
puis lance `test:integration` :

```bash
export SUPABASE_TEST_URL="http://127.0.0.1:54321"
export SUPABASE_TEST_ANON_KEY="<anon key de supabase status>"
export SUPABASE_TEST_SERVICE_ROLE_KEY="<service_role key de supabase status>"

npm run test:integration
```

Sans ces variables, la suite est **skippée** (aucun échec).

## Conventions

- `client.ts` fournit le harness : `hasTestDb`, `adminClient()` (service-role,
  bypass RLS) et `createTestUser()` (crée un compte Auth confirmé + un client
  déjà authentifié ; le profil est créé par le trigger `handle_new_user`).
- Chaque suite nettoie ses données dans `afterAll` (`deleteTestUser` ; les FK
  cascadent vers profil / amitiés / notifications).
- `friends.test.ts` est l'exemple de référence. RPC encore à couvrir :
  `purchase_item` (achat), `group_pot_deposit` (cagnotte), et le flux de
  règlement (`settle`, qui nécessite de semer `fixtures` + `predictions`).
