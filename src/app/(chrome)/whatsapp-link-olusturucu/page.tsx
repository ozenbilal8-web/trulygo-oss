import { SeoLandingRoute } from "@/components/seo-landing-page";
import { createSeoLandingMetadata } from "@/lib/seo-landing-pages";

export const metadata = createSeoLandingMetadata("whatsappLinkOlusturucu");

export default async function WhatsappLinkOlusturucuLandingPage() {
  return <SeoLandingRoute pageId="whatsappLinkOlusturucu" />;
}
