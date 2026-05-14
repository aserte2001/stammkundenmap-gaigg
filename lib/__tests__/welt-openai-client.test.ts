// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
  vi.restoreAllMocks();
});

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

describe("openai client", () => {
  it("returns null when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { getOpenAIClient } = await import("@/lib/openai/client");
    expect(getOpenAIClient()).toBeNull();
  });

  it("throws when calling generateGardenImage without configuration", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { generateGardenImage } = await import("@/lib/openai/client");
    await expect(
      generateGardenImage({ prompt: "x" }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("caches the client across calls when key is present", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { getOpenAIClient } = await import("@/lib/openai/client");
    const a = getOpenAIClient();
    const b = getOpenAIClient();
    expect(a).toBe(b);
    expect(a).not.toBeNull();
  });

  it("returns the base64 payload when OpenAI succeeds", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { generateGardenImage, getOpenAIClient } = await import("@/lib/openai/client");
    const client = getOpenAIClient();
    if (!client) throw new Error("client not built");
    vi.spyOn(client.images, "generate").mockResolvedValue({
      data: [{ b64_json: "AAAA" }],
    } as never);
    const result = await generateGardenImage({ prompt: "test" });
    expect(result.base64).toBe("AAAA");
    expect(result.promptUsed).toBe("test");
  });

  it("throws when OpenAI returns no b64_json", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { generateGardenImage, getOpenAIClient } = await import("@/lib/openai/client");
    const client = getOpenAIClient();
    if (!client) throw new Error("client not built");
    vi.spyOn(client.images, "generate").mockResolvedValue({ data: [{}] } as never);
    await expect(generateGardenImage({ prompt: "x" })).rejects.toThrow(/b64_json/);
  });
});
