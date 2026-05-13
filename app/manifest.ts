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
        // Matches the exported `size` in app/icon.tsx. Concrete dimensions are
        // required for raster types; "any" is reserved for vector formats.
        src: "/icon",
        sizes: "64x64",
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
