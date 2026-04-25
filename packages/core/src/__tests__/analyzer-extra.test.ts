import type { PlayerAnalysis } from '../types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeTeam, calculateMapScores, computePickBan, monthsAgoTimestamp } from '../services/analyzer.js'
import { cache } from '../services/cache.js'
import { faceitApi } from '../services/faceit-api.js'

vi.mock('../services/faceit-api.js', () => ({
  faceitApi: {
    getPlayer: vi.fn(),
    getPlayerGameStats: vi.fn(),
    getMatch: vi.fn(),
  },
  initFaceitApi: vi.fn(),
}))

const mockGetPlayer = vi.mocked(faceitApi.getPlayer)
const mockGetPlayerGameStats = vi.mocked(faceitApi.getPlayerGameStats)

describe('analyzer extra branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cache.flush()
  })

  describe('calculateMapScores', () => {
    it('should handle empty players list with neutral defaults', () => {
      const scores = calculateMapScores([])
      // every map present, neutral 0.5 score, elo = 0
      expect(scores.de_mirage.score).toBe(0.5)
      expect(scores.de_mirage.totalMatches).toBe(0)
      expect(scores.de_mirage.breakdown.winrate).toBe(0.5)
      expect(scores.de_mirage.breakdown.kd).toBe(1.0)
      expect(scores.de_mirage.breakdown.elo).toBe(0)
    })

    it('should apply lowercase branch for missing map stat', () => {
      const players: PlayerAnalysis[] = [{
        playerId: 'p1',
        nickname: 'A',
        elo: 2000,
        weight: 1,
        mapStats: [], // no stats for any map — forces defaults
      }]
      const scores = calculateMapScores(players)
      expect(scores.de_nuke.breakdown.winrate).toBe(0.5)
      expect(scores.de_nuke.breakdown.kd).toBe(1.0)
    })
  })

  describe('computePickBan confidence medium branch', () => {
    const defaultBreakdown = { winrate: 0.5, kd: 1.0, elo: 2000 }
    it('should return medium confidence for 30-59 combined matches', () => {
      const ourScores = { de_mirage: { score: 0.55, totalMatches: 18, breakdown: defaultBreakdown } }
      const theirScores = { de_mirage: { score: 0.5, totalMatches: 15, breakdown: defaultBreakdown } }
      const result = computePickBan(ourScores, theirScores)
      expect(result.allMaps[0].confidence).toBe('medium')
    })
  })

  describe('analyzeTeam edge cases', () => {
    it('should default missing elo to 1000', async () => {
      mockGetPlayer.mockResolvedValueOnce({
        player_id: 'p1',
        nickname: 'NoCs2',
        avatar: '',
        country: 'FR',
        games: {} as any,
      })
      mockGetPlayerGameStats.mockResolvedValueOnce([])
      const result = await analyzeTeam(['p1'], { maxMatchesPerPlayer: 10 })
      expect(result[0].elo).toBe(1000)
    })

    it('should skip games with missing or out-of-pool maps and use lowercase fallbacks', async () => {
      mockGetPlayer.mockResolvedValueOnce({
        player_id: 'p1',
        nickname: 'A',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      })
      mockGetPlayerGameStats.mockResolvedValueOnce([
        { map: 'de_mirage', result: '1', kd_ratio: '1.5', headshots_percentage: '50' } as any,
        { map: 'de_train', result: '1', kd_ratio: '1.5', headshots_percentage: '50' } as any, // out of pool
        { result: '1' } as any, // no map field at all
      ])
      const result = await analyzeTeam(['p1'])
      const mirage = result[0].mapStats.find(m => m.map === 'de_mirage')
      expect(mirage).toBeDefined()
      expect(mirage!.matches).toBe(1)
      expect(result[0].mapStats.find(m => m.map === 'de_train')).toBeUndefined()
    })

    it('should count a loss (result !== 1)', async () => {
      mockGetPlayer.mockResolvedValueOnce({
        player_id: 'p1',
        nickname: 'A',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      })
      mockGetPlayerGameStats.mockResolvedValueOnce([
        { 'Map': 'de_mirage', 'Result': '0', 'K/D Ratio': '0.8', 'Headshots %': '40' } as any,
      ])
      const result = await analyzeTeam(['p1'])
      const mirage = result[0].mapStats.find(m => m.map === 'de_mirage')
      expect(mirage!.wins).toBe(0)
      expect(mirage!.matches).toBe(1)
    })

    it('should handle missing K/D and HS values (falsy fallback to 0)', async () => {
      mockGetPlayer.mockResolvedValueOnce({
        player_id: 'p1',
        nickname: 'A',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      })
      mockGetPlayerGameStats.mockResolvedValueOnce([
        { Map: 'de_mirage', Result: '1' } as any,
      ])
      const result = await analyzeTeam(['p1'])
      const mirage = result[0].mapStats.find(m => m.map === 'de_mirage')
      expect(mirage!.kdRatio).toBe(0)
      expect(mirage!.hsPercent).toBe(0)
    })
  })

  describe('monthsAgoTimestamp', () => {
    it('should return a positive unix-seconds timestamp', () => {
      const ts = monthsAgoTimestamp(6)
      expect(ts).toBeGreaterThan(0)
      expect(ts).toBeLessThan(Math.floor(Date.now() / 1000))
    })

    it('should roughly match N months back', () => {
      const now = Math.floor(Date.now() / 1000)
      const twelveMonthsAgo = monthsAgoTimestamp(12)
      // ~365 days
      const delta = now - twelveMonthsAgo
      expect(delta).toBeGreaterThan(330 * 86400)
      expect(delta).toBeLessThan(400 * 86400)
    })
  })
})
