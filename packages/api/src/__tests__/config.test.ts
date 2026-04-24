import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('config', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should throw when FACEIT_API_KEY is missing', async () => {
    vi.stubEnv('FACEIT_API_KEY', '')
    await expect(import('../config.js')).rejects.toThrow(/FACEIT_API_KEY/)
  })

  it('should throw when API_KEY is missing in production', async () => {
    vi.stubEnv('FACEIT_API_KEY', 'key')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_KEY', '')
    await expect(import('../config.js')).rejects.toThrow(/API_KEY/)
  })

  it('should apply defaults when only FACEIT_API_KEY is set', async () => {
    vi.stubEnv('FACEIT_API_KEY', 'key')
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.API_KEY
    delete process.env.API_PORT
    delete process.env.API_CORS_ORIGINS
    delete process.env.API_RATE_LIMIT_PER_MINUTE

    const { config } = await import('../config.js')
    expect(config.faceitApiKey).toBe('key')
    expect(config.port).toBe(8787)
    expect(config.corsOrigins).toEqual([])
    expect(config.apiKey).toBeUndefined()
    expect(config.rateLimitPerMinute).toBe(60)
  })

  it('should parse port, cors origins, rate limit and api key from env', async () => {
    vi.stubEnv('FACEIT_API_KEY', 'key')
    vi.stubEnv('API_PORT', '9090')
    vi.stubEnv('API_CORS_ORIGINS', 'https://a.com, https://b.com ,')
    vi.stubEnv('API_KEY', 'secret')
    vi.stubEnv('API_RATE_LIMIT_PER_MINUTE', '120')

    const { config } = await import('../config.js')
    expect(config.port).toBe(9090)
    expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com'])
    expect(config.apiKey).toBe('secret')
    expect(config.rateLimitPerMinute).toBe(120)
  })
})
