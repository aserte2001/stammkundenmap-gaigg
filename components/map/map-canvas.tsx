"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  DEFAULT_VIEW,
  FALLBACK_STYLE,
  GLOBE_VIEW,
  MAP_STYLES,
  STYLE_VIEW_OVERRIDES,
} from "@/lib/map-config";
import { useAppStore } from "@/lib/store";
import type { MapStyleKey } from "@/lib/store";
import { MapContext } from "./map-context";

const DEM_SOURCE_ID = "mapbox-dem";

function ensureTerrainAndAtmosphere(instance: mapboxgl.Map, exaggeration: number) {
  // Standard / Standard-Satellite already ship with terrain + sky + fog;
  // we only add our own DEM source as a fallback (e.g. when streets-v12 kicks
  // in after a 404). All calls are wrapped in try/catch because Mapbox throws
  // synchronously when a style hasn't fully resolved its layers yet.
  try {
    if (!instance.getSource(DEM_SOURCE_ID)) {
      instance.addSource(DEM_SOURCE_ID, {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }
  } catch {
    // Style refused the source (already terrained) — fine.
  }
  try {
    instance.setTerrain({ source: DEM_SOURCE_ID, exaggeration });
  } catch {
    // Style refused setTerrain — fine, the built-in terrain will handle it.
  }
  try {
    if (!instance.getLayer("sky")) {
      instance.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0, 0],
          "sky-atmosphere-sun-intensity": 12,
        },
      });
    }
  } catch {
    // Style already has a sky layer.
  }
  try {
    instance.setFog({
      range: [1, 12],
      color: "#dfe9f3",
      "horizon-blend": 0.1,
      "high-color": "#245cdf",
      "space-color": "#0b1e36",
      "star-intensity": 0.15,
    });
  } catch {
    // Style refused fog — fine.
  }
}

type Props = {
  children?: React.ReactNode;
};

export function MapCanvas({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const lastStyleKeyRef = useRef<string | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const mapStyle = useAppStore((s) => s.mapStyle);
  const isIntroComplete = useAppStore((s) => s.isIntroComplete);
  const setVisibleIds = useAppStore((s) => s.setVisibleIds);

  // Capture initial values via refs so the map is built ONCE.
  // Subsequent style changes go through the dedicated style-switch effect below;
  // intro completion is handled by the intro-animation component via flyTo.
  const initialStyleKeyRef = useRef(mapStyle);
  const initialIntroCompleteRef = useRef(isIntroComplete);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    mapboxgl.accessToken = token;
    const initialStyleKey = initialStyleKeyRef.current;
    const initialStyle = MAP_STYLES[initialStyleKey]?.style ?? FALLBACK_STYLE;
    lastStyleKeyRef.current = initialStyleKey;
    const initialView = initialIntroCompleteRef.current ? DEFAULT_VIEW : GLOBE_VIEW;

    let instance: mapboxgl.Map;
    try {
      instance = new mapboxgl.Map({
        container: containerRef.current,
        style: initialStyle,
        center: initialView.center,
        zoom: initialView.zoom,
        pitch: initialView.pitch,
        bearing: initialView.bearing,
        attributionControl: false,
        projection: { name: "globe" } as mapboxgl.ProjectionSpecification,
        antialias: true,
        cooperativeGestures: false,
        maxPitch: 75,
      });
      instance.addControl(new mapboxgl.AttributionControl({ compact: true }));
    } catch (err) {
      console.error("Failed to init Mapbox map", err);
      return;
    }

    mapRef.current = instance;

    const onStyleLoad = () => {
      const styleKey = lastStyleKeyRef.current as MapStyleKey | "fallback" | null;
      const override =
        styleKey && styleKey !== "fallback" ? STYLE_VIEW_OVERRIDES[styleKey] : undefined;
      const exaggeration = override?.terrainExaggeration ?? 1.1;
      try {
        instance.setConfigProperty("basemap", "lightPreset", "day");
        instance.setConfigProperty("basemap", "show3dObjects", true);
        instance.setConfigProperty("basemap", "showPedestrianRoads", true);
        instance.setConfigProperty("basemap", "showRoadLabels", true);
      } catch {
        // Style may not support config properties (e.g., fallback)
      }
      ensureTerrainAndAtmosphere(instance, exaggeration);
      setIsStyleLoaded(true);
    };

    const onError = (event: { error?: { status?: number; message?: string } }) => {
      const err = event.error;
      if (err?.status !== 404) return;
      // Only inspect getStyle() after the style is fully loaded — otherwise Mapbox
      // throws "Style is not done loading" from _checkLoaded.
      let isStandard = lastStyleKeyRef.current === "standard";
      if (instance.isStyleLoaded()) {
        try {
          isStandard = isStandard || (instance.getStyle()?.name ?? "").includes("Standard");
        } catch {
          // ignore
        }
      }
      if (isStandard) {
        console.warn("Standard style 404, falling back to streets-v12");
        lastStyleKeyRef.current = "fallback";
        instance.setStyle(FALLBACK_STYLE);
      }
    };

    instance.on("style.load", onStyleLoad);
    instance.on("error", onError);

    const updateVisible = () => {
      const bounds = instance.getBounds();
      if (!bounds) return;
      setVisibleIds(
        (window as unknown as { __customerIds?: string[] }).__customerIds?.filter((id) => {
          const coord = (
            window as unknown as { __customerCoords?: Record<string, [number, number]> }
          ).__customerCoords?.[id];
          if (!coord) return false;
          return bounds.contains(coord);
        }) ?? [],
      );
    };
    instance.on("moveend", updateVisible);

    setMap(instance);

    return () => {
      instance.off("style.load", onStyleLoad);
      instance.off("error", onError);
      instance.off("moveend", updateVisible);
      instance.remove();
      mapRef.current = null;
    };
    // Intentionally minimal deps: token + setVisibleIds are both stable.
    // Initial map config (mapStyle, isIntroComplete) is captured via refs above
    // to ensure the Mapbox instance is built EXACTLY ONCE for the component lifetime.
  }, [token, setVisibleIds]);

  // Style switching after init — never on initial mount (lastStyleKeyRef gates it).
  useEffect(() => {
    const instance = mapRef.current;
    if (!instance) return;
    if (lastStyleKeyRef.current === mapStyle) return;
    const styleUrl = MAP_STYLES[mapStyle]?.style ?? FALLBACK_STYLE;
    lastStyleKeyRef.current = mapStyle;
    setIsStyleLoaded(false);

    const onceLoaded = () => {
      const override = STYLE_VIEW_OVERRIDES[mapStyle];
      // Skip pitch animation while we're still in the globe-intro view —
      // the intro animation owns the camera until isIntroComplete flips.
      if (override && instance.getZoom() > 4) {
        instance.easeTo({ pitch: override.pitch, duration: 800 });
      }
      instance.off("style.load", onceLoaded);
    };
    instance.on("style.load", onceLoaded);

    instance.setStyle(styleUrl);
  }, [mapStyle]);

  const value = useMemo(() => ({ map, isStyleLoaded }), [map, isStyleLoaded]);

  if (!token) {
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center p-12 text-center">
        Mapbox-Token fehlt. Bitte <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> setzen.
      </div>
    );
  }

  return (
    <MapContext.Provider value={value}>
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        data-testid="map-container"
        aria-label="Interaktive Karte der Stammkunden"
        role="application"
      />
      {children}
    </MapContext.Provider>
  );
}
