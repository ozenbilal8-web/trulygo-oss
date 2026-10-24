import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("qrKodOlusturucu");

export default async function QrKodOlusturucuLandingPage() {
  return <SeoLandingRoute pageId="qrKodOlusturucu" />;
}
