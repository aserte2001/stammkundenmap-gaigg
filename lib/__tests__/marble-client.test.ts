import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarbleApiError, MarbleClient } from "../marble/client";

describe("MarbleClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires an API key", () => {
    expect(() => new MarbleClient("")).toThrow(/API_KEY/);
  });

  it("attaches WLT-Api-Key on every request", async () => {
    fetchMock.mockResolvedValue(makeJsonResponse(200, { worlds: [] }));
    const client = new MarbleClient("k", fetchMock as unknown as typeof fetch);
    await client.getOperation("op-1");
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ "WLT-Api-Key": "k" });
    expect((init as RequestInit).method).toBe("GET");
  });

  it("posts JSON to prepareUpload and parses the response", async () => {
    const expected = {
      media_asset: { media_asset_id: "x" },
      upload_info: { upload_url: "https://u/", upload_method: "PUT", required_headers: {} },
    };
    fetchMock.mockResolvedValue(makeJsonResponse(200, expected));
    const client = new MarbleClient("k", fetchMock as unknown as typeof fetch);
    const result = await client.prepareUpload({
      file_name: "x.jpg",
      extension: "jpg",
      kind: "image",
    });
    expect(result.media_asset.media_asset_id).toBe("x");
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("retries on 429 then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(makeJsonResponse(429, { error: "rate" }))
      .mockResolvedValueOnce(makeJsonResponse(200, { operation_id: "op-1", done: false }));
    const client = new MarbleClient("k", fetchMock as unknown as typeof fetch);
    const result = await client.getOperation("op-1");
    expect(result.operation_id).toBe("op-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws MarbleApiError on 4xx after retries are exhausted (non-retryable)", async () => {
    fetchMock.mockResolvedValue(makeJsonResponse(404, "not found"));
    const client = new MarbleClient("k", fetchMock as unknown as typeof fetch);
    await expect(client.getOperation("missing")).rejects.toBeInstanceOf(MarbleApiError);
  });

  it("uploadBytes PUTs raw body without extra headers tampering", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const client = new MarbleClient("k", fetchMock as unknown as typeof fetch);
    await client.uploadBytes("https://signed-url", { "x-h": "v" }, new Blob(["x"]));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://signed-url");
    expect((init as RequestInit).method).toBe("PUT");
    expect((init as RequestInit).headers).toEqual({ "x-h": "v" });
  });
});

function makeJsonResponse(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
