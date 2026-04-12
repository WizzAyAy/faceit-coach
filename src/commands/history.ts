import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types/index.js'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api.js'
import { MAP_DISPLAY_NAMES } from '../utils/constants.js'
import { errorEmbed } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Affiche l\'historique d\'une room FACEIT')
    .addStringOption(opt =>
      opt.setName('room_id').setDescription('ID de la room FACEIT').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const roomId = interaction.options.getString('room_id', true)
    await interaction.deferReply()

    let match
    try {
      match = await faceitApi.getMatch(roomId)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed('Room introuvable, vérifie l\'ID.')] })
      return
    }

    const mapPlayed = match.voting?.map?.pick?.[0]
    const mapDisplay = mapPlayed ? (MAP_DISPLAY_NAMES[mapPlayed] ?? mapPlayed) : 'N/A'
    const statusDisplay = match.status === 'FINISHED' ? '✅ Terminé' : match.status === 'ONGOING' ? '🔴 En cours' : match.status

    const team1 = match.teams.faction1
    const team2 = match.teams.faction2
    const team1Names = team1.roster.map(p => p.nickname).join(', ')
    const team2Names = team2.roster.map(p => p.nickname).join(', ')

    const embed = new EmbedBuilder()
      .setTitle(`📜 Room ${roomId.slice(0, 8)}...`)
      .addFields(
        { name: 'Status', value: statusDisplay, inline: true },
        { name: 'Map', value: mapDisplay, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Team 1', value: team1Names },
        { name: 'Team 2', value: team2Names },
      )
      .setColor(0x5865F2)
      .setTimestamp()

    if (match.results) {
      embed.addFields({
        name: 'Score',
        value: `${match.results.score.faction1} - ${match.results.score.faction2} (${match.results.winner === 'faction1' ? 'Team 1' : 'Team 2'} gagne)`,
      })
    }

    await interaction.editReply({ embeds: [embed] })
  },
} satisfies BotCommand
