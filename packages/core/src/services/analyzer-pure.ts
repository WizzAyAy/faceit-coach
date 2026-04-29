import type { MapScore, PickBanResult, PlayerAnalysis, ScoreBreakdown } from '@/types.js'
import { BAN_THRESHOLD, CONFIDENCE, CS2_MAP_POOL, PICK_THRESHOLD, SCORE_WEIGHTS, UNCERTAINTY_THRESHOLD } from '@/utils/constants.js'

export interface AnalyzeOptions {
  /** Unix seconds — only include matches after this timestamp */
  fromTimestamp?: number
  /** Cap on matches fetched per player to avoid runaway pagination */
  maxMatchesPerPlayer?: number
}

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
 * Used internally for scoring only — display should use the raw K/D.
 */
function normalizeKd(kd: number): number {
  return kd / (kd + 1)
}

export function calculateMapScores(players: PlayerAnalysis[]): Record<string, { score: number, totalMatches: number, breakdown: ScoreBreakdown }> {
  const scores: Record<string, { score: number, totalMatches: number, breakdown: ScoreBreakdown }> = {}

  // Team-level average ELO — identical for every map, kept on breakdown for consistency
  const teamEloAvg = players.length > 0
    ? players.reduce((sum, p) => sum + p.elo, 0) / players.length
    : 0

  for (const map of CS2_MAP_POOL) {
    let totalWeightedScore = 0
    let totalWeight = 0
    let totalMatches = 0

    // Raw weighted stats (intuitive values for display)
    let weightedWinrateRaw = 0
    let weightedKdRaw = 0

    for (const player of players) {
      const mapStat = player.mapStats.find(s => s.map === map)
      const rawWinrate = mapStat ? mapStat.winrate : 0.5
      const rawKd = mapStat ? mapStat.kdRatio : 1.0
      const matchCount = mapStat ? mapStat.matches : 0

      totalMatches += matchCount

      // Adjusted values used for scoring (regressed toward mean on low sample + K/D normalized to 0-1)
      const adjustedWinrate = adjustWinrateForUncertainty(rawWinrate, matchCount)
      const adjustedKdNormalized = adjustWinrateForUncertainty(normalizeKd(rawKd), matchCount)
      const eloFactor = player.weight

      const playerScore
        = adjustedWinrate * SCORE_WEIGHTS.WINRATE
          + adjustedKdNormalized * SCORE_WEIGHTS.KD
          + eloFactor * SCORE_WEIGHTS.ELO

      totalWeightedScore += playerScore * player.weight
      weightedWinrateRaw += rawWinrate * player.weight
      weightedKdRaw += rawKd * player.weight
      totalWeight += player.weight
    }

    scores[map] = {
      score: totalWeight > 0 ? totalWeightedScore / totalWeight : 0.5,
      totalMatches,
      breakdown: {
        // Raw, intuitive values for UI display
        winrate: totalWeight > 0 ? weightedWinrateRaw / totalWeight : 0.5,
        kd: totalWeight > 0 ? weightedKdRaw / totalWeight : 1.0,
        elo: teamEloAvg,
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

/**
 * Returns the Unix-seconds timestamp for N months ago from now.
 * Months are calendar-based (e.g. 6 months from 2026-04 → 2025-10-01).
 */
export function monthsAgoTimestamp(months: number): number {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return Math.floor(d.getTime() / 1000)
}
