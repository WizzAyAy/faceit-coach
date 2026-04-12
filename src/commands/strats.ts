import { SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types'
import type { StratsResult } from '../types'
import { faceitApi } from '../services/faceit-api'
import { errorEmbed, stratsEmbed } from '../utils/embeds'
import { CS2_MAP_POOL } from '../utils/constants'

export default {
  data: new SlashCommandBuilder()
    .setName('strats')
    .setDescription('Recommande le côté à choisir (CT/T) sur une map')
    .addStringOption(opt =>
      opt.setName('map').setDescription('Map CS2').setRequired(true)
        .addChoices(
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

    const allGameStats = await Promise.all(
      players.map(p => faceitApi.getPlayerGameStats(p.player_id, 100)),
    )

    const playerBreakdown = players.map((player, i) => {
      const mapMatches = allGameStats[i].filter(g => g.map === map)
      let ctWins = 0
      let ctTotal = 0
      let tWins = 0
      let tTotal = 0

      for (const match of mapMatches) {
        const won = match.result === '1'
        const kd = Number(match.kd_ratio) || 1
        if (kd >= 1.1) {
          tTotal++
          if (won) tWins++
        }
        else {
          ctTotal++
          if (won) ctWins++
        }
      }

      const ctWinrate = ctTotal > 0 ? ctWins / ctTotal : 0.5
      const tWinrate = tTotal > 0 ? tWins / tTotal : 0.5

      return {
        nickname: player.nickname,
        ctWinrate,
        tWinrate,
      }
    })

    const avgCt = playerBreakdown.reduce((s, p) => s + p.ctWinrate, 0) / playerBreakdown.length
    const avgT = playerBreakdown.reduce((s, p) => s + p.tWinrate, 0) / playerBreakdown.length

    const result: StratsResult = {
      map,
      recommendedSide: avgCt >= avgT ? 'CT' : 'T',
      ctWinrate: avgCt,
      tWinrate: avgT,
      playerBreakdown,
    }

    await interaction.editReply({ embeds: [stratsEmbed(result)] })
  },
} satisfies BotCommand
