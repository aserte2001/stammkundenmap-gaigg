"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function SeasonSync() {
  const season = useAppStore((s) => s.season);

  useEffect(() => {
    document.documentElement.dataset.season = season;
  }, [season]);

  return null;
}
