import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../composables/useI18n.js'

beforeAll(() => {
  locale.value = 'fr'
})

declare const __resetChrome: () => void
const Options = (await import('../options/Options.vue')).default

describe('options', () => {
  beforeEach(() => {
    __resetChrome()
    setActivePinia(createPinia())
  })

  it('should hydrate fields from chrome.storage.sync on mount', async () => {
    await chrome.storage.sync.set({
      apiBaseUrl: 'https://api',
      defaultPseudo: 'Me',
      apiKey: 'k',
    })
    const wrapper = mount(Options)
    await flushPromises()
    const inputs = wrapper.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('https://api')
    expect((inputs[1].element as HTMLInputElement).value).toBe('Me')
    expect((inputs[2].element as HTMLInputElement).value).toBe('k')
  })

  it('should show "Saved ✓" transiently after submit', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Options)
    await flushPromises()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue(' https://api.new ')
    await inputs[1].setValue(' me ')
    await inputs[2].setValue(' key ')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Enregistré')
    vi.advanceTimersByTime(1600)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Enregistré')
    vi.useRealTimers()
    const stored = await chrome.storage.sync.get(['apiBaseUrl', 'defaultPseudo', 'apiKey'])
    expect(stored.apiBaseUrl).toBe('https://api.new')
    expect(stored.defaultPseudo).toBe('me')
    expect(stored.apiKey).toBe('key')
  })
})
