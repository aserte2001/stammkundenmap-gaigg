/**
 * Pure capture-sequence logic.
 *
 * Marble's `multi_image_prompt` accepts up to 4 images by default and up to 8
 * with `reconstruct_images: true` (verified in Phase 0). We expose three preset
 * sizes; the "large" preset still produces 8 images per world but instructs the
 * user to capture multiple worlds from different vantage points (Multi-World).
 */
export type GardenSize = "small" | "medium" | "large";
export type CaptureMode = "phone" | "upload";

export type CaptureTarget = {
  /** Stable slot index used by IndexedDB and the UI grid. */
  slot: number;
  /** Compass azimuth in degrees [0..360). 0=N, 90=E, 180=S, 270=W. */
  azimuth: number;
  /** Camera tilt in degrees. 0=horizon, +up, -down. Optional hint for the UI. */
  elevation: number;
  /** Position label for multi-position captures (Standort 1 / 2). */
  position: string;
  /** Human-readable hint shown next to the compass arrow. */
  hint: string;
};

export type CaptureSequence = {
  size: GardenSize;
  mode: CaptureMode;
  /** Number of images this sequence expects. */
  count: number;
  /** Whether to set `reconstruct_images: true` when calling Marble. */
  reconstruct: boolean;
  targets: CaptureTarget[];
  /** True if the user must capture additional worlds beyond this sequence. */
  multiWorld: boolean;
};

const LABELS_4 = [
  { az: 0, hint: "Norden — Hauptansicht des Gartens" },
  { az: 90, hint: "Osten — Seitenansicht rechts" },
  { az: 180, hint: "Süden — Rückseite" },
  { az: 270, hint: "Westen — Seitenansicht links" },
];

const LABELS_8 = [
  { az: 0, hint: "Norden" },
  { az: 45, hint: "Nordost" },
  { az: 90, hint: "Osten" },
  { az: 135, hint: "Südost" },
  { az: 180, hint: "Süden" },
  { az: 225, hint: "Südwest" },
  { az: 270, hint: "Westen" },
  { az: 315, hint: "Nordwest" },
];

export function generateSequence(size: GardenSize, mode: CaptureMode): CaptureSequence {
  switch (size) {
    case "small":
      return {
        size,
        mode,
        count: 4,
        reconstruct: false,
        multiWorld: false,
        targets: LABELS_4.map((l, i) => ({
          slot: i,
          azimuth: l.az,
          elevation: 0,
          position: "Standort 1",
          hint: l.hint,
        })),
      };
    case "medium":
      return {
        size,
        mode,
        count: 8,
        reconstruct: true,
        multiWorld: false,
        targets: LABELS_8.map((l, i) => ({
          slot: i,
          azimuth: l.az,
          elevation: 0,
          position: "Standort 1",
          hint: l.hint,
        })),
      };
    case "large":
      // 8 images for the API call, but flagged as multi-world so the UI nudges
      // the user to start another sequence from a second vantage point.
      return {
        size,
        mode,
        count: 8,
        reconstruct: true,
        multiWorld: true,
        targets: LABELS_8.map((l, i) => ({
          slot: i,
          azimuth: l.az,
          elevation: 0,
          position: "Standort 1",
          hint: l.hint,
        })),
      };
  }
}

export type CapturedSlot = {
  slot: number;
  azimuth: number;
  blobSize: number;
};

export function nextTarget(
  captures: ReadonlyArray<CapturedSlot>,
  sequence: CaptureSequence,
): CaptureTarget | null {
  const taken = new Set(captures.map((c) => c.slot));
  for (const target of sequence.targets) {
    if (!taken.has(target.slot)) return target;
  }
  return null;
}

export function validateCoverage(
  captures: ReadonlyArray<CapturedSlot>,
  sequence: CaptureSequence,
): boolean {
  if (captures.length !== sequence.count) return false;
  const taken = new Set(captures.map((c) => c.slot));
  return sequence.targets.every((t) => taken.has(t.slot));
}

/** Smallest signed angular delta from `current` to `target` in degrees. */
export function angularDelta(current: number, target: number): number {
  const normalised = ((target - current + 540) % 360) - 180;
  return normalised;
}

/** True when the device heading is within the on-target threshold. */
export function isOnTarget(current: number, target: number, thresholdDeg = 15): boolean {
  return Math.abs(angularDelta(current, target)) <= thresholdDeg;
}
