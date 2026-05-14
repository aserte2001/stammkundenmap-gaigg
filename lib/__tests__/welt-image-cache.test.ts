import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

describe("image cache", () => {
  it("caches and retrieves an entry from memory when blob token absent", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.resetModules();
    const { getCacheKey, readCache, writeCache, __clearVisionCache } = await import(
      "@/lib/openai/image-cache"
    );
    __clearVisionCache();
    const key = getCacheKey("c-001", "modern", "sommer");
    expect(await readCache(key)).toBeNull();
    await writeCache(key, {
      dataUrl: "data:image/png;base64,AAAA",
      promptUsed: "test",
      createdAt: 1,
    });
    const cached = await readCache(key);
    expect(cached?.dataUrl).toBe("data:image/png;base64,AAAA");
    expect(cached?.promptUsed).toBe("test");
  });

  it("evicts the oldest entry when LRU limit reached", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.resetModules();
    const { writeCache, readCache, __clearVisionCache, getCacheKey } = await import(
      "@/lib/openai/image-cache"
    );
    __clearVisionCache();
    for (let i = 0; i < 70; i += 1) {
      await writeCache(getCacheKey("c-001", "modern", `s${i}`), {
        dataUrl: `data:image/png;base64,${i}`,
        promptUsed: `${i}`,
        createdAt: i,
      });
    }
    // First entry should have been evicted by now (MAX_ENTRIES = 64).
    expect(await readCache(getCacheKey("c-001", "modern", "s0"))).toBeNull();
    expect(await readCache(getCacheKey("c-001", "modern", "s69"))).not.toBeNull();
  });

  it("builds a stable cache key", async () => {
    vi.resetModules();
    const { getCacheKey } = await import("@/lib/openai/image-cache");
    const key = getCacheKey("c-001", "modern", "sommer");
    expect(key).toBe("vision::c-001::modern::sommer::v1");
  });
});
