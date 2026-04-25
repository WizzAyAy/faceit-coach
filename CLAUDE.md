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
- **Extension:** Chrome MV3 via Vite + @crxjs/vite-plugin + Vue 3 + Pinia + VueUse + UnoCSS + unplugin-auto-import/components
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
├── index.ts                # barrel export (bot + api)
├── types.ts                # FACEIT API types + types domaine (MapScore, PickBanResult, ...)
├── data/strats.ts          # strategies statiques par map
├── i18n/                   # SOURCE DE VERITE des traductions (bot + extension)
│   ├── index.ts            # t(locale, key, vars?), detectLocale, LOCALES, messages
│   ├── en.ts               # dictionnaire EN (forme canonique)
│   └── fr.ts               # dictionnaire FR (structure clonee via DeepStringify<typeof en>)
├── services/
│   ├── faceit-api.ts       # client FACEIT (init via initFaceitApi(key) au bootstrap)
│   ├── analyzer.ts         # scoring + pick/ban
│   └── cache.ts            # cache in-memory (node-cache, browser-incompatible)
├── utils/constants.ts      # map pool, seuils, TTL, CT bias
└── __tests__/              # vitest — analyzer, faceit-api, cache, constants, i18n
```

`package.json` expose deux entrees: `.` (barrel complet, Node-only) et `./i18n` (browser-safe, pour l'extension). Voir section i18n plus bas.

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
├── schemas.ts              # zod schemas (analyzeBody, pseudoParams, mapParams, liveQuery)
└── routes/
    ├── analyze.ts          # POST  /analyze            { roomId, team, periodMonths? }
    ├── player.ts           # GET   /player/:pseudo
    ├── live.ts             # GET   /live/:pseudo       ?periodMonths=N
    ├── match.ts            # GET   /match/:roomId
    └── strats.ts           # GET   /strats     /strats/:map
```

### packages/extension
```
src/
├── manifest.ts             # MV3 typed manifest (crxjs defineManifest) — popup only, pas de bg ni content
├── popup/                  # Vue app — index.html, main.ts, App.vue (2 onglets: Player / Analyze)
├── options/                # Vue app — index.html, main.ts, Options.vue
├── components/             # AnalyzeTab.vue, PlayerTab.vue, Logo.vue
├── composables/
│   ├── useCurrentRoom.ts   # lit la tab active via chrome.tabs
│   └── useI18n.ts          # wrapper reactif autour de core.t (locale figee depuis navigator.language au load)
├── lib/api-client.ts       # ApiClient (fetch wrapper, envoie X-API-Key si configure) + types re-exportes de core
├── stores/settings.ts      # pinia — apiBaseUrl, defaultPseudo, apiKey
└── __tests__/              # vitest — App, Options, AnalyzeTab, PlayerTab, settings store, api-client, useCurrentRoom, logo
```

## Responsabilites

- **core** : logique FACEIT pure + i18n — jamais de `process.env`, jamais de `chrome.*`, jamais de `discord.js`. `initFaceitApi(key)` doit etre appele une fois par le consommateur avant toute requete.
- **bot** : importe `@faceit-coach/core` directement (pas d'appel HTTP intermediaire). Pas de dependance a l'API.
- **api** : proxifie core via HTTP pour les clients externes (extension + futur). Valide toutes les entrees avec Zod.
- **extension** : pur client de l'API. Jamais d'appel FACEIT direct (la cle reste cote serveur).

## i18n (internationalisation)

**Toutes les traductions sont centralisees dans `packages/core/src/i18n/`** — deux fichiers `en.ts` et `fr.ts` suivent la meme arborescence (forcee via `DeepStringify<typeof en>`). Langues supportees pour l'instant : **en** (defaut) et **fr**.

**API :**
- `t(locale, key, vars?)` — resolve une cle pointee (`"extension.analyze.startBtn"`, `"common.error.playerNotFound"`). Cles typees via `TranslationKey` (path union deduit de la structure EN). Interpolation `{name}` via `vars`.
- `detectLocale(hint)` — normalise un BCP47 / Discord locale (`"fr-FR"` → `"fr"`, fallback `"en"`).
- `LOCALES`, `DEFAULT_LOCALE`, `messages` — exposes pour les cas ou on a besoin du dictionnaire brut (ex: descriptions de slash commands avec `setDescriptionLocalizations`).

**Sous-export browser-safe :** `core/package.json` expose `"./i18n"` qui pointe sur `dist/i18n/index.js`. **L'extension importe via `@faceit-coach/core/i18n`** (jamais via le barrel racine), pour eviter de tirer `node-cache` (et son `EventEmitter` Node) cote browser. Bot et API peuvent garder l'import racine.

**Bot Discord :**
- Descriptions des slash commands : `setDescription(messages.en....)` + `setDescriptionLocalizations({ fr: messages.fr.... })` — Discord affiche la bonne selon la locale utilisateur.
- Reponses (embeds, messages) : chaque handler lit `detectLocale(interaction.locale)` puis passe `locale` a `errorEmbed(locale, msg)`, `pickBanEmbed(locale, result)`, etc. Les helpers dans `embeds.ts` prennent la locale en premier argument.

**Extension Chrome :**
- `useI18n()` (dans `packages/extension/src/composables/useI18n.ts`) expose `t` + `locale`. La locale est detectee une fois au chargement du popup via `detectLocale(navigator.language)` puis figee — pas de selecteur dans l'UI, pas de persistance dans `chrome.storage`. Pour changer la langue, l'utilisateur change la langue de son navigateur.

**Ajouter une nouvelle traduction :**
1. Ajouter la cle dans `en.ts` (forme canonique) — la forme est automatiquement imposee a `fr.ts` par le type.
2. Ajouter la traduction correspondante dans `fr.ts`.
3. Utiliser via `t('path.to.key', vars?)` — tests + lint confirment la presence des deux.

**Ajouter une nouvelle langue :**
1. Creer `packages/core/src/i18n/<code>.ts` avec `const <code>: DeepStringify<typeof en> = {...}`.
2. Ajouter a `LOCALES` et au map `messages` dans `i18n/index.ts`.
3. Les composants existent deja en `t(...)` — pas besoin de les toucher.

## Commandes Discord

Toutes dans `packages/bot/src/commands/`. Flow inchange par la migration.

### /analyze
Analyse un lobby FACEIT et recommande les picks/bans.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| room_id | string | oui | ID de la room FACEIT |
| months | integer (1-24) | non | Periode d'historique en mois (defaut: 6) |
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
| months | integer (1-24) | non | Periode d'historique en mois (defaut: 6) |

### /strats
Strategies CS2 par map (pistol + gun rounds), donnees statiques.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| map | string choice | oui | Map CS2 (8 maps du pool) |

## Endpoints API

| Methode | Path | Body / Params | Retour |
|---------|------|---------------|--------|
| GET | `/health` | — | `{ status: 'ok' }` (bypass auth + rate limit) |
| POST | `/analyze` | `{ roomId, team: 1\|2, periodMonths? (1-24) }` | `PickBanResult` + `meta` |
| GET | `/player/:pseudo` | — | profil + stats lifetime + maps triees |
| GET | `/live/:pseudo` | `?periodMonths=N (1-24)` | `{ live, matchId?, team?, analysis?, meta? }` |
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

- **Popup** : 2 onglets.
  - **Player** : recherche par pseudo → `ApiClient.getPlayer()` → profil + ELO + top 5 maps.
  - **Analyze** : detecte le `roomId` de l'onglet actif via `useCurrentRoom` (lit `chrome.tabs.query`), charge le match via `ApiClient.getMatch()`, auto-selectionne l'equipe via `defaultPseudo`, puis `ApiClient.analyze()` → tableau pick/ban avec tooltip breakdown.
- **Options** : configurer `apiBaseUrl` (defaut `http://localhost:8787`), `defaultPseudo`, et `apiKey` (facultatif, requis si l'API l'impose). Persistes via `chrome.storage.sync`.
- **Pas de background worker ni de content script** : tout se passe dans le popup. La detection de room utilise directement `chrome.tabs` via `useCurrentRoom`.
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
- `getPlayerGameStats(playerId, opts)` → `FaceitGameStatsItem[]` — `opts` = `number` (legacy: single page size) ou `{ from?, to?, maxTotal?, pageSize? }` (paginated, auto-cursor jusqu'a `maxTotal`)
- `getMatch(matchId)` → `FaceitMatch`

**Erreurs:** `FaceitApiError` custom, retry avec delay `retry-after` sur 429 (3 tentatives).

**Cache TTL:**
- Player stats: 600s (10 min)
- Match details: 120s (2 min)
- Match history: 300s (5 min)

### analyzer.ts
Algorithme de scoring et classification pick/ban.

**Fonctions exportees:**
- `analyzeLobby(matchId, teamSide, options?)` → `PickBanResult`
- `analyzeTeam(playerIds, options?)` → `PlayerAnalysis[]`
- `calculateMapScores(players)` → scores par map avec breakdown
- `computePickBan(ourScores, theirScores)` → `PickBanResult`
- `calculatePlayerWeight(playerElo, averageElo)` → number
- `adjustWinrateForUncertainty(winrate, matchCount)` → number
- `monthsAgoTimestamp(months)` → number (Unix seconds)

`AnalyzeOptions = { fromTimestamp?: number, maxMatchesPerPlayer?: number }` — defaut `maxMatchesPerPlayer=300`. Le bot `/analyze` et `/live` ainsi que l'API passent `fromTimestamp = monthsAgoTimestamp(months)` selon l'option utilisateur (defaut 6 mois).

**Formule de score par map:**
```
score = 0.5 * winrate + 0.3 * normalizedKd + 0.2 * eloWeight
normalizedKd = kd / (kd + 1)
```

**Ajustement d'incertitude** (< 10 matchs): regression vers 50%.

### cache.ts
Cache in-memory via `node-cache`. API: `get<T>(key)`, `set<T>(key, value, ttl)`, `del(key)`, `flush()`, `key(...parts)`.

## Constantes cles (core/utils/constants.ts)

**Map pool:** de_mirage, de_inferno, de_nuke, de_anubis, de_ancient, de_dust2, de_overpass, de_cache

**Poids du score:** WINRATE 50%, KD 30%, ELO 20%

**Seuils pick/ban:** PICK >= +8%, BAN <= -8%, entre = NEUTRE

**Confiance:** HIGH >= 30 matchs, MEDIUM >= 15, LOW < 15

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
