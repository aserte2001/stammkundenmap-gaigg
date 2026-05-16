"use client";

import { SplatIframe } from "./splat-iframe";

type Props = {
  url: string;
};

/**
 * Wrapper kept for backward-compatibility — the only renderer left is the
 * Luma iframe path (used for public-capture demos like the Hotel Wolfinger
 * inner courtyard). The previous Three.js mode was removed in Phase G when
 * Spark 2.0 became the canonical splat renderer for the new
 * `/welt/[customerId]` Marble pipeline.
 */
export function SplatViewer({ url }: Props) {
  return (
    <div className="flex h-full min-h-[340px] flex-col gap-2">
      <div className="relative flex-1">
        <SplatIframe url={url} />
      </div>
    </div>
  );
}
