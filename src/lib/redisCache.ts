import { Redis } from '@upstash/redis';

/**
 * Redis-based cache implementation for server-side API responses
 * Used to reduce API calls and improve performance
 */
class RedisCache {
  private redis: Redis | null = null;
  private readonly DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds
  private readonly PREFIX = 'recipe-cache:';
  private isConnected = false;
  private connectionAttempted = false;

  constructor() {
    // Defer Redis connection until first use
    this.initRedisConnection();
  }

  /**
   * Initialize Redis connection lazily
   */
  private initRedisConnection() {
    // Skip if already attempted
    if (this.connectionAttempted) {
      return;
    }

    this.connectionAttempted = true;
    
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      
      if (!url || !token) {
        console.warn('Redis cache disabled: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
        return;
      }
      
      this.redis = new Redis({
        url,
        token,
        automaticDeserialization: false, // Disable auto deserialization to handle manually
        retry: {
          retries: 3,
          backoff: (retryCount) => Math.min(Math.exp(retryCount) * 100, 3000),
        }
      });
      
      this.isConnected = true;
      console.log('Redis cache connected');
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.redis = null;
    }
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable()) {
      return null;
    }
    
    try {
      const cacheKey = this.PREFIX + key;
      const result = await this.redis!.get(cacheKey);
      
      if (!result) return null;
      
      // Handle the result manually to avoid JSON parsing errors
      if (typeof result === 'string') {
        try {
          return JSON.parse(result) as T;
        } catch (e) {
          return result as unknown as T;
        }
      }
      
      return result as T;
    } catch (error) {
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isRedisAvailable()) {
      return;
    }
    
    try {
      const cacheKey = this.PREFIX + key;
      const expiration = ttl || this.DEFAULT_TTL;
      
      // Ensure value is a string to avoid serialization issues
      const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
      
      await this.redis!.set(cacheKey, valueToStore, { ex: expiration });
    } catch (error) {
      console.error('Redis cache set error:', error);
    }
  }

  /**
   * Delete a value from the cache
   * @param key The cache key
   */
  async delete(key: string): Promise<void> {
    if (!this.isRedisAvailable()) {
      return;
    }
    
    try {
      const cacheKey = this.PREFIX + key;
      await this.redis!.del(cacheKey);
    } catch (error) {
      console.error('Redis cache delete error:', error);
    }
  }

  /**
   * Check if a key exists in the cache
   * @param key The cache key
   * @returns True if the key exists, false otherwise
   */
  async has(key: string): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }
    
    try {
      const cacheKey = this.PREFIX + key;
      return await this.redis!.exists(cacheKey) > 0;
    } catch (error) {
      console.error('Redis cache has error:', error);
      return false;
    }
  }

  /**
   * Get the TTL of a key in the cache
   * @param key The cache key
   * @returns The TTL in seconds or -1 if the key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    if (!this.isRedisAvailable()) {
      return -1;
    }
    
    try {
      const cacheKey = this.PREFIX + key;
      return await this.redis!.ttl(cacheKey);
    } catch (error) {
      console.error('Redis cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Clear all cache entries with the prefix
   */
  async clear(): Promise<void> {
    if (!this.isRedisAvailable()) {
      return;
    }
    
    try {
      const keys = await this.redis!.keys(`${this.PREFIX}*`);
      if (keys.length > 0) {
        await this.redis!.del(...keys);
      }
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }
  
  /**
   * Check if Redis is available
   * @returns True if Redis is available, false otherwise
   */
  private isRedisAvailable(): boolean {
    // Try to initialize Redis if not already done
    if (!this.connectionAttempted) {
      this.initRedisConnection();
    }
    return this.redis !== null && this.isConnected;
  }
  
  /**
   * Check if Redis is connected and working
   * @returns True if connected, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }
    
    try {
      const testKey = `${this.PREFIX}health_check`;
      await this.redis!.set(testKey, 'ok', { ex: 5 }); // 5 second expiry
      const result = await this.redis!.get(testKey);
      return result === 'ok';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const redisCache = new RedisCache(); 