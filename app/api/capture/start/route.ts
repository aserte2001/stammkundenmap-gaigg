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
export const maxDuration = 300;

const MAX_PHOTOS = 8;
const MIN_PHOTOS = 4;

type SlotMeta = {
  slot: number;
  azimuth: number;
  elevation: number;
  position: string;
};

type CaptureMeta = {
  customerId: string;
  size: "small" | "medium" | "large";
  mode: "phone" | "upload";
  reconstruct: boolean;
  slots: SlotMeta[];
};

export async function POST(req: Request) {
  let parsedMeta: CaptureMeta | null = null;
  try {
    const formData = await req.formData();
    const metaRaw = formData.get("meta");
    if (typeof metaRaw !== "string") {
      return badRequest("Missing meta field.");
    }
    parsedMeta = JSON.parse(metaRaw) as CaptureMeta;
    const meta = parsedMeta;

    const customer = customersById[meta.customerId];
    if (!customer) return badRequest("Unknown customer.");

    const photoEntries = formData.getAll("photos");
    if (photoEntries.length < MIN_PHOTOS || photoEntries.length > MAX_PHOTOS) {
      return badRequest(
        `Need ${MIN_PHOTOS}–${MAX_PHOTOS} photos, got ${photoEntries.length}.`,
      );
    }
    if (meta.slots.length !== photoEntries.length) {
      return badRequest("Slot metadata count does not match photo count.");
    }

    await assertWithinCap();

    const client = getMarbleClient();

    // 1. Upload every photo to Marble's signed-URL storage in parallel.
    const uploaded = await Promise.all(
      photoEntries.map(async (entry, index) => {
        if (!(entry instanceof File)) {
          throw new Error(`Photo at index ${index} is not a File.`);
        }
        const slotMeta = meta.slots[index];
        const file = entry;
        const ext = file.name.includes(".") ? file.name.split(".").pop()! : "jpg";
        const prepared = await client.prepareUpload({
          file_name: `${meta.customerId}-slot-${slotMeta.slot}.${ext}`,
          extension: ext,
          kind: "image",
          metadata: { customer_id: meta.customerId, slot: slotMeta.slot, azimuth: slotMeta.azimuth },
        });
        await client.uploadBytes(
          prepared.upload_info.upload_url,
          prepared.upload_info.required_headers ?? {},
          await file.arrayBuffer(),
        );
        return {
          azimuth: slotMeta.azimuth,
          mediaAssetId: prepared.media_asset.media_asset_id,
        };
      }),
    );

    // 2. Trigger world generation.
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
        multi_image_prompt: uploaded.map((u) => ({
          azimuth: u.azimuth,
          content: { source: "media_asset" as const, media_asset_id: u.mediaAssetId },
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
    if (parsedMeta?.customerId) {
      await markFailed(
        parsedMeta.customerId,
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
