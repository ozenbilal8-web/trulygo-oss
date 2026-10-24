import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { reservedSlugs } from "../src/lib/slugs.ts";
import { serializeJsonLd } from "../src/lib/seo.ts";
import { appendOptionalSitemapEntries } from "../src/lib/sitemap-fallback.ts";

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

async function loadChannelDefinitions() {
  const channelSource = source("src/lib/channel-links.ts").replace(/^import .*;\r?\n/gm, "");
  const sourceWithLocalStubs = `
const buildChannelSlug = (parentSlug, suffix) => parentSlug + "-" + suffix;
const slugifyToAscii = (value) => value?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || null;
${channelSource}`;
  const output = ts.transpileModule(sourceWithLocalStubs, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const { buildPresetChannelDraft, channelPresets } = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
  return { buildPresetChannelDraft, channelPresets };
}

const {
  seoFooterLinks,
  seoLandingBreadcrumbItems,
  seoLandingPages,
  seoLandingSitemapEntries,
  seoLandingStructuredData,
} = await loadSeoLandingConfig();

const utmPage = seoLandingPages.utmLinkOlusturucu;
const channelPage = seoLandingPages.kanalLinkiOlusturma;

test("UTM and channel landing contracts use unique intent-specific metadata", () => {
  assert.equal(utmPage.path, "/utm-link-olusturucu");
  assert.equal(
    utmPage.metadataTitle,
    "Ücretsiz UTM Link Oluşturucu ve Parametre Rehberi | TrulyGo",
  );
  assert.equal(
    utmPage.metadataDescription,
    "Kaynak, kanal ve kampanya parametrelerini doğru adlandır; üyelik olmadan UTM linkini oluştur, kopyala ve istersen TrulyGo ile kısaltıp takip et.",
  );
  assert.equal(utmPage.title, "UTM Linkini Oluştur, Parametreleri Doğru Adlandır");

  assert.equal(channelPage.path, "/kanal-linki-olusturma");
  assert.equal(
    channelPage.metadataTitle,
    "Kanal Linki Oluşturma ve Kanal Bazlı Takip | TrulyGo",
  );
  assert.equal(
    channelPage.metadataDescription,
    "Onaylı ana linkin için Instagram, WhatsApp, YouTube, e-posta, QR ve diğer kanallara ayrı kısa linkler oluştur; kanal performansını karşılaştır.",
  );
  assert.equal(channelPage.title, "Aynı Hedef İçin Ayrı Kanal Linkleri Oluştur");

  const pages = Object.values(seoLandingPages);

  for (const [field, label] of [
    ["path", "path"],
    ["metadataTitle", "metadata title"],
    ["title", "H1"],
  ]) {
    const values = pages.map((page) => page[field]);
    assert.equal(new Set(values).size, values.length, `${label} values must be unique`);
  }
});

test("flexible UTM and channel sections preserve the requested information order", () => {
  assert.deepEqual(
    utmPage.sections.map((section) => section.type),
    ["definition-list", "prose", "example", "prose", "scope", "faq"],
  );
  assert.deepEqual(
    channelPage.sections.map((section) => section.type),
    [
      "comparison",
      "steps",
      "definition-list",
      "example",
      "prose",
      "definition-list",
      "scope",
      "faq",
    ],
  );
});

test("UTM landing embeds the existing client builder in a server route", () => {
  const routeSource = source("src/app/(chrome)/utm-link-olusturucu/page.tsx");
  const builderSource = source("src/components/public-utm-builder.tsx");
  const configSource = source("src/lib/seo-landing-pages.ts");

  assert.match(routeSource, /<PublicUtmBuilder isAuthenticated=\{auth\.isAuthenticated\} \/>/);
  assert.match(routeSource, /const auth = await getAuthStatus\(\)/);
  assert.doesNotMatch(routeSource, /^\s*["']use client["'];/m);
  assert.equal((builderSource.match(/id="utm-link-olusturucu"/g) ?? []).length, 1);
  assert.doesNotMatch(routeSource, /id="utm-link-olusturucu"/);

  for (const staleClaim of [
    "Bu sayfada UTM link üretilmiyor",
    "Gerçek UTM oluşturma yalnız Panelim’de yapılır",
    "Gerçek UTM oluşturma yalnız Panelim'de yapılır",
  ]) {
    assert.equal(configSource.includes(staleClaim), false, `stale claim remains: ${staleClaim}`);
  }
});

test("channel preset matrix matches the production channel definitions", async () => {
  const presetSection = channelPage.sections.find(
    (section) => section.type === "definition-list" && section.title === "Preset kanal matrisi",
  );
  assert.ok(presetSection);

  const actual = Object.fromEntries(
    presetSection.items.map((item) => [
      item.term,
      Object.fromEntries(item.details.map(({ label, value }) => [label, value])),
    ]),
  );
  const { buildPresetChannelDraft, channelPresets } = await loadChannelDefinitions();
  const expected = Object.fromEntries(channelPresets.map((preset) => {
    const draft = buildPresetChannelDraft({
      campaignName: "test",
      parentSlug: "lansman",
      preset,
    });
    assert.ok(draft);

    return [
      preset.key === "x" ? "X" : preset.label,
      {
        Suffix: preset.suffix,
        utm_source: draft.utmSource,
        utm_medium: draft.utmMedium,
        utm_content: draft.utmContent,
      },
    ];
  }));

  assert.deepEqual(actual, expected);
});

test("channel landing is registered in routes, footer, sitemap, reservations, and owned paths", () => {
  assert.match(source("src/app/(chrome)/kanal-linki-olusturma/page.tsx"), /kanalLinkiOlusturma/);
  assert.deepEqual(
    seoFooterLinks.find((link) => link.path === channelPage.path),
    { label: "Kanal Linkleri", path: "/kanal-linki-olusturma" },
  );
  assert.ok(seoLandingSitemapEntries.some((entry) => entry.path === channelPage.path));
  assert.ok(reservedSlugs.includes("kanal-linki-olusturma"));
  assert.match(
    source("src/components/link-vitrine-public-view.tsx"),
    /"\/kanal-linki-olusturma"/,
  );
});

test("related landing references are valid and include the required channel relationships", () => {
  const pageIds = new Set(Object.keys(seoLandingPages));

  for (const [pageId, page] of Object.entries(seoLandingPages)) {
    assert.equal(new Set(page.related).size, page.related.length, `${pageId} has duplicate related IDs`);
    assert.equal(page.related.includes(pageId), false, `${pageId} links to itself`);

    for (const relatedId of page.related) {
      assert.ok(pageIds.has(relatedId), `${pageId} has unknown related ID ${relatedId}`);
    }
  }

  assert.deepEqual(utmPage.related, [
    "kampanyaLinkiOlusturma",
    "kanalLinkiOlusturma",
    "linkKisaltma",
    "qrKodOlusturucu",
  ]);
  assert.deepEqual(channelPage.related, [
    "kampanyaLinkiOlusturma",
    "utmLinkOlusturucu",
    "whatsappLinkOlusturucu",
    "qrKodOlusturucu",
    "linkKisaltma",
  ]);

  for (const pageId of [
    "kampanyaLinkiOlusturma",
    "linkKisaltma",
    "whatsappLinkOlusturucu",
    "qrKodOlusturucu",
  ]) {
    assert.ok(seoLandingPages[pageId].related.includes("kanalLinkiOlusturma"));
  }
});

test("visible and structured breadcrumbs share the same ordered labels", () => {
  const componentSource = source("src/components/seo-landing-page.tsx");
  const breadcrumbs = seoLandingBreadcrumbItems(channelPage);
  const [structuredData] = seoLandingStructuredData(channelPage);

  assert.match(componentSource, /<nav\s+[\s\S]*?aria-label="Breadcrumb"/);
  assert.match(componentSource, /const breadcrumbs = seoLandingBreadcrumbItems\(page\)/);
  assert.match(componentSource, /aria-current="page"/);
  assert.deepEqual(
    structuredData.itemListElement.map(({ position, name, item }) => ({ position, name, item })),
    breadcrumbs.map((breadcrumb, index) => ({
      position: index + 1,
      name: breadcrumb.name,
      item: new URL(breadcrumb.path, "http://localhost:3000").toString(),
    })),
  );
});

test("JSON-LD serialization escapes tag-breaking characters and emits no FAQ schema", () => {
  const value = {
    "@context": "https://schema.org",
    name: "</script><script>alert(1)</script>",
  };
  const serialized = serializeJsonLd(value);

  assert.equal(serialized.includes("<"), false);
  assert.match(serialized, /\\u003c\/script>/);
  assert.deepEqual(JSON.parse(serialized), value);

  const rendererSources = [
    source("src/components/seo-landing-page.tsx"),
    source("src/app/(chrome)/page.tsx"),
    source("src/app/v/[handle]/page.tsx"),
  ];
  for (const rendererSource of rendererSources) {
    assert.match(rendererSource, /serializeJsonLd\(/);
  }

  assert.equal(JSON.stringify(seoLandingStructuredData(utmPage)).includes("FAQPage"), false);
  assert.equal(JSON.stringify(seoLandingStructuredData(channelPage)).includes("FAQPage"), false);
});

test("sitemap keeps static entries when the optional Vitrine source fails", async () => {
  const staticEntries = [{ url: "http://localhost:3000/" }, { url: "http://localhost:3000/utm-link-olusturucu" }];
  const optionalEntries = [{ url: "http://localhost:3000/v/ornek" }];

  assert.deepEqual(
    await appendOptionalSitemapEntries(staticEntries, async () => optionalEntries),
    [...staticEntries, ...optionalEntries],
  );
  assert.deepEqual(
    await appendOptionalSitemapEntries(staticEntries, async () => {
      throw new Error("simulated Vitrine query failure");
    }),
    staticEntries,
  );

  const sitemapSource = source("src/app/sitemap.ts");
  assert.match(sitemapSource, /const staticEntries: MetadataRoute\.Sitemap/);
  assert.match(sitemapSource, /appendOptionalSitemapEntries\(staticEntries, async \(\) =>/);
  assert.match(sitemapSource, /getPublicLinkVitrineSitemapEntries\(\)/);
});
