import type { Feature, FeatureCollection, Point } from "geojson";
import { customers, type Customer } from "./customers";

export type CustomerProps = {
  id: string;
  name: string;
  status: Customer["status"];
  type: Customer["type"];
  gardenType: Customer["gardenType"];
  iconKey: string;
  isVip: number;
  weight: number;
  revenue: number;
  city: string;
  district: string;
};

export type CustomerFeature = Feature<Point, CustomerProps>;

export function toFeatureCollection(
  list: readonly Customer[],
): FeatureCollection<Point, CustomerProps> {
  const features: CustomerFeature[] = list.map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: c.coordinates },
    properties: {
      id: c.id,
      name: c.name,
      status: c.status,
      type: c.type,
      gardenType: c.gardenType,
      iconKey: `gaigg-${c.gardenType}`,
      isVip: c.status === "vip" ? 1 : 0,
      weight: Math.min(1, Math.max(0.2, c.yearlyRevenueEur / 30_000)),
      revenue: c.yearlyRevenueEur,
      city: c.address.city,
      district: c.address.district,
    },
  }));
  return { type: "FeatureCollection", features };
}

export const customerFeatureCollection = toFeatureCollection(customers);

export const customerIconKeys = Array.from(new Set(customers.map((c) => `gaigg-${c.gardenType}`)));
