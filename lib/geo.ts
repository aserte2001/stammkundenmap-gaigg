export type LngLat = [number, number];
export type BBox = [number, number, number, number]; // [west, south, east, north]

export const LINZ_CENTER: LngLat = [14.2858, 48.3069];
export const LINZ_DEFAULT_ZOOM = 11;

const EARTH_RADIUS_M = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: LngLat, b: LngLat): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function boundsFromPoints(points: LngLat[], padding = 0.01): BBox {
  if (points.length === 0) {
    return [
      LINZ_CENTER[0] - padding,
      LINZ_CENTER[1] - padding,
      LINZ_CENTER[0] + padding,
      LINZ_CENTER[1] + padding,
    ];
  }
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of points) {
    if (lon < west) west = lon;
    if (lat < south) south = lat;
    if (lon > east) east = lon;
    if (lat > north) north = lat;
  }
  return [west - padding, south - padding, east + padding, north + padding];
}

export function bboxContains(box: BBox, point: LngLat): boolean {
  const [west, south, east, north] = box;
  const [lon, lat] = point;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

export function bboxCenter(box: BBox): LngLat {
  const [west, south, east, north] = box;
  return [(west + east) / 2, (south + north) / 2];
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
