import type { FaceitGameStatsItem, FaceitMatch, FaceitPlayer, FaceitPlayerStats } from '@/types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheBrowser } from '@/cache-browser.js'
import { analyzeLobbyBrowser, createFaceitBrowserClient } from '@/services/faceit-browser.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockPlayer(id: string, elo = 2000): FaceitPlayer {
  return {
    player_id: id,
    nickname: id,
    avatar: '',
    country: 'FR',
    games: { cs2: { faceit_elo: elo, skill_level: 8, region: 'EU' } },
  }
}

function mockGameStat(map: string, result: string, kd = '1.0'): FaceitGameStatsItem {
  return { 'Player Id': 'p1', 'Match Id': 'm1', 'Map': map, 'Result': result, 'K/D Ratio': kd, 'Headshots %': '50', 'Deaths': '20', 'Kills': '20', 'Assists': '5', 'K/R Ratio': '0.8' }
}

function mockStats(): FaceitPlayerStats {
  return {
    player_id: 'p1',
    game_id: 'cs2',
    lifetime: { 'Matches': '100', 'Win Rate %': '55', 'K/D Ratio': '1.1', 'Average K/D Ratio': '1.1', 'Longest Win Streak': '10', 'Current Win Streak': '3', 'Average Headshots %': '50', 'Total Headshots %': '50' },
    segments: [],
  }
}

describe('createFaceitBrowserClient', () => {
  beforeEach(() => {
    cacheBrowser.flush()
    mockFetch.mockReset()
  })

  it('should fetch player by nickname with Bearer auth', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) })
    const client = createFaceitBrowserClient('test-key')
    const result = await client.getPlayerByNickname('p1')
    expect(result.player_id).toBe('p1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://open.faceit.com/data/v4/players?nickname=p1&game=cs2',
      { headers: { Authorization: 'Bearer test-key' } },
    )
  })

  it('should throw friendly error on 404 nickname lookup', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, headers: { get: () => null } })
    const client = createFaceitBrowserClient('key')
    await expect(client.getPlayerByNickname('ghost')).rejects.toThrow('Player "ghost" not found on FACEIT')
  })

  it('should cache getPlayerByNickname across calls', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerByNickname('p1')
    await client.getPlayerByNickname('P1')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch player by id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p2')) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayer('p2')
    expect(mockFetch.mock.calls[0][0]).toContain('/players/p2')
  })

  it('should cache getPlayer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p3')) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayer('p3')
    await client.getPlayer('p3')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch player stats', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats()) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerStats('p1')
    expect(mockFetch.mock.calls[0][0]).toContain('/players/p1/stats/cs2')
  })

  it('should cache getPlayerStats', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats()) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerStats('p1')
    await client.getPlayerStats('p1')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch player history', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [], start: 0, end: 0, from: 0, to: 0 }) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerHistory('p1', 5)
    expect(mockFetch.mock.calls[0][0]).toContain('limit=5')
  })

  it('should cache getPlayerHistory', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [], start: 0, end: 0, from: 0, to: 0 }) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerHistory('p1', 5)
    await client.getPlayerHistory('p1', 5)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch game stats with pagination stopping on empty page', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: mockGameStat('de_mirage', '1') }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const client = createFaceitBrowserClient('key')
    const result = await client.getPlayerGameStats('p1', { from: 0, maxTotal: 300, pageSize: 1 })
    expect(result).toHaveLength(1)
  })

  it('should stop game stats pagination when maxTotal is reached', async () => {
    const twoItems = { items: [{ stats: mockGameStat('de_mirage', '1') }, { stats: mockGameStat('de_inferno', '0') }] }
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(twoItems) })
    const client = createFaceitBrowserClient('key')
    const result = await client.getPlayerGameStats('p1', { maxTotal: 2, pageSize: 2 })
    expect(result).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should handle legacy number opts for game stats', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerGameStats('p1', 50)
    expect(mockFetch.mock.calls[0][0]).toContain('limit=50')
  })

  it('should cache getPlayerGameStats', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerGameStats('p1', { from: 100, maxTotal: 10 })
    await client.getPlayerGameStats('p1', { from: 100, maxTotal: 10 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch a match', async () => {
    const match: Partial<FaceitMatch> = { match_id: 'room1', status: 'ONGOING', teams: { faction1: { roster: [], name: 'T1', faction_id: '', leader: '', avatar: '', type: '' }, faction2: { roster: [], name: 'T2', faction_id: '', leader: '', avatar: '', type: '' } }, voting: null, game: 'cs2', region: 'EU', competition_id: '', competition_name: '', competition_type: '', organizer_id: '', started_at: 0, finished_at: 0 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
    const client = createFaceitBrowserClient('key')
    const result = await client.getMatch('room1')
    expect(result.match_id).toBe('room1')
  })

  it('should cache getMatch', async () => {
    const match: Partial<FaceitMatch> = { match_id: 'room1', status: 'ONGOING', teams: { faction1: { roster: [], name: 'T1', faction_id: '', leader: '', avatar: '', type: '' }, faction2: { roster: [], name: 'T2', faction_id: '', leader: '', avatar: '', type: '' } }, voting: null, game: 'cs2', region: 'EU', competition_id: '', competition_name: '', competition_type: '', organizer_id: '', started_at: 0, finished_at: 0 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
    const client = createFaceitBrowserClient('key')
    await client.getMatch('room1')
    await client.getMatch('room1')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should retry on 429 and succeed using default retry delay when header absent', async () => {
    vi.useFakeTimers()
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null } })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) })
    const client = createFaceitBrowserClient('key')
    const promise = client.getPlayer('p1')
    await vi.runAllTimersAsync()
    expect(await promise).toMatchObject({ player_id: 'p1' })
    vi.useRealTimers()
  })

  it('should throw FaceitApiError on non-404/429 errors', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => null } })
    const client = createFaceitBrowserClient('key')
    await expect(client.getPlayer('p1')).rejects.toThrow('FACEIT API error 500')
  })

  it('should rethrow non-404 errors from getPlayerByNickname', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => null } })
    const client = createFaceitBrowserClient('key')
    await expect(client.getPlayerByNickname('p1')).rejects.toThrow('FACEIT API error 500')
  })

  it('should include to param in game stats when provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const client = createFaceitBrowserClient('key')
    await client.getPlayerGameStats('p1', { maxTotal: 10, to: 9999999 })
    expect(mockFetch.mock.calls[0][0]).toContain('to=9999999')
  })
})

describe('analyzeLobbyBrowser', () => {
  beforeEach(() => {
    cacheBrowser.flush()
    mockFetch.mockReset()
  })

  it('should return pick/ban result from two teams', async () => {
    const match: FaceitMatch = {
      match_id: 'room1',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [{ player_id: 'p1', nickname: 'p1', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [{ player_id: 'p2', nickname: 'p2', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
      },
    }

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) }) // getMatch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) }) // getPlayer p1
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p2')) }) // getPlayer p2
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: mockGameStat('de_mirage', '1') }] }) }) // gameStats p1
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: mockGameStat('de_mirage', '0') }] }) }) // gameStats p2

    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room1', 1)
    expect(result).toHaveProperty('allMaps')
    expect(result.allMaps).toHaveLength(8)
    const mirage = result.allMaps.find(m => m.map === 'de_mirage')
    expect(mirage).toBeDefined()
    expect(mirage!.advantage).toBeGreaterThan(0)
  })

  it('should handle empty rosters (returns neutral result)', async () => {
    const match: FaceitMatch = {
      match_id: 'room2',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [] },
      },
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room2', 1)
    expect(result.allMaps).toHaveLength(8)
    result.allMaps.forEach(m => expect(m.advantage).toBe(0))
  })

  it('should use teamSide 2 to flip faction assignment', async () => {
    const match: FaceitMatch = {
      match_id: 'room4',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [{ player_id: 'pa', nickname: 'pa', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [{ player_id: 'pb', nickname: 'pb', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
      },
    }
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('pb')) }) // faction2 is "our" team
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('pa')) }) // faction1 is "their" team
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: mockGameStat('de_mirage', '1') }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: mockGameStat('de_mirage', '0') }] }) })
    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room4', 2)
    const mirage = result.allMaps.find(m => m.map === 'de_mirage')
    expect(mirage).toBeDefined()
    expect(mirage!.advantage).toBeGreaterThan(0)
  })

  it('should fall back to lowercase kd_ratio and headshots_percentage fields', async () => {
    const match: FaceitMatch = {
      match_id: 'room5',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [{ player_id: 'p1', nickname: 'p1', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [] },
      },
    }
    const lowercaseStat = {
      'Player Id': 'p1',
      'Match Id': 'm1',
      'Map': '',
      'Result': '',
      'K/D Ratio': '',
      'Headshots %': '',
      'Deaths': '20',
      'Kills': '20',
      'Assists': '5',
      'K/R Ratio': '0.8',
      'map': 'de_mirage',
      'result': '1',
      'kd_ratio': '1.5',
      'headshots_percentage': '60',
    } as FaceitGameStatsItem
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: lowercaseStat }] }) })
    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room5', 1)
    expect(result.allMaps).toHaveLength(8)
  })

  it('should use elo 1000 fallback for player without cs2 games', async () => {
    const match: FaceitMatch = {
      match_id: 'room6',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [{ player_id: 'p1', nickname: 'p1', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [] },
      },
    }
    const noCs2Player = { player_id: 'p1', nickname: 'p1', avatar: '', country: 'FR', games: {} } as FaceitPlayer
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(noCs2Player) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room6', 1)
    expect(result.allMaps).toHaveLength(8)
  })

  it('should handle zero K/D and headshots (covers || 0 fallback)', async () => {
    const match: FaceitMatch = {
      match_id: 'room7',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [{ player_id: 'p1', nickname: 'p1', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [] },
      },
    }
    const zeroStat = { ...mockGameStat('de_mirage', '0', '0'), 'Headshots %': '0' }
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: zeroStat }] }) })
    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room7', 1)
    expect(result.allMaps).toHaveLength(8)
  })

  it('should skip game stats with maps not in pool', async () => {
    const match: FaceitMatch = {
      match_id: 'room3',
      status: 'ONGOING',
      game: 'cs2',
      region: 'EU',
      competition_id: '',
      competition_name: '',
      competition_type: '',
      organizer_id: '',
      started_at: 0,
      finished_at: 0,
      voting: null,
      teams: {
        faction1: { faction_id: '', leader: '', name: 'T1', avatar: '', type: '', roster: [{ player_id: 'p1', nickname: 'p1', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
        faction2: { faction_id: '', leader: '', name: 'T2', avatar: '', type: '', roster: [{ player_id: 'p2', nickname: 'p2', avatar: '', game_player_id: '', game_player_name: '', game_skill_level: 8 }] },
      },
    }
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p1')) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPlayer('p2')) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [{ stats: mockGameStat('de_unknown_map', '1') }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })

    const client = createFaceitBrowserClient('key')
    const result = await analyzeLobbyBrowser(client, 'room3', 1)
    expect(result.allMaps).toHaveLength(8)
    const allNeutral = result.allMaps.every(m => m.advantage === 0)
    expect(allNeutral).toBe(true)
  })
})
