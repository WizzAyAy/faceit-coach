import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@faceit-coach/core', () => ({
  faceitApi: {
    getPlayerByNickname: vi.fn(),
    getPlayerHistory: vi.fn(),
    getMatch: vi.fn(),
  },
  analyzeLobby: vi.fn(),
  monthsAgoTimestamp: vi.fn(() => 1_700_000_000),
}))

const core = await import('@faceit-coach/core')
const mockGetPlayer = vi.mocked(core.faceitApi.getPlayerByNickname)
const mockGetHistory = vi.mocked(core.faceitApi.getPlayerHistory)
const mockGetMatch = vi.mocked(core.faceitApi.getMatch)
const mockAnalyze = vi.mocked(core.analyzeLobby)
const { liveRoute } = await import('@/routes/live.js')

describe('gET /live/:pseudo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 404 when the pseudo is unknown', async () => {
    mockGetPlayer.mockRejectedValueOnce(new Error('not found'))
    const res = await liveRoute.request('/Ghost')
    expect(res.status).toBe(404)
  })

  it('should return live=false with reason when no recent match', async () => {
    mockGetPlayer.mockResolvedValueOnce({ player_id: 'p1' } as any)
    mockGetHistory.mockResolvedValueOnce({ items: [] } as any)
    const res = await liveRoute.request('/Idle')
    const body = await res.json()
    expect(body).toEqual({ live: false, reason: 'no-recent-match' })
  })

  it('should return live=false with lastMatch info when the last match is finished', async () => {
    mockGetPlayer.mockResolvedValueOnce({ player_id: 'p1' } as any)
    mockGetHistory.mockResolvedValueOnce({
      items: [{ match_id: 'm1', finished_at: 111 }],
    } as any)
    mockGetMatch.mockResolvedValueOnce({ status: 'FINISHED' } as any)
    const res = await liveRoute.request('/Done')
    const body = await res.json()
    expect(body).toEqual({ live: false, lastMatch: { matchId: 'm1', finishedAt: 111 } })
  })

  it('should return live=true with analysis on team 1', async () => {
    mockGetPlayer.mockResolvedValueOnce({ player_id: 'p1' } as any)
    mockGetHistory.mockResolvedValueOnce({
      items: [{ match_id: 'm1', finished_at: 0 }],
    } as any)
    mockGetMatch.mockResolvedValueOnce({
      match_id: 'm1',
      status: 'ONGOING',
      teams: {
        faction1: { roster: [{ player_id: 'p1' }] },
        faction2: { roster: [{ player_id: 'p2' }] },
      },
    } as any)
    mockAnalyze.mockResolvedValueOnce({ picks: [], bans: [], neutral: [], allMaps: [] } as any)
    const res = await liveRoute.request('/Live1')
    const body = await res.json()
    expect(body.live).toBe(true)
    expect(body.team).toBe(1)
    expect(body.matchId).toBe('m1')
    expect(body.analysis).toBeDefined()
  })

  it('should detect team 2 when the player is only in faction2', async () => {
    mockGetPlayer.mockResolvedValueOnce({ player_id: 'p2' } as any)
    mockGetHistory.mockResolvedValueOnce({
      items: [{ match_id: 'm2', finished_at: 0 }],
    } as any)
    mockGetMatch.mockResolvedValueOnce({
      match_id: 'm2',
      status: 'READY',
      teams: {
        faction1: { roster: [{ player_id: 'p1' }] },
        faction2: { roster: [{ player_id: 'p2' }] },
      },
    } as any)
    mockAnalyze.mockResolvedValueOnce({ picks: [], bans: [], neutral: [], allMaps: [] } as any)
    const res = await liveRoute.request('/Live2')
    const body = await res.json()
    expect(body.team).toBe(2)
  })
})
