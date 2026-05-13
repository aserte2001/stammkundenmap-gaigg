"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { DEFAULT_VIEW } from "@/lib/map-config";
import { useAppStore } from "@/lib/store";
import { useMap, useMapReady } from "./map-context";

const INTRO_DURATION = 3800;

export function IntroAnimation() {
  const map = useMap();
  const ready = useMapReady();
  const isIntroComplete = useAppStore((s) => s.isIntroComplete);
  const markIntroComplete = useAppStore((s) => s.markIntroComplete);
  const prefersReducedMotion = useReducedMotion();
  const [introTriggered, setIntroTriggered] = useState(false);

  useEffect(() => {
    if (!map || !ready || isIntroComplete || introTriggered) return;
    setIntroTriggered(true);

    if (prefersReducedMotion) {
      map.jumpTo({
        center: DEFAULT_VIEW.center,
        zoom: DEFAULT_VIEW.zoom,
        pitch: DEFAULT_VIEW.pitch,
        bearing: DEFAULT_VIEW.bearing,
      });
      markIntroComplete();
      return;
    }

    map.flyTo({
      center: DEFAULT_VIEW.center,
      zoom: DEFAULT_VIEW.zoom,
      pitch: DEFAULT_VIEW.pitch,
      bearing: DEFAULT_VIEW.bearing,
      duration: INTRO_DURATION,
      curve: 1.6,
      essential: true,
    });

    const timeout = window.setTimeout(() => {
      markIntroComplete();
    }, INTRO_DURATION + 100);

    return () => window.clearTimeout(timeout);
  }, [map, ready, isIntroComplete, introTriggered, prefersReducedMotion, markIntroComplete]);

  const skip = () => {
    if (!map) return;
    map.stop();
    map.jumpTo({
      center: DEFAULT_VIEW.center,
      zoom: DEFAULT_VIEW.zoom,
      pitch: DEFAULT_VIEW.pitch,
      bearing: DEFAULT_VIEW.bearing,
    });
    markIntroComplete();
  };

  if (isIntroComplete) return null;

  return (
    <motion.div
      key="intro-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-12"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-full bg-card/85 px-5 py-3 text-sm text-foreground shadow-lg backdrop-blur">
        <span className="text-muted-foreground">Globus → Linz · Anflug startet…</span>
        <Button size="sm" variant="ghost" onClick={skip}>
          Direkt zur Karte
        </Button>
      </div>
    </motion.div>
  );
}
