type RateLimitEntry = {
  count: number
  resetTime: number
}

class RateLimiter {
  private static instance: RateLimiter
  private limits: Map<string, RateLimitEntry>
  private readonly REQUESTS_PER_MINUTE = 20
  private readonly REQUESTS_PER_DAY = 200
  private readonly MINUTE = 60 * 1000 // 1 minute in milliseconds
  private readonly DAY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  private constructor() {
    this.limits = new Map()
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  public async checkRateLimit(identifier: string = 'default'): Promise<boolean> {
    const now = Date.now()
    const minuteKey = `${identifier}_minute`
    const dayKey = `${identifier}_day`

    // Clean up expired entries
    this.cleanup()

    // Check minute limit
    const minuteLimit = this.limits.get(minuteKey) || { count: 0, resetTime: now + this.MINUTE }
    if (now > minuteLimit.resetTime) {
      minuteLimit.count = 0
      minuteLimit.resetTime = now + this.MINUTE
    }
    if (minuteLimit.count >= this.REQUESTS_PER_MINUTE) {
      throw new Error('Rate limit exceeded: Too many requests per minute')
    }

    // Check day limit
    const dayLimit = this.limits.get(dayKey) || { count: 0, resetTime: now + this.DAY }
    if (now > dayLimit.resetTime) {
      dayLimit.count = 0
      dayLimit.resetTime = now + this.DAY
    }
    if (dayLimit.count >= this.REQUESTS_PER_DAY) {
      throw new Error('Rate limit exceeded: Daily request limit reached')
    }

    // Update counters
    minuteLimit.count++
    dayLimit.count++
    this.limits.set(minuteKey, minuteLimit)
    this.limits.set(dayKey, dayLimit)

    return true
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key)
      }
    }
  }

  public getRemainingRequests(identifier: string = 'default'): { minute: number; day: number } {
    const now = Date.now()
    const minuteLimit = this.limits.get(`${identifier}_minute`) || { count: 0, resetTime: now + this.MINUTE }
    const dayLimit = this.limits.get(`${identifier}_day`) || { count: 0, resetTime: now + this.DAY }

    return {
      minute: Math.max(0, this.REQUESTS_PER_MINUTE - minuteLimit.count),
      day: Math.max(0, this.REQUESTS_PER_DAY - dayLimit.count)
    }
  }
}

export const rateLimiter = RateLimiter.getInstance() 