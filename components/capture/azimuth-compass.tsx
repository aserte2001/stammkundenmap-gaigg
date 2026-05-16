"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import { angularDelta, isOnTarget } from "@/lib/capture/sequence";
import { cn } from "@/lib/utils";

type Props = {
  targetAzimuth: number;
  hint: string;
  onUnsupported: () => void;
};

type IosOrientationEventCtor = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type IosOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  absolute?: boolean;
};

type WindowWithAbsoluteEvent = Window & {
  ondeviceorientationabsolute?: unknown;
};

const NO_SIGNAL_TIMEOUT_MS = 6_000;

function detectInitialPermission(): "unknown" | "granted" | "needs-prompt" {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
    return "unknown";
  }
  const ctor = DeviceOrientationEvent as unknown as IosOrientationEventCtor;
  return typeof ctor.requestPermission === "function" ? "needs-prompt" : "granted";
}

export function AzimuthCompass({ targetAzimuth, hint, onUnsupported }: Props) {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(() =>
    typeof window !== "undefined" && typeof DeviceOrientationEvent === "undefined"
      ? "Dein Browser hat keinen Kompass-Sensor."
      : null,
  );
  const [permission, setPermission] = useState<
    "unknown" | "granted" | "denied" | "needs-prompt"
  >(detectInitialPermission);
  const onUnsupportedRef = useRef(onUnsupported);

  useEffect(() => {
    onUnsupportedRef.current = onUnsupported;
  }, [onUnsupported]);

  useEffect(() => {
    if (error) onUnsupportedRef.current();
  }, [error]);

  useEffect(() => {
    if (permission !== "granted") return;
    let received = false;
    const handler = (event: IosOrientationEvent) => {
      // Priority order:
      //  1. webkitCompassHeading (iOS Safari) — already in 0..360 magnetic North
      //  2. event.absolute === true with valid alpha (Android Chrome
      //     `deviceorientationabsolute` + some Firefox builds) — alpha is the
      //     compass bearing measured counter-clockwise from magnetic North,
      //     so the screen-up direction is `(360 - alpha) % 360`.
      //  3. Plain `deviceorientation` alpha (last resort, may be relative
      //     to the page-load orientation on some Android devices, but
      //     better than nothing).
      let compass: number | null = null;
      if (typeof event.webkitCompassHeading === "number") {
        compass = event.webkitCompassHeading;
      } else if (typeof event.alpha === "number") {
        compass = (360 - event.alpha) % 360;
      }
      if (compass !== null && Number.isFinite(compass)) {
        received = true;
        setHeading(compass);
      }
    };

    // Prefer `deviceorientationabsolute` on Android (gives true magnetic
    // North). Fall back to plain `deviceorientation` if not supported.
    const w = window as WindowWithAbsoluteEvent;
    const useAbsolute = "ondeviceorientationabsolute" in w;
    const eventName = useAbsolute ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, handler as EventListener, true);

    // No-signal timeout: desktops and some Android devices without a
    // magnetometer never fire the event. After 6 s, hand off to the
    // manual selector so the user is never stuck on a spinner.
    const timeoutId = window.setTimeout(() => {
      if (!received) {
        setError("Kein Kompass-Signal — bitte manuell ausrichten.");
        onUnsupportedRef.current();
      }
    }, NO_SIGNAL_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(eventName, handler as EventListener, true);
    };
  }, [permission]);

  const requestIosPermission = useCallback(async () => {
    const ctor = DeviceOrientationEvent as unknown as IosOrientationEventCtor;
    if (typeof ctor.requestPermission !== "function") return;
    try {
      const result = await ctor.requestPermission();
      if (result === "granted") {
        setPermission("granted");
      } else {
        setPermission("denied");
        setError("Kompass-Berechtigung verweigert.");
        onUnsupportedRef.current();
      }
    } catch (err) {
      console.error("DeviceOrientation permission error", err);
      setError("Kompass nicht verfügbar — manueller Modus.");
      onUnsupportedRef.current();
    }
  }, []);

  const switchToManual = useCallback(() => {
    onUnsupportedRef.current();
  }, []);

  if (permission === "needs-prompt") {
    return (
      <div className="flex flex-col items-center gap-3 p-4 text-center">
        <Compass className="text-primary h-12 w-12" aria-hidden />
        <p className="text-sm">
          Bitte gib den Kompass frei, damit dich die App durch den Capture leiten kann.
        </p>
        <button
          type="button"
          onClick={requestIosPermission}
          className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium"
        >
          Kompass aktivieren
        </button>
        <button
          type="button"
          onClick={switchToManual}
          className="text-muted-foreground text-xs underline"
        >
          oder manuell ausrichten
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 p-4 text-center text-sm">
        <Compass className="h-8 w-8 opacity-60" aria-hidden />
        <p>{error}</p>
      </div>
    );
  }

  if (heading === null) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 p-4 text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Kompass kalibriert sich…
        </div>
        <button
          type="button"
          onClick={switchToManual}
          className="text-xs underline"
        >
          Manuell ausrichten
        </button>
      </div>
    );
  }

  const delta = angularDelta(heading, targetAzimuth);
  const onTarget = isOnTarget(heading, targetAzimuth, 15);

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div
        className={cn(
          "relative h-44 w-44 rounded-full border-4 transition-colors",
          onTarget ? "border-primary bg-primary/10" : "border-border bg-card",
        )}
        role="img"
        aria-label={`Kompass — ${onTarget ? "auf Ziel" : "drehe dich"}`}
        data-testid="azimuth-compass-dial"
      >
        <span className="text-muted-foreground absolute top-1 left-1/2 -translate-x-1/2 text-xs font-medium">
          N
        </span>
        <span className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2 text-xs font-medium">
          E
        </span>
        <span className="text-muted-foreground absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium">
          S
        </span>
        <span className="text-muted-foreground absolute top-1/2 left-1 -translate-y-1/2 text-xs font-medium">
          W
        </span>
        <div
          className={cn(
            "absolute top-1/2 left-1/2 h-[70%] w-1 origin-bottom rounded-full transition-transform",
            onTarget ? "bg-primary" : "bg-foreground/70",
          )}
          style={{
            transform: `translate(-50%, -100%) rotate(${delta}deg)`,
          }}
          aria-hidden
        />
        <div className="bg-foreground absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>
      <div className="text-center text-sm">
        <p className="font-medium">{hint}</p>
        <p className="text-muted-foreground text-xs">
          Ziel: {Math.round(targetAzimuth)}° · aktuell: {Math.round(heading)}° · Δ{" "}
          {delta > 0 ? "+" : ""}
          {Math.round(delta)}°
        </p>
        {onTarget && (
          <p className="text-primary mt-1 text-sm font-semibold">✓ Auf Ziel — bitte auslösen</p>
        )}
      </div>
      <button
        type="button"
        onClick={switchToManual}
        className="text-muted-foreground text-xs underline"
      >
        Lieber manuell ausrichten
      </button>
    </div>
  );
}
