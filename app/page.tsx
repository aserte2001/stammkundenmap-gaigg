import { CommandPalette } from "@/components/command-palette";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { KeyboardNav } from "@/components/keyboard-nav";
import { ClusterHeatLayer } from "@/components/map/cluster-heat-layer";
import { CustomerPinLayer } from "@/components/map/customer-pin-layer";
import { IntroAnimation } from "@/components/map/intro-animation";
import { MapControls } from "@/components/map/map-controls";
import { MapShell } from "@/components/map/map-shell";
import { MapStyleSwitcher } from "@/components/map/map-style-switcher";
import { ThreeDBuildingsLayer } from "@/components/map/three-d-buildings-layer";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Sidebar } from "@/components/sidebar/sidebar";

export default function HomePage() {
  return (
    <main className="bg-background text-foreground relative h-dvh w-full overflow-hidden">
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
      <ShortcutsDialog />
      <KeyboardNav />

      <header className="pointer-events-none absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="pointer-events-auto">
          <MapStyleSwitcher />
        </div>
      </header>
    </main>
  );
}
