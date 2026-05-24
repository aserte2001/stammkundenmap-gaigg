import { create } from "zustand";
import Fuse from "fuse.js";
import {
  customers,
  type Customer,
  type CustomerStatus,
  type CustomerType,
  type GardenType,
  type Service,
} from "./customers";
import { detectSeason, type Season } from "./season";

export type MapStyleKey = "standard" | "standard-satellite";

export type FilterState = {
  statuses: Set<CustomerStatus>;
  types: Set<CustomerType>;
  services: Set<Service>;
  gardenTypes: Set<GardenType>;
  search: string;
};

type StoreState = {
  selectedCustomerId: string | null;
  hoveredCustomerId: string | null;
  filters: FilterState;
  mapStyle: MapStyleKey;
  viewportOnlyFilter: boolean;
  visibleIdsInViewport: Set<string>;
  isIntroComplete: boolean;
  splatViewerOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutsDialogOpen: boolean;
  season: Season;
};

type StoreActions = {
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  toggleStatus: (status: CustomerStatus) => void;
  toggleType: (type: CustomerType) => void;
  toggleService: (service: Service) => void;
  toggleGardenType: (gt: GardenType) => void;
  setSearch: (q: string) => void;
  clearFilters: () => void;
  setMapStyle: (style: MapStyleKey) => void;
  toggleViewportFilter: () => void;
  setVisibleIds: (ids: string[]) => void;
  markIntroComplete: () => void;
  setSplatViewerOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsDialogOpen: (open: boolean) => void;
  setSeason: (season: Season) => void;
};

const emptyFilters = (): FilterState => ({
  statuses: new Set(),
  types: new Set(),
  services: new Set(),
  gardenTypes: new Set(),
  search: "",
});

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export const useAppStore = create<StoreState & StoreActions>((set) => ({
  selectedCustomerId: null,
  hoveredCustomerId: null,
  filters: emptyFilters(),
  mapStyle: "standard",
  viewportOnlyFilter: false,
  visibleIdsInViewport: new Set(customers.map((c) => c.id)),
  isIntroComplete: false,
  splatViewerOpen: false,
  commandPaletteOpen: false,
  shortcutsDialogOpen: false,
  season: detectSeason(),
  select: (id) => set({ selectedCustomerId: id }),
  hover: (id) => set({ hoveredCustomerId: id }),
  toggleStatus: (status) =>
    set((s) => ({ filters: { ...s.filters, statuses: toggle(s.filters.statuses, status) } })),
  toggleType: (type) =>
    set((s) => ({ filters: { ...s.filters, types: toggle(s.filters.types, type) } })),
  toggleService: (service) =>
    set((s) => ({ filters: { ...s.filters, services: toggle(s.filters.services, service) } })),
  toggleGardenType: (gt) =>
    set((s) => ({ filters: { ...s.filters, gardenTypes: toggle(s.filters.gardenTypes, gt) } })),
  setSearch: (q) => set((s) => ({ filters: { ...s.filters, search: q } })),
  clearFilters: () => set({ filters: emptyFilters() }),
  setMapStyle: (style) => set({ mapStyle: style }),
  toggleViewportFilter: () => set((s) => ({ viewportOnlyFilter: !s.viewportOnlyFilter })),
  setVisibleIds: (ids) => set({ visibleIdsInViewport: new Set(ids) }),
  markIntroComplete: () => set({ isIntroComplete: true }),
  setSplatViewerOpen: (open) => set({ splatViewerOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsDialogOpen: (open) => set({ shortcutsDialogOpen: open }),
  setSeason: (season) => set({ season }),
}));

const fuse = new Fuse(customers, {
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: false,
  keys: [
    { name: "name", weight: 3 },
    { name: "address.street", weight: 2 },
    { name: "address.city", weight: 2 },
    { name: "address.district", weight: 2 },
    { name: "notes", weight: 1 },
    { name: "services", weight: 1 },
  ],
});

export function filterCustomers(
  list: readonly Customer[],
  filters: FilterState,
  options: {
    viewportOnly?: boolean;
    visibleIds?: Set<string>;
  } = {},
): Customer[] {
  const search = filters.search.trim();
  let pool: readonly Customer[] = list;
  if (search.length > 0) {
    pool = fuse.search(search).map((r) => r.item);
  }
  const filtered = pool.filter((customer) => {
    if (filters.statuses.size > 0 && !filters.statuses.has(customer.status)) return false;
    if (filters.types.size > 0 && !filters.types.has(customer.type)) return false;
    if (filters.gardenTypes.size > 0 && !filters.gardenTypes.has(customer.gardenType)) return false;
    if (filters.services.size > 0) {
      const hasService = customer.services.some((s) => filters.services.has(s));
      if (!hasService) return false;
    }
    if (options.viewportOnly && options.visibleIds && !options.visibleIds.has(customer.id)) {
      return false;
    }
    return true;
  });
  return filtered;
}

export function filterStats(list: Customer[]) {
  return {
    count: list.length,
    yearlyRevenueEur: list.reduce((sum, c) => sum + c.yearlyRevenueEur, 0),
    upcomingAppointments: list.filter((c) => Boolean(c.nextAppointment)).length,
    vipCount: list.filter((c) => c.status === "vip").length,
    splatCount: list.filter((c) => c.hasSplatDemo).length,
  };
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.search.length > 0 ||
    filters.statuses.size > 0 ||
    filters.types.size > 0 ||
    filters.services.size > 0 ||
    filters.gardenTypes.size > 0
  );
}

export function customerById(id: string | null): Customer | undefined {
  if (!id) return undefined;
  return customers.find((c) => c.id === id);
}
