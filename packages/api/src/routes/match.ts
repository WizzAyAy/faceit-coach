import { faceitApi, faceitMatchToMatchResponse } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

export const matchRoute = new Hono()

const paramsSchema = z.object({
  roomId: z.string().min(1),
})

matchRoute.get('/:roomId', zValidator('param', paramsSchema), async (c) => {
  const { roomId } = c.req.valid('param')

  let match
  try {
    match = await faceitApi.getMatch(roomId)
  }
  catch {
    return c.json({ error: `Room "${roomId}" not found` }, 404)
  }

  return c.json(faceitMatchToMatchResponse(match))
})
