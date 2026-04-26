/**
 * Match a request `Origin` header against the allow-list configured in
 * `API_CORS_ORIGINS`. Supports:
 *   - `*` — allow any origin (echoes the request origin back)
 *   - exact match (e.g. `chrome-extension://khpfppjaichdmbcoihjihfahooklnblc`)
 *   - protocol wildcard (e.g. `moz-extension://*` — Firefox installs use a
 *     random UUID per install, so an exact match is impossible)
 *
 * Returns the origin to echo as `Access-Control-Allow-Origin`, or `null` to
 * deny the request.
 */
export function matchOrigin(origin: string, patterns: readonly string[]): string | null {
  for (const pattern of patterns) {
    if (pattern === '*' || pattern === origin)
      return origin
    if (pattern.endsWith('://*') && origin.startsWith(pattern.slice(0, -1)))
      return origin
  }
  return null
}
