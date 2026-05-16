import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addWorldToCustomer,
  clearAllMappings,
  defaultMapping,
  getMappingForCustomer,
  markProcessing,
  setMappingForCustomer,
} from "../customers/splat-store";
import { pollCustomerPendingOps } from "../marble/poll";
import type { GetOperationResponse, World } from "../marble/types";

const LOCAL_CACHE = path.join(process.cwd(), ".cache", "splat-mappings.json");

function makeWorld(id: string): World {
  return {
    world_id: id,
    display_name: `Welt ${id}`,
    assets: {
      thumbnail_url: `https://cdn/${id}.webp`,
      splats: {
        spz_urls: {
          full_res: `https://cdn/${id}/full.spz`,
          "500k": `https://cdn/${id}/500k.spz`,
          "100k": `https://cdn/${id}/100k.spz`,
        },
      },
      imagery: { pano_url: `https://cdn/${id}/pano.png` },
    },
  } as unknown as World;
}

function fakeClient(opMap: Record<string, GetOperationResponse>) {
  return {
    getOperation: vi.fn(async (id: string) => {
      const op = opMap[id];
      if (!op) throw new Error(`unknown op ${id}`);
      return op;
    }),
  };
}

beforeEach(async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  await clearAllMappings();
});

afterEach(async () => {
  await fs.unlink(LOCAL_CACHE).catch(() => {});
});

describe("pollCustomerPendingOps", () => {
  it("is a no-op when nothing is pending", async () => {
    const client = fakeClient({});
    const result = await pollCustomerPendingOps("c-empty", client);
    expect(result).toEqual({ checked: 0, ready: 0, failed: 0 });
    expect(client.getOperation).not.toHaveBeenCalled();
  });

  it("skips operations that are still in flight (done=false)", async () => {
    await markProcessing("c-001", "op-pending");
    const client = fakeClient({
      "op-pending": { name: "op-pending", done: false } as GetOperationResponse,
    });
    const result = await pollCustomerPendingOps("c-001", client);
    expect(result).toEqual({ checked: 1, ready: 0, failed: 0 });
    const after = await getMappingForCustomer("c-001");
    expect(after.status).toBe("processing");
    expect(after.pendingOperationIds).toEqual(["op-pending"]);
  });

  it("flips a customer to ready when an operation finishes successfully", async () => {
    await markProcessing("c-001", "op-done");
    const client = fakeClient({
      "op-done": {
        name: "op-done",
        done: true,
        response: makeWorld("world-1"),
      } as GetOperationResponse,
    });
    const result = await pollCustomerPendingOps("c-001", client);
    expect(result).toEqual({ checked: 1, ready: 1, failed: 0 });
    const after = await getMappingForCustomer("c-001");
    expect(after.status).toBe("ready");
    expect(after.worlds).toHaveLength(1);
    expect(after.worlds[0]).toMatchObject({
      marbleWorldId: "world-1",
      splatUrl: "https://cdn/world-1/full.spz",
      splatUrl500k: "https://cdn/world-1/500k.spz",
      splatUrl100k: "https://cdn/world-1/100k.spz",
      thumbnail: "https://cdn/world-1.webp",
      panorama: "https://cdn/world-1/pano.png",
    });
    expect(after.pendingOperationIds).toEqual([]);
  });

  it("falls back to 500k splat URL when full_res is missing", async () => {
    await markProcessing("c-002", "op-low");
    const world = makeWorld("world-low");
    delete world.assets!.splats!.spz_urls!.full_res;
    const client = fakeClient({
      "op-low": { name: "op-low", done: true, response: world } as GetOperationResponse,
    });
    await pollCustomerPendingOps("c-002", client);
    const after = await getMappingForCustomer("c-002");
    expect(after.worlds[0].splatUrl).toBe("https://cdn/world-low/500k.spz");
  });

  it("marks the customer as failed when the operation returns an error", async () => {
    await markProcessing("c-001", "op-bad");
    const client = fakeClient({
      "op-bad": {
        name: "op-bad",
        done: true,
        error: { code: 7, message: "image too dark" },
      } as GetOperationResponse,
    });
    const result = await pollCustomerPendingOps("c-001", client);
    expect(result).toEqual({ checked: 1, ready: 0, failed: 1 });
    const after = await getMappingForCustomer("c-001");
    expect(after.status).toBe("failed");
    expect(after.errorMessage).toMatch(/image too dark/i);
  });

  it("marks failed when done=true but response is null", async () => {
    await markProcessing("c-001", "op-null");
    const client = fakeClient({
      "op-null": { name: "op-null", done: true, response: null } as GetOperationResponse,
    });
    const result = await pollCustomerPendingOps("c-001", client);
    expect(result.failed).toBe(1);
    const after = await getMappingForCustomer("c-001");
    expect(after.status).toBe("failed");
  });

  it("does not mutate state when the Marble client throws (network blip)", async () => {
    await markProcessing("c-001", "op-flaky");
    const client = {
      getOperation: vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    };
    const result = await pollCustomerPendingOps("c-001", client);
    expect(result).toEqual({ checked: 1, ready: 0, failed: 0 });
    const after = await getMappingForCustomer("c-001");
    expect(after.status).toBe("processing");
    expect(after.pendingOperationIds).toEqual(["op-flaky"]);
  });

  it("processes multiple pending ops in one pass", async () => {
    await setMappingForCustomer("c-001", {
      ...defaultMapping(),
      status: "processing",
      pendingOperationIds: ["op-1", "op-2", "op-3"],
    });
    const client = fakeClient({
      "op-1": {
        name: "op-1",
        done: true,
        response: makeWorld("w-1"),
      } as GetOperationResponse,
      "op-2": { name: "op-2", done: false } as GetOperationResponse,
      "op-3": {
        name: "op-3",
        done: true,
        error: { code: 13, message: "timeout" },
      } as GetOperationResponse,
    });
    const result = await pollCustomerPendingOps("c-001", client);
    expect(result).toEqual({ checked: 3, ready: 1, failed: 1 });
    const after = await getMappingForCustomer("c-001");
    // One world done + one still pending → status stays processing
    expect(after.worlds).toHaveLength(1);
    // op-2 still pending; op-3 was failed (its op-id was removed by markFailed)
    expect(after.pendingOperationIds).toContain("op-2");
  });

  it("preserves an existing ready world while a second op is still in flight", async () => {
    await markProcessing("c-001", "op-old");
    await addWorldToCustomer(
      "c-001",
      {
        id: "w-old",
        label: "Bestand",
        operationId: "",
        marbleWorldId: "w-old",
        splatUrl: "https://cdn/old.spz",
        splatUrl500k: null,
        splatUrl100k: null,
        thumbnail: null,
        panorama: null,
        createdAt: new Date(2026, 4, 1).toISOString(),
      },
      "op-old",
    );
    await markProcessing("c-001", "op-new");
    const client = fakeClient({
      "op-new": { name: "op-new", done: false } as GetOperationResponse,
    });
    await pollCustomerPendingOps("c-001", client);
    const after = await getMappingForCustomer("c-001");
    expect(after.worlds).toHaveLength(1);
    expect(after.worlds[0].marbleWorldId).toBe("w-old");
    expect(after.pendingOperationIds).toEqual(["op-new"]);
  });
});
