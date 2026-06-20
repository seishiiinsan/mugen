# Mugen

Application de **pronostics football** : prédire le score exact des matchs,
marquer des points (barème [`lib/domain/scoring.ts`](lib/domain/scoring.ts)),
grimper dans le classement mondial mensuel, débloquer des succès et des
cosmétiques.

Stack : **Next.js 16** (App Router, Server Components), **Supabase**
(Postgres + Auth + RLS), **Tailwind CSS v4**, **Vitest**. Sans Supabase
configuré, l'app tourne sur des données fictives (mock) — pratique pour
développer l'UI.

## Démarrage

```bash
npm install
npm run dev          # http://localhost:3000
```

### Variables d'environnement

Copier l'exemple puis renseigner les valeurs :

```bash
cp .env.local.example .env.local
```

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase (public). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement** — settling des points, écritures privilégiées. Ne jamais exposer au client. |
| `BZZOIRO_API_KEY` | API football (données des matchs), serveur uniquement. |
| `CRON_SECRET` | Protège la route `/api/settle`. Générer : `openssl rand -hex 16`. |
| `NEXT_PUBLIC_SITE_URL` | Optionnel — origine canonique (metadata/sitemap). À défaut, l'URL injectée par Netlify, sinon `localhost`. |

Détail du setup Supabase (auth, Google OAuth, redirections) :
[`supabase/README.md`](supabase/README.md).

### Migrations

Le schéma vit dans [`supabase/migrations/`](supabase/migrations), numéroté.
À appliquer **dans l'ordre** (`0001` → `0035`) via le **SQL Editor** du
dashboard Supabase. Chaque fichier est idempotent et reprend là où le précédent
s'arrête ; ne pas en sauter. Les `seed_changelog_*.sql` (facultatifs) peuplent
la page Nouveautés.

## Architecture

Accès aux données en couches, du plus haut au plus bas :

```
Server Components / Server Actions
        │  importent UNIQUEMENT…
        ▼
DAL — lib/data/index.ts           (façade typée ; bascule mock ⇄ Supabase)
        │  appelle…
        ▼
RPC Postgres « security definer » (supabase/migrations/*.sql)
        │  seul moyen d'écrire/lire le sensible…
        ▼
RLS — tables verrouillées          (aucune policy d'accès direct)
```

- **DAL** ([`lib/data`](lib/data/index.ts)) : la seule porte d'entrée des
  pages. Renvoie des données mock si Supabase n'est pas configuré.
- **RPC** : amitiés, notifications, économie, classements, signalements,
  blocages… passent par des fonctions `security definer` qui appliquent
  elles-mêmes les règles (visibilité, anti-abus, rate-limit).
- **RLS** : `friendships`, `notifications`, `reports`, `blocks`, `rate_limits`
  ont la RLS activée **sans policy** — l'accès direct est interdit, tout transite
  par les RPC.
- **Logique métier pure** ([`lib/domain`](lib/domain)) : scoring, marchés,
  économie, boosts — sans dépendance, testée par Vitest (réutilisée côté serveur
  pour le settling et côté UI pour l'aperçu des points).

## Settling (calcul des points)

Les points sont calculés quand un match est terminé, via
[`/api/settle`](app/api/settle/route.ts) (protégée par `CRON_SECRET`) qui lance
[`settlePredictions`](lib/settle.ts) avec le client service-role.

- **Planifié** : la fonction Netlify
  [`netlify/functions/settle-cron.mts`](netlify/functions/settle-cron.mts)
  appelle la route **toutes les heures** (`@hourly`). C'est l'**unique** source
  de cron (cf. Déploiement).
- **Manuel** : `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/settle`
  (ou `?key=$CRON_SECRET`).

## Scripts

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # tests unitaires (Vitest)
npm run test:integration   # tests RPC (nécessite une base Supabase locale — voir tests/integration/README.md)
```

CI : [`.github/workflows/ci.yml`](.github/workflows/ci.yml) lance lint +
typecheck + tests + build sur chaque PR.

## Déploiement

Hébergé sur **Netlify**. Le cron de settling est porté **uniquement** par la
fonction Netlify `settle-cron.mts` — il n'y a volontairement pas de
`vercel.json`, pour éviter un double settling si le projet était aussi déployé
sur Vercel. Variables d'environnement à définir côté Netlify : les mêmes que
`.env.local`.
