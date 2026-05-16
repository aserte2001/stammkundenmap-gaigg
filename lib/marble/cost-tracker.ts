/**
 * Monthly capture-cost guard. Tracked in Vercel Edge Config so reads are
 * <10 ms and the value survives cold-starts. The counter auto-resets the
 * first time a write lands in a new month.
 *
 * In Dev or when EDGE_CONFIG is missing we fall back to an in-memory map —
 * Simon's local Phase-0 usage shouldn't trip the cap and we don't want the
 * dev server to crash on first run.
 */
import { get } from "@vercel/edge-config";

const COUNTER_KEY = "marble_monthly";

const memory: { yearMonth: string; count: number } = {
  yearMonth: currentYearMonth(),
  count: 0,
};

type StoredCounter = { yearMonth: string; count: number };

export type CostCapOptions = {
  softCap?: number;
  hardCap?: number;
};

const DEFAULTS: Required<CostCapOptions> = {
  softCap: 50,
  hardCap: 100,
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readStored(): Promise<StoredCounter> {
  if (!process.env.EDGE_CONFIG) {
    return { ...memory };
  }
  try {
    const value = (await get<StoredCounter>(COUNTER_KEY)) ?? null;
    if (!value || value.yearMonth !== currentYearMonth()) {
      return { yearMonth: currentYearMonth(), count: 0 };
    }
    return value;
  } catch (err) {
    console.error("Edge Config read failed", err);
    return { ...memory };
  }
}

async function writeStored(value: StoredCounter): Promise<void> {
  if (!process.env.EDGE_CONFIG) {
    memory.yearMonth = value.yearMonth;
    memory.count = value.count;
    return;
  }
  // Vercel Edge Config writes go through the Vercel REST API.
  const editToken = process.env.VERCEL_EDGE_CONFIG_TOKEN;
  const edgeId = parseEdgeConfigId(process.env.EDGE_CONFIG);
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!editToken || !edgeId) {
    console.warn("Edge Config write skipped — missing VERCEL_EDGE_CONFIG_TOKEN");
    memory.yearMonth = value.yearMonth;
    memory.count = value.count;
    return;
  }
  const url = teamId
    ? `https://api.vercel.com/v1/edge-config/${edgeId}/items?teamId=${teamId}`
    : `https://api.vercel.com/v1/edge-config/${edgeId}/items`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${editToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: COUNTER_KEY, value }],
    }),
  });
  if (!res.ok) {
    console.error("Edge Config write failed", res.status, await res.text().catch(() => ""));
  }
}

function parseEdgeConfigId(connectionString: string | undefined): string | null {
  if (!connectionString) return null;
  // Format: https://edge-config.vercel.com/<id>?token=<token>
  const match = connectionString.match(/edge-config\.vercel\.com\/([^/?]+)/);
  return match ? match[1] : null;
}

export async function getMonthlyCount(): Promise<number> {
  const stored = await readStored();
  return stored.count;
}

export async function incrementMonthly(by = 1): Promise<number> {
  const stored = await readStored();
  const next: StoredCounter = {
    yearMonth: currentYearMonth(),
    count: stored.count + by,
  };
  await writeStored(next);
  return next.count;
}

export async function assertWithinCap(opts: CostCapOptions = {}): Promise<void> {
  const { softCap, hardCap } = { ...DEFAULTS, ...opts };
  const count = await getMonthlyCount();
  if (count >= hardCap) {
    throw new Error(
      `Marble monthly hard-cap reached (${count}/${hardCap}). New captures blocked until next month.`,
    );
  }
  if (count >= softCap) {
    console.warn(`Marble monthly soft-cap reached (${count}/${softCap}). Consider rotating.`);
  }
}

// Exported for tests only.
export const _internal = {
  resetMemory: () => {
    memory.yearMonth = currentYearMonth();
    memory.count = 0;
  },
  getMemory: () => ({ ...memory }),
};
