# FACEIT Coach — Monorepo (Bot Discord + API + Extension Chrome)

## Instructions

- **Ce fichier est la source de verite du projet.** Il doit etre mis a jour a chaque modification d'architecture, ajout/suppression de package, commande, service, type ou changement de constante. Toute PR ou modification significative doit se refleter ici.
- Lire ce fichier en entier avant de modifier le projet.

## Stack

- **Runtime:** Node.js 22 (Alpine en Docker)
- **Langage:** TypeScript (ES2023, strict, ES modules)
- **Monorepo:** pnpm workspaces + Turborepo
- **Bot:** discord.js 14
- **API:** Hono + @hono/node-server + @hono/zod-validator + Zod + Pino
- **Extension:** Chrome MV3 via Vite + @crxjs/vite-plugin + Vue 3 + Pinia + VueUse + UnoCSS + @webext-core/messaging + unplugin-auto-import/components
- **Tests:** Vitest (globals: true)
- **Lint:** ESLint preset @antfu/eslint-config (+ vue + unocss)
- **Build:** `tsc` avec project references (composite/incremental)
- **Hooks:** simple-git-hooks + lint-staged
- **Package manager:** pnpm 10.33.0
- **CI:** GitHub Actions (lint, build, typecheck, test — via Turbo)

## Scripts racine

| Script | Commande |
|--------|----------|
| Build tous packages | `pnpm build` (turbo) |
| Typecheck | `pnpm typecheck` |
| Tests | `pnpm test` |
| Lint | `pnpm lint` / `pnpm lint:fix` |
| Dev bot | `pnpm dev:bot` |
| Dev api | `pnpm dev:api` |
| Dev extension | `pnpm dev:extension` |

## Architecture

```
faceit-coach/
├── pnpm-workspace.yaml     # packages/*
├── turbo.json              # pipeline build/test/typecheck
├── tsconfig.base.json      # config TS partagee
├── tsconfig.json           # project references (root)
├── docker-compose.yml      # services bot + api
├── eslint.config.ts        # antfu + vue + unocss
└── packages/
    ├── core/               # @faceit-coach/core — cerveau partage, zero dep Discord/HTTP
    ├── bot/                # @faceit-coach/bot — Discord, importe core directement
    ├── api/                # @faceit-coach/api — HTTP (Hono), client de core, consomme par extension
    └── extension/          # @faceit-coach/extension — Chrome MV3, client de l'API
```

### packages/core
```
src/
├── index.ts                # barrel export
├── types.ts                # FACEIT API types + types domaine (MapScore, PickBanResult, ...)
├── data/strats.ts          # strategies statiques par map
├── services/
│   ├── faceit-api.ts       # client FACEIT (init via initFaceitApi(key) au bootstrap)
│   ├── analyzer.ts         # scoring + pick/ban
│   └── cache.ts            # cache in-memory (node-cache)
├── utils/constants.ts      # map pool, seuils, TTL, CT bias
└── __tests__/              # vitest — analyzer, faceit-api, cache, constants
```

### packages/bot
```
src/
├── index.ts                # entry point, initFaceitApi(), load + register slash commands
├── config.ts               # process.env → { discordToken, discordClientId, faceitApiKey }
├── types.ts                # BotCommand { data, execute }
├── commands/               # /analyze, /player, /live, /strats
├── utils/embeds.ts         # builders d'embeds Discord
└── __tests__/embeds.test.ts
```

### packages/api
```
src/
├── index.ts                # Hono app — security headers, CORS, logger, rate limit, auth (X-API-Key), routes, graceful shutdown (SIGTERM/SIGINT)
├── config.ts               # process.env → { faceitApiKey, port, corsOrigins, apiKey, rateLimitPerMinute }
├── logger.ts               # pino + redact (authorization, x-api-key) + pino-pretty en dev
├── schemas.ts              # zod schemas (analyzeBody, pseudoParams, mapParams)
└── routes/
    ├── analyze.ts          # POST  /analyze    { roomId, team, matches? }
    ├── player.ts           # GET   /player/:pseudo
    ├── live.ts             # GET   /live/:pseudo
    ├── match.ts            # GET   /match/:roomId
    └── strats.ts           # GET   /strats     /strats/:map
```

### packages/extension
```
src/
├── manifest.ts             # MV3 typed manifest (crxjs defineManifest)
├── popup/                  # Vue app — index.html, main.ts, App.vue
├── options/                # Vue app — index.html, main.ts, Options.vue
├── background/index.ts     # service worker, messages typés @webext-core/messaging
├── content/index.ts        # injection sur faceit.com, detection roomId
├── lib/api-client.ts       # ApiClient (fetch wrapper, envoie X-API-Key si configure) + types re-exportes de core
└── stores/settings.ts      # pinia — apiBaseUrl, defaultPseudo, apiKey (persistes en chrome.storage.sync)
```

## Responsabilites

- **core** : logique FACEIT pure — jamais de `process.env`, jamais de `chrome.*`, jamais de `discord.js`. `initFaceitApi(key)` doit etre appele une fois par le consommateur avant toute requete.
- **bot** : importe `@faceit-coach/core` directement (pas d'appel HTTP intermediaire). Pas de dependance a l'API.
- **api** : proxifie core via HTTP pour les clients externes (extension + futur). Valide toutes les entrees avec Zod.
- **extension** : pur client de l'API. Jamais d'appel FACEIT direct (la cle reste cote serveur).

## Commandes Discord

Toutes dans `packages/bot/src/commands/`. Flow inchange par la migration.

### /analyze
Analyse un lobby FACEIT et recommande les picks/bans.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| room_id | string | oui | ID de la room FACEIT |
| matches | integer (10-100) | non | Nombre de matchs historiques (defaut: 50) |
| team | choice 1\|2 | non | Equipe du joueur (sinon: boutons de selection) |

### /player
Affiche les stats d'un joueur FACEIT.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| pseudo | string | oui | Pseudo FACEIT |

### /live
Verifie si un joueur est en match et lance l'analyse automatiquement.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| pseudo | string | oui | Pseudo FACEIT |

### /strats
Strategies CS2 par map (pistol + gun rounds), donnees statiques.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| map | string choice | oui | Map CS2 (7 maps du pool) |

## Endpoints API

| Methode | Path | Body / Params | Retour |
|---------|------|---------------|--------|
| GET | `/health` | — | `{ status: 'ok' }` (bypass auth + rate limit) |
| POST | `/analyze` | `{ roomId, team: 1\|2, matches? }` | `PickBanResult` |
| GET | `/player/:pseudo` | — | profil + stats lifetime + maps triees |
| GET | `/live/:pseudo` | — | `{ live, matchId?, team?, analysis? }` |
| GET | `/match/:roomId` | — | `{ matchId, status, teams }` |
| GET | `/strats` | — | `{ maps: [...] }` |
| GET | `/strats/:map` | — | `{ map, strats }` |

**Securite (toutes routes sauf `/health`) :**
- **Auth :** header `X-API-Key` requis si `API_KEY` est defini cote serveur. En prod (`NODE_ENV=production`), `API_KEY` est obligatoire au boot, sinon l'API refuse de demarrer. En dev sans `API_KEY`, l'API tourne ouverte (warning log).
- **Rate limit :** 60 req/min/IP par defaut (`API_RATE_LIMIT_PER_MINUTE`), cle via `X-Forwarded-For` → `X-Real-IP` → `anonymous`.
- **CORS :** `API_CORS_ORIGINS` csv, par defaut vide (liste blanche stricte). Un warning est log si vide ou `*` en prod.
- **Headers :** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-DNS-Prefetch-Control: off`. `Strict-Transport-Security` uniquement en prod.
- **Graceful shutdown :** SIGTERM/SIGINT → `server.close()` + exit forcé apres 10s.

## Extension Chrome (MV3)

- **Popup** : formulaire pseudo → `ApiClient.getPlayer()` → profil + ELO + top 5 maps.
- **Options** : configurer `apiBaseUrl` (defaut `http://localhost:8787`), `defaultPseudo`, et `apiKey` (facultatif, requis si l'API l'impose). Persistes via `chrome.storage.sync`.
- **Background service worker** : pont typé (@webext-core/messaging) — `getLive`, `getPlayer`, `analyze`, `getStrats`. Lit `apiBaseUrl` + `apiKey` depuis le storage et les injecte dans `ApiClient`.
- **Content script** : injecté sur `faceit.com`, detecte le `roomId` via l'URL (`/room/<uuid>`), notifie le background.
- **Host permission** : `http://localhost:8787/*` (a adapter en prod).
- **API key** : `ApiClient` envoie `X-API-Key: <apiKey>` sur toutes les requetes sauf `/health` quand la cle est definie.

## Services core (details)

### faceit-api.ts
Client pour FACEIT Open Data v4 (`https://open.faceit.com/data/v4`). Cle API passee via `initFaceitApi(key)` au startup.

**Fonctions:**
- `getPlayerByNickname(nickname)` → `FaceitPlayer`
- `getPlayer(playerId)` → `FaceitPlayer`
- `getPlayerStats(playerId)` → `FaceitPlayerStats`
- `getPlayerHistory(playerId, limit)` → `FaceitMatchHistory`
- `getPlayerGameStats(playerId, limit)` → `FaceitGameStatsItem[]`
- `getMatch(matchId)` → `FaceitMatch`

**Erreurs:** `FaceitApiError` custom, retry avec delay `retry-after` sur 429 (3 tentatives).

**Cache TTL:**
- Player stats: 600s (10 min)
- Match details: 120s (2 min)
- Match history: 300s (5 min)

### analyzer.ts
Algorithme de scoring et classification pick/ban.

**Fonctions exportees:**
- `analyzeLobby(matchId, teamSide, matchCount)` → `PickBanResult`
- `analyzeTeam(playerIds, matchCount)` → `PlayerAnalysis[]`
- `calculateMapScores(players)` → scores par map avec breakdown
- `computePickBan(ourScores, theirScores)` → `PickBanResult`
- `calculatePlayerWeight(playerElo, averageElo)` → number
- `adjustWinrateForUncertainty(winrate, matchCount)` → number

**Formule de score par map:**
```
score = 0.5 * winrate + 0.3 * normalizedKd + 0.2 * eloWeight
normalizedKd = kd / (kd + 1)
```

**Ajustement d'incertitude** (< 10 matchs): regression vers 50%.

### cache.ts
Cache in-memory via `node-cache`. API: `get<T>(key)`, `set<T>(key, value, ttl)`, `del(key)`, `flush()`, `key(...parts)`.

## Constantes cles (core/utils/constants.ts)

**Map pool:** de_mirage, de_inferno, de_nuke, de_anubis, de_ancient, de_dust2, de_overpass

**Poids du score:** WINRATE 50%, KD 30%, ELO 20%

**Seuils pick/ban:** PICK >= +8%, BAN <= -8%, entre = NEUTRE

**Confiance:** HIGH >= 30 matchs, MEDIUM >= 15, LOW < 15

**CT bias:** Nuke 57%, Overpass 53%, Anubis/Ancient 52%, Mirage/Inferno 50%, Dust2 49%

**Incertitude:** seuil a 10 matchs, en dessous regression vers 50%

## Types principaux (core/types.ts)

| Type | Description |
|------|-------------|
| `FaceitPlayer` | Profil joueur FACEIT (id, nickname, elo, level) |
| `FaceitMatch` | Match complet (teams, status, voting, results) |
| `FaceitPlayerStats` | Stats lifetime + segments par map |
| `FaceitGameStatsItem` | Stats d'une partie (kills, deaths, map, result) |
| `PlayerMapStats` | Stats aggregees par map (matches, winrate, kd, hs) |
| `PlayerAnalysis` | Joueur analyse avec poids ELO et mapStats |
| `ScoreBreakdown` | Decomposition du score (winrate, kd, elo) |
| `MapScore` | Comparaison d'une map (scores, advantage, confidence, breakdown) |
| `PickBanResult` | Resultat final (picks, neutral, bans, allMaps) |
| `MapStrats` | Strategies par map (pistol, gun) |

`BotCommand` reste dans `packages/bot/src/types.ts` (couplage Discord).

## Configuration

**Variables d'environnement (.env):**
- `DISCORD_TOKEN` — token du bot Discord (bot only)
- `DISCORD_CLIENT_ID` — application ID Discord (bot only)
- `FACEIT_API_KEY` — cle FACEIT Open Data (bot + api)
- `API_PORT` — port d'ecoute de l'api (defaut 8787)
- `API_KEY` — cle attendue dans `X-API-Key`. Facultatif en dev (warning). **Obligatoire en prod** (refuse de demarrer si absent). Generer via `openssl rand -hex 32`.
- `API_CORS_ORIGINS` — origins autorises, csv, vide par defaut (liste blanche stricte). `*` deconseille en prod.
- `API_RATE_LIMIT_PER_MINUTE` — limite par IP (defaut 60)
- `LOG_LEVEL` — niveau pino (defaut `info`)
- `NODE_ENV` — `production` active HSTS, la validation stricte d'`API_KEY`, et les warnings CORS

**TypeScript:** target ES2023, module Node16 (core/bot/api), Bundler (extension), strict, composite + incremental via project references.

**Docker:**
- `docker-compose.yml` lance `bot` + `api` (extension non dockerisee — build via `pnpm build:extension`).
- Les deux containers tournent en utilisateur non-root (`app`).
- API expose un `HEALTHCHECK` sur `/health` (30s interval, 3 retries).
- Limites ressources : bot 256M / 0.25 cpu, api 512M / 0.5 cpu. Logging JSON avec rotation (10M max, 3 fichiers).
- Le bot installe un handler SIGTERM/SIGINT pour `client.destroy()` (shutdown propre sur redeploy).
