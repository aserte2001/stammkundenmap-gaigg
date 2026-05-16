import { NextResponse } from "next/server";
import { getMappingForCustomer } from "@/lib/customers/splat-store";
import { pollCustomerPendingOps } from "@/lib/marble/poll";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  // Lazy-poll: while a client is watching this customer, every status request
  // also drives Marble forward. This is the primary polling mechanism on
  // Vercel Hobby (where Cron is capped at 1×/day). The cron sweep stays as a
  // fallback for orphaned captures (tab closed mid-processing).
  let initial = await getMappingForCustomer(customerId);
  if (initial.status === "processing" && initial.pendingOperationIds.length > 0) {
    try {
      await pollCustomerPendingOps(customerId);
      initial = await getMappingForCustomer(customerId);
    } catch (err) {
      // Polling failure must never break the read — log and serve cached state.
      console.error("lazy poll failed", { customerId, err });
    }
  }
  const mapping = initial;

  return NextResponse.json(
    {
      customerId,
      status: mapping.status,
      worlds: mapping.worlds,
      pendingOperationIds: mapping.pendingOperationIds,
      errorMessage: mapping.errorMessage,
      startedAt: mapping.startedAt,
      updatedAt: mapping.updatedAt,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
