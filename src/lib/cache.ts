import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Redis environment variables not set')
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key)
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  async set(key: string, value: string, expirySeconds: number): Promise<void> {
    try {
      await redis.set(key, value, { ex: expirySeconds })
    } catch (error) {
      console.error('Cache set error:', error)
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }
} 