"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Crown, Sparkles, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { formatCompactCurrency, formatNumber } from "@/lib/format";
import { customers } from "@/lib/customers";
import { filterCustomers, filterStats, hasActiveFilters, useAppStore } from "@/lib/store";

export function FloatingStats() {
  const [expanded, setExpanded] = useState(false);
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
    <div className="pointer-events-auto absolute top-4 left-4 z-20 flex flex-col gap-2">
      <div className="border-border bg-card/85 flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur-xl">
        <Logo size={32} showWordmark={false} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Users className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-foreground text-sm font-semibold">{formatNumber(stats.count)}</span>
            {filteredFlag ? (
              <span className="text-muted-foreground text-[10px]">gefiltert</span>
            ) : null}
          </div>
          <div className="bg-border h-4 w-px" />
          <div className="flex items-center gap-1.5">
            <Wallet className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-foreground text-sm font-semibold">
              {formatCompactCurrency(stats.yearlyRevenueEur)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground ml-1 transition-colors"
          aria-label={expanded ? "Stats einklappen" : "Stats ausklappen"}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="border-border bg-card/85 grid grid-cols-2 gap-2 rounded-2xl border p-3 shadow-lg backdrop-blur-xl"
          >
            <StatMini
              icon={<Sparkles className="h-3 w-3" />}
              label="Termine"
              value={formatNumber(stats.upcomingAppointments)}
            />
            <StatMini
              icon={<Crown className="h-3 w-3" />}
              label="VIP"
              value={formatNumber(stats.vipCount)}
              highlight={stats.vipCount > 0}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatMini({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${
        highlight ? "bg-vip/10" : "bg-muted/50"
      }`}
    >
      <span className={highlight ? "text-vip" : "text-muted-foreground"}>{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{value}</span>
      </div>
    </div>
  );
}
