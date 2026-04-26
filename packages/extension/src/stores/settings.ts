import { defineStore } from 'pinia'
import { ref } from 'vue'
import { browser } from 'wxt/browser'

export const useSettingsStore = defineStore('settings', () => {
  const apiBaseUrl = ref<string>('http://localhost:8787')
  const defaultPseudo = ref<string>('')
  const apiKey = ref<string>('')

  async function load(): Promise<void> {
    const stored = await browser.storage.sync.get(['apiBaseUrl', 'defaultPseudo', 'apiKey'])
    if (typeof stored.apiBaseUrl === 'string')
      apiBaseUrl.value = stored.apiBaseUrl
    if (typeof stored.defaultPseudo === 'string')
      defaultPseudo.value = stored.defaultPseudo
    if (typeof stored.apiKey === 'string')
      apiKey.value = stored.apiKey
  }

  async function save(patch: {
    apiBaseUrl?: string
    defaultPseudo?: string
    apiKey?: string
  }): Promise<void> {
    if (patch.apiBaseUrl !== undefined)
      apiBaseUrl.value = patch.apiBaseUrl
    if (patch.defaultPseudo !== undefined)
      defaultPseudo.value = patch.defaultPseudo
    if (patch.apiKey !== undefined)
      apiKey.value = patch.apiKey
    await browser.storage.sync.set({
      apiBaseUrl: apiBaseUrl.value,
      defaultPseudo: defaultPseudo.value,
      apiKey: apiKey.value,
    })
  }

  return { apiBaseUrl, defaultPseudo, apiKey, load, save }
})
