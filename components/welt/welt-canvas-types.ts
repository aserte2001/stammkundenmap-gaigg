import type { GeoPoint } from "@/lib/welt/coordinates";

export type WeltTelemetry = {
  fps: number;
  altitude: number;
  headingDeg: number;
  position: GeoPoint;
  attribution: string;
  tilesLoaded: number;
};

export type WeltCanvasHandle = {
  flyToHotspot(hotspotId: string): void;
  recenter(): void;
};
