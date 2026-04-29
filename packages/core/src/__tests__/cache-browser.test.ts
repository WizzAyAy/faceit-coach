import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheBrowser } from '@/cache-browser.js'

describe('cacheBrowser', () => {
  beforeEach(() => {
    cacheBrowser.flush()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return undefined for a missing key', () => {
    expect(cacheBrowser.get('missing')).toBeUndefined()
  })

  it('should store and retrieve a value', () => {
    cacheBrowser.set('k', 42, 60)
    expect(cacheBrowser.get<number>('k')).toBe(42)
  })

  it('should return undefined after TTL expires', () => {
    cacheBrowser.set('k', 'v', 10)
    vi.advanceTimersByTime(10_001)
    expect(cacheBrowser.get('k')).toBeUndefined()
  })

  it('should not expire before TTL', () => {
    cacheBrowser.set('k', 'v', 10)
    vi.advanceTimersByTime(9_999)
    expect(cacheBrowser.get('k')).toBe('v')
  })

  it('should delete a key', () => {
    cacheBrowser.set('k', 'v', 60)
    cacheBrowser.del('k')
    expect(cacheBrowser.get('k')).toBeUndefined()
  })

  it('should flush all keys', () => {
    cacheBrowser.set('a', 1, 60)
    cacheBrowser.set('b', 2, 60)
    cacheBrowser.flush()
    expect(cacheBrowser.get('a')).toBeUndefined()
    expect(cacheBrowser.get('b')).toBeUndefined()
  })

  it('should join key parts with colon', () => {
    expect(cacheBrowser.key('browser', 'player', 'p1')).toBe('browser:player:p1')
  })
})
