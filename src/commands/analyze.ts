import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { analyzeLobby } from '../services/analyzer'
import { faceitApi } from '../services/faceit-api'
import { errorEmbed, pickBanEmbed } from '../utils/embeds'
import { DEFAULT_MATCH_COUNT } from '../utils/constants'

export default {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Analyse un lobby FACEIT et recommande les picks/bans')
    .addStringOption(opt =>
      opt.setName('room_id').setDescription('ID de la room FACEIT').setRequired(true),
    )
    .addIntegerOption(opt =>
      opt.setName('matches').setDescription('Nombre de matchs pour le calcul (défaut: 50)').setMinValue(10).setMaxValue(100),
    )
    .addIntegerOption(opt =>
      opt.setName('team').setDescription('Ton équipe (1 ou 2)').addChoices(
        { name: 'Team 1', value: 1 },
        { name: 'Team 2', value: 2 },
      ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const roomId = interaction.options.getString('room_id', true)
    const matchCount = interaction.options.getInteger('matches') ?? DEFAULT_MATCH_COUNT
    const teamOption = interaction.options.getInteger('team') as 1 | 2 | null

    await interaction.deferReply()

    let match
    try {
      match = await faceitApi.getMatch(roomId)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed('Room introuvable, vérifie l\'ID.')] })
      return
    }

    if (teamOption) {
      const result = await analyzeLobby(roomId, teamOption, matchCount)
      await interaction.editReply({ embeds: [pickBanEmbed(result)] })
      return
    }

    // Ask which team via buttons
    const team1Names = match.teams.faction1.players.map(p => p.nickname).join(', ')
    const team2Names = match.teams.faction2.players.map(p => p.nickname).join(', ')

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`analyze:1:${roomId}:${matchCount}`)
        .setLabel('Team 1')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`analyze:2:${roomId}:${matchCount}`)
        .setLabel('Team 2')
        .setStyle(ButtonStyle.Secondary),
    )

    const reply = await interaction.editReply({
      content: `**Team 1:** ${team1Names}\n**Team 2:** ${team2Names}\n\nDe quel côté es-tu ?`,
      components: [row],
    })

    try {
      const buttonInteraction = await reply.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30_000,
      })

      const [, side, matchId, count] = buttonInteraction.customId.split(':')
      await buttonInteraction.deferUpdate()

      const result = await analyzeLobby(matchId, Number(side) as 1 | 2, Number(count))
      await interaction.editReply({ embeds: [pickBanEmbed(result)], components: [], content: '' })
    }
    catch {
      await interaction.editReply({ content: 'Temps écoulé, relance la commande.', components: [] })
    }
  },
} satisfies BotCommand
