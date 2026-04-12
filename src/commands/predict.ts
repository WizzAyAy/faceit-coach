import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types/index.js'
import { SlashCommandBuilder } from 'discord.js'
import { analyzeTeam } from '../services/analyzer.js'
import { faceitApi } from '../services/faceit-api.js'
import { predictWinner } from '../services/predictor.js'
import { CS2_MAP_POOL, DEFAULT_MATCH_COUNT } from '../utils/constants.js'
import { errorEmbed, predictionEmbed } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Prédit le vainqueur d\'un match FACEIT')
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

    const team1Ids = match.teams.faction1.players.map(p => p.player_id)
    const team2Ids = match.teams.faction2.players.map(p => p.player_id)

    const [team1Analysis, team2Analysis] = await Promise.all([
      analyzeTeam(team1Ids, DEFAULT_MATCH_COUNT),
      analyzeTeam(team2Ids, DEFAULT_MATCH_COUNT),
    ])

    const votedMap = match.voting?.map?.pick?.[0]
    const mapsToPredict = votedMap ? [votedMap] : [...CS2_MAP_POOL]

    const predictions = mapsToPredict.map(map =>
      predictWinner(team1Analysis, team2Analysis, map),
    )

    const team1Name = `${match.teams.faction1.players.map(p => p.nickname).slice(0, 2).join(', ')}...`
    const team2Name = `${match.teams.faction2.players.map(p => p.nickname).slice(0, 2).join(', ')}...`

    await interaction.editReply({
      embeds: [predictionEmbed(team1Name, team2Name, predictions)],
    })
  },
} satisfies BotCommand
