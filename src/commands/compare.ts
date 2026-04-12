import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types/index.js'
import { SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api.js'
import { CS2_MAP_POOL, MAP_DISPLAY_NAMES } from '../utils/constants.js'
import { compareEmbed, errorEmbed } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare deux joueurs FACEIT')
    .addStringOption(opt =>
      opt.setName('joueur1').setDescription('Pseudo du premier joueur').setRequired(true),
    )
    .addStringOption(opt =>
      opt.setName('joueur2').setDescription('Pseudo du deuxième joueur').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const nick1 = interaction.options.getString('joueur1', true)
    const nick2 = interaction.options.getString('joueur2', true)
    await interaction.deferReply()

    let player1, player2
    try {
      ;[player1, player2] = await Promise.all([
        faceitApi.getPlayerByNickname(nick1),
        faceitApi.getPlayerByNickname(nick2),
      ])
    }
    catch (err) {
      await interaction.editReply({ embeds: [errorEmbed((err as Error).message)] })
      return
    }

    const [stats1, stats2] = await Promise.all([
      faceitApi.getPlayerStats(player1.player_id),
      faceitApi.getPlayerStats(player2.player_id),
    ])

    const globalStats1: Record<string, string> = {
      'ELO': String(player1.games.cs2?.faceit_elo ?? 'N/A'),
      'Winrate': `${stats1.lifetime['Win Rate %']}%`,
      'K/D': stats1.lifetime['Average K/D Ratio'] || stats1.lifetime['K/D Ratio'],
    }
    const globalStats2: Record<string, string> = {
      'ELO': String(player2.games.cs2?.faceit_elo ?? 'N/A'),
      'Winrate': `${stats2.lifetime['Win Rate %']}%`,
      'K/D': stats2.lifetime['Average K/D Ratio'] || stats2.lifetime['K/D Ratio'],
    }

    const mapComparison = CS2_MAP_POOL.map((map) => {
      const displayName = MAP_DISPLAY_NAMES[map] ?? map
      const seg1 = stats1.segments.find(s => s.type === 'Map' && (s.label === map || s.label === displayName))
      const seg2 = stats2.segments.find(s => s.type === 'Map' && (s.label === map || s.label === displayName))
      const wr1 = seg1 ? Number(seg1.stats['Win Rate %']) : 0
      const wr2 = seg2 ? Number(seg2.stats['Win Rate %']) : 0
      return {
        map,
        wr1: seg1 ? `${seg1.stats['Win Rate %']}%` : 'N/A',
        wr2: seg2 ? `${seg2.stats['Win Rate %']}%` : 'N/A',
        winner: wr1 === wr2 ? '' : wr1 > wr2 ? nick1 : nick2,
      }
    })

    await interaction.editReply({
      embeds: [compareEmbed(nick1, nick2, globalStats1, globalStats2, mapComparison)],
    })
  },
} satisfies BotCommand
