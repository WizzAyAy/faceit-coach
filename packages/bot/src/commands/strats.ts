import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types.js'
import { CS2_MAP_POOL, detectLocale, MAP_STRATS, messages, t } from '@faceit-coach/core'
import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, stratsEmbeds } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('strats')
    .setDescription(messages.en.bot.commands.strats.description)
    .setDescriptionLocalizations({ fr: messages.fr.bot.commands.strats.description })
    .addStringOption(opt =>
      opt.setName('map')
        .setDescription(messages.en.bot.commands.strats.optMap)
        .setDescriptionLocalizations({ fr: messages.fr.bot.commands.strats.optMap })
        .setRequired(true)
        .addChoices(
          ...CS2_MAP_POOL.map(m => ({ name: m.replace('de_', ''), value: m })),
        ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = detectLocale(interaction.locale)
    const map = interaction.options.getString('map', true)
    const strats = MAP_STRATS[map]

    if (!strats) {
      await interaction.reply({ embeds: [errorEmbed(locale, t(locale, 'bot.messages.mapNotFound'))] })
      return
    }

    await interaction.reply({ embeds: stratsEmbeds(locale, map, strats) })
  },
} satisfies BotCommand
