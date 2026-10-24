import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function resolveLocalModule(fromPath, specifier) {
  const basePath = specifier.startsWith("@/")
    ? path.join(projectRoot, "src", specifier.slice(2))
    : path.resolve(path.dirname(fromPath), specifier);
  const candidates = [basePath, `${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, "index.ts")];
  const match = candidates.find((candidate) => existsSync(candidate));

  if (!match) {
    throw new Error(`Cannot resolve ${specifier} from ${fromPath}`);
  }

  return match;
}

function loadTypescriptModule(absolutePath) {
  if (moduleCache.has(absolutePath)) {
    return moduleCache.get(absolutePath).exports;
  }

  const loadedModule = { exports: {} };
  moduleCache.set(absolutePath, loadedModule);
  const output = ts.transpileModule(readFileSync(absolutePath, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absolutePath,
  }).outputText;

  const localRequire = (specifier) => {
    if (specifier === "next") {
      return {};
    }

    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      return loadTypescriptModule(resolveLocalModule(absolutePath, specifier));
    }

    throw new Error(`Unexpected runtime dependency in guide contract: ${specifier}`);
  };

  const execute = new Function("require", "module", "exports", output);
  execute(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const guideModule = loadTypescriptModule(
  path.join(projectRoot, "src", "content", "guides", "index.ts"),
);
const guideSeoModule = loadTypescriptModule(path.join(projectRoot, "src", "lib", "guide-seo.ts"));
const { guideCategories, guides, publishedGuides } = guideModule;
const {
  buildGuideArticleJsonLd,
  buildGuideBreadcrumbJsonLd,
  createGuideMetadata,
} = guideSeoModule;

const expectedSlugs = [
  "instagram-bio-birden-fazla-link",
  "instagram-link-takibi",
  "kanallara-gore-utm-link-olusturma",
  "kisa-link-nedir",
  "link-vitrini-nedir",
  "online-anket-nasil-hazirlanir",
  "qr-kod-tiklama-takibi",
  "trulygo-anket-olusturma",
  "trulygo-link-istatistikleri",
  "utm-hatalari",
  "utm-link-nasil-olusturulur",
  "utm-nedir",
  "utm-source-medium-campaign-nedir",
  "whatsapp-link-takibi",
];

const allowedCtaRoutes = new Set([
  "/anket-olusturucu",
  "/dashboard/signal/new",
  "/link-kisaltma",
  "/link-vitrini",
  "/qr-kod-olusturucu",
  "/utm-link-olusturucu",
  "/whatsapp-link-olusturucu",
]);

function allGuideInlines(guide) {
  return guide.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      if (block.type === "paragraph" || block.type === "callout") {
        return block.content;
      }
      if (block.type === "list") {
        return block.items.flat();
      }
      if (block.type === "steps") {
        return block.items.flatMap((item) => item.content);
      }
      return [];
    }),
  );
}

function guideText(guide) {
  const structuredText = guide.sections.flatMap((section) => [
    section.title,
    ...section.blocks.flatMap((block) => {
      if (block.type === "table") {
        return [block.caption, ...block.headers, ...block.rows.flat()];
      }
      if (block.type === "code") {
        return [block.label ?? "", block.code];
      }
      if (block.type === "steps") {
        return block.items.flatMap((item) => [item.title, ...item.content.map(({ text }) => text)]);
      }
      if (block.type === "list") {
        return block.items.flatMap((item) => item.map(({ text }) => text));
      }
      return [block.title ?? "", ...block.content.map(({ text }) => text)];
    }),
  ]);

  return structuredText.join(" ").replace(/\s+/g, " ").trim();
}

test("initial guide library publishes the requested 14 URLs in three clusters", () => {
  assert.equal(publishedGuides.length, 14);
  assert.deepEqual(
    [...publishedGuides.map(({ slug }) => slug)].sort(),
    expectedSlugs,
  );
  assert.deepEqual(
    guideCategories.map(({ id, pillarSlug }) => ({ id, pillarSlug })),
    [
      { id: "utm-link-takibi", pillarSlug: "utm-nedir" },
      { id: "link-vitrini", pillarSlug: "link-vitrini-nedir" },
      { id: "anket", pillarSlug: "online-anket-nasil-hazirlanir" },
    ],
  );
});

test("guide records keep unique metadata, valid editorial dates and server-renderable content", () => {
  for (const field of ["slug", "title", "seoTitle", "description", "primaryQuery"]) {
    const values = guides.map((guide) => guide[field]);
    assert.equal(new Set(values).size, values.length, `${field} values must be unique`);
  }

  for (const guide of guides) {
    assert.ok(guide.status === "published" || guide.status === "draft");
    assert.match(guide.slug, /^[a-z0-9-]+$/);
    assert.ok(guide.description.trim().length > 0, `${guide.slug} needs a description`);
    assert.ok(guide.secondaryIntents.length >= 2, `${guide.slug} needs secondary intents`);
    assert.ok(guide.secondaryQueries.length >= 2, `${guide.slug} needs secondary queries`);
    assert.match(guide.datePublished, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(guide.dateModified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(`${guide.datePublished}T00:00:00Z`)));
    assert.ok(Number.isFinite(Date.parse(`${guide.dateModified}T00:00:00Z`)));
    assert.ok(guide.dateModified >= guide.datePublished, `${guide.slug} modified date precedes publication`);
    assert.equal(guide.publisher.type, "Organization");
    assert.equal(guide.publisher.name, "TrulyGo");
    assert.equal(guide.publisher.url, "http://localhost:3000");
    assert.ok(guide.sections.length > 0, `${guide.slug} needs at least one section`);
    assert.equal(new Set(guide.sections.map(({ id }) => id)).size, guide.sections.length);
    assert.ok(guideText(guide).length > guide.description.length, `${guide.slug} body must expand its summary`);

    for (const section of guide.sections) {
      assert.match(section.id, /^[a-z0-9-]+$/, `${guide.slug} has an invalid section id`);
      assert.ok(section.blocks.length > 0, `${guide.slug} has an empty section`);

      for (const block of section.blocks) {
        if (block.type === "table") {
          for (const row of block.rows) {
            assert.equal(row.length, block.headers.length, `${guide.slug} has an uneven table row`);
          }
        }
      }
    }
  }

  assert.ok(publishedGuides.every((guide) => guide.status === "published"));
});

test("related guides, contextual links and CTAs form a closed internal-link graph", () => {
  const slugs = new Set(publishedGuides.map(({ slug }) => slug));
  const inboundLinks = new Map(publishedGuides.map(({ slug }) => [slug, 0]));

  for (const guide of publishedGuides) {
    assert.ok(guide.relatedArticles.length >= 2 && guide.relatedArticles.length <= 4);
    assert.equal(new Set(guide.relatedArticles).size, guide.relatedArticles.length);
    assert.equal(guide.relatedArticles.includes(guide.slug), false);

    for (const relatedSlug of guide.relatedArticles) {
      assert.ok(slugs.has(relatedSlug), `${guide.slug} has unknown related guide ${relatedSlug}`);
      inboundLinks.set(relatedSlug, (inboundLinks.get(relatedSlug) ?? 0) + 1);
    }

    const contextualLinks = allGuideInlines(guide)
      .map(({ href }) => href)
      .filter((href) => href?.startsWith("/rehberler/"));
    assert.ok(contextualLinks.length >= 1, `${guide.slug} needs a contextual guide link`);

    for (const href of contextualLinks) {
      const linkedSlug = href.slice("/rehberler/".length).split("#")[0];
      assert.ok(slugs.has(linkedSlug), `${guide.slug} links to unknown guide ${href}`);
      assert.notEqual(linkedSlug, guide.slug, `${guide.slug} must not self-link in body copy`);
      inboundLinks.set(linkedSlug, (inboundLinks.get(linkedSlug) ?? 0) + 1);
    }

    assert.ok(allowedCtaRoutes.has(guide.cta.href), `${guide.slug} has unapproved CTA ${guide.cta.href}`);
  }

  for (const [slug, count] of inboundLinks) {
    assert.ok(count > 0, `${slug} needs an inbound link from another guide`);
  }
});

test("guide metadata and structured data are indexable, canonical and visible-content aligned", () => {
  for (const guide of publishedGuides) {
    const metadata = createGuideMetadata(guide);
    const article = buildGuideArticleJsonLd(guide);
    const breadcrumbs = buildGuideBreadcrumbJsonLd(guide);
    const canonical = `http://localhost:3000/rehberler/${guide.slug}`;

    assert.equal(metadata.title.absolute, guide.seoTitle);
    assert.equal(metadata.description, guide.description);
    assert.equal(metadata.keywords, null);
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    assert.equal(metadata.alternates.canonical, canonical);
    assert.equal(metadata.openGraph.type, "article");
    assert.equal(metadata.openGraph.url, canonical);
    assert.equal(metadata.openGraph.publishedTime, guide.datePublished);
    assert.equal(metadata.openGraph.modifiedTime, guide.dateModified);
    assert.equal(metadata.twitter.card, "summary_large_image");
    assert.equal(metadata.openGraph.images[0].alt, guide.title);
    assert.equal(metadata.twitter.images[0].alt, guide.title);

    assert.equal(article["@type"], "Article");
    assert.equal(article.headline, guide.title);
    assert.equal(article.description, guide.description);
    assert.equal(article.mainEntityOfPage["@id"], canonical);
    assert.equal(article.author.name, "TrulyGo");
    assert.equal(article.publisher.name, "TrulyGo");
    assert.equal(breadcrumbs["@type"], "BreadcrumbList");
    assert.deepEqual(
      breadcrumbs.itemListElement.map(({ name }) => name),
      ["Ana Sayfa", "Rehberler", guide.title],
    );
  }
});

test("routes and renderer keep guide content crawlable without client-side article rendering", () => {
  const detailRoute = source("src/app/(chrome)/rehberler/[slug]/page.tsx");
  const indexRoute = source("src/app/(chrome)/rehberler/page.tsx");
  const indexView = source("src/components/guides/guide-index.tsx");
  const renderer = source("src/components/guides/guide-article.tsx");
  const seoSource = source("src/lib/guide-seo.ts");

  for (const routeSource of [detailRoute, indexRoute, renderer]) {
    assert.doesNotMatch(routeSource, /^\s*["']use client["'];/m);
  }

  assert.match(detailRoute, /export const dynamicParams = false/);
  assert.match(detailRoute, /generateStaticParams/);
  assert.match(detailRoute, /notFound\(\)/);
  assert.match(renderer, /<article/);
  assert.match(renderer, /<h1/);
  assert.match(renderer, /<h2/);
  assert.match(renderer, /<nav aria-label="İçindekiler"/);
  assert.match(renderer, /<time dateTime=/);
  assert.match(renderer, /<table/);
  assert.match(renderer, /<caption/);
  assert.match(renderer, /scope="row"/);
  assert.match(renderer, /<code/);
  assert.match(indexView, /<h1[^>]*>[\s\S]*TrulyGo Rehberler[\s\S]*<\/h1>/);
  assert.match(seoSource, /"@type": "Article"/);
  assert.match(seoSource, /"@type": "BreadcrumbList"/);
  assert.doesNotMatch(`${detailRoute}\n${renderer}\n${seoSource}`, /FAQPage/);
});

test("discovery surfaces include published guides, Resources navigation and owned route handling", () => {
  const sitemapSource = source("src/app/sitemap.ts");
  const robotsSource = source("src/app/robots.ts");
  const footerSource = source("src/components/site-footer.tsx");
  const vitrineSource = source("src/components/link-vitrine-public-view.tsx");

  assert.match(sitemapSource, /publishedGuides\.map/);
  assert.match(sitemapSource, /guide\.dateModified/);
  assert.match(robotsSource, /allow:\s*\[[\s\S]*"\/"/);
  assert.doesNotMatch(robotsSource, /"\/rehberler\/?"/);
  assert.match(footerSource, />Kaynaklar</);
  assert.match(footerSource, /"\/rehberler\/utm-nedir"/);
  assert.match(footerSource, /"\/rehberler\/link-vitrini-nedir"/);
  assert.match(footerSource, /"\/rehberler\/online-anket-nasil-hazirlanir"/);
  assert.match(vitrineSource, /"\/rehberler"/);
});
