"use client";

import { createContext, useContext } from "react";
import type mapboxgl from "mapbox-gl";

type MapContextValue = {
  map: mapboxgl.Map | null;
  isStyleLoaded: boolean;
};

export const MapContext = createContext<MapContextValue>({
  map: null,
  isStyleLoaded: false,
});

export function useMap(): mapboxgl.Map | null {
  return useContext(MapContext).map;
}

export function useMapReady(): boolean {
  return useContext(MapContext).isStyleLoaded;
}
