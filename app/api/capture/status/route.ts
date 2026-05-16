import { NextResponse } from "next/server";
import { getMappingForCustomer } from "@/lib/customers/splat-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }
  const mapping = await getMappingForCustomer(customerId);
  return NextResponse.json(
    {
      customerId,
      status: mapping.status,
      worlds: mapping.worlds,
      pendingOperationIds: mapping.pendingOperationIds,
      errorMessage: mapping.errorMessage,
      startedAt: mapping.startedAt,
      updatedAt: mapping.updatedAt,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
