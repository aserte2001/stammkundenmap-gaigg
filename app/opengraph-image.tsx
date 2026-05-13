import { ImageResponse } from "next/og";
import { BRAND } from "@/components/brand/brand-tokens";

export const alt = `${BRAND.companyName} — Stammkunden-Map`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(circle at 20% 18%, rgba(74, 170, 90, 0.55), transparent 60%), radial-gradient(circle at 78% 75%, rgba(232, 188, 60, 0.32), transparent 60%), #0e1f12",
        color: "white",
        padding: 96,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          fontSize: 32,
          color: "#a8d8b0",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: "#4eb56b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 800,
            color: "#0a1a0e",
          }}
        >
          G
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontSize: 28, opacity: 0.85 }}>Gartengestaltung</span>
          <span style={{ fontSize: 38, fontWeight: 700 }}>Gaigg</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            margin: 0,
            lineHeight: 1.05,
            color: "white",
          }}
        >
          Stammkunden-Map
        </h1>
        <p style={{ fontSize: 30, color: "#cfe2d2", margin: 0 }}>
          Premium-Gartenpflege in Linz und Umgebung — 25 Standorte, 3D-Erfassungen, Live-Karte.
        </p>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#9ebca3",
          fontSize: 22,
        }}
      >
        <span>{BRAND.tagline}</span>
        <span>{BRAND.domain}</span>
      </div>
    </div>,
    size,
  );
}
