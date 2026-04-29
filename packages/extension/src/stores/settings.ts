import { defineStore } from 'pinia'
import { ref } from 'vue'
import { browser } from 'wxt/browser'

export const useSettingsStore = defineStore('settings', () => {
  const apiBaseUrl = ref<string>('')
  const defaultPseudo = ref<string>('')
  const apiKey = ref<string>('')
  const faceitApiKey = ref<string>('')
  const mockMode = ref<boolean>(false)

  async function load(): Promise<void> {
    const stored = await browser.storage.sync.get(['apiBaseUrl', 'defaultPseudo', 'apiKey', 'faceitApiKey', 'mockMode'])
    if (typeof stored.apiBaseUrl === 'string')
      apiBaseUrl.value = stored.apiBaseUrl
    if (typeof stored.defaultPseudo === 'string')
      defaultPseudo.value = stored.defaultPseudo
    if (typeof stored.apiKey === 'string')
      apiKey.value = stored.apiKey
    if (typeof stored.faceitApiKey === 'string')
      faceitApiKey.value = stored.faceitApiKey
    if (typeof stored.mockMode === 'boolean')
      mockMode.value = stored.mockMode
  }

  async function save(patch: {
    apiBaseUrl?: string
    defaultPseudo?: string
    apiKey?: string
    faceitApiKey?: string
    mockMode?: boolean
  }): Promise<void> {
    if (patch.apiBaseUrl !== undefined)
      apiBaseUrl.value = patch.apiBaseUrl
    if (patch.defaultPseudo !== undefined)
      defaultPseudo.value = patch.defaultPseudo
    if (patch.apiKey !== undefined)
      apiKey.value = patch.apiKey
    if (patch.faceitApiKey !== undefined)
      faceitApiKey.value = patch.faceitApiKey
    if (patch.mockMode !== undefined)
      mockMode.value = patch.mockMode
    await browser.storage.sync.set({
      apiBaseUrl: apiBaseUrl.value,
      defaultPseudo: defaultPseudo.value,
      apiKey: apiKey.value,
      faceitApiKey: faceitApiKey.value,
      mockMode: mockMode.value,
    })
  }

  return { apiBaseUrl, defaultPseudo, apiKey, faceitApiKey, mockMode, load, save }
})
