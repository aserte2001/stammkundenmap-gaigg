import { ImageResponse } from "next/og";
import { customers } from "@/lib/customers";

export const runtime = "edge";
export const alt = "Begehbare 3D-Welt — Gartengestaltung Gaigg";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ customerId: string }>;
};

export default async function OG({ params }: Props) {
  const { customerId } = await params;
  const customer = customers.find((c) => c.id === customerId);
  const name = customer?.name ?? "Welt";
  const district = customer?.address.district ?? "Linz";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0c1f17 0%, #1a3a2a 60%, #2d5a3f 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🌿
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, opacity: 0.7 }}>Gartengestaltung Gaigg</span>
            <span style={{ fontSize: 26, fontWeight: 600 }}>StammKundenMap · Welt</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 28, opacity: 0.75 }}>Begehbare 3D-Welt</span>
          <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{name}</span>
          <span style={{ fontSize: 30, opacity: 0.8 }}>{district}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "rgba(255,255,255,0.55)",
            fontSize: 18,
          }}
        >
          <span>Google Photorealistic 3D Tiles · Luma Gaussian Splats</span>
          <span>linz.gaigg.at/welt</span>
        </div>
      </div>
    ),
    size,
  );
}
