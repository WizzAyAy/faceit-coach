import { faceitApi } from '@faceit-coach/core'
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

  const pick = (roster: typeof match.teams.faction1.roster) =>
    roster.map(p => ({
      playerId: p.player_id,
      nickname: p.nickname,
      avatar: p.avatar,
      skillLevel: p.game_skill_level,
    }))

  return c.json({
    matchId: match.match_id,
    status: match.status,
    teams: {
      faction1: {
        name: match.teams.faction1.name,
        roster: pick(match.teams.faction1.roster),
      },
      faction2: {
        name: match.teams.faction2.name,
        roster: pick(match.teams.faction2.roster),
      },
    },
  })
})
