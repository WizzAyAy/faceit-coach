import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '@/lib/api-client.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('apiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should call /player with encoded pseudo and no API key header when missing', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ nickname: 'foo' }) })
    const client = new ApiClient('http://api.test')
    const result = await client.getPlayer('a b')
    expect(result).toEqual({ nickname: 'foo' })
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/player/a%20b',
      expect.objectContaining({
        headers: expect.not.objectContaining({ 'X-API-Key': expect.anything() }),
      }),
    )
  })

  it('should send X-API-Key when provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    const client = new ApiClient('http://api.test', 'secret')
    await client.getPlayer('x')
    const init = mockFetch.mock.calls[0][1]
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('secret')
  })

  it('should NOT send X-API-Key on /health', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    const client = new ApiClient('http://api.test', 'secret')
    await client.health()
    const init = mockFetch.mock.calls[0][1]
    expect((init.headers as Record<string, string>)['X-API-Key']).toBeUndefined()
  })

  it('should return false from health() when request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'boom' }) })
    expect(await new ApiClient('http://api.test').health()).toBe(false)
  })

  it('should return true from health() on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
    expect(await new ApiClient('http://api.test').health()).toBe(true)
  })

  it('should throw with server-provided error when body has { error }', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'not found' }),
    })
    await expect(new ApiClient('http://api.test').getPlayer('ghost')).rejects.toThrow('not found')
  })

  it('should throw with status when body is invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid')),
    })
    await expect(new ApiClient('http://api.test').getPlayer('x')).rejects.toThrow('API 500')
  })

  it('should call /live, /match, /strats endpoints', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const client = new ApiClient('http://api.test')
    await client.getLive('foo')
    await client.getMatch('r1')
    await client.getStrats('de_mirage')
    const urls = mockFetch.mock.calls.map(c => c[0])
    expect(urls).toContain('http://api.test/live/foo')
    expect(urls).toContain('http://api.test/match/r1')
    expect(urls).toContain('http://api.test/strats/de_mirage')
  })

  it('should POST /analyze with body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ picks: [] }) })
    const client = new ApiClient('http://api.test')
    await client.analyze('r1', 1, 6)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://api.test/analyze')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ roomId: 'r1', team: 1, periodMonths: 6 })
  })
})
