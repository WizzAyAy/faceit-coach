import type { MapScore, MapStrats, PickBanResult } from '@faceit-coach/core'
import { describe, expect, it } from 'vitest'
import { errorEmbed, pickBanEmbed, playerEmbed, stratsEmbeds } from '../utils/embeds.js'

function makeMapScore(partial: { map: string, ourScore: number, theirScore: number, advantage: number, confidence: 'high' | 'medium' | 'low', ourTotalMatches: number, theirTotalMatches: number }): MapScore {
  return {
    ...partial,
    ourBreakdown: { winrate: partial.ourScore, kd: 1.0, elo: 2000 },
    theirBreakdown: { winrate: partial.theirScore, kd: 1.0, elo: 2000 },
  }
}

describe('embeds (fr)', () => {
  describe('pickBanEmbed', () => {
    it('should create embed with all maps sorted by advantage', () => {
      const result: PickBanResult = {
        picks: [makeMapScore({ map: 'de_mirage', ourScore: 0.65, theirScore: 0.45, advantage: 0.20, confidence: 'high', ourTotalMatches: 40, theirTotalMatches: 35 })],
        neutral: [],
        bans: [makeMapScore({ map: 'de_nuke', ourScore: 0.40, theirScore: 0.60, advantage: -0.20, confidence: 'medium', ourTotalMatches: 15, theirTotalMatches: 20 })],
        allMaps: [
          makeMapScore({ map: 'de_mirage', ourScore: 0.65, theirScore: 0.45, advantage: 0.20, confidence: 'high', ourTotalMatches: 40, theirTotalMatches: 35 }),
          makeMapScore({ map: 'de_nuke', ourScore: 0.40, theirScore: 0.60, advantage: -0.20, confidence: 'medium', ourTotalMatches: 15, theirTotalMatches: 20 }),
        ],
      }

      const embed = pickBanEmbed('fr', result)
      const json = embed.toJSON()
      expect(json.title).toBe('📊 Analyse Pick & Ban')
      expect(json.description).toContain('Mirage')
      expect(json.description).toContain('PICK')
      expect(json.description).toContain('BAN')
      expect(json.description).toContain('Nuke')
    })

    it('should show confidence icons and match counts', () => {
      const result: PickBanResult = {
        picks: [],
        neutral: [makeMapScore({ map: 'de_anubis', ourScore: 0.51, theirScore: 0.49, advantage: 0.02, confidence: 'low', ourTotalMatches: 5, theirTotalMatches: 3 })],
        bans: [],
        allMaps: [makeMapScore({ map: 'de_anubis', ourScore: 0.51, theirScore: 0.49, advantage: 0.02, confidence: 'low', ourTotalMatches: 5, theirTotalMatches: 3 })],
      }

      const embed = pickBanEmbed('fr', result)
      const json = embed.toJSON()
      expect(json.description).toContain('51%')
      expect(json.description).toContain('49%')
      expect(json.description).toContain('NEUTRE')
      expect(json.description).toContain('⚠️')
      expect(json.description).toContain('5+3 matchs')
      expect(json.footer?.text).toContain('Fiable')
    })
  })

  describe('playerEmbed', () => {
    it('should create embed with player stats', () => {
      const embed = playerEmbed(
        'fr',
        'TestPlayer',
        2500,
        10,
        '55%',
        '1.2',
        '48%',
        [{ map: 'de_mirage', winrate: '65%' }],
        [{ map: 'de_nuke', winrate: '35%' }],
      )

      const json = embed.toJSON()
      expect(json.title).toBe('👤 TestPlayer')
      expect(json.fields).toBeDefined()
      const eloField = json.fields!.find(f => f.name === 'ELO')
      expect(eloField?.value).toBe('2500')
    })

    it('should show N/A for empty maps', () => {
      const embed = playerEmbed('fr', 'Test', 1000, 5, '50%', '1.0', '40%', [], [])
      const json = embed.toJSON()
      const topField = json.fields!.find(f => f.name === '🟢 Meilleures maps')
      expect(topField?.value).toBe('N/A')
    })
  })

  describe('errorEmbed', () => {
    it('should create red error embed', () => {
      const embed = errorEmbed('fr', 'Something went wrong')
      const json = embed.toJSON()
      expect(json.title).toBe('❌ Erreur')
      expect(json.description).toBe('Something went wrong')
      expect(json.color).toBe(0xED4245)
    })
  })
})

describe('embeds (en)', () => {
  it('pickBanEmbed returns english labels', () => {
    const result: PickBanResult = {
      picks: [],
      neutral: [makeMapScore({ map: 'de_anubis', ourScore: 0.51, theirScore: 0.49, advantage: 0.02, confidence: 'low', ourTotalMatches: 5, theirTotalMatches: 3 })],
      bans: [],
      allMaps: [makeMapScore({ map: 'de_anubis', ourScore: 0.51, theirScore: 0.49, advantage: 0.02, confidence: 'low', ourTotalMatches: 5, theirTotalMatches: 3 })],
    }
    const embed = pickBanEmbed('en', result)
    const json = embed.toJSON()
    expect(json.title).toBe('📊 Pick & Ban Analysis')
    expect(json.description).toContain('NEUTRAL')
    expect(json.footer?.text).toContain('Reliable')
  })

  it('errorEmbed uses english title', () => {
    const embed = errorEmbed('en', 'boom')
    expect(embed.toJSON().title).toBe('❌ Error')
  })
})

describe('stratsEmbeds', () => {
  const sample: MapStrats = {
    pistol: { ct: 'ct pistol', t: 't pistol' },
    gun: { ct: 'ct gun', t: 't gun', antiEco: 'eco', forceBuy: 'force' },
  }

  it('should return two embeds with mapped name', () => {
    const [pistol, gun] = stratsEmbeds('fr', 'de_mirage', sample)
    const pistolJson = pistol.toJSON()
    const gunJson = gun.toJSON()
    expect(pistolJson.title).toContain('Mirage')
    expect(gunJson.title).toContain('Mirage')
    expect(gunJson.fields).toHaveLength(4)
  })

  it('should fall back to raw map name when not in display names', () => {
    const [pistol] = stratsEmbeds('en', 'de_cache', sample)
    expect(pistol.toJSON().title).toContain('de_cache')
  })
})

describe('pickBanEmbed side branches', () => {
  it('should use neutral side label when map is not in CT_BIAS (fallback 0.5)', () => {
    const result: PickBanResult = {
      picks: [],
      neutral: [],
      bans: [],
      allMaps: [{
        map: 'de_nonexistent',
        ourScore: 0.5,
        theirScore: 0.5,
        advantage: 0,
        confidence: 'high',
        ourTotalMatches: 0,
        theirTotalMatches: 0,
        ourBreakdown: { winrate: 0.5, kd: 1, elo: 2000 },
        theirBreakdown: { winrate: 0.5, kd: 1, elo: 2000 },
      }],
    }
    const embed = pickBanEmbed('fr', result)
    expect(embed.toJSON().description).toContain('⚖️')
  })

  it('should use T label for T-sided maps (bias < 0.5)', () => {
    const result: PickBanResult = {
      picks: [],
      neutral: [],
      bans: [],
      allMaps: [{
        map: 'de_dust2', // bias = 0.49
        ourScore: 0.5,
        theirScore: 0.5,
        advantage: 0,
        confidence: 'high',
        ourTotalMatches: 0,
        theirTotalMatches: 0,
        ourBreakdown: { winrate: 0.5, kd: 1, elo: 2000 },
        theirBreakdown: { winrate: 0.5, kd: 1, elo: 2000 },
      }],
    }
    const embed = pickBanEmbed('fr', result)
    expect(embed.toJSON().description).toContain('💣')
  })
})
