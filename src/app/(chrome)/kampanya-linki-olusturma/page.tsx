import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("kampanyaLinkiOlusturma");

export default async function KampanyaLinkiOlusturmaLandingPage() {
  return <SeoLandingRoute pageId="kampanyaLinkiOlusturma" />;
}
