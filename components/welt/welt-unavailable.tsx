import Link from "next/link";
import { ArrowLeft, Compass, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customers";

type Props = {
  customer: Customer;
  reason: "googleTiles" | "webgl" | "generic";
  details?: string;
};

const REASON_COPY: Record<Props["reason"], { title: string; body: string }> = {
  googleTiles: {
    title: "Google Photorealistic 3D Tiles werden konfiguriert",
    body: "Für diese Welt fehlt aktuell der NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Setzen Sie den Key in der Vercel-Environment oder in `.env.local`, dann erscheint die Welt automatisch.",
  },
  webgl: {
    title: "Dieser Browser unterstützt kein WebGL2",
    body: "Die begehbare Welt nutzt WebGL2 für Photo-Tiles und Splat-Rendering. Bitte mit einem aktuellen Chromium-, Firefox- oder Safari-Browser öffnen.",
  },
  generic: {
    title: "Die Welt ist gerade nicht verfügbar",
    body: "Bitte versuchen Sie es in einigen Minuten erneut oder kehren Sie zur Übersicht zurück.",
  },
};

export function WeltUnavailable({ customer, reason, details }: Props) {
  const copy = REASON_COPY[reason];
  return (
    <div className="bg-background text-foreground relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(0.42_0.06_148/0.55),transparent_70%)]" />
      <div className="border-border bg-card/80 relative z-10 flex max-w-lg flex-col items-center gap-5 rounded-3xl border p-8 text-center shadow-xl backdrop-blur-xl">
        <div className="bg-primary/15 text-primary rounded-full p-4">
          {reason === "googleTiles" ? (
            <Key className="h-8 w-8" />
          ) : (
            <Compass className="h-8 w-8" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{copy.body}</p>
          {details ? (
            <p className="text-muted-foreground/80 mt-1 text-xs leading-relaxed">{details}</p>
          ) : null}
        </div>
        <div className="border-border/60 bg-muted/40 mt-2 flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed p-4">
          <span className="text-muted-foreground text-xs">Geplante Welt für</span>
          <span className="text-foreground text-base font-semibold">{customer.name}</span>
          <span className="text-muted-foreground text-xs">
            {customer.address.street}, {customer.address.postalCode} {customer.address.city}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href={`/?customer=${customer.id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Zurück zur Karte
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
