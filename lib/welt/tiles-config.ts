export const GOOGLE_TILES_ROOT = "https://tile.googleapis.com/v1/3dtiles/root.json";

export const ATTRIBUTION_SUFFIX = "© Google, © Linz Tourismus";

export type PerformanceTier = "high" | "balanced" | "low";

export type TileTierConfig = {
  errorTarget: number;
  maxDepth: number;
  lruMaxSize: number;
  parseQueueLimit: number;
  downloadQueueLimit: number;
};

const TIER_TABLE: Record<PerformanceTier, TileTierConfig> = {
  high: {
    errorTarget: 12,
    maxDepth: 24,
    lruMaxSize: 800,
    parseQueueLimit: 6,
    downloadQueueLimit: 12,
  },
  balanced: {
    errorTarget: 16,
    maxDepth: 22,
    lruMaxSize: 500,
    parseQueueLimit: 4,
    downloadQueueLimit: 8,
  },
  low: {
    errorTarget: 24,
    maxDepth: 18,
    lruMaxSize: 300,
    parseQueueLimit: 2,
    downloadQueueLimit: 4,
  },
};

export function getTilesConfigForTier(tier: PerformanceTier): TileTierConfig {
  return TIER_TABLE[tier];
}

export function detectTierFromUserAgent(opts: {
  hardwareConcurrency: number;
  hasWebGL2: boolean;
  isCoarsePointer: boolean;
  deviceMemoryGB?: number;
}): PerformanceTier {
  if (!opts.hasWebGL2) return "low";
  if (opts.isCoarsePointer) {
    if (opts.hardwareConcurrency >= 8 && (opts.deviceMemoryGB ?? 0) >= 6) return "balanced";
    return "low";
  }
  if (opts.hardwareConcurrency >= 8 && (opts.deviceMemoryGB ?? 4) >= 8) return "high";
  return "balanced";
}
