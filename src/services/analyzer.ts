import type { MapScore, PickBanResult, PlayerAnalysis, PlayerMapStats, ScoreBreakdown } from '../types/index.js'
import { BAN_THRESHOLD, CONFIDENCE, CS2_MAP_POOL, PICK_THRESHOLD, SCORE_WEIGHTS, UNCERTAINTY_THRESHOLD } from '../utils/constants.js'
import { faceitApi } from './faceit-api.js'

export function calculatePlayerWeight(playerElo: number, averageElo: number): number {
  if (averageElo === 0)
    return 1
  return playerElo / averageElo
}

export function adjustWinrateForUncertainty(winrate: number, matchCount: number): number {
  if (matchCount >= UNCERTAINTY_THRESHOLD)
    return winrate
  const confidence = matchCount / UNCERTAINTY_THRESHOLD
  return winrate * confidence + 0.5 * (1 - confidence)
}

/**
 * Normalize K/D ratio to a 0-1 scale centered around 1.0 K/D = 0.5
 * A K/D of 2.0 → ~0.67, K/D of 0.5 → ~0.33
 */
function normalizeKd(kd: number): number {
  return kd / (kd + 1)
}

export function calculateMapScores(players: PlayerAnalysis[]): Record<string, { score: number, totalMatches: number, breakdown: ScoreBreakdown }> {
  const scores: Record<string, { score: number, totalMatches: number, breakdown: ScoreBreakdown }> = {}

  for (const map of CS2_MAP_POOL) {
    let totalWeightedScore = 0
    let totalWeight = 0
    let totalMatches = 0
    let weightedWinrate = 0
    let weightedKd = 0
    let weightedElo = 0

    for (const player of players) {
      const mapStat = player.mapStats.find(s => s.map === map)
      const rawWinrate = mapStat ? mapStat.winrate : 0.5
      const matchCount = mapStat ? mapStat.matches : 0
      const kd = mapStat ? mapStat.kdRatio : 1.0

      totalMatches += matchCount

      const adjustedWinrate = adjustWinrateForUncertainty(rawWinrate, matchCount)
      const adjustedKd = adjustWinrateForUncertainty(normalizeKd(kd), matchCount)
      const eloFactor = player.weight // already normalized around 1.0

      // Combined score: winrate + K/D + ELO factor
      const playerScore = adjustedWinrate * SCORE_WEIGHTS.WINRATE
        + adjustedKd * SCORE_WEIGHTS.KD
        + eloFactor * SCORE_WEIGHTS.ELO

      totalWeightedScore += playerScore * player.weight
      weightedWinrate += adjustedWinrate * player.weight
      weightedKd += adjustedKd * player.weight
      weightedElo += eloFactor * player.weight
      totalWeight += player.weight
    }

    scores[map] = {
      score: totalWeight > 0 ? totalWeightedScore / totalWeight : 0.5,
      totalMatches,
      breakdown: {
        winrate: totalWeight > 0 ? weightedWinrate / totalWeight : 0.5,
        kd: totalWeight > 0 ? weightedKd / totalWeight : 0.5,
        elo: totalWeight > 0 ? weightedElo / totalWeight : 1.0,
      },
    }
  }

  return scores
}

function getConfidence(ourMatches: number, theirMatches: number): 'high' | 'medium' | 'low' {
  const total = ourMatches + theirMatches
  if (total >= CONFIDENCE.HIGH * 2)
    return 'high'
  if (total >= CONFIDENCE.MEDIUM * 2)
    return 'medium'
  return 'low'
}

export function computePickBan(
  ourScores: Record<string, { score: number, totalMatches: number, breakdown: ScoreBreakdown }>,
  theirScores: Record<string, { score: number, totalMatches: number, breakdown: ScoreBreakdown }>,
): PickBanResult {
  const allMaps: MapScore[] = Object.keys(ourScores)
    .map((map) => {
      const our = ourScores[map]
      const their = theirScores[map]
      return {
        map,
        ourScore: our.score,
        theirScore: their.score,
        advantage: our.score - their.score,
        confidence: getConfidence(our.totalMatches, their.totalMatches),
        ourTotalMatches: our.totalMatches,
        theirTotalMatches: their.totalMatches,
        ourBreakdown: our.breakdown,
        theirBreakdown: their.breakdown,
      }
    })
    .sort((a, b) => b.advantage - a.advantage)

  return {
    picks: allMaps.filter(m => m.advantage >= PICK_THRESHOLD),
    neutral: allMaps.filter(m => m.advantage > BAN_THRESHOLD && m.advantage < PICK_THRESHOLD),
    bans: allMaps.filter(m => m.advantage <= BAN_THRESHOLD),
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
