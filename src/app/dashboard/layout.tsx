import { CopyShortLinkScript } from "@/components/copy-short-link-script";
import { SiteHeader } from "@/components/site-header";

// Bu layout `/dashboard` ve `/dashboard/link-vitrini/*` rotalarını kapsar
// (`(chrome)` altındaki `/dashboard/links/[id]` rotası buraya değil, chrome
// layout'una düşer — CopyShortLinkScript orada ayrıca yüklenir). Public
// sayfalar (`/v/[handle]`, `/[slug]`, auth ekranları) bu script'i almaz.
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
      <CopyShortLinkScript />
    </>
  );
}
