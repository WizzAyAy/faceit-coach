import type { PickBanResult } from '../../types/index.js'
import { describe, expect, it } from 'vitest'
import { errorEmbed, pickBanEmbed, playerEmbed, teamEmbed } from '../embeds.js'

describe('embeds', () => {
  describe('pickBanEmbed', () => {
    it('should create embed with all maps sorted by advantage', () => {
      const result: PickBanResult = {
        picks: [{ map: 'de_mirage', ourScore: 0.65, theirScore: 0.45, advantage: 0.20, confidence: 'high', ourTotalMatches: 40, theirTotalMatches: 35 }],
        neutral: [],
        bans: [{ map: 'de_nuke', ourScore: 0.40, theirScore: 0.60, advantage: -0.20, confidence: 'medium', ourTotalMatches: 15, theirTotalMatches: 20 }],
        allMaps: [
          { map: 'de_mirage', ourScore: 0.65, theirScore: 0.45, advantage: 0.20, confidence: 'high', ourTotalMatches: 40, theirTotalMatches: 35 },
          { map: 'de_nuke', ourScore: 0.40, theirScore: 0.60, advantage: -0.20, confidence: 'medium', ourTotalMatches: 15, theirTotalMatches: 20 },
        ],
      }

      const embed = pickBanEmbed(result)
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
        neutral: [{ map: 'de_anubis', ourScore: 0.51, theirScore: 0.49, advantage: 0.02, confidence: 'low', ourTotalMatches: 5, theirTotalMatches: 3 }],
        bans: [],
        allMaps: [{ map: 'de_anubis', ourScore: 0.51, theirScore: 0.49, advantage: 0.02, confidence: 'low', ourTotalMatches: 5, theirTotalMatches: 3 }],
      }

      const embed = pickBanEmbed(result)
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
      const embed = playerEmbed('Test', 1000, 5, '50%', '1.0', '40%', [], [])
      const json = embed.toJSON()
      const topField = json.fields!.find(f => f.name === '🟢 Meilleures maps')
      expect(topField?.value).toBe('N/A')
    })
  })

  describe('teamEmbed', () => {
    it('should list players and maps', () => {
      const embed = teamEmbed(
        [{ nickname: 'P1', elo: 2000 }, { nickname: 'P2', elo: 1800 }],
        [{ map: 'de_mirage', score: '62%' }],
        [{ map: 'de_nuke', score: '38%' }],
      )

      const json = embed.toJSON()
      expect(json.title).toBe('👥 Analyse d\'équipe')
      expect(json.description).toContain('P1 (2000)')
      expect(json.description).toContain('P2 (1800)')
    })
  })

  describe('errorEmbed', () => {
    it('should create red error embed', () => {
      const embed = errorEmbed('Something went wrong')
      const json = embed.toJSON()
      expect(json.title).toBe('❌ Erreur')
      expect(json.description).toBe('Something went wrong')
      expect(json.color).toBe(0xED4245)
    })
  })
})
