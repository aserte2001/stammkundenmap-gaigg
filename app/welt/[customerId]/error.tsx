"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WeltError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Welt] Route error", error);
  }, [error]);

  return (
    <div className="bg-background text-foreground flex h-dvh w-full flex-col items-center justify-center gap-6 p-6">
      <div className="bg-warning/10 text-warning rounded-full p-4">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Die Welt konnte nicht geladen werden</h1>
        <p className="text-muted-foreground text-sm">
          Ein Renderer-Fehler hat die begehbare 3D-Welt gestoppt. Sie können einen neuen Versuch
          starten oder zur Übersicht zurückkehren.
        </p>
        {error.digest ? (
          <code className="bg-muted text-muted-foreground mt-2 rounded px-2 py-1 text-xs">
            Fehler-Code: {error.digest}
          </code>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset} variant="default">
          Erneut versuchen
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Zurück zur Karte</Link>
        </Button>
      </div>
    </div>
  );
}
