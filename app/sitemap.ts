import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/brand-tokens";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `https://${BRAND.domain}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
