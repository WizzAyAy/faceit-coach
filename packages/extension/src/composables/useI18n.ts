import type { Locale, TranslationKey } from '@faceit-coach/core/i18n'
import { t as coreT, detectLocale, LOCALES } from '@faceit-coach/core/i18n'
import { ref } from 'vue'

/**
 * Locale detected from the browser at popup load.
 * Kept reactive only so components auto-update — the value itself is set once.
 */
export const locale = ref<Locale>(detectLocale(navigator.language))

export function useI18n() {
  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return coreT(locale.value, key, vars)
  }
  return { t, locale, availableLocales: LOCALES }
}
