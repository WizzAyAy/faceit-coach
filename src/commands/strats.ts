import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types/index.js'
import { SlashCommandBuilder } from 'discord.js'
import { MAP_STRATS } from '../data/strats.js'
import { CS2_MAP_POOL } from '../utils/constants.js'
import { errorEmbed, stratsEmbeds } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('strats')
    .setDescription('Affiche les stratégies compétitives CS2 pour une map')
    .addStringOption(opt =>
      opt.setName('map').setDescription('Map CS2').setRequired(true).addChoices(
        ...CS2_MAP_POOL.map(m => ({ name: m.replace('de_', ''), value: m })),
      ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const map = interaction.options.getString('map', true)
    const strats = MAP_STRATS[map]

    if (!strats) {
      await interaction.reply({ embeds: [errorEmbed('Map introuvable.')] })
      return
    }

    await interaction.reply({ embeds: stratsEmbeds(map, strats) })
  },
} satisfies BotCommand
