import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { locale } from '@/composables/useI18n.js'

beforeAll(() => {
  locale.value = 'fr'
})

vi.mock('../lib/api-client.js', () => ({
  ApiClient: class {
    getPlayer = vi.fn()
    getMatch = vi.fn().mockRejectedValue(new Error('no match'))
    analyze = vi.fn()
  },
}))

declare const __resetChrome: () => void
const App = (await import('@/entrypoints/popup/App.vue')).default

describe('popup App', () => {
  beforeEach(() => {
    __resetChrome()
    setActivePinia(createPinia())
  })

  it('should default to the Player tab when no room is detected', async () => {
    ;(browser.tabs.query as any).mockResolvedValue([])
    const wrapper = mount(App)
    await flushPromises()
    // PlayerTab has a "Go" button
    expect(wrapper.text()).toContain('Go')
  })

  it('should auto-switch to Analyze when a room is detected', async () => {
    ;(browser.tabs.query as any).mockResolvedValue([{ url: 'https://faceit.com/room/r1' }])
    const wrapper = mount(App)
    await flushPromises()
    // AnalyzeTab renders the detected room marker
    expect(wrapper.text()).toContain('Room détectée')
  })

  it('should switch tabs on click', async () => {
    ;(browser.tabs.query as any).mockResolvedValue([])
    const wrapper = mount(App)
    await flushPromises()
    const [playerBtn, analyzeBtn] = wrapper.findAll('nav button')
    await analyzeBtn.trigger('click')
    expect(wrapper.text()).toContain('Aucune room')
    await playerBtn.trigger('click')
    expect(wrapper.text()).toContain('Go')
  })
})
