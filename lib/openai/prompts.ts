import type { Customer } from "@/lib/customers";

export type GardenStyle = "modern" | "mediterran" | "japanisch" | "naturalistisch";
export type GardenSeason = "fruehling" | "sommer" | "herbst" | "winter";

export const GARDEN_STYLES: ReadonlyArray<{ id: GardenStyle; label: string; mood: string }> = [
  { id: "modern", label: "Modern", mood: "Klare Linien, Sichtbetonsteinkacheln, Cortenstahl, sparsame Bepflanzung" },
  {
    id: "mediterran",
    label: "Mediterran",
    mood: "Olivenbaum, Lavendel, Terracotta, Trockenmauer, sonnenverbrannte Wärme",
  },
  {
    id: "japanisch",
    label: "Japanisch",
    mood: "Zengarten, japanischer Ahorn, Kiesfläche, moosbedeckte Steine, Wasserschale",
  },
  {
    id: "naturalistisch",
    label: "Naturalistisch",
    mood: "Wildblumenwiese, Insektenwiese, Totholz, weicher Übergang zur Landschaft",
  },
];

export const GARDEN_SEASONS: ReadonlyArray<{ id: GardenSeason; label: string; light: string }> = [
  { id: "fruehling", label: "Frühling", light: "weiches Morgenlicht, Tau auf den Blättern" },
  { id: "sommer", label: "Sommer", light: "warmes Spätnachmittagslicht, lange Schatten" },
  { id: "herbst", label: "Herbst", light: "goldenes Streulicht, Nebel im Hintergrund" },
  { id: "winter", label: "Winter", light: "kaltes Mittagslicht, dünne Schneedecke" },
];

type Context = {
  customer: Pick<Customer, "name" | "address" | "gardenType" | "gardenSizeM2">;
  style: GardenStyle;
  season: GardenSeason;
};

export function buildPrompt({ customer, style, season }: Context): string {
  const styleEntry = GARDEN_STYLES.find((s) => s.id === style);
  const seasonEntry = GARDEN_SEASONS.find((s) => s.id === season);
  const moodLine = styleEntry?.mood ?? "stilvoller Premiumgarten";
  const lightLine = seasonEntry?.light ?? "natürliches Tageslicht";
  return [
    "Photorealistic concept art of a premium private garden designed by Gartengestaltung Gaigg.",
    `Style: ${style} — ${moodLine}.`,
    `Season: ${season} — ${lightLine}.`,
    `Location context: ${customer.address.street}, ${customer.address.postalCode} ${customer.address.city}, district ${customer.address.district}. Existing garden type ${customer.gardenType}, area roughly ${customer.gardenSizeM2} m².`,
    "Camera at human eye-height looking towards the home from the garden side, shallow depth of field, ultra-detailed botanical realism, no humans, no logos, no text overlays.",
    "Materials reflect Austrian sourcing: Linz sandstone, regional plants, premium build quality.",
    "Render as if it were a photograph captured on a 35mm camera at f/4 — natural skin-tone whites, neutral colour grading, no AI-style oversaturation.",
  ].join(" \n");
}

export function isGardenStyle(value: unknown): value is GardenStyle {
  return typeof value === "string" && GARDEN_STYLES.some((s) => s.id === value);
}

export function isGardenSeason(value: unknown): value is GardenSeason {
  return typeof value === "string" && GARDEN_SEASONS.some((s) => s.id === value);
}
