import { beforeEach, describe, expect, it } from "vitest";
import { customers } from "../customers";
import {
  customerById,
  filterCustomers,
  filterStats,
  hasActiveFilters,
  useAppStore,
  type FilterState,
} from "../store";

const initialFilters: FilterState = {
  statuses: new Set(),
  types: new Set(),
  services: new Set(),
  gardenTypes: new Set(),
  search: "",
};

function resetStore() {
  useAppStore.setState({
    selectedCustomerId: null,
    hoveredCustomerId: null,
    filters: {
      statuses: new Set(),
      types: new Set(),
      services: new Set(),
      gardenTypes: new Set(),
      search: "",
    },
    mapStyle: "standard",
    viewportOnlyFilter: false,
    visibleIdsInViewport: new Set(customers.map((c) => c.id)),
    isIntroComplete: false,
    splatViewerOpen: false,
    commandPaletteOpen: false,
    shortcutsDialogOpen: false,
  });
}

beforeEach(() => {
  resetStore();
});

describe("useAppStore actions", () => {
  it("selects and clears a customer", () => {
    useAppStore.getState().select("c-001");
    expect(useAppStore.getState().selectedCustomerId).toBe("c-001");
    useAppStore.getState().select(null);
    expect(useAppStore.getState().selectedCustomerId).toBeNull();
  });

  it("toggles status filter on/off", () => {
    useAppStore.getState().toggleStatus("vip");
    expect(useAppStore.getState().filters.statuses.has("vip")).toBe(true);
    useAppStore.getState().toggleStatus("vip");
    expect(useAppStore.getState().filters.statuses.has("vip")).toBe(false);
  });

  it("toggles service filter", () => {
    useAppStore.getState().toggleService("baumpflege");
    expect(useAppStore.getState().filters.services.has("baumpflege")).toBe(true);
  });

  it("clears all filters", () => {
    useAppStore.getState().toggleStatus("vip");
    useAppStore.getState().toggleType("privat");
    useAppStore.getState().setSearch("hofer");
    useAppStore.getState().clearFilters();
    const f = useAppStore.getState().filters;
    expect(f.statuses.size).toBe(0);
    expect(f.types.size).toBe(0);
    expect(f.search).toBe("");
  });

  it("flips viewport filter flag", () => {
    expect(useAppStore.getState().viewportOnlyFilter).toBe(false);
    useAppStore.getState().toggleViewportFilter();
    expect(useAppStore.getState().viewportOnlyFilter).toBe(true);
  });

  it("marks intro complete", () => {
    expect(useAppStore.getState().isIntroComplete).toBe(false);
    useAppStore.getState().markIntroComplete();
    expect(useAppStore.getState().isIntroComplete).toBe(true);
  });
});

describe("filterCustomers", () => {
  it("returns all customers when filters are empty", () => {
    expect(filterCustomers(customers, initialFilters).length).toBe(customers.length);
  });

  it("filters by status", () => {
    const result = filterCustomers(customers, {
      ...initialFilters,
      statuses: new Set(["vip"]),
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.status === "vip")).toBe(true);
  });

  it("filters by type", () => {
    const result = filterCustomers(customers, {
      ...initialFilters,
      types: new Set(["oeffentlich"]),
    });
    expect(result.length).toBe(3);
    expect(result.every((c) => c.type === "oeffentlich")).toBe(true);
  });

  it("filters by service overlap", () => {
    const result = filterCustomers(customers, {
      ...initialFilters,
      services: new Set(["teichbau"]),
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.services.includes("teichbau"))).toBe(true);
  });

  it("filters by search term (fuzzy)", () => {
    const result = filterCustomers(customers, { ...initialFilters, search: "hofer" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((c) => c.name.toLowerCase().includes("hofer"))).toBe(true);
  });

  it("filters by district via search", () => {
    const result = filterCustomers(customers, { ...initialFilters, search: "Pöstlingberg" });
    expect(result.some((c) => c.address.district === "Pöstlingberg")).toBe(true);
  });

  it("respects viewport-only when activated", () => {
    const result = filterCustomers(customers, initialFilters, {
      viewportOnly: true,
      visibleIds: new Set(["c-001", "c-002"]),
    });
    expect(result.length).toBe(2);
    expect(result.map((c) => c.id).sort()).toEqual(["c-001", "c-002"]);
  });
});

describe("filterStats", () => {
  it("computes aggregate stats", () => {
    const stats = filterStats(customers as never);
    expect(stats.count).toBe(customers.length);
    expect(stats.yearlyRevenueEur).toBeGreaterThan(0);
    expect(stats.vipCount).toBeGreaterThan(0);
    expect(stats.splatCount).toBe(2);
  });
});

describe("hasActiveFilters", () => {
  it("returns false for empty filters", () => {
    expect(hasActiveFilters(initialFilters)).toBe(false);
  });

  it("returns true when search has value", () => {
    expect(hasActiveFilters({ ...initialFilters, search: "hofer" })).toBe(true);
  });

  it("returns true when any chip is active", () => {
    expect(hasActiveFilters({ ...initialFilters, statuses: new Set(["vip"]) })).toBe(true);
  });
});

describe("customerById", () => {
  it("finds a customer by id", () => {
    expect(customerById("c-001")?.name).toContain("Hofer");
  });

  it("returns undefined when id is null", () => {
    expect(customerById(null)).toBeUndefined();
  });
});
