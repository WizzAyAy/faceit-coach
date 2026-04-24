import type { PlayerAnalysis } from '../types.js'
import { describe, expect, it } from 'vitest'

import {
  adjustWinrateForUncertainty,
  calculateMapScores,
  calculatePlayerWeight,
  computePickBan,
} from '../services/analyzer.js'

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

    it('should return 1.0 when averageElo is 0', () => {
      expect(calculatePlayerWeight(2000, 0)).toBe(1)
    })
  })

  describe('adjustWinrateForUncertainty', () => {
    it('should not adjust with 10+ matches (threshold)', () => {
      expect(adjustWinrateForUncertainty(0.7, 10)).toBe(0.7)
      expect(adjustWinrateForUncertainty(0.7, 20)).toBe(0.7)
    })

    it('should pull toward 50% with fewer than 10 matches', () => {
      // 5 matches, 70% winrate: 0.7 * (5/10) + 0.5 * (5/10) = 0.35 + 0.25 = 0.60
      expect(adjustWinrateForUncertainty(0.7, 5)).toBeCloseTo(0.60)
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
      // Score combines winrate (50%), KD (30%), ELO (20%)
      expect(scores.de_mirage.score).toBeGreaterThan(0.5)
      expect(scores.de_mirage.totalMatches).toBe(40)
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
      // With only 2 matches (threshold=10), winrate pulls hard toward 50%
      // Score should be much lower than with full confidence
      expect(scores.de_nuke.score).toBeLessThan(0.7)
      expect(scores.de_nuke.totalMatches).toBe(2)
    })

    it('should return totalMatches for confidence assessment', () => {
      const players: PlayerAnalysis[] = [
        {
          playerId: 'p1',
          nickname: 'Player1',
          elo: 2000,
          weight: 1.0,
          mapStats: [
            { map: 'de_mirage', matches: 15, wins: 10, winrate: 0.67, kdRatio: 1.3, hsPercent: 55 },
          ],
        },
      ]

      const scores = calculateMapScores(players)
      expect(scores.de_mirage.totalMatches).toBe(15)
    })

    it('should return breakdown as raw human-readable values (not normalized)', () => {
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
      ]

      const scores = calculateMapScores(players)
      expect(scores.de_mirage.breakdown).toBeDefined()
      // Raw weighted winrate, not regressed-toward-mean
      expect(scores.de_mirage.breakdown.winrate).toBeCloseTo(0.7, 2)
      // Raw K/D ratio, NOT normalized to 0-1
      expect(scores.de_mirage.breakdown.kd).toBeCloseTo(1.2, 2)
      // Team average ELO in FACEIT points
      expect(scores.de_mirage.breakdown.elo).toBe(2000)
    })
  })

  describe('computePickBan', () => {
    const defaultBreakdown = { winrate: 0.5, kd: 1.0, elo: 2000 }

    it('should classify maps with ±8% threshold', () => {
      const ourScores = {
        de_mirage: { score: 0.65, totalMatches: 30, breakdown: defaultBreakdown },
        de_inferno: { score: 0.55, totalMatches: 20, breakdown: defaultBreakdown },
        de_anubis: { score: 0.50, totalMatches: 15, breakdown: defaultBreakdown },
        de_nuke: { score: 0.40, totalMatches: 25, breakdown: defaultBreakdown },
      }
      const theirScores = {
        de_mirage: { score: 0.45, totalMatches: 30, breakdown: defaultBreakdown },
        de_inferno: { score: 0.52, totalMatches: 20, breakdown: defaultBreakdown },
        de_anubis: { score: 0.51, totalMatches: 15, breakdown: defaultBreakdown },
        de_nuke: { score: 0.65, totalMatches: 25, breakdown: defaultBreakdown },
      }

      const result = computePickBan(ourScores, theirScores)

      // Best advantage: mirage (+20%)
      expect(result.allMaps[0].map).toBe('de_mirage')
      expect(result.allMaps[0].advantage).toBeCloseTo(0.20)
      expect(result.picks).toContainEqual(expect.objectContaining({ map: 'de_mirage' }))

      // Worst: nuke (-25%)
      expect(result.allMaps[result.allMaps.length - 1].map).toBe('de_nuke')
      expect(result.bans).toContainEqual(expect.objectContaining({ map: 'de_nuke' }))

      // inferno (+3%) should be NEUTRAL with 8% threshold
      expect(result.neutral).toContainEqual(expect.objectContaining({ map: 'de_inferno' }))
    })

    it('should include confidence level based on match count', () => {
      const ourScores = {
        de_mirage: { score: 0.60, totalMatches: 40, breakdown: defaultBreakdown },
      }
      const theirScores = {
        de_mirage: { score: 0.50, totalMatches: 35, breakdown: defaultBreakdown },
      }

      const result = computePickBan(ourScores, theirScores)
      expect(result.allMaps[0].confidence).toBe('high')
      expect(result.allMaps[0].ourTotalMatches).toBe(40)
      expect(result.allMaps[0].theirTotalMatches).toBe(35)
    })

    it('should mark low confidence for few matches', () => {
      const ourScores = {
        de_nuke: { score: 0.60, totalMatches: 5, breakdown: defaultBreakdown },
      }
      const theirScores = {
        de_nuke: { score: 0.50, totalMatches: 3, breakdown: defaultBreakdown },
      }

      const result = computePickBan(ourScores, theirScores)
      expect(result.allMaps[0].confidence).toBe('low')
    })

    it('should include breakdown in MapScore results', () => {
      const ourScores = {
        de_mirage: { score: 0.65, totalMatches: 30, breakdown: { winrate: 0.7, kd: 1.25, elo: 2100 } },
      }
      const theirScores = {
        de_mirage: { score: 0.50, totalMatches: 25, breakdown: { winrate: 0.5, kd: 1.0, elo: 1900 } },
      }

      const result = computePickBan(ourScores, theirScores)
      expect(result.allMaps[0].ourBreakdown).toEqual({ winrate: 0.7, kd: 1.25, elo: 2100 })
      expect(result.allMaps[0].theirBreakdown).toEqual({ winrate: 0.5, kd: 1.0, elo: 1900 })
    })
  })
})
