import { describe, expect, it } from 'vitest'
import { CACHE_TTL, CS2_MAP_POOL, DEFAULT_MATCH_COUNT, MAP_CT_BIAS, MAP_DISPLAY_NAMES, UNCERTAINTY_THRESHOLD } from '../constants.js'

describe('constants', () => {
  it('should have 7 maps in the pool', () => {
    expect(CS2_MAP_POOL).toHaveLength(7)
  })

  it('should have display names for all maps', () => {
    for (const map of CS2_MAP_POOL) {
      expect(MAP_DISPLAY_NAMES[map]).toBeDefined()
      expect(MAP_DISPLAY_NAMES[map]).not.toBe('')
    }
  })

  it('should have CT bias for all maps', () => {
    for (const map of CS2_MAP_POOL) {
      expect(MAP_CT_BIAS[map]).toBeDefined()
      expect(MAP_CT_BIAS[map]).toBeGreaterThan(0)
      expect(MAP_CT_BIAS[map]).toBeLessThan(1)
    }
  })

  it('should have reasonable cache TTLs', () => {
    expect(CACHE_TTL.PLAYER_STATS).toBeGreaterThan(0)
    expect(CACHE_TTL.MATCH_DETAILS).toBeGreaterThan(0)
    expect(CACHE_TTL.MATCH_HISTORY).toBeGreaterThan(0)
  })

  it('should have reasonable defaults', () => {
    expect(DEFAULT_MATCH_COUNT).toBe(50)
    expect(UNCERTAINTY_THRESHOLD).toBe(5)
  })
})
