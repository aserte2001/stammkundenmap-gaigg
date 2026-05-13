"use client";

import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAP_STYLES } from "@/lib/map-config";
import { useAppStore, type MapStyleKey } from "@/lib/store";

export function MapStyleSwitcher() {
  const mapStyle = useAppStore((s) => s.mapStyle);
  const setMapStyle = useAppStore((s) => s.setMapStyle);

  return (
    <TooltipProvider>
      <div className="pointer-events-auto inline-flex rounded-full border border-border bg-card/85 p-1 backdrop-blur">
        {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => {
          const isActive = mapStyle === key;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMapStyle(key)}
                  className="gap-2 rounded-full"
                  aria-label={`Karten-Stil ${MAP_STYLES[key].label}`}
                  aria-pressed={isActive}
                >
                  <Layers className="h-4 w-4" />
                  {MAP_STYLES[key].label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{MAP_STYLES[key].label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
