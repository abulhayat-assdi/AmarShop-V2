import { redis } from "@/lib/redis";

// Fixed-window limiter backed by Redis: INCR the key, set its TTL on the
// first hit of a window, reject once the count passes `limit`.
//
// Fail-open: if Redis is unreachable the caller still proceeds (a public
// page must not 500 because the limiter blinked). The trade-off — a Redis
// outage disables rate limiting — is acceptable for the surfaces this
// guards (order lookup), not for anything security-critical.
export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowSeconds: number }
): Promise<{ ok: boolean; retryAfter: number }> {
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, opts.windowSeconds);
    }
    if (count > opts.limit) {
      const ttl = await redis.ttl(redisKey);
      return { ok: false, retryAfter: ttl > 0 ? ttl : opts.windowSeconds };
    }
    return { ok: true, retryAfter: 0 };
  } catch (err) {
    console.warn(`[rate-limit] Redis unavailable, allowing "${key}"`, err);
    return { ok: true, retryAfter: 0 };
  }
}
