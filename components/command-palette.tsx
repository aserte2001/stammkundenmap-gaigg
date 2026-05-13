"use client";

import { useEffect } from "react";
import { Crown, Layers, MapPin, X } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { customers } from "@/lib/customers";
import { useAppStore, type MapStyleKey } from "@/lib/store";
import { MAP_STYLES } from "@/lib/map-config";
import { formatStatus } from "@/lib/format";

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const select = useAppStore((s) => s.select);
  const setMapStyle = useAppStore((s) => s.setMapStyle);
  const clearFilters = useAppStore((s) => s.clearFilters);
  const toggleStatus = useAppStore((s) => s.toggleStatus);
  const setShortcutsDialogOpen = useAppStore((s) => s.setShortcutsDialogOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      if (cmdKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (cmdKey && e.key === "/") {
        e.preventDefault();
        setShortcutsDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen, setShortcutsDialogOpen]);

  const close = () => setOpen(false);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Schnellsuche">
      <CommandInput placeholder="Kunde, Aktion oder Stil suchen…" />
      <CommandList>
        <CommandEmpty>Kein Treffer</CommandEmpty>
        <CommandGroup heading="Kunden">
          {customers.slice(0, 12).map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.name} ${c.address.district} ${c.address.city}`}
              onSelect={() => {
                select(c.id);
                close();
              }}
            >
              {c.status === "vip" ? (
                <Crown className="mr-2 h-4 w-4 text-vip" />
              ) : (
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatStatus(c.status)} · {c.address.district}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Karten-Stil">
          {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
            <CommandItem
              key={key}
              value={`stil ${MAP_STYLES[key].label}`}
              onSelect={() => {
                setMapStyle(key);
                close();
              }}
            >
              <Layers className="mr-2 h-4 w-4" />
              Stil → {MAP_STYLES[key].label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Aktionen">
          <CommandItem
            value="vip nur"
            onSelect={() => {
              clearFilters();
              toggleStatus("vip");
              close();
            }}
          >
            <Crown className="mr-2 h-4 w-4 text-vip" />
            Nur VIP anzeigen
          </CommandItem>
          <CommandItem
            value="filter zuruecksetzen"
            onSelect={() => {
              clearFilters();
              close();
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Alle Filter zurücksetzen
          </CommandItem>
          <CommandItem
            value="shortcuts hilfe"
            onSelect={() => {
              setShortcutsDialogOpen(true);
              close();
            }}
          >
            <kbd className="mr-2 rounded border border-border px-1.5 text-[10px]">⌘/</kbd>
            Tastaturkürzel anzeigen
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
