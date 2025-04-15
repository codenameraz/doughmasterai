interface CacheItem {
  value: string;
  expiry: number;
}

export class MemoryCache {
  private cache: Map<string, CacheItem>;
  private readonly PREFIX: string;
  private readonly DEFAULT_TTL: number;

  constructor(prefix: string = 'cache:', defaultTTL: number = 3600) {
    this.cache = new Map();
    this.PREFIX = prefix;
    this.DEFAULT_TTL = defaultTTL;
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  public get<T>(key: string): T | null {
    const cacheKey = this.PREFIX + key;
    const item = this.cache.get(cacheKey);
    
    if (!item) return null;
    
    // Check if the item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    try {
      // If it's already a string, try to parse it
      if (typeof item.value === 'string') {
        return JSON.parse(item.value) as T;
      }
      // If it's not a string, stringify then parse to ensure proper JSON
      return JSON.parse(JSON.stringify(item.value)) as T;
    } catch (e) {
      console.error('Failed to parse memory cache result:', e);
      return null;
    }
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time to live in seconds (optional)
   */
  public set(key: string, value: any, ttl?: number): void {
    const cacheKey = this.PREFIX + key;
    const expiration = ttl || this.DEFAULT_TTL;
    
    // Ensure value is a properly formatted JSON string
    const valueToStore = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);
    
    // Validate JSON structure before storing
    try {
      JSON.parse(valueToStore);
    } catch (e) {
      console.error('Invalid JSON structure for cache:', e);
      return;
    }
    
    this.cache.set(cacheKey, {
      value: valueToStore,
      expiry: Date.now() + (expiration * 1000)
    });
  }
} 