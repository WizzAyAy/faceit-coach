import { SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import { faceitApi } from '../services/faceit-api'
import { errorEmbed, playerEmbed } from '../utils/embeds'
import { CS2_MAP_POOL } from '../utils/constants'

export default {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Affiche le profil d\'un joueur FACEIT')
    .addStringOption(opt =>
      opt.setName('pseudo').setDescription('Pseudo FACEIT du joueur').setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const pseudo = interaction.options.getString('pseudo', true)
    await interaction.deferReply()

    let player
    try {
      player = await faceitApi.getPlayerByNickname(pseudo)
    }
    catch {
      await interaction.editReply({ embeds: [errorEmbed(`Joueur "${pseudo}" non trouvé sur FACEIT.`)] })
      return
    }

    if (!player.games.cs2) {
      await interaction.editReply({ embeds: [errorEmbed(`${pseudo} n'a pas de stats CS2.`)] })
      return
    }

    const stats = await faceitApi.getPlayerStats(player.player_id)
    const mapSegments = stats.segments
      .filter(s => s.type === 'Map' && CS2_MAP_POOL.includes(s.label as any))
      .map(s => ({
        map: s.label,
        winrate: Number(s.stats['Win Rate %']),
      }))
      .sort((a, b) => b.winrate - a.winrate)

    const topMaps = mapSegments.slice(0, 3).map(m => ({
      map: m.map,
      winrate: `${m.winrate}%`,
    }))
    const bottomMaps = mapSegments.slice(-3).reverse().map(m => ({
      map: m.map,
      winrate: `${m.winrate}%`,
    }))

    await interaction.editReply({
      embeds: [playerEmbed(
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
