import type { FaceitMatch, FaceitPlayer, FaceitPlayerStats } from '@/types.js'
// packages/core/src/__tests__/mappers.test.ts
import { describe, expect, it } from 'vitest'
import { faceitMatchToMatchResponse, faceitPlayerToPlayerResponse } from '@/services/mappers.js'

const FULL_MATCH: FaceitMatch = {
  match_id: 'room-123',
  status: 'ONGOING',
  game: 'cs2',
  region: 'EU',
  competition_id: 'c1',
  competition_name: 'FPL',
  competition_type: 'championship',
  organizer_id: 'o1',
  teams: {
    faction1: {
      faction_id: 'f1',
      leader: 'p1',
      name: 'Alpha',
      avatar: '',
      type: 'team',
      roster: [{
        player_id: 'p1',
        nickname: 'PlayerA',
        avatar: 'https://a/img',
        game_player_id: 'g1',
        game_player_name: 'PlayerA',
        game_skill_level: 8,
      }],
    },
    faction2: {
      faction_id: 'f2',
      leader: 'p2',
      name: 'Bravo',
      avatar: '',
      type: 'team',
      roster: [{
        player_id: 'p2',
        nickname: 'PlayerB',
        avatar: '',
        game_player_id: 'g2',
        game_player_name: 'PlayerB',
        game_skill_level: 7,
      }],
    },
  },
  voting: null,
  started_at: 0,
  finished_at: 0,
}

const PLAYER_WITH_CS2: FaceitPlayer = {
  player_id: 'p1',
  nickname: 'Foo',
  avatar: 'https://a/avatar',
  country: 'fr',
  games: { cs2: { faceit_elo: 2500, skill_level: 10, region: 'EU' } },
}

const PLAYER_NO_CS2: FaceitPlayer = {
  player_id: 'p2',
  nickname: 'Bar',
  avatar: '',
  country: 'fr',
  games: {},
}

const STATS: FaceitPlayerStats = {
  player_id: 'p1',
  game_id: 'cs2',
  lifetime: {
    'Matches': '100',
    'Win Rate %': '55',
    'K/D Ratio': '1.1',
    'Average K/D Ratio': '1.21',
    'Average Headshots %': '48',
    'Total Headshots %': '4800',
    'Longest Win Streak': '5',
    'Current Win Streak': '2',
  },
  segments: [
    {
      label: 'de_mirage',
      img_small: '',
      img_regular: '',
      mode: '5v5',
      type: 'Map',
      stats: {
        'Matches': '30',
        'Win Rate %': '70',
        'K/D Ratio': '1.3',
        'Average K/D Ratio': '1.3',
        'Headshots %': '45',
        'Average Headshots %': '45',
        'Wins': '21',
        'Rounds': '300',
      },
    },
    {
      label: 'de_nuke',
      img_small: '',
      img_regular: '',
      mode: '5v5',
      type: 'Map',
      stats: {
        'Matches': '10',
        'Win Rate %': '40',
        'K/D Ratio': '0.9',
        'Average K/D Ratio': '0.9',
        'Headshots %': '30',
        'Average Headshots %': '30',
        'Wins': '4',
        'Rounds': '100',
      },
    },
    {
      label: 'de_train',
      img_small: '',
      img_regular: '',
      mode: '5v5',
      type: 'Map',
      stats: {
        'Matches': '5',
        'Win Rate %': '99',
        'K/D Ratio': '2.0',
        'Average K/D Ratio': '2.0',
        'Headshots %': '99',
        'Average Headshots %': '99',
        'Wins': '5',
        'Rounds': '50',
      },
    },
  ],
}

describe('faceitMatchToMatchResponse', () => {
  it('maps match_id → matchId and normalizes roster shape', () => {
    const result = faceitMatchToMatchResponse(FULL_MATCH)
    expect(result.matchId).toBe('room-123')
    expect(result.status).toBe('ONGOING')
    expect(result.teams.faction1.name).toBe('Alpha')
    expect(result.teams.faction1.roster[0]).toEqual({
      playerId: 'p1',
      nickname: 'PlayerA',
      avatar: 'https://a/img',
      skillLevel: 8,
    })
    expect(result.teams.faction2.roster[0].nickname).toBe('PlayerB')
  })
})

describe('faceitPlayerToPlayerResponse', () => {
  it('merges player + stats into normalized shape with correct lifetime', () => {
    const result = faceitPlayerToPlayerResponse(PLAYER_WITH_CS2, STATS)
    expect(result.playerId).toBe('p1')
    expect(result.nickname).toBe('Foo')
    expect(result.avatar).toBe('https://a/avatar')
    expect(result.elo).toBe(2500)
    expect(result.level).toBe(10)
    expect(result.region).toBe('EU')
    expect(result.lifetime.winrate).toBe('55%')
    expect(result.lifetime.kd).toBe('1.21')
    expect(result.lifetime.hs).toBe('48%')
    expect(result.lifetime.matches).toBe('100')
  })

  it('filters out maps not in pool and sorts by winrate desc', () => {
    const result = faceitPlayerToPlayerResponse(PLAYER_WITH_CS2, STATS)
    expect(result.maps).toHaveLength(2)
    expect(result.maps[0].map).toBe('de_mirage')
    expect(result.maps[1].map).toBe('de_nuke')
    expect(result.maps[0].winrate).toBe(70)
    expect(result.maps[0].matches).toBe(30)
    expect(result.maps[0].kd).toBe(1.3)
  })

  it('defaults elo=1000, level=1, region="" when cs2 game is missing', () => {
    const result = faceitPlayerToPlayerResponse(PLAYER_NO_CS2, STATS)
    expect(result.elo).toBe(1000)
    expect(result.level).toBe(1)
    expect(result.region).toBe('')
  })
})
