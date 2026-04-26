import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { browser } from 'wxt/browser'
import { useCurrentRoom } from '../composables/useCurrentRoom.js'

declare const __resetChrome: () => void

function mountWithRoom() {
  const result: { roomId: import('vue').Ref<string | null>, tabUrl: import('vue').Ref<string | null>, refresh: () => Promise<void> } = {
    roomId: null as any,
    tabUrl: null as any,
    refresh: null as any,
  }
  const Comp = defineComponent({
    setup() {
      const r = useCurrentRoom()
      result.roomId = r.roomId
      result.tabUrl = r.tabUrl
      result.refresh = r.refresh
      return () => h('div')
    },
  })
  mount(Comp)
  return result
}

describe('useCurrentRoom', () => {
  beforeEach(() => __resetChrome())

  it('should extract the room id from a faceit room URL', async () => {
    (browser.tabs.query as any).mockResolvedValue([{ url: 'https://www.faceit.com/fr/cs2/room/1-abc' }])
    const { roomId, tabUrl, refresh } = mountWithRoom()
    await refresh()
    expect(roomId.value).toBe('1-abc')
    expect(tabUrl.value).toBe('https://www.faceit.com/fr/cs2/room/1-abc')
  })

  it('should be null when no room in URL', async () => {
    (browser.tabs.query as any).mockResolvedValue([{ url: 'https://www.faceit.com/home' }])
    const { roomId, refresh } = mountWithRoom()
    await refresh()
    expect(roomId.value).toBeNull()
  })

  it('should be null when there is no active tab', async () => {
    (browser.tabs.query as any).mockResolvedValue([])
    const { roomId, tabUrl, refresh } = mountWithRoom()
    await refresh()
    expect(roomId.value).toBeNull()
    expect(tabUrl.value).toBeNull()
  })

  it('should be null when the tab has no URL', async () => {
    (browser.tabs.query as any).mockResolvedValue([{}])
    const { tabUrl, refresh } = mountWithRoom()
    await refresh()
    expect(tabUrl.value).toBeNull()
  })
})
