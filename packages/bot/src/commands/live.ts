import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types.js'
import { analyzeLobby, faceitApi, monthsAgoTimestamp } from '@faceit-coach/core'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { errorEmbed, pickBanEmbed } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('live')
    .setDescription('Vérifie si un joueur est en match et analyse le lobby')
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

    const history = await faceitApi.getPlayerHistory(player.player_id, 1)
    if (!history.items.length) {
      await interaction.editReply({ embeds: [errorEmbed(`${pseudo} n'a aucun match récent.`)] })
      return
    }

    const lastMatch = history.items[0]
    const match = await faceitApi.getMatch(lastMatch.match_id)

    if (match.status === 'ONGOING' || match.status === 'READY') {
      const isTeam1 = match.teams.faction1.roster.some(p => p.player_id === player.player_id)
      const teamSide: 1 | 2 = isTeam1 ? 1 : 2

      await interaction.editReply({ content: `🔴 **${pseudo}** est en match ! Analyse en cours...` })

      const result = await analyzeLobby(match.match_id, teamSide, {
        fromTimestamp: monthsAgoTimestamp(6),
        maxMatchesPerPlayer: 300,
      })
      await interaction.editReply({
        content: `🔴 **${pseudo}** est en match !`,
        embeds: [pickBanEmbed(result)],
      })
    }
    else {
      const date = new Date(lastMatch.finished_at * 1000)
      const timeAgo = formatTimeAgo(date)

      const embed = new EmbedBuilder()
        .setTitle(`💤 ${pseudo} n'est pas en match`)
        .setDescription(`Dernier match : ${timeAgo}`)
        .setColor(0x99AAB5)
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    }
  },
} satisfies BotCommand

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60)
    return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)
    return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD}j`
}
