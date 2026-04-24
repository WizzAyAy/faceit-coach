import { afterEach, describe, expect, it } from 'vitest'
import { cache } from '../services/cache.js'

describe('cache', () => {
  afterEach(() => {
    cache.flush()
  })

  it('should store and retrieve a value', () => {
    cache.set('test-key', { foo: 'bar' }, 60)
    expect(cache.get('test-key')).toEqual({ foo: 'bar' })
  })

  it('should return undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined()
  })

  it('should delete a key', () => {
    cache.set('key', 'value', 60)
    cache.del('key')
    expect(cache.get('key')).toBeUndefined()
  })

  it('should flush all keys', () => {
    cache.set('a', 1, 60)
    cache.set('b', 2, 60)
    cache.flush()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('should generate a cache key from prefix and params', () => {
    const key = cache.key('player-stats', 'player123', 'cs2')
    expect(key).toBe('player-stats:player123:cs2')
  })
})
