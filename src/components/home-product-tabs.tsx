import Link from "next/link";

type ProductId = "vitrine" | "short" | "survey";

type HomeProductTabsProps = {
  ctas: {
    linkVitrine: string;
    shortLink: string;
    survey: string;
  };
};

type ProductCopy = {
  id: ProductId;
  tabLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

const vitrineLinks = [
  {
    label: "Instagram",
    host: "instagram.com/ornek",
  },
  {
    label: "YouTube",
    host: "youtube.com/@ornek",
  },
  {
    label: "Web sitesi",
    host: "ornek.com",
  },
];

const campaignLinks = [
  ["Ana link", "example.invalid/mayis-kampanyası"],
  ["Instagram", "example.invalid/kampanya-mayis-ig"],
  ["WhatsApp", "example.invalid/kampanya-mayis-wa"],
  ["QR", "example.invalid/kampanya-mayis-qr"],
];

const surveyOptions = [
  { label: "Hazır sistem fırsatları", value: "38%" },
  { label: "Oyuncu ekipmanları", value: "26%" },
  { label: "Monitör kampanyaları", value: "21%" },
  { label: "Bileşen indirimleri", value: "15%" },
];

function TabIcon({ id }: { id: ProductId }) {
  if (id === "short") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M10 13a5 5 0 0 0 7.54.54l2.1-2.1a5 5 0 0 0-7.07-7.07l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-2.1 2.1a5 5 0 0 0 7.07 7.07l1.2-1.2" />
      </svg>
    );
  }

  if (id === "survey") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6 20V10" />
        <path d="M12 20V4" />
        <path d="M18 20v-7" />
        <path d="M4 20h16" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.54.54l2.1-2.1a5 5 0 0 0-7.07-7.07l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2.1 2.1a5 5 0 0 0 7.07 7.07l1.2-1.2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.4 2.8 2.4 15.2 0 18" />
      <path d="M12 3c-2.4 2.8-2.4 15.2 0 18" />
    </svg>
  );
}

function ProductButton({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "primary" | "secondary";
}) {
  return (
    <Link
      className={`btn ${tone === "primary" ? "btn-primary" : "btn-ghost-dark"}`}
      href={href}
    >
      {label}
      {tone === "primary" ? (
        <span className="grid h-4 w-4 place-items-center [&_svg]:h-4 [&_svg]:w-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2">
          <ArrowIcon />
        </span>
      ) : (
        <span className="grid h-4 w-4 place-items-center [&_svg]:h-4 [&_svg]:w-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2">
          <ExternalIcon />
        </span>
      )}
    </Link>
  );
}

function ProductMockup({ productId }: { productId: ProductId }) {
  if (productId === "short") {
    return <ShortLinkMockup />;
  }

  if (productId === "survey") {
    return <SurveyMockup />;
  }

  return <VitrineMockup />;
}

function ProductPanel({ product }: { product: ProductCopy }) {
  return (
    <div
      className="home-product-panel grid gap-10 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:items-center lg:p-11"
      data-product-panel={product.id}
      id={`home-product-panel-${product.id}`}
    >
      <div>
        <p className="text-sm font-bold uppercase text-[#67d98f]">
          {product.eyebrow}
        </p>
        <h3 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {product.title}
        </h3>
        <p className="mt-5 text-base leading-7 text-white/72">
          {product.description}
        </p>
        <ul className="mt-7 grid gap-3 text-sm leading-6 text-white/72">
          {product.bullets.map((bullet) => (
            <li className="flex gap-3" key={bullet}>
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#67d98f]/38 bg-[#67d98f]/10 text-[#87eba9] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">
                <CheckIcon />
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ProductButton
            href={product.primaryHref}
            label={product.primaryLabel}
            tone="primary"
          />
          <ProductButton
            href={product.secondaryHref}
            label={product.secondaryLabel}
            tone="secondary"
          />
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(135deg,rgba(103,217,143,0.13),rgba(35,121,145,0.08),transparent_72%)]"
        />
        <div className="relative">
          <p className="mb-3 text-center text-sm font-semibold text-[#bdf5cf]">
            Temsili veriler
          </p>
          <ProductMockup productId={product.id} />
        </div>
      </div>
    </div>
  );
}

function VitrineMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-lg border border-white/14 bg-[#07172c]/86 p-5 shadow-[0_28px_70px_rgba(2,8,18,0.45)]">
      <div className="h-16 rounded-lg bg-[linear-gradient(135deg,#0c3a68_0%,#1c8b54_58%,#67d98f_100%)]" />
      <div className="flex items-end gap-4 px-1">
        <span className="-mt-5 grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-[#07172c] bg-[linear-gradient(135deg,#1f8f55,#70e79b)] text-xl font-black text-[#07130d]">
          AY
        </span>
        <div className="min-w-0 pt-3">
          <p className="flex min-w-0 items-center gap-2 text-base font-bold text-white">
            <span className="truncate">Ahmet Yılmaz</span>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#67d98f] text-xs text-[#07130d]">
              ✓
            </span>
          </p>
          <p className="truncate text-xs font-semibold text-white/58">
            @ahmety · example.invalid/v/ahmety
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-white/72">
        Kampanya, içerik ve sosyal hesaplarımı bu tek adresten paylaşıyorum.
      </p>
      <div className="mt-5 grid gap-2.5">
        {vitrineLinks.map((link) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-white/12 bg-white/[0.055] px-3.5 py-3"
            key={link.label}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#67d98f]/10 text-[#aaf3c1] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]">
              <GlobeIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {link.label}
              </span>
              <span className="block truncate text-xs text-white/50">
                {link.host}
              </span>
            </span>
            <span className="grid h-5 w-5 place-items-center text-white/62 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2">
              <ArrowIcon />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/12 bg-white/[0.035] px-4 py-3 text-xs font-bold uppercase text-white/58">
        <span>TRULYGO İLE OLUŞTURULDU</span>
        <span className="inline-flex items-center gap-2 text-[#67d98f]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          QR AKTİF
        </span>
      </div>
    </div>
  );
}

function ShortLinkMockup() {
  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-white/14 bg-[#07172c]/86 p-5 shadow-[0_28px_70px_rgba(2,8,18,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#67d98f]">Kampanya</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Mayıs Kampanyası
          </h3>
        </div>
        <span className="rounded-full border border-[#67d98f]/28 bg-[#67d98f]/10 px-3 py-1.5 text-xs font-bold text-[#bdf5cf]">
          Onaylandı
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-[#67d98f]/22 bg-[#67d98f]/10 p-4">
        <p className="text-xs font-bold uppercase text-[#bdf5cf]">
          Bitly’den farkı
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white">
          Onaylanan hedef adres sonradan değiştirilemez.
        </p>
      </div>

      <div className="mt-5 grid gap-2.5">
        {campaignLinks.map(([label, url]) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-white/12 bg-white/[0.055] px-3.5 py-3"
            key={label}
          >
            <span className="text-sm font-semibold text-white/72">{label}</span>
            <span className="min-w-0 truncate font-mono text-xs font-bold text-[#dff8e8]">
              {url}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          ["Toplam", "12.4K"],
          ["Instagram", "48%"],
          ["QR", "19%"],
        ].map(([label, value]) => (
          <div
            className="rounded-lg border border-white/12 bg-white/[0.045] p-3 text-center"
            key={label}
          >
            <span className="block text-xs text-white/48">{label}</span>
            <strong className="mt-1 block text-lg text-white">{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurveyMockup() {
  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-white/14 bg-[#07172c]/86 p-5 shadow-[0_28px_70px_rgba(2,8,18,0.45)]">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full border border-[#67d98f]/28 bg-[#67d98f]/10 px-3 py-1.5 text-xs font-bold text-[#bdf5cf]">
          Signal anketi
        </span>
        <span className="text-xs font-semibold text-white/50">248 oy</span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold leading-tight text-white">
        Yeni kampanyada en çok ne görmek istersin?
      </h3>
      <div className="mt-5 grid gap-3">
        {surveyOptions.map((option) => (
          <div
            className="overflow-hidden rounded-lg border border-white/12 bg-white/[0.045]"
            key={option.label}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 text-sm font-semibold text-white">
                {option.label}
              </span>
              <span className="font-mono text-sm font-black text-[#67d98f]">
                {option.value}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="block h-1 bg-[linear-gradient(90deg,#67d98f,#57bfd5)]"
              style={{ width: option.value }}
            />
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/12 bg-white/[0.045] p-3">
          <span className="block text-xs text-white/48">Sonuç</span>
          <strong className="mt-1 block text-sm text-white">Oy verene görünür</strong>
        </div>
        <div className="rounded-lg border border-white/12 bg-white/[0.045] p-3">
          <span className="block text-xs text-white/48">Vitrin</span>
          <strong className="mt-1 block text-sm text-white">Kart olarak aktif</strong>
        </div>
      </div>
    </div>
  );
}

export function HomeProductTabs({ ctas }: HomeProductTabsProps) {
  const products: ProductCopy[] = [
    {
      id: "short",
      tabLabel: "Kısa Link",
      eyebrow: "KISA LİNK VE ANALİZ",
      title: "Kampanya linklerini güvenle kısalt ve ölç.",
      description:
        "UTM bağlantını mevcut onay akışıyla kısalt, kanallara göre paylaş, QR ve tıklama analiziyle performansı ölç. Onaylanan hedef adres sonradan değiştirilemez.",
      bullets: [
        "Onaylı ve güvenlik kontrolünden geçen kısa linkler.",
        "Instagram, WhatsApp, YouTube, E-posta ve QR için kanal linkleri.",
        "UTM destekli yönlendirme ile Google Analytics takibi.",
        "Tıklama, kanal ve günlük performans analizi.",
      ],
      primaryLabel: "Kısa Link Oluştur",
      primaryHref: ctas.shortLink,
      secondaryLabel: "Nasıl Çalışır?",
      secondaryHref: "#nasil-calisir",
    },
    {
      id: "vitrine",
      tabLabel: "Link Vitrini",
      eyebrow: "LINK VİTRİNİ",
      title: "Tek public profilde tüm bağlantılarını topla.",
      description:
        "Banner, avatar, sosyal hesaplar ve özel link butonlarıyla kendi vitrini oluştur. Tüm bağlantılarını tek adreste paylaş.",
      bullets: [
        "Banner ve avatar yükle, blur destekli renkli arka plan.",
        "Instagram, YouTube, X, TikTok, Discord, WhatsApp ve daha fazlası.",
        "Her vitrin için ayrı QR kod, PNG/SVG indirme.",
        "Yayında / Taslak modu, anında güncelleme.",
      ],
      primaryLabel: "Link Vitrini Oluştur",
      primaryHref: ctas.linkVitrine,
      secondaryLabel: "Link Vitrini’ni incele",
      secondaryHref: "/link-vitrini",
    },
    {
      id: "survey",
      tabLabel: "Anket Oluşturucu",
      eyebrow: "ANKET OLUŞTURUCU",
      title: "Takipçinden hızlı geri bildirim al.",
      description:
        "Çok sorulu anketler oluştur, şartlı takip soruları ekle ve sonuçları ister gizli ister görünür paylaş. Anket linkini tek tıkla yayınla.",
      bullets: [
        "Çok sorulu anket oluşturma.",
        "Cevaba göre soru ekleme.",
        "Sonuçları oy verenlere göster veya gizle.",
        "Link Vitrini içinde Anket kartı olarak paylaşma.",
      ],
      primaryLabel: "Anket Oluştur",
      primaryHref: ctas.survey,
      secondaryLabel: "Anket'i İncele",
      secondaryHref: "/anket-olusturucu",
    },
  ];

  return (
    <section
      aria-labelledby="home-products-title"
      className="relative isolate px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8"
      id="urunler"
    >
      <style>
        {`
          .home-product-tabs-shell .home-product-panels {
            display: grid;
          }

          .home-product-tabs-shell .home-product-panel {
            display: none;
            grid-area: 1 / 1;
            pointer-events: none;
            visibility: hidden;
          }

          .home-product-tabs-shell #home-product-control-vitrine:checked ~ .home-product-panels [data-product-panel="vitrine"],
          .home-product-tabs-shell #home-product-control-short:checked ~ .home-product-panels [data-product-panel="short"],
          .home-product-tabs-shell #home-product-control-survey:checked ~ .home-product-panels [data-product-panel="survey"] {
            display: grid !important;
            pointer-events: auto !important;
            visibility: visible !important;
          }

          .home-product-tabs-shell #home-product-control-vitrine:checked ~ .home-product-tablist [data-product-tab="vitrine"],
          .home-product-tabs-shell #home-product-control-short:checked ~ .home-product-tablist [data-product-tab="short"],
          .home-product-tabs-shell #home-product-control-survey:checked ~ .home-product-tablist [data-product-tab="survey"] {
            background: rgba(103, 217, 143, 0.12);
            border-color: rgba(103, 217, 143, 0.56);
            box-shadow: 0 0 24px rgba(103, 217, 143, 0.18);
            color: #9ff0bb;
          }

          .home-product-tabs-shell #home-product-control-vitrine:focus-visible ~ .home-product-tablist [data-product-tab="vitrine"],
          .home-product-tabs-shell #home-product-control-short:focus-visible ~ .home-product-tablist [data-product-tab="short"],
          .home-product-tabs-shell #home-product-control-survey:focus-visible ~ .home-product-tablist [data-product-tab="survey"] {
            outline: 2px solid rgba(103, 217, 143, 0.72);
            outline-offset: 3px;
          }

          @media (prefers-reduced-motion: reduce) {
            .home-product-tabs-shell .home-product-panel {
              transition: none;
            }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(73,181,106,0.12),transparent_30rem),radial-gradient(circle_at_82%_42%,rgba(92,188,205,0.08),transparent_25rem),linear-gradient(180deg,rgba(6,23,44,0.52),rgba(2,8,18,0.88))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-px bg-[linear-gradient(90deg,transparent,rgba(103,217,143,0.5),transparent)]"
      />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-bold uppercase text-[#67d98f]">
            TÜM ÖZELLİKLER
          </p>
          <h2
            className="mt-4 text-4xl font-black leading-tight tracking-[-0.012em] text-white sm:text-5xl lg:whitespace-nowrap lg:text-6xl"
            id="home-products-title"
          >
            Tek linkte{" "}
            <span className="bg-[linear-gradient(110deg,#ffffff_0%,#ddf8e8_46%,#67d98f_100%)] bg-clip-text text-transparent">
              tüm ihtiyaçların.
            </span>
          </h2>
          <p className="mt-4 text-base leading-7 text-white/68 sm:text-lg">
            Link vitrini, kısa link ve anket araçlarını tek platformda kullan.
          </p>
        </div>

        <div className="home-product-tabs-shell relative mt-9 overflow-hidden rounded-lg border border-[#9ee6b5]/18 bg-[linear-gradient(180deg,rgba(10,31,57,0.86),rgba(3,12,25,0.78))] shadow-[0_26px_76px_rgba(2,8,18,0.42)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(103,217,143,0.13),transparent_24rem),radial-gradient(circle_at_82%_20%,rgba(87,191,213,0.08),transparent_24rem)]"
          />
          {products.map((product, index) => (
            <input
              className="sr-only"
              defaultChecked={index === 0}
              id={`home-product-control-${product.id}`}
              key={`${product.id}-control`}
              name="home-product-control"
              type="radio"
            />
          ))}
          <div
            aria-label="Ürün sekmeleri"
            className="home-product-tablist relative z-10 flex gap-2 overflow-x-auto border-b border-[#9ee6b5]/14 bg-white/[0.032] p-2 sm:grid sm:grid-cols-3 sm:overflow-visible"
          >
            {products.map((product) => (
              <label
                aria-controls={`home-product-panel-${product.id}`}
                className="group relative inline-flex min-h-14 min-w-[14rem] cursor-pointer select-none items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white/74 transition duration-200 hover:border-[#9ee6b5]/22 hover:bg-white/[0.055] hover:text-white sm:min-w-0"
                data-product-tab={product.id}
                htmlFor={`home-product-control-${product.id}`}
                id={`home-product-tab-${product.id}`}
                key={product.id}
              >
                <span className="grid h-5 w-5 place-items-center [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.9]">
                  <TabIcon id={product.id} />
                </span>
                {product.tabLabel}
              </label>
            ))}
          </div>

          <div className="home-product-panels relative z-10">
            {products.map((product) => (
              <ProductPanel key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
