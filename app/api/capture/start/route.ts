import { NextResponse } from "next/server";
import { customersById } from "@/lib/customers";
import { getMarbleClient } from "@/lib/marble/client";
import {
  assertWithinCap,
  incrementMonthly,
} from "@/lib/marble/cost-tracker";
import {
  markFailed,
  markProcessing,
} from "@/lib/customers/splat-store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 8;
const MIN_PHOTOS = 4;

type SlotMeta = {
  slot: number;
  azimuth: number;
  elevation: number;
  position: string;
  mediaAssetId: string;
};

type CaptureRequest = {
  customerId: string;
  size: "small" | "medium" | "large";
  mode: "phone" | "upload";
  reconstruct: boolean;
  slots: SlotMeta[];
};

export async function POST(req: Request) {
  let parsed: CaptureRequest | null = null;
  try {
    parsed = (await req.json()) as CaptureRequest;
    const meta = parsed;

    const customer = customersById[meta.customerId];
    if (!customer) return badRequest("Unknown customer.");

    if (
      !Array.isArray(meta.slots) ||
      meta.slots.length < MIN_PHOTOS ||
      meta.slots.length > MAX_PHOTOS
    ) {
      return badRequest(
        `Need ${MIN_PHOTOS}-${MAX_PHOTOS} slots, got ${meta.slots?.length ?? 0}.`,
      );
    }

    for (const s of meta.slots) {
      if (typeof s.mediaAssetId !== "string" || s.mediaAssetId.length === 0) {
        return badRequest(`Slot ${s.slot} is missing mediaAssetId.`);
      }
    }

    await assertWithinCap();

    const client = getMarbleClient();

    const model =
      process.env.MARBLE_MODEL_OVERRIDE === "draft"
        ? ("marble-1.0-draft" as const)
        : meta.size === "large"
          ? ("marble-1.1-plus" as const)
          : ("marble-1.1" as const);

    const generated = await client.generateWorld({
      display_name: `${customer.name} (${new Date().toISOString().slice(0, 10)})`,
      model,
      tags: ["gartengestaltung-gaigg", customer.id, customer.gardenType],
      world_prompt: {
        type: "multi-image",
        multi_image_prompt: meta.slots.map((s) => ({
          azimuth: s.azimuth,
          content: { source: "media_asset" as const, media_asset_id: s.mediaAssetId },
        })),
        reconstruct_images: meta.reconstruct,
        text_prompt: buildPrompt(customer),
      },
    });

    await markProcessing(meta.customerId, generated.operation_id);
    await incrementMonthly(1);

    return NextResponse.json({
      operationId: generated.operation_id,
      etaSeconds: model === "marble-1.0-draft" ? 60 : 300,
      model,
    });
  } catch (err) {
    console.error("/api/capture/start failed", err);
    if (parsed?.customerId) {
      await markFailed(
        parsed.customerId,
        "submission",
        err instanceof Error ? err.message : "Unknown error",
      ).catch(() => {});
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

function buildPrompt(customer: (typeof customersById)[string]): string {
  return `Garden of ${customer.name} in ${customer.address.city}, Austria. Garden type: ${customer.gardenType}, ${customer.gardenSizeM2} m². ${customer.notes}`.slice(
    0,
    480,
  );
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
