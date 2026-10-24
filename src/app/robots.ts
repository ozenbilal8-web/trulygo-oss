import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { seoLandingSitemapEntries } from "@/lib/seo-landing-pages";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/privacy",
        "/terms",
        "/cerez-politikasi",
        "/v/",
        ...seoLandingSitemapEntries.map((entry) => entry.path),
      ],
      disallow: [
        "/api",
        "/admin",
        "/dashboard",
        "/dashboard/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
