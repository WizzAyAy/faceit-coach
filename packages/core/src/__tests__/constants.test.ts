import { describe, expect, it } from 'vitest'
import { CACHE_TTL, CS2_MAP_POOL, isInMapPool, MAP_DISPLAY_NAMES, normalizeMapName, UNCERTAINTY_THRESHOLD } from '../utils/constants.js'

describe('constants', () => {
  it('should have 8 maps in the pool', () => {
    expect(CS2_MAP_POOL).toHaveLength(8)
  })

  it('should have display names for all maps', () => {
    for (const map of CS2_MAP_POOL) {
      expect(MAP_DISPLAY_NAMES[map]).toBeDefined()
      expect(MAP_DISPLAY_NAMES[map]).not.toBe('')
    }
  })

  it('should have reasonable cache TTLs', () => {
    expect(CACHE_TTL.PLAYER_STATS).toBeGreaterThan(0)
    expect(CACHE_TTL.MATCH_DETAILS).toBeGreaterThan(0)
    expect(CACHE_TTL.MATCH_HISTORY).toBeGreaterThan(0)
  })

  it('should have a reasonable uncertainty threshold', () => {
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
      expect(isInMapPool('de_train')).toBe(false)
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
      expect(normalizeMapName('de_train')).toBe('de_train')
    })
  })
})
