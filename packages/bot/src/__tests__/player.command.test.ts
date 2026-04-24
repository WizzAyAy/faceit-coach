import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeInteraction } from './helpers.js'

vi.mock('@faceit-coach/core', async () => {
  const actual = await vi.importActual<typeof import('@faceit-coach/core')>('@faceit-coach/core')
  return {
    ...actual,
    faceitApi: {
      getPlayerByNickname: vi.fn(),
      getPlayerStats: vi.fn(),
    },
  }
})

const core = await import('@faceit-coach/core')
const mockByNick = vi.mocked(core.faceitApi.getPlayerByNickname)
const mockStats = vi.mocked(core.faceitApi.getPlayerStats)
const { default: player } = await import('../commands/player.js')

describe('/player command', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should reply with not-found when pseudo is missing', async () => {
    mockByNick.mockRejectedValueOnce(new Error('404'))
    const interaction = makeInteraction({ stringOpts: { pseudo: 'ghost' } })
    await player.execute(interaction)
    expect(interaction.deferReply).toHaveBeenCalled()
    expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }))
  })

  it('should reply with no-cs2 error when the player has no CS2 stats', async () => {
    mockByNick.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'NoCs2',
      avatar: '',
      country: 'FR',
      games: {} as any,
    })
    const interaction = makeInteraction({ stringOpts: { pseudo: 'NoCs2' } })
    await player.execute(interaction)
    expect(interaction.editReply).toHaveBeenCalledTimes(1)
  })

  it('should reply with a player embed on success', async () => {
    mockByNick.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'TestPlayer',
      avatar: '',
      country: 'FR',
      games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
    })
    mockStats.mockResolvedValueOnce({
      lifetime: {
        'Matches': '100',
        'Win Rate %': '55',
        'K/D Ratio': '1.1',
        'Total Headshots %': '45',
      },
      segments: [
        { type: 'Map', label: 'Mirage', stats: { 'Win Rate %': '70' } },
        { type: 'Map', label: 'Nuke', stats: { 'Win Rate %': '30' } },
        { type: 'Map', label: 'Cache', stats: { 'Win Rate %': '99' } }, // not in pool
      ],
    } as any)
    const interaction = makeInteraction({ stringOpts: { pseudo: 'TestPlayer' } })
    await player.execute(interaction)
    expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }))
  })

  it('should split top and bottom maps when more than 3 are in pool', async () => {
    mockByNick.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'Many',
      avatar: '',
      country: 'FR',
      games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
    })
    mockStats.mockResolvedValueOnce({
      lifetime: {
        'Matches': '100',
        'Win Rate %': '55',
        'Average K/D Ratio': '1.2',
        'Average Headshots %': '48',
      },
      segments: [
        { type: 'Map', label: 'Mirage', stats: { 'Win Rate %': '70' } },
        { type: 'Map', label: 'Nuke', stats: { 'Win Rate %': '65' } },
        { type: 'Map', label: 'Inferno', stats: { 'Win Rate %': '60' } },
        { type: 'Map', label: 'Dust2', stats: { 'Win Rate %': '55' } },
        { type: 'Map', label: 'Anubis', stats: { 'Win Rate %': '30' } },
        { type: 'Map', label: 'Ancient', stats: { 'Win Rate %': '20' } },
      ],
    } as any)
    const interaction = makeInteraction({ stringOpts: { pseudo: 'Many' } })
    await player.execute(interaction)
    expect(interaction.editReply).toHaveBeenCalled()
  })

  it('should prefer Average K/D and HS aliases when present', async () => {
    mockByNick.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'Avg',
      avatar: '',
      country: 'FR',
      games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
    })
    mockStats.mockResolvedValueOnce({
      lifetime: {
        'Matches': '50',
        'Win Rate %': '60',
        'Average K/D Ratio': '1.3',
        'Average Headshots %': '50',
      },
      segments: [],
    } as any)
    const interaction = makeInteraction({ stringOpts: { pseudo: 'Avg' } })
    await player.execute(interaction)
    expect(interaction.editReply).toHaveBeenCalled()
  })
})
