import { en } from '@/i18n/en.js'
import { fr } from '@/i18n/fr.js'

export type Locale = 'en' | 'fr'

export const LOCALES: readonly Locale[] = ['en', 'fr'] as const
export const DEFAULT_LOCALE: Locale = 'en'

/**
 * All messages keyed by locale. `en` is the canonical shape; `fr` extends it
 * via `typeof en` for structural typing.
 */
export const messages = { en, fr } as const

export type Messages = typeof en

/**
 * Dotted-path union of all keys in `Messages` that resolve to a string.
 * Examples: `"common.decision.pick"`, `"extension.analyze.startBtn"`.
 */
export type TranslationKey = Paths<Messages>

// Recursive path builder — stops at string leaves.
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends Record<string, unknown>
      ? Paths<T[K], `${P}${K}.`>
      : never
}[keyof T & string]

/**
 * Normalize any BCP47 or Discord locale hint (e.g. `fr-FR`, `en-US`) to a
 * supported `Locale`. Falls back to `DEFAULT_LOCALE` if no match.
 */
export function detectLocale(hint: string | undefined | null): Locale {
  if (!hint)
    return DEFAULT_LOCALE
  const lang = hint.slice(0, 2).toLowerCase()
  return (LOCALES as readonly string[]).includes(lang)
    ? lang as Locale
    : DEFAULT_LOCALE
}

function resolve(locale: Locale, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = messages[locale]
  for (const part of parts) {
    if (typeof current !== 'object' || current === null)
      return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match)
}

/**
 * Translate a key for the given locale, falling back to `DEFAULT_LOCALE` then
 * to the raw key if missing entirely. Variables are interpolated with `{name}`.
 */
export function t(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const value = resolve(locale, key) ?? resolve(DEFAULT_LOCALE, key) ?? key
  return vars ? interpolate(value, vars) : value
}
