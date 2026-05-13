import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/brand-tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.companyName} — Stammkunden-Map`,
    short_name: "Gaigg-Map",
    description: BRAND.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#0a1a0e",
    theme_color: "#0a1a0e",
    lang: "de-AT",
    icons: [
      {
        src: "/icon",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
