function createBrowserCache() {
  const store = new Map<string, { value: unknown, expiresAt: number }>()
  return {
    get<T>(key: string): T | undefined {
      const entry = store.get(key)
      if (!entry || Date.now() > entry.expiresAt) {
        store.delete(key)
        return undefined
      }
      return entry.value as T
    },
    set<T>(key: string, value: T, ttlSeconds: number): void {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    },
    del(key: string): void {
      store.delete(key)
    },
    flush(): void {
      store.clear()
    },
    key(...parts: string[]): string {
      return parts.join(':')
    },
  }
}

export const cacheBrowser = createBrowserCache()
