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

    throw new Error(`Unexpected runtime dependency in Link Vitrine SEO contract: ${specifier}`);
  };

  const execute = new Function("require", "module", "exports", output);
  execute(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const seoModule = loadTypescriptModule(path.join(projectRoot, "src", "lib", "link-vitrine-seo.ts"));
const coreSeoModule = loadTypescriptModule(path.join(projectRoot, "src", "lib", "seo.ts"));
const {
  buildLinkVitrineMetaDescription,
  buildLinkVitrineProfileJsonLd,
  normalizeLinkVitrineSchemaDate,
} = seoModule;

function item(platform, url, overrides = {}) {
  return {
    isActive: true,
    platform,
    url,
    ...overrides,
  };
}

function profile(overrides = {}) {
  return {
    avatarUrl: null,
    bannerUrl: null,
    bio: null,
    createdAt: "2026-05-13T22:30:00+03:00",
    handle: "samplecreator",
    items: [],
    name: "Sample Creator",
    updatedAt: "2026-08-20T09:15:30.456+03:00",
    ...overrides,
  };
}

test("uses a neutral runtime-only description when bio is missing", () => {
  const input = profile();
  const snapshot = structuredClone(input);

  assert.equal(
    buildLinkVitrineMetaDescription(input),
    "TrulyGo Link Vitrini üzerinden Sample Creator profilinin bağlantılarına ulaşın.",
  );
  assert.deepEqual(input, snapshot);
  assert.equal(input.bio, null);
});

test("bio add and remove transitions switch between real bio and fallback without mutation", () => {
  const fallback = buildLinkVitrineMetaDescription(profile({ bio: "  \n  " }));
  const withBio = profile({ bio: "  Teknoloji ve günlük yaşam üzerine   içerikler.  " });
  const withBioSnapshot = structuredClone(withBio);
  const removedBio = profile({ bio: null });

  assert.equal(
    fallback,
    "TrulyGo Link Vitrini üzerinden Sample Creator profilinin bağlantılarına ulaşın.",
  );
  assert.equal(
    buildLinkVitrineMetaDescription(withBio),
    "Teknoloji ve günlük yaşam üzerine içerikler.",
  );
  assert.equal(buildLinkVitrineMetaDescription(removedBio), fallback);
  assert.deepEqual(withBio, withBioSnapshot);
  assert.equal(removedBio.bio, null);
});

test("ProfilePage uses normalized real database timestamps and preserves real Person fields", () => {
  const input = profile({
    avatarUrl: "/avatars/samplecreator.png",
    bio: "  Gerçek   kullanıcı bio'su. ",
    items: [item("instagram", "https://instagram.com/samplecreator")],
  });
  const snapshot = structuredClone(input);
  const jsonLd = buildLinkVitrineProfileJsonLd(
    input,
    "http://localhost:3000/v/samplecreator",
  );

  assert.equal(jsonLd["@type"], "ProfilePage");
  assert.equal(jsonLd.dateCreated, "2026-05-13T19:30:00.000Z");
  assert.equal(jsonLd.dateModified, "2026-08-20T06:15:30.456Z");
  assert.deepEqual(jsonLd.mainEntity, {
    "@type": "Person",
    name: "Sample Creator",
    url: "http://localhost:3000/v/samplecreator",
    alternateName: "samplecreator",
    description: "Gerçek kullanıcı bio'su.",
    image: "http://localhost:3000/avatars/samplecreator.png",
    sameAs: ["https://instagram.com/samplecreator"],
  });
  assert.deepEqual(input, snapshot);
});

test("ProfilePage omits invented bio, invalid dates, and non-identity links", () => {
  const input = profile({
    createdAt: "not-a-date",
    items: [
      item("amazon", "https://amazon.com.tr/dp/B000000000?tag=affiliate"),
      item("website", "https://example.com/news/article"),
      item("discord", "https://discord.gg/example"),
      item("telegram", "https://t.me/example"),
      item("whatsapp", "https://wa.me/905551112233"),
    ],
    updatedAt: null,
  });
  const jsonLd = buildLinkVitrineProfileJsonLd(
    input,
    "http://localhost:3000/v/samplecreator",
  );

  assert.equal(Object.hasOwn(jsonLd, "dateCreated"), false);
  assert.equal(Object.hasOwn(jsonLd, "dateModified"), false);
  assert.equal(Object.hasOwn(jsonLd.mainEntity, "description"), false);
  assert.equal(Object.hasOwn(jsonLd.mainEntity, "sameAs"), false);
  assert.equal(input.bio, null);
});

test("ProfilePage canonicalizes, strips tracking, and deduplicates supported identities", () => {
  const jsonLd = buildLinkVitrineProfileJsonLd(
    profile({
      items: [
        item("instagram", "http://www.instagram.com/samplecreator/?utm_source=profile#bio"),
        item("instagram", "https://instagram.com/samplecreator"),
        item("youtube", "https://youtube.com/@samplecreator/videos?view=0#latest"),
        item("youtube", "https://youtube.com/watch?v=not-a-profile"),
      ],
    }),
    "http://localhost:3000/v/samplecreator",
  );

  assert.deepEqual(jsonLd.mainEntity.sameAs, [
    "https://instagram.com/samplecreator",
    "https://youtube.com/@samplecreator",
  ]);
});

test("removing a social link removes sameAs on the next derived profile output", () => {
  const withSocialLink = buildLinkVitrineProfileJsonLd(
    profile({ items: [item("instagram", "https://instagram.com/samplecreator")] }),
    "http://localhost:3000/v/samplecreator",
  );
  const afterRemoval = buildLinkVitrineProfileJsonLd(
    profile({ items: [] }),
    "http://localhost:3000/v/samplecreator",
  );

  assert.deepEqual(withSocialLink.mainEntity.sameAs, ["https://instagram.com/samplecreator"]);
  assert.equal(Object.hasOwn(afterRemoval.mainEntity, "sameAs"), false);
});

test("schema dates are derived from supplied values and never from render time", () => {
  assert.equal(normalizeLinkVitrineSchemaDate(null), null);
  assert.equal(normalizeLinkVitrineSchemaDate(""), null);
  assert.equal(normalizeLinkVitrineSchemaDate("invalid"), null);
  assert.equal(
    normalizeLinkVitrineSchemaDate("2026-08-20T09:15:30+03:00"),
    "2026-08-20T06:15:30.000Z",
  );
  assert.doesNotMatch(source("src/lib/link-vitrine-seo.ts"), /new Date\(\)/);
});

test("JSON-LD serialization still escapes user-controlled markup", () => {
  const jsonLd = buildLinkVitrineProfileJsonLd(
    profile({ name: "</script><script>alert(1)</script>" }),
    "http://localhost:3000/v/samplecreator",
  );
  const serialized = coreSeoModule.serializeJsonLd(jsonLd);

  assert.equal(serialized.includes("</script>"), false);
  assert.match(serialized, /\\u003c\/script>/);
});

test("canonical, indexability, sitemap timestamp, and save revalidation contracts stay intact", () => {
  const pageSource = source("src/app/v/[handle]/page.tsx");
  const actionSource = source("src/app/dashboard/link-vitrini/actions.ts");
  const vitrineSource = source("src/lib/link-vitrines.ts");
  const sitemapSource = source("src/app/sitemap.ts");

  assert.match(pageSource, /canonicalUrl\(`\/v\/\$\{normalizedHandle \|\| handle\}`\)/);
  assert.match(pageSource, /const title = `\$\{name\} \| TrulyGo Link Vitrini`/);
  assert.match(pageSource, /robots: isVitrineIndexable\(vitrine\) \? PUBLIC_ROBOTS : NO_INDEX_FOLLOW_ROBOTS/);
  assert.match(pageSource, /buildLinkVitrineMetaDescription\(\{ bio: vitrine\.bio, name \}\)/);
  assert.match(pageSource, /buildLinkVitrineProfileJsonLd/);
  assert.doesNotMatch(pageSource, /force-dynamic/);

  assert.match(actionSource, /revalidatePath\(`\/v\/\$\{handle\}`\)/);
  assert.match(actionSource, /revalidatePath\("\/sitemap\.xml"\)/);
  assert.match(actionSource, /existing\?\.handle && existing\.handle !== handle/);
  assert.match(actionSource, /revalidatePath\(`\/v\/\$\{existing\.handle\}`\)/);

  assert.match(vitrineSource, /isVitrineIndexable\(\{/);
  assert.match(vitrineSource, /createdAt: row\.created_at/);
  assert.match(vitrineSource, /updatedAt: row\.updated_at/);
  assert.match(sitemapSource, /validLastModified\(vitrine\.updatedAt\)/);
});
