"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";

/**
 * Reads the optional `?customer=<id>` URL parameter on mount and selects the
 * matching customer so that "Back to Map" links from /welt/* restore the
 * sidebar context.
 */
export function SelectCustomerFromUrl() {
  const params = useSearchParams();
  const select = useAppStore((s) => s.select);
  useEffect(() => {
    const id = params.get("customer");
    if (id) {
      select(id);
    }
  }, [params, select]);
  return null;
}
