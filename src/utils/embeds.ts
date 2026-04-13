import type { MapScore, PickBanResult } from '../types/index.js'
import { EmbedBuilder } from 'discord.js'
import { BAN_THRESHOLD, MAP_CT_BIAS, MAP_DISPLAY_NAMES, PICK_THRESHOLD } from './constants.js'

function mapName(map: string): string {
  return MAP_DISPLAY_NAMES[map] ?? map
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function strengthLabel(advantage: number): string {
  if (advantage >= PICK_THRESHOLD)
    return '🟢 PICK'
  if (advantage <= BAN_THRESHOLD)
    return '🔴 BAN'
  return '🟡 NEUTRE'
}

function confidenceIcon(confidence: MapScore['confidence']): string {
  if (confidence === 'high')
    return '📊'
  if (confidence === 'medium')
    return '📉'
  return '⚠️'
}

function sideLabel(map: string): string {
  const ctBias = MAP_CT_BIAS[map] ?? 0.5
  if (ctBias > 0.5)
    return '🛡️ CT'
  if (ctBias < 0.5)
    return '💣 T'
  return '⚖️ Neutre'
}

export function pickBanEmbed(result: PickBanResult): EmbedBuilder {
  const lines = result.allMaps.map((m) => {
    const sign = m.advantage >= 0 ? '+' : ''
    return `${strengthLabel(m.advantage)}  **${mapName(m.map)}** ${sign}${pct(m.advantage)} ${confidenceIcon(m.confidence)}\n> Vous: ${pct(m.ourScore)} | Eux: ${pct(m.theirScore)} | Côté: ${sideLabel(m.map)} | Data: ${m.ourTotalMatches}+${m.theirTotalMatches} matchs`
  })

  return new EmbedBuilder()
    .setTitle('📊 Analyse Pick & Ban')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: '📊 Fiable | 📉 Moyen | ⚠️ Peu de données · 🛡️ CT | 💣 T' })
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

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ Erreur')
    .setDescription(message)
    .setColor(0xED4245)
    .setTimestamp()
}
