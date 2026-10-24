import type { MetadataRoute } from "next";
import { getPublicLinkVitrineSitemapEntries } from "@/lib/link-vitrines";
import { SITE_URL, canonicalUrl } from "@/lib/seo";
import { seoLandingSitemapEntries } from "@/lib/seo-landing-pages";
import { appendOptionalSitemapEntries } from "@/lib/sitemap-fallback";
import { publishedGuides } from "@/content/guides";

// Sitemap'i ISR ile 1 saatte bir yeniden üret. Public Link Vitrini ve SEO
// landing listesi sık değişmediği için her bot isteğinde Supabase'e gitmek
// gereksiz; yeni vitrine yayınlandığında en geç 1 saat içinde sitemap'e düşer.
export const revalidate = 3600;

function validLastModified(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guideEntries = publishedGuides.map((guide) => ({
    guide,
    lastModified: validLastModified(guide.dateModified),
  }));
  const validGuideDates = guideEntries
    .map(({ lastModified }) => lastModified)
    .filter((value): value is Date => value !== null);
  const guideIndexLastModified =
    validGuideDates.length > 0
      ? new Date(Math.max(...validGuideDates.map((date) => date.getTime())))
      : null;
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/privacy` },
    { url: `${SITE_URL}/acik-riza-metni` },
    { url: `${SITE_URL}/kvkk-basvurusu` },
    { url: `${SITE_URL}/terms` },
    { url: `${SITE_URL}/cerez-politikasi` },
    ...seoLandingSitemapEntries.map((entry) => ({
      url: canonicalUrl(entry.path),
    })),
    {
      url: canonicalUrl("/rehberler"),
      ...(guideIndexLastModified ? { lastModified: guideIndexLastModified } : {}),
    },
    ...guideEntries.map(({ guide, lastModified }) => ({
      url: canonicalUrl(`/rehberler/${guide.slug}`),
      ...(lastModified ? { lastModified } : {}),
    })),
  ];

  return appendOptionalSitemapEntries(staticEntries, async () => {
    const publicVitrines = await getPublicLinkVitrineSitemapEntries();

    return publicVitrines.map((vitrine) => {
      const lastModified = validLastModified(vitrine.updatedAt);

      return {
        url: canonicalUrl(`/v/${vitrine.handle}`),
        ...(lastModified ? { lastModified } : {}),
      };
    });
  });
}
