"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Camera, Loader2 } from "lucide-react";
import type { Customer } from "@/lib/customers";
import type { SplatMappingStatus } from "@/lib/customers/splat-store";

type Props = {
  customer: Customer;
  status: Extract<SplatMappingStatus, "none" | "processing" | "failed">;
  errorMessage?: string;
  startedAt?: string;
};

export function MarbleStatusShell({ customer, status, errorMessage, startedAt }: Props) {
  const router = useRouter();
  const [secondsSinceCheck, setSecondsSinceCheck] = useState(0);

  // Poll the status endpoint while we wait for Marble to complete.
  useEffect(() => {
    if (status !== "processing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let counter: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      try {
        const res = await fetch(`/api/capture/status?customerId=${customer.id}`, {
          cache: "no-store",
        });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { status: SplatMappingStatus };
          if (data.status !== "processing") {
            router.refresh();
            return;
          }
        }
      } catch (err) {
        console.error("status poll failed", err);
      }
      if (!cancelled) {
          setSecondsSinceCheck(0);
        timer = setTimeout(tick, 30_000);
      }
    };
    timer = setTimeout(tick, 30_000);
    counter = setInterval(() => {
      if (cancelled) return;
      setSecondsSinceCheck((s) => s + 1);
    }, 1000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (counter) clearInterval(counter);
    };
  }, [status, customer.id, router]);

  return (
    <div className="bg-background flex min-h-[100dvh] flex-col">
      <header className="border-border bg-card sticky top-0 border-b px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Karte
          </Link>
          <div className="text-right text-sm">
            <div className="font-semibold">{customer.name}</div>
            <div className="text-muted-foreground text-xs">{customer.address.district}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {status === "none" && <NoneState customerId={customer.id} />}
        {status === "processing" && (
          <ProcessingState startedAt={startedAt} secondsSinceCheck={secondsSinceCheck} />
        )}
        {status === "failed" && (
          <FailedState customerId={customer.id} errorMessage={errorMessage} />
        )}
      </main>
    </div>
  );
}

function NoneState({ customerId }: { customerId: string }) {
  return (
    <>
      <Camera className="text-muted-foreground h-14 w-14" aria-hidden />
      <h1 className="text-xl font-semibold">Diese Welt ist noch nicht in 3D erfasst</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Lege jetzt eine begehbare 3D-Welt für diesen Kunden an. Du brauchst dein Phone vor Ort
        und ungefähr 2 Minuten für die Foto-Sequenz, dann ~5 Minuten Wartezeit für die Generierung.
      </p>
      <Link
        href={`/capture/${customerId}`}
        className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium"
      >
        📷 3D-Welt erstellen
      </Link>
    </>
  );
}

function ProcessingState({
  startedAt,
  secondsSinceCheck,
}: {
  startedAt?: string;
  secondsSinceCheck: number;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    const totalEstimateMs = 5 * 60_000;
    const update = () => {
      const elapsed = Math.max(0, Date.now() - startMs);
      setProgress(Math.min(95, Math.round((elapsed / totalEstimateMs) * 100)));
    };
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <>
      <Loader2 className="text-primary h-14 w-14 animate-spin" aria-hidden />
      <h1 className="text-xl font-semibold">Welt wird vorbereitet…</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Marble erstellt gerade die 3D-Welt. Du kannst dieses Tab schließen — die Karte zeigt den
        Status automatisch an, sobald die Welt fertig ist.
      </p>
      <div className="bg-muted h-2 w-full max-w-xs overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Letzter Check: vor {secondsSinceCheck} s · automatisch alle 30 s.
      </p>
    </>
  );
}

function FailedState({ customerId, errorMessage }: { customerId: string; errorMessage?: string }) {
  return (
    <>
      <AlertCircle className="text-destructive h-14 w-14" aria-hidden />
      <h1 className="text-xl font-semibold">Welt-Generierung fehlgeschlagen</h1>
      {errorMessage && (
        <pre className="bg-muted text-muted-foreground max-w-full overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
          {errorMessage}
        </pre>
      )}
      <p className="text-muted-foreground max-w-md text-sm">
        Marble berechnet nur erfolgreiche Welten — du kannst neu starten ohne zusätzliche Kosten.
      </p>
      <Link
        href={`/capture/${customerId}`}
        className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium"
      >
        Erneut versuchen
      </Link>
    </>
  );
}
