"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { customerById, useAppStore } from "@/lib/store";
import { CustomerHeader } from "./customer-header";
import { ServiceTabs } from "./service-tabs";

export function DetailPanel() {
  const selectedId = useAppStore((s) => s.selectedCustomerId);
  const select = useAppStore((s) => s.select);
  const customer = customerById(selectedId);

  return (
    <Sheet
      open={Boolean(customer)}
      onOpenChange={(open) => {
        if (!open) select(null);
      }}
    >
      <SheetContent
        side="right"
        className="border-l-border bg-background/95 flex w-full max-w-[460px] flex-col gap-4 overflow-hidden p-5 backdrop-blur-xl sm:rounded-l-3xl"
      >
        <SheetTitle className="sr-only">{customer?.name ?? "Kundendetail"}</SheetTitle>
        {customer ? (
          <>
            <CustomerHeader customer={customer} />
            <ServiceTabs customer={customer} />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
