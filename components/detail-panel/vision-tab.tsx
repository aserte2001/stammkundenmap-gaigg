"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, ImageOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GARDEN_SEASONS,
  GARDEN_STYLES,
  type GardenSeason,
  type GardenStyle,
} from "@/lib/openai/prompts";
import type { Customer } from "@/lib/customers";

type Props = {
  customer: Customer;
  available: boolean;
};

type ResultPayload = {
  dataUrl: string;
  cached: boolean;
  promptUsed: string;
  durationMs?: number;
};

export function VisionTab({ customer, available }: Props) {
  const [style, setStyle] = useState<GardenStyle>("modern");
  const [season, setSeason] = useState<GardenSeason>("sommer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!available) {
    return (
      <div className="border-border text-muted-foreground m-auto flex max-w-xs flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-sm">
        <ImageOff className="h-5 w-5" />
        <span>
          Vision-Tab ist aktuell deaktiviert. Bitte <code>OPENAI_API_KEY</code> in der
          Umgebung setzen.
        </span>
      </div>
    );
  }

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/vision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, style, season }),
      });
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") ?? "60";
        setError(`Zu viele Anfragen. Bitte in ~${retryAfter} Sekunden erneut versuchen.`);
        return;
      }
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message ?? "Generierung fehlgeschlagen.");
        return;
      }
      setResult({
        dataUrl: payload.dataUrl,
        cached: Boolean(payload.cached),
        promptUsed: payload.promptUsed ?? "",
        durationMs: payload.durationMs,
      });
      toast(payload.cached ? "Aus dem Cache geladen" : "Vision erzeugt", {
        description: payload.cached
          ? "Bereits generiertes Konzept — instant."
          : `Frische Generierung in ${(payload.durationMs ?? 0 / 1000).toFixed(1)} ms.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Netzwerkfehler";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.dataUrl;
    a.download = `gaigg-vision-${customer.id}-${style}-${season}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex h-full min-h-[340px] flex-col gap-3">
      <div className="border-warning/30 bg-warning/10 text-warning-foreground flex items-start gap-2 rounded-2xl border p-3 text-xs leading-snug">
        <Sparkles className="text-warning mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-warning font-semibold">KI-Konzept</span>
          <span>
            Diese Bilder sind von einer KI generiert. Sie zeigen <strong>kein</strong> echtes
            Foto des Gartens, sondern eine konzeptionelle Vision für{" "}
            <strong>{customer.name}</strong>.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Stil</span>
        <div className="flex flex-wrap gap-1.5">
          {GARDEN_STYLES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setStyle(entry.id)}
              aria-pressed={style === entry.id}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                style === entry.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-foreground hover:bg-muted/60"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Saison</span>
        <div className="flex flex-wrap gap-1.5">
          {GARDEN_SEASONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSeason(entry.id)}
              aria-pressed={season === entry.id}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                season === entry.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-foreground hover:bg-muted/60"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-emerald-600 text-white hover:bg-emerald-500"
        data-testid="vision-generate"
      >
        {loading ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Generiere…
          </>
        ) : (
          <>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Vision generieren
          </>
        )}
      </Button>

      {error ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border p-3 text-xs">
          {error}
        </div>
      ) : null}

      <AnimatePresence>
        {result ? (
          <motion.div
            key={result.dataUrl.slice(-32)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-border relative flex-1 overflow-hidden rounded-2xl border"
          >
            {/* Disclaimer overlay — CSS-injected, cannot be hidden by hiding the markup */}
            <div className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] text-white">
              <Sparkles className="h-2.5 w-2.5" />
              KI-Konzept · keine echte Garten-Vorschau
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.dataUrl}
              alt={`KI-Konzept im Stil ${style}, Saison ${season} für ${customer.name}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
              {result.cached ? (
                <Badge variant="secondary" className="rounded-full bg-black/70 text-[10px] text-white">
                  Cache
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDownload}
                className="bg-black/70 text-white hover:bg-black/85"
              >
                <Download className="mr-1.5 h-3 w-3" />
                Download
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
