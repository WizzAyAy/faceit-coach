import { describe, expect, it, vi } from 'vitest'

vi.mock('@faceit-coach/core', () => ({
  CS2_MAP_POOL: ['de_mirage', 'de_nuke'],
  MAP_STRATS: {
    de_mirage: { pistol: { ct: 'c', t: 't' }, gun: { ct: 'c', t: 't', antiEco: 'a', forceBuy: 'f' } },
  },
}))

const { stratsRoute } = await import('@/routes/strats.js')

describe('gET /strats', () => {
  it('should list the map pool', async () => {
    const res = await stratsRoute.request('/')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.maps).toEqual(['de_mirage', 'de_nuke'])
  })

  it('should return a strategy for a known map', async () => {
    const res = await stratsRoute.request('/de_mirage')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.map).toBe('de_mirage')
    expect(body.strats.pistol.ct).toBe('c')
  })

  it('should return 404 for an unknown map', async () => {
    const res = await stratsRoute.request('/de_train')
    expect(res.status).toBe(404)
  })
})
