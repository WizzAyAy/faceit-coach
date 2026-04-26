// FACEIT room URLs look like https://www.faceit.com/<lang>/cs2/room/1-<uuid>(/...)?
// We extract the segment immediately following `/room/`, regardless of trailing
// slashes, query params or hash fragments.
const ROOM_ID_RE = /\/room\/([^/?#]+)/i

export function parseRoomId(url: string | null | undefined): string | null {
  if (!url)
    return null
  return url.match(ROOM_ID_RE)?.[1] ?? null
}
