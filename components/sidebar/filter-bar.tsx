"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { labels } from "@/lib/format";
import { hasActiveFilters, useAppStore } from "@/lib/store";
import type {
  CustomerStatus,
  CustomerType,
  GardenType,
  Service,
} from "@/lib/customers";

const STATUS_ORDER: CustomerStatus[] = ["aktiv", "neu", "vip", "wartung-faellig", "saison-pause"];
const TYPE_ORDER: CustomerType[] = ["privat", "gewerbe", "oeffentlich"];
const SERVICE_ORDER: Service[] = [
  "rasenpflege",
  "heckenschnitt",
  "baumpflege",
  "bewaesserung",
  "pflanzplanung",
  "winterdienst",
  "teichbau",
  "natursteinarbeiten",
];

export function FilterBar() {
  const filters = useAppStore((s) => s.filters);
  const toggleStatus = useAppStore((s) => s.toggleStatus);
  const toggleType = useAppStore((s) => s.toggleType);
  const toggleService = useAppStore((s) => s.toggleService);
  const clearFilters = useAppStore((s) => s.clearFilters);
  const viewportOnly = useAppStore((s) => s.viewportOnlyFilter);
  const toggleViewport = useAppStore((s) => s.toggleViewportFilter);
  const [servicesOpen, setServicesOpen] = useState(false);

  const hasFilters = hasActiveFilters(filters) || viewportOnly;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Filter
        </span>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearFilters();
              if (viewportOnly) toggleViewport();
            }}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Filter zurücksetzen
          </Button>
        ) : null}
      </div>

      <section aria-label="Status-Filter" className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Status</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={Array.from(filters.statuses)}
          onValueChange={(values: string[]) => {
            const current = new Set(values);
            const previous = filters.statuses;
            STATUS_ORDER.forEach((status) => {
              const has = current.has(status);
              if (has !== previous.has(status)) toggleStatus(status);
            });
          }}
          className="flex flex-wrap justify-start gap-1.5"
        >
          {STATUS_ORDER.map((status) => (
            <ToggleGroupItem
              key={status}
              value={status}
              aria-label={`Status ${labels.status[status]}`}
              className="rounded-full text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {labels.status[status]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <section aria-label="Kundentyp-Filter" className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Typ</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={Array.from(filters.types)}
          onValueChange={(values: string[]) => {
            const current = new Set(values);
            const previous = filters.types;
            TYPE_ORDER.forEach((type) => {
              const has = current.has(type);
              if (has !== previous.has(type)) toggleType(type);
            });
          }}
          className="flex flex-wrap justify-start gap-1.5"
        >
          {TYPE_ORDER.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              aria-label={`Typ ${labels.type[type]}`}
              className="rounded-full text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {labels.type[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <section aria-label="Gewerk-Filter" className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Gewerke</span>
        <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={servicesOpen}
              className="w-full justify-between rounded-full"
            >
              <span className="truncate">
                {filters.services.size === 0
                  ? "Alle Gewerke"
                  : `${filters.services.size} Gewerk${filters.services.size === 1 ? "" : "e"} aktiv`}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Gewerk suchen…" />
              <CommandList>
                <CommandEmpty>Kein Treffer</CommandEmpty>
                <CommandGroup>
                  {SERVICE_ORDER.map((service) => {
                    const checked = filters.services.has(service);
                    return (
                      <CommandItem
                        key={service}
                        value={service}
                        onSelect={() => toggleService(service)}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{labels.service[service]}</span>
                        {checked ? <Check className="h-4 w-4 text-primary" /> : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {filters.services.size > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(filters.services).map((service) => (
              <Badge
                key={service}
                variant="secondary"
                className="cursor-pointer gap-1 rounded-full"
                onClick={() => toggleService(service)}
              >
                {labels.service[service]}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      <Button
        variant={viewportOnly ? "default" : "outline"}
        size="sm"
        onClick={toggleViewport}
        className="mt-1 rounded-full"
      >
        {viewportOnly ? "Nur im sichtbaren Kartenausschnitt" : "Alle Kunden anzeigen"}
      </Button>
    </div>
  );
}
