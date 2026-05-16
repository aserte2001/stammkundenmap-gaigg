"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import type { Customer } from "@/lib/customers";
import type { WorldEntry } from "@/lib/customers/splat-store";
import { MarbleSplatViewer } from "./marble-splat-viewer";
import { WorldSwitcher } from "./world-switcher";

type Props = {
  customer: Customer;
  worlds: WorldEntry[];
};

export function MarbleWeltShell({ customer, worlds }: Props) {
  const sorted = useMemo(
    () => [...worlds].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [worlds],
  );
  const [activeId, setActiveId] = useState<string>(sorted[0].id);
  const active = sorted.find((w) => w.id === activeId) ?? sorted[0];

  return (
    <div className="bg-background relative h-[100dvh] w-full">
      <div className="absolute inset-0">
        <MarbleSplatViewer
          splatUrls={{
            splatUrl100k: active.splatUrl100k,
            splatUrl500k: active.splatUrl500k,
            splatUrl: active.splatUrl,
          }}
          label={active.label}
        />
      </div>

      <header className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <Link
          href="/"
          className="bg-card/85 text-foreground hover:bg-card flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium backdrop-blur"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> Karte
        </Link>
        <div className="bg-card/85 rounded-full border border-border px-3 py-1.5 text-xs backdrop-blur">
          <span className="font-semibold">{customer.name}</span>
          <span className="text-muted-foreground ml-1.5">· {customer.address.district}</span>
        </div>
      </header>

      <footer className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <WorldSwitcher
          worlds={sorted.map((w) => ({ id: w.id, label: w.label }))}
          activeId={active.id}
          onSelect={setActiveId}
        />
        <Link
          href={`/capture/${customer.id}`}
          className="bg-card/85 text-foreground hover:bg-card inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium backdrop-blur"
        >
          <Plus className="h-3 w-3" aria-hidden /> Standort hinzufügen
        </Link>
      </footer>
    </div>
  );
}
