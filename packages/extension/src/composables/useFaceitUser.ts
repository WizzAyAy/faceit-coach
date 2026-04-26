import { ref } from 'vue'

// Internal FACEIT endpoint that returns the currently-authenticated user.
// Relative path: the content script always runs on www.faceit.com, so the
// session cookie is sent automatically.
const SESSION_ENDPOINT = '/api/users/v1/sessions/me'

interface SessionResponse {
  result?: string
  payload?: {
    nickname?: unknown
  }
}

/**
 * Resolve the FACEIT nickname of the currently-logged-in user by hitting
 * the same `/api/users/v1/sessions/me` endpoint the FACEIT web app uses.
 * Returns null on any failure (logged out, network error, response shape
 * change…) so the caller can fall back to a manually-configured pseudo.
 */
export async function fetchFaceitNickname(
  fetchFn: typeof fetch = fetch.bind(globalThis),
): Promise<string | null> {
  try {
    const res = await fetchFn(SESSION_ENDPOINT, { credentials: 'include' })
    if (!res.ok)
      return null
    const json = (await res.json()) as SessionResponse
    const nick = json?.payload?.nickname
    return typeof nick === 'string' && nick.length > 0 ? nick : null
  }
  catch {
    return null
  }
}

export interface UseFaceitUserOptions {
  fetchFn?: typeof fetch
}

export function useFaceitUser({ fetchFn }: UseFaceitUserOptions = {}) {
  const nickname = ref<string | null>(null)
  const ready = fetchFaceitNickname(fetchFn).then((n) => {
    nickname.value = n
    return n
  })
  return { nickname, ready }
}
