import { CS2_MAP_POOL, MAP_STRATS } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { mapParamsSchema } from '@/schemas.js'

export const stratsRoute = new Hono()

stratsRoute.get('/', (c) => {
  return c.json({ maps: CS2_MAP_POOL })
})

stratsRoute.get('/:map', zValidator('param', mapParamsSchema), (c) => {
  const { map } = c.req.valid('param')
  const strats = MAP_STRATS[map]
  if (!strats) {
    return c.json({ error: `Map "${map}" not found` }, 404)
  }
  return c.json({ map, strats })
})
