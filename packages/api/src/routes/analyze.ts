import { analyzeLobby, faceitApi, monthsAgoTimestamp } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { analyzeBodySchema } from '@/schemas.js'

const DEFAULT_PERIOD_MONTHS = 6
const MAX_MATCHES_PER_PLAYER = 300

export const analyzeRoute = new Hono()

analyzeRoute.post('/', zValidator('json', analyzeBodySchema), async (c) => {
  const { roomId, team, periodMonths } = c.req.valid('json')

  try {
    await faceitApi.getMatch(roomId)
  }
  catch {
    return c.json({ error: `Room "${roomId}" not found` }, 404)
  }

  const months = periodMonths ?? DEFAULT_PERIOD_MONTHS
  const result = await analyzeLobby(roomId, team, {
    fromTimestamp: monthsAgoTimestamp(months),
    maxMatchesPerPlayer: MAX_MATCHES_PER_PLAYER,
  })

  return c.json({
    ...result,
    meta: {
      periodMonths: months,
      maxMatchesPerPlayer: MAX_MATCHES_PER_PLAYER,
    },
  })
})
