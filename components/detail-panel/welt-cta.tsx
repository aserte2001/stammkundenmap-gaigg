"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customers";
import { getPrimaryHotspot } from "@/lib/welt/hotspot-registry";

type Props = {
  customer: Customer;
};

export function WeltCta({ customer }: Props) {
  const hotspot = getPrimaryHotspot(customer);
  const hasSplat = Boolean(hotspot?.splatUrl);

  return (
    <Link
      href={`/welt/${customer.id}`}
      aria-label={`Begehbare 3D-Welt für ${customer.name} öffnen`}
      className="group block focus:outline-none"
      data-testid="welt-cta"
    >
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-3 shadow-[0_0_0_1px_rgba(16,185,129,0.05)] focus-within:ring-2 focus-within:ring-emerald-400/60 group-focus-visible:ring-2 group-focus-visible:ring-emerald-400/60"
      >
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex items-center gap-3">
          <div className="bg-emerald-500/20 text-emerald-200 ring-emerald-400/40 group-hover:bg-emerald-500/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground text-sm font-semibold tracking-tight">
                Welt begehen
              </span>
              {hasSplat ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  Splat-Hotspot
                </span>
              ) : null}
            </div>
            <span className="text-muted-foreground mt-0.5 text-xs">
              Photorealistic 3D Tiles · {customer.address.district}
            </span>
          </div>
          <Button
            asChild
            size="sm"
            className="hidden bg-emerald-500/90 text-emerald-50 hover:bg-emerald-500 sm:inline-flex"
          >
            <span>Begehen</span>
          </Button>
        </div>
      </motion.div>
    </Link>
  );
}
