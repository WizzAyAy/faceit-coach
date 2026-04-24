import process from 'node:process'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const apiKey = process.env.API_KEY
if (!apiKey && process.env.NODE_ENV === 'production') {
  throw new Error('API_KEY is required in production')
}

const rateLimitPerMinuteRaw = process.env.API_RATE_LIMIT_PER_MINUTE
const rateLimitPerMinute = rateLimitPerMinuteRaw ? Number(rateLimitPerMinuteRaw) : 60

export const config = {
  faceitApiKey: requireEnv('FACEIT_API_KEY'),
  port: Number(process.env.API_PORT ?? 8787),
  /**
   * Comma-separated origins allowed by CORS.
   * Chrome MV3 extensions use `chrome-extension://<id>` origins.
   */
  corsOrigins: (process.env.API_CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  apiKey,
  rateLimitPerMinute,
}
