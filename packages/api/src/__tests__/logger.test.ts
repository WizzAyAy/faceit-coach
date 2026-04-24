import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should create a dev logger when NODE_ENV is not production', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { logger } = await import('../logger.js')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('should create a production logger without transport', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('../logger.js')
    expect(typeof logger.info).toBe('function')
  })
})
