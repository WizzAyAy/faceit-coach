import { describe, expect, it } from 'vitest'
import { matchOrigin } from '../cors.js'

describe('matchOrigin', () => {
  it('allows any origin when patterns contain *', () => {
    expect(matchOrigin('https://anything.com', ['*'])).toBe('https://anything.com')
    expect(matchOrigin('moz-extension://abc', ['*'])).toBe('moz-extension://abc')
  })

  it('allows exact-match origins', () => {
    const patterns = ['chrome-extension://abc123']
    expect(matchOrigin('chrome-extension://abc123', patterns)).toBe('chrome-extension://abc123')
  })

  it('rejects origins not in the allow-list', () => {
    expect(matchOrigin('https://evil.com', ['https://good.com'])).toBeNull()
    expect(matchOrigin('chrome-extension://abc', [])).toBeNull()
  })

  it('matches a protocol wildcard like moz-extension://*', () => {
    const patterns = ['moz-extension://*']
    expect(matchOrigin('moz-extension://01234567-uuid', patterns)).toBe('moz-extension://01234567-uuid')
    expect(matchOrigin('moz-extension://other', patterns)).toBe('moz-extension://other')
  })

  it('does not match a different protocol with a wildcard pattern', () => {
    const patterns = ['moz-extension://*']
    expect(matchOrigin('chrome-extension://abc', patterns)).toBeNull()
    expect(matchOrigin('https://evil.com', patterns)).toBeNull()
  })

  it('mixes exact and wildcard patterns', () => {
    const patterns = ['chrome-extension://stable-id', 'moz-extension://*']
    expect(matchOrigin('chrome-extension://stable-id', patterns)).toBe('chrome-extension://stable-id')
    expect(matchOrigin('moz-extension://random', patterns)).toBe('moz-extension://random')
    expect(matchOrigin('https://example.com', patterns)).toBeNull()
  })
})
