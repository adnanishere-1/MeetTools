import type { MetadataRoute } from "next";
import { resizePresets } from "@/lib/resizePresets";

const BASE_URL = "https://www.meetools.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE_URL}/`, lastModified: now, priority: 1 },
    { url: `${BASE_URL}/tools`, lastModified: now, priority: 0.9 },
    { url: `${BASE_URL}/tools/resize`, lastModified: now, priority: 0.8 },
    ...resizePresets.map((p) => ({
      url: `${BASE_URL}/tools/resize/${p.slug}`,
      lastModified: now,
      priority: 0.7,
    })),
  ];
}