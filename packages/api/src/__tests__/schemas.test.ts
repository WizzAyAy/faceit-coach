import { describe, expect, it } from 'vitest'
import { analyzeBodySchema, mapParamsSchema, pseudoParamsSchema } from '../schemas.js'

describe('schemas', () => {
  describe('analyzeBodySchema', () => {
    it('should accept valid body', () => {
      expect(analyzeBodySchema.safeParse({ roomId: 'r1', team: 1 }).success).toBe(true)
      expect(analyzeBodySchema.safeParse({ roomId: 'r1', team: 2, periodMonths: 12 }).success).toBe(true)
    })

    it('should reject empty roomId', () => {
      expect(analyzeBodySchema.safeParse({ roomId: '', team: 1 }).success).toBe(false)
    })

    it('should reject invalid team', () => {
      expect(analyzeBodySchema.safeParse({ roomId: 'r1', team: 3 }).success).toBe(false)
    })

    it('should enforce periodMonths bounds', () => {
      expect(analyzeBodySchema.safeParse({ roomId: 'r1', team: 1, periodMonths: 0 }).success).toBe(false)
      expect(analyzeBodySchema.safeParse({ roomId: 'r1', team: 1, periodMonths: 25 }).success).toBe(false)
      expect(analyzeBodySchema.safeParse({ roomId: 'r1', team: 1, periodMonths: 1.5 }).success).toBe(false)
    })
  })

  describe('pseudoParamsSchema', () => {
    it('should accept a non-empty pseudo', () => {
      expect(pseudoParamsSchema.safeParse({ pseudo: 'foo' }).success).toBe(true)
    })

    it('should reject an empty pseudo', () => {
      expect(pseudoParamsSchema.safeParse({ pseudo: '' }).success).toBe(false)
    })
  })

  describe('mapParamsSchema', () => {
    it('should accept a non-empty map', () => {
      expect(mapParamsSchema.safeParse({ map: 'de_mirage' }).success).toBe(true)
    })

    it('should reject an empty map', () => {
      expect(mapParamsSchema.safeParse({ map: '' }).success).toBe(false)
    })
  })
})
