"use client";

import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { customers } from "@/lib/customers";
import { filterCustomers, filterStats, hasActiveFilters, useAppStore } from "@/lib/store";
import { CustomerList } from "./customer-list";
import { FilterBar } from "./filter-bar";
import { SearchInput } from "./search-input";
import { SidebarHeader } from "./sidebar-header";

function SidebarContent() {
  const filters = useAppStore((s) => s.filters);
  const viewportOnly = useAppStore((s) => s.viewportOnlyFilter);
  const visibleIds = useAppStore((s) => s.visibleIdsInViewport);

  const filtered = useMemo(
    () => filterCustomers(customers, filters, { viewportOnly, visibleIds }),
    [filters, viewportOnly, visibleIds],
  );
  const stats = useMemo(() => filterStats(filtered), [filtered]);
  const filteredFlag = hasActiveFilters(filters) || viewportOnly;

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader stats={stats} filtered={filteredFlag} />
      <div className="border-border border-b py-3">
        <SearchInput />
      </div>
      <div className="border-border border-b">
        <FilterBar />
      </div>
      <div className="min-h-0 flex-1">
        <CustomerList />
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Sidebar mit Kundenliste und Filtern"
        className="border-border bg-background/80 pointer-events-auto absolute top-4 bottom-4 left-4 z-30 hidden w-[360px] flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl md:flex"
      >
        <SidebarContent />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto absolute top-20 left-4 z-30 md:hidden"
            aria-label="Sidebar öffnen"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="border-r-border bg-background w-[88vw] max-w-[400px] p-0"
        >
          <SheetTitle className="sr-only">Stammkunden-Liste</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-50"
            onClick={() => setOpen(false)}
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
