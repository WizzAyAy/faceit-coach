import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '@/types.js'
import { analyzeLobby, detectLocale, faceitApi, messages, monthsAgoTimestamp, t } from '@faceit-coach/core'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js'
import { errorEmbed, pickBanEmbed } from '@/utils/embeds.js'

const DEFAULT_PERIOD_MONTHS = 6
const MAX_MATCHES_PER_PLAYER = 300

function analyzeOptions(months: number) {
  return {
    fromTimestamp: monthsAgoTimestamp(months),
    maxMatchesPerPlayer: MAX_MATCHES_PER_PLAYER,
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription(messages.en.bot.commands.analyze.description)
    .setDescriptionLocalizations({ fr: messages.fr.bot.commands.analyze.description })
    .addStringOption(opt =>
      opt.setName('room_id')
        .setDescription(messages.en.bot.commands.analyze.optRoomId)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.analyze.optRoomId })
        .setRequired(true),
    )
    .addIntegerOption(opt =>
      opt.setName('months')
        .setDescription(messages.en.bot.commands.analyze.optMonths)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.analyze.optMonths })
        .setMinValue(1)
        .setMaxValue(24),
    )
    .addIntegerOption(opt =>
      opt.setName('team')
        .setDescription(messages.en.bot.commands.analyze.optTeam)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.analyze.optTeam })
        .addChoices(
          { name: 'Team 1', value: 1 },
          { name: 'Team 2', value: 2 },
        ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = detectLocale(interaction.locale)
    const roomId = interaction.options.getString('room_id', true)
    const months = interaction.options.getInteger('months') ?? DEFAULT_PERIOD_MONTHS
    const teamOption = interaction.options.getInteger('team') as 1 | 2 | null

    await interaction.deferReply()

    let match
    try {
      match = await faceitApi.getMatch(roomId)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed(locale, t(locale, 'common.error.roomNotFound'))] })
      return
    }

    if (teamOption) {
      const result = await analyzeLobby(roomId, teamOption, analyzeOptions(months))
      await interaction.editReply({ embeds: [pickBanEmbed(locale, result)], components: [], content: '' })
      return
    }

    const team1Names = match.teams.faction1.roster.map(p => p.nickname).join(', ')
    const team2Names = match.teams.faction2.roster.map(p => p.nickname).join(', ')

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`analyze:1:${roomId}:${months}`)
        .setLabel('Team 1')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`analyze:2:${roomId}:${months}`)
        .setLabel('Team 2')
        .setStyle(ButtonStyle.Secondary),
    )

    const reply = await interaction.editReply({
      content: t(locale, 'bot.messages.whichSide', { t1: team1Names, t2: team2Names }),
      components: [row],
    })

    try {
      const buttonInteraction = await reply.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30_000,
      })

      const [, side, matchId, monthsStr] = buttonInteraction.customId.split(':')
      await buttonInteraction.deferUpdate()

      const result = await analyzeLobby(matchId, Number(side) as 1 | 2, analyzeOptions(Number(monthsStr)))
      await interaction.editReply({ embeds: [pickBanEmbed(locale, result)], components: [], content: '' })
    }
    catch {
      await interaction.editReply({ content: t(locale, 'common.error.timeout'), components: [] })
    }
  },
} satisfies BotCommand
