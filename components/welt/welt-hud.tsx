"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  Compass,
  Gauge,
  Locate,
  MapPin,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Customer } from "@/lib/customers";
import type { Hotspot } from "@/lib/welt/hotspot-registry";
import type { WeltTelemetry } from "./welt-canvas-types";
import type { WeltEnvStatus } from "@/lib/welt/env-check";
import { clientEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";

type Props = {
  customer: Customer;
  hotspots: Hotspot[];
  activeHotspotId: string | null;
  telemetry: WeltTelemetry;
  debug?: boolean;
  env: WeltEnvStatus;
  audioEnabled: boolean;
  onJumpToHotspot: (id: string) => void;
  onTogglePause: () => void;
  onToggleAudio: () => void;
};

function formatLatLng(value: number, precision = 4) {
  return value.toFixed(precision);
}

function buildMiniMapUrl(
  lng: number,
  lat: number,
  customerCoords: [number, number],
): string | null {
  const token = clientEnv.mapboxToken;
  if (!token) return null;
  const playerMarker = `pin-s+10b981(${lng.toFixed(5)},${lat.toFixed(5)})`;
  const customerMarker = `pin-s-star+fbbf24(${customerCoords[0].toFixed(5)},${customerCoords[1].toFixed(5)})`;
  const centerLng = (lng + customerCoords[0]) / 2;
  const centerLat = (lat + customerCoords[1]) / 2;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/` +
    `${playerMarker},${customerMarker}/${centerLng},${centerLat},14.5/200x200@2x?access_token=${token}`
  );
}

export function WeltHud({
  customer,
  hotspots,
  activeHotspotId,
  telemetry,
  debug = false,
  env,
  audioEnabled,
  onJumpToHotspot,
  onTogglePause,
  onToggleAudio,
}: Props) {
  const miniMap = useMemo(
    () =>
      buildMiniMapUrl(
        telemetry.position.lng,
        telemetry.position.lat,
        customer.coordinates,
      ),
    [telemetry.position.lat, telemetry.position.lng, customer.coordinates],
  );

  const headingLabel = formatHeading(telemetry.headingDeg);

  return (
    <>
      {/* Top-left: customer card + back */}
      <div className="pointer-events-none absolute top-4 left-4 z-30 flex max-w-[260px] flex-col gap-2 sm:max-w-xs">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="bg-background/85 backdrop-blur-md"
          >
            <Link href={`/?customer=${customer.id}`} aria-label="Zurück zur Karte">
              <ArrowLeft className="h-3.5 w-3.5" />
              Karte
            </Link>
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="bg-background/85 backdrop-blur-md"
            onClick={onToggleAudio}
            aria-label={audioEnabled ? "Audio stummschalten" : "Audio aktivieren"}
          >
            {audioEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="border-border/40 bg-background/75 pointer-events-auto rounded-2xl border p-3 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <MapPin className="text-primary h-3.5 w-3.5" />
            <span className="text-foreground text-sm font-semibold">{customer.name}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            {customer.address.street}, {customer.address.postalCode} {customer.address.city}
          </p>
        </div>
      </div>

      {/* Top-right: mini map */}
      <div className="pointer-events-none absolute top-4 right-4 z-30 hidden flex-col items-end gap-2 sm:flex">
        <div className="border-border/40 bg-background/75 pointer-events-auto h-[160px] w-[160px] overflow-hidden rounded-2xl border p-1 backdrop-blur-md">
          {miniMap ? (
            // Static Mapbox tile snapshot; rotates with player heading.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={miniMap}
              alt="Position auf der Karte"
              className="h-full w-full rounded-xl object-cover"
              style={{ transform: `rotate(${-telemetry.headingDeg}deg)` }}
              loading="lazy"
            />
          ) : (
            <div className="bg-muted/50 text-muted-foreground flex h-full w-full items-center justify-center rounded-xl text-xs">
              Mini-Karte deaktiviert
            </div>
          )}
        </div>
        <div className="border-border/40 bg-background/75 pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md">
          <Compass className="text-primary h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">{Math.round(telemetry.headingDeg)}°</span>
          <span className="text-muted-foreground">{headingLabel}</span>
        </div>
      </div>

      {/* Bottom-center: hotspot pill bar */}
      {hotspots.length > 0 ? (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
          <div className="border-border/40 bg-background/75 pointer-events-auto flex items-center gap-1 rounded-full border p-1 backdrop-blur-md">
            {hotspots.map((hotspot) => {
              const active = activeHotspotId === hotspot.id;
              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => onJumpToHotspot(hotspot.id)}
                  aria-pressed={active}
                  className={`group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-emerald-500/30 text-emerald-100 shadow-inner shadow-emerald-400/30"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Locate className="h-3 w-3" />
                  {hotspot.label}
                </button>
              );
            })}
          </div>
          <div className="bg-background/70 pointer-events-auto rounded-full px-3 py-0.5 text-[10px] text-emerald-200/80 backdrop-blur-sm">
            {telemetry.attribution || "© Google Photorealistic 3D Tiles"}
          </div>
        </div>
      ) : null}

      {/* Bottom-right: telemetry pills */}
      <div className="pointer-events-none absolute right-4 bottom-5 z-30 flex flex-col items-end gap-2">
        <div className="border-border/40 bg-background/75 pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md">
          <Gauge className="text-primary h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">{telemetry.fps} fps</span>
        </div>
        {debug ? (
          <div className="border-border/40 bg-background/75 pointer-events-auto flex flex-col gap-1 rounded-2xl border px-3 py-2 text-[10px] backdrop-blur-md">
            <span>
              lat {formatLatLng(telemetry.position.lat)} · lng {formatLatLng(telemetry.position.lng)}
            </span>
            <span>tiles {telemetry.tilesLoaded}</span>
          </div>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className="bg-background/85 backdrop-blur-md sm:hidden"
          onClick={onTogglePause}
          aria-label="Menü öffnen"
        >
          Menü
        </Button>
      </div>

      {/* Env warning */}
      {!env.openai ? (
        <div className="pointer-events-none absolute top-20 right-4 z-30 hidden sm:block">
          <div className="border-border/40 bg-background/75 pointer-events-auto rounded-full border px-3 py-1 text-[10px] text-amber-300 backdrop-blur-md">
            Vision-Tab erfordert OPENAI_API_KEY
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatHeading(deg: number): string {
  const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  const index = Math.round(((deg % 360) + 360) / 45) % 8;
  return directions[index];
}
