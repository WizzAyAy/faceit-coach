import type { PickBanResult, PredictionResult, StratsResult } from '../types/index.js'
import { EmbedBuilder } from 'discord.js'
import { MAP_DISPLAY_NAMES } from './constants.js'

function mapName(map: string): string {
  return MAP_DISPLAY_NAMES[map] ?? map
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function advantageLabel(advantage: number): string {
  if (advantage >= 0.03)
    return '🟢 PICK'
  if (advantage <= -0.03)
    return '🔴 BAN'
  return '🟡 NEUTRE'
}

export function pickBanEmbed(result: PickBanResult): EmbedBuilder {
  const lines = result.allMaps.map(m =>
    `${advantageLabel(m.advantage)}  **${mapName(m.map)}** — Vous: ${pct(m.ourScore)} | Eux: ${pct(m.theirScore)} | Avantage: ${m.advantage >= 0 ? '+' : ''}${pct(m.advantage)}`,
  )

  return new EmbedBuilder()
    .setTitle('📊 Analyse Pick & Ban')
    .setDescription(lines.join('\n'))
    .setColor(0x00AE86)
    .setTimestamp()
}

export function playerEmbed(
  nickname: string,
  elo: number,
  level: number,
  winrate: string,
  kd: string,
  hs: string,
  topMaps: { map: string, winrate: string }[],
  bottomMaps: { map: string, winrate: string }[],
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`👤 ${nickname}`)
    .addFields(
      { name: 'ELO', value: String(elo), inline: true },
      { name: 'Level', value: String(level), inline: true },
      { name: 'Winrate', value: winrate, inline: true },
      { name: 'K/D', value: kd, inline: true },
      { name: 'HS%', value: hs, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      {
        name: '🟢 Meilleures maps',
        value: topMaps.map(m => `${mapName(m.map)}: ${m.winrate}`).join('\n') || 'N/A',
        inline: true,
      },
      {
        name: '🔴 Pires maps',
        value: bottomMaps.map(m => `${mapName(m.map)}: ${m.winrate}`).join('\n') || 'N/A',
        inline: true,
      },
    )
    .setColor(0x5865F2)
    .setTimestamp()
}

export function compareEmbed(
  nick1: string,
  nick2: string,
  stats1: Record<string, string>,
  stats2: Record<string, string>,
  mapComparison: { map: string, wr1: string, wr2: string, winner: string }[],
): EmbedBuilder {
  const header = `**${nick1}** vs **${nick2}**`
  const statLines = Object.keys(stats1).map(k =>
    `**${k}:** ${stats1[k]} vs ${stats2[k]}`,
  )
  const mapLines = mapComparison.map(m =>
    `**${mapName(m.map)}:** ${m.wr1} vs ${m.wr2} ${m.winner === nick1 ? '⬅️' : '➡️'}`,
  )

  return new EmbedBuilder()
    .setTitle(`⚔️ ${header}`)
    .addFields(
      { name: 'Stats globales', value: statLines.join('\n') },
      { name: 'Par map', value: mapLines.join('\n') || 'N/A' },
    )
    .setColor(0xFEE75C)
    .setTimestamp()
}

export function predictionEmbed(
  team1Name: string,
  team2Name: string,
  predictions: PredictionResult[],
): EmbedBuilder {
  const lines = predictions.map(p =>
    `**${mapName(p.map)}:** ${team1Name} ${pct(p.team1WinProbability)} — ${pct(p.team2WinProbability)} ${team2Name}`,
  )

  const topPlayers = predictions[0]?.keyPlayers.slice(0, 3)
    .map(kp => `${kp.nickname}`)
    .join(', ')

  return new EmbedBuilder()
    .setTitle('🔮 Prédiction')
    .setDescription(lines.join('\n'))
    .addFields(
      { name: 'Joueurs clés', value: topPlayers || 'N/A' },
    )
    .setColor(0xEB459E)
    .setTimestamp()
}

export function stratsEmbed(result: StratsResult): EmbedBuilder {
  const lines = result.playerBreakdown.map(p =>
    `**${p.nickname}:** CT ${Math.round(p.ctWinrate * 100)}% | T ${Math.round(p.tWinrate * 100)}%`,
  )

  return new EmbedBuilder()
    .setTitle(`🎯 Strats — ${mapName(result.map)}`)
    .setDescription(`**Côté recommandé : ${result.recommendedSide}**\n\nCT global: ${pct(result.ctWinrate)} | T global: ${pct(result.tWinrate)}`)
    .addFields(
      { name: 'Détail par joueur', value: lines.join('\n') || 'N/A' },
    )
    .setColor(0x57F287)
    .setTimestamp()
}

export function teamEmbed(
  players: { nickname: string, elo: number }[],
  strongMaps: { map: string, score: string }[],
  weakMaps: { map: string, score: string }[],
): EmbedBuilder {
  const playerList = players.map(p => `${p.nickname} (${p.elo})`).join(', ')

  return new EmbedBuilder()
    .setTitle('👥 Analyse d\'équipe')
    .setDescription(playerList)
    .addFields(
      {
        name: '🟢 Maps fortes',
        value: strongMaps.map(m => `${mapName(m.map)}: ${m.score}`).join('\n') || 'N/A',
        inline: true,
      },
      {
        name: '🔴 Maps faibles',
        value: weakMaps.map(m => `${mapName(m.map)}: ${m.score}`).join('\n') || 'N/A',
        inline: true,
      },
    )
    .setColor(0x5865F2)
    .setTimestamp()
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ Erreur')
    .setDescription(message)
    .setColor(0xED4245)
    .setTimestamp()
}
