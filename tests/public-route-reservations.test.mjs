import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildChannelSlug,
  reservedSlugs,
  validateRequestedSlug,
} from "../src/lib/slugs.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = path.join(projectRoot, "src", "app");
const edgeFunctionPath = path.join(
  projectRoot,
  "supabase",
  "functions",
  "auto-approve-link-request",
  "index.ts",
);
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260819120000_reserve_rehberler_route.sql",
);

const expectedCurrentTopLevelRoutes = [
  "acik-riza-metni",
  "admin",
  "anket-olusturucu",
  "api",
  "auth",
  "bitly-alternatifi",
  "cerez-politikasi",
  "dashboard",
  "forgot-password",
  "kampanya-linki-olusturma",
  "kanal-linki-olusturma",
  "kvkk-basvurusu",
  "link-kisaltma",
  "link-vitrini",
  "login",
  "not-approved",
  "opengraph-image",
  "privacy",
  "qr-kod-olusturucu",
  "register",
  "rehberler",
  "reset-password",
  "signal",
  "terms",
  "utm-link-olusturucu",
  "v",
  "whatsapp-link-olusturucu",
];
const legacySystemReservations = ["s", "static"];
const extensionMetadataRoutes = ["icon.svg", "robots.txt", "sitemap.xml"];
const acceptedSlugPattern = /^[a-z0-9-]{2,80}$/;
const staticRouteSegmentPattern = /^[a-z0-9-]{1,80}$/;
const routeEndpointPattern = /^(?:page|route)\.(?:js|jsx|ts|tsx)$/;

function sorted(values) {
  return [...values].sort();
}

function discoverTopLevelRouteSlugs() {
  const routeSlugs = new Set();

  function visit(directory, topLevelSlug = null) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isFile()) {
        if (topLevelSlug && routeEndpointPattern.test(entry.name)) {
          routeSlugs.add(topLevelSlug);
        }

        if (
          !topLevelSlug &&
          directory === appDirectory &&
          /^(?:opengraph-image|twitter-image|icon|apple-icon)\.(?:js|jsx|ts|tsx)$/.test(entry.name)
        ) {
          routeSlugs.add(entry.name.replace(/\.(?:js|jsx|ts|tsx)$/, ""));
        }

        continue;
      }

      if (!entry.isDirectory()) {
        continue;
      }

      if (topLevelSlug) {
        visit(entryPath, topLevelSlug);
        continue;
      }

      const isRouteGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      const isParallelRoute = entry.name.startsWith("@");

      if (isRouteGroup || isParallelRoute) {
        visit(entryPath);
        continue;
      }

      const isDynamicRoute = entry.name.startsWith("[") && entry.name.endsWith("]");

      if (!isDynamicRoute && staticRouteSegmentPattern.test(entry.name)) {
        visit(entryPath, entry.name);
      }
    }
  }

  visit(appDirectory);
  return sorted(routeSlugs);
}

function extractEdgeReservedSlugs(source) {
  const match = source.match(/const reservedSlugs = new Set\(\[([\s\S]*?)\]\);/);

  assert.ok(match, "Edge Function reservedSlugs set could not be found");
  return [...match[1].matchAll(/"([a-z0-9-]+)"/g)].map((value) => value[1]);
}

function extractMigrationReservedLists(source) {
  return [
    ...source.matchAll(
      /lower\((?:requested_slug|slug)\)\s+(?:not\s+)?in\s*\(([\s\S]*?)\n\s*\)/gi,
    ),
  ].map((match) => [...match[1].matchAll(/'([a-z0-9-]+)'/g)].map((value) => value[1]));
}

test("route inventory includes every current top-level static namespace", () => {
  assert.deepEqual(discoverTopLevelRouteSlugs(), expectedCurrentTopLevelRoutes);
});

test("extension metadata routes cannot collide with the accepted user slug format", () => {
  for (const route of extensionMetadataRoutes) {
    assert.equal(acceptedSlugPattern.test(route), false);
  }
});

test("app reservations are the canonical union of current and legacy namespaces", () => {
  const expectedCanonicalSlugs = sorted([
    ...expectedCurrentTopLevelRoutes,
    ...legacySystemReservations,
  ]);

  assert.equal(new Set(reservedSlugs).size, reservedSlugs.length, "app list contains duplicates");
  assert.deepEqual(sorted(reservedSlugs), expectedCanonicalSlugs);
});

test("new and previously drifted SEO routes are reserved", () => {
  for (const slug of [
    "kanal-linki-olusturma",
    "anket-olusturucu",
    "link-kisaltma",
    "opengraph-image",
    "rehberler",
  ]) {
    assert.ok(reservedSlugs.includes(slug), `${slug} must remain reserved`);
  }
});

test("normal user slug validation behavior is preserved", () => {
  assert.deepEqual(validateRequestedSlug(" Yaz Kampanyas\u0131 2026 "), {
    slug: "yaz-kampanyasi-2026",
    error: null,
  });
  assert.deepEqual(validateRequestedSlug(""), { slug: null, error: null });
  assert.deepEqual(validateRequestedSlug("a"), { slug: null, error: "invalid_slug" });
  assert.deepEqual(validateRequestedSlug("a".repeat(81)), {
    slug: null,
    error: "invalid_slug",
  });
});

test("reserved slugs and their case variants are rejected after normalization", () => {
  for (const slug of reservedSlugs.filter((value) => acceptedSlugPattern.test(value))) {
    assert.deepEqual(validateRequestedSlug(slug.toUpperCase()), {
      slug: null,
      error: "reserved_slug",
    });
  }

  assert.deepEqual(validateRequestedSlug("Kanal Linki Olu\u015fturma"), {
    slug: null,
    error: "reserved_slug",
  });
  assert.deepEqual(validateRequestedSlug("S"), { slug: null, error: "invalid_slug" });
  assert.deepEqual(validateRequestedSlug("V"), { slug: null, error: "invalid_slug" });
});

test("channel slug generation keeps normal behavior and rejects reserved final slugs", () => {
  assert.equal(buildChannelSlug("kampanyam", "instagram"), "kampanyam-instagram");
  assert.equal(buildChannelSlug("kanal-linki", "olusturma"), null);
  assert.equal(buildChannelSlug("opengraph", "image"), null);
});

test("Edge Function reservations match the app canonical list", () => {
  const edgeSource = readFileSync(edgeFunctionPath, "utf8");
  const edgeReservedSlugs = extractEdgeReservedSlugs(edgeSource);

  assert.equal(new Set(edgeReservedSlugs).size, edgeReservedSlugs.length, "Edge list contains duplicates");
  assert.deepEqual(sorted(edgeReservedSlugs), sorted(reservedSlugs));
  assert.ok(
    edgeSource.includes(
      "return /^[a-z0-9-]{2,80}$/.test(value) && !reservedSlugs.has(value);",
    ),
    "stored-slug validation must enforce the Edge reserved set",
  );
  assert.ok(
    edgeSource.includes("if (!isValidStoredSlug(linkRequest.requested_slug))"),
    "the approval handler must keep invoking stored-slug validation",
  );
});

test("migration prechecks and both table constraints match the app canonical list", () => {
  const migrationSource = readFileSync(migrationPath, "utf8");
  const migrationReservedLists = extractMigrationReservedLists(migrationSource);

  assert.equal(migrationReservedLists.length, 4);

  for (const migrationReservedSlugs of migrationReservedLists) {
    assert.equal(
      new Set(migrationReservedSlugs).size,
      migrationReservedSlugs.length,
      "migration list contains duplicates",
    );
    assert.deepEqual(sorted(migrationReservedSlugs), sorted(reservedSlugs));
  }
});

test("migration fails closed without modifying table rows", () => {
  const migrationSource = readFileSync(migrationPath, "utf8");
  const executableSql = migrationSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");

  assert.match(executableSql, /lock table public\.link_requests, public\.channel_links/i);
  assert.match(executableSql, /raise exception using[\s\S]*errcode = '23514'/i);
  assert.doesNotMatch(executableSql, /raise notice/i);
  assert.match(
    executableSql,
    /validate constraint link_requests_requested_slug_seo_reserved_check/i,
  );
  assert.match(executableSql, /validate constraint channel_links_slug_seo_reserved_check/i);
  assert.doesNotMatch(
    executableSql,
    /\b(?:insert|update|delete|merge|truncate|copy|execute)\b/i,
  );
});
