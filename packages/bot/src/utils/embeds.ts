import type { Locale, MapScore, MapStrats, PickBanResult } from '@faceit-coach/core'
import {
  BAN_THRESHOLD,
  MAP_DISPLAY_NAMES,
  PICK_THRESHOLD,
  t,
} from '@faceit-coach/core'
import { EmbedBuilder } from 'discord.js'

function mapName(map: string): string {
  return MAP_DISPLAY_NAMES[map] ?? map
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function strengthLabel(locale: Locale, advantage: number): string {
  if (advantage >= PICK_THRESHOLD)
    return `🟢 ${t(locale, 'common.decision.pick')}`
  if (advantage <= BAN_THRESHOLD)
    return `🔴 ${t(locale, 'common.decision.ban')}`
  return `🟡 ${t(locale, 'common.decision.neutral')}`
}

function confidenceIcon(confidence: MapScore['confidence']): string {
  if (confidence === 'high')
    return '📊'
  if (confidence === 'medium')
    return '📉'
  return '⚠️'
}

function breakdownLine(m: MapScore): string {
  return `> WR ${pct(m.ourBreakdown.winrate)}/${pct(m.theirBreakdown.winrate)} · K/D ${m.ourBreakdown.kd.toFixed(2)}/${m.theirBreakdown.kd.toFixed(2)} · ELO ${Math.round(m.ourBreakdown.elo)}/${Math.round(m.theirBreakdown.elo)}`
}

export function pickBanEmbed(locale: Locale, result: PickBanResult): EmbedBuilder {
  const lines = result.allMaps.map((m) => {
    const sign = m.advantage >= 0 ? '+' : ''
    const head = t(locale, 'bot.embeds.pickBanLine', {
      decision: strengthLabel(locale, m.advantage),
      map: mapName(m.map),
      advantage: `${sign}${pct(m.advantage)}`,
      conf: confidenceIcon(m.confidence),
      us: pct(m.ourScore),
      them: pct(m.theirScore),
      usMatches: m.ourTotalMatches,
      themMatches: m.theirTotalMatches,
    })
    return `${head}\n${breakdownLine(m)}`
  })

  return new EmbedBuilder()
    .setTitle(t(locale, 'bot.embeds.pickBanTitle'))
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: t(locale, 'bot.embeds.pickBanFooter') })
    .setColor(0x00AE86)
    .setTimestamp()
}

export function playerEmbed(
  locale: Locale,
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
      { name: t(locale, 'bot.embeds.elo'), value: String(elo), inline: true },
      { name: t(locale, 'bot.embeds.level'), value: String(level), inline: true },
      { name: t(locale, 'bot.embeds.winrate'), value: winrate, inline: true },
      { name: t(locale, 'bot.embeds.kd'), value: kd, inline: true },
      { name: t(locale, 'bot.embeds.hs'), value: hs, inline: true },
      { name: '​', value: '​', inline: true },
      {
        name: t(locale, 'bot.embeds.topMaps'),
        value: topMaps.map(m => `${mapName(m.map)}: ${m.winrate}`).join('\n') || 'N/A',
        inline: true,
      },
      {
        name: t(locale, 'bot.embeds.bottomMaps'),
        value: bottomMaps.map(m => `${mapName(m.map)}: ${m.winrate}`).join('\n') || 'N/A',
        inline: true,
      },
    )
    .setColor(0x5865F2)
    .setTimestamp()
}

export function stratsEmbeds(locale: Locale, map: string, strats: MapStrats): EmbedBuilder[] {
  const name = MAP_DISPLAY_NAMES[map] ?? map

  const pistolEmbed = new EmbedBuilder()
    .setTitle(t(locale, 'bot.embeds.pistolRounds', { map: name }))
    .addFields(
      { name: t(locale, 'bot.embeds.ctPistol'), value: strats.pistol.ct, inline: true },
      { name: t(locale, 'bot.embeds.tPistol'), value: strats.pistol.t, inline: true },
    )
    .setColor(0xFFA500)
    .setTimestamp()

  const gunEmbed = new EmbedBuilder()
    .setTitle(t(locale, 'bot.embeds.gunRounds', { map: name }))
    .addFields(
      { name: t(locale, 'bot.embeds.ctStrats'), value: strats.gun.ct },
      { name: t(locale, 'bot.embeds.tExecutes'), value: strats.gun.t },
      { name: t(locale, 'bot.embeds.antiEco'), value: strats.gun.antiEco },
      { name: t(locale, 'bot.embeds.forceBuy'), value: strats.gun.forceBuy },
    )
    .setColor(0x00AE86)
    .setTimestamp()

  return [pistolEmbed, gunEmbed]
}

export function errorEmbed(locale: Locale, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(t(locale, 'bot.embeds.errorTitle'))
    .setDescription(message)
    .setColor(0xED4245)
    .setTimestamp()
}
