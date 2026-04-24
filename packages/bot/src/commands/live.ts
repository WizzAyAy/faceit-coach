import type { Locale } from '@faceit-coach/core'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types.js'
import { analyzeLobby, detectLocale, faceitApi, messages, monthsAgoTimestamp, t } from '@faceit-coach/core'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { errorEmbed, pickBanEmbed } from '../utils/embeds.js'

const DEFAULT_PERIOD_MONTHS = 6
const MAX_MATCHES_PER_PLAYER = 300

export default {
  data: new SlashCommandBuilder()
    .setName('live')
    .setDescription(messages.en.bot.commands.live.description)
    .setDescriptionLocalizations({ fr: messages.fr.bot.commands.live.description })
    .addStringOption(opt =>
      opt.setName('pseudo')
        .setDescription(messages.en.bot.commands.live.optPseudo)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.live.optPseudo })
        .setRequired(true),
    )
    .addIntegerOption(opt =>
      opt.setName('months')
        .setDescription(messages.en.bot.commands.analyze.optMonths)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.analyze.optMonths })
        .setMinValue(1)
        .setMaxValue(24),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = detectLocale(interaction.locale)
    const pseudo = interaction.options.getString('pseudo', true)
    const months = interaction.options.getInteger('months') ?? DEFAULT_PERIOD_MONTHS
    await interaction.deferReply()

    let player
    try {
      player = await faceitApi.getPlayerByNickname(pseudo)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed(locale, t(locale, 'common.error.playerNotFound', { pseudo }))] })
      return
    }

    const history = await faceitApi.getPlayerHistory(player.player_id, 1)
    if (!history.items.length) {
      await interaction.editReply({ embeds: [errorEmbed(locale, t(locale, 'common.error.noRecentMatch', { pseudo }))] })
      return
    }

    const lastMatch = history.items[0]
    const match = await faceitApi.getMatch(lastMatch.match_id)

    if (match.status === 'ONGOING' || match.status === 'READY') {
      const isTeam1 = match.teams.faction1.roster.some(p => p.player_id === player.player_id)
      const teamSide: 1 | 2 = isTeam1 ? 1 : 2

      await interaction.editReply({ content: t(locale, 'bot.messages.inMatchLoading', { pseudo }) })

      const result = await analyzeLobby(match.match_id, teamSide, {
        fromTimestamp: monthsAgoTimestamp(months),
        maxMatchesPerPlayer: MAX_MATCHES_PER_PLAYER,
      })
      await interaction.editReply({
        content: t(locale, 'bot.messages.inMatch', { pseudo }),
        embeds: [pickBanEmbed(locale, result)],
      })
    }
    else {
      const date = new Date(lastMatch.finished_at * 1000)
      const timeAgo = formatTimeAgo(locale, date)

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.messages.notInMatchTitle', { pseudo }))
        .setDescription(t(locale, 'bot.messages.lastMatchLabel', { timeAgo }))
        .setColor(0x99AAB5)
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    }
  },
} satisfies BotCommand

function formatTimeAgo(locale: Locale, date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60)
    return t(locale, 'bot.messages.timeAgoMin', { n: diffMin })
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)
    return t(locale, 'bot.messages.timeAgoH', { n: diffH })
  const diffD = Math.floor(diffH / 24)
  return t(locale, 'bot.messages.timeAgoD', { n: diffD })
}
