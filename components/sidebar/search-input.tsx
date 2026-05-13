"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function SearchInput() {
  const search = useAppStore((s) => s.filters.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        ref.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === ref.current) {
        ref.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative px-4">
      <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Kunden, Adressen, Notizen suchen…"
        className="rounded-full bg-card pl-9 pr-12"
        aria-label="Kundensuche"
      />
      {search ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setSearch("")}
          className="absolute right-6 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Suche löschen"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <kbd className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          /
        </kbd>
      )}
    </div>
  );
}
