import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '@/types.js'
import { detectLocale, faceitApi, isInMapPool, messages, normalizeMapName, t } from '@faceit-coach/core'
import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, playerEmbed } from '@/utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription(messages.en.bot.commands.player.description)
    .setDescriptionLocalizations({ fr: messages.fr.bot.commands.player.description })
    .addStringOption(opt =>
      opt.setName('pseudo')
        .setDescription(messages.en.bot.commands.player.optPseudo)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.player.optPseudo })
        .setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = detectLocale(interaction.locale)
    const pseudo = interaction.options.getString('pseudo', true)
    await interaction.deferReply()

    let player
    try {
      player = await faceitApi.getPlayerByNickname(pseudo)
    }
    catch {
      await interaction.editReply({
        embeds: [errorEmbed(locale, t(locale, 'common.error.playerNotFound', { pseudo }))],
      })
      return
    }

    if (!player.games.cs2) {
      await interaction.editReply({
        embeds: [errorEmbed(locale, t(locale, 'common.error.noCs2Stats', { pseudo }))],
      })
      return
    }

    const stats = await faceitApi.getPlayerStats(player.player_id)
    const mapSegments = stats.segments
      .filter(s => s.type === 'Map' && isInMapPool(s.label))
      .map(s => ({
        map: normalizeMapName(s.label),
        winrate: Number(s.stats['Win Rate %']),
      }))
      .sort((a, b) => b.winrate - a.winrate)

    const topRaw = mapSegments.slice(0, 3)
    const bottomRaw = mapSegments.slice(topRaw.length).slice(-3).reverse()
    const topMaps = topRaw.map(m => ({ map: m.map, winrate: `${m.winrate}%` }))
    const bottomMaps = bottomRaw.map(m => ({ map: m.map, winrate: `${m.winrate}%` }))

    await interaction.editReply({
      embeds: [playerEmbed(
        locale,
        player.nickname,
        player.games.cs2.faceit_elo,
        player.games.cs2.skill_level,
        `${stats.lifetime['Win Rate %']}%`,
        stats.lifetime['Average K/D Ratio'] || stats.lifetime['K/D Ratio'],
        `${stats.lifetime['Average Headshots %'] || stats.lifetime['Total Headshots %']}%`,
        topMaps,
        bottomMaps,
      )],
    })
  },
} satisfies BotCommand
