import { Suspense } from "react";
import { BottomTray } from "@/components/bottom-tray/bottom-tray";
import { CommandPalette } from "@/components/command-palette";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { FloatingStats } from "@/components/floating-stats";
import { KeyboardNav } from "@/components/keyboard-nav";
import { ClusterHeatLayer } from "@/components/map/cluster-heat-layer";
import { CustomerPinLayer } from "@/components/map/customer-pin-layer";
import { IntroAnimation } from "@/components/map/intro-animation";
import { MapControls } from "@/components/map/map-controls";
import { MapShell } from "@/components/map/map-shell";
import { MapStyleSwitcher } from "@/components/map/map-style-switcher";
import { SelectCustomerFromUrl } from "@/components/map/select-customer-from-url";
import { ThreeDBuildingsLayer } from "@/components/map/three-d-buildings-layer";
import { SeasonParticles } from "@/components/season-particles";
import { SeasonSync } from "@/components/season-sync";
import { SeasonToggle } from "@/components/season-toggle";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { hasOpenAI } from "@/lib/env";

export default function HomePage() {
  const visionAvailable = hasOpenAI();
  return (
    <main className="bg-background text-foreground relative h-dvh w-full overflow-hidden">
      <SeasonSync />

      <MapShell>
        <ThreeDBuildingsLayer />
        <ClusterHeatLayer />
        <CustomerPinLayer />
        <MapControls />
        <IntroAnimation />
      </MapShell>

      <SeasonParticles />
      <FloatingStats />
      <BottomTray />
      <DetailPanel visionAvailable={visionAvailable} />
      <CommandPalette />
      <ShortcutsDialog />
      <KeyboardNav />
      <Suspense fallback={null}>
        <SelectCustomerFromUrl />
      </Suspense>

      <header className="pointer-events-none absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 md:flex-row md:items-center md:gap-2">
        <div className="pointer-events-auto">
          <SeasonToggle />
        </div>
        <div className="pointer-events-auto">
          <MapStyleSwitcher />
        </div>
      </header>
    </main>
  );
}
