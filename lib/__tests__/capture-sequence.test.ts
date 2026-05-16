import { describe, expect, it } from "vitest";
import {
  angularDelta,
  generateSequence,
  isOnTarget,
  nextTarget,
  validateCoverage,
  type CapturedSlot,
} from "../capture/sequence";

describe("generateSequence", () => {
  it("returns 4 cardinal targets for small gardens", () => {
    const seq = generateSequence("small", "phone");
    expect(seq.count).toBe(4);
    expect(seq.reconstruct).toBe(false);
    expect(seq.multiWorld).toBe(false);
    expect(seq.targets.map((t) => t.azimuth)).toEqual([0, 90, 180, 270]);
  });

  it("returns 8 octant targets with reconstruct flag for medium gardens", () => {
    const seq = generateSequence("medium", "upload");
    expect(seq.count).toBe(8);
    expect(seq.reconstruct).toBe(true);
    expect(seq.multiWorld).toBe(false);
    expect(seq.targets.map((t) => t.azimuth)).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
  });

  it("flags large gardens as multi-world but still caps a single sequence at 8", () => {
    const seq = generateSequence("large", "phone");
    expect(seq.count).toBe(8);
    expect(seq.reconstruct).toBe(true);
    expect(seq.multiWorld).toBe(true);
  });

  it("assigns sequential, unique slots", () => {
    for (const size of ["small", "medium", "large"] as const) {
      const seq = generateSequence(size, "phone");
      const slots = seq.targets.map((t) => t.slot);
      expect(new Set(slots).size).toBe(slots.length);
      expect(slots).toEqual(Array.from({ length: seq.count }, (_, i) => i));
    }
  });
});

describe("nextTarget / validateCoverage", () => {
  const seq = generateSequence("small", "phone");
  const cap = (slot: number): CapturedSlot => ({ slot, azimuth: slot * 90, blobSize: 100 });

  it("returns the first uncovered slot", () => {
    expect(nextTarget([], seq)?.slot).toBe(0);
    expect(nextTarget([cap(0)], seq)?.slot).toBe(1);
    expect(nextTarget([cap(0), cap(2)], seq)?.slot).toBe(1);
  });

  it("returns null when every slot has a capture", () => {
    expect(nextTarget([cap(0), cap(1), cap(2), cap(3)], seq)).toBeNull();
  });

  it("validates only when the count and slot identities match", () => {
    expect(validateCoverage([], seq)).toBe(false);
    expect(validateCoverage([cap(0), cap(1), cap(2), cap(3)], seq)).toBe(true);
    // wrong slot index
    expect(validateCoverage([cap(0), cap(1), cap(2), cap(7)], seq)).toBe(false);
    // duplicate slot is treated as missing coverage
    expect(validateCoverage([cap(0), cap(0), cap(1), cap(2)], seq)).toBe(false);
  });
});

describe("angularDelta / isOnTarget", () => {
  it("computes the smallest signed delta", () => {
    expect(angularDelta(0, 10)).toBe(10);
    expect(angularDelta(350, 10)).toBe(20);
    expect(angularDelta(10, 350)).toBe(-20);
    // 180° apart is mathematically ambiguous; we just need |delta| === 180
    expect(Math.abs(angularDelta(180, 0))).toBe(180);
  });

  it("clamps wrap-around correctly", () => {
    expect(angularDelta(359, 0)).toBe(1);
    expect(angularDelta(0, 359)).toBe(-1);
  });

  it("treats |delta| <= threshold as on-target", () => {
    expect(isOnTarget(0, 10)).toBe(true);
    expect(isOnTarget(0, 16)).toBe(false);
    expect(isOnTarget(355, 5, 15)).toBe(true);
    expect(isOnTarget(0, 0)).toBe(true);
  });
});
