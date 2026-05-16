/**
 * Persistent customer→splat mapping. Stored as a single JSON blob in Vercel
 * Blob (`splat-mappings.json`) so we get atomic read-modify-write without
 * spinning up a database for ~25 customers.
 *
 * Local dev falls back to a JSON file in `.cache/splat-mappings.json`.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { del, head, list, put } from "@vercel/blob";

const BLOB_PATHNAME = "stammkundenmap/splat-mappings.json";
const LOCAL_CACHE = path.join(process.cwd(), ".cache", "splat-mappings.json");
const CACHE_TTL_MS = 60_000;

/**
 * `vercel_blob_rw_...` is the placeholder shipped in `.env.example` —
 * a real token is ~50 chars and contains no ellipsis. Falling back to the
 * local file cache when the token is obviously fake keeps `next dev` working
 * without needing a Vercel Blob store provisioned.
 */
function hasRealBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  if (token.includes("...")) return false;
  if (token.length < 30) return false;
  return true;
}

export type WorldEntry = {
  id: string;
  label: string;
  operationId: string;
  marbleWorldId: string | null;
  splatUrl: string | null;
  splatUrl500k: string | null;
  splatUrl100k: string | null;
  thumbnail: string | null;
  panorama: string | null;
  createdAt: string;
};

export type SplatMappingStatus = "none" | "processing" | "ready" | "failed";

export type SplatMapping = {
  status: SplatMappingStatus;
  worlds: WorldEntry[];
  pendingOperationIds: string[];
  errorMessage?: string;
  startedAt?: string;
  updatedAt: string;
};

export type SplatStore = Record<string, SplatMapping>;

let cache: { data: SplatStore; loadedAt: number } | null = null;

async function readBlob(): Promise<SplatStore> {
  if (hasRealBlobToken()) {
    try {
      const items = await list({ prefix: BLOB_PATHNAME });
      const match = items.blobs.find((b) => b.pathname === BLOB_PATHNAME);
      if (!match) return {};
      const res = await fetch(match.url, { cache: "no-store" });
      if (!res.ok) return {};
      return (await res.json()) as SplatStore;
    } catch (err) {
      console.error("splat-store readBlob failed", err);
      return {};
    }
  }
  // Local dev fallback
  try {
    const text = await fs.readFile(LOCAL_CACHE, "utf8");
    return JSON.parse(text) as SplatStore;
  } catch {
    return {};
  }
}

async function writeBlob(store: SplatStore): Promise<void> {
  if (hasRealBlobToken()) {
    try {
      await put(BLOB_PATHNAME, JSON.stringify(store, null, 2), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
        allowOverwrite: true,
      });
      return;
    } catch (err) {
      console.error("splat-store writeBlob failed", err);
      throw err;
    }
  }
  await fs.mkdir(path.dirname(LOCAL_CACHE), { recursive: true });
  await fs.writeFile(LOCAL_CACHE, JSON.stringify(store, null, 2), "utf8");
}

export async function getSplatMappings(forceFresh = false): Promise<SplatStore> {
  if (!forceFresh && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  const data = await readBlob();
  cache = { data, loadedAt: Date.now() };
  return data;
}

async function mutate(updater: (store: SplatStore) => SplatStore): Promise<SplatStore> {
  const current = await readBlob(); // always fresh on mutate
  const next = updater(structuredClone(current));
  await writeBlob(next);
  cache = { data: next, loadedAt: Date.now() };
  return next;
}

export async function getMappingForCustomer(customerId: string): Promise<SplatMapping> {
  const store = await getSplatMappings();
  return store[customerId] ?? defaultMapping();
}

export async function setMappingForCustomer(
  customerId: string,
  mapping: SplatMapping,
): Promise<void> {
  await mutate((store) => {
    store[customerId] = { ...mapping, updatedAt: new Date().toISOString() };
    return store;
  });
}

export async function markProcessing(
  customerId: string,
  operationId: string,
): Promise<void> {
  await mutate((store) => {
    const existing = store[customerId] ?? defaultMapping();
    const pending = new Set(existing.pendingOperationIds);
    pending.add(operationId);
    store[customerId] = {
      ...existing,
      status: existing.worlds.length > 0 ? existing.status : "processing",
      pendingOperationIds: [...pending],
      startedAt: existing.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (store[customerId].status !== "ready") {
      store[customerId].status = "processing";
    }
    return store;
  });
}

export async function addWorldToCustomer(
  customerId: string,
  world: WorldEntry,
  consumedOperationId: string | null,
): Promise<void> {
  await mutate((store) => {
    const existing = store[customerId] ?? defaultMapping();
    const pending = consumedOperationId
      ? existing.pendingOperationIds.filter((id) => id !== consumedOperationId)
      : existing.pendingOperationIds;
    const worlds = existing.worlds.filter((w) => w.id !== world.id);
    worlds.push(world);
    worlds.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    store[customerId] = {
      ...existing,
      status: pending.length > 0 ? "processing" : "ready",
      worlds,
      pendingOperationIds: pending,
      errorMessage: undefined,
      updatedAt: new Date().toISOString(),
    };
    return store;
  });
}

export async function markFailed(
  customerId: string,
  operationId: string,
  errorMessage: string,
): Promise<void> {
  await mutate((store) => {
    const existing = store[customerId] ?? defaultMapping();
    const pending = existing.pendingOperationIds.filter((id) => id !== operationId);
    const status: SplatMappingStatus =
      existing.worlds.length > 0 ? "ready" : pending.length > 0 ? "processing" : "failed";
    store[customerId] = {
      ...existing,
      status,
      pendingOperationIds: pending,
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
    return store;
  });
}

export async function deleteMappingForCustomer(customerId: string): Promise<void> {
  await mutate((store) => {
    delete store[customerId];
    return store;
  });
}

export async function clearAllMappings(): Promise<void> {
  if (hasRealBlobToken()) {
    try {
      const meta = await head(BLOB_PATHNAME);
      await del(meta.url);
    } catch {
      // already absent
    }
  } else {
    try {
      await fs.unlink(LOCAL_CACHE);
    } catch {
      // already absent
    }
  }
  cache = null;
}

export function defaultMapping(): SplatMapping {
  return {
    status: "none",
    worlds: [],
    pendingOperationIds: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function summarisePendingOps(store: SplatStore): Array<{
  customerId: string;
  operationId: string;
}> {
  const out: Array<{ customerId: string; operationId: string }> = [];
  for (const [customerId, mapping] of Object.entries(store)) {
    for (const op of mapping.pendingOperationIds) {
      out.push({ customerId, operationId: op });
    }
  }
  return out;
}
