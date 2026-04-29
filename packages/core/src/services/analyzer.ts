import type { PlayerMapStats } from '@/types.js'
import {
  calculateMapScores,
  calculatePlayerWeight,
  computePickBan,
} from '@/services/analyzer-pure.js'
import { faceitApi } from '@/services/faceit-api.js'
import { isInMapPool, normalizeMapName } from '@/utils/constants.js'

export {
  adjustWinrateForUncertainty,
  calculateMapScores,
  calculatePlayerWeight,
  computePickBan,
  monthsAgoTimestamp,
} from '@/services/analyzer-pure.js'
export type { AnalyzeOptions } from '@/services/analyzer-pure.js'

export async function analyzeTeam(
  playerIds: string[],
  options: import('@/services/analyzer-pure.js').AnalyzeOptions = {},
): Promise<import('@/types.js').PlayerAnalysis[]> {
  const { fromTimestamp, maxMatchesPerPlayer = 300 } = options

  const players = await Promise.all(
    playerIds.map(id => faceitApi.getPlayer(id)),
  )

  const elos = players.map(p => p.games.cs2?.faceit_elo ?? 1000)
  if (elos.length === 0)
    return []

  const averageElo = elos.reduce((sum, e) => sum + e, 0) / elos.length

  const allGameStats = await Promise.all(
    playerIds.map(id => faceitApi.getPlayerGameStats(id, {
      from: fromTimestamp,
      maxTotal: maxMatchesPerPlayer,
    })),
  )

  return players.map((player, i) => {
    const elo = player.games.cs2?.faceit_elo ?? 1000
    const gameStats = allGameStats[i]

    const mapStatsMap = new Map<string, { wins: number, total: number, kdSum: number, hsSum: number }>()

    for (const game of gameStats) {
      const rawMap = game.Map || game.map
      // FACEIT occasionally returns display names ("Mirage") in game stats too — normalize to tech id
      if (!rawMap || !isInMapPool(rawMap))
        continue
      const gameMap = normalizeMapName(rawMap)
      const entry = mapStatsMap.get(gameMap) ?? { wins: 0, total: 0, kdSum: 0, hsSum: 0 }
      entry.total++
      const result = game.Result || game.result
      if (result === '1')
        entry.wins++
      entry.kdSum += Number(game['K/D Ratio'] || game.kd_ratio) || 0
      entry.hsSum += Number(game['Headshots %'] || game.headshots_percentage) || 0
      mapStatsMap.set(gameMap, entry)
    }

    const mapStats: PlayerMapStats[] = Array.from(mapStatsMap.entries()).map(([map, s]) => ({
      map,
      matches: s.total,
      wins: s.wins,
      winrate: s.wins / s.total,
      kdRatio: s.kdSum / s.total,
      hsPercent: s.hsSum / s.total,
    }))

    return {
      playerId: player.player_id,
      nickname: player.nickname,
      elo,
      weight: calculatePlayerWeight(elo, averageElo),
      mapStats,
    }
  })
}

export async function analyzeLobby(
  matchId: string,
  teamSide: 1 | 2,
  options: import('@/services/analyzer-pure.js').AnalyzeOptions = {},
): Promise<import('@/types.js').PickBanResult> {
  const match = await faceitApi.getMatch(matchId)

  const ourFaction = teamSide === 1 ? 'faction1' : 'faction2'
  const theirFaction = teamSide === 1 ? 'faction2' : 'faction1'

  const ourPlayerIds = match.teams[ourFaction].roster.map(p => p.player_id)
  const theirPlayerIds = match.teams[theirFaction].roster.map(p => p.player_id)

  const [ourAnalysis, theirAnalysis] = await Promise.all([
    analyzeTeam(ourPlayerIds, options),
    analyzeTeam(theirPlayerIds, options),
  ])

  const ourScores = calculateMapScores(ourAnalysis)
  const theirScores = calculateMapScores(theirAnalysis)

  return computePickBan(ourScores, theirScores)
}
