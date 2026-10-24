import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("bitlyAlternatifi");

export default async function BitlyAlternatifiLandingPage() {
  return <SeoLandingRoute pageId="bitlyAlternatifi" />;
}
