"use client";

import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { Mountain, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_VIEW } from "@/lib/map-config";
import { useMap } from "./map-context";

export function MapControls() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const navigation = new mapboxgl.NavigationControl({
      visualizePitch: true,
      showCompass: true,
      showZoom: true,
    });
    const scale = new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" });
    const fullscreen = new mapboxgl.FullscreenControl();
    map.addControl(navigation, "bottom-right");
    map.addControl(fullscreen, "bottom-right");
    map.addControl(scale, "bottom-left");
    return () => {
      map.removeControl(navigation);
      map.removeControl(fullscreen);
      map.removeControl(scale);
    };
  }, [map]);

  const resetPitch = () => {
    if (!map) return;
    map.easeTo({ pitch: DEFAULT_VIEW.pitch, bearing: DEFAULT_VIEW.bearing, duration: 1200 });
  };

  const flyToLinz = () => {
    if (!map) return;
    map.flyTo({
      center: DEFAULT_VIEW.center,
      zoom: DEFAULT_VIEW.zoom,
      pitch: DEFAULT_VIEW.pitch,
      bearing: DEFAULT_VIEW.bearing,
      duration: 1800,
    });
  };

  return (
    <div className="pointer-events-auto absolute bottom-36 right-2.5 z-20 flex flex-col gap-2 md:bottom-40">
      <Button
        variant="secondary"
        size="icon"
        onClick={flyToLinz}
        className="h-10 w-10 md:h-8 md:w-8"
        title="Auf Linz zentrieren"
        aria-label="Auf Linz zentrieren"
      >
        <Compass className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={resetPitch}
        className="h-10 w-10 md:h-8 md:w-8"
        title="Neigung zurücksetzen"
        aria-label="Neigung zurücksetzen"
      >
        <Mountain className="h-4 w-4" />
      </Button>
    </div>
  );
}
