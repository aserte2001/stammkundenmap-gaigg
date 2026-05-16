import { describe, expect, it } from "vitest";
import { compressImage, scaledDimensions } from "../capture/image";

describe("scaledDimensions", () => {
  it("returns the input unchanged when within max edge", () => {
    expect(scaledDimensions(800, 600, 2048)).toEqual({ width: 800, height: 600 });
    expect(scaledDimensions(2048, 1024, 2048)).toEqual({ width: 2048, height: 1024 });
  });

  it("scales down preserving aspect ratio when either edge exceeds max", () => {
    expect(scaledDimensions(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledDimensions(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("rounds to whole pixels", () => {
    const r = scaledDimensions(4001, 3001, 2000);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
  });

  it("handles degenerate inputs gracefully", () => {
    expect(scaledDimensions(0, 0, 100)).toEqual({ width: 0, height: 0 });
    expect(scaledDimensions(-1, 5, 100)).toEqual({ width: -1, height: 5 });
  });
});

describe("compressImage", () => {
  it("returns a Blob even when canvas APIs are mocked", async () => {
    // jsdom does not support createImageBitmap or canvas drawing properly;
    // we patch enough to verify the pipeline handles a normal flow.
    const fakeBitmap = { width: 4000, height: 3000, close: () => {} } as unknown as ImageBitmap;
    const originalCreate = (
      globalThis as { createImageBitmap?: typeof createImageBitmap }
    ).createImageBitmap;
    (globalThis as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap = (() =>
      Promise.resolve(fakeBitmap)) as typeof createImageBitmap;

    const expected = new Blob(["compressed"], { type: "image/jpeg" });
    class FakeOffscreen {
      width: number;
      height: number;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return { drawImage: () => {} };
      }
      convertToBlob() {
        return Promise.resolve(expected);
      }
    }
    const originalOffscreen = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    (globalThis as { OffscreenCanvas: unknown }).OffscreenCanvas = FakeOffscreen;

    try {
      const out = await compressImage(new Blob(["raw"], { type: "image/jpeg" }), {
        maxEdge: 2000,
      });
      expect(out).toBe(expected);
    } finally {
      (globalThis as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap =
        originalCreate;
      (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = originalOffscreen;
    }
  });
});
