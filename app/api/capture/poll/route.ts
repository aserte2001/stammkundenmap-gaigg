import { NextResponse } from "next/server";
import { getSplatMappings, summarisePendingOps } from "@/lib/customers/splat-store";
import { pollCustomerPendingOps } from "@/lib/marble/poll";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily cron sweep on Vercel Hobby (1×/day, scheduled in vercel.json). Walks
 * every customer with pending Marble operations and forces a status check.
 *
 * On Hobby this is a *fallback* for orphaned captures — the primary polling
 * happens lazily inside `/api/capture/status` while a client is watching the
 * customer.
 *
 * Auth: Vercel sends a CRON_SECRET via `Authorization: Bearer <secret>`.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getSplatMappings(true);
  const pending = summarisePendingOps(store);
  if (pending.length === 0) {
    return NextResponse.json({ checked: 0, ready: 0, failed: 0 });
  }

  // Group by customer so we don't double-poll a customer with multiple ops.
  const customerIds = Array.from(new Set(pending.map((p) => p.customerId)));

  let totalChecked = 0;
  let totalReady = 0;
  let totalFailed = 0;
  for (const customerId of customerIds) {
    const result = await pollCustomerPendingOps(customerId);
    totalChecked += result.checked;
    totalReady += result.ready;
    totalFailed += result.failed;
  }

  return NextResponse.json({
    checked: totalChecked,
    ready: totalReady,
    failed: totalFailed,
    customers: customerIds.length,
  });
}
