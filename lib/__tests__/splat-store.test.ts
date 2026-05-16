import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addWorldToCustomer,
  clearAllMappings,
  defaultMapping,
  deleteMappingForCustomer,
  getMappingForCustomer,
  markFailed,
  markProcessing,
  setMappingForCustomer,
  summarisePendingOps,
  type WorldEntry,
} from "../customers/splat-store";

const LOCAL_CACHE = path.join(process.cwd(), ".cache", "splat-mappings.json");

function makeWorld(id: string, splatUrl = `https://cdn/${id}.spz`): WorldEntry {
  return {
    id,
    label: `Standort ${id}`,
    operationId: "",
    marbleWorldId: id,
    splatUrl,
    splatUrl500k: null,
    splatUrl100k: null,
    thumbnail: null,
    panorama: null,
    createdAt: new Date(2026, 4, 15).toISOString(),
  };
}

beforeEach(async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  await clearAllMappings();
});

afterEach(async () => {
  await fs.unlink(LOCAL_CACHE).catch(() => {});
});

describe("splat-store (local fallback)", () => {
  it("returns the default mapping for unknown customers", async () => {
    const m = await getMappingForCustomer("c-unknown");
    expect(m.status).toBe("none");
    expect(m.worlds).toEqual([]);
  });

  it("setMappingForCustomer round-trips", async () => {
    await setMappingForCustomer("c-001", {
      ...defaultMapping(),
      status: "processing",
      pendingOperationIds: ["op-1"],
    });
    const m = await getMappingForCustomer("c-001");
    expect(m.status).toBe("processing");
    expect(m.pendingOperationIds).toEqual(["op-1"]);
  });

  it("markProcessing flips status and tracks pending ops", async () => {
    await markProcessing("c-001", "op-a");
    await markProcessing("c-001", "op-b");
    const m = await getMappingForCustomer("c-001");
    expect(m.status).toBe("processing");
    expect(m.pendingOperationIds).toEqual(expect.arrayContaining(["op-a", "op-b"]));
  });

  it("addWorldToCustomer flips status to ready when no ops remain", async () => {
    await markProcessing("c-001", "op-a");
    await addWorldToCustomer("c-001", makeWorld("w1"), "op-a");
    const m = await getMappingForCustomer("c-001");
    expect(m.status).toBe("ready");
    expect(m.worlds).toHaveLength(1);
    expect(m.pendingOperationIds).toEqual([]);
  });

  it("addWorldToCustomer keeps status processing if more ops are pending", async () => {
    await markProcessing("c-001", "op-a");
    await markProcessing("c-001", "op-b");
    await addWorldToCustomer("c-001", makeWorld("w1"), "op-a");
    const m = await getMappingForCustomer("c-001");
    expect(m.status).toBe("processing");
    expect(m.pendingOperationIds).toEqual(["op-b"]);
  });

  it("markFailed retains worlds and reports the reason", async () => {
    await markProcessing("c-001", "op-a");
    await addWorldToCustomer("c-001", makeWorld("w1"), "op-a");
    await markProcessing("c-001", "op-b");
    await markFailed("c-001", "op-b", "boom");
    const m = await getMappingForCustomer("c-001");
    // Still has w1, so overall status is ready, but errorMessage is set.
    expect(m.status).toBe("ready");
    expect(m.errorMessage).toBe("boom");
    expect(m.worlds).toHaveLength(1);
  });

  it("markFailed without prior worlds → status failed", async () => {
    await markProcessing("c-001", "op-a");
    await markFailed("c-001", "op-a", "broken");
    const m = await getMappingForCustomer("c-001");
    expect(m.status).toBe("failed");
    expect(m.errorMessage).toBe("broken");
  });

  it("deleteMappingForCustomer removes the entry", async () => {
    await markProcessing("c-001", "op-a");
    await deleteMappingForCustomer("c-001");
    const m = await getMappingForCustomer("c-001");
    expect(m.status).toBe("none");
  });

  it("summarisePendingOps flattens across customers", async () => {
    await markProcessing("c-001", "op-a");
    await markProcessing("c-002", "op-b");
    await markProcessing("c-002", "op-c");
    const store = {
      "c-001": (await getMappingForCustomer("c-001")),
      "c-002": (await getMappingForCustomer("c-002")),
    };
    const flat = summarisePendingOps(store);
    expect(flat).toEqual(
      expect.arrayContaining([
        { customerId: "c-001", operationId: "op-a" },
        { customerId: "c-002", operationId: "op-b" },
        { customerId: "c-002", operationId: "op-c" },
      ]),
    );
  });
});
