import { z } from 'zod'

export const analyzeBodySchema = z.object({
  roomId: z.string().min(1),
  team: z.union([z.literal(1), z.literal(2)]),
  /** How many months of recent matches to include. Defaults to 6 server-side. */
  periodMonths: z.number().int().min(1).max(24).optional(),
})

export const pseudoParamsSchema = z.object({
  pseudo: z.string().min(1),
})

export const mapParamsSchema = z.object({
  map: z.string().min(1),
})

export const liveQuerySchema = z.object({
  /** How many months of recent matches to include when the player is live. Defaults to 6. */
  periodMonths: z.coerce.number().int().min(1).max(24).optional(),
})

export type AnalyzeBody = z.infer<typeof analyzeBodySchema>
