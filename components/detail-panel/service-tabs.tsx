"use client";

import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatArea, formatCurrency, formatGardenType, formatService } from "@/lib/format";
import type { Customer } from "@/lib/customers";
import { Timeline } from "./timeline";
import { SplatViewer } from "./splat-viewer";

const COMPARE_REF = 1_000;

type Props = {
  customer: Customer;
};

export function ServiceTabs({ customer }: Props) {
  return (
    <Tabs defaultValue="overview" className="flex flex-1 flex-col gap-3 overflow-hidden">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Übersicht</TabsTrigger>
        <TabsTrigger value="orders">Aufträge</TabsTrigger>
        <TabsTrigger value="notes">Notizen</TabsTrigger>
        <TabsTrigger value="splat" disabled={!customer.hasSplatDemo}>
          3D-View
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="border-border bg-card/70 rounded-2xl border p-3">
            <div className="text-muted-foreground text-xs">Garten-Typ</div>
            <div className="mt-1 text-sm font-medium">{formatGardenType(customer.gardenType)}</div>
          </div>
          <div className="border-border bg-card/70 rounded-2xl border p-3">
            <div className="text-muted-foreground text-xs">Fläche</div>
            <div className="mt-1 text-sm font-medium">{formatArea(customer.gardenSizeM2)}</div>
            <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (customer.gardenSizeM2 / COMPARE_REF) * 10)}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
          <div className="border-border bg-card/70 rounded-2xl border p-3">
            <div className="text-muted-foreground text-xs">Jahresumsatz</div>
            <div className="mt-1 text-sm font-medium">
              {formatCurrency(customer.yearlyRevenueEur)}
            </div>
          </div>
          <div className="border-border bg-card/70 rounded-2xl border p-3">
            <div className="text-muted-foreground text-xs">Standort</div>
            <div className="mt-1 text-sm font-medium">{customer.address.district}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs">Leistungen</span>
          <div className="flex flex-wrap gap-1.5">
            {customer.services.map((s) => (
              <Badge key={s} variant="outline" className="rounded-full">
                {formatService(s)}
              </Badge>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="orders" className="flex flex-1 flex-col overflow-y-auto pr-1">
        <Timeline customer={customer} />
      </TabsContent>

      <TabsContent value="notes" className="flex flex-1 overflow-y-auto pr-1">
        <p className="border-border bg-card/60 text-foreground rounded-2xl border p-4 text-sm leading-relaxed whitespace-pre-line">
          {customer.notes}
        </p>
      </TabsContent>

      <TabsContent value="splat" className="flex flex-1 overflow-hidden">
        {customer.hasSplatDemo && customer.splatEmbedUrl ? (
          <SplatViewer url={customer.splatEmbedUrl} />
        ) : (
          <div className="border-border text-muted-foreground m-auto max-w-xs rounded-2xl border border-dashed p-6 text-center text-sm">
            Diese Adresse hat noch keine 3D-Erfassung.
            <br />
            <span className="text-xs">Premium-Feature für Stammkunden ab Goldstatus.</span>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
