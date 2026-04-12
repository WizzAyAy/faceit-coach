import type { MapScore, PickBanResult, PlayerAnalysis, PlayerMapStats } from '../types/index.js'
import { CS2_MAP_POOL, UNCERTAINTY_THRESHOLD } from '../utils/constants.js'
import { faceitApi } from './faceit-api.js'

export function calculatePlayerWeight(playerElo: number, averageElo: number): number {
  return playerElo / averageElo
}

export function adjustWinrateForUncertainty(winrate: number, matchCount: number): number {
  if (matchCount >= UNCERTAINTY_THRESHOLD)
    return winrate
  const confidence = matchCount / UNCERTAINTY_THRESHOLD
  return winrate * confidence + 0.5 * (1 - confidence)
}

export function calculateMapScores(players: PlayerAnalysis[]): Record<string, number> {
  const scores: Record<string, number> = {}

  for (const map of CS2_MAP_POOL) {
    let totalWeightedWinrate = 0
    let totalWeight = 0

    for (const player of players) {
      const mapStat = player.mapStats.find(s => s.map === map)
      const rawWinrate = mapStat ? mapStat.winrate : 0.5
      const matchCount = mapStat ? mapStat.matches : 0
      const adjustedWinrate = adjustWinrateForUncertainty(rawWinrate, matchCount)

      totalWeightedWinrate += adjustedWinrate * player.weight
      totalWeight += player.weight
    }

    scores[map] = totalWeight > 0 ? totalWeightedWinrate / totalWeight : 0.5
  }

  return scores
}

export function computePickBan(
  ourScores: Record<string, number>,
  theirScores: Record<string, number>,
): PickBanResult {
  const allMaps: MapScore[] = Object.keys(ourScores)
    .map(map => ({
      map,
      ourScore: ourScores[map],
      theirScore: theirScores[map],
      advantage: ourScores[map] - theirScores[map],
    }))
    .sort((a, b) => b.advantage - a.advantage)

  const pickThreshold = 0.03
  const banThreshold = -0.03

  return {
    picks: allMaps.filter(m => m.advantage >= pickThreshold),
    neutral: allMaps.filter(m => m.advantage > banThreshold && m.advantage < pickThreshold),
    bans: allMaps.filter(m => m.advantage <= banThreshold),
    allMaps,
  }
}

export async function analyzeTeam(
  playerIds: string[],
  matchCount: number,
): Promise<PlayerAnalysis[]> {
  const players = await Promise.all(
    playerIds.map(id => faceitApi.getPlayer(id)),
  )

  const elos = players.map(p => p.games.cs2?.faceit_elo ?? 1000)
  if (elos.length === 0)
    return []

  const averageElo = elos.reduce((sum, e) => sum + e, 0) / elos.length

  const allGameStats = await Promise.all(
    playerIds.map(id => faceitApi.getPlayerGameStats(id, matchCount)),
  )

  return players.map((player, i) => {
    const elo = player.games.cs2?.faceit_elo ?? 1000
    const gameStats = allGameStats[i]

    // Compute per-map stats from recent N matches
    const mapStatsMap = new Map<string, { wins: number, total: number, kdSum: number, hsSum: number }>()

    for (const game of gameStats) {
      const gameMap = game.Map || game.map
      if (!gameMap || !CS2_MAP_POOL.includes(gameMap as any))
        continue
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
      winrate: s.total > 0 ? s.wins / s.total : 0,
      kdRatio: s.total > 0 ? s.kdSum / s.total : 0,
      hsPercent: s.total > 0 ? s.hsSum / s.total : 0,
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
  matchCount: number,
): Promise<PickBanResult> {
  const match = await faceitApi.getMatch(matchId)

  const ourFaction = teamSide === 1 ? 'faction1' : 'faction2'
  const theirFaction = teamSide === 1 ? 'faction2' : 'faction1'

  const ourPlayerIds = match.teams[ourFaction].roster.map(p => p.player_id)
  const theirPlayerIds = match.teams[theirFaction].roster.map(p => p.player_id)

  const [ourAnalysis, theirAnalysis] = await Promise.all([
    analyzeTeam(ourPlayerIds, matchCount),
    analyzeTeam(theirPlayerIds, matchCount),
  ])

  const ourScores = calculateMapScores(ourAnalysis)
  const theirScores = calculateMapScores(theirAnalysis)

  return computePickBan(ourScores, theirScores)
}
