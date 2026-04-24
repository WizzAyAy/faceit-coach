import NodeCache from 'node-cache'

const store = new NodeCache()

export const cache = {
  get<T>(key: string): T | undefined {
    return store.get<T>(key)
  },

  set<T>(key: string, value: T, ttlSeconds: number): void {
    store.set(key, value, ttlSeconds)
  },

  del(key: string): void {
    store.del(key)
  },

  flush(): void {
    store.flushAll()
  },

  key(...parts: string[]): string {
    return parts.join(':')
  },
}
