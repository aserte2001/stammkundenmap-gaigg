import { CommandPalette } from "@/components/command-palette";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { ClusterHeatLayer } from "@/components/map/cluster-heat-layer";
import { CustomerPinLayer } from "@/components/map/customer-pin-layer";
import { IntroAnimation } from "@/components/map/intro-animation";
import { MapControls } from "@/components/map/map-controls";
import { MapShell } from "@/components/map/map-shell";
import { MapStyleSwitcher } from "@/components/map/map-style-switcher";
import { ThreeDBuildingsLayer } from "@/components/map/three-d-buildings-layer";
import { Sidebar } from "@/components/sidebar/sidebar";

export default function HomePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background text-foreground">
      <MapShell>
        <ThreeDBuildingsLayer />
        <ClusterHeatLayer />
        <CustomerPinLayer />
        <MapControls />
        <IntroAnimation />
      </MapShell>

      <Sidebar />
      <DetailPanel />
      <CommandPalette />

      <header className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-2">
        <div className="pointer-events-auto">
          <MapStyleSwitcher />
        </div>
      </header>
    </main>
  );
}
