import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #2f6b3a 0%, #0e1f12 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 38,
        fontWeight: 800,
        letterSpacing: "-0.05em",
      }}
    >
      G
    </div>,
    size,
  );
}
