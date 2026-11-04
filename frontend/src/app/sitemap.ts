import type { MetadataRoute } from "next";

const BASE_URL = "https://www.meetools.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE_URL}/`, lastModified: now, priority: 1 },
    { url: `${BASE_URL}/tools`, lastModified: now, priority: 0.9 },
    { url: `${BASE_URL}/tools/resize`, lastModified: now, priority: 0.8 },
    { url: `${BASE_URL}/login`, lastModified: now, priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: now, priority: 0.3 },
  ];
}