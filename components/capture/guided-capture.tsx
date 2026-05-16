"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Loader2, RefreshCcw, Upload } from "lucide-react";
import { compressImage } from "@/lib/capture/image";
import {
  generateSequence,
  nextTarget,
  validateCoverage,
  type CaptureMode,
  type CaptureSequence,
  type CaptureTarget,
  type GardenSize,
} from "@/lib/capture/sequence";
import {
  clearCaptures,
  loadCaptures,
  saveCapture,
  type CaptureRecord,
} from "@/lib/capture/storage";
import { cn } from "@/lib/utils";
import { AzimuthCompass } from "./azimuth-compass";
import { ManualAzimuthSelector } from "./manual-azimuth-selector";
import { PhotoGrid } from "./photo-grid";
import { UploadMode } from "./upload-mode";

type Props = {
  customerId: string;
  customerName: string;
  customerAddress: string;
};

type Phase =
  | "loading"
  | "resume"
  | "mode"
  | "size"
  | "capturing"
  | "reviewing"
  | "uploading"
  | "done"
  | "error";

async function putWithRetry(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Blob,
  maxAttempts = 3,
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(url, { method: method || "PUT", headers, body });
      if (resp.ok || (resp.status >= 400 && resp.status < 500)) return resp;
      lastErr = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload failed");
}

const SIZE_OPTIONS: Array<{ value: GardenSize; label: string; description: string }> = [
  {
    value: "small",
    label: "Klein (4 Fotos)",
    description: "Reihenhaus-Garten, Innenhof oder kompaktes Anwesen bis ~300 m².",
  },
  {
    value: "medium",
    label: "Mittel (8 Fotos)",
    description:
      "Standardvilla, mittelgroßer Privatgarten 300–800 m². Empfohlene Standardgröße.",
  },
  {
    value: "large",
    label: "Groß (8 + Multi-World)",
    description:
      "Park, Anwesen oder Firmengelände >800 m² — du capturest mehrere Welten von verschiedenen Standorten.",
  },
];

export function GuidedCapture({ customerId, customerName, customerAddress }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<CaptureMode>("phone");
  const [size, setSize] = useState<GardenSize>("medium");
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [manualHeading, setManualHeading] = useState<number>(0);
  const [useManualSelector, setUseManualSelector] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    stage: "idle" | "compressing" | "uploading" | "submitting";
    label: string;
  }>({ stage: "idle", label: "" });
  const [submissionResult, setSubmissionResult] = useState<{
    operationId: string;
    etaSeconds: number;
  } | null>(null);

  const sequence = useMemo<CaptureSequence>(
    () => generateSequence(size, mode),
    [size, mode],
  );

  // Initial load: check IndexedDB for an in-progress capture for this customer.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const existing = await loadCaptures(customerId);
        if (cancelled) return;
        if (existing.length > 0) {
          setCaptures(existing);
          setPhase("resume");
        } else {
          setPhase("mode");
        }
      } catch (err) {
        console.error("Failed to load captures", err);
        if (!cancelled) setPhase("mode");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const advanceActiveSlot = useCallback((current: CaptureRecord[], seq: CaptureSequence) => {
    const target = nextTarget(
      current.map((c) => ({ slot: c.slot, azimuth: c.azimuth, blobSize: c.blob.size })),
      seq,
    );
    setActiveSlot(target ? target.slot : null);
  }, []);

  const onCapture = useCallback(
    async (slot: number, azimuth: number, blob: Blob) => {
      const target =
        sequence.targets.find((t) => t.slot === slot) ?? sequence.targets[0];
      const compressed = await compressImage(blob);
      const record: CaptureRecord = {
        id: `${customerId}#${slot}`,
        customerId,
        slot,
        azimuth,
        elevation: target.elevation,
        position: target.position,
        blob: compressed,
        createdAt: Date.now(),
      };
      await saveCapture(record);
      setCaptures((prev) => {
        const next = [...prev.filter((c) => c.slot !== slot), record].sort(
          (a, b) => a.slot - b.slot,
        );
        advanceActiveSlot(next, sequence);
        return next;
      });
    },
    [customerId, sequence, advanceActiveSlot],
  );

  const startFresh = useCallback(async () => {
    await clearCaptures(customerId);
    setCaptures([]);
    setPhase("mode");
    setActiveSlot(null);
  }, [customerId]);

  const continueExisting = useCallback(() => {
    setPhase("capturing");
    advanceActiveSlot(captures, sequence);
  }, [captures, sequence, advanceActiveSlot]);

  const goBackHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const submit = useCallback(async () => {
    setPhase("uploading");
    setErrorMessage(null);
    try {
      const fresh = await loadCaptures(customerId);

      // Step 1: get signed upload URLs from Marble (via our server, no file bytes yet).
      setUploadProgress({ stage: "uploading", label: "Bereite Upload vor…" });
      const prepareResp = await fetch("/api/capture/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          files: fresh.map((c) => ({
            slot: c.slot,
            extension: "jpg",
            azimuth: c.azimuth,
          })),
        }),
      });
      if (!prepareResp.ok) {
        const text = await prepareResp.text();
        throw new Error(text || `Vorbereitung fehlgeschlagen (HTTP ${prepareResp.status})`);
      }
      const { uploads } = (await prepareResp.json()) as {
        uploads: Array<{
          slot: number;
          azimuth: number;
          mediaAssetId: string;
          uploadUrl: string;
          uploadMethod: string;
          requiredHeaders: Record<string, string>;
        }>;
      };

      // Step 2: upload each photo directly to Marble's signed URL (browser → GCS).
      // This bypasses Vercel's 4.5 MB function-payload limit entirely; 8 × ~2 MB
      // photos used to fail with FUNCTION_PAYLOAD_TOO_LARGE.
      let completed = 0;
      const totalCount = fresh.length;
      setUploadProgress({
        stage: "uploading",
        label: `Lade Fotos hoch… (0/${totalCount})`,
      });
      const slotByNum = new Map(fresh.map((c) => [c.slot, c]));
      await Promise.all(
        uploads.map(async (u) => {
          const rec = slotByNum.get(u.slot);
          if (!rec) throw new Error(`No capture for slot ${u.slot}`);
          const putResp = await putWithRetry(u.uploadUrl, u.uploadMethod, u.requiredHeaders, rec.blob);
          if (!putResp.ok) {
            throw new Error(
              `Upload für Slot ${u.slot + 1} fehlgeschlagen (HTTP ${putResp.status}).`,
            );
          }
          completed += 1;
          setUploadProgress({
            stage: "uploading",
            label: `Lade Fotos hoch… (${completed}/${totalCount})`,
          });
        }),
      );

      // Step 3: trigger world generation with the media-asset IDs (small JSON payload).
      setUploadProgress({ stage: "submitting", label: "Starte 3D-Generierung…" });
      const slotsWithIds = fresh.map((c) => {
        const u = uploads.find((x) => x.slot === c.slot);
        if (!u) throw new Error(`No mediaAssetId for slot ${c.slot}`);
        return {
          slot: c.slot,
          azimuth: c.azimuth,
          elevation: c.elevation,
          position: c.position,
          mediaAssetId: u.mediaAssetId,
        };
      });

      const resp = await fetch("/api/capture/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-stammkunden-customer-id": customerId,
        },
        body: JSON.stringify({
          customerId,
          size,
          mode,
          reconstruct: sequence.reconstruct,
          slots: slotsWithIds,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const json = (await resp.json()) as { operationId: string; etaSeconds: number };
      await clearCaptures(customerId);
      setSubmissionResult(json);
      setPhase("done");
    } catch (err) {
      console.error("Submit failed", err);
      setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler");
      setPhase("error");
    }
  }, [customerId, mode, sequence.reconstruct, size]);

  if (phase === "loading") {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Lade…
        </div>
      </CaptureShell>
    );
  }

  if (phase === "resume") {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="space-y-4 p-4">
          <h2 className="text-lg font-semibold">Capture fortsetzen?</h2>
          <p className="text-muted-foreground text-sm">
            Für diesen Kunden liegen bereits {captures.length} unfertige Foto(s) im lokalen Speicher.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={continueExisting}
              className="bg-primary text-primary-foreground flex-1 rounded-md py-2 text-sm font-medium"
            >
              Fortsetzen
            </button>
            <button
              type="button"
              onClick={startFresh}
              className="bg-muted text-foreground flex-1 rounded-md py-2 text-sm font-medium"
            >
              Neu beginnen
            </button>
          </div>
        </div>
      </CaptureShell>
    );
  }

  if (phase === "mode") {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Wie willst du capturen?</h2>
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setPhase("size");
            }}
            className="border-border bg-card hover:bg-muted flex w-full items-center gap-3 rounded-lg border p-4 text-left"
          >
            <Camera className="text-primary h-6 w-6" aria-hidden />
            <div>
              <div className="font-medium">Mit Phone capturen</div>
              <div className="text-muted-foreground text-xs">
                Geführter Modus mit Kompass-Coaching, vor Ort beim Kunden.
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              setPhase("size");
            }}
            className="border-border bg-card hover:bg-muted flex w-full items-center gap-3 rounded-lg border p-4 text-left"
          >
            <Upload className="text-primary h-6 w-6" aria-hidden />
            <div>
              <div className="font-medium">Eigene Fotos hochladen</div>
              <div className="text-muted-foreground text-xs">
                Drohnen-Material oder bereits geschossene Fotos vom Kunden.
              </div>
            </div>
          </button>
        </div>
      </CaptureShell>
    );
  }

  if (phase === "size") {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Garten-Größe</h2>
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSize(opt.value);
                setPhase("capturing");
                advanceActiveSlot(captures, generateSequence(opt.value, mode));
              }}
              className="border-border bg-card hover:bg-muted block w-full rounded-lg border p-4 text-left"
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-muted-foreground mt-1 text-xs">{opt.description}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPhase("mode")}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden /> Zurück
          </button>
        </div>
      </CaptureShell>
    );
  }

  if (phase === "uploading") {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="text-muted-foreground flex flex-col items-center gap-3 p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm font-medium">{uploadProgress.label || "Sende Daten…"}</p>
          <p className="text-xs">Bitte das Tab nicht schließen.</p>
        </div>
      </CaptureShell>
    );
  }

  if (phase === "done" && submissionResult) {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="text-primary h-12 w-12" aria-hidden />
          <h2 className="text-lg font-semibold">Capture eingereicht</h2>
          <p className="text-muted-foreground text-sm">
            Marble erstellt jetzt die 3D-Welt — geschätzt ~{Math.round(submissionResult.etaSeconds / 60)}{" "}
            Minuten. Du kannst dieses Tab schließen.
          </p>
          <p className="text-muted-foreground text-xs">
            Operation-ID: <code>{submissionResult.operationId.slice(0, 8)}…</code>
          </p>
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push(`/welt/${customerId}`)}
              className="bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium"
            >
              Status in der 3D-Welt verfolgen
            </button>
            {sequence.multiWorld && (
              <button
                type="button"
                onClick={() => {
                  setSubmissionResult(null);
                  setCaptures([]);
                  setActiveSlot(null);
                  setPhase("size");
                }}
                className="bg-muted text-foreground rounded-md py-2 text-sm font-medium"
              >
                Weiteren Standort capturen
              </button>
            )}
            <button
              type="button"
              onClick={goBackHome}
              className="text-muted-foreground hover:text-foreground py-2 text-xs"
            >
              Zurück zur Karte
            </button>
          </div>
        </div>
      </CaptureShell>
    );
  }

  if (phase === "error") {
    return (
      <CaptureShell title={customerName} subtitle={customerAddress}>
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Etwas ist schiefgelaufen</h2>
          <p className="text-destructive text-sm">{errorMessage}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase("reviewing")}
              className="bg-primary text-primary-foreground flex-1 rounded-md py-2 text-sm font-medium"
            >
              <RefreshCcw className="mr-1 inline h-3 w-3" aria-hidden /> Erneut senden
            </button>
            <button
              type="button"
              onClick={goBackHome}
              className="bg-muted text-foreground flex-1 rounded-md py-2 text-sm font-medium"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </CaptureShell>
    );
  }

  // Capturing or reviewing phase
  const allDone = validateCoverage(
    captures.map((c) => ({ slot: c.slot, azimuth: c.azimuth, blobSize: c.blob.size })),
    sequence,
  );
  const activeTarget: CaptureTarget | undefined =
    activeSlot !== null ? sequence.targets.find((t) => t.slot === activeSlot) : undefined;

  return (
    <CaptureShell title={customerName} subtitle={customerAddress}>
      <div className="space-y-4 p-4">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPhase("size")}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden /> Größe ändern
          </button>
          <span className="text-muted-foreground text-xs">
            {captures.length} / {sequence.count} Fotos
          </span>
        </header>

        {mode === "phone" ? (
          <PhoneCaptureControls
            sequence={sequence}
            target={activeTarget}
            onCapture={onCapture}
            useManualSelector={useManualSelector}
            manualHeading={manualHeading}
            onManualHeadingChange={setManualHeading}
            onCompassUnsupported={() => setUseManualSelector(true)}
          />
        ) : (
          <UploadMode sequence={sequence} onCapture={onCapture} />
        )}

        <PhotoGrid
          sequence={sequence}
          captures={captures}
          activeSlot={activeSlot}
          onSelectSlot={setActiveSlot}
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!allDone}
            onClick={submit}
            className={cn(
              "flex-1 rounded-md py-3 text-sm font-medium",
              allDone
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {allDone ? "🌍 3D-Welt erstellen" : `Noch ${sequence.count - captures.length} Foto(s)`}
          </button>
        </div>
      </div>
    </CaptureShell>
  );
}

type PhoneProps = {
  sequence: CaptureSequence;
  target: CaptureTarget | undefined;
  onCapture: (slot: number, azimuth: number, blob: Blob) => Promise<void>;
  useManualSelector: boolean;
  manualHeading: number;
  onManualHeadingChange: (value: number) => void;
  onCompassUnsupported: () => void;
};

function PhoneCaptureControls({
  sequence,
  target,
  onCapture,
  useManualSelector,
  manualHeading,
  onManualHeadingChange,
  onCompassUnsupported,
}: PhoneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera nicht verfügbar.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 2048 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (err) {
        console.error("Camera init failed", err);
        setCameraError(err instanceof Error ? err.message : "Kamera-Fehler.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const snap = useCallback(async () => {
    if (!videoRef.current || !target || pending) return;
    setPending(true);
    try {
      const video = videoRef.current;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) throw new Error("Kamera nicht bereit.");
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas-Kontext nicht verfügbar.");
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob null"))),
          "image/jpeg",
          0.92,
        );
      });
      const azimuth = useManualSelector ? manualHeading : target.azimuth;
      await onCapture(target.slot, azimuth, blob);
    } finally {
      setPending(false);
    }
  }, [manualHeading, onCapture, pending, target, useManualSelector]);

  if (!target) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        Alle Slots gefüllt — bitte unten „3D-Welt erstellen“ tippen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-card relative aspect-square overflow-hidden rounded-xl">
        {cameraError ? (
          <div className="text-destructive absolute inset-0 flex items-center justify-center p-4 text-center text-sm">
            {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            data-testid="capture-video"
          />
        )}
      </div>

      {useManualSelector ? (
        <ManualAzimuthSelector
          targetAzimuth={target.azimuth}
          hint={target.hint}
          value={manualHeading}
          onChange={onManualHeadingChange}
        />
      ) : (
        <AzimuthCompass
          targetAzimuth={target.azimuth}
          hint={target.hint}
          onUnsupported={onCompassUnsupported}
        />
      )}

      <button
        type="button"
        disabled={!cameraReady || pending}
        onClick={snap}
        className="bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground w-full rounded-full py-4 text-base font-medium"
      >
        {pending ? "Speichere…" : `Foto auslösen — Slot ${target.slot + 1} / ${sequence.count}`}
      </button>
    </div>
  );
}

function CaptureShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background mx-auto flex min-h-screen max-w-md flex-col">
      <header className="border-border bg-card sticky top-0 z-10 border-b p-4">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
