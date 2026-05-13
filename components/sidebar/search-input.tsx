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
      <Search className="text-muted-foreground absolute top-1/2 left-7 h-4 w-4 -translate-y-1/2" />
      <Input
        ref={ref}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Kunden, Adressen, Notizen suchen…"
        className="bg-card rounded-full pr-12 pl-9"
        aria-label="Kundensuche"
      />
      {search ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setSearch("")}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-6 h-7 w-7 -translate-y-1/2"
          aria-label="Suche löschen"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <kbd className="border-border bg-background text-muted-foreground pointer-events-none absolute top-1/2 right-7 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px]">
          /
        </kbd>
      )}
    </div>
  );
}
