"use client";

import { motion } from "motion/react";
import { Crown, Sparkles, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { formatCompactCurrency, formatNumber } from "@/lib/format";

type StatChipProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
};

function StatChip({ icon, label, value, highlight }: StatChipProps) {
  return (
    <motion.div
      layout
      className={`flex flex-col gap-1 rounded-2xl border border-border bg-card/80 px-3 py-2.5 backdrop-blur ${
        highlight ? "shadow-glow-primary" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="text-lg font-semibold tracking-tight">{value}</span>
    </motion.div>
  );
}

type SidebarHeaderProps = {
  stats: {
    count: number;
    yearlyRevenueEur: number;
    upcomingAppointments: number;
    vipCount: number;
  };
  filtered: boolean;
};

export function SidebarHeader({ stats, filtered }: SidebarHeaderProps) {
  return (
    <header
      className="flex flex-col gap-4 border-b border-border bg-gradient-to-br from-card via-card to-background p-5"
      aria-label="Sidebar header mit Markenidentität und Kennzahlen"
    >
      <Logo size={44} />
      <div className="grid grid-cols-2 gap-2">
        <StatChip
          icon={<Users className="h-3.5 w-3.5" />}
          label={filtered ? "Gefiltert" : "Stammkunden"}
          value={formatNumber(stats.count)}
        />
        <StatChip
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Jahresumsatz"
          value={formatCompactCurrency(stats.yearlyRevenueEur)}
        />
        <StatChip
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Anstehende Termine"
          value={formatNumber(stats.upcomingAppointments)}
        />
        <StatChip
          icon={<Crown className="h-3.5 w-3.5" />}
          label="VIP-Kunden"
          value={formatNumber(stats.vipCount)}
          highlight={stats.vipCount > 0}
        />
      </div>
    </header>
  );
}
