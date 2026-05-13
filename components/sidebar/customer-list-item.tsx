"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { Crown, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompactCurrency, formatStatus, formatType } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { Customer } from "@/lib/customers";

const STATUS_VARIANT: Record<Customer["status"], string> = {
  aktiv: "bg-success/15 text-success",
  neu: "bg-info/15 text-info",
  vip: "bg-vip/15 text-vip",
  "wartung-faellig": "bg-warning/15 text-warning",
  "saison-pause": "bg-muted text-muted-foreground",
};

type Props = {
  customer: Customer;
  index?: number;
};

export function CustomerListItem({ customer, index = 0 }: Props) {
  const selectedId = useAppStore((s) => s.selectedCustomerId);
  const hoveredId = useAppStore((s) => s.hoveredCustomerId);
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);

  const isSelected = selectedId === customer.id;
  const isHovered = hoveredId === customer.id;

  return (
    <motion.button
      type="button"
      onClick={() => select(customer.id)}
      onMouseEnter={() => hover(customer.id)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(customer.id)}
      onBlur={() => hover(null)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.4) }}
      aria-pressed={isSelected}
      aria-current={isSelected ? "true" : undefined}
      aria-label={`${customer.name} – ${formatStatus(customer.status)}`}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
        isSelected
          ? "border-primary/60 bg-primary/10 shadow-glow-primary"
          : isHovered
            ? "border-border bg-card"
            : "border-transparent bg-card/40 hover:border-border hover:bg-card"
      }`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          src={customer.photoUrl}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          unoptimized
        />
        {customer.status === "vip" ? (
          <span className="absolute right-0.5 top-0.5 rounded-full bg-vip/95 p-0.5 text-vip-foreground">
            <Crown className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{customer.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{customer.address.district}</span>
          <span>·</span>
          <span>{formatType(customer.type)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={`rounded-full border-transparent px-2 py-0.5 text-[10px] font-medium ${STATUS_VARIANT[customer.status]}`}
        >
          {formatStatus(customer.status)}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatCompactCurrency(customer.yearlyRevenueEur)}
        </span>
      </div>
    </motion.button>
  );
}
