"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { Camera, ChevronRight, Compass, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customers";
import type {
  SplatMapping,
  SplatMappingStatus,
  WorldEntry,
} from "@/lib/customers/splat-store";
import { CaptureStatusBadge } from "./capture-status-badge";

type Props = {
  customer: Customer;
};

type StatusResponse = {
  customerId: string;
  status: SplatMappingStatus;
  worlds: WorldEntry[];
  pendingOperationIds: string[];
  errorMessage?: string;
  startedAt?: string;
  updatedAt: string;
};

const fetcher = async (url: string): Promise<StatusResponse> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as StatusResponse;
};

const PLACEHOLDER: SplatMapping = {
  status: "none",
  worlds: [],
  pendingOperationIds: [],
  updatedAt: new Date(0).toISOString(),
};

export function CaptureCta({ customer }: Props) {
  const { data, error } = useSWR<StatusResponse>(
    `/api/capture/status?customerId=${customer.id}`,
    fetcher,
    {
      refreshInterval: (latest) => (latest?.status === "processing" ? 30_000 : 0),
      revalidateOnFocus: true,
    },
  );

  const mapping: Pick<SplatMapping, "status" | "worlds" | "errorMessage"> = data ?? PLACEHOLDER;
  const isVip = customer.status === "vip";

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-3"
      data-testid="capture-cta"
    >
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="bg-emerald-500/20 text-emerald-200 ring-emerald-400/40 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1">
          {mapping.status === "ready" ? (
            <Compass className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground text-sm font-semibold">3D-Welt</span>
            <CaptureStatusBadge
              status={mapping.status}
              worldCount={mapping.worlds.length}
            />
          </div>
          {mapping.status === "ready" && (
            <ReadyActions customerId={customer.id} worlds={mapping.worlds} />
          )}
          {mapping.status === "processing" && (
            <ProcessingActions customerId={customer.id} />
          )}
          {mapping.status === "failed" && (
            <FailedActions customerId={customer.id} errorMessage={mapping.errorMessage} />
          )}
          {mapping.status === "none" && <NoneActions customerId={customer.id} isVip={isVip} />}
          {error && (
            <p className="text-muted-foreground text-[10px]">
              Status konnte nicht geladen werden — versuche es erneut.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReadyActions({ customerId, worlds }: { customerId: string; worlds: WorldEntry[] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild size="sm" className="flex-1 bg-emerald-500/90 text-emerald-50 hover:bg-emerald-500">
        <Link href={`/welt/${customerId}`}>
          <Compass className="mr-1 h-3 w-3" /> 3D-Tour begehen
          <span className="text-emerald-50/80 ml-1 text-[10px]">({worlds.length})</span>
          <ChevronRight className="ml-auto h-3 w-3 opacity-70" />
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline" className="border-emerald-500/40">
        <Link href={`/capture/${customerId}`}>
          <Plus className="mr-1 h-3 w-3" /> Standort
        </Link>
      </Button>
    </div>
  );
}

function ProcessingActions({ customerId }: { customerId: string }) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        Marble baut die Welt — du wirst hier informiert sobald sie bereit ist.
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href={`/welt/${customerId}`}>
          Status öffnen <ChevronRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}

function FailedActions({
  customerId,
  errorMessage,
}: {
  customerId: string;
  errorMessage?: string;
}) {
  return (
    <div className="space-y-2">
      {errorMessage && (
        <p className="text-rose-200/90 text-[11px]">{truncate(errorMessage, 140)}</p>
      )}
      <Button asChild size="sm" className="bg-rose-500/90 text-rose-50 hover:bg-rose-500">
        <Link href={`/capture/${customerId}`}>
          <RefreshCcw className="mr-1 h-3 w-3" /> Erneut versuchen
        </Link>
      </Button>
    </div>
  );
}

function NoneActions({ customerId, isVip }: { customerId: string; isVip: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        {isVip
          ? "Premium-Kunde — erstelle jetzt die begehbare 3D-Welt vor Ort mit dem Phone."
          : "Vor Ort beim Kunden? Lege jetzt eine 3D-Welt für die Map an."}
      </p>
      <Button asChild size="sm" className="bg-emerald-500/90 text-emerald-50 hover:bg-emerald-500">
        <Link href={`/capture/${customerId}`}>
          <Camera className="mr-1 h-3 w-3" /> 3D-Welt erstellen
        </Link>
      </Button>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
