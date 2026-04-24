import { faceitApi, isInMapPool, normalizeMapName } from '@faceit-coach/core'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { pseudoParamsSchema } from '../schemas.js'

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

  if (!player.games.cs2) {
    return c.json({ error: `${pseudo} has no CS2 stats` }, 400)
  }

  const stats = await faceitApi.getPlayerStats(player.player_id)
  const mapSegments = stats.segments
    .filter(s => s.type === 'Map' && isInMapPool(s.label))
    .map(s => ({
      map: normalizeMapName(s.label),
      winrate: Number(s.stats['Win Rate %']),
      matches: Number(s.stats.Matches),
      kd: Number(s.stats['K/D Ratio']),
    }))
    .sort((a, b) => b.winrate - a.winrate)

  return c.json({
    playerId: player.player_id,
    nickname: player.nickname,
    avatar: player.avatar,
    country: player.country,
    elo: player.games.cs2.faceit_elo,
    level: player.games.cs2.skill_level,
    region: player.games.cs2.region,
    lifetime: {
      winrate: `${stats.lifetime['Win Rate %']}%`,
      kd: stats.lifetime['Average K/D Ratio'] || stats.lifetime['K/D Ratio'],
      hs: `${stats.lifetime['Average Headshots %'] || stats.lifetime['Total Headshots %']}%`,
      matches: stats.lifetime.Matches,
    },
    maps: mapSegments,
  })
})
