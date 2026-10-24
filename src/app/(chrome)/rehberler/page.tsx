import type { Metadata } from "next";
import { GuideIndex } from "@/components/guides/guide-index";
import { PUBLIC_ROBOTS, SITE_NAME, canonicalUrl, localizedAlternates } from "@/lib/seo";

const title = "TrulyGo Rehberler | UTM, Link Takibi ve Anket";
const description =
  "UTM bağlantıları, kanal takibi, kısa linkler, Link Vitrini ve çevrim içi anketler için uygulanabilir, kaynak doğruluğu gözeten Türkçe rehberler.";
const image = "/rehberler/og-image";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: null,
  robots: PUBLIC_ROBOTS,
  alternates: localizedAlternates("/rehberler"),
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    url: canonicalUrl("/rehberler"),
    title,
    description,
    images: [{ url: image, width: 1200, height: 630, alt: "TrulyGo Rehberler" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: image, width: 1200, height: 630, alt: "TrulyGo Rehberler" }],
  },
};

export default function GuidesPage() {
  return <GuideIndex />;
}
