import type { PlayerAnalysis } from '../../types/index.js'
import { describe, expect, it, vi } from 'vitest'

import { predictWinner } from '../predictor.js'

// Mock config to avoid requiring env vars
vi.mock('../../config', () => ({
  config: {
    discordToken: 'test-token',
    discordClientId: 'test-client-id',
    faceitApiKey: 'test-api-key',
  },
}))

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
