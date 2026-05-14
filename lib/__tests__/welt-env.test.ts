import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

async function loadEnvModule() {
  return await import("@/lib/welt/env-check");
}

describe("welt env-check", () => {
  it("reports googleTiles=true when key is set", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test";
    vi.resetModules();
    const { getWeltEnvStatus } = await loadEnvModule();
    const status = getWeltEnvStatus();
    expect(status.googleTiles).toBe(true);
    expect(status.openai).toBe(true);
    expect(status.mapbox).toBe(true);
  });

  it("reports false when keys are blank", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "";
    process.env.OPENAI_API_KEY = "   ";
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = undefined;
    vi.resetModules();
    const { getWeltEnvStatus } = await loadEnvModule();
    const status = getWeltEnvStatus();
    expect(status.googleTiles).toBe(false);
    expect(status.openai).toBe(false);
    expect(status.mapbox).toBe(false);
  });

  it("partial availability is reported truthfully", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "k";
    process.env.OPENAI_API_KEY = "";
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test";
    vi.resetModules();
    const { getWeltEnvStatus } = await loadEnvModule();
    const status = getWeltEnvStatus();
    expect(status.googleTiles).toBe(true);
    expect(status.openai).toBe(false);
    expect(status.mapbox).toBe(true);
  });
});
