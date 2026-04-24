import { describe, expect, it } from 'vitest'
import { MAP_STRATS } from '../data/strats.js'
import { CS2_MAP_POOL } from '../utils/constants.js'

describe('mAP_STRATS', () => {
  it('should define strats for every map in the pool', () => {
    for (const map of CS2_MAP_POOL) {
      expect(MAP_STRATS[map]).toBeDefined()
      expect(MAP_STRATS[map].pistol.ct).not.toBe('')
      expect(MAP_STRATS[map].pistol.t).not.toBe('')
      expect(MAP_STRATS[map].gun.ct).not.toBe('')
      expect(MAP_STRATS[map].gun.t).not.toBe('')
      expect(MAP_STRATS[map].gun.antiEco).not.toBe('')
      expect(MAP_STRATS[map].gun.forceBuy).not.toBe('')
    }
  })
})
