import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeInteraction } from '@/__tests__/helpers.js'

vi.mock('@faceit-coach/core', async () => {
  const actual = await vi.importActual<typeof import('@faceit-coach/core')>('@faceit-coach/core')
  return {
    ...actual,
    faceitApi: { getMatch: vi.fn() },
    analyzeLobby: vi.fn(),
    monthsAgoTimestamp: vi.fn(() => 0),
  }
})

const core = await import('@faceit-coach/core')
const mockMatch = vi.mocked(core.faceitApi.getMatch)
const mockAnalyze = vi.mocked(core.analyzeLobby)
const { default: analyze } = await import('@/commands/analyze.js')

const emptyResult = {
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

describe('/analyze command', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should reply with error when the room does not exist', async () => {
    mockMatch.mockRejectedValueOnce(new Error('boom'))
    const i = makeInteraction({ stringOpts: { room_id: 'r1' } })
    await analyze.execute(i)
    expect(i.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }))
  })

  it('should analyze directly when team is provided', async () => {
    mockMatch.mockResolvedValueOnce({} as any)
    mockAnalyze.mockResolvedValueOnce(emptyResult)
    const i = makeInteraction({ stringOpts: { room_id: 'r1' }, intOpts: { team: 1 } })
    await analyze.execute(i)
    expect(mockAnalyze).toHaveBeenCalledWith('r1', 1, expect.any(Object))
  })

  it('should prompt with buttons and run analysis on a button click', async () => {
    mockMatch.mockResolvedValueOnce({
      teams: {
        faction1: { roster: [{ nickname: 'A' }] },
        faction2: { roster: [{ nickname: 'B' }] },
      },
    } as any)
    mockAnalyze.mockResolvedValueOnce(emptyResult)
    const i = makeInteraction({
      stringOpts: { room_id: 'r1' },
      awaitResult: { customId: 'analyze:2:r1:12' },
    })
    await analyze.execute(i)
    // First editReply: prompt; second editReply: result embed
    expect(i.editReply).toHaveBeenCalledTimes(2)
    expect(mockAnalyze).toHaveBeenCalledWith('r1', 2, expect.any(Object))
    expect(core.monthsAgoTimestamp).toHaveBeenCalledWith(12)
  })

  it('should reply with timeout when the button await rejects', async () => {
    mockMatch.mockResolvedValueOnce({
      teams: {
        faction1: { roster: [{ nickname: 'A' }] },
        faction2: { roster: [{ nickname: 'B' }] },
      },
    } as any)
    const i = makeInteraction({
      stringOpts: { room_id: 'r1' },
      awaitResult: new Error('timeout'),
    })
    await analyze.execute(i)
    expect(i.editReply).toHaveBeenCalledWith(expect.objectContaining({ components: [] }))
  })

  it('should use custom months when provided', async () => {
    mockMatch.mockResolvedValueOnce({} as any)
    mockAnalyze.mockResolvedValueOnce(emptyResult)
    const i = makeInteraction({ stringOpts: { room_id: 'r1' }, intOpts: { team: 1, months: 18 } })
    await analyze.execute(i)
    expect(core.monthsAgoTimestamp).toHaveBeenCalledWith(18)
  })
})
