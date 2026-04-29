import type { AnalyzeOptions } from '@/services/analyzer-pure.js'
import type {
  FaceitGameStatsItem,
  FaceitGameStatsResponse,
  FaceitMatch,
  FaceitMatchHistory,
  FaceitPlayer,
  FaceitPlayerStats,
  PickBanResult,
  PlayerAnalysis,
  PlayerMapStats,
} from '@/types.js'
import { cacheBrowser } from '@/cache-browser.js'
import {
  calculateMapScores,
  calculatePlayerWeight,
  computePickBan,
} from '@/services/analyzer-pure.js'
import {
  CACHE_TTL,
  FACEIT_API_BASE,
  isInMapPool,
  normalizeMapName,
} from '@/utils/constants.js'

export interface FaceitBrowserClient {
  getPlayerByNickname: (nickname: string) => Promise<FaceitPlayer>
  getPlayer: (playerId: string) => Promise<FaceitPlayer>
  getPlayerStats: (playerId: string) => Promise<FaceitPlayerStats>
  getPlayerHistory: (playerId: string, limit: number) => Promise<FaceitMatchHistory>
  getPlayerGameStats: (
    playerId: string,
    opts: number | { from?: number, to?: number, maxTotal?: number, pageSize?: number },
  ) => Promise<FaceitGameStatsItem[]>
  getMatch: (matchId: string) => Promise<FaceitMatch>
}

class FaceitApiError extends Error {
  constructor(public status: number, public url: string) {
    super(`FACEIT API error ${status} for ${url}`)
    this.name = 'FaceitApiError'
  }
}

export function createFaceitBrowserClient(apiKey: string): FaceitBrowserClient {
  async function faceitFetch<T>(path: string, retries = 3): Promise<T> {
    const url = `${FACEIT_API_BASE}${path}`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })

    if (response.status === 429 && retries > 0) {
      const retryAfter = Number(response.headers.get('retry-after') || '2')
      await new Promise(r => setTimeout(r, retryAfter * 1000))
      return faceitFetch<T>(path, retries - 1)
    }

    if (!response.ok)
      throw new FaceitApiError(response.status, url)

    return response.json() as Promise<T>
  }

  return {
    async getPlayerByNickname(nickname: string): Promise<FaceitPlayer> {
      const cacheKey = cacheBrowser.key('bn', nickname.toLowerCase())
      const cached = cacheBrowser.get<FaceitPlayer>(cacheKey)
      if (cached)
        return cached
      try {
        const player = await faceitFetch<FaceitPlayer>(
          `/players?nickname=${encodeURIComponent(nickname)}&game=cs2`,
        )
        cacheBrowser.set(cacheKey, player, CACHE_TTL.PLAYER_STATS)
        return player
      }
      catch (err) {
        if (err instanceof FaceitApiError && err.status === 404)
          throw new Error(`Player "${nickname}" not found on FACEIT`)
        throw err
      }
    },

    async getPlayer(playerId: string): Promise<FaceitPlayer> {
      const cacheKey = cacheBrowser.key('pl', playerId)
      const cached = cacheBrowser.get<FaceitPlayer>(cacheKey)
      if (cached)
        return cached
      const player = await faceitFetch<FaceitPlayer>(`/players/${playerId}`)
      cacheBrowser.set(cacheKey, player, CACHE_TTL.PLAYER_STATS)
      return player
    },

    async getPlayerStats(playerId: string): Promise<FaceitPlayerStats> {
      const cacheKey = cacheBrowser.key('ps', playerId)
      const cached = cacheBrowser.get<FaceitPlayerStats>(cacheKey)
      if (cached)
        return cached
      const stats = await faceitFetch<FaceitPlayerStats>(`/players/${playerId}/stats/cs2`)
      cacheBrowser.set(cacheKey, stats, CACHE_TTL.PLAYER_STATS)
      return stats
    },

    async getPlayerHistory(playerId: string, limit: number): Promise<FaceitMatchHistory> {
      const cacheKey = cacheBrowser.key('ph', playerId, String(limit))
      const cached = cacheBrowser.get<FaceitMatchHistory>(cacheKey)
      if (cached)
        return cached
      const history = await faceitFetch<FaceitMatchHistory>(
        `/players/${playerId}/history?game=cs2&offset=0&limit=${limit}`,
      )
      cacheBrowser.set(cacheKey, history, CACHE_TTL.MATCH_HISTORY)
      return history
    },

    async getPlayerGameStats(
      playerId: string,
      opts: number | { from?: number, to?: number, maxTotal?: number, pageSize?: number },
    ): Promise<FaceitGameStatsItem[]> {
      const options = typeof opts === 'number' ? { maxTotal: opts, pageSize: opts } : opts
      const { from, to, maxTotal = 300, pageSize = 100 } = options

      const cacheKey = cacheBrowser.key('gs', playerId, String(from ?? ''), String(to ?? ''), String(maxTotal))
      const cached = cacheBrowser.get<FaceitGameStatsItem[]>(cacheKey)
      if (cached)
        return cached

      const collected: FaceitGameStatsItem[] = []
      let offset = 0

      while (collected.length < maxTotal) {
        const remaining = maxTotal - collected.length
        const params = new URLSearchParams({
          offset: String(offset),
          limit: String(Math.min(pageSize, remaining)),
        })
        if (from !== undefined)
          params.set('from', String(from))
        if (to !== undefined)
          params.set('to', String(to))

        const response = await faceitFetch<FaceitGameStatsResponse>(
          `/players/${playerId}/games/cs2/stats?${params.toString()}`,
        )

        if (!response.items.length)
          break

        collected.push(...response.items.map(item => item.stats))
        if (response.items.length < pageSize)
          break
        offset += pageSize
      }

      cacheBrowser.set(cacheKey, collected, CACHE_TTL.MATCH_HISTORY)
      return collected
    },

    async getMatch(matchId: string): Promise<FaceitMatch> {
      const cacheKey = cacheBrowser.key('mt', matchId)
      const cached = cacheBrowser.get<FaceitMatch>(cacheKey)
      if (cached)
        return cached
      const match = await faceitFetch<FaceitMatch>(`/matches/${matchId}`)
      cacheBrowser.set(cacheKey, match, CACHE_TTL.MATCH_DETAILS)
      return match
    },
  }
}

async function analyzeTeamBrowser(
  client: FaceitBrowserClient,
  playerIds: string[],
  options: AnalyzeOptions,
): Promise<PlayerAnalysis[]> {
  const { fromTimestamp, maxMatchesPerPlayer = 300 } = options

  const players = await Promise.all(playerIds.map(id => client.getPlayer(id)))
  const elos = players.map(p => p.games.cs2?.faceit_elo ?? 1000)
  if (elos.length === 0)
    return []

  const averageElo = elos.reduce((sum, e) => sum + e, 0) / elos.length

  const allGameStats = await Promise.all(
    playerIds.map(id => client.getPlayerGameStats(id, {
      from: fromTimestamp,
      maxTotal: maxMatchesPerPlayer,
    })),
  )

  return players.map((player, i) => {
    const elo = player.games.cs2?.faceit_elo ?? 1000
    const gameStats = allGameStats[i]
    const mapStatsMap = new Map<string, { wins: number, total: number, kdSum: number, hsSum: number }>()

    for (const game of gameStats) {
      const rawMap = game.Map || game.map
      if (!rawMap || !isInMapPool(rawMap))
        continue
      const gameMap = normalizeMapName(rawMap)
      const entry = mapStatsMap.get(gameMap) ?? { wins: 0, total: 0, kdSum: 0, hsSum: 0 }
      entry.total++
      const result = game.Result || game.result
      if (result === '1')
        entry.wins++
      entry.kdSum += Number(game['K/D Ratio'] || game.kd_ratio) || 0
      entry.hsSum += Number(game['Headshots %'] || game.headshots_percentage) || 0
      mapStatsMap.set(gameMap, entry)
    }

    const mapStats: PlayerMapStats[] = Array.from(mapStatsMap.entries()).map(([map, s]) => ({
      map,
      matches: s.total,
      wins: s.wins,
      winrate: s.wins / s.total,
      kdRatio: s.kdSum / s.total,
      hsPercent: s.hsSum / s.total,
    }))

    return {
      playerId: player.player_id,
      nickname: player.nickname,
      elo,
      weight: calculatePlayerWeight(elo, averageElo),
      mapStats,
    }
  })
}

export async function analyzeLobbyBrowser(
  client: FaceitBrowserClient,
  matchId: string,
  teamSide: 1 | 2,
  options: AnalyzeOptions = {},
): Promise<PickBanResult> {
  const match = await client.getMatch(matchId)
  const ourFaction = teamSide === 1 ? 'faction1' : 'faction2'
  const theirFaction = teamSide === 1 ? 'faction2' : 'faction1'

  const ourPlayerIds = match.teams[ourFaction].roster.map(p => p.player_id)
  const theirPlayerIds = match.teams[theirFaction].roster.map(p => p.player_id)

  const [ourAnalysis, theirAnalysis] = await Promise.all([
    analyzeTeamBrowser(client, ourPlayerIds, options),
    analyzeTeamBrowser(client, theirPlayerIds, options),
  ])

  return computePickBan(calculateMapScores(ourAnalysis), calculateMapScores(theirAnalysis))
}
