"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  url: string;
};

export function SplatIframe({ url }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-card">
      {!loaded ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">3D-Erfassung wird geladen…</span>
        </div>
      ) : null}
      <iframe
        src={url}
        title="3D-Garten-Erfassung"
        className="h-full w-full"
        allow="fullscreen; vr; accelerometer; gyroscope; xr-spatial-tracking"
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />
    </div>
  );
}
