import { LinkVitrineDiscovery } from "@/components/link-vitrine-discovery";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { getAuthStatus } from "@/lib/auth/session";
import { getRecentPublicLinkVitrines } from "@/lib/link-vitrines";
import { createSeoLandingMetadata, seoLandingPages } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("linkVitrini");

export default async function LinkVitriniLandingPage() {
  const [auth, vitrines] = await Promise.all([
    getAuthStatus(),
    getRecentPublicLinkVitrines(6),
  ]);

  return (
    <SeoLandingPage
      page={seoLandingPages.linkVitrini}
      isAuthenticated={auth.isAuthenticated}
      discovery={<LinkVitrineDiscovery vitrines={vitrines} />}
    />
  );
}
