# FACEIT Coach

Assistant CS2 pour FACEIT : bot Discord, API HTTP et extension Chrome partageant une meme logique d'analyse pick/ban basee sur l'historique reel des joueurs.

## Apercu

- **Bot Discord** — slash commands `/analyze`, `/player`, `/live`, `/strats` pour obtenir des recommandations pick/ban, les stats d'un joueur ou les strats d'une map directement depuis Discord.
- **API HTTP** — proxy Hono devant la logique d'analyse, consomme par l'extension et ouvert a tout client externe (auth par cle, rate limit, CORS restrictif).
- **Extension Chrome (MV3)** — popup sur `faceit.com` : detecte automatiquement le `roomId`, lance l'analyse et affiche pick/ban + stats joueur.

Tout est en TypeScript strict, organise en monorepo pnpm + Turborepo.

## Fonctionnalites cles

- Analyse pick/ban ponderee par ELO (winrate 50% / K-D 30% / ELO 20%), avec ajustement d'incertitude pour les faibles echantillons.
- Periode d'historique configurable (1 a 24 mois, defaut 6) — les picks reflettent la forme recente, pas la lifetime.
- Cache in-memory (10 min pour les stats, 5 min pour l'historique, 2 min pour les details de match) + retry automatique sur 429 FACEIT.
- Strategies statiques par map (pistol + gun rounds, CT/T + anti-eco/force-buy) pour les 8 maps du pool.
- Stack de securite API : `X-API-Key` (obligatoire en prod), rate limit par IP, headers securises, HSTS en prod, graceful shutdown SIGTERM/SIGINT.
- Containers Docker non-root avec healthcheck et limites de ressources.

## Stack technique

| Couche | Techno |
|--------|--------|
| Runtime | Node.js 24 (Alpine en Docker) |
| Langage | TypeScript strict, ES modules, target ES2023 |
| Monorepo | pnpm workspaces + Turborepo |
| Bot | discord.js 14 |
| API | Hono + @hono/node-server + Zod + Pino + hono-rate-limiter |
| Extension | Vue 3 + Pinia + VueUse + UnoCSS + WXT (cross-browser MV3, Chrome + Firefox) |
| Tests | Vitest |
| Lint | ESLint preset @antfu/eslint-config (+ vue + unocss) |

## Architecture

```
faceit-coach/
├── packages/
│   ├── core/         # @faceit-coach/core — logique FACEIT partagee (zero dep Discord/HTTP)
│   ├── bot/          # @faceit-coach/bot — Discord, importe core directement
│   ├── api/          # @faceit-coach/api — HTTP (Hono), client de core
│   └── extension/    # @faceit-coach/extension — Cross-browser MV3 (Chrome + Firefox), client de l'API
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

Responsabilites :

- **core** : cerveau partage. Pas de `process.env`, pas de `chrome.*`, pas de `discord.js`. `initFaceitApi(key)` doit etre appele une fois au bootstrap.
- **bot** : importe `@faceit-coach/core` directement (pas d'appel HTTP intermediaire).
- **api** : proxifie core via HTTP pour les clients externes. Valide toutes les entrees avec Zod.
- **extension** : pur client de l'API. Jamais d'appel FACEIT direct (la cle reste cote serveur).

## Commandes Discord

| Commande | Description | Options |
|----------|-------------|---------|
| `/analyze` | Recommandations pick/ban d'un lobby | `room_id` (requis), `months` (1-24, defaut 6), `team` (1 ou 2) |
| `/player` | Stats lifetime + top/bottom maps | `pseudo` (requis) |
| `/live` | Detecte si le joueur est en match et lance l'analyse | `pseudo` (requis), `months` (1-24, defaut 6) |
| `/strats` | Strategies CS2 par map (pistol + gun rounds) | `map` (choix parmi le pool) |

## Endpoints API

| Methode | Path | Description |
|---------|------|-------------|
| GET | `/health` | Health check (pas d'auth ni rate limit) |
| POST | `/analyze` | Analyse pick/ban `{ roomId, team, periodMonths? }` |
| GET | `/player/:pseudo` | Profil + stats lifetime + maps triees |
| GET | `/live/:pseudo` | Etat live du joueur (`?periodMonths=N`) |
| GET | `/match/:roomId` | Details d'un match FACEIT |
| GET | `/strats` | Liste des maps avec strategies |
| GET | `/strats/:map` | Strats CT/T d'une map |

Securite sur toutes les routes sauf `/health` : auth `X-API-Key` (quand `API_KEY` configure), rate limit 60 req/min/IP, headers securises, CORS whitelist stricte.

## Documentation

Toutes les docs sont dans [`docs/`](./docs/) :

- **[`docs/INSTALLATION.md`](./docs/INSTALLATION.md)** — installation locale (dev), credentials, lancer bot/api/extension.
- **[`docs/HOSTING.md`](./docs/HOSTING.md)** — self-host le backend (Raspberry Pi ou tout serveur Linux + Docker), exposer l'API, monitoring.
- **[`docs/RELEASE.md`](./docs/RELEASE.md)** — flow tag-based (CI build extension + deploy auto serveur, secrets GitHub).
- **[`docs/PUBLISHING.md`](./docs/PUBLISHING.md)** — publier l'extension sur Chrome Web Store (Unlisted) et Firefox AMO (self-distribution).

Source de verite technique (architecture, conventions, securite) : [`CLAUDE.md`](./CLAUDE.md).

## Installation

Guide complet : **[`docs/INSTALLATION.md`](./docs/INSTALLATION.md)**.

En version courte :

```bash
pnpm install
cp .env.example .env   # remplir les tokens
pnpm dev:bot           # ou dev:api, dev:extension
```

Pour deployer sur serveur avec bot + API :

```bash
docker compose up -d
```

## Scripts racine

| Script | Commande |
|--------|----------|
| Build tous packages | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Tests | `pnpm test` |
| Lint | `pnpm lint` / `pnpm lint:fix` |
| Dev bot | `pnpm dev:bot` |
| Dev api | `pnpm dev:api` |
| Dev extension | `pnpm dev:extension` |

## Configuration

Variables d'environnement (voir `.env.example`) :

| Variable | Requis | Description |
|----------|--------|-------------|
| `DISCORD_TOKEN` | bot | Token du bot Discord |
| `DISCORD_CLIENT_ID` | bot | Application ID Discord |
| `FACEIT_API_KEY` | bot + api | Cle FACEIT Open Data |
| `API_PORT` | api | Port d'ecoute (defaut 8787) |
| `API_KEY` | api (prod) | Cle attendue dans `X-API-Key`. Facultatif en dev, **obligatoire en prod** |
| `API_CORS_ORIGINS` | api | Origins autorises, csv. Vide par defaut (strict) |
| `API_RATE_LIMIT_PER_MINUTE` | api | Limite par IP (defaut 60) |
| `LOG_LEVEL` | api | Niveau pino (defaut `info`) |
| `NODE_ENV` | api (prod) | `production` active HSTS et l'enforcement d'`API_KEY` |

## Contribution

- Lire `CLAUDE.md` — source de verite du projet (architecture, conventions, securite).
- Conventional commits : `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, etc.
- `pnpm lint` et `pnpm test` doivent passer avant tout commit (hook pre-commit `lint-staged`).
- TypeScript strict. Pas de `any`.

## Licence

ISC.
