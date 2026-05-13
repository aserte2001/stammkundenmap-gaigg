"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MapCanvasNoSSR = dynamic(() => import("./map-canvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="bg-background/90 absolute inset-0 flex flex-col gap-3 p-8">
      <Skeleton className="bg-card h-full w-full rounded-3xl" />
    </div>
  ),
});

type Props = {
  children?: React.ReactNode;
};

export function MapShell({ children }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <MapCanvasNoSSR>{children}</MapCanvasNoSSR>
    </div>
  );
}
