import type { Locale } from '@faceit-coach/core'
import { LOCALES } from '@faceit-coach/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setLocaleOverride } from '../composables/useI18n.js'

export type LocalePref = Locale | 'auto'

function isLocalePref(v: unknown): v is LocalePref {
  return v === 'auto' || (typeof v === 'string' && (LOCALES as readonly string[]).includes(v))
}

export const useSettingsStore = defineStore('settings', () => {
  const apiBaseUrl = ref<string>('http://localhost:8787')
  const defaultPseudo = ref<string>('')
  const apiKey = ref<string>('')
  const localePref = ref<LocalePref>('auto')

  async function load(): Promise<void> {
    const stored = await chrome.storage.sync.get([
      'apiBaseUrl',
      'defaultPseudo',
      'apiKey',
      'localePref',
    ])
    if (typeof stored.apiBaseUrl === 'string')
      apiBaseUrl.value = stored.apiBaseUrl
    if (typeof stored.defaultPseudo === 'string')
      defaultPseudo.value = stored.defaultPseudo
    if (typeof stored.apiKey === 'string')
      apiKey.value = stored.apiKey
    if (isLocalePref(stored.localePref))
      localePref.value = stored.localePref
    setLocaleOverride(localePref.value)
  }

  async function save(patch: {
    apiBaseUrl?: string
    defaultPseudo?: string
    apiKey?: string
    localePref?: LocalePref
  }): Promise<void> {
    if (patch.apiBaseUrl !== undefined)
      apiBaseUrl.value = patch.apiBaseUrl
    if (patch.defaultPseudo !== undefined)
      defaultPseudo.value = patch.defaultPseudo
    if (patch.apiKey !== undefined)
      apiKey.value = patch.apiKey
    if (patch.localePref !== undefined) {
      localePref.value = patch.localePref
      setLocaleOverride(patch.localePref)
    }
    await chrome.storage.sync.set({
      apiBaseUrl: apiBaseUrl.value,
      defaultPseudo: defaultPseudo.value,
      apiKey: apiKey.value,
      localePref: localePref.value,
    })
  }

  return { apiBaseUrl, defaultPseudo, apiKey, localePref, load, save }
})
