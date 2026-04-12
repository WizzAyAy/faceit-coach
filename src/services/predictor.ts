import type { PlayerAnalysis, PredictionResult } from '../types/index.js'
import { adjustWinrateForUncertainty } from './analyzer.js'

export function predictWinner(
  team1: PlayerAnalysis[],
  team2: PlayerAnalysis[],
  map: string,
): PredictionResult {
  const team1Strength = computeTeamStrength(team1, map)
  const team2Strength = computeTeamStrength(team2, map)

  const total = team1Strength.score + team2Strength.score
  const team1Prob = total > 0 ? team1Strength.score / total : 0.5
  const team2Prob = 1 - team1Prob

  const allContributions = [
    ...team1Strength.contributions.map(c => ({ ...c, team: 1 })),
    ...team2Strength.contributions.map(c => ({ ...c, team: 2 })),
  ].sort((a, b) => b.contribution - a.contribution)

  return {
    map,
    team1WinProbability: team1Prob,
    team2WinProbability: team2Prob,
    keyPlayers: allContributions.slice(0, 5).map(c => ({
      nickname: c.nickname,
      contribution: c.contribution,
    })),
  }
}

interface TeamStrength {
  score: number
  contributions: { nickname: string, contribution: number }[]
}

function computeTeamStrength(team: PlayerAnalysis[], map: string): TeamStrength {
  const contributions: { nickname: string, contribution: number }[] = []

  for (const player of team) {
    const mapStat = player.mapStats.find(s => s.map === map)
    const winrate = mapStat
      ? adjustWinrateForUncertainty(mapStat.winrate, mapStat.matches)
      : 0.5

    // Combine ELO factor and map winrate
    const eloFactor = player.elo / 2000 // Normalize around 2000
    const strength = (winrate * 0.6 + eloFactor * 0.4) * player.elo
    contributions.push({ nickname: player.nickname, contribution: strength })
  }

  const score = contributions.reduce((sum, c) => sum + c.contribution, 0)
  return { score, contributions }
}
