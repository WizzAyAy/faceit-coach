import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@faceit-coach/core', () => ({
  faceitApi: {
    getMatch: vi.fn(),
  },
}))

const core = await import('@faceit-coach/core')
const mockGetMatch = vi.mocked(core.faceitApi.getMatch)
const { matchRoute } = await import('../routes/match.js')

describe('gET /match/:roomId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 404 when the room does not exist', async () => {
    mockGetMatch.mockRejectedValueOnce(new Error('not found'))
    const res = await matchRoute.request('/missing')
    expect(res.status).toBe(404)
  })

  it('should return the match details with picked roster fields', async () => {
    mockGetMatch.mockResolvedValueOnce({
      match_id: 'm1',
      status: 'ONGOING',
      teams: {
        faction1: {
          name: 'Alpha',
          roster: [{ player_id: 'p1', nickname: 'A', avatar: 'a', game_skill_level: 8 }],
        },
        faction2: {
          name: 'Bravo',
          roster: [{ player_id: 'p2', nickname: 'B', avatar: 'b', game_skill_level: 7 }],
        },
      },
    } as any)
    const res = await matchRoute.request('/m1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.matchId).toBe('m1')
    expect(body.teams.faction1.name).toBe('Alpha')
    expect(body.teams.faction1.roster[0]).toEqual({
      playerId: 'p1',
      nickname: 'A',
      avatar: 'a',
      skillLevel: 8,
    })
    expect(body.teams.faction2.roster[0].nickname).toBe('B')
  })
})
