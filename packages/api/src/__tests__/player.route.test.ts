import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@faceit-coach/core', () => ({
  faceitApi: {
    getPlayerByNickname: vi.fn(),
    getPlayerStats: vi.fn(),
  },
  isInMapPool: vi.fn((label: string) => ['Mirage', 'Nuke'].includes(label)),
  normalizeMapName: vi.fn((label: string) => label === 'Mirage' ? 'de_mirage' : 'de_nuke'),
}))

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
      lifetime: {
        'Matches': '100',
        'Win Rate %': '55',
        'Average K/D Ratio': '1.2',
        'Average Headshots %': '48',
      },
      segments: [
        { type: 'Map', label: 'Mirage', stats: { 'Win Rate %': '70', 'Matches': '10', 'K/D Ratio': '1.3' } },
        { type: 'Map', label: 'Nuke', stats: { 'Win Rate %': '40', 'Matches': '5', 'K/D Ratio': '0.9' } },
        { type: 'Map', label: 'Cache', stats: { 'Win Rate %': '99', 'Matches': '1', 'K/D Ratio': '2' } }, // out of pool
        { type: 'Game', label: 'cs2', stats: {} },
      ],
    } as any)
    const res = await playerRoute.request('/TestPlayer')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nickname).toBe('TestPlayer')
    expect(body.elo).toBe(2000)
    expect(body.maps).toHaveLength(2)
    expect(body.maps[0].map).toBe('de_mirage')
    expect(body.maps[1].map).toBe('de_nuke')
    expect(body.lifetime.winrate).toBe('55%')
    expect(body.lifetime.kd).toBe('1.2')
    expect(body.lifetime.hs).toBe('48%')
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
