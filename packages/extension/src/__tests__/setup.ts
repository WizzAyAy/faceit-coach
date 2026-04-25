import { vi } from 'vitest'

// Force navigator.language to fr for tests (tests assert French labels).
Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })

interface StorageArea { [key: string]: unknown }

function makeStorageArea() {
  let store: StorageArea = {}
  return {
    get: vi.fn((keys: string | string[] | Record<string, unknown>) => {
      if (Array.isArray(keys))
        return Promise.resolve(Object.fromEntries(keys.map(k => [k, store[k]])))
      if (typeof keys === 'string')
        return Promise.resolve({ [keys]: store[keys] })
      return Promise.resolve({ ...store, ...keys })
    }),
    set: vi.fn((items: StorageArea) => {
      store = { ...store, ...items }
      return Promise.resolve()
    }),
    clear: () => {
      store = {}
    },
    _store: () => store,
  }
}

const storage = { sync: makeStorageArea(), local: makeStorageArea() }

const tabsQuery = vi.fn(() => Promise.resolve([]))

;(globalThis as any).chrome = {
  storage,
  tabs: { query: tabsQuery },
  runtime: { sendMessage: vi.fn() },
}

;(globalThis as any).__resetChrome = () => {
  storage.sync.clear()
  storage.local.clear()
  storage.sync.get.mockClear()
  storage.sync.set.mockClear()
  tabsQuery.mockReset()
  tabsQuery.mockImplementation(() => Promise.resolve([]))
}
