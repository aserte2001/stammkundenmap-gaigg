"use client";

import { Cherry, Leaf, Snowflake, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SEASON_CONFIG, SEASON_ORDER, type Season } from "@/lib/season";
import { useAppStore } from "@/lib/store";

const SEASON_ICONS: Record<Season, React.ComponentType<{ className?: string }>> = {
  fruehling: Cherry,
  sommer: Sun,
  herbst: Leaf,
  winter: Snowflake,
};

export function SeasonToggle() {
  const season = useAppStore((s) => s.season);
  const setSeason = useAppStore((s) => s.setSeason);

  return (
    <TooltipProvider>
      <div className="border-border bg-card/85 pointer-events-auto inline-flex rounded-full border p-1 backdrop-blur">
        {SEASON_ORDER.map((key) => {
          const isActive = season === key;
          const Icon = SEASON_ICONS[key];
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setSeason(key)}
                  className="h-8 w-8 rounded-full"
                  aria-label={`Saison: ${SEASON_CONFIG[key].label}`}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{SEASON_CONFIG[key].label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
