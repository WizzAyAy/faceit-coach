import type {
  FaceitGameStatsItem,
  FaceitGameStatsResponse,
  FaceitMatch,
  FaceitMatchHistory,
  FaceitPlayer,
  FaceitPlayerStats,
} from '../types/index.js'
import { config } from '../config.js'
import { CACHE_TTL, FACEIT_API_BASE } from '../utils/constants.js'
import { cache } from './cache.js'

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

  async getPlayerGameStats(playerId: string, limit: number): Promise<FaceitGameStatsItem[]> {
    const cacheKey = cache.key('player-game-stats', playerId, String(limit))
    const cached = cache.get<FaceitGameStatsItem[]>(cacheKey)
    if (cached)
      return cached

    const response = await faceitFetch<FaceitGameStatsResponse>(
      `/players/${playerId}/games/cs2/stats?offset=0&limit=${limit}`,
    )
    const stats = response.items.map(item => item.stats)
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
