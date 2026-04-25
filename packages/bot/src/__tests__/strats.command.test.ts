import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeInteraction } from './helpers.js'

vi.mock('@faceit-coach/core', async () => {
  const actual = await vi.importActual<typeof import('@faceit-coach/core')>('@faceit-coach/core')
  return {
    ...actual,
    MAP_STRATS: {
      de_mirage: {
        pistol: { ct: 'ct', t: 't' },
        gun: { ct: 'ct', t: 't', antiEco: 'a', forceBuy: 'f' },
      },
    },
  }
})

const { default: strats } = await import('../commands/strats.js')

describe('/strats command', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should reply with error embed for unknown map', async () => {
    const interaction = makeInteraction({ stringOpts: { map: 'de_train' } })
    await strats.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: expect.any(Array),
    }))
  })

  it('should reply with strats embeds for a known map', async () => {
    const interaction = makeInteraction({ stringOpts: { map: 'de_mirage' } })
    await strats.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: expect.arrayContaining([expect.anything(), expect.anything()]),
    })
  })
})
