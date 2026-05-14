"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Customer } from "@/lib/customers";
import type { Hotspot } from "@/lib/welt/hotspot-registry";
import type { WeltEnvStatus } from "@/lib/welt/env-check";
import { WeltUnavailable } from "./welt-unavailable";
import { WeltHud } from "./welt-hud";
import { OnboardingOverlay } from "./onboarding-overlay";
import { EscapeOverlay } from "./escape-overlay";
import { AmbientAudio } from "./ambient-audio";
import type { WeltCanvasHandle, WeltTelemetry } from "./welt-canvas-types";

const WeltCanvas = dynamic(() => import("./welt-canvas").then((m) => m.WeltCanvas), {
  ssr: false,
  loading: () => (
    <div className="bg-background absolute inset-0 flex items-center justify-center">
      <div className="border-primary/40 border-t-primary h-10 w-10 animate-spin rounded-full border-2" />
    </div>
  ),
});

type Props = {
  customer: Customer;
  hotspot: Hotspot | null;
  env: WeltEnvStatus;
  debug?: boolean;
  skipOnboarding?: boolean;
};

const ONBOARDING_FLAG = "welt.onboarded.v1";

function subscribeNoop() {
  return () => {};
}

function getWebglSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  const canvas = document.createElement("canvas");
  return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
}

function getOnboardingSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_FLAG) !== "yes";
  } catch {
    return true;
  }
}

export function WeltShell({ customer, hotspot, env, debug = false, skipOnboarding = false }: Props) {
  const webglReady = useSyncExternalStore(subscribeNoop, getWebglSnapshot, () => true);
  const onboardingDue = useSyncExternalStore(
    subscribeNoop,
    getOnboardingSnapshot,
    () => false,
  );
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [tutorialOverride, setTutorialOverride] = useState(false);
  const showOnboarding =
    !skipOnboarding && (tutorialOverride || (onboardingDue && !onboardingDismissed));
  const [paused, setPaused] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [canvasHandle, setCanvasHandle] = useState<WeltCanvasHandle | null>(null);
  const [telemetry, setTelemetry] = useState<WeltTelemetry>({
    fps: 0,
    altitude: 0,
    headingDeg: 0,
    position: { lat: customer.coordinates[1], lng: customer.coordinates[0], alt: 0 },
    attribution: "",
    tilesLoaded: 0,
  });
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPaused((current) => !current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const dismissOnboarding = (remember: boolean) => {
    if (remember) {
      try {
        window.localStorage.setItem(ONBOARDING_FLAG, "yes");
      } catch {
        // localStorage not available — soft fail.
      }
    }
    setTutorialOverride(false);
    setOnboardingDismissed(true);
  };

  const hotspots = useMemo(() => (hotspot ? [hotspot] : []), [hotspot]);

  if (!webglReady) {
    return <WeltUnavailable customer={customer} reason="webgl" />;
  }

  return (
    <main className="bg-background text-foreground relative h-dvh w-full overflow-hidden">
      <WeltCanvas
        customer={customer}
        hotspots={hotspots}
        debug={debug}
        paused={paused || showOnboarding}
        onTelemetry={setTelemetry}
        onHotspotEnter={setActiveHotspot}
        onReady={setCanvasHandle}
      />
      <WeltHud
        customer={customer}
        hotspots={hotspots}
        activeHotspotId={activeHotspot}
        telemetry={telemetry}
        debug={debug}
        env={env}
        onJumpToHotspot={(id) => canvasHandle?.flyToHotspot(id)}
        onTogglePause={() => setPaused((p) => !p)}
        onToggleAudio={() => setAudioEnabled((a) => !a)}
        audioEnabled={audioEnabled}
      />
      <EscapeOverlay
        open={paused}
        customer={customer}
        onResume={() => setPaused(false)}
        onShowTutorial={() => {
          setPaused(false);
          setOnboardingDismissed(false);
          setTutorialOverride(true);
        }}
        onToggleAudio={() => setAudioEnabled((a) => !a)}
        audioEnabled={audioEnabled}
      />
      <OnboardingOverlay open={showOnboarding} onDismiss={dismissOnboarding} />
      <AmbientAudio enabled={audioEnabled && !paused} />
    </main>
  );
}
