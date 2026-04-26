import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { fetchFaceitNickname, useFaceitUser } from '@/composables/useFaceitUser.js'

function fakeFetch(impl: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(impl(input, init))) as typeof fetch
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('fetchFaceitNickname', () => {
  it('extracts nickname from the canonical FACEIT session payload', async () => {
    const fetchFn = fakeFetch(() => jsonResponse({ result: 'OK', payload: { nickname: 'IDWizzi', id: 'uuid' } }))
    expect(await fetchFaceitNickname(fetchFn)).toBe('IDWizzi')
  })

  it('hits the relative /api/users/v1/sessions/me endpoint with credentials', async () => {
    let calledUrl = ''
    let calledCredentials: RequestCredentials | undefined
    const fetchFn = fakeFetch((input, init) => {
      calledUrl = String(input)
      calledCredentials = init?.credentials
      return jsonResponse({ payload: { nickname: 'X' } })
    })
    await fetchFaceitNickname(fetchFn)
    expect(calledUrl).toBe('/api/users/v1/sessions/me')
    expect(calledCredentials).toBe('include')
  })

  it('returns null on a non-2xx response', async () => {
    const fetchFn = fakeFetch(() => jsonResponse({ error: 'unauth' }, 401))
    expect(await fetchFaceitNickname(fetchFn)).toBeNull()
  })

  it('returns null when nickname is missing or wrong type', async () => {
    expect(await fetchFaceitNickname(fakeFetch(() => jsonResponse({ payload: {} })))).toBeNull()
    expect(await fetchFaceitNickname(fakeFetch(() => jsonResponse({})))).toBeNull()
    expect(await fetchFaceitNickname(fakeFetch(() => jsonResponse({ payload: { nickname: 42 } })))).toBeNull()
    expect(await fetchFaceitNickname(fakeFetch(() => jsonResponse({ payload: { nickname: '' } })))).toBeNull()
  })

  it('returns null when the body is not valid JSON', async () => {
    const fetchFn = fakeFetch(() => new Response('not-json', { status: 200, headers: { 'Content-Type': 'text/plain' } }))
    expect(await fetchFaceitNickname(fetchFn)).toBeNull()
  })

  it('returns null when fetch itself throws', async () => {
    const fetchFn = (() => Promise.reject(new TypeError('Network down'))) as typeof fetch
    expect(await fetchFaceitNickname(fetchFn)).toBeNull()
  })
})

describe('useFaceitUser', () => {
  it('exposes a reactive nickname that resolves once the fetch completes', async () => {
    const fetchFn = fakeFetch(() => jsonResponse({ payload: { nickname: 'IDWizzi' } }))
    const { nickname, ready } = useFaceitUser({ fetchFn })
    expect(nickname.value).toBeNull()
    await ready
    await nextTick()
    expect(nickname.value).toBe('IDWizzi')
  })

  it('keeps nickname null when the session endpoint fails', async () => {
    const fetchFn = fakeFetch(() => jsonResponse({}, 500))
    const { nickname, ready } = useFaceitUser({ fetchFn })
    await ready
    await nextTick()
    expect(nickname.value).toBeNull()
  })
})
