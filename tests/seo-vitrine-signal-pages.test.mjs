import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import {
  LINK_VITRINE_ANIMATION_TYPES,
  LINK_VITRINE_PLATFORMS,
  LINK_VITRINE_SPONSORED_LABELS,
  LINK_VITRINE_THEMES,
} from "../src/lib/link-vitrine-config.ts";
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
    title: page.title,
    metadataTitle: page.metadataTitle,
    metadataDescription: page.metadataDescription,
    sections: page.sections,
    related: page.related,
    cta: page.cta,
    visual: page.visual,
  };

  return createHash("sha256").update(JSON.stringify(canonicalize(contract))).digest("hex");
}

const {
  seoFooterLinks,
  seoLandingPages,
  seoLandingSitemapEntries,
  seoLandingStructuredData,
} = await loadSeoLandingConfig();

const rebuiltPageIds = ["linkVitrini", "signalAnketOlusturucu"];
const legacyKeys = ["purpose", "audience", "workflow", "scenarios", "advantages", "faqs"];

const expectedContracts = {
  linkVitrini: {
    path: "/link-vitrini",
    footerLabel: "Link Vitrini",
    footerOrder: 10,
    eyebrow: "Bio link ve public profil",
    title: "Bağlantılarını Tek Bir Link Vitrini’nde Topla",
    metadataTitle: "Link Vitrini Oluşturma ve Bio Link Sayfası | TrulyGo",
    metadataDescription:
      "Sosyal medya, web sitesi, WhatsApp ve mağaza bağlantılarını tek /v/[handle] profilinde topla; tema, görsel, sıralama, sponsor etiketi ve QR paylaşımını Panelim’de yönet.",
    related: [
      "signalAnketOlusturucu",
      "qrKodOlusturucu",
      "linkKisaltma",
      "whatsappLinkOlusturucu",
    ],
    sectionOrder: [
      ["prose", "Link Vitrini nedir?"],
      ["comparison", "Link Vitrini ile kısa link arasındaki fark"],
      ["definition-list", "Profil yapısını Panelim’de yönet"],
      ["scope", "Desteklenen bağlantı türleri"],
      ["steps", "Bağlantı yönetimi ve sıralama"],
      ["definition-list", "Görsel özelleştirme seçenekleri"],
      ["definition-list", "Sponsor etiketi ve animasyon"],
      ["prose", "Yayınlamak ile indexlenebilir olmak aynı şey değildir"],
      ["prose", "Link Vitrini QR’ı nasıl çalışır?"],
      ["prose", "Signal anketini Vitrin’de göster"],
      ["faq", "Link Vitrini hakkında sık sorulan sorular"],
    ],
    cta: {
      authHref: "/dashboard/link-vitrini/new",
      guestHref: "/register",
      authLabel: "Link Vitrini oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/anket-olusturucu",
      secondaryLabel: "Signal anketlerini incele",
    },
    visual: {
      label: "Temsili Link Vitrini",
      title: "example.invalid/v/marka",
      statusLabel: "Public profil",
      rows: [
        "Profil ve bio",
        "Sosyal ve mağaza bağlantıları",
        "Sponsor etiketi ve animasyon",
        "QR ile paylaşım",
      ],
      footerItems: ["Düzenle", "Önizle", "Yayınla"],
    },
  },
  signalAnketOlusturucu: {
    path: "/anket-olusturucu",
    footerLabel: "Anket Oluşturucu",
    footerOrder: 20,
    eyebrow: "TrulyGo Signal",
    title: "Cevaba Göre İlerleyen Bir Online Anket Oluştur",
    metadataTitle: "Online Anket Oluşturucu ve Dallanan Sorular | TrulyGo",
    metadataDescription:
      "Çok sorulu online anket oluştur; seçilen cevaba bağlı ek soruları, sonuç görünürlüğünü, taslak-yayın-kapalı durumlarını ve Link Vitrini kartını TrulyGo Signal ile yönet.",
    related: [
      "linkVitrini",
      "qrKodOlusturucu",
      "whatsappLinkOlusturucu",
      "kampanyaLinkiOlusturma",
    ],
    sectionOrder: [
      ["comparison", "TrulyGo Signal nedir, ne değildir?"],
      ["definition-list", "Anket yapısı ve mevcut sınırlar"],
      ["example", "Cevaba bağlı ek soru nasıl çalışır?"],
      ["definition-list", "Taslak, yayında ve kapalı yaşam döngüsü"],
      ["prose", "Public oy verme bağlantısı"],
      ["comparison", "Sonuç görünürlüğü ve panel sonuçları"],
      ["prose", "Signal anketini Link Vitrini’nde göster"],
      ["scope", "Veri ve ölçüm sınırları"],
      ["scope", "Gerçekçi kullanım örnekleri"],
      ["faq", "TrulyGo Signal hakkında sık sorulan sorular"],
    ],
    cta: {
      authHref: "/dashboard/signal/new",
      guestHref: "/register",
      authLabel: "Anket oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/link-vitrini",
      secondaryLabel: "Link Vitrini’ni incele",
    },
    visual: {
      label: "Temsili Signal anketi",
      title: "example.invalid/signal/anket",
      statusLabel: "Public anket",
      rows: [
        "Ana sorular",
        "Cevaba bağlı ek soru",
        "Sonuç görünürlüğü",
        "Link Vitrini kartı",
      ],
      footerItems: ["Taslak", "Yayınla", "Sonuçlar"],
    },
  },
};

test("Vitrine and Signal use flexible, unique, intent-specific public contracts", () => {
  const sectionSequences = [];

  for (const pageId of rebuiltPageIds) {
    const page = seoLandingPages[pageId];
    const expected = expectedContracts[pageId];

    assert.ok(Array.isArray(page.sections) && page.sections.length > 0);
    for (const legacyKey of legacyKeys) {
      assert.equal(Object.hasOwn(page, legacyKey), false, `${pageId} still has ${legacyKey}`);
    }

    for (const key of [
      "path",
      "footerLabel",
      "footerOrder",
      "eyebrow",
      "title",
      "metadataTitle",
      "metadataDescription",
    ]) {
      assert.equal(page[key], expected[key], `${pageId}.${key} changed`);
    }

    assert.deepEqual(page.related, expected.related);
    assert.deepEqual(
      page.sections.map(({ type, title }) => [type, title]),
      expected.sectionOrder,
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
    assert.deepEqual(
      {
        label: page.visual.label,
        title: page.visual.title,
        statusLabel: page.visual.statusLabel,
        rows: page.visual.rows,
        footerItems: page.visual.footerItems,
      },
      expected.visual,
    );

    const sectionKeys = page.sections.map((section) => `${section.type}-${section.id ?? section.title}`);
    assert.equal(new Set(sectionKeys).size, sectionKeys.length, `${pageId} repeats a section key`);
    assert.equal(new Set(page.visual.rows).size, page.visual.rows.length);
    sectionSequences.push(JSON.stringify(expected.sectionOrder));
  }

  assert.equal(new Set(sectionSequences).size, rebuiltPageIds.length);

  for (const [field, label] of [
    ["title", "H1"],
    ["metadataTitle", "metadata title"],
    ["metadataDescription", "metadata description"],
  ]) {
    const values = Object.values(seoLandingPages).map((page) => page[field]);
    assert.equal(new Set(values).size, values.length, `${label} values must be globally unique`);
  }
});

test("Link Vitrine claims match themes, platforms, images, grouping, labels, and public rel behavior", () => {
  const text = pageText(seoLandingPages.linkVitrini);
  const configSource = source("src/lib/link-vitrine-config.ts");
  const editorSource = source("src/app/dashboard/link-vitrini/link-vitrini-editor.tsx");
  const actionsSource = source("src/app/dashboard/link-vitrini/actions.ts");
  const publicViewSource = source("src/components/link-vitrine-public-view.tsx");

  assert.equal(LINK_VITRINE_THEMES.length, 10);
  assert.match(text, /toplam 10 kaynak tema|10 tema/i);
  assert.equal(LINK_VITRINE_PLATFORMS.length, 20);
  for (const platform of LINK_VITRINE_PLATFORMS) {
    assert.ok(text.includes(platform.label), `landing omits supported platform ${platform.label}`);
  }

  assert.match(actionsSource, /MAX_AVATAR_SIZE_BYTES = 2 \* 1024 \* 1024/);
  assert.match(actionsSource, /MAX_BANNER_SIZE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(actionsSource, /"image\/jpeg": "jpg"/);
  assert.match(actionsSource, /"image\/png": "png"/);
  assert.match(actionsSource, /"image\/webp": "webp"/);
  assert.match(text, /avatar[\s\S]*2 MB/i);
  assert.match(text, /banner[\s\S]*5 MB/i);
  assert.match(text, /PNG, JPEG veya WebP/i);
  assert.match(editorSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(text, /banner[\s\S]*sürüklen/i);

  assert.match(editorSource, /function addDraftPlatformLink\(\)/);
  assert.match(actionsSource, /const isPlatformActive = submittedRows\.some/);
  assert.match(actionsSource, /isActive: isPlatformActive/);
  assert.match(text, /aynı platform altında birden fazla/i);
  assert.match(text, /platform grubunu aktif veya pasif/i);
  assert.doesNotMatch(text, /her bağlantı(?:yı|nın) bağımsız aktif/i);

  for (const option of LINK_VITRINE_SPONSORED_LABELS) {
    assert.ok(text.includes(option.label), `landing omits sponsor label ${option.label}`);
  }
  for (const option of LINK_VITRINE_ANIMATION_TYPES) {
    assert.ok(text.includes(option.label), `landing omits animation ${option.label}`);
  }
  assert.match(configSource, /LINK_VITRINE_SPONSORED_LABEL_IDS/);
  assert.match(configSource, /LINK_VITRINE_ANIMATION_TYPE_IDS/);
  assert.match(publicViewSource, /return "sponsored ugc noopener noreferrer"/);
  assert.match(publicViewSource, /\? "noopener noreferrer"\s*: "ugc noopener noreferrer"/);
  assert.match(text, /sponsorlu ve kullanıcı içeriği olarak işaretlenir/i);
  assert.match(text, /hukuki uyumluluğu otomatik sağlamaz/i);
});

test("Link Vitrine copy separates mutable profiles, publishing, indexability, and QR limits", () => {
  const text = pageText(seoLandingPages.linkVitrini);
  const indexabilitySource = source("src/lib/link-vitrine-indexability.ts");
  const publicPageSource = source("src/app/v/[handle]/page.tsx");
  const querySource = source("src/lib/link-vitrines.ts");
  const editorSource = source("src/app/dashboard/link-vitrini/link-vitrini-editor.tsx");
  const qrCodeSource = source("src/components/qr-code-card.tsx");

  assert.match(text, /vitrin içeriği[\s\S]*daha sonra güncellenebilir/i);
  assert.match(text, /onaylanan hedef URL[\s\S]*değiştirilmez/i);
  assert.match(text, /hedeflerinin TrulyGo tarafından onaylandığı anlamına gelmez/i);
  assert.doesNotMatch(text, /Vitrin içeriği (?:değiştirilemez|immutable)/i);
  assert.doesNotMatch(text, /Vitrin kart(?:ı|ları)[\s\S]*tıklama analizi (?:üretir|sağlar)/i);

  assert.match(querySource, /\.eq\("is_published", true\)/);
  assert.match(publicPageSource, /if \(!vitrine\) \{\s*notFound\(\)/);
  assert.match(indexabilitySource, /hasValidNormalizedHandle/);
  assert.match(indexabilitySource, /hasActualDisplayName/);
  assert.match(indexabilitySource, /hasBio \|\| hasActivePublicLink/);
  assert.match(text, /yayın durumu tek başına arama motoru indexlenebilirliği sağlamaz/i);
  assert.match(text, /normalize edilmiş 3–32 karakterlik bir handle/i);
  assert.match(text, /“TrulyGo kullanıcısı” placeholder’ı yerine gerçek bir görünen ad/i);
  assert.match(text, /Bio veya en az bir aktif ve güvenli HTTP\/HTTPS bağlantı/i);
  assert.match(text, /indexleyeceğini veya sıralayacağını garanti etmez/i);

  assert.match(editorSource, /value=\{publicUrl\}/);
  assert.ok(
    editorSource.includes(
      'const publicUrl = `${appOrigin.replace(/\\/$/, "")}/v/${vitrine.handle || "handle"}`;',
    ),
  );
  assert.match(editorSource, /Ekstra kısa redirect slug oluşturulmaz/);
  assert.match(qrCodeSource, /Logolu indirme için PNG kullanın\. SVG çıktısı logosuz oluşturulur\./);
  assert.match(text, /yüklenen logo PNG’ye eklenir, SVG logosuz oluşturulur/i);
  assert.match(text, /QR içeriği doğrudan \/v\/\[handle\] adresidir/i);
  assert.match(text, /ek bir kısa redirect slug oluşturulmaz/i);
  assert.match(text, /QR görseli tek başına analytics üretmez/i);
  assert.match(text, /kanal tıklama analizi veya fiziksel kamera taraması ölçümü sağlamaz/i);
});

test("Signal copy matches validation limits and the single-level branch model", () => {
  const text = pageText(seoLandingPages.signalAnketOlusturucu);
  const validationSource = source("src/lib/signal-validation.ts");
  const editorSource = source("src/app/dashboard/signal/signal-survey-editor.tsx");

  assert.match(validationSource, /rawQuestions\.length < 1 \|\| rawQuestions\.length > 20/);
  assert.match(validationSource, /normalizeOptions\(question\.options, 6\)/);
  assert.match(validationSource, /normalizeOptions\(branchRecord\.options, 4\)/);
  assert.match(validationSource, /branch: SignalSurveyDraftBranch \| null/);
  assert.match(editorSource, /if \(question\.branch\) \{\s*return;/);
  assert.match(text, /1–20 ana soru/i);
  assert.match(text, /2–6 ana soru seçeneği/i);
  assert.match(text, /2–4 ek soru seçeneği/i);
  assert.match(text, /her ana soruda en fazla bir/i);
  assert.match(text, /ek sorunun içinde ikinci bir dal bulunmaz/i);
  assert.doesNotMatch(text, /iç içe (?:sınırsız )?dallanma (?:vardır|oluşturulabilir)/i);
  assert.doesNotMatch(text, /bir ana soruda birden fazla (?:ek soru|dal) (?:vardır|oluşturulabilir)/i);
});

test("Signal lifecycle, public voting, dedup, and result claims match production code", () => {
  const text = pageText(seoLandingPages.signalAnketOlusturucu);
  const validationSource = source("src/lib/signal-validation.ts");
  const surveysSource = source("src/lib/signal-surveys.ts");
  const publicPageSource = source("src/app/signal/[slug]/page.tsx");
  const voteSource = source("src/app/signal/[slug]/actions.ts");
  const voterSource = source("src/app/signal/[slug]/signal-voter.tsx");
  const resultsSource = source("src/lib/signal-results.ts");

  assert.match(validationSource, /export type SignalSurveyStatus = "draft" \| "published" \| "closed"/);
  assert.match(validationSource, /value === "draft" \|\| value === "published" \|\| value === "closed"/);
  assert.match(surveysSource, /\.in\("status", \["published", "closed"\]\)/);
  assert.match(surveysSource, /row\.status === "published"[\s\S]*fetchQuestionsForSurvey/);
  assert.match(publicPageSource, /if \(!survey\) \{\s*notFound\(\)/);
  assert.match(publicPageSource, /if \(survey\.status === "closed"\)/);
  assert.match(voteSource, /if \(!survey \|\| survey\.status !== "published"\)/);
  assert.match(text, /Taslak[\s\S]*gerçek 404/i);
  assert.match(text, /Kapalı[\s\S]*soruları public sorguya göndermez[\s\S]*yeni oy kabul etmez/i);

  assert.doesNotMatch(publicPageSource, /getAuthStatus|getSignalCurrentUserId/);
  assert.match(text, /katılımcının TrulyGo hesabıyla giriş yapmasını istemez/i);
  assert.match(voteSource, /cookieStore\.get\(cookieName\)/);
  assert.match(voteSource, /buildSignalVoterTokenHash/);
  assert.match(voteSource, /checkRateLimit/);
  assert.match(text, /tarayıcı çerezi[\s\S]*soft-dedup[\s\S]*hız limitleri/i);
  assert.match(text, /her kişi kesinlikle yalnız bir kez oy verir[\s\S]*garantisi vermez/i);

  assert.match(voteSource, /survey\.showResultsToVoters \? await getSignalResultsForSurvey/);
  assert.match(voterSource, /Sonuçlar yalnızca anket sahibi tarafından görüntülenebilir/);
  assert.match(text, /showResultsToVoters açık olduğunda[\s\S]*oyunu tamamladıktan sonra/i);
  assert.match(resultsSource, /participantCount: completedResponseIds\.size/);
  assert.match(resultsSource, /totalAnswers: completedAnswers\.length/);
  assert.match(resultsSource, /percentage: getPercentage\(votes, total\)/);
  assert.match(text, /toplam ana \+ ek soru cevabı/i);
  assert.match(text, /yuvarlanmış yüzdeler/i);
});

test("Signal cards require a linked published survey with explicit Vitrine visibility", () => {
  const combinedText = rebuiltPageIds.map((pageId) => pageText(seoLandingPages[pageId])).join("\n");
  const surveysSource = source("src/lib/signal-surveys.ts");
  const publicViewSource = source("src/components/link-vitrine-public-view.tsx");

  assert.match(surveysSource, /\.eq\("link_vitrine_id", vitrineId\)/);
  assert.match(surveysSource, /\.eq\("status", "published"\)/);
  assert.match(surveysSource, /\.eq\("show_in_link_vitrine", true\)/);
  assert.match(publicViewSource, /href=\{`\/signal\/\$\{survey\.slug\}`\}/);
  assert.match(publicViewSource, /survey\.totalParticipants > 0/);
  assert.match(combinedText, /published durumda[\s\S]*“Link Vitrini’nde göster” seçeneği açık/i);
  assert.match(combinedText, /Kart \/signal\/\[slug\]/i);
  assert.match(combinedText, /Taslak ve kapalı anketler aktif oy kartı sorgusuna girmez/i);
  assert.doesNotMatch(combinedText, /her anket otomatik(?: olarak)? Vitrin/i);
});

test("Vitrine and Signal copy keeps unsupported claims behind explicit boundaries", () => {
  const text = rebuiltPageIds.map((pageId) => pageText(seoLandingPages[pageId])).join("\n");

  assert.doesNotMatch(text, /\b(?:en iyi|lider|en gelişmiş)\b/i);
  assert.doesNotMatch(text, /\b(?:ücretsiz|limitsiz|sınırsız)\b/i);
  assert.doesNotMatch(text, /gerçek zamanlı/i);
  assert.doesNotMatch(text, /premium görünüm/i);
  assert.doesNotMatch(text, /yapay zekâ destekli analiz/i);
  assert.doesNotMatch(text, /Signal[\s\S]*özel QR (?:aracı|üretir|oluşturur)/i);
  assert.doesNotMatch(text, /(?:tam anonimlik|KVKK uyumluluğu) (?:sağlar|garanti eder)/i);
  assert.doesNotMatch(text, /(?:satış|gelir|lead|conversion) (?:ölçer|kanıtlar|garanti eder)/i);

  const boundedSentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(
      (sentence) =>
        !sentence.trim().endsWith("?") &&
        /(?:analytics|bilimsel|conversion|lead|performans artışı|tam anonimlik|KVKK)/i.test(
          sentence,
        ),
    );

  for (const sentence of boundedSentences) {
    assert.match(
      sentence,
      /(?:değil|değildir|etmez|vermez|üretmez|sağlamaz|taşımaz|yok|kanıtı değildir|sorumludur|yazmamak|istenmemelidir)/i,
      `unsupported claim lacks a boundary: ${sentence}`,
    );
  }
});

test("both landing routes remain server-owned and emit BreadcrumbList only", () => {
  for (const pageId of rebuiltPageIds) {
    assert.deepEqual(
      seoLandingStructuredData(seoLandingPages[pageId]).map((item) => item["@type"]),
      ["BreadcrumbList"],
    );
    assert.equal(JSON.stringify(seoLandingStructuredData(seoLandingPages[pageId])).includes("FAQPage"), false);
  }

  const vitrineRoute = source("src/app/(chrome)/link-vitrini/page.tsx");
  assert.match(vitrineRoute, /createSeoLandingMetadata\("linkVitrini"\)/);
  assert.match(vitrineRoute, /getRecentPublicLinkVitrines\(6\)/);
  assert.match(vitrineRoute, /<SeoLandingPage/);
  assert.match(vitrineRoute, /discovery=\{<LinkVitrineDiscovery vitrines=\{vitrines\} \/>\}/);
  assert.doesNotMatch(vitrineRoute, /^\s*["']use client["'];/m);

  const signalRoute = source("src/app/(chrome)/anket-olusturucu/page.tsx");
  assert.match(signalRoute, /createSeoLandingMetadata\("signalAnketOlusturucu"\)/);
  assert.match(signalRoute, /<SeoLandingRoute pageId="signalAnketOlusturucu" \/>/);
  assert.doesNotMatch(signalRoute, /^\s*["']use client["'];/m);
});

test("related IDs and every landing CTA remain valid App Router references", () => {
  const pageIds = new Set(Object.keys(seoLandingPages));

  for (const [pageId, page] of Object.entries(seoLandingPages)) {
    assert.equal(new Set(page.related).size, page.related.length, `${pageId} repeats a related ID`);
    assert.equal(page.related.includes(pageId), false, `${pageId} links to itself`);
    for (const relatedId of page.related) {
      assert.ok(pageIds.has(relatedId), `${pageId} references unknown page ${relatedId}`);
    }

    const hrefs = [
      page.cta.authHref,
      page.cta.guestHref,
      page.cta.secondaryHref,
      page.heroCta?.primaryHref,
      page.heroCta?.secondaryHref,
    ].filter(Boolean);

    for (const href of hrefs) {
      const pathname = new URL(href, `http://localhost:3000${page.path}`).pathname.replace(/\/$/, "") || "/";
      const candidates = [
        path.join(projectRoot, "src/app", pathname, "page.tsx"),
        path.join(projectRoot, "src/app/(chrome)", pathname, "page.tsx"),
      ];
      assert.ok(candidates.some(existsSync), `${pageId} CTA points to missing route ${href}`);
    }
  }

  for (const pageId of rebuiltPageIds) {
    assert.deepEqual(seoLandingPages[pageId].related, expectedContracts[pageId].related);
  }
});

test("the other seven landing semantic contracts remain byte-stable", () => {
  const expectedDigests = {
    bitlyAlternatifi: "d5e80b643da23d0ffa1a9cba8170474d036a210e11d962fd3e2dc180ae10525d",
    utmLinkOlusturucu: "ec48e4358f2c9854ff16fdb5cbb24961f27fb9ecf0c6687a7f12bace7b40c263",
    qrKodOlusturucu: "56ff20fb6cd8e904321b05d44974c66ba16e0a87b0c66dc9fab61a122b399e21",
    whatsappLinkOlusturucu: "73647b25cbda04a3ab0ad8ca5377455d6f99f74d9227d7ddd0b5e81b78597e3c",
    kampanyaLinkiOlusturma: "4d453c5752d838c426bbdf79fddfb0a30308f880bd128c5a0300ad6863856783",
    kanalLinkiOlusturma: "a1053386dadeee3133c1661ca46e01da8c979b9beee27f0ce775244e8775ce9c",
    linkKisaltma: "a01797f7a0d79460b570eb55197d299122fb887bee0fb4ff8aa5865da304af7e",
  };

  for (const [pageId, expectedDigest] of Object.entries(expectedDigests)) {
    assert.equal(semanticDigest(seoLandingPages[pageId]), expectedDigest, `${pageId} changed`);
  }
});

test("sitemap, footer, path/order, and public route reservations remain unchanged", () => {
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
  assert.deepEqual(seoFooterLinks, [
    { label: "Link Vitrini", path: "/link-vitrini" },
    { label: "Anket Oluşturucu", path: "/anket-olusturucu" },
    { label: "Link Kısaltma", path: "/link-kisaltma" },
    { label: "UTM Link Oluşturucu", path: "/utm-link-olusturucu" },
    { label: "QR Kod Oluşturucu", path: "/qr-kod-olusturucu" },
    { label: "WhatsApp Link Kısaltma", path: "/whatsapp-link-olusturucu" },
    { label: "Bitly Alternatifi", path: "/bitly-alternatifi" },
    { label: "Kampanya Linkleri", path: "/kampanya-linki-olusturma" },
    { label: "Kanal Linkleri", path: "/kanal-linki-olusturma" },
  ]);
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

test("test:seo executes the Vitrine and Signal contract suite", () => {
  const packageJson = JSON.parse(source("package.json"));
  assert.match(packageJson.scripts["test:seo"], /tests\/seo-vitrine-signal-pages\.test\.mjs/);
});
