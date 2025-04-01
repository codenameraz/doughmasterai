type CacheEntry = {
  value: any
  timestamp: number
}

class Cache {
  private static instance: Cache
  private cache: Map<string, CacheEntry>
  private readonly TTL: number // Time to live in milliseconds

  private constructor() {
    this.cache = new Map()
    this.TTL = 1000 * 60 * 60 * 24 // 24 hours
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache()
    }
    return Cache.instance
  }

  public set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  public get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  public clear(): void {
    this.cache.clear()
  }
}

export const cache = Cache.getInstance() 