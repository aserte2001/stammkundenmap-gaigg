import { NextResponse } from "next/server";
import { getMarbleClient } from "@/lib/marble/client";
import {
  addWorldToCustomer,
  getSplatMappings,
  markFailed,
  summarisePendingOps,
} from "@/lib/customers/splat-store";
import type { World } from "@/lib/marble/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Polled by Vercel Cron once a minute. Walks every `processing` customer,
 * calls `GET /operations/{id}`, and translates the result into our store.
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

  const client = getMarbleClient();
  let ready = 0;
  let failed = 0;

  for (const { customerId, operationId } of pending) {
    try {
      const op = await client.getOperation(operationId);
      if (!op.done) continue;
      if (op.error) {
        await markFailed(
          customerId,
          operationId,
          op.error.message ?? `Marble error code ${op.error.code ?? "unknown"}`,
        );
        failed++;
        continue;
      }
      const world = op.response;
      if (!world) {
        await markFailed(customerId, operationId, "Marble done=true but response is null");
        failed++;
        continue;
      }
      await addWorldToCustomer(customerId, mapWorldToEntry(world), operationId);
      ready++;
    } catch (err) {
      console.error("Cron poll failed for", { customerId, operationId, err });
    }
  }

  return NextResponse.json({ checked: pending.length, ready, failed });
}

function mapWorldToEntry(world: World) {
  const splats = world.assets?.splats?.spz_urls ?? null;
  return {
    id: world.world_id,
    label: world.display_name || `Standort ${new Date().toLocaleDateString("de-AT")}`,
    operationId: "",
    marbleWorldId: world.world_id,
    splatUrl: splats?.full_res ?? splats?.["500k"] ?? splats?.["100k"] ?? null,
    splatUrl500k: splats?.["500k"] ?? null,
    splatUrl100k: splats?.["100k"] ?? null,
    thumbnail: world.assets?.thumbnail_url ?? null,
    panorama: world.assets?.imagery?.pano_url ?? null,
    createdAt: new Date().toISOString(),
  };
}
