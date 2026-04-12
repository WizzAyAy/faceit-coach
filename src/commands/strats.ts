import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand, StratsResult } from '../types/index.js'
import { SlashCommandBuilder } from 'discord.js'
import { faceitApi } from '../services/faceit-api.js'
import { CS2_MAP_POOL, MAP_CT_BIAS, MAP_DISPLAY_NAMES } from '../utils/constants.js'
import { errorEmbed, stratsEmbed } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('strats')
    .setDescription('Recommande le côté à choisir (CT/T) sur une map')
    .addStringOption(opt =>
      opt.setName('map').setDescription('Map CS2').setRequired(true).addChoices(
        ...CS2_MAP_POOL.map(m => ({ name: m.replace('de_', ''), value: m })),
      ),
    )
    .addStringOption(opt => opt.setName('j1').setDescription('Joueur 1'))
    .addStringOption(opt => opt.setName('j2').setDescription('Joueur 2'))
    .addStringOption(opt => opt.setName('j3').setDescription('Joueur 3'))
    .addStringOption(opt => opt.setName('j4').setDescription('Joueur 4'))
    .addStringOption(opt => opt.setName('j5').setDescription('Joueur 5')) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const map = interaction.options.getString('map', true)
    const nicknames = ['j1', 'j2', 'j3', 'j4', 'j5']
      .map(k => interaction.options.getString(k))
      .filter((n): n is string => n !== null)

    if (nicknames.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('Fournis au moins un joueur.')] })
      return
    }

    await interaction.deferReply()

    let players
    try {
      players = await Promise.all(nicknames.map(n => faceitApi.getPlayerByNickname(n)))
    }
    catch (err) {
      await interaction.editReply({ embeds: [errorEmbed((err as Error).message)] })
      return
    }

    const allStats = await Promise.all(
      players.map(p => faceitApi.getPlayerStats(p.player_id)),
    )

    const ctBias = MAP_CT_BIAS[map] ?? 0.5

    const playerBreakdown = players.map((player, i) => {
      const displayName = MAP_DISPLAY_NAMES[map] ?? map
      const mapSegment = allStats[i].segments.find(s => s.type === 'Map' && (s.label === map || s.label === displayName))
      const mapWinrate = mapSegment ? Number(mapSegment.stats['Win Rate %']) / 100 : 0.5

      // Estimate side-specific winrates using map CT bias
      const ctWinrate = Math.min(1, Math.max(0, mapWinrate + (ctBias - 0.5)))
      const tWinrate = Math.min(1, Math.max(0, mapWinrate - (ctBias - 0.5)))

      return {
        nickname: player.nickname,
        ctWinrate,
        tWinrate,
      }
    })

    // Recommend side based on map meta:
    // If map is CT-sided (ctBias > 0.5), recommend starting CT to build economy advantage
    // If map is T-sided or neutral, recommend starting T
    const recommendedSide = ctBias > 0.5 ? 'CT' as const : 'T' as const

    const result: StratsResult = {
      map,
      recommendedSide,
      ctWinrate: ctBias,
      tWinrate: 1 - ctBias,
      playerBreakdown,
    }

    await interaction.editReply({ embeds: [stratsEmbed(result)] })
  },
} satisfies BotCommand
