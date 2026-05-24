import type { MapboxLightPreset } from "./map-config";

export type Season = "fruehling" | "sommer" | "herbst" | "winter";

export type SeasonConfig = {
  label: string;
  lightPreset: MapboxLightPreset;
  particleType: "blossom" | "sunflare" | "leaves" | "snow";
};

export const SEASON_CONFIG: Record<Season, SeasonConfig> = {
  fruehling: {
    label: "Frühling",
    lightPreset: "dawn",
    particleType: "blossom",
  },
  sommer: {
    label: "Sommer",
    lightPreset: "day",
    particleType: "sunflare",
  },
  herbst: {
    label: "Herbst",
    lightPreset: "dusk",
    particleType: "leaves",
  },
  winter: {
    label: "Winter",
    lightPreset: "night",
    particleType: "snow",
  },
};

export const SEASON_ORDER: Season[] = ["fruehling", "sommer", "herbst", "winter"];

export function detectSeason(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "fruehling";
  if (month >= 5 && month <= 7) return "sommer";
  if (month >= 8 && month <= 10) return "herbst";
  return "winter";
}
