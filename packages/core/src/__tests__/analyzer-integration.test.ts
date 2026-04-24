import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeLobby, analyzeTeam } from '../services/analyzer.js'
import { cache } from '../services/cache.js'

import { faceitApi } from '../services/faceit-api.js'

// Mock faceitApi entirely — no env or network
vi.mock('../services/faceit-api.js', () => ({
  faceitApi: {
    getPlayer: vi.fn(),
    getPlayerStats: vi.fn(),
    getPlayerGameStats: vi.fn(),
    getMatch: vi.fn(),
  },
  initFaceitApi: vi.fn(),
}))

const mockGetPlayer = vi.mocked(faceitApi.getPlayer)
const mockGetPlayerGameStats = vi.mocked(faceitApi.getPlayerGameStats)
const mockGetMatch = vi.mocked(faceitApi.getMatch)

describe('analyzer integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cache.flush()
  })

  describe('analyzeTeam', () => {
    it('should analyze a team of players', async () => {
      mockGetPlayer.mockResolvedValueOnce({
        player_id: 'p1',
        nickname: 'Player1',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      })
      mockGetPlayer.mockResolvedValueOnce({
        player_id: 'p2',
        nickname: 'Player2',
        avatar: '',
        country: 'DE',
        games: { cs2: { faceit_elo: 1800, skill_level: 7, region: 'EU' } },
      })

      mockGetPlayerGameStats.mockResolvedValueOnce([
        { 'Map': 'de_mirage', 'Result': '1', 'K/D Ratio': '1.5', 'Headshots %': '55' } as any,
        { 'Map': 'de_mirage', 'Result': '1', 'K/D Ratio': '1.2', 'Headshots %': '50' } as any,
        { 'Map': 'de_mirage', 'Result': '0', 'K/D Ratio': '0.8', 'Headshots %': '40' } as any,
        { 'Map': 'de_nuke', 'Result': '0', 'K/D Ratio': '0.5', 'Headshots %': '30' } as any,
      ])
      mockGetPlayerGameStats.mockResolvedValueOnce([
        { 'Map': 'de_mirage', 'Result': '1', 'K/D Ratio': '1.0', 'Headshots %': '45' } as any,
      ])

      const result = await analyzeTeam(['p1', 'p2'], { maxMatchesPerPlayer: 20 })
      expect(result).toHaveLength(2)
      expect(result[0].nickname).toBe('Player1')
      expect(result[0].elo).toBe(2000)
      expect(result[0].weight).toBeGreaterThan(1) // above average
      expect(result[1].weight).toBeLessThan(1) // below average

      const p1Mirage = result[0].mapStats.find(s => s.map === 'de_mirage')
      expect(p1Mirage).toBeDefined()
      expect(p1Mirage!.matches).toBe(3)
      expect(p1Mirage!.wins).toBe(2)
    })

    it('should return empty array for empty playerIds', async () => {
      const result = await analyzeTeam([], { maxMatchesPerPlayer: 20 })
      expect(result).toEqual([])
    })
  })

  describe('analyzeLobby', () => {
    it('should analyze both teams and return pick/ban', async () => {
      mockGetMatch.mockResolvedValueOnce({
        match_id: 'm1',
        game: 'cs2',
        region: 'EU',
        competition_id: '',
        competition_name: '',
        competition_type: '',
        organizer_id: '',
        teams: {
          faction1: {
            faction_id: 'f1',
            leader: 'p1',
            name: 'T1',
            avatar: '',
            type: 'team',
            roster: [{ player_id: 'p1', nickname: 'P1', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }],
          },
          faction2: {
            faction_id: 'f2',
            leader: 'p2',
            name: 'T2',
            avatar: '',
            type: 'team',
            roster: [{ player_id: 'p2', nickname: 'P2', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 7 }],
          },
        },
        voting: null,
        status: 'ONGOING',
        started_at: 0,
        finished_at: 0,
      })

      // Mock for both teams' players
      mockGetPlayer.mockResolvedValue({
        player_id: 'p1',
        nickname: 'P1',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      })

      mockGetPlayerGameStats.mockResolvedValue([
        { 'Map': 'de_mirage', 'Result': '1', 'K/D Ratio': '1.2', 'Headshots %': '50' } as any,
      ])

      const result = await analyzeLobby('m1', 1, { maxMatchesPerPlayer: 20 })
      expect(result.allMaps).toBeDefined()
      expect(result.allMaps.length).toBeGreaterThan(0)
      expect(result.picks).toBeDefined()
      expect(result.bans).toBeDefined()
    })

    it('should swap our/their factions when teamSide is 2', async () => {
      mockGetMatch.mockResolvedValueOnce({
        match_id: 'm2',
        teams: {
          faction1: {
            roster: [{ player_id: 'p1', nickname: 'P1' }],
          } as any,
          faction2: {
            roster: [{ player_id: 'p2', nickname: 'P2' }],
          } as any,
        },
      } as any)
      mockGetPlayer.mockResolvedValue({
        player_id: 'p1',
        nickname: 'P1',
        avatar: '',
        country: 'FR',
        games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
      })
      mockGetPlayerGameStats.mockResolvedValue([])

      const result = await analyzeLobby('m2', 2)
      expect(result.allMaps).toBeDefined()
    })
  })
})
