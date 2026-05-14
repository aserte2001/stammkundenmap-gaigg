import { afterEach, describe, expect, it } from "vitest";
import { __resetRateLimits, checkRateLimit } from "@/lib/openai/rate-limit";

describe("rate limit", () => {
  afterEach(() => {
    __resetRateLimits();
  });

  it("first call is OK with full remaining quota", () => {
    const verdict = checkRateLimit("ip", { windowMs: 1000, max: 3 });
    expect(verdict.ok).toBe(true);
    expect(verdict.remaining).toBe(2);
  });

  it("fourth call inside the window is rejected", () => {
    const opts = { windowMs: 5_000, max: 3 };
    checkRateLimit("ip", opts);
    checkRateLimit("ip", opts);
    checkRateLimit("ip", opts);
    const verdict = checkRateLimit("ip", opts);
    expect(verdict.ok).toBe(false);
    expect(verdict.remaining).toBe(0);
  });

  it("resets after the window elapses", async () => {
    const opts = { windowMs: 30, max: 1 };
    expect(checkRateLimit("ip", opts).ok).toBe(true);
    expect(checkRateLimit("ip", opts).ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(checkRateLimit("ip", opts).ok).toBe(true);
  });

  it("different keys do not share buckets", () => {
    const opts = { windowMs: 1_000, max: 1 };
    expect(checkRateLimit("a", opts).ok).toBe(true);
    expect(checkRateLimit("a", opts).ok).toBe(false);
    expect(checkRateLimit("b", opts).ok).toBe(true);
  });
});
