import { analyzeLobby, faceitApi, monthsAgoTimestamp } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { pseudoParamsSchema } from '../schemas.js'

export const liveRoute = new Hono()

liveRoute.get('/:pseudo', zValidator('param', pseudoParamsSchema), async (c) => {
  const { pseudo } = c.req.valid('param')

  let player
  try {
    player = await faceitApi.getPlayerByNickname(pseudo)
  }
  catch {
    return c.json({ error: `Player "${pseudo}" not found` }, 404)
  }

  const history = await faceitApi.getPlayerHistory(player.player_id, 1)
  if (!history.items.length) {
    return c.json({ live: false, reason: 'no-recent-match' })
  }

  const lastMatch = history.items[0]
  const match = await faceitApi.getMatch(lastMatch.match_id)

  if (match.status !== 'ONGOING' && match.status !== 'READY') {
    return c.json({
      live: false,
      lastMatch: {
        matchId: lastMatch.match_id,
        finishedAt: lastMatch.finished_at,
      },
    })
  }

  const isTeam1 = match.teams.faction1.roster.some(p => p.player_id === player.player_id)
  const team: 1 | 2 = isTeam1 ? 1 : 2

  const analysis = await analyzeLobby(match.match_id, team, {
    fromTimestamp: monthsAgoTimestamp(6),
    maxMatchesPerPlayer: 300,
  })

  return c.json({
    live: true,
    matchId: match.match_id,
    status: match.status,
    team,
    analysis,
  })
})
