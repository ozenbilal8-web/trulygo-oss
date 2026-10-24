import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { reservedSlugs } from "../src/lib/slugs.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

async function loadSeoLandingConfig() {
  const configSource = source("src/lib/seo-landing-pages.ts")
    .replace(/^import type \{ Metadata \} from "next";\r?\n/m, "")
    .replace(
      /^import \{ DEFAULT_OG_IMAGE, PUBLIC_ROBOTS, SITE_NAME, canonicalUrl, localizedAlternates \} from "@\/lib\/seo";\r?\n/m,
      `const DEFAULT_OG_IMAGE = {};
const PUBLIC_ROBOTS = { index: true, follow: true };
const SITE_NAME = "TrulyGo";
const canonicalUrl = (pathname = "/") => new URL(pathname, "http://localhost:3000").toString();
const localizedAlternates = (pathname = "/") => {
  const canonical = canonicalUrl(pathname);
  return { canonical, languages: { tr: canonical } };
};
`,
    );

  const output = ts.transpileModule(configSource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function pageText(page) {
  const strings = [];

  function visit(value) {
    if (typeof value === "string") {
      strings.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  }

  visit(page);
  return strings.join("\n");
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function semanticDigest(page) {
  const contract = {
    metadataTitle: page.metadataTitle,
    metadataDescription: page.metadataDescription,
    title: page.title,
    sections: page.sections,
    related: page.related,
  };

  return createHash("sha256").update(JSON.stringify(canonicalize(contract))).digest("hex");
}

const {
  seoFooterLinks,
  seoLandingPages,
  seoLandingSitemapEntries,
  seoLandingStructuredData,
} = await loadSeoLandingConfig();

const corePageIds = [
  "linkKisaltma",
  "kampanyaLinkiOlusturma",
  "whatsappLinkOlusturucu",
  "qrKodOlusturucu",
  "bitlyAlternatifi",
];

const expectedContracts = {
  linkKisaltma: {
    path: "/link-kisaltma",
    footerOrder: 30,
    title: "Uzun Linkini Güvenli Bir Kısa Linke Dönüştür",
    metadataTitle: "Güvenli Link Kısaltma ve Tıklama Takibi | TrulyGo",
    metadataDescription:
      "Uzun bağlantını onaylı ve değiştirilemez hedef URL mantığıyla kısalt; UTM, kanal linkleri, QR ve tıklama analizini TrulyGo Panelim’de yönet.",
    related: [
      "utmLinkOlusturucu",
      "kanalLinkiOlusturma",
      "kampanyaLinkiOlusturma",
      "qrKodOlusturucu",
      "whatsappLinkOlusturucu",
      "bitlyAlternatifi",
    ],
    sectionTypes: ["prose", "steps", "example", "prose", "comparison", "scope", "scope", "faq"],
    sectionTitles: [
      "Link kısaltma ne yapar?",
      "TrulyGo’da kısa link nasıl oluşturulur?",
      "Uzun UTM’li hedeften kısa paylaşım adresine",
      "Onaylanan hedef URL neden değiştirilemez?",
      "UTM’li hedef, ana kısa link ve kanal linki nasıl ilişkilidir?",
      "Kısa link tıklamalarında hangi veriler görülebilir?",
      "Kısa link verisi hangi sonuçları göstermez?",
      "Güvenli link kısaltma hakkında sık sorulan sorular",
    ],
    cta: {
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "Kısa link oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/utm-link-olusturucu",
      secondaryLabel: "Ücretsiz UTM linki oluştur",
    },
    visual: {
      statusLabel: "Onaylı",
      footerItems: ["Hedef", "Kısa Link", "Analiz"],
    },
  },
  kampanyaLinkiOlusturma: {
    path: "/kampanya-linki-olusturma",
    footerOrder: 80,
    title: "Kampanya Linkini Dağıtımdan Önce Doğru Planla",
    metadataTitle: "Kampanya Linki Planlama ve UTM İsimlendirme | TrulyGo",
    metadataDescription:
      "Kampanya adını, hedef URL’yi ve dağıtım planını tutarlı kurgula; ardından onaylı kısa link, UTM ve kanal bağlantılarıyla yayına hazırla.",
    related: [
      "utmLinkOlusturucu",
      "linkKisaltma",
      "kanalLinkiOlusturma",
      "whatsappLinkOlusturucu",
      "qrKodOlusturucu",
    ],
    sectionTypes: [
      "prose",
      "definition-list",
      "steps",
      "example",
      "comparison",
      "steps",
      "scope",
      "faq",
    ],
    sectionTitles: [
      "Kampanya linki planı nedir?",
      "Kampanya adı ve hedef URL nasıl birlikte kurgulanır?",
      "Yayından önce isimlendirme kontrol listesi",
      "Yaz lansmanı için tutarlı bir kampanya planı",
      "UTM linki, ana kısa link ve kanal linki aynı şey değildir",
      "Kampanya planını bağlantılara dönüştür",
      "Kampanya adı tek başına sonuç üretmez",
      "Kampanya linki planı hakkında sık sorulan sorular",
    ],
    cta: {
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "Kampanya linkini Panelim’de oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kanal-linki-olusturma",
      secondaryLabel: "Kanal dağıtımını planla",
    },
    visual: {
      statusLabel: "Planlama",
      footerItems: ["Hedef", "UTM", "Dağıtım"],
    },
  },
  whatsappLinkOlusturucu: {
    path: "/whatsapp-link-olusturucu",
    footerOrder: 60,
    title: "Hazır WhatsApp Linkini Kısalt ve Tıklamaları Takip Et",
    metadataTitle: "WhatsApp Link Kısaltma ve Tıklama Takibi | TrulyGo",
    metadataDescription:
      "Hazır WhatsApp veya wa.me bağlantın için kısa link talebi oluştur; onaylanan linkin tıklamalarını izle. Telefon numarasından wa.me bağlantısı üretilmez.",
    related: [
      "linkKisaltma",
      "kanalLinkiOlusturma",
      "qrKodOlusturucu",
      "utmLinkOlusturucu",
      "kampanyaLinkiOlusturma",
    ],
    sectionTypes: ["comparison", "prose", "steps", "definition-list", "example", "scope", "scope", "faq"],
    sectionTitles: [
      "TrulyGo WhatsApp bağlantısında ne yapar, ne yapmaz?",
      "Hangi WhatsApp bağlantısını kullanmalısın?",
      "Mevcut WhatsApp URL’sini kısa linke dönüştür",
      "Hedef kanal ile dağıtım kanalı aynı şey değildir",
      "Tek WhatsApp hedefini farklı yerlerde paylaş",
      "Hazır mesaj URL’sinde hassas bilgi kullanma",
      "Tıklama ile WhatsApp sonucu aynı şey değildir",
      "WhatsApp hedef bağlantıları hakkında sık sorulan sorular",
    ],
    cta: {
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "WhatsApp hedefini kısalt",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kanal-linki-olusturma",
      secondaryLabel: "Kanal linklerini incele",
    },
    visual: {
      statusLabel: "Mevcut URL",
      footerItems: ["Hedef", "Kanal", "Tıklama"],
    },
  },
  qrKodOlusturucu: {
    path: "/qr-kod-olusturucu",
    footerOrder: 50,
    title: "Kısa Linkini Markalı Bir QR Koda Dönüştür",
    metadataTitle: "QR Kod Oluşturma ve Takip Edilebilir Kısa Link | TrulyGo",
    metadataDescription:
      "Onaylı kısa linkin veya desteklenen TrulyGo adresin için markalı QR kod oluştur; doğrulanan renk, logo ve indirme seçenekleriyle paylaş, QR kanalından gelen tıklamaları izle.",
    related: [
      "linkKisaltma",
      "kanalLinkiOlusturma",
      "utmLinkOlusturucu",
      "whatsappLinkOlusturucu",
      "linkVitrini",
    ],
    sectionTypes: [
      "prose",
      "definition-list",
      "steps",
      "comparison",
      "scope",
      "steps",
      "comparison",
      "faq",
    ],
    sectionTitles: [
      "QR kod hangi TrulyGo adresine bağlanır?",
      "Koddan doğrulanan QR seçenekleri",
      "QR kodu oluşturup indirme adımları",
      "Kısa link, QR kanalı ve Link Vitrini QR’ı arasındaki fark",
      "Fiziksel tarama ile link tıklaması aynı veri değildir",
      "QR’ı yayınlamadan önce pratik kontrol listesi",
      "QR hangi paylaşım yüzeylerinde kullanılabilir?",
      "QR kod oluşturma hakkında sık sorulan sorular",
    ],
    cta: {
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "QR kodunu Panelim’de oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kanal-linki-olusturma",
      secondaryLabel: "QR kanal takibini incele",
    },
    visual: {
      statusLabel: "QR",
      footerItems: ["Özelleştir", "İndir", "Paylaş"],
    },
  },
  bitlyAlternatifi: {
    path: "/bitly-alternatifi",
    footerOrder: 70,
    title: "Bitly’ye Alternatif Güvenli Kısa Link Yönetimi",
    metadataTitle: "Bitly Alternatifi: Güvenli Kısa Link Yönetimi | TrulyGo",
    metadataDescription:
      "Onaylı ve değiştirilemez hedef URL yaklaşımı, UTM oluşturma, kanal linkleri, QR ve tıklama analiziyle TrulyGo’nun hangi kullanım senaryolarında alternatif olduğunu incele.",
    related: [
      "linkKisaltma",
      "utmLinkOlusturucu",
      "kanalLinkiOlusturma",
      "qrKodOlusturucu",
      "kampanyaLinkiOlusturma",
    ],
    sectionTypes: ["prose", "definition-list", "prose", "scope", "comparison", "scope", "steps", "faq"],
    sectionTitles: [
      "Bir Bitly alternatifi seçerken neyi değerlendirmelisin?",
      "Doğrulanmış kısa link yönetim modeli",
      "Değiştirilemez hedef URL ne anlama gelir?",
      "TrulyGo’da hangi bağlantı araçları bulunur?",
      "Hangi ihtiyaçlarda TrulyGo’yu değerlendirebilirsin?",
      "Hangi beklentileri ayrıca doğrulamalısın?",
      "Karar vermeden önce bu sırayı izle",
      "Bitly alternatifi hakkında sık sorulan sorular",
    ],
    cta: {
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "TrulyGo’da kısa link oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/link-kisaltma",
      secondaryLabel: "Link kısaltma yaklaşımını incele",
    },
    visual: {
      statusLabel: "Karşılaştırma",
      footerItems: ["Onay", "Kanal", "QR"],
    },
  },
};

test("the five core intent pages use flexible sections and preserve their public contracts", () => {
  const legacyKeys = ["purpose", "audience", "workflow", "scenarios", "advantages", "faqs"];
  const sectionSequences = [];

  for (const pageId of corePageIds) {
    const page = seoLandingPages[pageId];
    const expected = expectedContracts[pageId];

    assert.ok(Array.isArray(page.sections), `${pageId} must use flexible sections`);
    for (const legacyKey of legacyKeys) {
      assert.equal(Object.hasOwn(page, legacyKey), false, `${pageId} still has ${legacyKey}`);
    }

    for (const key of ["path", "footerOrder", "title", "metadataTitle", "metadataDescription"])
      assert.equal(page[key], expected[key], `${pageId}.${key} changed`);

    assert.deepEqual(page.related, expected.related, `${pageId}.related changed`);
    assert.deepEqual(
      page.sections.map(({ type, title }) => ({ type, title })),
      expected.sectionTypes.map((type, index) => ({ type, title: expected.sectionTitles[index] })),
      `${pageId} section order changed`,
    );
    assert.deepEqual(
      {
        authHref: page.cta.authHref,
        guestHref: page.cta.guestHref,
        authLabel: page.cta.authLabel,
        guestLabel: page.cta.guestLabel,
        secondaryHref: page.cta.secondaryHref,
        secondaryLabel: page.cta.secondaryLabel,
      },
      expected.cta,
    );
    assert.equal(page.visual.statusLabel, expected.visual.statusLabel);
    assert.deepEqual(page.visual.footerItems, expected.visual.footerItems);

    sectionSequences.push(
      JSON.stringify(expected.sectionTypes.map((type, index) => [type, expected.sectionTitles[index]])),
    );
  }

  assert.equal(new Set(sectionSequences).size, corePageIds.length, "core page section sequences repeat");
});

test("H1, metadata title, and metadata description values are unique across all landings", () => {
  for (const [field, label] of [
    ["title", "H1"],
    ["metadataTitle", "metadata title"],
    ["metadataDescription", "metadata description"],
  ]) {
    const values = Object.values(seoLandingPages).map((page) => page[field]);
    assert.equal(new Set(values).size, values.length, `${label} values must be unique`);
  }
});

test("link shortening copy explains approval, immutable targets, account scope, and analytics limits", () => {
  const text = pageText(seoLandingPages.linkKisaltma);

  assert.match(text, /güvenlik ve onay/i);
  assert.match(text, /onaylanan hedef URL[^\n]*değiştirilemez/i);
  assert.match(text, /farklı bir hedef[^\n]*yeni bir (?:kısa )?link/i);
  assert.match(text, /kısa link oluşturmak için hesap gerekir/i);
  assert.match(text, /anonim bir kısa link oluşturucu değildir/i);
  assert.match(text, /public UTM aracı[^\n]*kısa link (?:üretmez|oluşturmaz)/i);
  assert.match(text, /toplam tıklama/i);
  assert.match(text, /bugünkü tıklama/i);
  assert.match(text, /son 7 gün/i);
  assert.match(text, /günlük ve saatlik/i);
  assert.match(text, /kanal, cihaz ve işletim sistemi/i);
  assert.match(text, /yaklaşık konum/i);
  assert.match(text, /satış, gelir, lead veya conversion[^\n]*ölçmez/i);
  assert.doesNotMatch(text, /(?:üyelik|hesap) gerektirmez[^\n]*kısa link/i);
});

test("campaign copy separates planning from the channel preset and campaign-product concepts", () => {
  const text = pageText(seoLandingPages.kampanyaLinkiOlusturma);

  assert.match(text, /bağımsız bir kampanya[^\n]*(?:modülü bulunmaz|anlamına gelmez)/i);
  assert.match(text, /campaign_name[^\n]*ana (?:kısa )?link/i);
  assert.match(text, /utm_campaign/i);
  assert.match(text, /kanal linkinde değer URL dostu biçime normalleştirilebilir/i);
  assert.match(text, /kampanya adı tek başına veri üretmez/i);
  assert.match(text, /bütçe, reklam yönetimi, hedef kitle yönetimi ve medya planlama[^\n]*parçası değildir/i);
  assert.doesNotMatch(text, /Preset kanal matrisi/i);
  assert.doesNotMatch(text, /\bSuffix\b/i);
});

test("WhatsApp copy describes an existing target without claiming message or outcome access", () => {
  const text = pageText(seoLandingPages.whatsappLinkOlusturucu);

  assert.match(text, /telefon numarasından wa\.me (?:URL’si|linki|bağlantısı) (?:oluşturmaz|üretmez)/i);
  assert.match(text, /hazır WhatsApp veya wa\.me bağlantın için kısa link talebi/i);
  assert.match(text, /WhatsApp (?:mesajlarına|sohbetine|sohbet içeriğine) erişmez/i);
  assert.match(text, /sohbetin açıldığını[^\n]*mesajın gönderildiğini[^\n]*(?:doğrulamaz|kanıtlamaz)/i);
  assert.match(text, /mesaj, randevu, satış, lead veya conversion[^\n]*ölçülmez/i);
  assert.match(text, /gerçek kimliğini göstermez|kullanıcı kimliği elde edilmez/i);
  assert.doesNotMatch(text, /telefon numaranı gir[^\n]*WhatsApp link/i);
});

test("QR copy matches the verified QR implementation and separates scans from link clicks", () => {
  const page = seoLandingPages.qrKodOlusturucu;
  const text = pageText(page);
  const qrSource = source("src/components/qr-code-card.tsx");
  const colorsBlock = qrSource.match(/const QR_CODE_COLORS = \[([\s\S]*?)\] as const;/)?.[1] ?? "";

  assert.equal((colorsBlock.match(/value: "#[0-9A-F]{6}"/g) ?? []).length, 10);
  assert.match(qrSource, /ACCEPTED_LOGO_TYPES = new Set\(\["image\/png", "image\/jpeg", "image\/webp"\]\)/);
  assert.match(qrSource, /LOGO_MAX_FILE_SIZE_BYTES = 1024 \* 1024/);
  assert.match(qrSource, /MIN_RECOMMENDED_LOGO_SIZE = 512/);
  assert.match(qrSource, /EXPORT_QR_SIZE = 1024/);
  assert.match(qrSource, /SVG çıktısı logosuz oluşturulur/);

  assert.match(text, /10 hazır renk/i);
  assert.match(text, /PNG, JPG(?:\/JPEG)? veya WebP/i);
  assert.match(text, /1 MB/i);
  assert.match(text, /en az 512×512 px[^\n]*önerilir/i);
  assert.match(text, /1024×1024 PNG/i);
  assert.match(text, /SVG çıktısı logosuz/i);
  assert.match(text, /telefon kamerasının[^\n]*(?:fiziksel taramayı|QR’ı algılama hareketini)[^\n]*doğrudan saymaz/i);
  assert.match(text, /HTTP yönlendirmesi/i);
  assert.match(text, /yönlendirme isteği[^\n]*tıklama olarak kaydedilebilir/i);
  assert.match(text, /kamera[^\n]*URL’yi açmazsa[^\n]*kayıt oluşmayabilir/i);
  assert.match(text, /QR görseli tek başına analytics (?:verisi )?üretmez/i);
  assert.match(text, /profil yalnız vitrin yayınlandığında public olarak açılır/i);
  assert.match(text, /profil içeriği ve yayın durumu[^\n]*değişebilir/i);
  assert.equal(text.includes("tıklama/tarama performansı"), false);
  assert.doesNotMatch(text, /serbest (?:özel )?HEX[^\n]*(?:vardır|seçebilirsin)/i);
});

test("Bitly alternative copy avoids unsupported parity, superiority, pricing, and import claims", () => {
  const text = pageText(seoLandingPages.bitlyAlternatifi);

  assert.match(text, /bütün özelliklerini birebir sunduğunu iddia etmez/i);
  assert.match(text, /otomatik toplu Bitly içe aktarma akışı bulunmuyor/i);
  assert.match(text, /orijinal hedef URL’lerle TrulyGo’da yeniden oluşturulmasını/i);
  assert.match(text, /özel domain, ekip yönetimi, dış entegrasyon veya toplu taşıma[^\n]*güncel ürün kapsamını kontrol et/i);
  assert.match(text, /fiyatı, paketi, kotası veya limitleri[^\n]*karşılaştırma yapmaz/i);
  assert.doesNotMatch(text, /Bitly’den daha (?:güvenli|ucuz|hızlı)/i);
  assert.doesNotMatch(text, /Bitly (?:ile|’yle) (?:aynı|eşit)[^\n]*özellik/i);
  assert.doesNotMatch(text, /(?:₺|\$|€)\s*\d|\d+\s*(?:TL|USD|EUR)/i);
});

test("core pages emit BreadcrumbList only and keep server-owned route files", () => {
  for (const pageId of corePageIds) {
    assert.deepEqual(
      seoLandingStructuredData(seoLandingPages[pageId]).map((item) => item["@type"]),
      ["BreadcrumbList"],
    );

    const routeSource = source(`src/app/(chrome)${seoLandingPages[pageId].path}/page.tsx`);
    assert.match(routeSource, new RegExp(`createSeoLandingMetadata\\("${pageId}"\\)`));
    assert.match(routeSource, new RegExp(`<SeoLandingRoute pageId="${pageId}"`));
    assert.doesNotMatch(routeSource, /^\s*["']use client["'];/m);
  }
});

test("related references are valid, unique, ordered, and never self-referential", () => {
  const pageIds = new Set(Object.keys(seoLandingPages));

  for (const [pageId, page] of Object.entries(seoLandingPages)) {
    assert.equal(new Set(page.related).size, page.related.length, `${pageId} has duplicate related IDs`);
    assert.equal(page.related.includes(pageId), false, `${pageId} links to itself`);
    for (const relatedId of page.related)
      assert.ok(pageIds.has(relatedId), `${pageId} has unknown related ID ${relatedId}`);
  }

  for (const pageId of corePageIds)
    assert.deepEqual(seoLandingPages[pageId].related, expectedContracts[pageId].related);
});

test("UTM and channel landing semantic contracts remain unchanged", () => {
  assert.equal(
    semanticDigest(seoLandingPages.utmLinkOlusturucu),
    "2fcf393460a122ef66b5fd148870980114a56478175a4c94b8dc426329eaaf9c",
  );
  assert.equal(
    semanticDigest(seoLandingPages.kanalLinkiOlusturma),
    "9770ff36a7ad0f97fd8b6d19107845effba781dc6cacf961ac7795c30eb3a00c",
  );
});

test("sitemap, footer, and reserved public route contracts remain unchanged", () => {
  assert.deepEqual(
    seoLandingSitemapEntries.map(({ path: pathname }) => pathname),
    [
      "/link-vitrini",
      "/anket-olusturucu",
      "/bitly-alternatifi",
      "/utm-link-olusturucu",
      "/qr-kod-olusturucu",
      "/whatsapp-link-olusturucu",
      "/kampanya-linki-olusturma",
      "/kanal-linki-olusturma",
      "/link-kisaltma",
    ],
  );
  assert.deepEqual(
    seoFooterLinks.map(({ path: pathname }) => pathname),
    [
      "/link-vitrini",
      "/anket-olusturucu",
      "/link-kisaltma",
      "/utm-link-olusturucu",
      "/qr-kod-olusturucu",
      "/whatsapp-link-olusturucu",
      "/bitly-alternatifi",
      "/kampanya-linki-olusturma",
      "/kanal-linki-olusturma",
    ],
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(seoLandingPages).map(([pageId, page]) => [
        pageId,
        { path: page.path, footerOrder: page.footerOrder },
      ]),
    ),
    {
      linkVitrini: { path: "/link-vitrini", footerOrder: 10 },
      signalAnketOlusturucu: { path: "/anket-olusturucu", footerOrder: 20 },
      bitlyAlternatifi: { path: "/bitly-alternatifi", footerOrder: 70 },
      utmLinkOlusturucu: { path: "/utm-link-olusturucu", footerOrder: 40 },
      qrKodOlusturucu: { path: "/qr-kod-olusturucu", footerOrder: 50 },
      whatsappLinkOlusturucu: { path: "/whatsapp-link-olusturucu", footerOrder: 60 },
      kampanyaLinkiOlusturma: { path: "/kampanya-linki-olusturma", footerOrder: 80 },
      kanalLinkiOlusturma: { path: "/kanal-linki-olusturma", footerOrder: 90 },
      linkKisaltma: { path: "/link-kisaltma", footerOrder: 30 },
    },
  );
  assert.deepEqual(reservedSlugs, [
    "admin",
    "s",
    "dashboard",
    "signal",
    "login",
    "register",
    "v",
    "privacy",
    "terms",
    "not-approved",
    "api",
    "auth",
    "static",
    "opengraph-image",
    "link-vitrini",
    "bitly-alternatifi",
    "utm-link-olusturucu",
    "qr-kod-olusturucu",
    "whatsapp-link-olusturucu",
    "kampanya-linki-olusturma",
    "kanal-linki-olusturma",
    "link-kisaltma",
    "rehberler",
    "anket-olusturucu",
    "cerez-politikasi",
    "acik-riza-metni",
    "kvkk-basvurusu",
    "forgot-password",
    "reset-password",
  ]);
});

test("every landing CTA href resolves to an existing App Router page", () => {
  function routeExists(href, sourcePath) {
    const pathname = new URL(href, `http://localhost:3000${sourcePath}`).pathname.replace(/\/$/, "") || "/";
    return [
      path.join(projectRoot, "src/app", pathname, "page.tsx"),
      path.join(projectRoot, "src/app/(chrome)", pathname, "page.tsx"),
    ].some(existsSync);
  }

  for (const [pageId, page] of Object.entries(seoLandingPages)) {
    const hrefs = [
      page.cta.authHref,
      page.cta.guestHref,
      page.cta.secondaryHref,
      page.heroCta?.primaryHref,
      page.heroCta?.secondaryHref,
    ].filter(Boolean);

    for (const href of hrefs)
      assert.ok(routeExists(href, page.path), `${pageId} CTA points to missing route: ${href}`);
  }
});

test("the five rebuilt configs contain no stale positive product claims", () => {
  const text = corePageIds.map((pageId) => pageText(seoLandingPages[pageId])).join("\n");
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);

  assert.equal(text.includes("tıklama/tarama performansı"), false);
  assert.doesNotMatch(text, /her (?:link|talep)[^\n]*(?:otomatik|kesin) onaylanır/i);
  assert.doesNotMatch(text, /gerçek zamanlı ve eksiksiz (?:analytics|kayıt)/i);
  assert.doesNotMatch(text, /satış dönüşümü (?:ölçer|gösterir)/i);

  for (const sentence of sentences.filter((value) => /\b(?:lead|revenue|conversion)\b/i.test(value))) {
    assert.match(
      sentence,
      /(?:ölçmez|ölçülmez|göstermez|değildir|anlamına gelmez|bulunmuyor|garanti edilmez)/i,
      `unsupported outcome claim lacks a boundary: ${sentence}`,
    );
  }
});
