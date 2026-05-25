import { LINZ_CENTER, LINZ_DEFAULT_ZOOM } from "./geo";
import type { MapStyleKey } from "./store";

export const MAP_STYLES: Record<MapStyleKey, { id: string; label: string; style: string }> = {
  standard: {
    id: "standard",
    label: "Atmosphäre",
    style: "mapbox://styles/mapbox/standard",
  },
  "standard-satellite": {
    id: "standard-satellite",
    label: "Satellit",
    style: "mapbox://styles/mapbox/standard-satellite",
  },
};

export const FALLBACK_STYLE = "mapbox://styles/mapbox/streets-v12";

export const DEFAULT_VIEW = {
  center: LINZ_CENTER as [number, number],
  zoom: LINZ_DEFAULT_ZOOM,
  pitch: 50,
  bearing: -8,
} as const;

export const GLOBE_VIEW = {
  center: [12, 32] as [number, number],
  zoom: 0.8,
  pitch: 0,
  bearing: 0,
} as const;

export const MAPBOX_LIGHT_PRESET = "dusk";

export type MapboxLightPreset = "dawn" | "day" | "dusk" | "night";

export type StyleViewOverride = {
  pitch: number;
  lightPreset: MapboxLightPreset;
};

export const STYLE_VIEW_OVERRIDES: Record<MapStyleKey, StyleViewOverride> = {
  standard: { pitch: 50, lightPreset: "dusk" },
  "standard-satellite": { pitch: 65, lightPreset: "day" },
};

export const STATUS_COLORS = {
  aktiv: "#7fbf5c",
  "wartung-faellig": "#f6a72c",
  "saison-pause": "#74a5d8",
  neu: "#9bd9c0",
  vip: "#f4b540",
} as const;

export const TYPE_ICON_KEY = {
  privat: "icon-private",
  gewerbe: "icon-business",
  oeffentlich: "icon-public",
} as const;

export const GARDEN_TYPE_ICON_KEY = {
  ziergarten: "icon-ziergarten",
  nutzgarten: "icon-nutzgarten",
  dachgarten: "icon-dachgarten",
  park: "icon-park",
  firmengelaende: "icon-firmen",
  gastgarten: "icon-gastgarten",
} as const;

export const HEATMAP_COLORS = [
  "rgba(0, 0, 0, 0)",
  "rgba(96, 156, 80, 0.4)",
  "rgba(150, 200, 90, 0.7)",
  "rgba(220, 240, 160, 0.85)",
  "rgba(255, 240, 140, 0.95)",
] as const;
