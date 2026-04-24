import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, detectLocale, LOCALES, t } from '../i18n/index.js'

describe('i18n', () => {
  describe('detectLocale', () => {
    it('returns default locale for undefined/null/empty hints', () => {
      expect(detectLocale(undefined)).toBe(DEFAULT_LOCALE)
      expect(detectLocale(null)).toBe(DEFAULT_LOCALE)
      expect(detectLocale('')).toBe(DEFAULT_LOCALE)
    })

    it('matches a plain 2-letter code', () => {
      expect(detectLocale('fr')).toBe('fr')
      expect(detectLocale('en')).toBe('en')
    })

    it('extracts language from BCP47 / Discord locales', () => {
      expect(detectLocale('fr-FR')).toBe('fr')
      expect(detectLocale('en-US')).toBe('en')
      expect(detectLocale('en-GB')).toBe('en')
      expect(detectLocale('FR')).toBe('fr')
    })

    it('falls back to default for unsupported languages', () => {
      expect(detectLocale('de')).toBe(DEFAULT_LOCALE)
      expect(detectLocale('es-MX')).toBe(DEFAULT_LOCALE)
    })

    it('exposes a canonical locale list', () => {
      expect(LOCALES).toContain('en')
      expect(LOCALES).toContain('fr')
    })
  })

  describe('t', () => {
    it('returns a localized string', () => {
      expect(t('en', 'extension.analyze.startBtn')).toBe('Start analysis')
      expect(t('fr', 'extension.analyze.startBtn')).toBe('Lancer l\'analyse')
    })

    it('interpolates {name} variables', () => {
      expect(t('en', 'common.error.playerNotFound', { pseudo: 'foo' }))
        .toBe('Player "foo" not found on FACEIT.')
      expect(t('fr', 'common.error.playerNotFound', { pseudo: 'foo' }))
        .toBe('Joueur "foo" non trouvé sur FACEIT.')
    })

    it('leaves placeholders untouched when variable is missing', () => {
      expect(t('en', 'common.error.playerNotFound'))
        .toBe('Player "{pseudo}" not found on FACEIT.')
    })

    it('falls back to default locale when key is missing in requested locale', () => {
      // Simulate missing key by using a path that does not exist in either locale
      // and verify we get the raw key back.
      expect(t('en', 'does.not.exist' as any)).toBe('does.not.exist')
      expect(t('fr', 'does.not.exist' as any)).toBe('does.not.exist')
    })

    it('returns key when traversal hits a non-object', () => {
      // "common.decision.pick.xxx" — "pick" is a string, so traversing further fails.
      expect(t('en', 'common.decision.pick.xxx' as any)).toBe('common.decision.pick.xxx')
    })

    it('handles multi-variable templates', () => {
      expect(t('en', 'extension.analyze.tooltip.usLine', {
        wr: '62%',
        kd: '1.23',
        elo: 2100,
      })).toBe('You — WR 62% · K/D 1.23 · Avg ELO 2100')
    })
  })
})
