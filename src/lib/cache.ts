type CacheEntry = {
  value: any
  timestamp: number
  ttl?: number // Optional custom TTL for each entry
}

class Cache {
  private static instance: Cache
  private cache: Map<string, CacheEntry>
  private readonly DEFAULT_TTL: number // Default TTL in milliseconds
  private readonly CACHE_CLEANUP_INTERVAL: number // Interval for cleaning expired entries
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.cache = new Map()
    this.DEFAULT_TTL = 1000 * 60 * 60 * 24 // 24 hours by default
    this.CACHE_CLEANUP_INTERVAL = 1000 * 60 * 15 // Clean up every 15 minutes
    
    // Initialize with saved cache if in a browser environment
    this.loadFromStorage()
    
    // Start the cleanup interval
    this.startCleanupInterval()
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache()
    }
    return Cache.instance
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param customTTL Optional TTL in seconds (will be converted to milliseconds)
   */
  public async set(key: string, value: any, customTTL?: number): Promise<void> {
    const ttl = customTTL ? customTTL * 1000 : this.DEFAULT_TTL;
    
    let safeValue;
    
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        safeValue = value;
      } catch (e) {
        safeValue = JSON.stringify(value);
      }
    } else {
      safeValue = JSON.stringify(value);
    }
    
    const entry: CacheEntry = {
      value: safeValue,
      timestamp: Date.now(),
      ttl
    }
    
    // Set in memory cache immediately
    this.cache.set(key, entry);
    
    // Save to storage in the background
    Promise.resolve().then(() => {
      this.saveToStorage();
    });
  }

  public async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = entry.ttl || this.DEFAULT_TTL;
    
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      // Save to storage in the background
      Promise.resolve().then(() => {
        this.saveToStorage();
      });
      return null;
    }

    if (typeof entry.value === 'string') {
      try {
        return JSON.parse(entry.value);
      } catch (e) {
        console.error('Failed to parse cache value:', e);
        return null;
      }
    }
    
    return entry.value;
  }

  public getWithTimestamp(key: string): { value: any, age: number } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const ttl = entry.ttl || this.DEFAULT_TTL
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key)
      this.saveToStorage()
      return null
    }

    return {
      value: entry.value,
      age: Date.now() - entry.timestamp
    }
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const ttl = entry.ttl || this.DEFAULT_TTL
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key)
      this.saveToStorage()
      return false
    }

    return true
  }

  public delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.saveToStorage()
    }
    return result
  }

  public clear(): void {
    this.cache.clear()
    this.saveToStorage()
  }

  private cleanup(): void {
    const now = Date.now()
    let hasChanges = false
    
    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.ttl || this.DEFAULT_TTL
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key)
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      this.saveToStorage()
    }
  }

  private startCleanupInterval(): void {
    if (typeof window !== 'undefined' && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, this.CACHE_CLEANUP_INTERVAL)
    }
  }

  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const serialized: Record<string, CacheEntry> = {}
        this.cache.forEach((value, key) => {
          serialized[key] = value
        })
        localStorage.setItem('app_cache', JSON.stringify(serialized))
      } catch (error) {
        console.error('Error saving cache to localStorage:', error)
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const serialized = localStorage.getItem('app_cache')
        if (serialized) {
          const parsed = JSON.parse(serialized) as Record<string, CacheEntry>
          Object.entries(parsed).forEach(([key, entry]) => {
            this.cache.set(key, entry)
          })
          
          // Immediately clean up any expired entries
          this.cleanup()
        }
      } catch (error) {
        console.error('Error loading cache from localStorage:', error)
      }
    }
  }
}

export const cache = Cache.getInstance() 