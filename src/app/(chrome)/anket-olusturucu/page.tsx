import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("signalAnketOlusturucu");

export default async function SignalAnketOlusturucuLandingPage() {
  return <SeoLandingRoute pageId="signalAnketOlusturucu" />;
}
