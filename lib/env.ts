/**
 * Centralised env-var access. Server-only secrets stay server-side;
 * `NEXT_PUBLIC_*` keys are inlined at build time and safe for client code.
 */

function readClientEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value || value.trim().length === 0) return undefined;
  return value.trim();
}

function readServerEnv(key: string): string | undefined {
  // Next.js never inlines non-NEXT_PUBLIC_ env vars into the client bundle,
  // so reading directly is safe — `process.env` is undefined in the browser.
  const value = typeof process !== "undefined" ? process.env[key] : undefined;
  if (!value || value.trim().length === 0) return undefined;
  return value.trim();
}

export const clientEnv = {
  mapboxToken: readClientEnv("NEXT_PUBLIC_MAPBOX_TOKEN"),
  googleMapsApiKey: readClientEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
} as const;

export const serverEnv = {
  openaiApiKey: readServerEnv("OPENAI_API_KEY"),
  blobReadWriteToken: readServerEnv("BLOB_READ_WRITE_TOKEN"),
  openaiDailyBudgetUsd: readServerEnv("OPENAI_DAILY_BUDGET_USD"),
  googleTilesDailySessionCap: readServerEnv("GOOGLE_TILES_DAILY_SESSION_CAP"),
} as const;

export function hasGoogleTiles(): boolean {
  return Boolean(clientEnv.googleMapsApiKey);
}

export function hasOpenAI(): boolean {
  return Boolean(serverEnv.openaiApiKey);
}

export function hasBlobStore(): boolean {
  return Boolean(serverEnv.blobReadWriteToken);
}

export function getOpenAIDailyBudgetUsd(): number {
  const raw = serverEnv.openaiDailyBudgetUsd;
  const parsed = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

export function getGoogleTilesDailySessionCap(): number {
  const raw = serverEnv.googleTilesDailySessionCap;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
}
