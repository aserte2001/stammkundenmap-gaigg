"use client";

import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { customers, type Customer } from "@/lib/customers";
import { filterCustomers, useAppStore } from "@/lib/store";
import { CustomerListItem } from "./customer-list-item";

function HoverScroller({
  filtered,
  virtualizer,
}: {
  filtered: readonly Customer[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}) {
  const hoveredId = useAppStore((s) => s.hoveredCustomerId);

  useEffect(() => {
    if (!hoveredId) return;
    const idx = filtered.findIndex((c) => c.id === hoveredId);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "auto", behavior: "smooth" });
  }, [hoveredId, filtered, virtualizer]);

  return null;
}

export function CustomerList() {
  const filters = useAppStore((s) => s.filters);
  const viewportOnly = useAppStore((s) => s.viewportOnlyFilter);
  const visibleIds = useAppStore((s) => s.visibleIdsInViewport);

  const filtered = useMemo(
    () => filterCustomers(customers, filters, { viewportOnly, visibleIds }),
    [filters, viewportOnly, visibleIds],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 6,
  });

  if (filtered.length === 0) {
    return (
      <div
        role="status"
        className="text-muted-foreground flex flex-col items-center gap-3 px-4 py-12 text-center text-sm"
      >
        <div className="border-border bg-card/60 rounded-full border border-dashed p-4">
          <span className="text-2xl" aria-hidden>
            🌱
          </span>
        </div>
        <p>Keine Kunden im aktuellen Filter.</p>
        <p className="text-xs">Versuche weniger spezifisch zu filtern.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      role="list"
      aria-label="Liste der Stammkunden"
      className="h-full overflow-y-auto px-3 pb-6"
      style={{ contain: "strict" }}
    >
      <HoverScroller filtered={filtered} virtualizer={rowVirtualizer} />
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const customer = filtered[virtualRow.index];
          return (
            <div
              key={customer.id}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                padding: "4px 0",
              }}
            >
              <CustomerListItem customer={customer} index={virtualRow.index} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
