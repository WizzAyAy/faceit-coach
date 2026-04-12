import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cache } from '../cache.js'
import { faceitApi } from '../faceit-api.js'

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
