import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { seoFooterLinks } from "@/lib/seo-landing-pages";

const legalFooterLinks = [
  { href: "/privacy", label: "KVKK Aydınlatma Metni" },
  { href: "/acik-riza-metni", label: "Açık Rıza Metni" },
  { href: "/kvkk-basvurusu", label: "KVKK Başvurusu" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/terms", label: "Kullanım Şartları" },
];

const guideFooterLinks = [
  { href: "/rehberler", label: "Tüm Rehberler" },
  { href: "/rehberler/utm-nedir", label: "UTM Nedir?" },
  { href: "/rehberler/link-vitrini-nedir", label: "Link Vitrini Nedir?" },
  { href: "/rehberler/online-anket-nasil-hazirlanir", label: "Online Anket Rehberi" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(221,248,232,0.12)] bg-[linear-gradient(180deg,var(--color-navy)_0%,var(--color-navy-deep)_100%)] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(15rem,1.2fr)_2fr] lg:px-8">
        <div className="min-w-0">
          <Link href="/" className="micro-link inline-flex items-center gap-2.5" aria-label="TrulyGo ana sayfa">
            <Image
              src="/brand/trulygo-mark.svg"
              alt="TrulyGo"
              width={32}
              height={24}
              className="h-7 w-8 object-contain"
              unoptimized
            />
            <span className="text-base font-semibold">TrulyGo</span>
          </Link>
          <p className="mt-1 max-w-xl text-sm text-white/72">
            Onaylı, değiştirilemez ve takip edilebilir kısa link altyapısı.
          </p>

        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          <nav
            aria-labelledby="footer-products-title"
            className="min-w-0 text-sm leading-6 text-white/66"
          >
            <h2 id="footer-products-title" className="text-sm font-semibold text-white">Ürünler</h2>
            <ul className="mt-3 space-y-2">
              {seoFooterLinks.map((link) => (
                <li key={link.path}>
                  <Link href={link.path} className="micro-link hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav
            aria-labelledby="footer-resources-title"
            className="min-w-0 text-sm leading-6 text-white/66"
          >
            <h2 id="footer-resources-title" className="text-sm font-semibold text-white">Kaynaklar</h2>
            <ul className="mt-3 space-y-2">
              {guideFooterLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="micro-link hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav
            aria-labelledby="footer-legal-title"
            className="min-w-0 text-sm leading-6 text-white/66"
          >
            <h2 id="footer-legal-title" className="text-sm font-semibold text-white">Yasal</h2>
            <ul className="mt-3 space-y-2">
              {legalFooterLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="micro-link hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookiePreferencesButton />
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-white/46 sm:px-6 lg:px-8 lg:text-left">
          © {new Date().getUTCFullYear()} TrulyGo
        </p>
      </div>
    </footer>
  );
}
