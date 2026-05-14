import type { Customer } from "@/lib/customers";

export type Hotspot = {
  id: string;
  label: string;
  description: string;
  lat: number;
  lng: number;
  alt: number;
  splatUrl?: string;
  /** When the splat fails to load we still render the marker + tooltip. */
  fallbackLabel?: string;
};

const SHARED_DEMO_SPLAT = "https://lumalabs.ai/embed/ca9ea966-ca24-4ec1-ab0f-af2f97f5dfa3";

/**
 * Hotspot pool. Coordinates target each customer's address with a small alt
 * offset so the splat hovers slightly above the Google tile geometry.
 *
 * Splats are only attached to demo-ready VIPs; the registry still contains
 * non-splat hotspots for every customer so the route is always usable.
 */
const REGISTRY: Record<string, Hotspot[]> = {
  "c-001": [
    {
      id: "villa-hofer-main",
      label: "Villa Hofer — Hauptansicht",
      description:
        "Photorealistischer Splat des Gartens am Pöstlingberg, eingebettet im Photo-Tile-Mesh.",
      lat: 48.3175,
      lng: 14.2515,
      alt: 12,
      splatUrl: SHARED_DEMO_SPLAT,
      fallbackLabel: "Hauptansicht",
    },
  ],
  "c-016": [
    {
      id: "wolfinger-courtyard",
      label: "Hotel Wolfinger — Innenhof",
      description: "Innenhof-Gastgarten mit Buchsbaum-Skulpturen und Lichtkonzept 2025.",
      lat: 48.3061,
      lng: 14.2858,
      alt: 6,
      splatUrl: SHARED_DEMO_SPLAT,
      fallbackLabel: "Innenhof",
    },
  ],
};

export function getHotspotsForCustomer(customer: Pick<Customer, "id">): Hotspot[] {
  return REGISTRY[customer.id] ?? [];
}

export function getPrimaryHotspot(customer: Pick<Customer, "id">): Hotspot | undefined {
  return getHotspotsForCustomer(customer)[0];
}

export function listAllHotspots(): Array<Hotspot & { customerId: string }> {
  return Object.entries(REGISTRY).flatMap(([customerId, hotspots]) =>
    hotspots.map((h) => ({ ...h, customerId })),
  );
}

export const __INTERNAL_REGISTRY = REGISTRY;
