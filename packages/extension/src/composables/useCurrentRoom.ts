import { onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'
import { parseRoomId } from '@/lib/parse-room-id.js'

export function useCurrentRoom() {
  const roomId = ref<string | null>(null)
  const tabUrl = ref<string | null>(null)

  async function refresh() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    tabUrl.value = tab?.url ?? null
    roomId.value = parseRoomId(tab?.url)
  }

  onMounted(refresh)

  return { roomId, tabUrl, refresh }
}
