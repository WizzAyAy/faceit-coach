import type { PickBanResult } from '../../types/index.js'
import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { renderAnalyzeImage } from '../image-renderer.js'

function makeResult(mapCount: number): PickBanResult {
  const maps = ['de_mirage', 'de_inferno', 'de_nuke', 'de_anubis', 'de_ancient', 'de_dust2', 'de_overpass'].slice(0, mapCount)
  const allMaps = maps.map((map, i) => ({
    map,
    ourScore: 0.6 - i * 0.05,
    theirScore: 0.4 + i * 0.05,
    advantage: 0.2 - i * 0.1,
    confidence: (i < 2 ? 'high' : i < 4 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    ourTotalMatches: 30 - i * 3,
    theirTotalMatches: 25 - i * 2,
    ourBreakdown: { winrate: 0.6 - i * 0.05, kd: 0.55, elo: 1.0 },
    theirBreakdown: { winrate: 0.4 + i * 0.05, kd: 0.50, elo: 1.0 },
  }))

  return {
    picks: allMaps.filter(m => m.advantage >= 0.08),
    neutral: allMaps.filter(m => m.advantage > -0.08 && m.advantage < 0.08),
    bans: allMaps.filter(m => m.advantage <= -0.08),
    allMaps,
  }
}

describe('image-renderer', () => {
  it('should return a valid PNG buffer', async () => {
    const result = makeResult(3)
    const buffer = await renderAnalyzeImage(result)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(1000)
    // PNG magic bytes
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50)
    expect(buffer[2]).toBe(0x4E)
    expect(buffer[3]).toBe(0x47)
  })

  it('should scale height based on map count', async () => {
    const small = await renderAnalyzeImage(makeResult(2))
    const large = await renderAnalyzeImage(makeResult(7))
    expect(large.length).toBeGreaterThan(small.length)
  })

  it('should handle single map result', async () => {
    const result = makeResult(1)
    const buffer = await renderAnalyzeImage(result)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(500)
  })
})
