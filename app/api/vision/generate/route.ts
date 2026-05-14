import { NextResponse, type NextRequest } from "next/server";
import { customers } from "@/lib/customers";
import { generateGardenImage } from "@/lib/openai/client";
import { getCacheKey, readCache, writeCache } from "@/lib/openai/image-cache";
import {
  buildPrompt,
  isGardenSeason,
  isGardenStyle,
  type GardenSeason,
  type GardenStyle,
} from "@/lib/openai/prompts";
import { DEFAULT_LIMIT, checkRateLimit } from "@/lib/openai/rate-limit";
import { hasOpenAI } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  customerId?: string;
  style?: string;
  season?: string;
};

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  if (!hasOpenAI()) {
    return NextResponse.json(
      {
        error: "openai_not_configured",
        message: "OPENAI_API_KEY ist nicht gesetzt. Bitte Server-Owner kontaktieren.",
      },
      { status: 503 },
    );
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { customerId, style, season } = payload;
  if (!customerId || typeof customerId !== "string") {
    return NextResponse.json({ error: "missing_customer" }, { status: 400 });
  }
  if (!isGardenStyle(style)) {
    return NextResponse.json({ error: "invalid_style" }, { status: 400 });
  }
  if (!isGardenSeason(season)) {
    return NextResponse.json({ error: "invalid_season" }, { status: 400 });
  }

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return NextResponse.json({ error: "unknown_customer" }, { status: 404 });
  }

  const ip = clientIp(request);
  const rate = checkRateLimit(`vision:${ip}`, DEFAULT_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Bitte etwas länger warten. Reset um ${new Date(rate.resetAt).toISOString()}.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)).toString(),
          "X-RateLimit-Limit": DEFAULT_LIMIT.max.toString(),
          "X-RateLimit-Remaining": rate.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rate.resetAt / 1000).toString(),
        },
      },
    );
  }

  const cacheKey = getCacheKey(customerId, style, season);
  const cached = await readCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      cached: true,
      dataUrl: cached.dataUrl,
      promptUsed: cached.promptUsed,
      createdAt: cached.createdAt,
    });
  }

  const prompt = buildPrompt({
    customer,
    style: style as GardenStyle,
    season: season as GardenSeason,
  });

  try {
    const start = Date.now();
    const result = await generateGardenImage({ prompt });
    const dataUrl = `data:image/png;base64,${result.base64}`;
    await writeCache(cacheKey, {
      dataUrl,
      promptUsed: result.promptUsed,
      createdAt: Date.now(),
    });
    return NextResponse.json({
      cached: false,
      dataUrl: dataUrl,
      promptUsed: result.promptUsed,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[vision] generation failed", error);
    return NextResponse.json(
      { error: "generation_failed", message },
      { status: 502 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    {
      ok: hasOpenAI(),
      info: "POST { customerId, style, season } → { dataUrl, cached, promptUsed }",
    },
    { status: hasOpenAI() ? 200 : 503 },
  );
}
