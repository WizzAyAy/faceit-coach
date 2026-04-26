import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cache } from '@/services/cache.js'
import { faceitApi, FaceitApiError, initFaceitApi } from '@/services/faceit-api.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('faceitApi extra coverage', () => {
  beforeAll(() => {
    initFaceitApi('test-api-key')
  })

  beforeEach(() => {
    cache.flush()
    mockFetch.mockReset()
  })

  afterEach(() => {
    cache.flush()
  })

  describe('getPlayerByNickname', () => {
    it('should cache successive calls', async () => {
      const mockPlayer = { player_id: 'p1', nickname: 'A' }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer) })
      await faceitApi.getPlayerByNickname('A')
      const second = await faceitApi.getPlayerByNickname('A')
      expect(second).toEqual(mockPlayer)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should rethrow non-404 errors as-is', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(faceitApi.getPlayerByNickname('A')).rejects.toBeInstanceOf(FaceitApiError)
    })
  })

  describe('getPlayer', () => {
    it('should fetch and cache a player by id', async () => {
      const mockPlayer = { player_id: 'p1', nickname: 'A' }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer) })
      const first = await faceitApi.getPlayer('p1')
      const second = await faceitApi.getPlayer('p1')
      expect(first).toEqual(mockPlayer)
      expect(second).toEqual(mockPlayer)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getPlayerHistory', () => {
    it('should fetch and cache history', async () => {
      const mockHistory = { items: [{ match_id: 'm1', finished_at: 0 }] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockHistory) })
      const first = await faceitApi.getPlayerHistory('p1', 5)
      const second = await faceitApi.getPlayerHistory('p1', 5)
      expect(first).toEqual(mockHistory)
      expect(second).toEqual(mockHistory)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getPlayerGameStats', () => {
    it('should accept a numeric limit (legacy)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ stats: { Map: 'de_mirage' } }] }),
      })
      const result = await faceitApi.getPlayerGameStats('p1', 50)
      expect(result).toEqual([{ Map: 'de_mirage' }])
      // maxTotal === pageSize === 50 — exits because items.length < pageSize
    })

    it('should paginate until maxTotal reached', async () => {
      mockFetch.mockImplementation((url: string) => {
        const requested = Number(new URL(url).searchParams.get('limit'))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: Array.from({ length: requested }, () => ({ stats: { Map: 'de_mirage' } })),
          }),
        })
      })
      const result = await faceitApi.getPlayerGameStats('p1', { maxTotal: 250, pageSize: 100 })
      expect(result).toHaveLength(250)
      // 3 fetches: 100 + 100 + 50
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should stop when an empty page is returned', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [{ stats: { Map: 'de_mirage' } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        })
      const result = await faceitApi.getPlayerGameStats('p1', { maxTotal: 500, pageSize: 1 })
      expect(result).toHaveLength(1)
    })

    it('should include `from` and `to` filters in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
      await faceitApi.getPlayerGameStats('p1', { from: 1000, to: 2000, maxTotal: 10, pageSize: 10 })
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('from=1000')
      expect(url).toContain('to=2000')
    })

    it('should cache by (from, to, maxTotal) tuple', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
      await faceitApi.getPlayerGameStats('p1', { from: 1000, maxTotal: 10, pageSize: 10 })
      await faceitApi.getPlayerGameStats('p1', { from: 1000, maxTotal: 10, pageSize: 10 })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMatch caching', () => {
    it('should cache match details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ match_id: 'm1' }),
      })
      await faceitApi.getMatch('m1')
      await faceitApi.getMatch('m1')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('429 retry-after fallback', () => {
    it('should use 2s default when header is missing', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        })
      vi.useFakeTimers()
      const promise = faceitApi.getMatch('m2')
      await vi.advanceTimersByTimeAsync(2000)
      await promise
      vi.useRealTimers()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('init guard', () => {
    it('should throw when api is used before init', async () => {
      // Simulate an uninitialized state by clearing module state
      vi.resetModules()
      const mod = await import('@/services/faceit-api.js')
      // note: core module-state is shared — re-init immediately to not break other tests
      await expect(mod.faceitApi.getPlayer('x')).rejects.toThrow(/not initialized/)
      mod.initFaceitApi('test-api-key')
    })
  })

  describe('faceitApiError', () => {
    it('should expose status and url', () => {
      const err = new FaceitApiError(404, 'https://example.test/x')
      expect(err.status).toBe(404)
      expect(err.url).toBe('https://example.test/x')
      expect(err.name).toBe('FaceitApiError')
      expect(err.message).toContain('404')
    })
  })
})
