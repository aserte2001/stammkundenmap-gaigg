"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Box, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SplatIframe } from "./splat-iframe";

const SplatThreeRendererNoSSR = dynamic(
  () => import("./splat-three-renderer").then((m) => m.SplatThreeRenderer),
  { ssr: false, loading: () => null },
);

type Props = {
  url: string;
};

type Mode = "iframe" | "three";

export function SplatViewer({ url }: Props) {
  const [mode, setMode] = useState<Mode>("iframe");

  useEffect(() => {
    toast("3D-Erfassung wird geladen…", {
      description:
        mode === "iframe"
          ? "Iframe-Modus — schnellster Start"
          : "Three.js-Renderer — höchste Detailtreue",
      duration: 2_500,
    });
  }, [mode]);

  return (
    <div className="flex h-full min-h-[340px] flex-col gap-2">
      <div className="flex items-center justify-end gap-1">
        <Button
          size="sm"
          variant={mode === "iframe" ? "default" : "outline"}
          onClick={() => setMode("iframe")}
          className="gap-1.5 rounded-full"
        >
          <Eye className="h-3.5 w-3.5" />
          Iframe
        </Button>
        <Button
          size="sm"
          variant={mode === "three" ? "default" : "outline"}
          onClick={() => setMode("three")}
          className="gap-1.5 rounded-full"
        >
          <Box className="h-3.5 w-3.5" />
          Three.js
        </Button>
      </div>
      <div className="relative flex-1">
        {mode === "iframe" ? <SplatIframe url={url} /> : <SplatThreeRendererNoSSR url={url} />}
      </div>
    </div>
  );
}
