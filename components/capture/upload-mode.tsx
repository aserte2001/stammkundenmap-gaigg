"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import exifr from "exifr";
import { compressImage } from "@/lib/capture/image";
import type { CaptureSequence } from "@/lib/capture/sequence";
import { cn } from "@/lib/utils";

type Props = {
  sequence: CaptureSequence;
  onCapture: (slot: number, azimuth: number, blob: Blob) => Promise<void>;
};

const COMPASS_OPTIONS = [
  { value: 0, label: "N (0°)" },
  { value: 45, label: "NE (45°)" },
  { value: 90, label: "E (90°)" },
  { value: 135, label: "SE (135°)" },
  { value: 180, label: "S (180°)" },
  { value: 225, label: "SW (225°)" },
  { value: 270, label: "W (270°)" },
  { value: 315, label: "NW (315°)" },
];

export function UploadMode({ sequence, onCapture }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<number>(() => sequence.targets[0].slot);
  const [activeAzimuth, setActiveAzimuth] = useState<number>(
    () => sequence.targets[0].azimuth,
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setPending(true);
      setError(null);
      try {
        const file = files[0];
        // Try to read EXIF GPS heading; fall back to user-selected dropdown.
        let inferredAzimuth: number | null = null;
        try {
          const meta = (await exifr.parse(file, ["GPSImgDirection"])) as
            | { GPSImgDirection?: number }
            | undefined;
          if (meta && typeof meta.GPSImgDirection === "number") {
            inferredAzimuth = meta.GPSImgDirection;
          }
        } catch {
          // EXIF parsing failures are non-fatal — user always has the dropdown.
        }
        const azimuth =
          inferredAzimuth !== null
            ? inferredAzimuth
            : activeAzimuth;
        const compressed = await compressImage(file);
        await onCapture(activeSlot, azimuth, compressed);
        // Auto-advance to the next slot if there is one.
        const idx = sequence.targets.findIndex((t) => t.slot === activeSlot);
        const nextTarget = sequence.targets[idx + 1];
        if (nextTarget) {
          setActiveSlot(nextTarget.slot);
          setActiveAzimuth(nextTarget.azimuth);
        }
      } catch (err) {
        console.error("Upload failed", err);
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      } finally {
        setPending(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [activeSlot, activeAzimuth, onCapture, sequence.targets],
  );

  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="upload-slot">
          Slot
        </label>
        <select
          id="upload-slot"
          value={activeSlot}
          onChange={(e) => {
            const slot = Number(e.target.value);
            const target = sequence.targets.find((t) => t.slot === slot);
            setActiveSlot(slot);
            if (target) setActiveAzimuth(target.azimuth);
          }}
          className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
        >
          {sequence.targets.map((t) => (
            <option key={t.slot} value={t.slot}>
              Slot {t.slot + 1} · {t.azimuth}° · {t.hint}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="upload-azimuth">
          Himmelsrichtung (überschreibt EXIF)
        </label>
        <select
          id="upload-azimuth"
          value={activeAzimuth}
          onChange={(e) => setActiveAzimuth(Number(e.target.value))}
          className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
        >
          {COMPASS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Wenn das Foto GPS-Daten enthält (z.B. Drohne), wird die Richtung automatisch übernommen.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
        id="upload-file"
      />
      <label
        htmlFor="upload-file"
        className={cn(
          "border-border bg-background hover:bg-muted flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {pending ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-6 w-6" aria-hidden />
        )}
        <span>{pending ? "Komprimiere…" : "Foto auswählen"}</span>
      </label>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
