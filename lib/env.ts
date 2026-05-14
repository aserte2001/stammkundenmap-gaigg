/**
 * Centralised env-var access. Server-only secrets stay server-side;
 * `NEXT_PUBLIC_*` keys are inlined at build time and safe for client code.
 *
 * CRITICAL: Next.js / Turbopack only inlines `process.env.<LITERAL>` — dynamic
 * lookups like `process.env[key]` survive to runtime, where the browser sees
 * an empty `process.env` and we get `undefined`. So every `NEXT_PUBLIC_*` read
 * MUST be a literal property access on `process.env`.
 */

function normaliseEnv(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) return undefined;
  return value.trim();
}

export const clientEnv = {
  mapboxToken: normaliseEnv(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
  googleMapsApiKey: normaliseEnv(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
} as const;

export const serverEnv = {
  openaiApiKey: normaliseEnv(process.env.OPENAI_API_KEY),
  blobReadWriteToken: normaliseEnv(process.env.BLOB_READ_WRITE_TOKEN),
  openaiDailyBudgetUsd: normaliseEnv(process.env.OPENAI_DAILY_BUDGET_USD),
  googleTilesDailySessionCap: normaliseEnv(process.env.GOOGLE_TILES_DAILY_SESSION_CAP),
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
