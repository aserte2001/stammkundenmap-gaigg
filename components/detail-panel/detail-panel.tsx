"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customerById, useAppStore } from "@/lib/store";
import { CaptureCta } from "./capture-cta";
import { CustomerHeader } from "./customer-header";
import { ServiceTabs } from "./service-tabs";

type DetailPanelProps = {
  visionAvailable?: boolean;
};

export function DetailPanel({ visionAvailable = true }: DetailPanelProps) {
  const selectedId = useAppStore((s) => s.selectedCustomerId);
  const select = useAppStore((s) => s.select);
  const customer = customerById(selectedId);

  return (
    <AnimatePresence>
      {customer ? (
        <>
          <motion.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => select(null)}
            aria-hidden="true"
          />
          <motion.div
            key="detail-panel"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label={customer.name}
            aria-modal="true"
            className="border-border bg-background/95 fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 rounded-full"
              onClick={() => select(null)}
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              <CustomerHeader customer={customer} />
              <CaptureCta customer={customer} />
              <ServiceTabs customer={customer} visionAvailable={visionAvailable} />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
