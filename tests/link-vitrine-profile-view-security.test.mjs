import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  hasTrustedLinkVitrineProfileViewOrigin,
  hasUnexpectedLinkVitrineProfileViewRequestBody,
  isAutomatedLinkVitrineProfileViewRequest,
} from "../src/lib/link-vitrine-profile-view-request.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function sourceFilesUnder(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...sourceFilesUnder(absolutePath));
    } else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

const endpoint = "http://localhost:3000/v/samplecreator/view";
const routeSource = source("src/app/v/[handle]/view/route.ts");
const requestGuardSource = source(
  "src/lib/link-vitrine-profile-view-request.ts",
);
const serverRecorderSource = source(
  "src/lib/link-vitrine-profile-views-server.ts",
);
const visitorSource = source("src/lib/click-visitor.ts");
const adminSource = source("src/lib/supabase/admin.ts");
const trackerSource = source(
  "src/components/link-vitrine-profile-view-tracker.tsx",
);
const transportSource = source(
  "src/lib/link-vitrine-profile-view-transport.ts",
);
const publicViewSource = source("src/components/link-vitrine-public-view.tsx");
const clickEventsSource = source("src/lib/click-events.ts");
const envExampleSource = source(".env.example");
const rateLimitMigrationSource = source(
  "supabase/migrations/20260516130000_rate_limits.sql",
);
const profileViewMigrationSource = source(
  "supabase/migrations/20260724120000_link_vitrine_profile_views.sql",
);
const compactProfileViewMigration = compact(profileViewMigrationSource);

test("profile view POST requires a same-origin browser signal", () => {
  assert.equal(
    hasTrustedLinkVitrineProfileViewOrigin(
      new Request(endpoint, {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
    ),
    true,
  );
  assert.equal(
    hasTrustedLinkVitrineProfileViewOrigin(
      new Request(endpoint, {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
      }),
    ),
    true,
  );
  assert.equal(
    hasTrustedLinkVitrineProfileViewOrigin(
      new Request(endpoint, {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    ),
    false,
  );
  assert.equal(
    hasTrustedLinkVitrineProfileViewOrigin(
      new Request(endpoint, {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      }),
    ),
    false,
  );
  assert.equal(
    hasTrustedLinkVitrineProfileViewOrigin(
      new Request(endpoint, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "sec-fetch-site": "cross-site",
        },
      }),
    ),
    false,
  );
  assert.equal(
    hasTrustedLinkVitrineProfileViewOrigin(
      new Request(endpoint, { method: "POST" }),
    ),
    false,
  );
});

test("profile view POST rejects declared and streamed request bodies", async () => {
  assert.equal(
    await hasUnexpectedLinkVitrineProfileViewRequestBody(
      new Request(endpoint, { method: "POST" }),
    ),
    false,
  );
  assert.equal(
    await hasUnexpectedLinkVitrineProfileViewRequestBody(
      new Request(endpoint, {
        method: "POST",
        headers: { "content-length": "0" },
      }),
    ),
    false,
  );

  for (const contentLength of ["1", "-1", "invalid"]) {
    assert.equal(
      await hasUnexpectedLinkVitrineProfileViewRequestBody(
        new Request(endpoint, {
          method: "POST",
          headers: { "content-length": contentLength },
        }),
      ),
      true,
    );
  }

  assert.equal(
    await hasUnexpectedLinkVitrineProfileViewRequestBody(
      new Request(endpoint, {
        method: "POST",
        headers: {
          "content-length": "0",
          "transfer-encoding": "chunked",
        },
      }),
    ),
    true,
  );
  assert.equal(
    await hasUnexpectedLinkVitrineProfileViewRequestBody(
      new Request(endpoint, {
        method: "POST",
        body: "x",
      }),
    ),
    true,
  );

  const neverEndingBody = new ReadableStream({
    start() {
      // Intentionally never enqueue data or close.
    },
  });
  const probeStartedAt = Date.now();

  assert.equal(
    await hasUnexpectedLinkVitrineProfileViewRequestBody(
      new Request(endpoint, {
        method: "POST",
        body: neverEndingBody,
        duplex: "half",
      }),
    ),
    true,
  );
  assert.ok(Date.now() - probeStartedAt < 250);
});

test("normal and in-app browsers pass while bots, health checks, and previews fail", () => {
  const requestWithUserAgent = (userAgent, extraHeaders = {}) =>
    new Request(endpoint, {
      method: "POST",
      headers: {
        "user-agent": userAgent,
        ...extraHeaders,
      },
    });

  const chrome =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";
  const instagram =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android";
  const facebook =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile [FBAN/FB4A;FBAV/475.0.0.0.0;]";
  const whatsapp =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Mobile WhatsApp/2.24.1";

  assert.equal(
    isAutomatedLinkVitrineProfileViewRequest(requestWithUserAgent(chrome)),
    false,
  );
  assert.equal(
    isAutomatedLinkVitrineProfileViewRequest(requestWithUserAgent(instagram)),
    false,
  );
  assert.equal(
    isAutomatedLinkVitrineProfileViewRequest(requestWithUserAgent(facebook)),
    false,
  );
  assert.equal(
    isAutomatedLinkVitrineProfileViewRequest(requestWithUserAgent(whatsapp)),
    false,
  );

  for (const automatedUserAgent of [
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "facebookexternalhit/1.1",
    "Slackbot-LinkExpanding 1.0",
    "WhatsApp/2.24.1 A",
    "UptimeRobot/2.0",
    "ELB-HealthChecker/2.0",
    "kube-probe/1.30",
    "curl/8.7.1",
    "Mozilla/5.0 HeadlessChrome/126.0",
  ]) {
    assert.equal(
      isAutomatedLinkVitrineProfileViewRequest(
        requestWithUserAgent(automatedUserAgent),
      ),
      true,
      automatedUserAgent,
    );
  }

  assert.equal(
    isAutomatedLinkVitrineProfileViewRequest(
      new Request(endpoint, { method: "POST" }),
    ),
    true,
  );
});

test("all known prefetch signals are filtered", () => {
  const chrome =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

  for (const headers of [
    { purpose: "prefetch" },
    { "sec-purpose": "prefetch;prerender" },
    { "next-router-prefetch": "1" },
    { "x-middleware-prefetch": "1" },
  ]) {
    assert.equal(
      isAutomatedLinkVitrineProfileViewRequest(
        new Request(endpoint, {
          method: "POST",
          headers: { "user-agent": chrome, ...headers },
        }),
      ),
      true,
    );
  }
});

test("route validates before a fail-closed, non-enumerating server write", () => {
  const handleValidationIndex = routeSource.indexOf("hasCanonicalHandle");
  const originValidationIndex = routeSource.indexOf(
    "hasTrustedLinkVitrineProfileViewOrigin(request)",
  );
  const bodyValidationIndex = routeSource.indexOf(
    "hasUnexpectedLinkVitrineProfileViewRequestBody(request)",
  );
  const botValidationIndex = routeSource.indexOf(
    "isAutomatedLinkVitrineProfileViewRequest(request)",
  );
  const hashIndex = routeSource.indexOf(
    "buildLinkVitrineProfileViewVisitorHash",
    botValidationIndex,
  );
  const rateLimitIndex = routeSource.indexOf("checkRateLimit({", hashIndex);
  const recordIndex = routeSource.indexOf(
    "recordLinkVitrineProfileView({",
    rateLimitIndex,
  );

  assert.ok(handleValidationIndex >= 0);
  assert.ok(originValidationIndex > handleValidationIndex);
  assert.ok(bodyValidationIndex > originValidationIndex);
  assert.ok(botValidationIndex > bodyValidationIndex);
  assert.ok(hashIndex > botValidationIndex);
  assert.ok(rateLimitIndex > hashIndex);
  assert.ok(recordIndex > rateLimitIndex);

  assert.match(routeSource, /action: "link-vitrine:profile-view"/);
  assert.match(
    routeSource,
    /const profileViewRateLimitKey = buildLinkVitrineProfileViewRateLimitKey\(\{[^]*ipAddress: clientIp/,
  );
  assert.match(routeSource, /key: profileViewRateLimitKey/);
  assert.doesNotMatch(routeSource, /key: visitorHash/);
  assert.match(routeSource, /mode: "fail-closed"/);
  assert.match(
    routeSource,
    /if \(!isWithinRateLimit\) \{\s*return noContentResponse\(\);\s*\}/,
  );
  assert.match(
    routeSource,
    /await recordLinkVitrineProfileView\(\{\s*handle,\s*visitorHash,\s*\}\);/,
  );
  assert.match(routeSource, /status: 204/);
  assert.match(routeSource, /"cache-control": "no-store"/);
  assert.deepEqual(routeSource.match(/status:\s*\d+/g), ["status: 204"]);
  assert.doesNotMatch(routeSource, /\bafter\(/);
  assert.doesNotMatch(routeSource, /request\.(?:json|text|arrayBuffer)\(/);
  assert.doesNotMatch(routeSource, /itemId|linkVitrineItemId|profileViewCount/);
});

test("profile-scoped hash changes with handle and never exposes source material", () => {
  const profileHashSource = visitorSource.slice(
    visitorSource.indexOf(
      "export function buildLinkVitrineProfileViewVisitorHash",
    ),
  );

  assert.match(profileHashSource, /const visitorKey = buildClickVisitorKey\(\{/);
  assert.match(profileHashSource, /\.update\(canonicalHandle\)/);
  assert.match(profileHashSource, /\.update\(visitorKey\)/);
  assert.match(
    profileHashSource,
    /return `\$\{profileViewVisitorHashVersion\}:\$\{visitorKind\}:\$\{digest\}`/,
  );
  assert.match(visitorSource, /process\.env\.CLICK_VISITOR_HASH_SECRET/);
  assert.doesNotMatch(visitorSource, /NEXT_PUBLIC_CLICK_VISITOR_HASH_SECRET/);
  assert.doesNotMatch(profileHashSource, /return .*ipAddress|return .*userAgent/);

  assert.match(
    profileViewMigrationSource,
    /\^pv1:\(cookie\|fallback\):\[A-Za-z0-9_-\]\{43\}\$/,
  );
});

test("abuse rate limit is profile-and-IP scoped independently from tg_vid", () => {
  const rateLimitKeySource = visitorSource.slice(
    visitorSource.indexOf(
      "export function buildLinkVitrineProfileViewRateLimitKey",
    ),
  );

  assert.match(rateLimitKeySource, /normalizedIpAddress = ipAddress\?\.trim\(\)/);
  assert.match(
    rateLimitKeySource,
    /\["link-vitrine-profile-view-rate-limit", canonicalHandle, normalizedIpAddress\]/,
  );
  assert.match(rateLimitKeySource, /return hashVisitorMaterial\(/);
  assert.doesNotMatch(rateLimitKeySource, /cookieHeader|visitorKey/);
  assert.doesNotMatch(routeSource, /key: `\$\{clientIp/);
});

test("server recorder is admin-only and client bundles contain no credentials or RPC", () => {
  assert.match(serverRecorderSource, /^import "server-only";/);
  assert.match(adminSource, /^import "server-only";/);
  assert.match(serverRecorderSource, /createAdminClient\(\)/);
  assert.doesNotMatch(serverRecorderSource, /createAnonymousClient/);
  assert.match(
    serverRecorderSource,
    /"record_link_vitrine_profile_view"/,
  );
  assert.match(serverRecorderSource, /p_handle: canonicalHandle/);
  assert.match(serverRecorderSource, /p_visitor_hash: visitorHash/);
  assert.doesNotMatch(
    serverRecorderSource,
    /p_vitrine_id|p_user_id|p_ip|p_user_agent|profile_view_count/,
  );

  for (const clientSource of [
    trackerSource,
    transportSource,
    publicViewSource,
  ]) {
    assert.doesNotMatch(
      clientSource,
      /SUPABASE_SERVICE_ROLE_KEY|CLICK_VISITOR_HASH_SECRET|createAdminClient|\.rpc\(/,
    );
  }

  assert.match(envExampleSource, /^SUPABASE_SERVICE_ROLE_KEY=$/m);
  assert.match(envExampleSource, /^CLICK_VISITOR_HASH_SECRET=$/m);
  assert.doesNotMatch(
    envExampleSource,
    /NEXT_PUBLIC_(?:SUPABASE_SERVICE_ROLE_KEY|CLICK_VISITOR_HASH_SECRET)/,
  );
  assert.doesNotMatch(clickEventsSource, /createAdminClient/);
  assert.match(clickEventsSource, /export async function recordLinkClick/);

  const clientModules = sourceFilesUnder(path.join(projectRoot, "src"))
    .map((filePath) => ({
      filePath,
      contents: readFileSync(filePath, "utf8"),
    }))
    .filter(({ contents }) => /^\s*["']use client["'];/m.test(contents));

  assert.ok(clientModules.length > 0);
  for (const { filePath, contents } of clientModules) {
    assert.doesNotMatch(
      contents,
      /SUPABASE_SERVICE_ROLE_KEY|CLICK_VISITOR_HASH_SECRET|createAdminClient|record_link_vitrine_profile_view/,
      path.relative(projectRoot, filePath),
    );
  }
});

test("database stores only hashes and denies direct profile-view table access", () => {
  assert.match(
    rateLimitMigrationSource,
    /key_hash text not null/,
  );
  assert.match(
    rateLimitMigrationSource,
    /hashed_key := pg_catalog\.encode\([^]*pg_catalog\.sha256\(/,
  );
  assert.doesNotMatch(
    rateLimitMigrationSource.match(
      /create table if not exists public\.rate_limits \([^]*?\n\);/,
    )?.[0] ?? "",
    /\bip_address\b|\braw_ip\b/i,
  );

  assert.match(
    compactProfileViewMigration,
    /revoke all on table public\.link_vitrine_profile_views from public, anon, authenticated, service_role;/,
  );
  assert.match(
    compactProfileViewMigration,
    /revoke all on table public\.link_vitrine_profile_view_totals from public, anon, authenticated, service_role;/,
  );
  assert.match(
    compactProfileViewMigration,
    /revoke all on function public\.record_link_vitrine_profile_view\(text, text\) from public, anon, authenticated, service_role;/,
  );
  assert.match(
    compactProfileViewMigration,
    /grant execute on function public\.record_link_vitrine_profile_view\(text, text\) to service_role;/,
  );
  assert.doesNotMatch(
    compactProfileViewMigration,
    /grant execute on function public\.record_link_vitrine_profile_view\(text, text\) to (?:public|anon|authenticated)/,
  );
});

test("request guard stays conservative without blocking browser-shaped in-app UAs", () => {
  assert.match(
    requestGuardSource,
    /mozilla\\\/5\\\.0[^]*HUMAN_IN_APP_BROWSER_PATTERN/,
  );
  assert.match(
    requestGuardSource,
    /facebookexternalhit[^]*uptimerobot[^]*health\.\?check[^]*kube-probe/,
  );
  assert.doesNotMatch(requestGuardSource, /instagram\|facebookexternalhit/);
});
