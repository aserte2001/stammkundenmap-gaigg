import { NextResponse } from "next/server";
import { customersById } from "@/lib/customers";
import { getMarbleClient } from "@/lib/marble/client";
import { assertWithinCap } from "@/lib/marble/cost-tracker";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 8;
const MIN_PHOTOS = 4;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

type PrepareRequest = {
  customerId: string;
  files: Array<{
    slot: number;
    extension: string;
    azimuth: number;
  }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PrepareRequest;
    const { customerId, files } = body;

    if (!customerId || !customersById[customerId]) {
      return badRequest("Unknown customer.");
    }

    if (!Array.isArray(files) || files.length < MIN_PHOTOS || files.length > MAX_PHOTOS) {
      return badRequest(`Need ${MIN_PHOTOS}-${MAX_PHOTOS} files, got ${files?.length ?? 0}.`);
    }

    for (const f of files) {
      if (typeof f.slot !== "number" || typeof f.azimuth !== "number") {
        return badRequest("Each file needs numeric slot and azimuth.");
      }
      if (!ALLOWED_EXT.has(f.extension.toLowerCase())) {
        return badRequest(`Unsupported extension: ${f.extension}`);
      }
    }

    await assertWithinCap();

    const client = getMarbleClient();

    const uploads = await Promise.all(
      files.map(async (f) => {
        const prepared = await client.prepareUpload({
          file_name: `${customerId}-slot-${f.slot}.${f.extension}`,
          extension: f.extension,
          kind: "image",
          metadata: { customer_id: customerId, slot: f.slot, azimuth: f.azimuth },
        });
        return {
          slot: f.slot,
          azimuth: f.azimuth,
          mediaAssetId: prepared.media_asset.media_asset_id,
          uploadUrl: prepared.upload_info.upload_url,
          uploadMethod: prepared.upload_info.upload_method ?? "PUT",
          requiredHeaders: prepared.upload_info.required_headers ?? {},
        };
      }),
    );

    return NextResponse.json({ uploads });
  } catch (err) {
    console.error("/api/capture/prepare failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
