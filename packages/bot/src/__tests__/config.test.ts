import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('bot config', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should throw when DISCORD_TOKEN is missing', async () => {
    vi.stubEnv('DISCORD_TOKEN', '')
    vi.stubEnv('DISCORD_CLIENT_ID', 'id')
    vi.stubEnv('FACEIT_API_KEY', 'k')
    await expect(import('../config.js')).rejects.toThrow(/DISCORD_TOKEN/)
  })

  it('should throw when DISCORD_CLIENT_ID is missing', async () => {
    vi.stubEnv('DISCORD_TOKEN', 't')
    vi.stubEnv('DISCORD_CLIENT_ID', '')
    vi.stubEnv('FACEIT_API_KEY', 'k')
    await expect(import('../config.js')).rejects.toThrow(/DISCORD_CLIENT_ID/)
  })

  it('should throw when FACEIT_API_KEY is missing', async () => {
    vi.stubEnv('DISCORD_TOKEN', 't')
    vi.stubEnv('DISCORD_CLIENT_ID', 'id')
    vi.stubEnv('FACEIT_API_KEY', '')
    await expect(import('../config.js')).rejects.toThrow(/FACEIT_API_KEY/)
  })

  it('should expose all three when present', async () => {
    vi.stubEnv('DISCORD_TOKEN', 't')
    vi.stubEnv('DISCORD_CLIENT_ID', 'id')
    vi.stubEnv('FACEIT_API_KEY', 'k')
    const { config } = await import('../config.js')
    expect(config).toEqual({ discordToken: 't', discordClientId: 'id', faceitApiKey: 'k' })
  })
})
