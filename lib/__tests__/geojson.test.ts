import { describe, expect, it } from "vitest";
import { customers } from "../customers";
import { customerFeatureCollection, customerIconKeys, toFeatureCollection } from "../geojson";

describe("toFeatureCollection", () => {
  it("produces a Feature for every customer", () => {
    const fc = toFeatureCollection(customers);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.length).toBe(customers.length);
  });

  it("encodes VIP status into isVip=1", () => {
    const fc = toFeatureCollection(customers);
    const vipFeatures = fc.features.filter((f) => f.properties.isVip === 1);
    const expected = customers.filter((c) => c.status === "vip");
    expect(vipFeatures.length).toBe(expected.length);
  });

  it("derives iconKey from gardenType", () => {
    const fc = toFeatureCollection(customers.slice(0, 3));
    expect(fc.features[0].properties.iconKey).toBe(`gaigg-${customers[0].gardenType}`);
  });

  it("clamps weight between 0.2 and 1", () => {
    const fc = toFeatureCollection(customers);
    for (const f of fc.features) {
      expect(f.properties.weight).toBeGreaterThanOrEqual(0.2);
      expect(f.properties.weight).toBeLessThanOrEqual(1);
    }
  });

  it("uses customer coordinates as Point geometry", () => {
    const fc = toFeatureCollection([customers[0]]);
    expect(fc.features[0].geometry.coordinates).toEqual(customers[0].coordinates);
  });

  it("exports a pre-computed FeatureCollection", () => {
    expect(customerFeatureCollection.features.length).toBe(customers.length);
  });

  it("exposes unique icon keys", () => {
    expect(customerIconKeys.length).toBeGreaterThan(0);
    expect(new Set(customerIconKeys).size).toBe(customerIconKeys.length);
  });
});
