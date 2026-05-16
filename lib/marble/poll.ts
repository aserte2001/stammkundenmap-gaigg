/**
 * Per-customer polling of pending Marble operations. Used by:
 *   1. The status endpoint (lazy: while a client is watching, every status
 *      request also drives Marble forward — works on Vercel Hobby where Cron
 *      is limited to 1×/day).
 *   2. The cron endpoint (sweep: walks every customer with pending ops as a
 *      fallback for tabs that were closed mid-capture).
 *
 * Server-only.
 */
import { getMarbleClient, type MarbleClient } from "@/lib/marble/client";
import {
  addWorldToCustomer,
  getMappingForCustomer,
  markFailed,
} from "@/lib/customers/splat-store";
import type { World } from "@/lib/marble/types";

export type PollResult = { checked: number; ready: number; failed: number };

/**
 * Walks every pending operation for a single customer, calls
 * `GET /operations/{id}`, and translates terminal results into the store.
 * Safe to call repeatedly; no-op when nothing is pending.
 *
 * The Marble client is injectable for tests — production callers omit it
 * and get the cached singleton.
 */
export async function pollCustomerPendingOps(
  customerId: string,
  client?: Pick<MarbleClient, "getOperation">,
): Promise<PollResult> {
  const mapping = await getMappingForCustomer(customerId);
  const pending = mapping.pendingOperationIds;
  if (pending.length === 0) return { checked: 0, ready: 0, failed: 0 };

  const marble = client ?? getMarbleClient();
  let ready = 0;
  let failed = 0;

  for (const operationId of pending) {
    try {
      const op = await marble.getOperation(operationId);
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
      console.error("pollCustomerPendingOps failed", { customerId, operationId, err });
    }
  }

  return { checked: pending.length, ready, failed };
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
