import { analyzeLobby, faceitApi, monthsAgoTimestamp } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { liveQuerySchema, pseudoParamsSchema } from '../schemas.js'

const DEFAULT_PERIOD_MONTHS = 6
const MAX_MATCHES_PER_PLAYER = 300

export const liveRoute = new Hono()

liveRoute.get(
  '/:pseudo',
  zValidator('param', pseudoParamsSchema),
  zValidator('query', liveQuerySchema),
  async (c) => {
    const { pseudo } = c.req.valid('param')
    const { periodMonths } = c.req.valid('query')

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

    const months = periodMonths ?? DEFAULT_PERIOD_MONTHS
    const analysis = await analyzeLobby(match.match_id, team, {
      fromTimestamp: monthsAgoTimestamp(months),
      maxMatchesPerPlayer: MAX_MATCHES_PER_PLAYER,
    })

    return c.json({
      live: true,
      matchId: match.match_id,
      status: match.status,
      team,
      analysis,
      meta: {
        periodMonths: months,
        maxMatchesPerPlayer: MAX_MATCHES_PER_PLAYER,
      },
    })
  },
)
