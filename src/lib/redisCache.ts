import { Redis } from '@upstash/redis';

/**
 * Redis-based cache implementation for server-side API responses
 * Used to reduce API calls and improve performance
 */
class RedisCache {
  private redis: Redis;
  private readonly DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds
  private readonly PREFIX = 'recipe-cache:';

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    });
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.PREFIX + key;
      const result = await this.redis.get(cacheKey);
      return result as T || null;
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
    try {
      const cacheKey = this.PREFIX + key;
      const expiration = ttl || this.DEFAULT_TTL;
      await this.redis.set(cacheKey, value, { ex: expiration });
    } catch (error) {
      console.error('Redis cache set error:', error);
    }
  }

  /**
   * Delete a value from the cache
   * @param key The cache key
   */
  async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.PREFIX + key;
      await this.redis.del(cacheKey);
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
    try {
      const cacheKey = this.PREFIX + key;
      return await this.redis.exists(cacheKey) > 0;
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
    try {
      const cacheKey = this.PREFIX + key;
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      console.error('Redis cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Clear all cache entries with the prefix
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }
}

// Singleton instance
export const redisCache = new RedisCache(); 