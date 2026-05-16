/**
 * Thin client around the World Labs Marble API. Auth via the WLT-Api-Key
 * header (verified Phase 0). Retries with exponential backoff on 429/503.
 *
 * Server-only — never bundle this into the client. The `WORLDLABS_API_KEY`
 * env var is read once at construction and never sent to the browser.
 */
import type {
  GenerateWorldRequest,
  GenerateWorldResponse,
  GetOperationResponse,
  PrepareUploadRequest,
  PrepareUploadResponse,
} from "./types";

const BASE_URL = "https://api.worldlabs.ai";

export class MarbleApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly bodyText: string,
  ) {
    super(`Marble ${endpoint} ${status}: ${bodyText.slice(0, 200)}`);
    this.name = "MarbleApiError";
  }
}

export class MarbleClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    if (!apiKey) {
      throw new Error("MarbleClient requires WORLDLABS_API_KEY");
    }
  }

  async prepareUpload(req: PrepareUploadRequest): Promise<PrepareUploadResponse> {
    return this.request<PrepareUploadResponse>(
      "POST",
      "/marble/v1/media-assets:prepare_upload",
      req,
    );
  }

  /**
   * PUT raw bytes to the signed URL returned by `prepareUpload`.
   * Returns nothing on success; throws on non-2xx.
   */
  async uploadBytes(
    uploadUrl: string,
    headers: Record<string, string>,
    body: Blob | ArrayBuffer | Uint8Array,
  ): Promise<void> {
    const res = await this.fetchFn(uploadUrl, {
      method: "PUT",
      headers,
      body: body as BodyInit,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new MarbleApiError(res.status, uploadUrl, text);
    }
  }

  async generateWorld(req: GenerateWorldRequest): Promise<GenerateWorldResponse> {
    return this.request<GenerateWorldResponse>(
      "POST",
      "/marble/v1/worlds:generate",
      req,
    );
  }

  async getOperation(operationId: string): Promise<GetOperationResponse> {
    return this.request<GetOperationResponse>(
      "GET",
      `/marble/v1/operations/${encodeURIComponent(operationId)}`,
    );
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      "WLT-Api-Key": this.apiKey,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await this.fetchFn(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (res.status === 429 || res.status === 503) {
          await sleep(backoffMs(attempt));
          continue;
        }
        const text = await res.text();
        if (!res.ok) {
          throw new MarbleApiError(res.status, path, text);
        }
        return JSON.parse(text) as T;
      } catch (err) {
        lastErr = err;
        if (err instanceof MarbleApiError) throw err;
        if (attempt === 3) break;
        await sleep(backoffMs(attempt));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(`Marble request failed: ${path}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(8000, 250 * 2 ** attempt + Math.floor(Math.random() * 100));
}

let cached: MarbleClient | null = null;
export function getMarbleClient(): MarbleClient {
  if (cached) return cached;
  const key = process.env.WORLDLABS_API_KEY;
  if (!key) throw new Error("WORLDLABS_API_KEY is not set");
  cached = new MarbleClient(key);
  return cached;
}
