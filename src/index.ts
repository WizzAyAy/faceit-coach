import type { BotCommand } from './types/index.js'
import { createServer } from 'node:http'
import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js'
import { config } from './config.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const commands = new Collection<string, BotCommand>()

async function loadCommands(): Promise<void> {
  const commandFiles = [
    'analyze',
    'player',
    'compare',
    'history',
    'team',
    'live',
    'predict',
    'strats',
  ]

  for (const file of commandFiles) {
    const mod = await import(`./commands/${file}.js`)
    const command: BotCommand = mod.default
    commands.set(command.data.name, command)
  }
}

async function registerSlashCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discordToken)
  const commandData = commands.map(c => c.data.toJSON())

  await rest.put(
    Routes.applicationCommands(config.discordClientId),
    { body: commandData },
  )

  // eslint-disable-next-line no-console
  console.log(`Registered ${commandData.length} slash commands`)
}

client.once(Events.ClientReady, (c) => {
  // eslint-disable-next-line no-console
  console.log(`Bot ready as ${c.user.tag}`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand())
    return

  const command = commands.get(interaction.commandName)
  if (!command)
    return

  try {
    await command.execute(interaction)
  }
  catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error)
    const { errorEmbed } = await import('./utils/embeds.js')
    const content = { embeds: [errorEmbed('Une erreur inattendue est survenue.')] }
    if (interaction.replied || interaction.deferred)
      await interaction.followUp(content)
    else
      await interaction.reply(content)
  }
})

function startHealthCheck(): void {
  const port = Number(process.env.PORT) || 8000
  createServer((_req, res) => {
    res.writeHead(200)
    res.end('OK')
  }).listen(port)
}

async function main(): Promise<void> {
  await loadCommands()
  await registerSlashCommands()
  await client.login(config.discordToken)
  startHealthCheck()
}

main().catch(console.error)
