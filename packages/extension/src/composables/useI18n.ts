import type { Locale, TranslationKey } from '@faceit-coach/core'
import { t as coreT, detectLocale, LOCALES } from '@faceit-coach/core'
import { computed, ref } from 'vue'

/**
 * Reactive locale shared across the extension.
 * Initialized from navigator.language but can be overridden via settings.
 */
const override = ref<Locale | 'auto'>('auto')
const browser = ref<Locale>(detectLocale(navigator.language))

export const locale = computed<Locale>(() =>
  override.value === 'auto' ? browser.value : override.value,
)

export function setLocaleOverride(next: Locale | 'auto') {
  override.value = next
}

export function useI18n() {
  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return coreT(locale.value, key, vars)
  }
  return { t, locale, setLocaleOverride, availableLocales: LOCALES }
}
