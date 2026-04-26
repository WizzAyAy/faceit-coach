import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { describe, expect, it } from 'vitest'
import { matchOrigin } from '@/cors.js'

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

  it('returns null on empty origin unless allow-all is set', () => {
    expect(matchOrigin('', ['moz-extension://*'])).toBeNull()
    expect(matchOrigin('', ['chrome-extension://abc'])).toBeNull()
    expect(matchOrigin('', ['*'])).toBe('')
  })

  it('matches the bare protocol prefix against a wildcard pattern', () => {
    expect(matchOrigin('moz-extension://', ['moz-extension://*'])).toBe('moz-extension://')
  })

  it('is case-sensitive on the protocol', () => {
    expect(matchOrigin('MOZ-EXTENSION://abc', ['moz-extension://*'])).toBeNull()
  })

  it('treats an origin string equal to a wildcard literal as a non-match', () => {
    expect(matchOrigin('moz-extension://*', ['moz-extension://abc'])).toBeNull()
  })
})

describe('cors() middleware integration', () => {
  function makeApp(patterns: readonly string[]) {
    const app = new Hono()
    app.use('*', cors({
      origin: origin => matchOrigin(origin, patterns),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    }))
    app.get('/health', c => c.json({ status: 'ok' }))
    return app
  }

  it('echoes the origin when an exact pattern matches', async () => {
    const app = makeApp(['chrome-extension://abc123'])
    const res = await app.request('/health', {
      headers: { Origin: 'chrome-extension://abc123' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abc123')
  })

  it('echoes a Firefox UUID origin via moz-extension://* wildcard', async () => {
    const app = makeApp(['moz-extension://*'])
    const origin = 'moz-extension://12345678-aaaa-bbbb-cccc-deadbeefcafe'
    const res = await app.request('/health', {
      headers: { Origin: origin },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })

  it('omits Access-Control-Allow-Origin when origin is not allowed', async () => {
    const app = makeApp(['chrome-extension://abc123'])
    const res = await app.request('/health', {
      headers: { Origin: 'https://evil.com' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('handles an OPTIONS preflight from an allowed extension origin', async () => {
    const app = makeApp(['moz-extension://*'])
    const origin = 'moz-extension://aaaa-bbbb'
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, x-api-key',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('blocks an OPTIONS preflight from an origin that is not on the allow-list', async () => {
    const app = makeApp(['chrome-extension://stable-id'])
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'POST',
      },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('still serves the response when the request has no Origin header (same-origin)', async () => {
    const app = makeApp(['chrome-extension://abc123'])
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})
