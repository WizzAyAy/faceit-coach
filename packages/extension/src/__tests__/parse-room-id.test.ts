import { describe, expect, it } from 'vitest'
import { parseRoomId } from '@/lib/parse-room-id.js'

describe('parseRoomId', () => {
  it('extracts the id from a canonical room URL', () => {
    expect(parseRoomId('https://www.faceit.com/en/cs2/room/1-abc-def'))
      .toBe('1-abc-def')
  })

  it('handles trailing path segments', () => {
    expect(parseRoomId('https://www.faceit.com/en/cs2/room/1-abc/scoreboard'))
      .toBe('1-abc')
  })

  it('handles query strings and hashes', () => {
    expect(parseRoomId('https://www.faceit.com/fr/cs2/room/1-xyz?foo=bar'))
      .toBe('1-xyz')
    expect(parseRoomId('https://www.faceit.com/fr/cs2/room/1-xyz#section'))
      .toBe('1-xyz')
  })

  it('is locale-agnostic and works without a leading host', () => {
    expect(parseRoomId('/en/cs2/room/1-abc')).toBe('1-abc')
    expect(parseRoomId('/de/cs2/room/1-abc')).toBe('1-abc')
  })

  it('returns null for non-room URLs', () => {
    expect(parseRoomId('https://www.faceit.com/en/players/Pseudo')).toBeNull()
    expect(parseRoomId('https://www.faceit.com/en/cs2/matchroom/1-xyz')).toBeNull()
  })

  it('returns null for empty / nullish input', () => {
    expect(parseRoomId(null)).toBeNull()
    expect(parseRoomId(undefined)).toBeNull()
    expect(parseRoomId('')).toBeNull()
  })
})
