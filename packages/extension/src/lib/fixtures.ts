import type { PickBanResult } from '@faceit-coach/core'
import type { MatchResponse } from '@/lib/api-client.js'

export const FIXTURE_ROOM_ID = '1-fixture-aaaa-bbbb-cccc-deadbeefcafe'

export const FIXTURE_MATCH: MatchResponse = {
  matchId: FIXTURE_ROOM_ID,
  status: 'VOTING',
  teams: {
    faction1: {
      name: 'team_alpha',
      roster: [
        { playerId: 'p1', nickname: 'Alpha1', avatar: '', skillLevel: 9 },
        { playerId: 'p2', nickname: 'Alpha2', avatar: '', skillLevel: 8 },
        { playerId: 'p3', nickname: 'Alpha3', avatar: '', skillLevel: 9 },
        { playerId: 'p4', nickname: 'Alpha4', avatar: '', skillLevel: 7 },
        { playerId: 'p5', nickname: 'Alpha5', avatar: '', skillLevel: 8 },
      ],
    },
    faction2: {
      name: 'team_bravo',
      roster: [
        { playerId: 'p6', nickname: 'Bravo1', avatar: '', skillLevel: 8 },
        { playerId: 'p7', nickname: 'Bravo2', avatar: '', skillLevel: 9 },
        { playerId: 'p8', nickname: 'Bravo3', avatar: '', skillLevel: 7 },
        { playerId: 'p9', nickname: 'Bravo4', avatar: '', skillLevel: 8 },
        { playerId: 'p10', nickname: 'Bravo5', avatar: '', skillLevel: 8 },
      ],
    },
  },
}

function score(
  map: string,
  advantage: number,
  ourTotal: number,
  theirTotal: number,
): import('@faceit-coach/core').MapScore {
  const ourScore = 0.5 + advantage / 2
  const theirScore = 0.5 - advantage / 2
  const conf = ourTotal >= 30 && theirTotal >= 30 ? 'high' : ourTotal >= 15 && theirTotal >= 15 ? 'medium' : 'low'
  return {
    map,
    ourScore,
    theirScore,
    advantage,
    confidence: conf,
    ourTotalMatches: ourTotal,
    theirTotalMatches: theirTotal,
    ourBreakdown: { winrate: 0.55 + advantage, kd: 1.1, elo: 2100 },
    theirBreakdown: { winrate: 0.55 - advantage, kd: 1.05, elo: 2080 },
  }
}

const FIXTURE_MAPS = [
  score('de_mirage', 0.18, 42, 33), // strong pick
  score('de_inferno', 0.11, 38, 27), // pick
  score('de_anubis', 0.04, 22, 21), // neutral
  score('de_dust2', -0.02, 18, 24), // neutral
  score('de_overpass', -0.06, 15, 20), // neutral leaning ban
  score('de_nuke', -0.12, 28, 31), // ban
  score('de_ancient', -0.16, 19, 26), // ban
] as const

export const FIXTURE_ANALYSIS: PickBanResult = {
  picks: FIXTURE_MAPS.filter(m => m.advantage >= 0.08),
  neutral: FIXTURE_MAPS.filter(m => m.advantage < 0.08 && m.advantage > -0.08),
  bans: FIXTURE_MAPS.filter(m => m.advantage <= -0.08),
  allMaps: [...FIXTURE_MAPS],
}
