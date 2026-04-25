import { onMounted, ref } from 'vue'

// FACEIT room ids look like `1-<uuid>` (38 chars) — match everything up to the next /, ?, or #
const ROOM_ID_RE = /\/room\/([^/?#]+)/i

export function useCurrentRoom() {
  const roomId = ref<string | null>(null)
  const tabUrl = ref<string | null>(null)

  async function refresh() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    tabUrl.value = tab?.url ?? null
    roomId.value = tab?.url?.match(ROOM_ID_RE)?.[1] ?? null
  }

  onMounted(refresh)

  return { roomId, tabUrl, refresh }
}
