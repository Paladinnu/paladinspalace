// @ts-ignore - types provided by ioredis when installed
import Redis from 'ioredis';

// Simple token bucket / sliding window hybrid using Redis INCR + PX TTL.
// Fallback to in-memory if REDIS_URL not provided.

export interface RateLimitOptions {
  key: string;            // unique key per user/action
  limit: number;          // max count within window
  windowMs: number;       // window size in ms
}

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  redis.on('error', (e: any) => {
    console.error('Redis error, falling back to memory:', (e as Error).message);
  });
}

// In-memory fallback (resets on deploy)
const memoryBuckets: Record<string, { count: number; reset: number }> = {};

export async function rateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<{ allowed: boolean; remaining: number; reset: number; }> {
  if (redis) {
    try {
      const now = Date.now();
      const windowKey = `rl:${key}`;
      const ttlMs = windowMs;
      // Use multi: INCR and set PX if first hit
      const count = await redis.incr(windowKey);
      if (count === 1) {
        await redis.pexpire(windowKey, ttlMs);
      }
      const ttl = await redis.pttl(windowKey);
      const remaining = Math.max(0, limit - count);
      return { allowed: count <= limit, remaining, reset: now + (ttl > 0 ? ttl : ttlMs), };
    } catch (e) {
      // fall through to memory
      console.warn('Redis rate limit fallback:', (e as Error).message);
    }
  }
  const now = Date.now();
  const bucket = memoryBuckets[key] || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  memoryBuckets[key] = bucket;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), reset: bucket.reset };
}
