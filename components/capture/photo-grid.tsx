"use client";

import { useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";
import type { CaptureSequence } from "@/lib/capture/sequence";
import type { CaptureRecord } from "@/lib/capture/storage";
import { cn } from "@/lib/utils";

type Props = {
  sequence: CaptureSequence;
  captures: ReadonlyArray<CaptureRecord>;
  activeSlot: number | null;
  onSelectSlot: (slot: number) => void;
};

export function PhotoGrid({ sequence, captures, activeSlot, onSelectSlot }: Props) {
  const previews = useThumbnails(captures);
  return (
    <div className="grid grid-cols-4 gap-2">
      {sequence.targets.map((target) => {
        const captured = captures.find((c) => c.slot === target.slot);
        const isActive = activeSlot === target.slot;
        return (
          <button
            key={target.slot}
            type="button"
            onClick={() => onSelectSlot(target.slot)}
            className={cn(
              "border-border bg-card relative aspect-square overflow-hidden rounded-lg border-2 text-left",
              isActive && "border-primary",
              captured && "border-primary/60",
            )}
            aria-label={`Slot ${target.slot + 1}, ${target.azimuth}°`}
          >
            {captured && previews[captured.slot] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews[captured.slot]}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="bg-primary text-primary-foreground absolute top-1 right-1 rounded-full p-1">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              </>
            ) : (
              <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center">
                <Camera className="h-4 w-4" aria-hidden />
                <span className="text-[10px] font-medium uppercase">{target.azimuth}°</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function useThumbnails(captures: ReadonlyArray<CaptureRecord>): Record<number, string> {
  const captureSig = captures.map((c) => `${c.slot}:${c.createdAt}`).join("|");
  const [urls, setUrls] = useState<Record<number, string>>({});

  // Object-URL lifecycle is inherently effectful: we have to allocate URLs on
  // input change and revoke them on cleanup. The lint rule prefers
  // subscription patterns, but that's overkill for a finite, render-driven set.
  useEffect(() => {
    const next: Record<number, string> = {};
    for (const c of captures) next[c.slot] = URL.createObjectURL(c.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
    // We depend on captureSig (a stable derived string) instead of `captures`
    // so identical content arrays don't churn URL allocations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureSig]);

  return urls;
}
