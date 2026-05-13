"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  DEFAULT_VIEW,
  FALLBACK_STYLE,
  GLOBE_VIEW,
  MAP_STYLES,
  MAPBOX_LIGHT_PRESET,
} from "@/lib/map-config";
import { useAppStore } from "@/lib/store";
import { MapContext } from "./map-context";

type Props = {
  children?: React.ReactNode;
};

export function MapCanvas({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const mapStyle = useAppStore((s) => s.mapStyle);
  const isIntroComplete = useAppStore((s) => s.isIntroComplete);
  const setVisibleIds = useAppStore((s) => s.setVisibleIds);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    mapboxgl.accessToken = token;
    const initialStyle = MAP_STYLES[mapStyle]?.style ?? FALLBACK_STYLE;
    const initialView = isIntroComplete ? DEFAULT_VIEW : GLOBE_VIEW;

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
      try {
        instance.setConfigProperty("basemap", "lightPreset", MAPBOX_LIGHT_PRESET);
        instance.setConfigProperty("basemap", "show3dObjects", true);
        instance.setConfigProperty("basemap", "showPedestrianRoads", true);
        instance.setConfigProperty("basemap", "showRoadLabels", true);
      } catch {
        // Style may not support config properties (e.g., fallback)
      }
      setIsStyleLoaded(true);
    };

    const onError = (event: { error?: { status?: number; message?: string } }) => {
      const err = event.error;
      if (err?.status === 404 && instance.getStyle()?.name?.includes("Standard")) {
        console.warn("Standard style 404, falling back to streets-v12");
        instance.setStyle(FALLBACK_STYLE);
      }
    };

    instance.on("style.load", onStyleLoad);
    instance.on("error", onError);

    const updateVisible = () => {
      // Will be filled in customer-pin-layer via map.queryRenderedFeatures
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
  }, [token, mapStyle, isIntroComplete, setVisibleIds]);

  // Style switching (after init)
  useEffect(() => {
    const instance = mapRef.current;
    if (!instance) return;
    const style = MAP_STYLES[mapStyle]?.style ?? FALLBACK_STYLE;
    const current = instance.getStyle()?.sprite;
    if (current && current.includes(mapStyle)) return;
    setIsStyleLoaded(false);
    instance.setStyle(style);
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
