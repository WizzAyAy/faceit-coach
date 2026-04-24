import { describe, expect, it } from 'vitest'
import { CACHE_TTL, CS2_MAP_POOL, DEFAULT_MATCH_COUNT, isInMapPool, MAP_CT_BIAS, MAP_DISPLAY_NAMES, normalizeMapName, UNCERTAINTY_THRESHOLD } from '../utils/constants.js'

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
    expect(UNCERTAINTY_THRESHOLD).toBe(10)
  })

  describe('isInMapPool', () => {
    it('should accept technical names', () => {
      expect(isInMapPool('de_mirage')).toBe(true)
    })

    it('should accept display names', () => {
      expect(isInMapPool('Mirage')).toBe(true)
    })

    it('should reject unknown labels', () => {
      expect(isInMapPool('de_cache')).toBe(false)
      expect(isInMapPool('Random')).toBe(false)
    })
  })

  describe('normalizeMapName', () => {
    it('should map display names to technical names', () => {
      expect(normalizeMapName('Mirage')).toBe('de_mirage')
      expect(normalizeMapName('Nuke')).toBe('de_nuke')
    })

    it('should pass through technical names unchanged', () => {
      expect(normalizeMapName('de_mirage')).toBe('de_mirage')
    })

    it('should pass through unknown labels unchanged', () => {
      expect(normalizeMapName('de_cache')).toBe('de_cache')
    })
  })
})
