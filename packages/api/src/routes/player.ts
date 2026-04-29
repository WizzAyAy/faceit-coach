import { faceitApi, faceitPlayerToPlayerResponse } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { pseudoParamsSchema } from '@/schemas.js'

export const playerRoute = new Hono()

playerRoute.get('/:pseudo', zValidator('param', pseudoParamsSchema), async (c) => {
  const { pseudo } = c.req.valid('param')

  let player
  try {
    player = await faceitApi.getPlayerByNickname(pseudo)
  }
  catch {
    return c.json({ error: `Player "${pseudo}" not found` }, 404)
  }

  if (!player.games.cs2)
    return c.json({ error: `${pseudo} has no CS2 stats` }, 400)

  const stats = await faceitApi.getPlayerStats(player.player_id)
  return c.json(faceitPlayerToPlayerResponse(player, stats))
})
