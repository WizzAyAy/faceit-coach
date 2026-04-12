import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types/index.js'
import { SlashCommandBuilder } from 'discord.js'
import { analyzeTeam, calculateMapScores } from '../services/analyzer.js'
import { faceitApi } from '../services/faceit-api.js'
import { CS2_MAP_POOL, DEFAULT_MATCH_COUNT } from '../utils/constants.js'
import { errorEmbed, teamEmbed } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Analyse les maps fortes/faibles d\'une équipe')
    .addStringOption(opt => opt.setName('j1').setDescription('Joueur 1').setRequired(true))
    .addStringOption(opt => opt.setName('j2').setDescription('Joueur 2').setRequired(true))
    .addStringOption(opt => opt.setName('j3').setDescription('Joueur 3').setRequired(true))
    .addStringOption(opt => opt.setName('j4').setDescription('Joueur 4').setRequired(true))
    .addStringOption(opt => opt.setName('j5').setDescription('Joueur 5').setRequired(true)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const nicknames = ['j1', 'j2', 'j3', 'j4', 'j5']
      .map(k => interaction.options.getString(k, true))
    await interaction.deferReply()

    let players
    try {
      players = await Promise.all(
        nicknames.map(n => faceitApi.getPlayerByNickname(n)),
      )
    }
    catch (err) {
      await interaction.editReply({ embeds: [errorEmbed((err as Error).message)] })
      return
    }

    const playerIds = players.map(p => p.player_id)
    const analysis = await analyzeTeam(playerIds, DEFAULT_MATCH_COUNT)
    const scores = calculateMapScores(analysis)

    const sorted = CS2_MAP_POOL
      .map(map => ({ map, score: scores[map] }))
      .sort((a, b) => b.score - a.score)

    const strongMaps = sorted.slice(0, 3).map(m => ({
      map: m.map,
      score: `${Math.round(m.score * 100)}%`,
    }))
    const weakMaps = sorted.slice(-3).reverse().map(m => ({
      map: m.map,
      score: `${Math.round(m.score * 100)}%`,
    }))

    const playerList = analysis.map(p => ({
      nickname: p.nickname,
      elo: p.elo,
    }))

    await interaction.editReply({
      embeds: [teamEmbed(playerList, strongMaps, weakMaps)],
    })
  },
} satisfies BotCommand
