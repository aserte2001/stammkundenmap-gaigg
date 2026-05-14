import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (cachedClient) return cachedClient;
  const apiKey = serverEnv.openaiApiKey;
  if (!apiKey) return null;
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export type GenerateImageResult = {
  base64: string;
  promptUsed: string;
};

export async function generateGardenImage(opts: {
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  quality?: "high" | "medium" | "low" | "auto";
}): Promise<GenerateImageResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI client not configured: OPENAI_API_KEY missing.");
  }
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    size: opts.size ?? "1024x1024",
    quality: opts.quality ?? "high",
    n: 1,
  });
  const data = response.data?.[0];
  if (!data || !data.b64_json) {
    throw new Error("OpenAI image response missing b64_json payload.");
  }
  return {
    base64: data.b64_json,
    promptUsed: opts.prompt,
  };
}
