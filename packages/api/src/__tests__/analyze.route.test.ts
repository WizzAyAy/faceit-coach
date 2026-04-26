import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@faceit-coach/core', () => ({
  faceitApi: {
    getMatch: vi.fn(),
  },
  analyzeLobby: vi.fn(),
  monthsAgoTimestamp: vi.fn(() => 1_700_000_000),
}))

const core = await import('@faceit-coach/core')
const mockGetMatch = vi.mocked(core.faceitApi.getMatch)
const mockAnalyze = vi.mocked(core.analyzeLobby)

const { analyzeRoute } = await import('@/routes/analyze.js')

function post(body: unknown): Promise<Response> {
  return analyzeRoute.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('pOST /analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 on invalid body', async () => {
    const res = await post({ roomId: '', team: 1 })
    expect(res.status).toBe(400)
  })

  it('should return 404 when the room does not exist', async () => {
    mockGetMatch.mockRejectedValueOnce(new Error('boom'))
    const res = await post({ roomId: 'r1', team: 1 })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('r1')
  })

  it('should return PickBanResult with meta on success', async () => {
    mockGetMatch.mockResolvedValueOnce({} as any)
    mockAnalyze.mockResolvedValueOnce({
      picks: [],
      bans: [],
      neutral: [],
      allMaps: [],
    } as any)
    const res = await post({ roomId: 'r1', team: 1 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.periodMonths).toBe(6)
    expect(body.meta.maxMatchesPerPlayer).toBe(300)
    expect(mockAnalyze).toHaveBeenCalledWith('r1', 1, expect.objectContaining({ maxMatchesPerPlayer: 300 }))
  })

  it('should honor custom periodMonths', async () => {
    mockGetMatch.mockResolvedValueOnce({} as any)
    mockAnalyze.mockResolvedValueOnce({
      picks: [],
      bans: [],
      neutral: [],
      allMaps: [],
    } as any)
    const res = await post({ roomId: 'r1', team: 2, periodMonths: 12 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.periodMonths).toBe(12)
  })
})
