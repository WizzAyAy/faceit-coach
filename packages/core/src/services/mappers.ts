import type { FaceitMatch, FaceitPlayer, FaceitPlayerStats, MatchResponse, PlayerResponse } from '@/types.js'
import { isInMapPool, normalizeMapName } from '@/utils/constants.js'

export function faceitMatchToMatchResponse(match: FaceitMatch): MatchResponse {
  const mapFaction = (faction: FaceitMatch['teams']['faction1']) => ({
    name: faction.name,
    roster: faction.roster.map(p => ({
      playerId: p.player_id,
      nickname: p.nickname,
      avatar: p.avatar,
      skillLevel: p.game_skill_level,
    })),
  })
  return {
    matchId: match.match_id,
    status: match.status,
    teams: {
      faction1: mapFaction(match.teams.faction1),
      faction2: mapFaction(match.teams.faction2),
    },
  }
}

export function faceitPlayerToPlayerResponse(player: FaceitPlayer, stats: FaceitPlayerStats): PlayerResponse {
  const cs2 = player.games.cs2
  const maps = stats.segments
    .filter(s => s.type === 'Map' && s.mode === '5v5' && isInMapPool(s.label))
    .map(s => ({
      map: normalizeMapName(s.label),
      winrate: Number(s.stats['Win Rate %']),
      matches: Number(s.stats.Matches),
      kd: Number(s.stats['K/D Ratio']),
    }))
    .sort((a, b) => b.winrate - a.winrate)
  return {
    playerId: player.player_id,
    nickname: player.nickname,
    avatar: player.avatar,
    country: player.country,
    elo: cs2?.faceit_elo ?? 1000,
    level: cs2?.skill_level ?? 1,
    region: cs2?.region ?? '',
    lifetime: {
      winrate: `${stats.lifetime['Win Rate %']}%`,
      kd: stats.lifetime['Average K/D Ratio'] || stats.lifetime['K/D Ratio'],
      hs: `${stats.lifetime['Average Headshots %'] || stats.lifetime['Total Headshots %']}%`,
      matches: stats.lifetime.Matches,
    },
    maps,
  }
}
