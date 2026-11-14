
import type { MetadataRoute } from "next";
import { resizePresets } from "@/lib/resizePresets";

const BASE_URL = "https://www.meetools.online";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      priority: 1,
    },
    {
      url: `${BASE_URL}/tools`,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tools/resize`,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tools/enhance`,
      priority: 0.8,
    },
    ...resizePresets.map((preset) => ({
      url: `${BASE_URL}/tools/resize/${preset.slug}`,
      priority: 0.7,
    })),
  ];
}
