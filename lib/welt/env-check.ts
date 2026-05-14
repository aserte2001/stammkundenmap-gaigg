import { clientEnv, hasGoogleTiles, hasOpenAI, serverEnv } from "@/lib/env";

export type WeltEnvStatus = {
  googleTiles: boolean;
  openai: boolean;
  mapbox: boolean;
};

export function getWeltEnvStatus(): WeltEnvStatus {
  return {
    googleTiles: hasGoogleTiles(),
    openai: hasOpenAI(),
    mapbox: Boolean(clientEnv.mapboxToken),
  };
}

/**
 * Server-side full readiness probe. Includes blob-store availability for cache.
 */
export function getServerWeltEnvStatus() {
  return {
    ...getWeltEnvStatus(),
    blobStore: Boolean(serverEnv.blobReadWriteToken),
  };
}
