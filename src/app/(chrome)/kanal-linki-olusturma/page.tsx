import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("kanalLinkiOlusturma");

export default async function KanalLinkiOlusturmaLandingPage() {
  return <SeoLandingRoute pageId="kanalLinkiOlusturma" />;
}
