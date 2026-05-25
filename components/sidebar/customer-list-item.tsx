"use client";

import { memo } from "react";
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

function CustomerListItemInner({ customer }: Props) {
  const isSelected = useAppStore((s) => s.selectedCustomerId === customer.id);
  const isHovered = useAppStore((s) => s.hoveredCustomerId === customer.id);
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);

  return (
    <button
      type="button"
      onClick={() => select(customer.id)}
      onPointerEnter={() => hover(customer.id)}
      onPointerLeave={() => hover(null)}
      aria-pressed={isSelected}
      aria-current={isSelected ? "true" : undefined}
      aria-label={`${customer.name} – ${formatStatus(customer.status)}`}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors duration-150 ${
        isSelected
          ? "border-primary/60 bg-primary/10 shadow-glow-primary"
          : isHovered
            ? "border-border bg-card"
            : "bg-card/40 hover:border-border hover:bg-card border-transparent"
      }`}
    >
      <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={customer.photoUrl}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          unoptimized
        />
        {customer.status === "vip" ? (
          <span className="bg-vip/95 text-vip-foreground absolute top-0.5 right-0.5 rounded-full p-0.5">
            <Crown className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{customer.name}</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
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
        <span className="text-muted-foreground text-[10px]">
          {formatCompactCurrency(customer.yearlyRevenueEur)}
        </span>
      </div>
    </button>
  );
}

export const CustomerListItem = memo(CustomerListItemInner, (prev, next) =>
  prev.customer.id === next.customer.id,
);
