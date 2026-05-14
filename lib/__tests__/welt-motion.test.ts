import { describe, expect, it } from "vitest";
import {
  DEFAULT_MOTION_CONFIG,
  clamp,
  computeDesiredVelocity,
  integrateVelocity,
} from "@/lib/welt/motion";

describe("motion math", () => {
  it("clamp pins values into the requested range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("zero input zeros velocity exponentially", () => {
    const after = integrateVelocity(10, 0, 1, 6);
    expect(after).toBeLessThan(1);
    expect(after).toBeGreaterThan(0);
  });

  it("velocity approaches target asymptotically", () => {
    let v = 0;
    for (let i = 0; i < 30; i += 1) {
      v = integrateVelocity(v, 5, 0.1, 4);
    }
    expect(Math.abs(v - 5)).toBeLessThan(0.05);
  });

  it("walking speed used by default", () => {
    const desired = computeDesiredVelocity(
      { forward: 1, strafe: 0, vertical: 0 },
      DEFAULT_MOTION_CONFIG,
      { sprint: false, fly: false },
    );
    expect(desired.forward).toBeCloseTo(DEFAULT_MOTION_CONFIG.walkingSpeed, 5);
    expect(desired.right).toBe(0);
    expect(desired.up).toBe(0);
  });

  it("sprint multiplies walking speed", () => {
    const desired = computeDesiredVelocity(
      { forward: 1, strafe: 0, vertical: 0 },
      DEFAULT_MOTION_CONFIG,
      { sprint: true, fly: false },
    );
    expect(desired.forward).toBeCloseTo(
      DEFAULT_MOTION_CONFIG.walkingSpeed * DEFAULT_MOTION_CONFIG.sprintMultiplier,
      5,
    );
  });

  it("fly mode uses flight speed and allows vertical movement", () => {
    const desired = computeDesiredVelocity(
      { forward: 0, strafe: 0, vertical: 1 },
      DEFAULT_MOTION_CONFIG,
      { sprint: false, fly: true },
    );
    expect(desired.up).toBeCloseTo(DEFAULT_MOTION_CONFIG.flightSpeed, 5);
  });

  it("diagonal input is clamped to unit disk", () => {
    const desired = computeDesiredVelocity(
      { forward: 1, strafe: 1, vertical: 0 },
      DEFAULT_MOTION_CONFIG,
      { sprint: false, fly: false },
    );
    const magnitude = Math.hypot(desired.forward, desired.right);
    expect(magnitude).toBeCloseTo(DEFAULT_MOTION_CONFIG.walkingSpeed, 5);
  });

  it("max speed cap prevents runaway", () => {
    const desired = computeDesiredVelocity(
      { forward: 10, strafe: 0, vertical: 0 },
      { ...DEFAULT_MOTION_CONFIG, walkingSpeed: 100, flightSpeed: 100, maxSpeed: 20 },
      { sprint: false, fly: false },
    );
    expect(desired.forward).toBeLessThanOrEqual(20.0001);
  });

  it("no vertical motion when not flying", () => {
    const desired = computeDesiredVelocity(
      { forward: 0, strafe: 0, vertical: 1 },
      DEFAULT_MOTION_CONFIG,
      { sprint: false, fly: false },
    );
    expect(desired.up).toBe(0);
  });

  it("integration with high friction collapses instantly", () => {
    const after = integrateVelocity(10, 0, 1, 100);
    expect(after).toBeLessThan(0.01);
  });

  it("integration with zero friction keeps velocity constant", () => {
    const after = integrateVelocity(10, 10, 0.5, 0);
    expect(after).toBeCloseTo(10, 5);
  });
});
