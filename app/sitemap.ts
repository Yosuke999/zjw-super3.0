import type { MetadataRoute } from "next";
import { catalogProducts } from "./catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const updated = new Date("2026-08-25T00:00:00+08:00");
  return [
    { url: siteUrl, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/company`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    ...catalogProducts.map((product) => ({ url: `${siteUrl}/products/${product.kind}`, lastModified: updated, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
