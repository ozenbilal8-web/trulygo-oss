import { PublicUtmBuilder } from "@/components/public-utm-builder";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { getAuthStatus } from "@/lib/auth/session";
import { createSeoLandingMetadata, seoLandingPages } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("utmLinkOlusturucu");

export default async function UtmLinkOlusturucuLandingPage() {
  const auth = await getAuthStatus();

  return (
    <SeoLandingPage
      afterHero={<PublicUtmBuilder isAuthenticated={auth.isAuthenticated} />}
      isAuthenticated={auth.isAuthenticated}
      page={seoLandingPages.utmLinkOlusturucu}
    />
  );
}
