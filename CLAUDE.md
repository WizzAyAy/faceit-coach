# FACEIT Coach — Bot Discord CS2

## Instructions

- **Ce fichier est la source de verite du projet.** Il doit etre mis a jour a chaque modification d'architecture, ajout/suppression de commande, service, type, ou changement de constante. Toute PR ou modification significative doit se refleter ici.
- Lire ce fichier en entier avant de modifier le projet.

## Stack

- **Runtime:** Node.js 22 (Alpine en Docker)
- **Langage:** TypeScript (ES2023, strict, ES modules)
- **Bot framework:** discord.js 14
- **Tests:** Vitest (globals: true)
- **Lint:** ESLint avec preset @antfu/eslint-config
- **Package manager:** pnpm 10.33.0
- **CI:** GitHub Actions (lint, typecheck, test)

## Scripts

| Script | Commande |
|--------|----------|
| Dev | `pnpm dev` (tsx + .env) |
| Build | `pnpm build` (tsc) |
| Start | `pnpm start` (node dist/) |
| Test | `pnpm test` (vitest) |
| Lint | `pnpm lint` / `pnpm lint:fix` |

## Architecture

```
src/
├── index.ts              # Entry point — charge les commandes, les enregistre sur Discord, lance le bot
├── config.ts             # Validation des variables d'environnement
├── commands/             # Slash commands Discord
│   ├── analyze.ts        # /analyze — recommandations pick/ban d'un lobby
│   ├── player.ts         # /player — stats d'un joueur
│   └── live.ts           # /live — check si un joueur est en match + auto-analyze
├── services/
│   ├── faceit-api.ts     # Client FACEIT API avec cache et retry 429
│   ├── analyzer.ts       # Algorithme d'analyse des maps (scores, pick/ban)
│   ├── predictor.ts      # Prediction de victoire (NON UTILISE — code mort)
│   └── cache.ts          # Cache in-memory (node-cache)
├── utils/
│   ├── constants.ts      # Map pool, seuils, poids, TTL cache, CT bias
│   └── embeds.ts         # Builders d'embeds Discord (pickBan, player, error)
└── types/
    └── index.ts          # Interfaces TypeScript (API FACEIT + types internes)
```

## Commandes

### /analyze
Analyse un lobby FACEIT et recommande les picks/bans.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| room_id | string | oui | ID de la room FACEIT |
| matches | integer (10-100) | non | Nombre de matchs historiques (defaut: 50) |
| team | choice 1\|2 | non | Equipe du joueur (sinon: boutons de selection) |

**Flow:** fetch match → selection equipe → `analyzeLobby()` → embed texte `pickBanEmbed()`

### /player
Affiche les stats d'un joueur FACEIT.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| pseudo | string | oui | Pseudo FACEIT |

**Flow:** fetch player → fetch stats → top/bottom 3 maps → embed `playerEmbed()`

### /live
Verifie si un joueur est en match et lance l'analyse automatiquement.

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| pseudo | string | oui | Pseudo FACEIT |

**Flow:** fetch player → derniere partie → si ONGOING/READY: auto-analyze → embed `pickBanEmbed()` — sinon: message "pas en match"

## Services

### faceit-api.ts
Client pour l'API FACEIT Open Data v4 (`https://open.faceit.com/data/v4`).

**Fonctions:**
- `getPlayerByNickname(nickname)` → `FaceitPlayer`
- `getPlayer(playerId)` → `FaceitPlayer`
- `getPlayerStats(playerId)` → `FaceitPlayerStats`
- `getPlayerHistory(playerId, limit)` → `FaceitMatchHistory`
- `getPlayerGameStats(playerId, limit)` → `FaceitGameStatsItem[]`
- `getMatch(matchId)` → `FaceitMatch`

**Gestion d'erreurs:** `FaceitApiError` custom, retry avec backoff exponentiel sur 429 (3 tentatives).

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
Cache in-memory via `node-cache`.

**API:** `get<T>(key)`, `set<T>(key, value, ttl)`, `del(key)`, `flush()`, `key(...parts)`.

## Constantes cles (constants.ts)

**Map pool:** de_mirage, de_inferno, de_nuke, de_anubis, de_ancient, de_dust2, de_overpass

**Poids du score:** WINRATE 50%, KD 30%, ELO 20%

**Seuils pick/ban:** PICK >= +8%, BAN <= -8%, entre = NEUTRE

**Confiance:** HIGH >= 30 matchs, MEDIUM >= 15, LOW < 15

**CT bias:** Nuke 57%, Overpass 53%, Anubis/Ancient 52%, Mirage/Inferno 50%, Dust2 49%

**Incertitude:** seuil a 10 matchs, en dessous regression vers 50%

## Types principaux (types/index.ts)

| Type | Description |
|------|-------------|
| `BotCommand` | Interface d'une slash command (data + execute) |
| `FaceitPlayer` | Profil joueur FACEIT (id, nickname, elo, level) |
| `FaceitMatch` | Match complet (teams, status, voting, results) |
| `FaceitPlayerStats` | Stats lifetime + segments par map |
| `FaceitGameStatsItem` | Stats d'une partie (kills, deaths, map, result) |
| `PlayerMapStats` | Stats aggregees par map (matches, winrate, kd, hs) |
| `PlayerAnalysis` | Joueur analyse avec poids ELO et mapStats |
| `ScoreBreakdown` | Decomposition du score (winrate, kd, elo) |
| `MapScore` | Comparaison d'une map (scores, advantage, confidence, breakdown) |
| `PickBanResult` | Resultat final (picks, neutral, bans, allMaps) |
| `PredictionResult` | Prediction de victoire (non utilise) |
| `StratsResult` | Strats par side (non utilise) |

## Configuration

**Variables d'environnement (.env):**
- `DISCORD_TOKEN` — token du bot Discord
- `DISCORD_CLIENT_ID` — application ID Discord
- `FACEIT_API_KEY` — cle API FACEIT Open Data

**TypeScript:** target ES2023, module Node16, strict, outDir dist

**Docker:** build multi-stage (builder + runtime Alpine), `node dist/index.js`

## Code mort

Ces elements existent mais ne sont utilises par aucune commande :
- `src/services/predictor.ts` + ses tests — prediction de victoire
- `stratsEmbed()` dans embeds.ts — embed strats par side
- Types `PredictionResult` et `StratsResult`
