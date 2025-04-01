import { rateLimit } from '@/lib/rate-limit'
import { Redis } from '@upstash/redis'

// Mock Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  })),
}))

describe('Rate Limiter', () => {
  let mockRedis: jest.Mocked<Redis>

  beforeEach(() => {
    mockRedis = new Redis({ url: 'fake-url', token: 'fake-token' }) as jest.Mocked<Redis>
    jest.clearAllMocks()
  })

  it('allows requests within rate limit', async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)

    const result = await rateLimit('test-ip', { interval: 60, limit: 5 })
    
    expect(result).toBeNull()
    expect(mockRedis.incr).toHaveBeenCalledWith('rate-limit:test-ip')
    expect(mockRedis.expire).toHaveBeenCalledWith('rate-limit:test-ip', 60)
  })

  it('blocks requests exceeding rate limit', async () => {
    mockRedis.incr.mockResolvedValue(6)
    mockRedis.ttl.mockResolvedValue(30)

    const result = await rateLimit('test-ip', { interval: 60, limit: 5 })
    
    expect(result).toBeDefined()
    expect(result?.status).toBe(429)
    expect(mockRedis.incr).toHaveBeenCalledWith('rate-limit:test-ip')
    expect(mockRedis.ttl).toHaveBeenCalledWith('rate-limit:test-ip')
  })

  it('sets expiry only on first request', async () => {
    mockRedis.incr.mockResolvedValue(2)

    await rateLimit('test-ip', { interval: 60, limit: 5 })
    
    expect(mockRedis.expire).not.toHaveBeenCalled()
  })
}) 