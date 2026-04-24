import type {
  FaceitGameStatsItem,
  FaceitGameStatsResponse,
  FaceitMatch,
  FaceitMatchHistory,
  FaceitPlayer,
  FaceitPlayerStats,
} from '../types.js'
import { CACHE_TTL, FACEIT_API_BASE } from '../utils/constants.js'
import { cache } from './cache.js'

let apiKey: string | undefined

/**
 * Must be called once at bootstrap (bot or api) before any request.
 * Keeps core free of process.env reads so it can be consumed by any runtime.
 */
export function initFaceitApi(key: string): void {
  apiKey = key
}

function getApiKey(): string {
  if (!apiKey) {
    throw new Error(
      'FaceitApi not initialized — call initFaceitApi(apiKey) at startup',
    )
  }
  return apiKey
}

async function faceitFetch<T>(path: string, retries = 3): Promise<T> {
  const url = `${FACEIT_API_BASE}${path}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
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
    const cacheKey = cache.key('player-nick', nickname.toLowerCase())
    const cached = cache.get<FaceitPlayer>(cacheKey)
    if (cached)
      return cached

    try {
      const player = await faceitFetch<FaceitPlayer>(
        `/players?nickname=${encodeURIComponent(nickname)}&game=cs2`,
      )
      cache.set(cacheKey, player, CACHE_TTL.PLAYER_STATS)
      return player
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

  /**
   * Fetch a player's game stats.
   *
   * - When `from` (Unix seconds) is provided, stats are filtered to matches
   *   played after that timestamp and paginated until either exhausted or
   *   `maxTotal` is reached. Use this for "last N months" queries.
   * - Without `from`, behaves like a single page of size `limit` (legacy).
   */
  async getPlayerGameStats(
    playerId: string,
    opts: number | { from?: number, to?: number, maxTotal?: number, pageSize?: number },
  ): Promise<FaceitGameStatsItem[]> {
    const options = typeof opts === 'number' ? { maxTotal: opts, pageSize: opts } : opts
    const { from, to, maxTotal = 300, pageSize = 100 } = options

    const cacheKey = cache.key(
      'player-game-stats',
      playerId,
      String(from ?? ''),
      String(to ?? ''),
      String(maxTotal),
    )
    const cached = cache.get<FaceitGameStatsItem[]>(cacheKey)
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

    cache.set(cacheKey, collected, CACHE_TTL.MATCH_HISTORY)
    return collected
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
