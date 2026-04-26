import { vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing'

// Force navigator.language to fr for tests (tests assert French labels).
Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })

function installTabsQueryMock(): void {
  // Override tabs.query with a vi.fn so tests can call .mockResolvedValue()/Once().
  fakeBrowser.tabs.query = vi.fn(() => Promise.resolve([])) as typeof fakeBrowser.tabs.query
}

installTabsQueryMock()

;(globalThis as any).__resetChrome = () => {
  fakeBrowser.reset()
  installTabsQueryMock()
}
