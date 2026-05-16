/**
 * IndexedDB-backed scratchpad for in-progress captures. Each capture lives
 * under a `customerId` key so Simon can resume the same garden later from
 * the same phone, and so we never collide between customers.
 *
 * Records older than `STALE_DAYS` are pruned on every open — that keeps the
 * DB from growing if a capture is abandoned mid-way.
 */
const DB_NAME = "stammkundenmap-capture";
const DB_VERSION = 1;
const STORE = "captures";
const STALE_DAYS = 7;

export type StoredCapture = {
  customerId: string;
  slot: number;
  azimuth: number;
  elevation: number;
  position: string;
  blob: Blob;
  createdAt: number;
};

export type CaptureRecord = {
  /** Composite key `${customerId}#${slot}`. */
  id: string;
  customerId: string;
  slot: number;
  azimuth: number;
  elevation: number;
  position: string;
  blob: Blob;
  createdAt: number;
};

function recordId(customerId: string, slot: number): string {
  return `${customerId}#${slot}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("byCustomer", "customerId", { unique: false });
        store.createIndex("byCreatedAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      pruneStale(db).finally(() => resolve(db));
    };
    req.onerror = () => reject(req.error);
  });
}

async function pruneStale(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const idx = store.index("byCreatedAt");
    const range = IDBKeyRange.upperBound(cutoff);
    const cursorReq = idx.openCursor(range);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function saveCapture(record: StoredCapture): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      id: recordId(record.customerId, record.slot),
      ...record,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCaptures(customerId: string): Promise<CaptureRecord[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("byCustomer");
    const req = idx.getAll(IDBKeyRange.only(customerId));
    req.onsuccess = () => {
      const records = (req.result as CaptureRecord[]).slice().sort((a, b) => a.slot - b.slot);
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearCaptures(customerId: string): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const idx = tx.objectStore(STORE).index("byCustomer");
    const cursorReq = idx.openCursor(IDBKeyRange.only(customerId));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function hasCaptures(customerId: string): Promise<boolean> {
  const records = await loadCaptures(customerId);
  return records.length > 0;
}
