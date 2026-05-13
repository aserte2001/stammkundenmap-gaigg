"use client";

import { useEffect } from "react";
import { useMap, useMapReady } from "./map-context";

/**
 * The Mapbox Standard style already includes 3D buildings via the basemap config
 * (show3dObjects). This component is the manual fallback for non-standard styles
 * (e.g., streets-v12) — it adds a fill-extrusion layer over OSM buildings.
 */
export function ThreeDBuildingsLayer() {
  const map = useMap();
  const ready = useMapReady();

  useEffect(() => {
    if (!map || !ready) return;
    // Defensive: even when `ready` is true, Mapbox internals can briefly be in a
    // transitional state during style switches. Guard before any getStyle() call.
    if (!map.isStyleLoaded()) return;

    let style: ReturnType<typeof map.getStyle> | undefined;
    try {
      style = map.getStyle() ?? undefined;
    } catch {
      // Style still loading despite isStyleLoaded === true — skip this tick.
      return;
    }
    if (!style) return;

    const styleName = style.name ?? "";
    if (styleName.includes("Standard")) {
      // Built into Mapbox Standard via setConfigProperty('basemap','show3dObjects',true)
      return;
    }

    const sourceLayerCandidates = ["building", "structure"];
    const layers = style.layers ?? [];
    const labelLayerId = layers.find((l) => l.type === "symbol" && l.layout?.["text-field"])?.id;
    const layerId = "stammkunden-3d-buildings";

    if (map.getLayer(layerId)) return;

    for (const sourceLayer of sourceLayerCandidates) {
      try {
        map.addLayer(
          {
            id: layerId,
            source: "composite",
            "source-layer": sourceLayer,
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "oklch(0.38 0.04 150)",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                15.5,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                15.5,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.78,
            },
          },
          labelLayerId,
        );
        break;
      } catch {
        // Source-layer not found, try next
      }
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    };
  }, [map, ready]);

  return null;
}
