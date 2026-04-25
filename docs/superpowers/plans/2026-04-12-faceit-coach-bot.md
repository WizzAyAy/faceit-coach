# FACEIT Coach Bot — Implementation Plan

> **[ARCHIVED 2026-04-25]** Plan d'origine, entierement implemente. Conserve pour l'historique. Voir `CLAUDE.md` pour l'etat actuel.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discord bot that analyzes FACEIT CS2 lobbies to recommend map picks/bans, compare players, predict outcomes, and suggest strategies.

**Architecture:** Monolith Node.js/TS with discord.js v14. Services layer wraps FACEIT API v4 with in-memory cache. Slash commands call services and render results as Discord embeds.

**Tech Stack:** Node.js 22+, TypeScript 5.8+, pnpm, discord.js v14, undici, node-cache, vitest, @antfu/eslint-config

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.ts`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialize pnpm project**

```bash
cd /home/quentin/faceit-coach
pnpm init
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add discord.js undici node-cache
pnpm add -D typescript @types/node tsx vitest @antfu/eslint-config eslint
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create eslint.config.ts**

```ts
import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
})
```

- [ ] **Step 5: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

- [ ] **Step 6: Create .env.example**

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
FACEIT_API_KEY=
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 8: Add scripts to package.json**

Add to `package.json`:
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx --env-file=.env src/index.ts",
    "build": "tsc",
    "start": "node --env-file=.env dist/index.js",
    "test": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with pnpm, typescript, eslint, vitest"
```

---

### Task 2: Types & Constants

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/constants.ts`

- [ ] **Step 1: Create src/types/index.ts**

```ts
// --- Bot command type ---

import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export interface BotCommand {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

// --- FACEIT API response types ---

export interface FaceitPlayer {
  player_id: string
  nickname: string
  avatar: string
  country: string
  games: {
    cs2?: {
      faceit_elo: number
      skill_level: number
      region: string
    }
  }
}

export interface FaceitMatchTeamRoster {
  player_id: string
  nickname: string
  avatar: string
  game_player_id: string
  game_player_name: string
  game_skill_level: number
}

export interface FaceitMatchTeam {
  team_id: string
  nickname: string
  avatar: string
  type: string
  players: FaceitMatchTeamRoster[]
}

export interface FaceitMatch {
  match_id: string
  game: string
  region: string
  competition_id: string
  competition_name: string
  competition_type: string
  organizer_id: string
  teams: {
    faction1: FaceitMatchTeam
    faction2: FaceitMatchTeam
  }
  voting: {
    map: {
      pick: string[]
    }
  } | null
  status: 'READY' | 'ONGOING' | 'FINISHED' | 'CANCELLED'
  started_at: number
  finished_at: number
  results?: {
    winner: 'faction1' | 'faction2'
    score: {
      faction1: number
      faction2: number
    }
  }
}

export interface FaceitPlayerStatsSegment {
  label: string
  img_small: string
  img_regular: string
  mode: string
  type: string
  stats: {
    'Matches': string
    'Win Rate %': string
    'K/D Ratio': string
    'Average K/D Ratio': string
    'Headshots %': string
    'Average Headshots %': string
    'Wins': string
    'Rounds': string
    [key: string]: string
  }
}

export interface FaceitPlayerStats {
  player_id: string
  game_id: string
  lifetime: {
    'Matches': string
    'Win Rate %': string
    'K/D Ratio': string
    'Longest Win Streak': string
    'Current Win Streak': string
    'Average K/D Ratio': string
    'Average Headshots %': string
    'Total Headshots %': string
    [key: string]: string
  }
  segments: FaceitPlayerStatsSegment[]
}

export interface FaceitMatchHistory {
  items: FaceitMatchHistoryItem[]
  start: number
  end: number
  from: number
  to: number
}

export interface FaceitMatchHistoryItem {
  match_id: string
  game_id: string
  game_mode: string
  competition_id: string
  competition_name: string
  competition_type: string
  organizer_id: string
  playing_players: string[]
  started_at: number
  finished_at: number
  status: string
  faceit_url: string
  results: {
    winner: string
    score: Record<string, number>
  }
  teams: Record<string, {
    team_id: string
    nickname: string
    avatar: string
    type: string
    players: { player_id: string, nickname: string, avatar: string }[]
  }>
}

export interface FaceitGameStats {
  player_id: string
  match_id: string
  map: string
  result: string
  kills: string
  deaths: string
  assists: string
  headshots_percentage: string
  kr_ratio: string
  kd_ratio: string
  [key: string]: string
}

// --- Internal app types ---

export interface PlayerMapStats {
  map: string
  matches: number
  wins: number
  winrate: number
  kdRatio: number
  hsPercent: number
}

export interface PlayerAnalysis {
  playerId: string
  nickname: string
  elo: number
  weight: number
  mapStats: PlayerMapStats[]
}

export interface MapScore {
  map: string
  ourScore: number
  theirScore: number
  advantage: number
}

export interface PickBanResult {
  picks: MapScore[]
  neutral: MapScore[]
  bans: MapScore[]
  allMaps: MapScore[]
}

export interface TeamAnalysis {
  players: PlayerAnalysis[]
  averageElo: number
}

export interface PredictionResult {
  map: string
  team1WinProbability: number
  team2WinProbability: number
  keyPlayers: { nickname: string, contribution: number }[]
}

export interface StratsResult {
  map: string
  recommendedSide: 'CT' | 'T'
  ctWinrate: number
  tWinrate: number
  playerBreakdown: {
    nickname: string
    ctWinrate: number
    tWinrate: number
  }[]
}
```

- [ ] **Step 2: Create src/utils/constants.ts**

```ts
export const CS2_MAP_POOL = [
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_anubis',
  'de_ancient',
  'de_dust2',
  'de_train',
] as const

export type CS2Map = typeof CS2_MAP_POOL[number]

export const MAP_DISPLAY_NAMES: Record<string, string> = {
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_nuke: 'Nuke',
  de_anubis: 'Anubis',
  de_ancient: 'Ancient',
  de_dust2: 'Dust2',
  de_train: 'Train',
}

export const FACEIT_API_BASE = 'https://open.faceit.com/data/v4'

export const CACHE_TTL = {
  PLAYER_STATS: 600, // 10 min
  MATCH_DETAILS: 120, // 2 min
  MATCH_HISTORY: 300, // 5 min
} as const

export const DEFAULT_MATCH_COUNT = 50
export const UNCERTAINTY_THRESHOLD = 5
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/utils/constants.ts
git commit -m "feat: add types and constants"
```

---

### Task 3: Config

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create src/config.ts**

```ts
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  discordClientId: requireEnv('DISCORD_CLIENT_ID'),
  faceitApiKey: requireEnv('FACEIT_API_KEY'),
}
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add config module"
```

---

### Task 4: Cache Service

**Files:**
- Create: `src/services/cache.ts`
- Create: `src/services/__tests__/cache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/cache.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { cache } from '../cache'

describe('cache', () => {
  afterEach(() => {
    cache.flush()
  })

  it('should store and retrieve a value', () => {
    cache.set('test-key', { foo: 'bar' }, 60)
    expect(cache.get('test-key')).toEqual({ foo: 'bar' })
  })

  it('should return undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined()
  })

  it('should delete a key', () => {
    cache.set('key', 'value', 60)
    cache.del('key')
    expect(cache.get('key')).toBeUndefined()
  })

  it('should flush all keys', () => {
    cache.set('a', 1, 60)
    cache.set('b', 2, 60)
    cache.flush()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('should generate a cache key from prefix and params', () => {
    const key = cache.key('player-stats', 'player123', 'cs2')
    expect(key).toBe('player-stats:player123:cs2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/__tests__/cache.test.ts`
Expected: FAIL — module `../cache` not found

- [ ] **Step 3: Write implementation**

Create `src/services/cache.ts`:

```ts
import NodeCache from 'node-cache'

const store = new NodeCache()

export const cache = {
  get<T>(key: string): T | undefined {
    return store.get<T>(key)
  },

  set<T>(key: string, value: T, ttlSeconds: number): void {
    store.set(key, value, ttlSeconds)
  },

  del(key: string): void {
    store.del(key)
  },

  flush(): void {
    store.flushAll()
  },

  key(...parts: string[]): string {
    return parts.join(':')
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/__tests__/cache.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/cache.ts src/services/__tests__/cache.test.ts
git commit -m "feat: add cache service with tests"
```

---

### Task 5: FACEIT API Client

**Files:**
- Create: `src/services/faceit-api.ts`
- Create: `src/services/__tests__/faceit-api.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/faceit-api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cache } from '../cache'
import { faceitApi } from '../faceit-api'

// Mock undici fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock config
vi.mock('../../config', () => ({
  config: {
    faceitApiKey: 'test-api-key',
  },
}))

describe('faceitApi', () => {
  beforeEach(() => {
    cache.flush()
    mockFetch.mockReset()
  })

  afterEach(() => {
    cache.flush()
  })

  describe('getPlayerByNickname', () => {
    it('should fetch player by nickname', async () => {
      const mockPlayer = {
        player_id: 'p1',
        nickname: 'TestPlayer',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlayer),
      })

      const result = await faceitApi.getPlayerByNickname('TestPlayer')
      expect(result).toEqual(mockPlayer)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://open.faceit.com/data/v4/players?nickname=TestPlayer&game=cs2',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-api-key' },
        }),
      )
    })

    it('should throw on player not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(faceitApi.getPlayerByNickname('Unknown'))
        .rejects
        .toThrow('Player "Unknown" not found on FACEIT')
    })
  })

  describe('getPlayerStats', () => {
    it('should fetch and cache player stats', async () => {
      const mockStats = {
        player_id: 'p1',
        game_id: 'cs2',
        lifetime: { 'Matches': '100', 'Win Rate %': '55' },
        segments: [],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })

      const result1 = await faceitApi.getPlayerStats('p1')
      expect(result1).toEqual(mockStats)

      // Second call should use cache, not fetch
      const result2 = await faceitApi.getPlayerStats('p1')
      expect(result2).toEqual(mockStats)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMatch', () => {
    it('should fetch match details', async () => {
      const mockMatch = {
        match_id: 'm1',
        status: 'ONGOING',
        teams: {
          faction1: { players: [] },
          faction2: { players: [] },
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMatch),
      })

      const result = await faceitApi.getMatch('m1')
      expect(result).toEqual(mockMatch)
    })
  })

  describe('rate limit retry', () => {
    it('should retry on 429', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => '1' },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ player_id: 'p1' }),
        })

      const result = await faceitApi.getMatch('m1')
      expect(result).toEqual({ player_id: 'p1' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/__tests__/faceit-api.test.ts`
Expected: FAIL — module `../faceit-api` not found

- [ ] **Step 3: Write implementation**

Create `src/services/faceit-api.ts`:

```ts
import type {
  FaceitGameStats,
  FaceitMatch,
  FaceitMatchHistory,
  FaceitPlayer,
  FaceitPlayerStats,
} from '../types'
import { config } from '../config'
import { CACHE_TTL, FACEIT_API_BASE } from '../utils/constants'
import { cache } from './cache'

async function faceitFetch<T>(path: string, retries = 3): Promise<T> {
  const url = `${FACEIT_API_BASE}${path}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.faceitApiKey}` },
  })

  if (response.status === 429 && retries > 0) {
    const retryAfter = Number(response.headers.get('retry-after') || '2')
    await new Promise(r => setTimeout(r, retryAfter * 1000))
    return faceitFetch<T>(path, retries - 1)
  }

  if (!response.ok) {
    throw new FaceitApiError(response.status, url)
  }

  return response.json() as Promise<T>
}

export class FaceitApiError extends Error {
  constructor(public status: number, public url: string) {
    super(`FACEIT API error ${status} for ${url}`)
    this.name = 'FaceitApiError'
  }
}

export const faceitApi = {
  async getPlayerByNickname(nickname: string): Promise<FaceitPlayer> {
    try {
      return await faceitFetch<FaceitPlayer>(
        `/players?nickname=${encodeURIComponent(nickname)}&game=cs2`,
      )
    }
    catch (err) {
      if (err instanceof FaceitApiError && err.status === 404) {
        throw new Error(`Player "${nickname}" not found on FACEIT`)
      }
      throw err
    }
  },

  async getPlayer(playerId: string): Promise<FaceitPlayer> {
    const cacheKey = cache.key('player', playerId)
    const cached = cache.get<FaceitPlayer>(cacheKey)
    if (cached)
      return cached

    const player = await faceitFetch<FaceitPlayer>(`/players/${playerId}`)
    cache.set(cacheKey, player, CACHE_TTL.PLAYER_STATS)
    return player
  },

  async getPlayerStats(playerId: string): Promise<FaceitPlayerStats> {
    const cacheKey = cache.key('player-stats', playerId)
    const cached = cache.get<FaceitPlayerStats>(cacheKey)
    if (cached)
      return cached

    const stats = await faceitFetch<FaceitPlayerStats>(`/players/${playerId}/stats/cs2`)
    cache.set(cacheKey, stats, CACHE_TTL.PLAYER_STATS)
    return stats
  },

  async getPlayerHistory(playerId: string, limit: number): Promise<FaceitMatchHistory> {
    const cacheKey = cache.key('player-history', playerId, String(limit))
    const cached = cache.get<FaceitMatchHistory>(cacheKey)
    if (cached)
      return cached

    const history = await faceitFetch<FaceitMatchHistory>(
      `/players/${playerId}/history?game=cs2&offset=0&limit=${limit}`,
    )
    cache.set(cacheKey, history, CACHE_TTL.MATCH_HISTORY)
    return history
  },

  async getPlayerGameStats(playerId: string, limit: number): Promise<FaceitGameStats[]> {
    const cacheKey = cache.key('player-game-stats', playerId, String(limit))
    const cached = cache.get<FaceitGameStats[]>(cacheKey)
    if (cached)
      return cached

    const stats = await faceitFetch<FaceitGameStats[]>(
      `/players/${playerId}/games/cs2/stats?offset=0&limit=${limit}`,
    )
    cache.set(cacheKey, stats, CACHE_TTL.MATCH_HISTORY)
    return stats
  },

  async getMatch(matchId: string): Promise<FaceitMatch> {
    const cacheKey = cache.key('match', matchId)
    const cached = cache.get<FaceitMatch>(cacheKey)
    if (cached)
      return cached

    const match = await faceitFetch<FaceitMatch>(`/matches/${matchId}`)
    cache.set(cacheKey, match, CACHE_TTL.MATCH_DETAILS)
    return match
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/services/__tests__/faceit-api.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/faceit-api.ts src/services/__tests__/faceit-api.test.ts
git commit -m "feat: add FACEIT API client with caching and retry"
```

---

### Task 6: Analyzer Service (Pick & Ban Algorithm)

**Files:**
- Create: `src/services/analyzer.ts`
- Create: `src/services/__tests__/analyzer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/analyzer.test.ts`:

```ts
import type { PlayerAnalysis, PlayerMapStats } from '../../types'
import { describe, expect, it } from 'vitest'
import {
  adjustWinrateForUncertainty,
  calculateMapScores,
  calculatePlayerWeight,
  computePickBan,
} from '../analyzer'

describe('analyzer', () => {
  describe('calculatePlayerWeight', () => {
    it('should return 1.0 for a player at average ELO', () => {
      expect(calculatePlayerWeight(2000, 2000)).toBe(1)
    })

    it('should return >1 for a player above average', () => {
      expect(calculatePlayerWeight(2500, 2000)).toBe(1.25)
    })

    it('should return <1 for a player below average', () => {
      expect(calculatePlayerWeight(1500, 2000)).toBe(0.75)
    })
  })

  describe('adjustWinrateForUncertainty', () => {
    it('should not adjust with 5+ matches', () => {
      expect(adjustWinrateForUncertainty(0.7, 5)).toBe(0.7)
      expect(adjustWinrateForUncertainty(0.7, 10)).toBe(0.7)
    })

    it('should pull toward 50% with fewer than 5 matches', () => {
      // 3 matches, 70% winrate: 0.7 * (3/5) + 0.5 * (2/5) = 0.42 + 0.2 = 0.62
      expect(adjustWinrateForUncertainty(0.7, 3)).toBeCloseTo(0.62)
    })

    it('should return 50% with 0 matches', () => {
      expect(adjustWinrateForUncertainty(0, 0)).toBe(0.5)
    })
  })

  describe('calculateMapScores', () => {
    it('should compute weighted map scores for a team', () => {
      const players: PlayerAnalysis[] = [
        {
          playerId: 'p1',
          nickname: 'Player1',
          elo: 2000,
          weight: 1.0,
          mapStats: [
            { map: 'de_mirage', matches: 20, wins: 14, winrate: 0.7, kdRatio: 1.2, hsPercent: 50 },
          ],
        },
        {
          playerId: 'p2',
          nickname: 'Player2',
          elo: 2000,
          weight: 1.0,
          mapStats: [
            { map: 'de_mirage', matches: 20, wins: 12, winrate: 0.6, kdRatio: 1.1, hsPercent: 45 },
          ],
        },
      ]

      const scores = calculateMapScores(players)
      // de_mirage: (0.7 * 1.0 + 0.6 * 1.0) / 2 = 0.65
      expect(scores.de_mirage).toBeCloseTo(0.65)
    })

    it('should apply uncertainty malus for low match count', () => {
      const players: PlayerAnalysis[] = [
        {
          playerId: 'p1',
          nickname: 'Player1',
          elo: 2000,
          weight: 1.0,
          mapStats: [
            { map: 'de_nuke', matches: 2, wins: 2, winrate: 1.0, kdRatio: 2.0, hsPercent: 60 },
          ],
        },
      ]

      const scores = calculateMapScores(players)
      // 1.0 * (2/5) + 0.5 * (3/5) = 0.4 + 0.3 = 0.7, weighted by 1.0, / 1 player = 0.7
      expect(scores.de_nuke).toBeCloseTo(0.7)
    })
  })

  describe('computePickBan', () => {
    it('should classify maps into picks, neutral, bans', () => {
      const ourScores: Record<string, number> = {
        de_mirage: 0.65,
        de_inferno: 0.55,
        de_anubis: 0.50,
        de_nuke: 0.40,
      }
      const theirScores: Record<string, number> = {
        de_mirage: 0.45,
        de_inferno: 0.52,
        de_anubis: 0.51,
        de_nuke: 0.65,
      }

      const result = computePickBan(ourScores, theirScores)

      // Best advantage: mirage (+20%), then inferno (+3%)
      expect(result.allMaps[0].map).toBe('de_mirage')
      expect(result.allMaps[0].advantage).toBeCloseTo(0.20)

      // Worst: nuke (-25%)
      expect(result.allMaps[result.allMaps.length - 1].map).toBe('de_nuke')
      expect(result.allMaps[result.allMaps.length - 1].advantage).toBeCloseTo(-0.25)

      expect(result.picks.length).toBeGreaterThan(0)
      expect(result.bans.length).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/__tests__/analyzer.test.ts`
Expected: FAIL — module `../analyzer` not found

- [ ] **Step 3: Write implementation**

Create `src/services/analyzer.ts`:

```ts
import type { FaceitPlayerStats, MapScore, PickBanResult, PlayerAnalysis, PlayerMapStats } from '../types'
import { CS2_MAP_POOL, UNCERTAINTY_THRESHOLD } from '../utils/constants'
import { faceitApi } from './faceit-api'

export function calculatePlayerWeight(playerElo: number, averageElo: number): number {
  return playerElo / averageElo
}

export function adjustWinrateForUncertainty(winrate: number, matchCount: number): number {
  if (matchCount >= UNCERTAINTY_THRESHOLD)
    return winrate
  const confidence = matchCount / UNCERTAINTY_THRESHOLD
  return winrate * confidence + 0.5 * (1 - confidence)
}

function extractMapStats(stats: FaceitPlayerStats): PlayerMapStats[] {
  return stats.segments
    .filter(s => s.type === 'Map' && CS2_MAP_POOL.includes(s.label as any))
    .map(s => ({
      map: s.label,
      matches: Number(s.stats.Matches),
      wins: Number(s.stats.Wins),
      winrate: Number(s.stats['Win Rate %']) / 100,
      kdRatio: Number(s.stats['Average K/D Ratio'] || s.stats['K/D Ratio']),
      hsPercent: Number(s.stats['Average Headshots %'] || s.stats['Headshots %']),
    }))
}

export function calculateMapScores(players: PlayerAnalysis[]): Record<string, number> {
  const scores: Record<string, number> = {}

  for (const map of CS2_MAP_POOL) {
    let totalWeightedWinrate = 0
    let totalWeight = 0

    for (const player of players) {
      const mapStat = player.mapStats.find(s => s.map === map)
      const rawWinrate = mapStat ? mapStat.winrate : 0.5
      const matchCount = mapStat ? mapStat.matches : 0
      const adjustedWinrate = adjustWinrateForUncertainty(rawWinrate, matchCount)

      totalWeightedWinrate += adjustedWinrate * player.weight
      totalWeight += player.weight
    }

    scores[map] = totalWeight > 0 ? totalWeightedWinrate / totalWeight : 0.5
  }

  return scores
}

export function computePickBan(
  ourScores: Record<string, number>,
  theirScores: Record<string, number>,
): PickBanResult {
  const allMaps: MapScore[] = Object.keys(ourScores)
    .map(map => ({
      map,
      ourScore: ourScores[map],
      theirScore: theirScores[map],
      advantage: ourScores[map] - theirScores[map],
    }))
    .sort((a, b) => b.advantage - a.advantage)

  const pickThreshold = 0.03
  const banThreshold = -0.03

  return {
    picks: allMaps.filter(m => m.advantage >= pickThreshold),
    neutral: allMaps.filter(m => m.advantage > banThreshold && m.advantage < pickThreshold),
    bans: allMaps.filter(m => m.advantage <= banThreshold),
    allMaps,
  }
}

export async function analyzeTeam(
  playerIds: string[],
  matchCount: number,
): Promise<PlayerAnalysis[]> {
  const players = await Promise.all(
    playerIds.map(id => faceitApi.getPlayer(id)),
  )

  const elos = players.map(p => p.games.cs2?.faceit_elo ?? 1000)
  const averageElo = elos.reduce((sum, e) => sum + e, 0) / elos.length

  const statsPromises = playerIds.map(id => faceitApi.getPlayerStats(id))
  const allStats = await Promise.all(statsPromises)

  return players.map((player, i) => {
    const elo = player.games.cs2?.faceit_elo ?? 1000
    return {
      playerId: player.player_id,
      nickname: player.nickname,
      elo,
      weight: calculatePlayerWeight(elo, averageElo),
      mapStats: extractMapStats(allStats[i]),
    }
  })
}

export async function analyzeLobby(
  matchId: string,
  teamSide: 1 | 2,
  matchCount: number,
): Promise<PickBanResult> {
  const match = await faceitApi.getMatch(matchId)

  const ourFaction = teamSide === 1 ? 'faction1' : 'faction2'
  const theirFaction = teamSide === 1 ? 'faction2' : 'faction1'

  const ourPlayerIds = match.teams[ourFaction].players.map(p => p.player_id)
  const theirPlayerIds = match.teams[theirFaction].players.map(p => p.player_id)

  const [ourAnalysis, theirAnalysis] = await Promise.all([
    analyzeTeam(ourPlayerIds, matchCount),
    analyzeTeam(theirPlayerIds, matchCount),
  ])

  const ourScores = calculateMapScores(ourAnalysis)
  const theirScores = calculateMapScores(theirAnalysis)

  return computePickBan(ourScores, theirScores)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/services/__tests__/analyzer.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/analyzer.ts src/services/__tests__/analyzer.test.ts
git commit -m "feat: add analyzer service with pick/ban algorithm"
```

---

### Task 7: Predictor Service

**Files:**
- Create: `src/services/predictor.ts`
- Create: `src/services/__tests__/predictor.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/predictor.test.ts`:

```ts
import type { PlayerAnalysis } from '../../types'
import { describe, expect, it } from 'vitest'
import { predictWinner } from '../predictor'

describe('predictor', () => {
  const makePlayer = (elo: number, winrate: number, nickname: string): PlayerAnalysis => ({
    playerId: `id-${nickname}`,
    nickname,
    elo,
    weight: 1,
    mapStats: [
      { map: 'de_mirage', matches: 20, wins: Math.round(winrate * 20), winrate, kdRatio: 1.2, hsPercent: 50 },
    ],
  })

  it('should favor the team with higher ELO and winrate', () => {
    const team1 = [makePlayer(2500, 0.7, 'Good1'), makePlayer(2400, 0.65, 'Good2')]
    const team2 = [makePlayer(1500, 0.4, 'Bad1'), makePlayer(1600, 0.45, 'Bad2')]

    const result = predictWinner(team1, team2, 'de_mirage')
    expect(result.team1WinProbability).toBeGreaterThan(0.5)
    expect(result.team2WinProbability).toBeLessThan(0.5)
    expect(result.team1WinProbability + result.team2WinProbability).toBeCloseTo(1)
  })

  it('should be close to 50/50 for equal teams', () => {
    const team1 = [makePlayer(2000, 0.55, 'A')]
    const team2 = [makePlayer(2000, 0.55, 'B')]

    const result = predictWinner(team1, team2, 'de_mirage')
    expect(result.team1WinProbability).toBeCloseTo(0.5, 1)
  })

  it('should identify key players by contribution', () => {
    const team1 = [makePlayer(3000, 0.8, 'Star'), makePlayer(1500, 0.4, 'Weak')]
    const team2 = [makePlayer(2000, 0.5, 'Avg')]

    const result = predictWinner(team1, team2, 'de_mirage')
    expect(result.keyPlayers[0].nickname).toBe('Star')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/__tests__/predictor.test.ts`
Expected: FAIL — module `../predictor` not found

- [ ] **Step 3: Write implementation**

Create `src/services/predictor.ts`:

```ts
import type { PlayerAnalysis, PredictionResult } from '../types'
import { adjustWinrateForUncertainty } from './analyzer'

export function predictWinner(
  team1: PlayerAnalysis[],
  team2: PlayerAnalysis[],
  map: string,
): PredictionResult {
  const team1Strength = computeTeamStrength(team1, map)
  const team2Strength = computeTeamStrength(team2, map)

  const total = team1Strength.score + team2Strength.score
  const team1Prob = total > 0 ? team1Strength.score / total : 0.5
  const team2Prob = 1 - team1Prob

  const allContributions = [
    ...team1Strength.contributions.map(c => ({ ...c, team: 1 })),
    ...team2Strength.contributions.map(c => ({ ...c, team: 2 })),
  ].sort((a, b) => b.contribution - a.contribution)

  return {
    map,
    team1WinProbability: team1Prob,
    team2WinProbability: team2Prob,
    keyPlayers: allContributions.slice(0, 5).map(c => ({
      nickname: c.nickname,
      contribution: c.contribution,
    })),
  }
}

interface TeamStrength {
  score: number
  contributions: { nickname: string, contribution: number }[]
}

function computeTeamStrength(team: PlayerAnalysis[], map: string): TeamStrength {
  const contributions: { nickname: string, contribution: number }[] = []

  for (const player of team) {
    const mapStat = player.mapStats.find(s => s.map === map)
    const winrate = mapStat
      ? adjustWinrateForUncertainty(mapStat.winrate, mapStat.matches)
      : 0.5

    // Combine ELO factor and map winrate
    const eloFactor = player.elo / 2000 // Normalize around 2000
    const strength = (winrate * 0.6 + eloFactor * 0.4) * player.elo
    contributions.push({ nickname: player.nickname, contribution: strength })
  }

  const score = contributions.reduce((sum, c) => sum + c.contribution, 0)
  return { score, contributions }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/services/__tests__/predictor.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/predictor.ts src/services/__tests__/predictor.test.ts
git commit -m "feat: add predictor service with tests"
```

---

### Task 8: Discord Embed Helpers

**Files:**
- Create: `src/utils/embeds.ts`

- [ ] **Step 1: Create src/utils/embeds.ts**

```ts
import type { MapScore, PickBanResult, PredictionResult, StratsResult } from '../types'
import { EmbedBuilder } from 'discord.js'
import { MAP_DISPLAY_NAMES } from './constants'

function mapName(map: string): string {
  return MAP_DISPLAY_NAMES[map] ?? map
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function advantageLabel(advantage: number): string {
  if (advantage >= 0.03)
    return '🟢 PICK'
  if (advantage <= -0.03)
    return '🔴 BAN'
  return '🟡 NEUTRE'
}

export function pickBanEmbed(result: PickBanResult): EmbedBuilder {
  const lines = result.allMaps.map(m =>
    `${advantageLabel(m.advantage)}  **${mapName(m.map)}** — Vous: ${pct(m.ourScore)} | Eux: ${pct(m.theirScore)} | Avantage: ${m.advantage >= 0 ? '+' : ''}${pct(m.advantage)}`,
  )

  return new EmbedBuilder()
    .setTitle('📊 Analyse Pick & Ban')
    .setDescription(lines.join('\n'))
    .setColor(0x00AE86)
    .setTimestamp()
}

export function playerEmbed(
  nickname: string,
  elo: number,
  level: number,
  winrate: string,
  kd: string,
  hs: string,
  topMaps: { map: string, winrate: string }[],
  bottomMaps: { map: string, winrate: string }[],
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`👤 ${nickname}`)
    .addFields(
      { name: 'ELO', value: String(elo), inline: true },
      { name: 'Level', value: String(level), inline: true },
      { name: 'Winrate', value: winrate, inline: true },
      { name: 'K/D', value: kd, inline: true },
      { name: 'HS%', value: hs, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      {
        name: '🟢 Meilleures maps',
        value: topMaps.map(m => `${mapName(m.map)}: ${m.winrate}`).join('\n') || 'N/A',
        inline: true,
      },
      {
        name: '🔴 Pires maps',
        value: bottomMaps.map(m => `${mapName(m.map)}: ${m.winrate}`).join('\n') || 'N/A',
        inline: true,
      },
    )
    .setColor(0x5865F2)
    .setTimestamp()
}

export function compareEmbed(
  nick1: string,
  nick2: string,
  stats1: Record<string, string>,
  stats2: Record<string, string>,
  mapComparison: { map: string, wr1: string, wr2: string, winner: string }[],
): EmbedBuilder {
  const header = `**${nick1}** vs **${nick2}**`
  const statLines = Object.keys(stats1).map(k =>
    `**${k}:** ${stats1[k]} vs ${stats2[k]}`,
  )
  const mapLines = mapComparison.map(m =>
    `**${mapName(m.map)}:** ${m.wr1} vs ${m.wr2} ${m.winner === nick1 ? '⬅️' : '➡️'}`,
  )

  return new EmbedBuilder()
    .setTitle(`⚔️ ${header}`)
    .addFields(
      { name: 'Stats globales', value: statLines.join('\n') },
      { name: 'Par map', value: mapLines.join('\n') || 'N/A' },
    )
    .setColor(0xFEE75C)
    .setTimestamp()
}

export function predictionEmbed(
  team1Name: string,
  team2Name: string,
  predictions: PredictionResult[],
): EmbedBuilder {
  const lines = predictions.map(p =>
    `**${mapName(p.map)}:** ${team1Name} ${pct(p.team1WinProbability)} — ${pct(p.team2WinProbability)} ${team2Name}`,
  )

  const topPlayers = predictions[0]?.keyPlayers.slice(0, 3)
    .map(kp => `${kp.nickname}`)
    .join(', ')

  return new EmbedBuilder()
    .setTitle('🔮 Prédiction')
    .setDescription(lines.join('\n'))
    .addFields(
      { name: 'Joueurs clés', value: topPlayers || 'N/A' },
    )
    .setColor(0xEB459E)
    .setTimestamp()
}

export function stratsEmbed(result: StratsResult): EmbedBuilder {
  const lines = result.playerBreakdown.map(p =>
    `**${p.nickname}:** CT ${Math.round(p.ctWinrate * 100)}% | T ${Math.round(p.tWinrate * 100)}%`,
  )

  return new EmbedBuilder()
    .setTitle(`🎯 Strats — ${mapName(result.map)}`)
    .setDescription(`**Côté recommandé : ${result.recommendedSide}**\n\nCT global: ${pct(result.ctWinrate)} | T global: ${pct(result.tWinrate)}`)
    .addFields(
      { name: 'Détail par joueur', value: lines.join('\n') || 'N/A' },
    )
    .setColor(0x57F287)
    .setTimestamp()
}

export function teamEmbed(
  players: { nickname: string, elo: number }[],
  strongMaps: { map: string, score: string }[],
  weakMaps: { map: string, score: string }[],
): EmbedBuilder {
  const playerList = players.map(p => `${p.nickname} (${p.elo})`).join(', ')

  return new EmbedBuilder()
    .setTitle('👥 Analyse d\'équipe')
    .setDescription(playerList)
    .addFields(
      {
        name: '🟢 Maps fortes',
        value: strongMaps.map(m => `${mapName(m.map)}: ${m.score}`).join('\n') || 'N/A',
        inline: true,
      },
      {
        name: '🔴 Maps faibles',
        value: weakMaps.map(m => `${mapName(m.map)}: ${m.score}`).join('\n') || 'N/A',
        inline: true,
      },
    )
    .setColor(0x5865F2)
    .setTimestamp()
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ Erreur')
    .setDescription(message)
    .setColor(0xED4245)
    .setTimestamp()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/embeds.ts
git commit -m "feat: add Discord embed helpers"
```

---

### Task 9: Bot Bootstrap & Command Loader

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```ts
import type { BotCommand } from './types'
import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js'
import { config } from './config'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const commands = new Collection<string, BotCommand>()

async function loadCommands(): Promise<void> {
  const commandFiles = [
    'analyze',
    'player',
    'compare',
    'history',
    'team',
    'live',
    'predict',
    'strats',
  ]

  for (const file of commandFiles) {
    const mod = await import(`./commands/${file}.js`)
    const command: BotCommand = mod.default
    commands.set(command.data.name, command)
  }
}

async function registerSlashCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discordToken)
  const commandData = commands.map(c => c.data.toJSON())

  await rest.put(
    Routes.applicationCommands(config.discordClientId),
    { body: commandData },
  )

  console.log(`Registered ${commandData.length} slash commands`)
}

client.once(Events.ClientReady, (c) => {
  console.log(`Bot ready as ${c.user.tag}`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand())
    return

  const command = commands.get(interaction.commandName)
  if (!command)
    return

  try {
    await command.execute(interaction)
  }
  catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error)
    const { errorEmbed } = await import('./utils/embeds.js')
    const content = { embeds: [errorEmbed('Une erreur inattendue est survenue.')] }
    if (interaction.replied || interaction.deferred)
      await interaction.followUp(content)
    else
      await interaction.reply(content)
  }
})

async function main(): Promise<void> {
  await loadCommands()
  await registerSlashCommands()
  await client.login(config.discordToken)
}

main().catch(console.error)
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add bot bootstrap and command loader"
```

---

### Task 10: /analyze Command

**Files:**
- Create: `src/commands/analyze.ts`

- [ ] **Step 1: Create src/commands/analyze.ts**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js'
import { analyzeLobby } from '../services/analyzer'
import { faceitApi } from '../services/faceit-api'
import { DEFAULT_MATCH_COUNT } from '../utils/constants'
import { errorEmbed, pickBanEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Analyse un lobby FACEIT et recommande les picks/bans')
    .addStringOption(opt =>
      opt.setName('room_id').setDescription('ID de la room FACEIT').setRequired(true),
    )
    .addIntegerOption(opt =>
      opt.setName('matches').setDescription('Nombre de matchs pour le calcul (défaut: 50)').setMinValue(10).setMaxValue(100),
    )
    .addIntegerOption(opt =>
      opt.setName('team').setDescription('Ton équipe (1 ou 2)').addChoices(
        { name: 'Team 1', value: 1 },
        { name: 'Team 2', value: 2 },
      ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const roomId = interaction.options.getString('room_id', true)
    const matchCount = interaction.options.getInteger('matches') ?? DEFAULT_MATCH_COUNT
    const teamOption = interaction.options.getInteger('team') as 1 | 2 | null

    await interaction.deferReply()

    let match
    try {
      match = await faceitApi.getMatch(roomId)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed('Room introuvable, vérifie l\'ID.')] })
      return
    }

    if (teamOption) {
      const result = await analyzeLobby(roomId, teamOption, matchCount)
      await interaction.editReply({ embeds: [pickBanEmbed(result)] })
      return
    }

    // Ask which team via buttons
    const team1Names = match.teams.faction1.players.map(p => p.nickname).join(', ')
    const team2Names = match.teams.faction2.players.map(p => p.nickname).join(', ')

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`analyze:1:${roomId}:${matchCount}`)
        .setLabel('Team 1')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`analyze:2:${roomId}:${matchCount}`)
        .setLabel('Team 2')
        .setStyle(ButtonStyle.Secondary),
    )

    const reply = await interaction.editReply({
      content: `**Team 1:** ${team1Names}\n**Team 2:** ${team2Names}\n\nDe quel côté es-tu ?`,
      components: [row],
    })

    try {
      const buttonInteraction = await reply.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30_000,
      })

      const [, side, matchId, count] = buttonInteraction.customId.split(':')
      await buttonInteraction.deferUpdate()

      const result = await analyzeLobby(matchId, Number(side) as 1 | 2, Number(count))
      await interaction.editReply({ embeds: [pickBanEmbed(result)], components: [], content: '' })
    }
    catch {
      await interaction.editReply({ content: 'Temps écoulé, relance la commande.', components: [] })
    }
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/analyze.ts
git commit -m "feat: add /analyze command"
```

---

### Task 11: /player Command

**Files:**
- Create: `src/commands/player.ts`

- [ ] **Step 1: Create src/commands/player.ts**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api'
import { CS2_MAP_POOL, MAP_DISPLAY_NAMES } from '../utils/constants'
import { errorEmbed, playerEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Affiche le profil d\'un joueur FACEIT')
    .addStringOption(opt =>
      opt.setName('pseudo').setDescription('Pseudo FACEIT du joueur').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const pseudo = interaction.options.getString('pseudo', true)
    await interaction.deferReply()

    let player
    try {
      player = await faceitApi.getPlayerByNickname(pseudo)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed(`Joueur "${pseudo}" non trouvé sur FACEIT.`)] })
      return
    }

    if (!player.games.cs2) {
      await interaction.editReply({ embeds: [errorEmbed(`${pseudo} n'a pas de stats CS2.`)] })
      return
    }

    const stats = await faceitApi.getPlayerStats(player.player_id)
    const mapSegments = stats.segments
      .filter(s => s.type === 'Map' && CS2_MAP_POOL.includes(s.label as any))
      .map(s => ({
        map: s.label,
        winrate: Number(s.stats['Win Rate %']),
      }))
      .sort((a, b) => b.winrate - a.winrate)

    const topMaps = mapSegments.slice(0, 3).map(m => ({
      map: m.map,
      winrate: `${m.winrate}%`,
    }))
    const bottomMaps = mapSegments.slice(-3).reverse().map(m => ({
      map: m.map,
      winrate: `${m.winrate}%`,
    }))

    await interaction.editReply({
      embeds: [playerEmbed(
        player.nickname,
        player.games.cs2.faceit_elo,
        player.games.cs2.skill_level,
        `${stats.lifetime['Win Rate %']}%`,
        stats.lifetime['Average K/D Ratio'] || stats.lifetime['K/D Ratio'],
        `${stats.lifetime['Average Headshots %'] || stats.lifetime['Total Headshots %']}%`,
        topMaps,
        bottomMaps,
      )],
    })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/player.ts
git commit -m "feat: add /player command"
```

---

### Task 12: /compare Command

**Files:**
- Create: `src/commands/compare.ts`

- [ ] **Step 1: Create src/commands/compare.ts**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api'
import { CS2_MAP_POOL } from '../utils/constants'
import { compareEmbed, errorEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare deux joueurs FACEIT')
    .addStringOption(opt =>
      opt.setName('joueur1').setDescription('Pseudo du premier joueur').setRequired(true),
    )
    .addStringOption(opt =>
      opt.setName('joueur2').setDescription('Pseudo du deuxième joueur').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const nick1 = interaction.options.getString('joueur1', true)
    const nick2 = interaction.options.getString('joueur2', true)
    await interaction.deferReply()

    let player1, player2
    try {
      ;[player1, player2] = await Promise.all([
        faceitApi.getPlayerByNickname(nick1),
        faceitApi.getPlayerByNickname(nick2),
      ])
    }
    catch (err) {
      await interaction.editReply({ embeds: [errorEmbed((err as Error).message)] })
      return
    }

    const [stats1, stats2] = await Promise.all([
      faceitApi.getPlayerStats(player1.player_id),
      faceitApi.getPlayerStats(player2.player_id),
    ])

    const globalStats1: Record<string, string> = {
      'ELO': String(player1.games.cs2?.faceit_elo ?? 'N/A'),
      'Winrate': `${stats1.lifetime['Win Rate %']}%`,
      'K/D': stats1.lifetime['Average K/D Ratio'] || stats1.lifetime['K/D Ratio'],
    }
    const globalStats2: Record<string, string> = {
      'ELO': String(player2.games.cs2?.faceit_elo ?? 'N/A'),
      'Winrate': `${stats2.lifetime['Win Rate %']}%`,
      'K/D': stats2.lifetime['Average K/D Ratio'] || stats2.lifetime['K/D Ratio'],
    }

    const mapComparison = CS2_MAP_POOL.map((map) => {
      const seg1 = stats1.segments.find(s => s.label === map && s.type === 'Map')
      const seg2 = stats2.segments.find(s => s.label === map && s.type === 'Map')
      const wr1 = seg1 ? Number(seg1.stats['Win Rate %']) : 0
      const wr2 = seg2 ? Number(seg2.stats['Win Rate %']) : 0
      return {
        map,
        wr1: seg1 ? `${seg1.stats['Win Rate %']}%` : 'N/A',
        wr2: seg2 ? `${seg2.stats['Win Rate %']}%` : 'N/A',
        winner: wr1 >= wr2 ? nick1 : nick2,
      }
    })

    await interaction.editReply({
      embeds: [compareEmbed(nick1, nick2, globalStats1, globalStats2, mapComparison)],
    })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/compare.ts
git commit -m "feat: add /compare command"
```

---

### Task 13: /history Command

**Files:**
- Create: `src/commands/history.ts`

- [ ] **Step 1: Create src/commands/history.ts**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api'
import { MAP_DISPLAY_NAMES } from '../utils/constants'
import { errorEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Affiche l\'historique d\'une room FACEIT')
    .addStringOption(opt =>
      opt.setName('room_id').setDescription('ID de la room FACEIT').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const roomId = interaction.options.getString('room_id', true)
    await interaction.deferReply()

    let match
    try {
      match = await faceitApi.getMatch(roomId)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed('Room introuvable, vérifie l\'ID.')] })
      return
    }

    const mapPlayed = match.voting?.map?.pick?.[0]
    const mapDisplay = mapPlayed ? (MAP_DISPLAY_NAMES[mapPlayed] ?? mapPlayed) : 'N/A'
    const statusDisplay = match.status === 'FINISHED' ? '✅ Terminé' : match.status === 'ONGOING' ? '🔴 En cours' : match.status

    const team1 = match.teams.faction1
    const team2 = match.teams.faction2
    const team1Names = team1.players.map(p => p.nickname).join(', ')
    const team2Names = team2.players.map(p => p.nickname).join(', ')

    const embed = new EmbedBuilder()
      .setTitle(`📜 Room ${roomId.slice(0, 8)}...`)
      .addFields(
        { name: 'Status', value: statusDisplay, inline: true },
        { name: 'Map', value: mapDisplay, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Team 1', value: team1Names },
        { name: 'Team 2', value: team2Names },
      )
      .setColor(0x5865F2)
      .setTimestamp()

    if (match.results) {
      embed.addFields({
        name: 'Score',
        value: `${match.results.score.faction1} - ${match.results.score.faction2} (${match.results.winner === 'faction1' ? 'Team 1' : 'Team 2'} gagne)`,
      })
    }

    await interaction.editReply({ embeds: [embed] })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/history.ts
git commit -m "feat: add /history command"
```

---

### Task 14: /team Command

**Files:**
- Create: `src/commands/team.ts`

- [ ] **Step 1: Create src/commands/team.ts**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { SlashCommandBuilder } from 'discord.js'
import { analyzeTeam, calculateMapScores } from '../services/analyzer'
import { faceitApi } from '../services/faceit-api'
import { CS2_MAP_POOL, DEFAULT_MATCH_COUNT, MAP_DISPLAY_NAMES } from '../utils/constants'
import { errorEmbed, teamEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Analyse les maps fortes/faibles d\'une équipe')
    .addStringOption(opt => opt.setName('j1').setDescription('Joueur 1').setRequired(true))
    .addStringOption(opt => opt.setName('j2').setDescription('Joueur 2').setRequired(true))
    .addStringOption(opt => opt.setName('j3').setDescription('Joueur 3').setRequired(true))
    .addStringOption(opt => opt.setName('j4').setDescription('Joueur 4').setRequired(true))
    .addStringOption(opt => opt.setName('j5').setDescription('Joueur 5').setRequired(true)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const nicknames = ['j1', 'j2', 'j3', 'j4', 'j5']
      .map(k => interaction.options.getString(k, true))
    await interaction.deferReply()

    let players
    try {
      players = await Promise.all(
        nicknames.map(n => faceitApi.getPlayerByNickname(n)),
      )
    }
    catch (err) {
      await interaction.editReply({ embeds: [errorEmbed((err as Error).message)] })
      return
    }

    const playerIds = players.map(p => p.player_id)
    const analysis = await analyzeTeam(playerIds, DEFAULT_MATCH_COUNT)
    const scores = calculateMapScores(analysis)

    const sorted = CS2_MAP_POOL
      .map(map => ({ map, score: scores[map] }))
      .sort((a, b) => b.score - a.score)

    const strongMaps = sorted.slice(0, 3).map(m => ({
      map: m.map,
      score: `${Math.round(m.score * 100)}%`,
    }))
    const weakMaps = sorted.slice(-3).reverse().map(m => ({
      map: m.map,
      score: `${Math.round(m.score * 100)}%`,
    }))

    const playerList = analysis.map(p => ({
      nickname: p.nickname,
      elo: p.elo,
    }))

    await interaction.editReply({
      embeds: [teamEmbed(playerList, strongMaps, weakMaps)],
    })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/team.ts
git commit -m "feat: add /team command"
```

---

### Task 15: /live Command

**Files:**
- Create: `src/commands/live.ts`

- [ ] **Step 1: Create src/commands/live.ts**

Note: FACEIT API ne fournit pas directement un endpoint "is player in live match". On utilise l'historique récent et on vérifie si le dernier match est ONGOING.

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { analyzeLobby } from '../services/analyzer'
import { faceitApi } from '../services/faceit-api'
import { DEFAULT_MATCH_COUNT } from '../utils/constants'
import { errorEmbed, pickBanEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('live')
    .setDescription('Vérifie si un joueur est en match et analyse le lobby')
    .addStringOption(opt =>
      opt.setName('pseudo').setDescription('Pseudo FACEIT du joueur').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const pseudo = interaction.options.getString('pseudo', true)
    await interaction.deferReply()

    let player
    try {
      player = await faceitApi.getPlayerByNickname(pseudo)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed(`Joueur "${pseudo}" non trouvé sur FACEIT.`)] })
      return
    }

    const history = await faceitApi.getPlayerHistory(player.player_id, 1)
    if (!history.items.length) {
      await interaction.editReply({ embeds: [errorEmbed(`${pseudo} n'a aucun match récent.`)] })
      return
    }

    const lastMatch = history.items[0]
    const match = await faceitApi.getMatch(lastMatch.match_id)

    if (match.status === 'ONGOING' || match.status === 'READY') {
      // Determine which team the player is on
      const isTeam1 = match.teams.faction1.players.some(p => p.player_id === player.player_id)
      const teamSide: 1 | 2 = isTeam1 ? 1 : 2

      await interaction.editReply({ content: `🔴 **${pseudo}** est en match ! Analyse en cours...` })

      const result = await analyzeLobby(match.match_id, teamSide, DEFAULT_MATCH_COUNT)
      await interaction.editReply({
        content: `🔴 **${pseudo}** est en match !`,
        embeds: [pickBanEmbed(result)],
      })
    }
    else {
      const date = new Date(lastMatch.finished_at * 1000)
      const timeAgo = formatTimeAgo(date)

      const embed = new EmbedBuilder()
        .setTitle(`💤 ${pseudo} n'est pas en match`)
        .setDescription(`Dernier match : ${timeAgo}`)
        .setColor(0x99AAB5)
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    }
  },
} satisfies BotCommand

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60)
    return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)
    return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD}j`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/live.ts
git commit -m "feat: add /live command"
```

---

### Task 16: /predict Command

**Files:**
- Create: `src/commands/predict.ts`

- [ ] **Step 1: Create src/commands/predict.ts**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { SlashCommandBuilder } from 'discord.js'
import { analyzeTeam } from '../services/analyzer'
import { faceitApi } from '../services/faceit-api'
import { predictWinner } from '../services/predictor'
import { CS2_MAP_POOL, DEFAULT_MATCH_COUNT } from '../utils/constants'
import { errorEmbed, predictionEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Prédit le vainqueur d\'un match FACEIT')
    .addStringOption(opt =>
      opt.setName('room_id').setDescription('ID de la room FACEIT').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const roomId = interaction.options.getString('room_id', true)
    await interaction.deferReply()

    let match
    try {
      match = await faceitApi.getMatch(roomId)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed('Room introuvable, vérifie l\'ID.')] })
      return
    }

    const team1Ids = match.teams.faction1.players.map(p => p.player_id)
    const team2Ids = match.teams.faction2.players.map(p => p.player_id)

    const [team1Analysis, team2Analysis] = await Promise.all([
      analyzeTeam(team1Ids, DEFAULT_MATCH_COUNT),
      analyzeTeam(team2Ids, DEFAULT_MATCH_COUNT),
    ])

    const votedMap = match.voting?.map?.pick?.[0]
    const mapsToPredict = votedMap ? [votedMap] : [...CS2_MAP_POOL]

    const predictions = mapsToPredict.map(map =>
      predictWinner(team1Analysis, team2Analysis, map),
    )

    const team1Name = `${match.teams.faction1.players.map(p => p.nickname).slice(0, 2).join(', ')}...`
    const team2Name = `${match.teams.faction2.players.map(p => p.nickname).slice(0, 2).join(', ')}...`

    await interaction.editReply({
      embeds: [predictionEmbed(team1Name, team2Name, predictions)],
    })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/predict.ts
git commit -m "feat: add /predict command"
```

---

### Task 17: /strats Command

**Files:**
- Create: `src/commands/strats.ts`

- [ ] **Step 1: Create src/commands/strats.ts**

Note: L'API FACEIT stats ne fournit pas directement les winrates CT/T par map par joueur. On approxime via les stats per-round si disponibles, sinon on utilise les stats générales de la map (les segments "Map" ne splitent pas CT/T). Si l'API ne fournit pas CT/T, on base la recommandation sur le winrate global et le K/D (T side nécessite plus d'agressivité = meilleur K/D favorise le T side).

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand, StratsResult } from '../types'
import { SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api'
import { CS2_MAP_POOL } from '../utils/constants'
import { errorEmbed, stratsEmbed } from '../utils/embeds'

export default {
  data: new SlashCommandBuilder()
    .setName('strats')
    .setDescription('Recommande le côté à choisir (CT/T) sur une map')
    .addStringOption(opt =>
      opt.setName('map').setDescription('Map CS2').setRequired(true).addChoices(
        ...CS2_MAP_POOL.map(m => ({ name: m.replace('de_', ''), value: m })),
      ),
    )
    .addStringOption(opt => opt.setName('j1').setDescription('Joueur 1'))
    .addStringOption(opt => opt.setName('j2').setDescription('Joueur 2'))
    .addStringOption(opt => opt.setName('j3').setDescription('Joueur 3'))
    .addStringOption(opt => opt.setName('j4').setDescription('Joueur 4'))
    .addStringOption(opt => opt.setName('j5').setDescription('Joueur 5')) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const map = interaction.options.getString('map', true)
    const nicknames = ['j1', 'j2', 'j3', 'j4', 'j5']
      .map(k => interaction.options.getString(k))
      .filter((n): n is string => n !== null)

    if (nicknames.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('Fournis au moins un joueur.')] })
      return
    }

    await interaction.deferReply()

    let players
    try {
      players = await Promise.all(nicknames.map(n => faceitApi.getPlayerByNickname(n)))
    }
    catch (err) {
      await interaction.editReply({ embeds: [errorEmbed((err as Error).message)] })
      return
    }

    const allGameStats = await Promise.all(
      players.map(p => faceitApi.getPlayerGameStats(p.player_id, 100)),
    )

    const playerBreakdown = players.map((player, i) => {
      const mapMatches = allGameStats[i].filter(g => g.map === map)
      let ctWins = 0
      let ctTotal = 0
      let tWins = 0
      let tTotal = 0

      // Approximate CT/T from per-match stats
      // FACEIT game stats include round-level data when available
      // Fallback: use K/D to estimate aggression profile
      for (const match of mapMatches) {
        const won = match.result === '1'
        // Without explicit CT/T split, we split matches 50/50 and weight by K/D
        const kd = Number(match.kd_ratio) || 1
        if (kd >= 1.1) {
          // Aggressive = likely T-side strength
          tTotal++
          if (won)
            tWins++
        }
        else {
          ctTotal++
          if (won)
            ctWins++
        }
      }

      // If no data, default to 50%
      const ctWinrate = ctTotal > 0 ? ctWins / ctTotal : 0.5
      const tWinrate = tTotal > 0 ? tWins / tTotal : 0.5

      return {
        nickname: player.nickname,
        ctWinrate,
        tWinrate,
      }
    })

    const avgCt = playerBreakdown.reduce((s, p) => s + p.ctWinrate, 0) / playerBreakdown.length
    const avgT = playerBreakdown.reduce((s, p) => s + p.tWinrate, 0) / playerBreakdown.length

    const result: StratsResult = {
      map,
      recommendedSide: avgCt >= avgT ? 'CT' : 'T',
      ctWinrate: avgCt,
      tWinrate: avgT,
      playerBreakdown,
    }

    await interaction.editReply({ embeds: [stratsEmbed(result)] })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/strats.ts
git commit -m "feat: add /strats command"
```

---

### Task 18: Final Integration & Verification

- [ ] **Step 1: Run linter**

```bash
pnpm lint:fix
```

Fix any issues.

- [ ] **Step 2: Run all tests**

```bash
pnpm test run
```

Ensure all tests pass.

- [ ] **Step 3: Test TypeScript compilation**

```bash
pnpm build
```

Ensure no type errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint and type errors"
```

- [ ] **Step 5: Create .env with real tokens and test manually**

Create `.env` with real `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `FACEIT_API_KEY`. Then:

```bash
pnpm dev
```

Test each slash command in Discord.
