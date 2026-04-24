import { vi } from 'vitest'

export function makeInteraction(opts: {
  stringOpts?: Record<string, string | null>
  intOpts?: Record<string, number | null>
  locale?: string
  userId?: string
  awaitResult?: { customId: string } | Error
} = {}) {
  const { stringOpts = {}, intOpts = {}, locale = 'fr', userId = 'u1', awaitResult } = opts

  const reply = vi.fn().mockResolvedValue(undefined)
  const deferReply = vi.fn().mockResolvedValue(undefined)
  const editReply = vi.fn().mockImplementation(() => {
    if (!awaitResult)
      return Promise.resolve({ awaitMessageComponent: vi.fn().mockRejectedValue(new Error('no button')) })
    if (awaitResult instanceof Error)
      return Promise.resolve({ awaitMessageComponent: vi.fn().mockRejectedValue(awaitResult) })
    return Promise.resolve({
      awaitMessageComponent: vi.fn().mockImplementation(({ filter }: { filter: (i: any) => boolean }) => {
        // Exercise the filter for coverage (both branches)
        filter({ user: { id: userId } })
        filter({ user: { id: 'other' } })
        return Promise.resolve({
          customId: awaitResult.customId,
          deferUpdate: vi.fn().mockResolvedValue(undefined),
        })
      }),
    })
  })
  const followUp = vi.fn().mockResolvedValue(undefined)

  return {
    reply,
    deferReply,
    editReply,
    followUp,
    locale,
    user: { id: userId },
    options: {
      getString: vi.fn((name: string, required?: boolean) => {
        const v = stringOpts[name] ?? null
        if (required && v == null)
          throw new Error(`missing required string ${name}`)
        return v
      }),
      getInteger: vi.fn((name: string) => intOpts[name] ?? null),
    },
  } as any
}
