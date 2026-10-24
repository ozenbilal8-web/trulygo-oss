import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import * as collaborationCore from "../src/lib/link-vitrine-collaboration.ts";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const nativeRequire = createRequire(import.meta.url);

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadTypeScriptModule(relativePath, stubs = {}) {
  const absolutePath = path.join(projectRoot, relativePath);
  const transpiled = ts.transpileModule(source(relativePath), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absolutePath,
  }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (id) => {
    if (Object.hasOwn(stubs, id)) {
      return stubs[id];
    }
    return nativeRequire(id);
  };
  const execute = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    transpiled,
  );
  execute(
    localRequire,
    compiledModule,
    compiledModule.exports,
    absolutePath,
    path.dirname(absolutePath),
  );
  return compiledModule.exports;
}

const requestModule = loadTypeScriptModule(
  "src/lib/link-vitrine-collaboration-request.ts",
  {
    "@/lib/link-vitrine-collaboration": collaborationCore,
  },
);
const transactionalEmailTemplateModule = loadTypeScriptModule(
  "src/lib/transactional-email-template.ts",
);
const emailTemplateModule = loadTypeScriptModule(
  "src/lib/link-vitrine-collaboration-email-template.ts",
  {
    "@/lib/link-vitrine-collaboration": collaborationCore,
    "@/lib/transactional-email-template": transactionalEmailTemplateModule,
  },
);
const hashModule = loadTypeScriptModule(
  "src/lib/link-vitrine-collaboration-hash.ts",
  {
    "server-only": {},
    "@/lib/link-vitrine-config": {
      normalizeVitrineHandle(value) {
        return typeof value === "string"
          ? value
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 32)
          : "";
      },
    },
    "@/lib/link-vitrine-collaboration-request": requestModule,
  },
);
const emailServerModule = loadTypeScriptModule(
  "src/lib/link-vitrine-collaboration-email-server.ts",
  {
    "server-only": {},
    "@/lib/link-vitrine-collaboration-email-template": emailTemplateModule,
  },
);

const validPayload = {
  senderName: "Ada Lovelace",
  senderEmail: "ada@example.com",
  senderPhone: "+90 555 111 22 33",
  requestType: "sponsorship",
  budgetAmount: "12500.50",
  budgetCurrency: "TRY",
  subject: "Yaz lansmanı sponsorluğu",
  message:
    "Yeni ürün lansmanımız için uzun vadeli bir içerik ortaklığı önermek istiyoruz.",
  website: "",
  challenge: "challenge-placeholder",
};

const migrationSource = source(
  "supabase/migrations/20260724140000_link_vitrine_collaboration_requests.sql",
);
const notificationsMigrationSource = source(
  "supabase/migrations/20260725120000_link_vitrine_collaboration_notifications.sql",
);
const notificationsRollbackSource = source(
  "supabase/rollbacks/20260725120000_disable_link_vitrine_collaboration_notifications.sql",
);
const routeSource = source(
  "src/app/v/[handle]/collaboration-request/route.ts",
);
const publicPageSource = source("src/app/v/[handle]/page.tsx");
const publicViewSource = source("src/components/link-vitrine-public-view.tsx");
const ctaSource = source("src/components/link-vitrine-collaboration-cta.tsx");
const editorSource = source(
  "src/components/link-vitrine-collaboration-editor.tsx",
);
const actionsSource = source(
  "src/app/dashboard/link-vitrini/collaboration-actions.ts",
);
const collaborationDataSource = source(
  "src/lib/link-vitrine-collaboration-data.ts",
);
const collaborationSettingsServerSource = source(
  "src/lib/link-vitrine-collaboration-settings-server.ts",
);
const collaborationSettingsServerModule = loadTypeScriptModule(
  "src/lib/link-vitrine-collaboration-settings-server.ts",
  {
    "server-only": {},
    "@/lib/link-vitrine-collaboration": collaborationCore,
    "@/lib/link-vitrine-collaboration-data": {
      mapCollaborationSettings(row) {
        return {
          vitrineId: row.vitrine_id,
          requestsEnabled: Boolean(row.requests_enabled),
          notificationEmail: collaborationCore.normalizeCollaborationEmail(
            row.notification_email,
          ),
          notificationEmailVerifiedAt: null,
          verificationRequestedAt: null,
          verificationExpiresAt: null,
          verificationStatus: "unverified",
        };
      },
    },
    "@/lib/link-vitrine-collaboration-hash": {
      buildCollaborationOwnerRateLimitHash: () => "owner-rate-key",
    },
    "@/lib/rate-limit": {
      checkRateLimit: async () => true,
    },
  },
);
const detailModalSource = source(
  "src/components/link-vitrine-collaboration-request-detail-modal.tsx",
);
const headerNotificationsSource = source(
  "src/components/site-header-collaboration-notifications.tsx",
);
const siteHeaderSource = source("src/components/site-header.tsx");
const linkVitrinePageSource = source(
  "src/app/dashboard/link-vitrini/new/page.tsx",
);
const linkVitrineEditorSource = source(
  "src/app/dashboard/link-vitrini/link-vitrini-editor.tsx",
);
const linkVitrineActionsSource = source(
  "src/app/dashboard/link-vitrini/actions.ts",
);
const globalStylesSource = source("src/app/globals.css");
const verificationRouteSource = source(
  "src/app/api/link-vitrini/collaboration/verify-email/route.ts",
);

function allClientSources() {
  const files = [];
  const root = path.join(projectRoot, "src");

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
        const contents = readFileSync(absolutePath, "utf8");
        if (/^\s*["']use client["'];/m.test(contents)) {
          files.push({ absolutePath, contents });
        }
      }
    }
  }

  walk(root);
  return files;
}

test("notification email normalization is bounded and rejects header injection", () => {
  assert.equal(
    collaborationCore.normalizeCollaborationEmail("  ADA@EXAMPLE.COM "),
    "ada@example.com",
  );
  assert.equal(
    collaborationCore.isValidCollaborationEmail("ada@example.com"),
    true,
  );
  assert.equal(
    collaborationCore.isValidCollaborationEmail(
      "ada@example.com\r\nBcc:evil@example.com",
    ),
    false,
  );
});

test("collaboration boolean parser preserves false and distinguishes missing values", () => {
  assert.equal(
    collaborationCore.parseLinkVitrineCollaborationBoolean(true),
    true,
  );
  assert.equal(
    collaborationCore.parseLinkVitrineCollaborationBoolean("true"),
    true,
  );
  assert.equal(
    collaborationCore.parseLinkVitrineCollaborationBoolean(false),
    false,
  );
  assert.equal(
    collaborationCore.parseLinkVitrineCollaborationBoolean("false"),
    false,
  );
  assert.equal(
    collaborationCore.parseLinkVitrineCollaborationBoolean(null),
    undefined,
  );
  assert.equal(
    collaborationCore.parseLinkVitrineCollaborationBoolean(undefined),
    undefined,
  );
});

test("shared collaboration persistence round-trips true, false, true and verifies the returned value", async () => {
  const rpcCalls = [];
  const supabase = {
    async rpc(name, payload) {
      rpcCalls.push({ name, payload });
      return {
        data: [
          {
            vitrine_id: payload.p_vitrine_id,
            requests_enabled: payload.p_requests_enabled,
            notification_email: payload.p_notification_email,
          },
        ],
        error: null,
      };
    },
  };
  const requestedStates = [true, false, true];

  for (const requestsEnabled of requestedStates) {
    const settings =
      await collaborationSettingsServerModule.persistOwnedLinkVitrineCollaborationSettings(
        {
          notificationEmail: "ADA@EXAMPLE.COM",
          requestsEnabled,
          supabase,
          vitrineId: "4bca9a23-3d1d-4f94-87ea-11f03fd8f22e",
        },
      );

    assert.equal(settings.requestsEnabled, requestsEnabled);
  }

  assert.deepEqual(
    rpcCalls.map((call) => call.payload.p_requests_enabled),
    requestedStates,
  );
  assert.ok(
    rpcCalls.every(
      (call) =>
        call.name ===
          "save_current_user_link_vitrine_collaboration_settings" &&
        call.payload.p_notification_email === "ada@example.com" &&
        call.payload.p_vitrine_id ===
          "4bca9a23-3d1d-4f94-87ea-11f03fd8f22e",
    ),
  );

  const mismatchedSupabase = {
    async rpc(name, payload) {
      return {
        data: [
          {
            vitrine_id: payload.p_vitrine_id,
            requests_enabled: !payload.p_requests_enabled,
            notification_email: payload.p_notification_email,
          },
        ],
        error: null,
      };
    },
  };
  const mismatchedSettings =
    await collaborationSettingsServerModule.persistOwnedLinkVitrineCollaborationSettings(
      {
        notificationEmail: "ada@example.com",
        requestsEnabled: false,
        supabase: mismatchedSupabase,
        vitrineId: "4bca9a23-3d1d-4f94-87ea-11f03fd8f22e",
      },
    );

  assert.equal(mismatchedSettings, null);
});

test("reply mailto encodes URI-reserved local-part characters", () => {
  const email = "foo?bcc=attacker%40evil.com&x=@example.com";
  assert.equal(collaborationCore.isValidCollaborationEmail(email), true);

  const href = collaborationCore.buildCollaborationReplyMailto({
    email,
    subject: "Teklif yanıtı",
  });

  assert.ok(href);
  assert.equal(href.indexOf("?"), href.lastIndexOf("?"));
  assert.doesNotMatch(href, /\?bcc=|&x=/i);
  assert.match(href, /foo%3Fbcc%3Dattacker%2540evil\.com%26x%3D@example\.com/);
});

test("request and currency allowlists reject unknown values", () => {
  assert.equal(
    collaborationCore.isLinkVitrineCollaborationRequestType("sponsorship"),
    true,
  );
  assert.equal(
    collaborationCore.isLinkVitrineCollaborationRequestType("admin"),
    false,
  );
  assert.equal(
    collaborationCore.isLinkVitrineCollaborationBudgetCurrency("TRY"),
    true,
  );
  assert.equal(
    collaborationCore.isLinkVitrineCollaborationBudgetCurrency("BTC"),
    false,
  );
});

test("notification badge labels hide zero and cap counts above nine", () => {
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationBadgeLabel(0),
    null,
  );
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationBadgeLabel(1),
    "1",
  );
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationBadgeLabel(9),
    "9",
  );
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationBadgeLabel(10),
    "9+",
  );
});

test("notification subjects use a safe fallback and remain bounded", () => {
  const fallback = "\u0130\u015f birli\u011fi talebi";

  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationSubject(null),
    fallback,
  );
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationSubject("   "),
    fallback,
  );
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationSubject(
      "  Yeni kampanya  ",
    ),
    "Yeni kampanya",
  );
  assert.equal(
    collaborationCore.getLinkVitrineCollaborationNotificationSubject(
      "x".repeat(200),
    ).length,
    150,
  );
});

test("notification summaries are newest-first, deterministic, and capped at twenty", () => {
  const requests = Array.from({ length: 25 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    subject: `Talep ${index}`,
    status: index % 2 === 0 ? "new" : "read",
    createdAt: new Date(Date.UTC(2026, 6, 1, 0, index)).toISOString(),
  })).reverse();
  const originalOrder = requests.map((request) => request.subject);
  const newest =
    collaborationCore.getNewestLinkVitrineCollaborationNotifications(requests);

  assert.equal(newest.length, 20);
  assert.equal(newest[0].subject, "Talep 24");
  assert.equal(newest.at(-1).subject, "Talep 5");
  assert.deepEqual(
    requests.map((request) => request.subject),
    originalOrder,
    "the helper must not mutate caller-owned arrays",
  );

  const sameTimestamp = "2026-07-25T12:00:00.000Z";
  const tied =
    collaborationCore.getNewestLinkVitrineCollaborationNotifications([
      {
        id: "00000000-0000-4000-8000-000000000001",
        subject: "Bir",
        status: "read",
        createdAt: sameTimestamp,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        subject: "\u0130ki",
        status: "read",
        createdAt: sameTimestamp,
      },
    ]);
  assert.deepEqual(
    tied.map((request) => request.subject),
    ["\u0130ki", "Bir"],
  );
});

test("availability UI is false unless enabled and verified", () => {
  assert.match(
    publicViewSource,
    /collaborationAvailable \? \(\s*<LinkVitrineCollaborationCta/,
  );
  assert.match(
    editorSource,
    /requestsEnabled && verificationStatus === "verified"/,
  );
});

test("public page passes only an effective collaboration boolean", () => {
  assert.match(
    publicPageSource,
    /getPublicLinkVitrineCollaborationAvailability\(vitrine\.handle\)/,
  );
  assert.doesNotMatch(
    publicPageSource,
    /notificationEmail|notification_email|senderEmail|sender_email/,
  );
  assert.match(
    ctaSource,
    /handle: string;\s*preview\?: boolean;\s*theme: LinkVitrineTheme;/,
  );
});

test("valid form data is normalized and accepted", () => {
  const result =
    requestModule.validateLinkVitrineCollaborationRequest(validPayload);
  assert.equal(result.ok, true);
  assert.equal(result.honeypot, false);
  assert.equal(result.data.senderEmail, "ada@example.com");
  assert.equal(result.data.budgetAmount, "12500.50");
});

test("negative and over-precision budgets are rejected", () => {
  for (const budgetAmount of ["-1", "12.345", "1e4"]) {
    const result = requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      budgetAmount,
    });
    assert.equal(result.ok, false);
  }
});

test("empty budget cannot smuggle a currency and populated budget requires one", () => {
  assert.equal(
    requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      budgetAmount: null,
      budgetCurrency: "TRY",
    }).ok,
    false,
  );
  assert.equal(
    requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      budgetAmount: "10",
      budgetCurrency: null,
    }).ok,
    false,
  );
});

test("database budget guards explicitly reject a missing currency", () => {
  assert.match(
    migrationSource,
    /budget_amount is not null\s+and budget_amount >= 0\s+and budget_currency is not null\s+and budget_currency in/,
  );
  assert.match(
    migrationSource,
    /p_budget_amount is not null\s+and \(\s*p_budget_amount !~[^]*?or p_budget_currency is null\s+or p_budget_currency not in/,
  );
});

test("all public form length boundaries are enforced server-side", () => {
  assert.equal(
    requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      senderName: "x".repeat(101),
    }).ok,
    false,
  );
  assert.equal(
    requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      subject: "x".repeat(151),
    }).ok,
    false,
  );
  assert.equal(
    requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      message: "too short",
    }).ok,
    false,
  );
  assert.equal(
    requestModule.validateLinkVitrineCollaborationRequest({
      ...validPayload,
      message: "x".repeat(3001),
    }).ok,
    false,
  );
});

test("header newlines, control characters, and bidi overrides are rejected", () => {
  for (const patch of [
    { senderName: "Ada\r\nBcc:test@example.com" },
    { subject: "Normal\u202eexe" },
    { message: `${validPayload.message}\u0007` },
  ]) {
    assert.equal(
      requestModule.validateLinkVitrineCollaborationRequest({
        ...validPayload,
        ...patch,
      }).ok,
      false,
    );
  }
});

test("honeypot returns a generic success shape without validated data", () => {
  const result = requestModule.validateLinkVitrineCollaborationRequest({
    website: "https://spam.example",
  });
  assert.deepEqual(result, { ok: true, data: null, honeypot: true });
  assert.match(routeSource, /if \(validation\.honeypot\)[^]*\{ ok: true \}/);
});

test("same-origin guard requires an exact origin and rejects cross-site fetches", () => {
  const endpoint =
    "http://localhost:3000/v/ada/collaboration-request";
  assert.equal(
    requestModule.isSameOriginCollaborationRequest(
      endpoint,
      new Headers({
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      }),
    ),
    true,
  );
  assert.equal(
    requestModule.isSameOriginCollaborationRequest(
      endpoint,
      new Headers({
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      }),
    ),
    false,
  );
});

test("content type accepts only JSON and optional UTF-8 charset", () => {
  assert.equal(
    requestModule.isJsonCollaborationRequest(
      new Headers({ "content-type": "application/json" }),
    ),
    true,
  );
  assert.equal(
    requestModule.isJsonCollaborationRequest(
      new Headers({ "content-type": "text/plain" }),
    ),
    false,
  );
});

test("browser-shaped in-app user agents pass while automation is blocked", () => {
  assert.equal(
    requestModule.isAutomatedCollaborationRequest(
      new Headers({
        "user-agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit Instagram 330.0",
      }),
    ),
    false,
  );
  assert.equal(
    requestModule.isAutomatedCollaborationRequest(
      new Headers({ "user-agent": "curl/8.7.1" }),
    ),
    true,
  );
});

test("bounded body reader accepts valid JSON below the limit", async () => {
  const request = new Request("http://localhost:3000/test", {
    method: "POST",
    body: JSON.stringify({ hello: "world" }),
  });
  assert.deepEqual(await requestModule.readCollaborationJsonBody(request), {
    hello: "world",
  });
});

test("bounded body reader rejects oversized and malformed JSON", async () => {
  const oversized = new Request("http://localhost:3000/test", {
    method: "POST",
    body: JSON.stringify({ value: "x".repeat(17 * 1024) }),
  });
  const malformed = new Request("http://localhost:3000/test", {
    method: "POST",
    body: "{broken",
  });
  assert.equal(
    await requestModule.readCollaborationJsonBody(oversized),
    null,
  );
  assert.equal(
    await requestModule.readCollaborationJsonBody(malformed),
    null,
  );
});

test("signed challenge rejects too-fast, expired, and tampered submissions", () => {
  const previousSecret = process.env.CLICK_VISITOR_HASH_SECRET;
  process.env.CLICK_VISITOR_HASH_SECRET = "test-secret-with-enough-entropy";
  try {
    const issuedAt = 1_700_000_000_000;
    const challenge = hashModule.createCollaborationChallenge(
      "ada-lovelace",
      issuedAt,
    );
    assert.equal(
      hashModule.verifyCollaborationChallenge({
        challenge,
        handle: "ada-lovelace",
        now: issuedAt + 2_999,
      }),
      false,
    );
    assert.equal(
      hashModule.verifyCollaborationChallenge({
        challenge,
        handle: "ada-lovelace",
        now: issuedAt + 3_000,
      }),
      true,
    );
    assert.equal(
      hashModule.verifyCollaborationChallenge({
        challenge,
        handle: "ada-lovelace",
        now: issuedAt + 2 * 60 * 60 * 1_000 + 1,
      }),
      false,
    );
    assert.equal(
      hashModule.verifyCollaborationChallenge({
        challenge: `${challenge}x`,
        handle: "ada-lovelace",
        now: issuedAt + 4_000,
      }),
      false,
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CLICK_VISITOR_HASH_SECRET;
    } else {
      process.env.CLICK_VISITOR_HASH_SECRET = previousSecret;
    }
  }
});

test("collaboration hashes use distinct domains and never expose raw IP or email", () => {
  const previousSecret = process.env.CLICK_VISITOR_HASH_SECRET;
  process.env.CLICK_VISITOR_HASH_SECRET = "test-secret-with-enough-entropy";
  try {
    const visitorHash = hashModule.buildCollaborationVisitorHash({
      handle: "ada-lovelace",
      ipAddress: "203.0.113.5",
    });
    const emailHash = hashModule.buildCollaborationEmailRateLimitHash({
      handle: "ada-lovelace",
      email: "ada@example.com",
    });
    assert.match(visitorHash, /^cr1:visitor:[A-Za-z0-9_-]{43}$/);
    assert.match(emailHash, /^cr1:email:[A-Za-z0-9_-]{43}$/);
    assert.doesNotMatch(visitorHash, /203\.0\.113\.5/);
    assert.doesNotMatch(emailHash, /ada@example\.com/);
    assert.notEqual(visitorHash, emailHash);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CLICK_VISITOR_HASH_SECRET;
    } else {
      process.env.CLICK_VISITOR_HASH_SECRET = previousSecret;
    }
  }
});

test("verification tokens are random, hashed, expiring, and never stored raw", () => {
  const previousSecret = process.env.CLICK_VISITOR_HASH_SECRET;
  process.env.CLICK_VISITOR_HASH_SECRET = "test-secret-with-enough-entropy";
  try {
    const first = hashModule.createCollaborationVerificationToken();
    const second = hashModule.createCollaborationVerificationToken();
    assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
    assert.match(first.tokenHash, /^cr1:verify:[A-Za-z0-9_-]{43}$/);
    assert.notEqual(first.token, second.token);
    assert.doesNotMatch(migrationSource, /\btoken\b\s+text/i);
    assert.match(migrationSource, /expires_at > statement_timestamp\(\)/);
    assert.match(migrationSource, /consumed_at is null/);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CLICK_VISITOR_HASH_SECRET;
    } else {
      process.env.CLICK_VISITOR_HASH_SECRET = previousSecret;
    }
  }
});

test("email change clears verification and consumes every prior active token", () => {
  assert.match(
    migrationSource,
    /if tg_op = 'INSERT' then[^]*?elsif new\.notification_email is distinct from old\.notification_email then/,
  );
  assert.doesNotMatch(
    migrationSource,
    /if tg_op = 'INSERT'\s+or[^]*?old\.notification_email/,
  );
  assert.match(
    migrationSource,
    /new\.notification_email is distinct from old\.notification_email[^]*?update public\.link_vitrine_collaboration_email_verifications[^]*?consumed_at = statement_timestamp\(\)/,
  );
  assert.match(
    migrationSource,
    /new\.notification_email_verified_at := null/,
  );
});

test("public RPC requires published, enabled, and verified settings", () => {
  assert.match(
    migrationSource,
    /get_public_link_vitrine_collaboration_availability[^]*?link_vitrines\.is_published = true[^]*?settings\.requests_enabled = true[^]*?settings\.notification_email_verified_at is not null/,
  );
});

test("public endpoint resolves the profile inside a service-role-only RPC", () => {
  assert.match(
    migrationSource,
    /create_link_vitrine_collaboration_request[^]*?where link_vitrines\.handle = normalized_handle[^]*?link_vitrines\.is_published = true/,
  );
  assert.match(
    migrationSource,
    /grant execute on function public\.create_link_vitrine_collaboration_request[^]*?to service_role/,
  );
  assert.doesNotMatch(
    migrationSource,
    /grant execute on function public\.create_link_vitrine_collaboration_request[^]*?to anon/,
  );
});

test("all private tables deny direct anon and authenticated access", () => {
  for (const table of [
    "link_vitrine_collaboration_settings",
    "link_vitrine_collaboration_email_verifications",
    "link_vitrine_collaboration_requests",
  ]) {
    assert.match(
      migrationSource,
      new RegExp(
        `alter table public\\.${table} enable row level security;[^]*?revoke all on table public\\.${table}[\\s\\S]*?from public, anon, authenticated, service_role;`,
      ),
    );
  }
  assert.doesNotMatch(
    migrationSource,
    /grant\s+(?:insert|update|delete|select)[^;]*link_vitrine_collaboration_requests[^;]*anon/i,
  );
});

test("owner settings and request reads derive identity only from auth.uid", () => {
  assert.match(
    migrationSource,
    /get_current_user_link_vitrine_collaboration_settings\(\)[^]*?auth\.uid\(\)/,
  );
  assert.match(
    migrationSource,
    /get_current_user_link_vitrine_collaboration_request_summaries[^]*?auth\.uid\(\)/,
  );
  assert.match(
    migrationSource,
    /get_current_user_link_vitrine_collaboration_request_detail[^]*?auth\.uid\(\)/,
  );
});

test("notification RPC is parameterless and returns only the minimal owner snapshot", () => {
  const returnTable = notificationsMigrationSource.match(
    /get_current_user_link_vitrine_collaboration_notifications\(\)\s*returns table\s*\(([^]*?)\)\s*language sql/,
  );

  assert.ok(returnTable);
  assert.deepEqual(
    returnTable[1]
      .split(",")
      .map((column) => column.trim().split(/\s+/)[0]),
    [
      "has_vitrine",
      "request_id",
      "subject",
      "status",
      "created_at",
      "unread_count",
    ],
  );
  assert.doesNotMatch(
    notificationsMigrationSource,
    /p_(?:owner|user|profile|vitrine)_id/,
  );
  assert.doesNotMatch(
    notificationsMigrationSource,
    /sender_name|sender_email|sender_phone|request_type|budget_amount|budget_currency|message(?:_preview)?|notification_status/,
  );
  assert.doesNotMatch(
    notificationsMigrationSource,
    /create\s+(?:table|index)/i,
  );
});

test("notification RPC derives the owner from auth.uid and emits an empty sentinel", () => {
  assert.match(
    notificationsMigrationSource,
    /from public\.link_vitrines[^]*?link_vitrines\.user_id = \(select auth\.uid\(\)\)/,
  );
  assert.match(
    notificationsMigrationSource,
    /current_context\.vitrine_id is not null as has_vitrine/,
  );
  assert.match(
    notificationsMigrationSource,
    /cross join unread_requests\s+left join recent_requests on true/,
  );
});

test("notification RPC returns exactly the newest twenty while counting every unread row", () => {
  const recentRequests = notificationsMigrationSource.match(
    /recent_requests as \(([^]*?)\),\s*unread_requests as/,
  );
  const unreadRequests = notificationsMigrationSource.match(
    /unread_requests as \(([^]*?)\)\s*select/,
  );

  assert.ok(recentRequests);
  assert.ok(unreadRequests);
  assert.match(
    recentRequests[1],
    /order by requests\.created_at desc, requests\.id desc\s*limit 20/,
  );
  assert.match(unreadRequests[1], /select count\(\*\)::bigint/);
  assert.match(unreadRequests[1], /where requests\.status = 'new'/);
  assert.doesNotMatch(unreadRequests[1], /\blimit\b/);
});

test("notification RPC is security-definer and authenticated-only", () => {
  assert.match(
    notificationsMigrationSource,
    /language sql\s+stable\s+security definer\s+set search_path = ''/,
  );
  assert.match(
    notificationsMigrationSource,
    /revoke all on function public\.get_current_user_link_vitrine_collaboration_notifications\(\)\s*from public, anon, authenticated, service_role;/,
  );
  assert.match(
    notificationsMigrationSource,
    /grant execute on function public\.get_current_user_link_vitrine_collaboration_notifications\(\)\s*to authenticated;/,
  );
  assert.doesNotMatch(
    notificationsMigrationSource,
    /grant execute on function public\.get_current_user_link_vitrine_collaboration_notifications\(\)[^;]*to\s+(?:public|anon|service_role)/,
  );
});

test("owner status update is column-narrow, owner-scoped, and race-aware", () => {
  assert.match(
    migrationSource,
    /update_current_user_link_vitrine_collaboration_request_status\(\s*p_request_id uuid,\s*p_expected_status text,\s*p_new_status text/,
  );
  assert.match(
    migrationSource,
    /requests\.status = p_expected_status[^]*?link_vitrines\.user_id = \(select auth\.uid\(\)\)/,
  );
  assert.doesNotMatch(
    migrationSource,
    /grant\s+update\s+on table public\.link_vitrine_collaboration_requests/i,
  );
});

test("payload dedupe is atomic and retains old requests when settings are disabled", () => {
  assert.match(migrationSource, /pg_advisory_xact_lock/);
  assert.match(
    migrationSource,
    /payload_hash = p_payload_hash[^]*?interval '10 minutes'/,
  );
  assert.doesNotMatch(
    migrationSource,
    /delete from public\.link_vitrine_collaboration_requests/,
  );
});

test("rate limits match the documented visitor, email, and global IP windows", () => {
  assert.match(
    routeSource,
    /visitor-profile"[^]*?limit: 3,[^]*?windowSeconds: 30 \* 60/,
  );
  assert.match(
    routeSource,
    /email-profile"[^]*?limit: 5,[^]*?windowSeconds: 24 \* 60 \* 60/,
  );
  assert.match(
    routeSource,
    /global-ip"[^]*?limit: 30,[^]*?windowSeconds: 60 \* 60/,
  );
  assert.equal(
    (routeSource.match(/mode: "fail-closed"/g) ?? []).length,
    3,
  );
});

test("owner rate-limit keys are secret-HMAC scoped instead of raw user IDs", () => {
  const previousSecret = process.env.CLICK_VISITOR_HASH_SECRET;
  process.env.CLICK_VISITOR_HASH_SECRET = "collaboration-test-secret";

  try {
    const userId = "018f26b1-8ca4-4f0b-9b49-9d6f10fcf927";
    const ownerHash =
      hashModule.buildCollaborationOwnerRateLimitHash(userId);
    assert.match(ownerHash, /^cr1:owner:[A-Za-z0-9_-]{43}$/);
    assert.doesNotMatch(ownerHash, new RegExp(userId, "i"));
    assert.match(actionsSource, /key: ownerRateKey/);
    assert.doesNotMatch(actionsSource, /key: context\.userId/);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CLICK_VISITOR_HASH_SECRET;
    } else {
      process.env.CLICK_VISITOR_HASH_SECRET = previousSecret;
    }
  }
});

test("notification email escapes every user-controlled HTML value", () => {
  const email = emailTemplateModule.buildCollaborationNotificationEmail({
    senderName: "<img src=x onerror=alert(1)>",
    senderEmail: "safe@example.com",
    senderPhone: null,
    requestType: "other",
    budgetAmount: null,
    budgetCurrency: null,
    subject: "<script>alert(1)</script>",
    message: "<svg onload=alert(1)>hello world message</svg>",
    createdAt: "2026-07-24T12:00:00.000Z",
    profileDisplayName: "<b>Owner</b>",
    profileHandle: "owner",
    detailUrl: "http://localhost:3000/dashboard/link-vitrini/new",
  });
  assert.doesNotMatch(email.html, /<script>|<svg|<img src=x|<b>Owner/);
  assert.match(email.html, /&lt;script&gt;|&lt;svg|&lt;img/);
  assert.match(
    email.html,
    /http:\/\/localhost:3000\/brand\/trulygo-report-logo\.png/,
  );
  assert.match(email.html, /alt="TrulyGo"/);
});

test("collaboration verification surfaces use the shared TrulyGo wordmark", () => {
  const verificationEmail =
    emailTemplateModule.buildCollaborationVerificationEmail({
      verificationUrl:
        "http://localhost:3000/link-vitrini/bildirim-dogrula#token=test",
    });
  const verificationPageSource = source(
    "src/components/link-vitrine-notification-email-verification.tsx",
  );
  const brandAsset = readFileSync(
    path.join(projectRoot, "public/brand/trulygo-report-logo.png"),
  );

  assert.match(
    verificationEmail.html,
    /http:\/\/localhost:3000\/brand\/trulygo-report-logo\.png/,
  );
  assert.doesNotMatch(
    verificationEmail.html,
    /trulygo-report-logo\.png[^"]*#token=/,
  );
  assert.ok(brandAsset.byteLength > 1_000);
  assert.match(
    verificationPageSource,
    /src="\/brand\/trulygo-report-logo\.png"/,
  );
});

test("public collaboration CTA uses proposal-focused copy", () => {
  const collaborationCtaSource = source(
    "src/components/link-vitrine-collaboration-cta.tsx",
  );

  assert.equal(
    (collaborationCtaSource.match(/İş Birliği Teklifi Gönder/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(
    collaborationCtaSource,
    /İş Birliği İçin İletişime Geç/,
  );
});

test("notification subject and sender are fixed while reply-to is sender email", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "re_test";
  const previousFrom = process.env.RESEND_FROM;
  process.env.RESEND_FROM = "TrulyGo <test@example.invalid>";
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: "provider-id-123" }), {
      status: 200,
    });
  };
  try {
    const result = await emailServerModule.sendResendEmail({
      to: "owner@example.com",
      replyTo: "sender@example.com",
      subject:
        emailTemplateModule.LINK_VITRINE_COLLABORATION_NOTIFICATION_SUBJECT,
      html: "<p>safe</p>",
      text: "safe",
      idempotencyKey: "request/test-id",
    });
    const body = JSON.parse(captured.body);
    assert.equal(result.ok, true);
    assert.equal(
      body.from,
      "TrulyGo <test@example.invalid>",
    );
    assert.equal(body.reply_to, "sender@example.com");
    assert.equal(
      body.subject,
      "Yeni bir iş birliği teklifi aldınız | TrulyGo",
    );
    assert.equal(captured.headers["Idempotency-Key"], "request/test-id");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previousFrom;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("Resend failures have bounded codes and do not erase the saved request", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "re_test";
  const previousFrom = process.env.RESEND_FROM;
  process.env.RESEND_FROM = "TrulyGo <test@example.invalid>";
  globalThis.fetch = async () => new Response("failure", { status: 500 });
  try {
    const result = await emailServerModule.sendResendEmail({
      to: "owner@example.com",
      subject: "fixed",
      html: "<p>safe</p>",
      text: "safe",
      idempotencyKey: "request/test-id",
    });
    assert.deepEqual(result, {
      ok: false,
      errorCode: "resend_unavailable",
    });
    assert.ok(
      routeSource.indexOf(
        "const record = await createLinkVitrineCollaborationRequest",
      ) <
        routeSource.indexOf("const emailResult = await sendResendEmail"),
    );
    assert.match(
      routeSource,
      /status: emailResult\.ok \? "sent" : "failed"/,
    );
    assert.match(routeSource, /return jsonResponse\(\{ ok: true \}\)/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previousFrom;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("provider ID and notification result are persisted after a successful send", () => {
  assert.match(
    routeSource,
    /providerId: emailResult\.ok \? emailResult\.providerId : null/,
  );
  assert.match(
    migrationSource,
    /notification_provider_id = p_provider_id[^]*?notification_attempted_at = statement_timestamp\(\)/,
  );
});

test("owner notification email CTA no longer targets the removed editor list anchor", () => {
  assert.match(
    routeSource,
    /const detailUrl = `\$\{appOrigin\}\/dashboard\/link-vitrini\/new`;/,
  );
  assert.doesNotMatch(routeSource, /#collaboration-requests/);
});

test("public profile publishes neither request count nor notification email", () => {
  assert.doesNotMatch(
    `${publicPageSource}\n${publicViewSource}\n${ctaSource}`,
    /notification_email|recipient_email|sender_email|requestCount|request_count/,
  );
});

test("owner request details are lazy-loaded instead of entering initial page data", () => {
  assert.match(
    detailModalSource,
    /getLinkVitrineCollaborationRequestDetailAction\(requestId\)/,
  );
  assert.doesNotMatch(
    linkVitrinePageSource,
    /senderEmail|senderPhone|notificationStatus|message:\s*request/,
  );
});

test("notification loader and action expose only the fail-closed minimal snapshot", () => {
  const rowShape = collaborationDataSource.match(
    /type CollaborationNotificationRow = \{([^]*?)\n\};/,
  );
  const loaderSource = collaborationDataSource.match(
    /export async function getCurrentUserLinkVitrineCollaborationNotifications\(\)[^]*?(?=\nexport async function getCurrentUserLinkVitrineCollaborationRequestDetail)/,
  );

  assert.ok(rowShape);
  assert.deepEqual(
    [...rowShape[1].matchAll(/^\s*([a-z_]+):/gm)].map((match) => match[1]),
    [
      "has_vitrine",
      "request_id",
      "subject",
      "status",
      "created_at",
      "unread_count",
    ],
  );
  assert.ok(loaderSource);
  assert.match(
    loaderSource[0],
    /rpc\(\s*"get_current_user_link_vitrine_collaboration_notifications",?\s*\)/,
  );
  assert.doesNotMatch(
    loaderSource[0],
    /sender_name|sender_email|sender_phone|request_type|budget_amount|budget_currency|message(?:_preview)?|notification_status/,
  );
  assert.match(
    collaborationDataSource,
    /\|\s*\{\s*ok: false;\s*error: "unavailable";\s*hasVitrine: boolean;\s*\}/,
  );
  assert.match(
    actionsSource,
    /export async function getLinkVitrineCollaborationNotificationsAction\(\)\s*\{\s*return getCurrentUserLinkVitrineCollaborationNotifications\(\);/,
  );
});

test("notification failure fallback derives the vitrine hint from the authenticated owner", () => {
  const fallbackSource = collaborationDataSource.match(
    /async function getUnavailableNotificationsResult\([^]*?(?=\r?\n}\r?\n\r?\nexport async function getCurrentUserLinkVitrineCollaborationSettingsData)/,
  );

  assert.ok(fallbackSource);
  assert.match(fallbackSource[0], /supabase\.auth\.getClaims\(\)/);
  assert.match(
    fallbackSource[0],
    /typeof claims\?\.sub === "string" \? claims\.sub : null/,
  );
  assert.match(
    fallbackSource[0],
    /\.from\("link_vitrines"\)[^]*?\.eq\("user_id", userId\)[^]*?\.maybeSingle\(\)/,
  );
  assert.match(
    fallbackSource[0],
    /if \(claimsError \|\| !userId\) \{\s*return \{ ok: false, error: "unavailable", hasVitrine: false \};/,
  );
  assert.match(
    fallbackSource[0],
    /hasVitrine: !error && Boolean\(data\?\.id\)/,
  );
  assert.doesNotMatch(
    fallbackSource[0],
    /p_(?:owner|user|profile|vitrine)_id|sender_|message|budget_/,
  );
});

test("editor no longer fetches or renders request summaries while settings remain", () => {
  assert.doesNotMatch(
    collaborationDataSource,
    /get_current_user_link_vitrine_collaboration_request_summaries/,
  );
  assert.match(
    collaborationDataSource,
    /get_current_user_link_vitrine_collaboration_settings/,
  );
  assert.match(
    linkVitrinePageSource,
    /getCurrentUserLinkVitrineCollaborationSettingsData/,
  );
  assert.doesNotMatch(
    `${linkVitrinePageSource}\n${linkVitrineEditorSource}`,
    /initialCollaborationRequests|getCurrentUserLinkVitrineCollaborationData/,
  );
  assert.doesNotMatch(
    `${editorSource}\n${linkVitrineEditorSource}`,
    /LinkVitrineCollaborationRequestsEditor|collaboration-requests/,
  );
  assert.match(
    linkVitrineEditorSource,
    /<LinkVitrineCollaborationSettingsEditor/,
  );
  assert.match(editorSource, /\u0130\u015f Birli\u011fi ve \u0130leti\u015fim/);
});

test("header orders notifications before user identity and sign-out", () => {
  const notificationsIndex = siteHeaderSource.indexOf(
    "<SiteHeaderCollaborationNotifications",
  );
  const avatarIndex = siteHeaderSource.indexOf(
    '<span className="site-avatar"',
  );
  const metaIndex = siteHeaderSource.indexOf(
    '<span className="site-user-meta">',
  );
  const signOutIndex = siteHeaderSource.indexOf(
    "<form action={signOutAction}>",
  );

  assert.ok(notificationsIndex >= 0);
  assert.ok(notificationsIndex < avatarIndex);
  assert.ok(avatarIndex < metaIndex);
  assert.ok(metaIndex < signOutIndex);
  assert.match(
    siteHeaderSource,
    /auth\.isAuthenticated[^]*?getSiteHeaderCollaborationNotifications\(\)/,
  );
  assert.match(
    headerNotificationsSource,
    /const hasVitrine =\s*snapshot\?\.hasVitrine === true \|\|[^]*?\(snapshot === null && hasVitrineHint\);[^]*?if \(!hasVitrine\) \{\s*return null;/,
  );
});

test("notification trigger and rows are semantic, labelled buttons", () => {
  assert.ok(
    headerNotificationsSource.includes(
      `aria-label="${"\u0130\u015f birli\u011fi bildirimleri"}"`,
    ),
  );
  assert.match(
    headerNotificationsSource,
    /<button[^]*?aria-controls=\{panelId\}[^]*?aria-expanded=\{isOpen\}[^]*?type="button"/,
  );
  assert.match(headerNotificationsSource, /<svg aria-hidden="true"/);
  assert.match(
    headerNotificationsSource,
    /aria-describedby=\{badgeLabel \? badgeDescriptionId : undefined\}/,
  );
  assert.match(
    headerNotificationsSource,
    /className="sr-only" id=\{badgeDescriptionId\}[^]*?snapshot\?\.unreadCount/,
  );
  assert.match(
    headerNotificationsSource,
    /requests\.map\([^]*?<button[^]*?onClick=\{\(\) => handleRequestClick\(request\)\}[^]*?type="button"/,
  );
  assert.match(
    headerNotificationsSource,
    /className="sr-only">Okunmam\u0131\u015f: <\/span>/,
  );
});

test("notification panel is portalled, viewport-clamped, and internally scrollable", () => {
  assert.match(
    headerNotificationsSource,
    /createPortal\([^]*?document\.body/,
  );
  assert.match(headerNotificationsSource, /position: "fixed"/);
  assert.match(
    headerNotificationsSource,
    /viewport\.width - PANEL_EDGE_GAP \* 2/,
  );
  assert.match(
    headerNotificationsSource,
    /left: clamp\(triggerRect\.right - width, minimumLeft, maximumLeft\)/,
  );
  assert.match(
    headerNotificationsSource,
    /maxHeight: panelPosition\.maxHeight/,
  );
  assert.match(
    globalStylesSource,
    /\.site-collaboration-notifications-panel\s*\{[^}]*position:\s*fixed;[^}]*width:\s*min\(22rem,\s*calc\(100vw - 1\.5rem\)\);[^}]*overflow:\s*hidden;/,
  );
  assert.match(
    globalStylesSource,
    /\.site-collaboration-notifications-list\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/,
  );
});

test("notification rows carry only subject and mark only new requests unread", () => {
  assert.match(
    headerNotificationsSource,
    /getLinkVitrineCollaborationNotificationSubject\(\s*request\.subject/,
  );
  assert.match(
    headerNotificationsSource,
    /const isUnread = request\.status === "new"/,
  );
  assert.match(
    headerNotificationsSource,
    /isUnread \? \([^]*?site-collaboration-notifications-unread/,
  );
  assert.doesNotMatch(
    headerNotificationsSource,
    /senderName|senderEmail|senderPhone|requestType|budgetAmount|budgetCurrency|messagePreview|notificationStatus/,
  );
  assert.doesNotMatch(
    headerNotificationsSource,
    /request\.status === "(?:read|replied)"/,
  );
});

test("notification panel closes on toggle, outside click, Escape, route, popup, and detail open", () => {
  assert.match(
    headerNotificationsSource,
    /if \(isOpen\) \{\s*closePanel\(\);\s*return;\s*\}[^]*?openPanel\(\)/,
  );
  assert.match(
    headerNotificationsSource,
    /triggerRef\.current\?\.contains\(target\)[^]*?panelRef\.current\?\.contains\(target\)[^]*?setIsOpen\(false\)/,
  );
  assert.match(
    headerNotificationsSource,
    /event\.key !== "Escape"[^]*?setIsOpen\(false\)[^]*?triggerRef\.current\?\.focus\(\)/,
  );
  assert.match(
    headerNotificationsSource,
    /routeRef\.current === pathname[^]*?setIsOpen\(false\)/,
  );
  assert.match(
    headerNotificationsSource,
    /detail\?\.source !== HEADER_POPUP_SOURCE[^]*?setIsOpen\(false\)/,
  );
  assert.match(
    headerNotificationsSource,
    /handleRequestClick[^]*?setIsOpen\(false\);[^]*?setSelectedRequest\(request\)/,
  );
  assert.match(
    headerNotificationsSource,
    /<LinkVitrineCollaborationRequestDetailModal[^]*?onClose=\{\(\) => setSelectedRequest\(null\)\}/,
  );
});

test("notification refresh is visible-only, focus-aware, sixty-second, and deduplicated", () => {
  assert.match(headerNotificationsSource, /const POLL_INTERVAL_MS = 60_000/);
  assert.match(
    headerNotificationsSource,
    /if \(inFlightRef\.current\) \{\s*return inFlightRef\.current;/,
  );
  assert.match(
    headerNotificationsSource,
    /inFlightRef\.current = pending;[^]*?inFlightRef\.current = null/,
  );
  assert.match(
    headerNotificationsSource,
    /document\.visibilityState !== "visible"[^]*?window\.setInterval\([^]*?POLL_INTERVAL_MS/,
  );
  assert.match(
    headerNotificationsSource,
    /visibilitychange[^]*?handleVisibilityChange/,
  );
  assert.match(
    headerNotificationsSource,
    /window\.addEventListener\("focus", handleWindowFocus\)/,
  );
  assert.match(
    headerNotificationsSource,
    /openPanel[^]*?void refreshNotifications\(\)/,
  );
});

test("notification refresh cannot overwrite a newer local status transition", () => {
  const refreshSource = headerNotificationsSource.match(
    /const refreshNotifications = useCallback\(\(\) => \{([^]*?)(?=\n\s*const closePanel)/,
  );

  assert.ok(refreshSource);
  assert.match(
    refreshSource[1],
    /const statusRevision = statusRevisionRef\.current/,
  );
  assert.match(
    refreshSource[1],
    /if \(statusRevision !== statusRevisionRef\.current\) \{\s*return;\s*\}\s*setSnapshot\(result\.snapshot\)/,
  );
  assert.match(
    headerNotificationsSource,
    /handleStatusChange[^]*?statusRevisionRef\.current \+= 1;[^]*?setSnapshot/,
  );
});

test("late status responses are ordered and force an authoritative refresh", () => {
  assert.match(
    detailModalSource,
    /const mutationRevision =\s*callbacksRef\.current\.onStatusMutationStart\(requestId\)[^]*?await updateLinkVitrineCollaborationRequestStatusAction/,
  );
  assert.match(
    detailModalSource,
    /callbacksRef\.current\.onStatusChange\(\s*requestId,\s*result\.status,\s*mutationRevision,\s*\)/,
  );
  assert.match(
    headerNotificationsSource,
    /latestStatusMutationByRequestRef = useRef\(\s*new Map<string, number>\(\)/,
  );
  assert.match(
    headerNotificationsSource,
    /handleStatusMutationStart[^]*?statusMutationSequenceRef\.current = mutationRevision;[^]*?latestStatusMutationByRequestRef\.current\.set\(\s*requestId,\s*mutationRevision/,
  );
  assert.match(
    headerNotificationsSource,
    /latestStatusMutationByRequestRef\.current\.get\(requestId\) !==\s*mutationRevision[^]*?queueAuthoritativeRefresh\(\);[^]*?return;/,
  );
  assert.match(
    headerNotificationsSource,
    /currentRefresh\.finally\(refreshAfterCurrentRequest\)/,
  );
});

test("notification error state remains discoverable, retryable, and focus-safe", () => {
  assert.match(
    headerNotificationsSource,
    /setHasVitrineHint\(\(current\) => current \|\| result\.hasVitrine\)/,
  );
  assert.match(
    headerNotificationsSource,
    /Bildirimler \u015fu anda y\u00fcklenemiyor\.[^]*?onClick=\{\(\) => void refreshNotifications\(\)\}[^]*?Tekrar dene/,
  );
  assert.match(
    headerNotificationsSource,
    /const focusRemainsInPanel =[^]*?panelRef\.current\?\.contains\(activeElement\) === true/,
  );
  assert.match(
    headerNotificationsSource,
    /if \(hasFocusedPanelRef\.current\) \{[^]*?if \(focusRemainsInPanel\) \{\s*return;[^]*?activeElement instanceof HTMLElement[^]*?activeElement !== document\.body[^]*?return;/,
  );
  assert.match(
    headerNotificationsSource,
    /\[hasLoadError, isOpen, isRefreshing, panelPosition, requests\]/,
  );
  assert.match(
    headerNotificationsSource,
    /\[data-site-collaboration-notifications-initial-focus\]:not\(\[disabled\]\)/,
  );
});

test("detail sessions reject stale responses and clear their generation on cleanup", () => {
  assert.match(
    detailModalSource,
    /<LinkVitrineCollaborationRequestDetailModalSession\s+key=\{request\.id\}/,
  );
  assert.match(
    detailModalSource,
    /await getLinkVitrineCollaborationRequestDetailAction\(requestId\)[^]*?if \(!isCurrentRequest\(requestId, generation\)\) \{\s*return;\s*\}[^]*?setDetail\(result\.detail\)/,
  );
  assert.match(
    detailModalSource,
    /return \(\) => \{\s*if \(isCurrentRequest\(requestId, generation\)\) \{\s*requestGenerationRef\.current \+= 1;\s*activeRequestIdRef\.current = null;/,
  );
});

test("owner detail marks only successfully loaded new requests as read", () => {
  assert.match(
    detailModalSource,
    /if \(!result\.ok\) \{\s*setDetailState\("error"\);\s*return;\s*\}[^]*?setDetail\(result\.detail\)/,
  );
  assert.match(
    detailModalSource,
    /if \(result\.detail\.status === "new"\) \{\s*await persistStatus\(\{\s*expectedStatus: "new",[^]*?newStatus: "read"/,
  );
  assert.equal(
    (
      detailModalSource.match(
        /if \(result\.detail\.status === "new"\)/g,
      ) ?? []
    ).length,
    1,
  );
  assert.doesNotMatch(
    detailModalSource,
    /result\.detail\.status === "(?:read|replied)"[^]*?persistStatus/,
  );
});

test("status callbacks update the row and unread badge only after server success", () => {
  const persistStatusSource = detailModalSource.match(
    /const persistStatus = useCallback\(([^]*?)(?=\n\s*const closeModal)/,
  );

  assert.ok(persistStatusSource);
  assert.match(
    persistStatusSource[1],
    /if \(!result\.ok\) \{[^]*?return false;[^]*?callbacksRef\.current\.onStatusChange\(\s*requestId,\s*result\.status,\s*mutationRevision/,
  );
  const successCallbackIndex = persistStatusSource[1].indexOf(
    "callbacksRef.current.onStatusChange(",
  );
  const staleGuardIndex = persistStatusSource[1].indexOf(
    "if (!isCurrentRequest(requestId, generation))",
  );
  assert.ok(
    successCallbackIndex >= 0 &&
      staleGuardIndex >= 0 &&
      successCallbackIndex < staleGuardIndex,
  );
  assert.match(
    headerNotificationsSource,
    /const unreadDelta =\s*Number\(status === "new"\) - Number\(previousStatus === "new"\)/,
  );
  assert.match(
    headerNotificationsSource,
    /request\.id === requestId \? \{ \.\.\.request, status \} : request/,
  );
  assert.match(
    headerNotificationsSource,
    /unreadCount: Math\.max\(0, current\.unreadCount \+ unreadDelta\)/,
  );
});

test("owner detail modal retains portal, focus trap, backdrop close, and reply flow", () => {
  assert.match(detailModalSource, /createPortal\(/);
  assert.match(detailModalSource, /event\.key === "Escape"/);
  assert.match(detailModalSource, /event\.key !== "Tab"/);
  assert.match(detailModalSource, /event\.target === event\.currentTarget/);
  assert.match(detailModalSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(detailModalSource, /buildCollaborationReplyMailto/);
  assert.match(detailModalSource, /E-posta ile yan\u0131tla/);
});

test("public modal has a portal, focus trap, Escape, backdrop close, and scroll lock", () => {
  assert.match(ctaSource, /createPortal\(/);
  assert.match(ctaSource, /event\.key === "Escape"/);
  assert.match(ctaSource, /event\.key !== "Tab"/);
  assert.match(ctaSource, /event\.target === event\.currentTarget/);
  assert.match(ctaSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(ctaSource, /previousActiveElement\?\.focus\(\)/);
  assert.match(ctaSource, /aria-modal="true"/);
  assert.match(ctaSource, /modalGenerationRef\.current/);
  assert.match(ctaSource, /data-success-focus/);
  assert.match(
    source("src/app/globals.css"),
    /:where\(\.link-vitrine-collaboration-modal-backdrop\)/,
  );
});

test("collaboration controls stay isolated while dirty values mirror into profile saves", () => {
  assert.equal(
    (editorSource.match(/form=\{ISOLATED_SETTINGS_FORM_ID\}/g) ?? []).length,
    2,
  );
  assert.match(
    editorSource,
    /type="email"[^]*?onKeyDown|onKeyDown[^]*?type="email"/,
  );
  assert.match(editorSource, /name="collaboration_settings_dirty"/);
  assert.match(editorSource, /hasUnsavedSettings \? "true" : "false"/);
  assert.match(editorSource, /name="collaboration_requests_enabled"/);
  assert.match(editorSource, /requestsEnabled \? "true" : "false"/);
  assert.match(editorSource, /name="collaboration_notification_email"/);
  assert.match(editorSource, /useFormStatus\(\)/);
  assert.match(
    editorSource,
    /controlsDisabled\s*=\s*!vitrineId \|\| Boolean\(pendingAction\) \|\| profilePending/,
  );
  assert.match(editorSource, /onPendingChange\?\.\(true\)/);
  assert.match(editorSource, /onPendingChange\?\.\(false\)/);
  assert.match(
    linkVitrineEditorSource,
    /onPendingChange=\{setCollaborationSettingsPending\}/,
  );
  assert.equal(
    (
      linkVitrineEditorSource.match(
        /disabled=\{collaborationSettingsPending\}/g,
      ) ?? []
    ).length,
    4,
  );
});

test("profile Save and Publish persist a dirty explicit boolean before success", () => {
  assert.match(linkVitrineEditorSource, /intentValue="save"/);
  assert.match(linkVitrineEditorSource, /intentValue="publish"/);
  assert.match(
    linkVitrineActionsSource,
    /dirtyValue === null \|\| dirtyValue === "false"/,
  );
  assert.match(
    linkVitrineActionsSource,
    /parseLinkVitrineCollaborationBoolean\([\s\S]*?collaboration_requests_enabled/,
  );
  assert.match(
    collaborationSettingsServerSource,
    /p_requests_enabled: requestsEnabled/,
  );
  assert.match(
    collaborationSettingsServerSource,
    /settings\.requestsEnabled !== requestsEnabled/,
  );

  const actionBody = linkVitrineActionsSource.slice(
    linkVitrineActionsSource.indexOf(
      "export async function saveLinkVitrineAction",
    ),
  );
  const persistenceIndex = actionBody.indexOf(
    "await persistOwnedLinkVitrineCollaborationSettings",
  );
  const successIndex = actionBody.indexOf("redirect(getSuccessPath(intent))");

  assert.ok(persistenceIndex >= 0);
  assert.ok(successIndex > persistenceIndex);
  assert.match(
    actionBody,
    /if \(!collaborationSettings\) \{\s*redirect\(getErrorPath\("collaboration_save_failed"\)\)/,
  );
  assert.match(
    migrationSource,
    /requests_enabled boolean not null default false/,
  );
  assert.match(
    migrationSource,
    /requests_enabled = excluded\.requests_enabled/,
  );
});

test("preview renders only a non-submitting CTA and never the live modal form", () => {
  assert.match(
    ctaSource,
    /if \(preview\) \{[^]*?<button[^]*?disabled[^]*?type="button"/,
  );
  assert.match(
    publicViewSource,
    /<LinkVitrineCollaborationCta[^]*?preview=\{preview\}/,
  );
});

test("verification link token remains in a URL fragment and GET never consumes it", () => {
  assert.match(actionsSource, /bildirim-dogrula` \+\s*`#token=/);
  assert.doesNotMatch(actionsSource, /bildirim-dogrula\?token=/);
  assert.match(verificationRouteSource, /export async function POST/);
  assert.doesNotMatch(verificationRouteSource, /export async function GET/);
});

test("verification consume is one-time, expiring, and atomically owner-free", () => {
  assert.match(
    migrationSource,
    /consume_link_vitrine_collaboration_email_verification[^]*?consumed_at is null[^]*?expires_at > statement_timestamp\(\)[^]*?for update/,
  );
  assert.match(
    migrationSource,
    /update public\.link_vitrine_collaboration_email_verifications[^]*?set consumed_at = statement_timestamp\(\)/,
  );
  assert.doesNotMatch(
    migrationSource,
    /consume_link_vitrine_collaboration_email_verification\(\s*p_token_hash text,\s*p_vitrine_id/,
  );
});

test("verification RPCs lock settings before mutable token rows", () => {
  for (const functionName of [
    "prepare_link_vitrine_collaboration_email_verification",
    "revoke_link_vitrine_collaboration_email_verification",
    "consume_link_vitrine_collaboration_email_verification",
  ]) {
    const start = migrationSource.indexOf(
      `create or replace function public.${functionName}`,
    );
    const nextFunction = migrationSource.indexOf(
      "create or replace function public.",
      start + 1,
    );
    const body = migrationSource.slice(
      start,
      nextFunction === -1 ? undefined : nextFunction,
    );
    const settingsLock = body.indexOf(
      "from public.link_vitrine_collaboration_settings",
    );
    const tokenMutationCandidates = [
      body.indexOf("update public.link_vitrine_collaboration_email_verifications"),
      body.indexOf(
        "from public.link_vitrine_collaboration_email_verifications as verifications",
        settingsLock + 1,
      ),
    ].filter((index) => index >= 0);

    assert.ok(settingsLock >= 0, functionName);
    assert.ok(
      tokenMutationCandidates.some((index) => index > settingsLock),
      functionName,
    );
  }
});

test("notification result validation rejects SQL NULL status and failure code", () => {
  assert.match(
    migrationSource,
    /if p_notification_status is null\s+or p_notification_status not in/,
  );
  assert.match(
    migrationSource,
    /p_notification_status = 'failed'[^]*?p_error_code is null/,
  );
});

test("all security-definer collaboration functions pin an empty search path", () => {
  const securityDefinerCount = (
    migrationSource.match(/security definer/g) ?? []
  ).length;
  const pinnedSearchPathCount = (
    migrationSource.match(/security definer\s+set search_path = ''/g) ?? []
  ).length;
  assert.ok(securityDefinerCount >= 10);
  assert.equal(pinnedSearchPathCount, securityDefinerCount);
});

test("client modules contain no server credentials, hash secret, admin client, or service RPC", () => {
  for (const { absolutePath, contents } of allClientSources()) {
    assert.doesNotMatch(
      contents,
      /SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|CLICK_VISITOR_HASH_SECRET|createAdminClient|create_link_vitrine_collaboration_request|prepare_link_vitrine_collaboration_email_verification/,
      absolutePath,
    );
  }
});

test("profile view tracker and 30-minute dedupe remain untouched", () => {
  assert.match(publicPageSource, /<LinkVitrineProfileViewTracker/);
  const profileMigration = source(
    "supabase/migrations/20260724120000_link_vitrine_profile_views.sql",
  );
  assert.match(profileMigration, /interval '30 minutes'/);
  assert.doesNotMatch(migrationSource, /alter table public\.link_vitrine_profile_views/);
  assert.doesNotMatch(migrationSource, /click_events/);
});

test("rollback disables runtime grants without dropping collaboration data", () => {
  const rollbackSource = source(
    "supabase/rollbacks/20260724140000_disable_link_vitrine_collaboration_runtime.sql",
  );
  assert.match(rollbackSource, /revoke execute/);
  assert.doesNotMatch(rollbackSource, /drop table|truncate|delete from/i);
});

test("notification rollback revokes only the additive RPC without deleting data", () => {
  assert.match(
    notificationsRollbackSource,
    /revoke execute on function public\.get_current_user_link_vitrine_collaboration_notifications\(\)\s*from public, anon, authenticated, service_role;/,
  );
  assert.doesNotMatch(
    notificationsRollbackSource,
    /drop (?:function|table)|truncate|delete from/i,
  );
  assert.equal(
    (
      notificationsRollbackSource.match(
        /revoke execute on function/gi,
      ) ?? []
    ).length,
    1,
  );
  assert.doesNotMatch(
    notificationsRollbackSource,
    /\bgrant\b|get_current_user_link_vitrine_collaboration_request_(?:summaries|detail)|update_current_user_link_vitrine_collaboration_request_status/,
  );
});

test("privacy copy truthfully covers sender data, Resend, and deletion behavior", () => {
  const privacySource = source("src/app/(chrome)/privacy/page.tsx");
  assert.match(privacySource, /Collaboration requests: sender name, email address, optional phone/);
  assert.match(privacySource, /Resend receives recipient addresses and email content only when the operator configures email delivery/);
  assert.match(
    privacySource,
    /Storage objects, infrastructure logs, backups and messages already delivered to recipients may require separate deletion procedures/,
  );
  assert.doesNotMatch(
    privacySource,
    /TrulyGo, kullanıcıdan üçüncü kişi verisi toplamaz/,
  );
});
