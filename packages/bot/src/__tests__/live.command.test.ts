import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeInteraction } from './helpers.js'

vi.mock('@faceit-coach/core', async () => {
  const actual = await vi.importActual<typeof import('@faceit-coach/core')>('@faceit-coach/core')
  return {
    ...actual,
    faceitApi: {
      getPlayerByNickname: vi.fn(),
      getPlayerHistory: vi.fn(),
      getMatch: vi.fn(),
    },
    analyzeLobby: vi.fn(),
    monthsAgoTimestamp: vi.fn(() => 0),
  }
})

const core = await import('@faceit-coach/core')
const mockByNick = vi.mocked(core.faceitApi.getPlayerByNickname)
const mockHistory = vi.mocked(core.faceitApi.getPlayerHistory)
const mockMatch = vi.mocked(core.faceitApi.getMatch)
const mockAnalyze = vi.mocked(core.analyzeLobby)
const { default: live } = await import('../commands/live.js')

const baseEmptyResult = {
  picks: [],
  neutral: [],
  bans: [],
  allMaps: [{
    map: 'de_mirage',
    ourScore: 0.5,
    theirScore: 0.5,
    advantage: 0,
    confidence: 'high',
    ourTotalMatches: 0,
    theirTotalMatches: 0,
    ourBreakdown: { winrate: 0.5, kd: 1, elo: 2000 },
    theirBreakdown: { winrate: 0.5, kd: 1, elo: 2000 },
  }],
} as any

describe('/live command', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should reply not-found when the player is unknown', async () => {
    mockByNick.mockRejectedValueOnce(new Error('404'))
    const i = makeInteraction({ stringOpts: { pseudo: 'ghost' } })
    await live.execute(i)
    expect(i.editReply).toHaveBeenCalledTimes(1)
  })

  it('should reply no-recent-match when history is empty', async () => {
    mockByNick.mockResolvedValueOnce({ player_id: 'p1' } as any)
    mockHistory.mockResolvedValueOnce({ items: [] } as any)
    const i = makeInteraction({ stringOpts: { pseudo: 'Idle' } })
    await live.execute(i)
    expect(i.editReply).toHaveBeenCalledTimes(1)
  })

  it('should analyze when the last match is ONGOING (team 1)', async () => {
    mockByNick.mockResolvedValueOnce({ player_id: 'p1' } as any)
    mockHistory.mockResolvedValueOnce({ items: [{ match_id: 'm1', finished_at: 0 }] } as any)
    mockMatch.mockResolvedValueOnce({
      match_id: 'm1',
      status: 'ONGOING',
      teams: {
        faction1: { roster: [{ player_id: 'p1' }] },
        faction2: { roster: [{ player_id: 'p2' }] },
      },
    } as any)
    mockAnalyze.mockResolvedValueOnce(baseEmptyResult)
    const i = makeInteraction({ stringOpts: { pseudo: 'Live1' } })
    await live.execute(i)
    expect(mockAnalyze).toHaveBeenCalledWith('m1', 1, expect.any(Object))
    expect(i.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.any(String) }))
  })

  it('should analyze as team 2 when only in faction2', async () => {
    mockByNick.mockResolvedValueOnce({ player_id: 'p2' } as any)
    mockHistory.mockResolvedValueOnce({ items: [{ match_id: 'm2', finished_at: 0 }] } as any)
    mockMatch.mockResolvedValueOnce({
      match_id: 'm2',
      status: 'READY',
      teams: {
        faction1: { roster: [{ player_id: 'p1' }] },
        faction2: { roster: [{ player_id: 'p2' }] },
      },
    } as any)
    mockAnalyze.mockResolvedValueOnce(baseEmptyResult)
    const i = makeInteraction({ stringOpts: { pseudo: 'Live2' } })
    await live.execute(i)
    expect(mockAnalyze).toHaveBeenCalledWith('m2', 2, expect.any(Object))
  })

  describe('formatTimeAgo branches', () => {
    it('should render minutes for recent matches', async () => {
      mockByNick.mockResolvedValueOnce({ player_id: 'p1' } as any)
      const finished = Math.floor((Date.now() - 10 * 60_000) / 1000)
      mockHistory.mockResolvedValueOnce({ items: [{ match_id: 'm1', finished_at: finished }] } as any)
      mockMatch.mockResolvedValueOnce({ status: 'FINISHED' } as any)
      const i = makeInteraction({ stringOpts: { pseudo: 'Idle' } })
      await live.execute(i)
      expect(i.editReply).toHaveBeenCalledTimes(1)
    })

    it('should render hours for matches < 1 day ago', async () => {
      mockByNick.mockResolvedValueOnce({ player_id: 'p1' } as any)
      const finished = Math.floor((Date.now() - 3 * 3600_000) / 1000)
      mockHistory.mockResolvedValueOnce({ items: [{ match_id: 'm1', finished_at: finished }] } as any)
      mockMatch.mockResolvedValueOnce({ status: 'FINISHED' } as any)
      const i = makeInteraction({ stringOpts: { pseudo: 'Idle' } })
      await live.execute(i)
      expect(i.editReply).toHaveBeenCalledTimes(1)
    })

    it('should render days for older matches', async () => {
      mockByNick.mockResolvedValueOnce({ player_id: 'p1' } as any)
      const finished = Math.floor((Date.now() - 3 * 86400_000) / 1000)
      mockHistory.mockResolvedValueOnce({ items: [{ match_id: 'm1', finished_at: finished }] } as any)
      mockMatch.mockResolvedValueOnce({ status: 'FINISHED' } as any)
      const i = makeInteraction({ stringOpts: { pseudo: 'Idle' } })
      await live.execute(i)
      expect(i.editReply).toHaveBeenCalledTimes(1)
    })
  })

  it('should respect custom months option', async () => {
    mockByNick.mockResolvedValueOnce({ player_id: 'p1' } as any)
    mockHistory.mockResolvedValueOnce({ items: [{ match_id: 'm1', finished_at: 0 }] } as any)
    mockMatch.mockResolvedValueOnce({
      match_id: 'm1',
      status: 'ONGOING',
      teams: {
        faction1: { roster: [{ player_id: 'p1' }] },
        faction2: { roster: [] },
      },
    } as any)
    mockAnalyze.mockResolvedValueOnce(baseEmptyResult)
    const i = makeInteraction({ stringOpts: { pseudo: 'p1' }, intOpts: { months: 12 } })
    await live.execute(i)
    expect(core.monthsAgoTimestamp).toHaveBeenCalledWith(12)
  })
})
