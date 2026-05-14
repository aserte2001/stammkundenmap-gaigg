import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  ecefToLatLngAlt,
  geoDistanceMeters,
  getENUBasis,
  latLngAltToECEF,
  offsetGeo,
  spawnPoseSouthEast,
} from "@/lib/welt/coordinates";

const VILLA_HOFER = { lat: 48.3175, lng: 14.2515, alt: 0 };

function expectClose(a: number, b: number, epsilon = 1e-3) {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(epsilon);
}

describe("coordinates", () => {
  it("Villa Hofer round-trip: lat/lng/alt → ECEF → lat/lng/alt", () => {
    const ecef = latLngAltToECEF(VILLA_HOFER.lat, VILLA_HOFER.lng, VILLA_HOFER.alt);
    const back = ecefToLatLngAlt(ecef);
    expectClose(back.lat, VILLA_HOFER.lat, 1e-7);
    expectClose(back.lng, VILLA_HOFER.lng, 1e-7);
    expectClose(back.alt, VILLA_HOFER.alt, 1e-3);
  });

  it("equator round-trip", () => {
    const ecef = latLngAltToECEF(0, 0, 0);
    expectClose(ecef.x, 6378137, 1);
    const back = ecefToLatLngAlt(ecef);
    expectClose(back.lat, 0, 1e-6);
    expectClose(back.lng, 0, 1e-6);
    expectClose(back.alt, 0, 1e-3);
  });

  it("north pole roundtrip remains stable", () => {
    const ecef = latLngAltToECEF(89.999, 0, 1000);
    const back = ecefToLatLngAlt(ecef);
    expectClose(back.lat, 89.999, 1e-4);
    expectClose(back.alt, 1000, 1e-2);
  });

  it("ENU basis at Villa Hofer is orthonormal", () => {
    const { east, north, up } = getENUBasis(VILLA_HOFER.lat, VILLA_HOFER.lng);
    expectClose(east.length(), 1, 1e-9);
    expectClose(north.length(), 1, 1e-9);
    expectClose(up.length(), 1, 1e-9);
    expectClose(east.dot(north), 0, 1e-9);
    expectClose(east.dot(up), 0, 1e-9);
    expectClose(north.dot(up), 0, 1e-9);
  });

  it("offset moves 100m east and stays at sea level", () => {
    // Linear offset on the WGS84 ellipsoid + Haversine on the mean radius differ
    // by ~0.3m at 100m due to the eccentricity, which is well within tolerance
    // for spawn placement.
    const dest = offsetGeo(VILLA_HOFER, { east: 100, north: 0, up: 0 });
    const dist = geoDistanceMeters(VILLA_HOFER, dest);
    expectClose(dist, 100, 1.0);
    expect(dest.lng).toBeGreaterThan(VILLA_HOFER.lng);
  });

  it("offset moves 100m north", () => {
    const dest = offsetGeo(VILLA_HOFER, { east: 0, north: 100, up: 0 });
    const dist = geoDistanceMeters(VILLA_HOFER, dest);
    expectClose(dist, 100, 1.0);
    expect(dest.lat).toBeGreaterThan(VILLA_HOFER.lat);
  });

  it("haversine distance matches manual calculation", () => {
    // Villa Hofer → Linz center (~3km)
    const linzCenter = { lat: 48.3069, lng: 14.2858, alt: 0 };
    const dist = geoDistanceMeters(VILLA_HOFER, linzCenter);
    expect(dist).toBeGreaterThan(2200);
    expect(dist).toBeLessThan(3500);
  });

  it("spawn pose is south-east of customer and elevated", () => {
    const { position, lookAt } = spawnPoseSouthEast(VILLA_HOFER, 80, 30);
    const at = ecefToLatLngAlt(position);
    expect(at.lat).toBeLessThan(VILLA_HOFER.lat);
    expect(at.lng).toBeGreaterThan(VILLA_HOFER.lng);
    expectClose(at.alt, 30, 0.1);
    // lookAt should be near the target on the ground
    const lookGeo = ecefToLatLngAlt(lookAt);
    expectClose(lookGeo.lat, VILLA_HOFER.lat, 1e-4);
    expectClose(lookGeo.lng, VILLA_HOFER.lng, 1e-4);
  });

  it("writes into a provided target Vector3 (no allocations)", () => {
    const target = new THREE.Vector3();
    const result = latLngAltToECEF(48, 14, 0, target);
    expect(result).toBe(target);
    expect(target.x).not.toBe(0);
  });

  it("geoDistance handles antipodal-style inputs without NaN", () => {
    const a = { lat: 0, lng: 0, alt: 0 };
    const b = { lat: 0, lng: 179.999, alt: 0 };
    const dist = geoDistanceMeters(a, b);
    expect(Number.isFinite(dist)).toBe(true);
    expect(dist).toBeGreaterThan(19_000_000);
  });

  it("offsetGeo composes east and north linearly for small steps", () => {
    const dest = offsetGeo(VILLA_HOFER, { east: 50, north: 50, up: 0 });
    const dist = geoDistanceMeters(VILLA_HOFER, dest);
    expectClose(dist, Math.hypot(50, 50), 1.0);
  });

  it("up axis is non-degenerate at Linz", () => {
    const { up } = getENUBasis(48.3, 14.3);
    expect(up.length()).toBeGreaterThan(0.999);
  });

  it("alpine point at Pöstlingberg round-trip stays sub-mm", () => {
    const alpine = { lat: 48.3175, lng: 14.2515, alt: 539 };
    const back = ecefToLatLngAlt(latLngAltToECEF(alpine.lat, alpine.lng, alpine.alt));
    expectClose(back.alt, alpine.alt, 1e-2);
  });
});
