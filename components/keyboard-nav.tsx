"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { customers } from "@/lib/customers";
import { filterCustomers, useAppStore } from "@/lib/store";

export function KeyboardNav() {
  const filters = useAppStore((s) => s.filters);
  const viewportOnly = useAppStore((s) => s.viewportOnlyFilter);
  const visibleIds = useAppStore((s) => s.visibleIdsInViewport);
  const selectedId = useAppStore((s) => s.selectedCustomerId);
  const select = useAppStore((s) => s.select);
  const setShortcutsDialogOpen = useAppStore((s) => s.setShortcutsDialogOpen);

  const filtered = useMemo(
    () => filterCustomers(customers, filters, { viewportOnly, visibleIds }),
    [filters, viewportOnly, visibleIds],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      if (cmdKey && e.shiftKey && e.key === "?") {
        e.preventDefault();
        setShortcutsDialogOpen(true);
        return;
      }
      if (e.key === "?" && !cmdKey) {
        e.preventDefault();
        setShortcutsDialogOpen(true);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (filtered.length === 0) return;
        e.preventDefault();
        const currentIdx = filtered.findIndex((c) => c.id === selectedId);
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx =
          currentIdx === -1
            ? direction === 1
              ? 0
              : filtered.length - 1
            : (currentIdx + direction + filtered.length) % filtered.length;
        select(filtered[nextIdx].id);
        return;
      }
      if (e.key === "Escape" && selectedId) {
        select(null);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedId, select, setShortcutsDialogOpen]);

  // Toast on style switch (subscribe to changes)
  useEffect(() => {
    let prevStyle = useAppStore.getState().mapStyle;
    const unsubStyle = useAppStore.subscribe((state) => {
      if (state.mapStyle !== prevStyle) {
        toast.success(
          `Karten-Stil: ${state.mapStyle === "standard-satellite" ? "Satellit" : "Atmosphäre"}`,
        );
        prevStyle = state.mapStyle;
      }
    });
    let prevSize = useAppStore.getState().filters;
    const unsubFilters = useAppStore.subscribe((state) => {
      const wasActive =
        prevSize.statuses.size +
          prevSize.types.size +
          prevSize.services.size +
          prevSize.gardenTypes.size +
          (prevSize.search.length > 0 ? 1 : 0) >
        0;
      const isActive =
        state.filters.statuses.size +
          state.filters.types.size +
          state.filters.services.size +
          state.filters.gardenTypes.size +
          (state.filters.search.length > 0 ? 1 : 0) >
        0;
      if (wasActive && !isActive) {
        toast.success("Alle Filter zurückgesetzt");
      }
      prevSize = state.filters;
    });
    return () => {
      unsubStyle();
      unsubFilters();
    };
  }, []);

  return null;
}
