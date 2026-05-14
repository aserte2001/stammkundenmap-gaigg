import * as THREE from "three";
import { Ellipsoid } from "3d-tiles-renderer";

/**
 * WGS84-Ellipsoid singleton — re-used for every coordinate conversion to avoid
 * allocating a fresh Ellipsoid per call. Three.js Ellipsoid radii are the same
 * as Cesium's WGS84 default (a=6378137, b=6378137, c=6356752.3142).
 */
export const WGS84 = new Ellipsoid(6378137, 6378137, 6356752.3142451793);

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export type GeoPoint = {
  lat: number;
  lng: number;
  alt: number;
};

/**
 * Convert lat/lng/alt (degrees, metres) to ECEF (Earth-Centred-Earth-Fixed)
 * Three.js Vector3. Writes into `target` if provided to avoid GC churn.
 */
export function latLngAltToECEF(
  lat: number,
  lng: number,
  alt: number,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  WGS84.getCartographicToPosition(lat * DEG2RAD, lng * DEG2RAD, alt, target);
  return target;
}

/**
 * Inverse: ECEF Vector3 → lat/lng/alt in degrees + metres.
 */
export function ecefToLatLngAlt(pos: THREE.Vector3): GeoPoint {
  const out: { lat: number; lon: number; height: number } = {
    lat: 0,
    lon: 0,
    height: 0,
  };
  WGS84.getPositionToCartographic(pos, out);
  return {
    lat: out.lat * RAD2DEG,
    lng: out.lon * RAD2DEG,
    alt: out.height,
  };
}

/**
 * Compute the local East-North-Up (ENU) basis at a given geographic point.
 * Useful for converting a walker's WASD intention into world-space velocity.
 */
export function getENUBasis(
  lat: number,
  lng: number,
): { east: THREE.Vector3; north: THREE.Vector3; up: THREE.Vector3 } {
  const east = new THREE.Vector3();
  const north = new THREE.Vector3();
  const up = new THREE.Vector3();
  WGS84.getEastNorthUpAxes(lat * DEG2RAD, lng * DEG2RAD, east, north, up);
  return { east, north, up };
}

/**
 * Offset a geo-point by a vector expressed in tangent-space metres
 * (east, north, up).
 */
export function offsetGeo(
  origin: GeoPoint,
  meters: { east: number; north: number; up: number },
): GeoPoint {
  const originPos = latLngAltToECEF(origin.lat, origin.lng, origin.alt);
  const { east, north, up } = getENUBasis(origin.lat, origin.lng);
  const dest = originPos
    .clone()
    .addScaledVector(east, meters.east)
    .addScaledVector(north, meters.north)
    .addScaledVector(up, meters.up);
  return ecefToLatLngAlt(dest);
}

/**
 * Spawn pose helper: drop a walker `metersDistance` to the south-east of the
 * target customer at `elevation` above the ellipsoid, facing the target.
 */
export function spawnPoseSouthEast(
  target: GeoPoint,
  metersDistance: number,
  elevation: number,
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  // South-east = +east, -north
  const offset = offsetGeo(
    { ...target, alt: 0 },
    {
      east: metersDistance * Math.SQRT1_2,
      north: -metersDistance * Math.SQRT1_2,
      up: elevation,
    },
  );
  const position = latLngAltToECEF(offset.lat, offset.lng, offset.alt);
  const lookAt = latLngAltToECEF(target.lat, target.lng, target.alt + 8);
  return { position, lookAt };
}

/**
 * Approx great-circle distance in metres between two geo-points
 * (Haversine on the WGS84 mean radius).
 */
const EARTH_MEAN_RADIUS_M = 6_371_008.8;
export function geoDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLng = (b.lng - a.lng) * DEG2RAD;
  const aLatR = a.lat * DEG2RAD;
  const bLatR = b.lat * DEG2RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLatR) * Math.cos(bLatR) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
