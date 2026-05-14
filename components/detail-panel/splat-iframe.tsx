"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type Props = {
  url: string;
};

type CheckState = "checking" | "ready" | "unavailable";

/**
 * Embeds a Luma Web Gaussian-Splat capture in an iframe.
 *
 * Before mounting the iframe we fire a lightweight CORS fetch against the
 * embed URL — if Luma's server responds with "Could not get artifacts"
 * (capture deleted, private, or never published) we render a friendly
 * placeholder instead of the broken iframe. CORS failures fall through
 * to the iframe path so we never break a valid capture by being defensive.
 */
export function SplatIframe({ url }: Props) {
  const [state, setState] = useState<CheckState>("checking");
  const [trackedUrl, setTrackedUrl] = useState(url);
  // Reset to "checking" if the URL prop changes mid-lifetime (React docs:
  // "adjust state based on props during render" — preferred over setState
  // inside useEffect, which trips the react-hooks/set-state-in-effect rule).
  if (trackedUrl !== url) {
    setTrackedUrl(url);
    setState("checking");
  }

  useEffect(() => {
    let cancelled = false;

    fetch(url, { mode: "cors", credentials: "omit" })
      .then((response) => response.text())
      .then((text) => {
        if (cancelled) return;
        const unavailable =
          text.includes("Could not get artifacts") ||
          text.includes("\"error\":\"not found\"") ||
          text.includes("Capture not found");
        setState(unavailable ? "unavailable" : "ready");
      })
      .catch(() => {
        // CORS / network error → still try the iframe (it might work even when
        // direct fetch is blocked by cross-origin policy).
        if (!cancelled) setState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state === "checking") {
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center rounded-2xl">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">3D-Erfassung wird geprüft…</span>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
        <Sparkles className="text-primary h-9 w-9 opacity-70" />
        <p className="text-foreground text-sm font-semibold">3D-Gaussian-Splat folgt</p>
        <p className="max-w-sm text-xs leading-relaxed">
          Die hochaufgelöste 3D-Erfassung dieses Gartens wird gerade aufbereitet. Für eine
          Vorab-Tour vereinbaren wir gerne einen Termin vor Ort.
        </p>
        <p className="text-muted-foreground/70 text-[11px]">
          Kontakt:&nbsp;
          <span className="text-foreground/80">team@gartengestaltung-gaigg.at</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card relative h-full w-full overflow-hidden rounded-2xl">
      <iframe
        key={url}
        src={url}
        title="3D-Garten-Erfassung"
        className="h-full w-full"
        allow="fullscreen; vr; accelerometer; gyroscope; xr-spatial-tracking"
        loading="lazy"
      />
    </div>
  );
}
