import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("linkKisaltma");

export default async function LinkKisaltmaLandingPage() {
  return <SeoLandingRoute pageId="linkKisaltma" />;
}
