"use client";

import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { SplatMappingStatus } from "@/lib/customers/splat-store";
import { cn } from "@/lib/utils";

type Props = {
  status: SplatMappingStatus;
  worldCount?: number;
};

const COPY: Record<
  SplatMappingStatus,
  {
    label: string;
    Icon: typeof CheckCircle2;
    classes: string;
  }
> = {
  none: {
    label: "Noch keine 3D-Welt",
    Icon: Sparkles,
    classes: "bg-muted text-muted-foreground",
  },
  processing: {
    label: "3D-Welt wird vorbereitet",
    Icon: Loader2,
    classes: "bg-amber-500/15 text-amber-200",
  },
  ready: {
    label: "3D-Welt verfügbar",
    Icon: CheckCircle2,
    classes: "bg-emerald-500/15 text-emerald-200",
  },
  failed: {
    label: "Welt-Generierung fehlgeschlagen",
    Icon: AlertCircle,
    classes: "bg-rose-500/15 text-rose-200",
  },
};

export function CaptureStatusBadge({ status, worldCount }: Props) {
  const { label, Icon, classes } = COPY[status];
  const showCount = status === "ready" && typeof worldCount === "number" && worldCount > 1;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        classes,
      )}
      role="status"
    >
      <Icon className={cn("h-2.5 w-2.5", status === "processing" && "animate-spin")} aria-hidden />
      {label}
      {showCount ? ` · ${worldCount} Standorte` : ""}
    </span>
  );
}
