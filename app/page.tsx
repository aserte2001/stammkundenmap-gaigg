import { Logo } from "@/components/brand/logo";
import { ClusterHeatLayer } from "@/components/map/cluster-heat-layer";
import { CustomerPinLayer } from "@/components/map/customer-pin-layer";
import { IntroAnimation } from "@/components/map/intro-animation";
import { MapControls } from "@/components/map/map-controls";
import { MapShell } from "@/components/map/map-shell";
import { MapStyleSwitcher } from "@/components/map/map-style-switcher";
import { ThreeDBuildingsLayer } from "@/components/map/three-d-buildings-layer";

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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 p-4">
        <div className="pointer-events-auto rounded-2xl bg-card/85 px-4 py-3 backdrop-blur">
          <Logo size={36} />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <MapStyleSwitcher />
        </div>
      </header>
    </main>
  );
}
