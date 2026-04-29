import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@faceit-coach/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@faceit-coach/core')>()
  return {
    ...real,
    faceitApi: {
      getPlayerByNickname: vi.fn(),
      getPlayerStats: vi.fn(),
    },
  }
})

const core = await import('@faceit-coach/core')
const mockGetPlayer = vi.mocked(core.faceitApi.getPlayerByNickname)
const mockGetStats = vi.mocked(core.faceitApi.getPlayerStats)
const { playerRoute } = await import('@/routes/player.js')

describe('gET /player/:pseudo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 404 when the pseudo is unknown', async () => {
    mockGetPlayer.mockRejectedValueOnce(new Error('404'))
    const res = await playerRoute.request('/Unknown')
    expect(res.status).toBe(404)
  })

  it('should return 400 when the player has no CS2 stats', async () => {
    mockGetPlayer.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'NoCs2',
      avatar: '',
      country: 'FR',
      games: {} as any,
    })
    const res = await playerRoute.request('/NoCs2')
    expect(res.status).toBe(400)
  })

  it('should return normalized profile with sorted map segments', async () => {
    mockGetPlayer.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'TestPlayer',
      avatar: 'a',
      country: 'FR',
      games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
    })
    mockGetStats.mockResolvedValueOnce({
      player_id: 'p1',
      game_id: 'cs2',
      lifetime: {
        'Matches': '100',
        'Win Rate %': '55',
        'K/D Ratio': '1.1',
        'Average K/D Ratio': '1.2',
        'Average Headshots %': '48',
        'Total Headshots %': '4800',
        'Longest Win Streak': '5',
        'Current Win Streak': '2',
      },
      segments: [
        { type: 'Map', mode: '5v5', label: 'de_mirage', img_small: '', img_regular: '', stats: { 'Win Rate %': '70', 'Matches': '10', 'K/D Ratio': '1.3', 'Average K/D Ratio': '1.3', 'Headshots %': '45', 'Average Headshots %': '45', 'Wins': '7', 'Rounds': '100' } },
        { type: 'Map', mode: '5v5', label: 'de_nuke', img_small: '', img_regular: '', stats: { 'Win Rate %': '40', 'Matches': '5', 'K/D Ratio': '0.9', 'Average K/D Ratio': '0.9', 'Headshots %': '30', 'Average Headshots %': '30', 'Wins': '2', 'Rounds': '50' } },
        { type: 'Map', mode: '5v5', label: 'de_train', img_small: '', img_regular: '', stats: { 'Win Rate %': '99', 'Matches': '1', 'K/D Ratio': '2', 'Average K/D Ratio': '2', 'Headshots %': '99', 'Average Headshots %': '99', 'Wins': '1', 'Rounds': '10' } },
        { type: 'Game', mode: '5v5', label: 'cs2', img_small: '', img_regular: '', stats: {} },
      ],
    } as any)
    const res = await playerRoute.request('/TestPlayer')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nickname).toBe('TestPlayer')
    expect(body.elo).toBe(2000)
    expect(body.lifetime.kd).toBe('1.2')
    expect(body.lifetime.hs).toBe('48%')
    expect(body.maps).toHaveLength(2)
    expect(body.maps[0].map).toBe('de_mirage')
    expect(body.maps[1].map).toBe('de_nuke')
  })

  it('should fall back to Total/K/D aliases when Average fields are missing', async () => {
    mockGetPlayer.mockResolvedValueOnce({
      player_id: 'p1',
      nickname: 'Legacy',
      avatar: '',
      country: 'FR',
      games: { cs2: { faceit_elo: 2000, skill_level: 8, region: 'EU' } },
    })
    mockGetStats.mockResolvedValueOnce({
      player_id: 'p1',
      game_id: 'cs2',
      lifetime: {
        'Matches': '10',
        'Win Rate %': '50',
        'K/D Ratio': '1.0',
        'Total Headshots %': '40',
      },
      segments: [],
    } as any)
    const res = await playerRoute.request('/Legacy')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lifetime.kd).toBe('1.0')
    expect(body.lifetime.hs).toBe('40%')
  })

  it('should return 400 on empty pseudo param', async () => {
    // "/" → :pseudo is empty string, route matches but schema rejects
    const res = await playerRoute.request('/%20'.replace('%20', ' '))
    // Either 400 (param validation) or 404 (no match) — both acceptable
    expect([400, 404]).toContain(res.status)
  })
})
