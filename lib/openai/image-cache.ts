import { serverEnv } from "@/lib/env";

type CachedEntry = {
  dataUrl: string;
  promptUsed: string;
  createdAt: number;
};

const MEMORY_CACHE = new Map<string, CachedEntry>();
const MAX_ENTRIES = 64;

export function getCacheKey(customerId: string, style: string, season: string): string {
  return `vision::${customerId}::${style}::${season}::v1`;
}

export async function readCache(key: string): Promise<CachedEntry | null> {
  if (serverEnv.blobReadWriteToken) {
    try {
      const { list } = await import("@vercel/blob");
      const result = await list({
        prefix: `${key}`,
        token: serverEnv.blobReadWriteToken,
      });
      const blob = result.blobs.find((b) => b.pathname === key);
      if (blob) {
        return {
          dataUrl: blob.url,
          promptUsed: blob.pathname,
          createdAt: blob.uploadedAt ? blob.uploadedAt.getTime() : Date.now(),
        };
      }
    } catch (error) {
      console.warn("[vision] Blob cache miss", error);
    }
  }
  return MEMORY_CACHE.get(key) ?? null;
}

export async function writeCache(key: string, entry: CachedEntry): Promise<void> {
  if (serverEnv.blobReadWriteToken && entry.dataUrl.startsWith("data:")) {
    try {
      const { put } = await import("@vercel/blob");
      const base64 = entry.dataUrl.split(",")[1] ?? "";
      const buffer = Buffer.from(base64, "base64");
      const uploaded = await put(key, buffer, {
        access: "public",
        contentType: "image/png",
        token: serverEnv.blobReadWriteToken,
      });
      MEMORY_CACHE.set(key, { ...entry, dataUrl: uploaded.url });
      return;
    } catch (error) {
      console.warn("[vision] Blob cache write failed, falling back to memory", error);
    }
  }
  if (MEMORY_CACHE.size >= MAX_ENTRIES) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    if (firstKey) MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(key, entry);
}

export function __clearVisionCache() {
  MEMORY_CACHE.clear();
}
