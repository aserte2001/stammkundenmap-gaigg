import { describe, expect, it } from "vitest";
import {
  bboxCenter,
  bboxContains,
  boundsFromPoints,
  formatDistance,
  haversineMeters,
  LINZ_CENTER,
  type LngLat,
} from "../geo";

const LINZ_HAUPTPLATZ: LngLat = [14.2858, 48.3069];
const POESTLINGBERG: LngLat = [14.2515, 48.3175];
const SOLAR_CITY: LngLat = [14.3782, 48.2335];

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(LINZ_HAUPTPLATZ, LINZ_HAUPTPLATZ)).toBe(0);
  });

  it("computes the distance Hauptplatz → Pöstlingberg (~2.8km)", () => {
    const distance = haversineMeters(LINZ_HAUPTPLATZ, POESTLINGBERG);
    expect(distance).toBeGreaterThan(2_000);
    expect(distance).toBeLessThan(4_000);
  });

  it("computes the distance Hauptplatz → Solar City (~10km)", () => {
    const distance = haversineMeters(LINZ_HAUPTPLATZ, SOLAR_CITY);
    expect(distance).toBeGreaterThan(8_000);
    expect(distance).toBeLessThan(13_000);
  });

  it("is symmetric", () => {
    const ab = haversineMeters(LINZ_HAUPTPLATZ, POESTLINGBERG);
    const ba = haversineMeters(POESTLINGBERG, LINZ_HAUPTPLATZ);
    expect(ab).toBeCloseTo(ba, 3);
  });
});

describe("boundsFromPoints", () => {
  it("returns Linz default bounds for empty point list", () => {
    const box = boundsFromPoints([]);
    expect(bboxContains(box, LINZ_CENTER)).toBe(true);
  });

  it("creates a bounding box containing every input point", () => {
    const box = boundsFromPoints([LINZ_HAUPTPLATZ, POESTLINGBERG, SOLAR_CITY]);
    expect(bboxContains(box, LINZ_HAUPTPLATZ)).toBe(true);
    expect(bboxContains(box, POESTLINGBERG)).toBe(true);
    expect(bboxContains(box, SOLAR_CITY)).toBe(true);
  });

  it("rejects points outside the bounding box", () => {
    const box = boundsFromPoints([LINZ_HAUPTPLATZ, POESTLINGBERG]);
    const farAway: LngLat = [10.0, 50.0];
    expect(bboxContains(box, farAway)).toBe(false);
  });
});

describe("bboxCenter", () => {
  it("returns the midpoint of a bounding box", () => {
    const center = bboxCenter([14.0, 48.0, 14.4, 48.4]);
    expect(center[0]).toBeCloseTo(14.2, 5);
    expect(center[1]).toBeCloseTo(48.2, 5);
  });
});

describe("formatDistance", () => {
  it("renders meters for distances under 1000", () => {
    expect(formatDistance(420)).toBe("420 m");
  });

  it("renders km with one decimal for medium distances", () => {
    expect(formatDistance(2_400)).toBe("2.4 km");
  });

  it("renders km without decimals for long distances", () => {
    expect(formatDistance(42_000)).toBe("42 km");
  });
});
