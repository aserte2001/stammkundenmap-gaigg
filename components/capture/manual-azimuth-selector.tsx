"use client";

import { isOnTarget } from "@/lib/capture/sequence";
import { cn } from "@/lib/utils";

type Props = {
  targetAzimuth: number;
  hint: string;
  value: number;
  onChange: (value: number) => void;
};

const TICKS = [0, 45, 90, 135, 180, 225, 270, 315];
const TICK_LABEL: Record<number, string> = {
  0: "N",
  45: "NE",
  90: "E",
  135: "SE",
  180: "S",
  225: "SW",
  270: "W",
  315: "NW",
};

export function ManualAzimuthSelector({ targetAzimuth, hint, value, onChange }: Props) {
  const onTarget = isOnTarget(value, targetAzimuth, 15);
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm font-medium">{hint}</p>
      <p className="text-muted-foreground text-xs">
        Kein Sensor erkannt — wähle die Himmelsrichtung manuell.
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {TICKS.map((deg) => {
          const isSelected = Math.round(value) === deg;
          const isTarget = Math.round(targetAzimuth) === deg;
          return (
            <button
              key={deg}
              type="button"
              onClick={() => onChange(deg)}
              className={cn(
                "rounded-md border px-2 py-3 text-xs font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
                isTarget && !isSelected && "border-primary",
              )}
              aria-pressed={isSelected}
              aria-label={`${TICK_LABEL[deg]}, ${deg}°`}
            >
              <div>{TICK_LABEL[deg]}</div>
              <div className="text-muted-foreground mt-1 text-[10px]">{deg}°</div>
            </button>
          );
        })}
      </div>
      {onTarget && (
        <p className="text-primary text-sm font-semibold">✓ Auf Ziel — bitte auslösen</p>
      )}
    </div>
  );
}
