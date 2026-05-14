import { describe, expect, it } from "vitest";
import {
  detectTierFromUserAgent,
  getTilesConfigForTier,
} from "@/lib/welt/tiles-config";

describe("tiles-config tier detection", () => {
  it("falls back to low tier without WebGL2", () => {
    const tier = detectTierFromUserAgent({
      hardwareConcurrency: 32,
      hasWebGL2: false,
      isCoarsePointer: false,
      deviceMemoryGB: 16,
    });
    expect(tier).toBe("low");
  });

  it("desktop with rich hardware → high", () => {
    const tier = detectTierFromUserAgent({
      hardwareConcurrency: 16,
      hasWebGL2: true,
      isCoarsePointer: false,
      deviceMemoryGB: 16,
    });
    expect(tier).toBe("high");
  });

  it("phone with limited hardware → low", () => {
    const tier = detectTierFromUserAgent({
      hardwareConcurrency: 4,
      hasWebGL2: true,
      isCoarsePointer: true,
      deviceMemoryGB: 4,
    });
    expect(tier).toBe("low");
  });

  it("phone with high-end hardware → balanced", () => {
    const tier = detectTierFromUserAgent({
      hardwareConcurrency: 8,
      hasWebGL2: true,
      isCoarsePointer: true,
      deviceMemoryGB: 8,
    });
    expect(tier).toBe("balanced");
  });

  it("config is internally consistent (errorTarget grows as tier shrinks)", () => {
    expect(getTilesConfigForTier("high").errorTarget).toBeLessThan(
      getTilesConfigForTier("balanced").errorTarget,
    );
    expect(getTilesConfigForTier("balanced").errorTarget).toBeLessThan(
      getTilesConfigForTier("low").errorTarget,
    );
  });

  it("low tier shrinks lru cache", () => {
    expect(getTilesConfigForTier("low").lruMaxSize).toBeLessThan(
      getTilesConfigForTier("high").lruMaxSize,
    );
  });
});
