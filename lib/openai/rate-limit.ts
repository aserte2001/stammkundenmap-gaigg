/**
 * Very small in-memory rate limiter. Lives in module scope so it survives
 * subsequent invocations of the same serverless instance; falls back to a
 * fresh window on cold-start which is acceptable for the demo.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const BUCKETS = new Map<string, Bucket>();

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export const DEFAULT_LIMIT: RateLimitOptions = {
  windowMs: 60_000,
  max: 3,
};

export type RateLimitVerdict = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(key: string, opts: RateLimitOptions = DEFAULT_LIMIT): RateLimitVerdict {
  const now = Date.now();
  const existing = BUCKETS.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + opts.windowMs };
    BUCKETS.set(key, bucket);
    return { ok: true, remaining: opts.max - 1, resetAt: bucket.resetAt };
  }
  if (existing.count >= opts.max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true, remaining: opts.max - existing.count, resetAt: existing.resetAt };
}

export function __resetRateLimits() {
  BUCKETS.clear();
}
