import process from 'node:process'
import { initFaceitApi } from '@faceit-coach/core'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { cors } from 'hono/cors'
import { config } from './config.js'
import { logger } from './logger.js'
import { analyzeRoute } from './routes/analyze.js'
import { liveRoute } from './routes/live.js'
import { matchRoute } from './routes/match.js'
import { playerRoute } from './routes/player.js'
import { stratsRoute } from './routes/strats.js'

initFaceitApi(config.faceitApiKey)

const isProd = process.env.NODE_ENV === 'production'

if (!config.apiKey && !isProd) {
  logger.warn('API_KEY is not set — running in dev mode without authentication')
}
if (isProd && (config.corsOrigins.length === 0 || config.corsOrigins.includes('*'))) {
  logger.warn('API_CORS_ORIGINS is empty or contains "*" in production — consider restricting allowed origins')
}

const app = new Hono()

app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'no-referrer')
  c.header('X-DNS-Prefetch-Control', 'off')
  if (isProd) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})

app.use('*', cors({
  origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  })
})

app.use('*', rateLimiter({
  windowMs: 60_000,
  limit: config.rateLimitPerMinute,
  standardHeaders: 'draft-7',
  skip: c => c.req.path === '/health',
  keyGenerator: c =>
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? c.req.header('x-real-ip')
    ?? 'anonymous',
}))

app.use('*', async (c, next) => {
  if (c.req.path === '/health' || !config.apiKey) {
    return next()
  }
  if (c.req.header('x-api-key') !== config.apiKey) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return next()
})

app.get('/health', c => c.json({ status: 'ok' }))

app.route('/analyze', analyzeRoute)
app.route('/player', playerRoute)
app.route('/live', liveRoute)
app.route('/match', matchRoute)
app.route('/strats', stratsRoute)

app.onError((err, c) => {
  logger.error({ err: err.message, stack: err.stack }, 'unhandled error')
  return c.json({ error: 'internal_error' }, 500)
})

const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  logger.info(`API listening on http://localhost:${port}`)
})

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  server.close(() => process.exit(0))
  setTimeout(() => {
    logger.error('forced exit after 10s')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
