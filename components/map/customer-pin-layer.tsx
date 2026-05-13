"use client";

import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import { customers } from "@/lib/customers";
import { STATUS_COLORS } from "@/lib/map-config";
import { useAppStore } from "@/lib/store";
import { useMap, useMapReady } from "./map-context";
import { CUSTOMER_SOURCE_ID } from "./cluster-heat-layer";

const ICON_KEYS = [
  "ziergarten",
  "nutzgarten",
  "dachgarten",
  "park",
  "firmengelaende",
  "gastgarten",
] as const;

async function loadIcon(map: mapboxgl.Map, key: string): Promise<void> {
  const id = `gaigg-${key}`;
  if (map.hasImage(id)) return;
  const path = `/icons/${key}.svg`;
  return new Promise((resolve) => {
    const img = new Image(64, 64);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        if (!map.hasImage(id)) {
          map.addImage(id, img, { pixelRatio: 2 });
        }
      } catch {
        // Style change during load — ignore
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = path;
  });
}

export function CustomerPinLayer() {
  const map = useMap();
  const ready = useMapReady();
  const selectedId = useAppStore((s) => s.selectedCustomerId);
  const hoveredId = useAppStore((s) => s.hoveredCustomerId);
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);
  const pulseRef = useRef<number | null>(null);

  // Load icons + add layers
  useEffect(() => {
    if (!map || !ready) return;

    let cancelled = false;

    (async () => {
      await Promise.all(ICON_KEYS.map((key) => loadIcon(map, key)));
      if (cancelled) return;

      // Avoid duplicate adds
      if (map.getLayer("gaigg-pin-outline")) return;

      // Expose customers globally for viewport tracking (read by map-canvas)
      (window as unknown as { __customerIds?: string[] }).__customerIds = customers.map((c) => c.id);
      (window as unknown as { __customerCoords?: Record<string, [number, number]> }).__customerCoords =
        Object.fromEntries(customers.map((c) => [c.id, c.coordinates]));

      // Status outline circle (below pins)
      map.addLayer({
        id: "gaigg-pin-outline",
        type: "circle",
        source: CUSTOMER_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        minzoom: 9,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            10,
            14,
            18,
            17,
            22,
          ],
          "circle-color": [
            "match",
            ["get", "status"],
            "vip",
            STATUS_COLORS.vip,
            "wartung-faellig",
            STATUS_COLORS["wartung-faellig"],
            "saison-pause",
            STATUS_COLORS["saison-pause"],
            "neu",
            STATUS_COLORS.neu,
            STATUS_COLORS.aktiv,
          ],
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.95,
            0.65,
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3,
            ["boolean", ["feature-state", "hover"], false],
            2,
            1,
          ],
          "circle-stroke-color": "rgba(255,255,255,0.95)",
        },
      });

      // Pin symbols
      map.addLayer({
        id: "gaigg-pin-symbols",
        type: "symbol",
        source: CUSTOMER_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        minzoom: 9,
        layout: {
          "icon-image": ["get", "iconKey"],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            0.25,
            14,
            0.45,
            17,
            0.65,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "center",
        },
      });

      // VIP twinkle layer
      map.addLayer({
        id: "gaigg-vip-twinkle",
        type: "circle",
        source: CUSTOMER_SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isVip"], 1]],
        minzoom: 8,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            16,
            14,
            26,
            17,
            32,
          ],
          "circle-color": STATUS_COLORS.vip,
          "circle-opacity": 0.18,
          "circle-blur": 0.6,
        },
      });

      // Selected ring (data-state driven)
      map.addLayer({
        id: "gaigg-selected-pulse",
        type: "circle",
        source: CUSTOMER_SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], ""]],
        paint: {
          "circle-radius": 28,
          "circle-color": "rgba(127, 191, 92, 0)",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#7fbf5c",
          "circle-stroke-opacity": 0.85,
        },
      });

      // Click/hover handlers
      const onClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        const id = (e.features?.[0]?.properties as { id?: string })?.id;
        if (!id) return;
        select(id);
      };

      const onMouseMove = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        const id = (e.features?.[0]?.properties as { id?: string })?.id;
        if (!id) {
          map.getCanvas().style.cursor = "";
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        hover(id);
      };

      const onMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        hover(null);
      };

      map.on("click", "gaigg-pin-symbols", onClick);
      map.on("click", "gaigg-pin-outline", onClick);
      map.on("mousemove", "gaigg-pin-symbols", onMouseMove);
      map.on("mouseleave", "gaigg-pin-symbols", onMouseLeave);

      return () => {
        map.off("click", "gaigg-pin-symbols", onClick);
        map.off("click", "gaigg-pin-outline", onClick);
        map.off("mousemove", "gaigg-pin-symbols", onMouseMove);
        map.off("mouseleave", "gaigg-pin-symbols", onMouseLeave);
        for (const id of [
          "gaigg-selected-pulse",
          "gaigg-vip-twinkle",
          "gaigg-pin-symbols",
          "gaigg-pin-outline",
        ]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
      };
    })();

    return () => {
      cancelled = true;
    };
  }, [map, ready, select, hover]);

  // Update selected pulse layer filter when selectedId changes
  useEffect(() => {
    if (!map || !ready) return;
    if (!map.getLayer("gaigg-selected-pulse")) return;
    map.setFilter("gaigg-selected-pulse", [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "id"], selectedId ?? ""],
    ]);
  }, [map, ready, selectedId]);

  // Pulse animation loop for selected pin
  useEffect(() => {
    if (!map || !ready) return;
    if (!selectedId) {
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current);
      return;
    }
    let start = performance.now();
    const tick = (now: number) => {
      if (!map.getLayer("gaigg-selected-pulse")) return;
      const t = (now - start) / 1400;
      const phase = (Math.sin(t * Math.PI * 2) + 1) / 2;
      const radius = 24 + phase * 16;
      const opacity = 0.4 + phase * 0.55;
      try {
        map.setPaintProperty("gaigg-selected-pulse", "circle-radius", radius);
        map.setPaintProperty("gaigg-selected-pulse", "circle-stroke-opacity", opacity);
      } catch {
        return;
      }
      pulseRef.current = requestAnimationFrame(tick);
    };
    pulseRef.current = requestAnimationFrame(tick);
    return () => {
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current);
    };
  }, [map, ready, selectedId]);

  // Sync feature-state for hover
  useEffect(() => {
    if (!map || !ready) return;
    if (!map.getSource(CUSTOMER_SOURCE_ID)) return;
    customers.forEach((c) => {
      try {
        map.setFeatureState(
          { source: CUSTOMER_SOURCE_ID, id: c.id },
          { hover: c.id === hoveredId, selected: c.id === selectedId },
        );
      } catch {
        // ignore feature-state errors when source still loading
      }
    });
  }, [map, ready, hoveredId, selectedId]);

  // Fly to selected customer
  useEffect(() => {
    if (!map || !ready || !selectedId) return;
    const c = customers.find((x) => x.id === selectedId);
    if (!c) return;
    map.flyTo({
      center: c.coordinates,
      zoom: 17,
      pitch: 65,
      bearing: -8,
      duration: 1600,
      essential: true,
    });
  }, [map, ready, selectedId]);

  return null;
}
