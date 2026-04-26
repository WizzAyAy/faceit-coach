import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, detectLocale, LOCALES, messages, t } from '@/i18n/index.js'

describe('i18n', () => {
  describe('detectLocale', () => {
    it('should return default locale when hint is empty', () => {
      expect(detectLocale(undefined)).toBe(DEFAULT_LOCALE)
      expect(detectLocale(null)).toBe(DEFAULT_LOCALE)
      expect(detectLocale('')).toBe(DEFAULT_LOCALE)
    })

    it('should detect supported locale from BCP47 hint', () => {
      expect(detectLocale('fr-FR')).toBe('fr')
      expect(detectLocale('en-US')).toBe('en')
      expect(detectLocale('EN')).toBe('en')
    })

    it('should fall back to default for unsupported locales', () => {
      expect(detectLocale('de-DE')).toBe(DEFAULT_LOCALE)
    })
  })

  describe('t', () => {
    it('should translate a simple key', () => {
      expect(t('en', 'common.decision.pick')).toBe('PICK')
      expect(t('fr', 'common.decision.pick')).toBe('PICK')
    })

    it('should interpolate variables with {name}', () => {
      expect(t('en', 'common.error.playerNotFound', { pseudo: 'foo' }))
        .toBe('Player "foo" not found on FACEIT.')
    })

    it('should leave unknown placeholders intact', () => {
      const result = t('en', 'common.error.playerNotFound', { other: 'x' })
      expect(result).toContain('{pseudo}')
    })

    it('should return the raw key when no translation exists', () => {
      expect(t('en', 'some.unknown.key' as never)).toBe('some.unknown.key')
    })

    it('should traverse non-object branches and return the raw key', () => {
      expect(t('en', 'common.decision.pick.extra' as never)).toBe('common.decision.pick.extra')
    })

    it('should return the raw key when a key resolves to an object (not a string)', () => {
      // `common.decision` is an object, not a translatable leaf
      expect(t('en', 'common.decision' as never)).toBe('common.decision')
    })
  })

  it('should expose a canonical locale list', () => {
    expect(LOCALES).toEqual(['en', 'fr'])
    expect(messages.en).toBeDefined()
    expect(messages.fr).toBeDefined()
  })
})
