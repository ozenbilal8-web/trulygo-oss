import type { Metadata } from "next";
import Link from "next/link";
import { HomeProductTabs } from "@/components/home-product-tabs";
import { PublicUtmBuilder } from "@/components/public-utm-builder";
import { getAuthStatus } from "@/lib/auth/session";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  PUBLIC_ROBOTS,
  SITE_NAME,
  SITE_URL,
  canonicalUrl,
  localizedAlternates,
  serializeJsonLd,
} from "@/lib/seo";

const HOME_DESCRIPTION =
  "Ücretsiz UTM bağlantısı oluştur; TrulyGo ile güvenli kısa link, QR kod, kanal takibi, Link Vitrini ve tıklama analizlerini tek panelden kolayca yönet.";
const HOME_ALTERNATES = localizedAlternates("/");

export const metadata: Metadata = {
  title: {
    absolute: DEFAULT_TITLE,
  },
  description: HOME_DESCRIPTION,
  robots: PUBLIC_ROBOTS,
  alternates: {
    languages: HOME_ALTERNATES.languages,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "tr_TR",
    url: canonicalUrl("/"),
    title: DEFAULT_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: canonicalUrl("/brand/trulygo-mark.svg"),  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "TrulyGo; kısa link, Link Vitrini, QR, UTM, analytics ve anket araçlarını güvenli, onaylı ve değiştirilemez link yapısıyla tek panelde sunar.",
    url: SITE_URL,
    inLanguage: "tr-TR",
  },
];

const heroHighlights = [
  "Veritabanına kaydedilmez",
  "Ücretsiz UTM oluşturma",
  "Tarayıcıda anında oluşturulur",
];

const workflowSteps = [
  {
    title: "Hedefini ve kampanyanı gir",
    description: "Hedef adresini, kaynağını, kanalını ve kampanya adını ekle.",
    icon: <LinkIcon />,
  },
  {
    title: "UTM bağlantını oluştur",
    description: "Takip edilebilir bağlantını üyelik olmadan anında hazırla.",
    icon: <ShareIcon />,
  },
  {
    title: "TrulyGo ile kısalt",
    description: "İstersen bağlantını mevcut güvenlik ve onay akışına gönder.",
    icon: <ShieldIcon />,
  },
  {
    title: "Kanal bazında ölç",
    description: "Kısa link, QR ve kanal performansını panelinden karşılaştır.",
    icon: <ChartIcon />,
  },
];

const trustFeatures = [
  {
    title: "Onay ve risk kontrolü",
    description:
      "Kısa link talepleri onay akışına alınır. Yapılandırılmışsa otomatik teknik kontroller ve Google Web Risk kullanılır.",
    icon: <ShieldIcon />,
  },
  {
    title: "Gerektiğinde admin incelemesi",
    description:
      "Otomatik onaylanmayan, kontrolü tamamlanamayan veya şüpheli bulunan talepler admin incelemesine bırakılır.",
    icon: <UserIcon />,
  },
  {
    title: "Onaylanan hedef değiştirilemez",
    description:
      "Onaylanan hedef adres sonradan sessizce başka bir adrese çevrilemez.",
    icon: <LockIcon />,
  },
  {
    title: "Kanal ve tıklama analizi",
    description:
      "Kısa link, QR ve kanal paylaşımlarının performansı panelde karşılaştırılır.",
    icon: <ChartIcon />,
  },
];

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.54.54l2.1-2.1a5 5 0 0 0-7.07-7.07l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2.1 2.1a5 5 0 0 0 7.07 7.07l1.2-1.2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.6 6.8-4.2M8.6 13.4l6.8 4.2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </svg>
  );
}

export default async function Home() {
  const auth = await getAuthStatus();
  const productCtas = auth.isAuthenticated
    ? {
        linkVitrine: "/dashboard/link-vitrini/new",
        shortLink: "/dashboard",
        survey: "/dashboard/signal/new",
      }
    : {
        linkVitrine: "/register",
        shortLink: "/register",
        survey: "/register",
      };

  return (
    <main className="overflow-x-clip bg-[#020812] text-white">
      {/* React hoists this into <head>; unlike Next's root URL resolver, it preserves the explicit slash. */}
      <link href={HOME_ALTERNATES.canonical} rel="canonical" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(JSON_LD) }}
      />

      <section className="relative isolate overflow-hidden border-b border-white/10 px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(73,181,106,0.22),transparent_32rem),radial-gradient(circle_at_82%_20%,rgba(92,188,205,0.13),transparent_30rem),radial-gradient(circle_at_18%_18%,rgba(26,126,123,0.14),transparent_24rem),linear-gradient(135deg,#020812_0%,#06172c_48%,#05261f_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(221,248,232,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(221,248,232,0.04)_1px,transparent_1px),radial-gradient(circle_at_center,rgba(255,255,255,0.035)_1px,transparent_1.5px)] bg-[size:64px_64px,64px_64px,18px_18px] [mask-image:radial-gradient(circle_at_50%_34%,#000_0%,rgba(0,0,0,0.72)_46%,transparent_78%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-[-12%] bottom-0 -z-10 h-40 bg-[radial-gradient(ellipse_at_50%_100%,rgba(73,181,106,0.22),transparent_62%),linear-gradient(90deg,rgba(73,181,106,0.12),rgba(8,41,35,0.18))] [clip-path:polygon(0_46%,100%_18%,100%_100%,0_100%)]"
        />
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[32rem] min-w-[64rem] opacity-30"
          preserveAspectRatio="none"
          viewBox="0 0 700 150"
        >
          <defs>
            <linearGradient id="homeHeroFlowGreen" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(73,181,106,0)" />
              <stop offset="50%" stopColor="rgba(73,181,106,0.45)" />
              <stop offset="100%" stopColor="rgba(73,181,106,0)" />
            </linearGradient>
            <linearGradient id="homeHeroFlowBlue" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(120,180,230,0)" />
              <stop offset="55%" stopColor="rgba(120,180,230,0.26)" />
              <stop offset="100%" stopColor="rgba(120,180,230,0)" />
            </linearGradient>
          </defs>
          <path
            d="M -20 110 C 160 110, 260 30, 460 30 S 700 110, 740 110"
            fill="none"
            stroke="url(#homeHeroFlowGreen)"
            strokeWidth="1"
          />
          <path
            d="M -20 70 C 140 70, 240 130, 460 130 S 700 50, 740 50"
            fill="none"
            stroke="url(#homeHeroFlowBlue)"
            strokeWidth="1"
          />
        </svg>

        <div className="mx-auto flex max-w-7xl flex-col items-center pt-6 text-center sm:pt-8">
          <h1 className="max-w-7xl text-5xl font-black leading-[0.98] tracking-[-0.015em] text-white sm:text-7xl">
            UTM’li Link Oluştur, {" "}
            <span className="bg-[linear-gradient(110deg,#ffffff_0%,#ddf8e8_48%,#67d98f_100%)] bg-clip-text text-transparent">
              Kısalt ve Ölç
            </span>
          </h1>
          <p className="mt-6 max-w-4xl text-base font-medium leading-8 text-white/78 sm:text-lg">
            Ücretsiz UTM bağlantını oluştur. TrulyGo ile kısalt, QR koda
            dönüştür, kanal bazında ölç ve Link Vitrini’nde paylaş.
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link className="btn btn-primary" href="#utm-link-olusturucu">
              UTM oluştur
            </Link>
            <Link className="btn btn-ghost-dark" href="#nasil-calisir">
              TrulyGo nasıl çalışır?
            </Link>
          </div>
          <ul className="mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
            {heroHighlights.map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/14 bg-white/[0.05] px-3.5 py-2 text-sm font-semibold text-white/74 backdrop-blur"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PublicUtmBuilder isAuthenticated={auth.isAuthenticated} />

      <section
        id="guvenlik"
        className="relative border-y border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-[#67d98f]">
              Güvenlik ve onay
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.012em] text-white sm:text-5xl">
              Kısalttığın bağlantı kontrollü bir akıştan geçer.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/72 sm:text-lg">
              Public araç yalnız normal UTM bağlantını tarayıcıda oluşturur.
              TrulyGo ile kısaltmayı seçtiğinde mevcut risk kontrolü, onay,
              değişmez hedef ve ölçüm akışı aynen devam eder.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {trustFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-white/12 bg-[#08182d]/72 p-5 shadow-[0_18px_44px_rgba(2,8,18,0.26)]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#67d98f]/22 bg-[#67d98f]/10 text-[#97efb5] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]">
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/66">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HomeProductTabs ctas={productCtas} />

      <section id="nasil-calisir" className="section-anchor relative px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-base font-bold uppercase text-white">
            NASIL ÇALIŞIR?
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="contents">
                <article className="relative grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-white/14 bg-white/[0.045] p-5 shadow-[0_18px_44px_rgba(2,8,18,0.32)]">
                  <span className="absolute left-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(180deg,#67d98f,#22b963)] text-sm font-black text-[#06120b] shadow-[0_0_22px_rgba(103,217,143,0.38)]">
                    {index + 1}
                  </span>
                  <span className="mt-8 grid h-11 w-11 place-items-center text-white/88 [&_svg]:h-8 [&_svg]:w-8 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]">
                    {step.icon}
                  </span>
                  <div className="min-w-0 pt-5">
                    <h3 className="text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/66">
                      {step.description}
                    </p>
                  </div>
                </article>
                {index < workflowSteps.length - 1 ? (
                  <span className="hidden items-center justify-center text-[#67d98f] lg:flex [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2">
                    <ArrowRightIcon />
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-[#67d98f]/22 bg-[linear-gradient(135deg,rgba(103,217,143,0.14),rgba(255,255,255,0.045)_42%,rgba(35,121,145,0.12))] p-6 shadow-[0_26px_70px_rgba(2,8,18,0.42)] sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase text-[#bdf5cf]">
              TrulyGo ile başla
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.012em] text-white sm:text-5xl">
              Link vitrini, kısa link ve anketini tek panelden yönet.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/72 sm:text-lg">
              Onaylı link yapısı, UTM, QR ve analytics ile paylaşım yüzeyini
              daha düzenli, güvenli ve ölçülebilir hale getir.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
            {auth.isAuthenticated ? (
              <Link href="/dashboard" className="btn btn-primary">
                Panelime git
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary">
                  Hesap Oluştur
                </Link>
                <Link href="/login" className="btn btn-ghost-dark">
                  Giriş Yap
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
