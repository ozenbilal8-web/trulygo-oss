import { LinkVitrineNotificationEmailVerification } from "@/components/link-vitrine-notification-email-verification";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bildirim e-posta adresini doğrula | TrulyGo",
  description: "Link Vitrini bildirim e-posta adresinizi doğrulayın.",
  robots: NO_INDEX_ROBOTS,
  referrer: "no-referrer",
};

export default function LinkVitrineNotificationEmailVerificationPage() {
  return <LinkVitrineNotificationEmailVerification />;
}
