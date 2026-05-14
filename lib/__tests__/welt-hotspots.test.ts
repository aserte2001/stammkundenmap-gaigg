import { describe, expect, it } from "vitest";
import {
  getHotspotsForCustomer,
  getPrimaryHotspot,
  listAllHotspots,
} from "@/lib/welt/hotspot-registry";

describe("hotspot registry", () => {
  it("returns Villa Hofer hotspot", () => {
    const hotspots = getHotspotsForCustomer({ id: "c-001" });
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots[0].id).toBe("villa-hofer-main");
    expect(hotspots[0].splatUrl).toMatch(/lumalabs\.ai/);
  });

  it("returns primary hotspot for VIPs with splat demos", () => {
    const primary = getPrimaryHotspot({ id: "c-001" });
    expect(primary).toBeDefined();
    expect(primary?.label).toContain("Villa Hofer");
  });

  it("returns empty list for unknown customers", () => {
    const hotspots = getHotspotsForCustomer({ id: "c-nope" });
    expect(hotspots).toEqual([]);
    expect(getPrimaryHotspot({ id: "c-nope" })).toBeUndefined();
  });

  it("listAllHotspots returns flattened entries with customer ids", () => {
    const all = listAllHotspots();
    expect(all.length).toBeGreaterThanOrEqual(1);
    for (const h of all) {
      expect(typeof h.customerId).toBe("string");
      expect(typeof h.id).toBe("string");
      expect(typeof h.lat).toBe("number");
      expect(typeof h.lng).toBe("number");
    }
  });
});
