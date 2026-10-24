import { CopyShortLinkScript } from "@/components/copy-short-link-script";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ChromeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      {/* Yalnızca chrome altındaki sayfalar CopyShortLinkButton kullanıyor
          (admin, /dashboard/links/[id]). Public Link Vitrini, public redirect
          ve auth sayfalarına bu script yüklenmesin. */}
      <CopyShortLinkScript />
    </>
  );
}
