import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _internal,
  assertWithinCap,
  getMonthlyCount,
  incrementMonthly,
} from "../marble/cost-tracker";

describe("cost-tracker (memory fallback)", () => {
  beforeEach(() => {
    delete process.env.EDGE_CONFIG;
    _internal.resetMemory();
  });

  afterEach(() => {
    _internal.resetMemory();
  });

  it("starts at zero", async () => {
    expect(await getMonthlyCount()).toBe(0);
  });

  it("incrementMonthly returns the new total", async () => {
    expect(await incrementMonthly()).toBe(1);
    expect(await incrementMonthly(3)).toBe(4);
    expect(await getMonthlyCount()).toBe(4);
  });

  it("assertWithinCap is a no-op below soft cap", async () => {
    await expect(assertWithinCap({ softCap: 50, hardCap: 100 })).resolves.toBeUndefined();
  });

  it("assertWithinCap throws above hard cap", async () => {
    await incrementMonthly(101);
    await expect(assertWithinCap({ softCap: 50, hardCap: 100 })).rejects.toThrow(/hard-cap/);
  });

  it("logs but does not throw between soft and hard caps", async () => {
    await incrementMonthly(60);
    await expect(assertWithinCap({ softCap: 50, hardCap: 100 })).resolves.toBeUndefined();
  });
});
