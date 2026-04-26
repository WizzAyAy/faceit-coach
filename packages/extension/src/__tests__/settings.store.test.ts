import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { browser } from 'wxt/browser'
import { useSettingsStore } from '@/stores/settings.js'

declare const __resetChrome: () => void

describe('settings store', () => {
  beforeEach(() => {
    __resetChrome()
    setActivePinia(createPinia())
  })

  it('should expose default values before load', () => {
    const store = useSettingsStore()
    expect(store.apiBaseUrl).toBe('http://localhost:8787')
    expect(store.defaultPseudo).toBe('')
    expect(store.apiKey).toBe('')
    expect(store.mockMode).toBe(false)
  })

  it('should load stored values from browser.storage.sync', async () => {
    await browser.storage.sync.set({
      apiBaseUrl: 'https://api.example',
      defaultPseudo: 'foo',
      apiKey: 'k',
      mockMode: true,
    })
    const store = useSettingsStore()
    await store.load()
    expect(store.apiBaseUrl).toBe('https://api.example')
    expect(store.defaultPseudo).toBe('foo')
    expect(store.apiKey).toBe('k')
    expect(store.mockMode).toBe(true)
  })

  it('should ignore non-string and non-boolean stored values', async () => {
    await browser.storage.sync.set({ apiBaseUrl: 42, defaultPseudo: null, apiKey: true, mockMode: 'yes' })
    const store = useSettingsStore()
    await store.load()
    expect(store.apiBaseUrl).toBe('http://localhost:8787')
    expect(store.defaultPseudo).toBe('')
    expect(store.apiKey).toBe('')
    expect(store.mockMode).toBe(false)
  })

  it('should persist patch fields and leave untouched ones intact', async () => {
    const store = useSettingsStore()
    await store.save({ apiBaseUrl: 'https://x' })
    expect(store.apiBaseUrl).toBe('https://x')
    await store.save({ defaultPseudo: 'bar' })
    expect(store.apiBaseUrl).toBe('https://x')
    expect(store.defaultPseudo).toBe('bar')
    await store.save({ apiKey: 'sek' })
    expect(store.apiKey).toBe('sek')
    await store.save({ mockMode: true })
    expect(store.mockMode).toBe(true)
    expect(store.apiKey).toBe('sek')
  })
})
