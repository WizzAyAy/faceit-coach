import type { PlayerAnalysis } from '../../types/index.js'
import { describe, expect, it, vi } from 'vitest'

import {
  adjustWinrateForUncertainty,
  calculateMapScores,
  calculatePlayerWeight,
  computePickBan,
} from '../analyzer.js'

// Mock config to avoid requiring env vars
vi.mock('../../config', () => ({
  config: {
    discordToken: 'test-token',
    discordClientId: 'test-client-id',
    faceitApiKey: 'test-api-key',
  },
}))

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
