import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { formatAdminDateTime } from "../src/lib/admin-date.ts";
import {
  ADMIN_USER_LOOKUP_BATCH_SIZE,
  ADMIN_USERS_PAGE_SIZE,
  buildAdminUserSummary,
  deduplicateAdminUserIds,
  getAdminCreatorEmailLabel,
  getAdminUserAccountStatus,
  normalizeAdminLinkCount,
  normalizeAdminUsersPage,
} from "../src/lib/admin-users.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeRequire = createRequire(import.meta.url);

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function occurrences(value, pattern) {
  return value.match(pattern)?.length ?? 0;
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

function authUser(overrides = {}) {
  return {
    id: "user-1",
    email: "user@example.com",
    createdAt: "2026-08-01T09:00:00.000Z",
    lastSignInAt: "2026-08-19T09:47:00.000Z",
    emailConfirmedAt: "2026-08-01T09:05:00.000Z",
    bannedUntil: null,
    deletedAt: null,
    ...overrides,
  };
}

const adminUsersModule = {
  ADMIN_USER_LOOKUP_BATCH_SIZE,
  ADMIN_USERS_PAGE_SIZE,
  buildAdminUserSummary,
  deduplicateAdminUserIds,
  normalizeAdminLinkCount,
};

const packageSource = source("package.json");
const adminAuthorizationSource = source("src/lib/admin-authorization.ts");
const adminUsersSource = source("src/lib/admin-users.ts");
const adminUsersServerSource = source("src/lib/admin-users-server.ts");
const adminDateSource = source("src/lib/admin-date.ts");
const adminNavSource = source("src/components/admin-section-nav.tsx");
const adminLinksPageSource = source("src/app/(chrome)/admin/page.tsx");
const adminUsersPageSource = source("src/app/(chrome)/admin/users/page.tsx");
const adminActionsSource = source("src/app/(chrome)/admin/actions.ts");
const adminOverviewMigrationSource = source(
  "supabase/migrations/20260827120000_admin_user_overviews.sql",
).toLowerCase();
const compactAdminOverviewMigration = compact(adminOverviewMigrationSource);
const envExampleSource = source(".env.example");

test("admin date formatter is Istanbul-specific and fails safely", () => {
  assert.equal(
    formatAdminDateTime("2026-08-19T09:47:00.000Z"),
    "19 Ağu 2026 · 12:47",
  );
  assert.equal(formatAdminDateTime(null), "Tarih yok");
  assert.equal(formatAdminDateTime(undefined, "Henüz giriş yapmadı"), "Henüz giriş yapmadı");
  assert.equal(formatAdminDateTime("not-a-date", "Bilinmiyor"), "Bilinmiyor");

  assert.match(adminDateSource, /timeZone: "Europe\/Istanbul"/);
  assert.match(adminDateSource, /Number\.isNaN\(parsed\.getTime\(\)\)/);
});

test("admin page normalization accepts only positive safe integer pages", () => {
  for (const value of [undefined, null, "", "0", "-1", "1.5", "NaN", "9007199254740992"]) {
    assert.equal(normalizeAdminUsersPage(value), 1, String(value));
  }

  assert.equal(normalizeAdminUsersPage("002"), 2);
  assert.equal(normalizeAdminUsersPage("27"), 27);
  assert.equal(ADMIN_USERS_PAGE_SIZE, 25);
});

test("admin overview inputs are deduplicated and link counts are normalized", () => {
  assert.deepEqual(
    deduplicateAdminUserIds([" user-1 ", "user-2", "user-1", "", "   ", "user-2"]),
    ["user-1", "user-2"],
  );

  assert.equal(normalizeAdminLinkCount(0), 0);
  assert.equal(normalizeAdminLinkCount(14), 14);
  assert.equal(normalizeAdminLinkCount("19"), 19);
  assert.equal(normalizeAdminLinkCount(null), 0);
  assert.equal(normalizeAdminLinkCount(-1), 0);
  assert.equal(normalizeAdminLinkCount(1.5), 0);
  assert.equal(normalizeAdminLinkCount("not-a-count"), 0);
  assert.equal(ADMIN_USER_LOOKUP_BATCH_SIZE, 100);
});

test("account status is deterministic and follows the documented precedence", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");

  assert.equal(
    getAdminUserAccountStatus(
      authUser({ deletedAt: "2026-08-20T00:00:00.000Z", bannedUntil: "2027-01-01T00:00:00.000Z" }),
      now,
    ),
    "deleted",
  );
  assert.equal(
    getAdminUserAccountStatus(authUser({ bannedUntil: "2026-08-28T00:00:00.000Z" }), now),
    "suspended",
  );
  assert.equal(
    getAdminUserAccountStatus(
      authUser({ bannedUntil: "2026-08-26T00:00:00.000Z", emailConfirmedAt: null }),
      now,
    ),
    "unconfirmed",
  );
  assert.equal(
    getAdminUserAccountStatus(authUser({ bannedUntil: "invalid", emailConfirmedAt: null }), now),
    "unconfirmed",
  );
  assert.equal(getAdminUserAccountStatus(authUser(), now), "active");
});

test("user summaries expose only the minimal normalized UI DTO", () => {
  const snapshot = authUser({
    email: "  User@Example.com  ",
    createdAt: "  2026-08-01T09:00:00.000Z  ",
    lastSignInAt: null,
  });
  const overview = {
    userId: "user-1",
    email: "stale-profile@example.com",
    createdAt: "2026-08-01T09:00:00.000Z",
    lastSignInAt: null,
    linkCount: 7,
    hasLinkVitrine: true,
  };
  const summary = buildAdminUserSummary(
    snapshot,
    overview,
    new Date("2026-08-27T12:00:00.000Z"),
  );

  assert.deepEqual(summary, {
    id: "user-1",
    email: "User@Example.com",
    createdAt: "2026-08-01T09:00:00.000Z",
    lastSignInAt: null,
    linkCount: 7,
    hasLinkVitrine: true,
    status: "active",
  });
  assert.deepEqual(Object.keys(summary).sort(), [
    "createdAt",
    "email",
    "hasLinkVitrine",
    "id",
    "lastSignInAt",
    "linkCount",
    "status",
  ]);

  assert.deepEqual(buildAdminUserSummary(snapshot, null), {
    id: "user-1",
    email: "User@Example.com",
    createdAt: "2026-08-01T09:00:00.000Z",
    lastSignInAt: null,
    linkCount: null,
    hasLinkVitrine: null,
    status: "active",
  });
});

test("link creator labels distinguish load, account, and email fallbacks", () => {
  assert.equal(
    getAdminCreatorEmailLabel("user-1", { ok: false, error: "load_failed" }),
    "Kullanıcı bilgileri yüklenemedi",
  );
  assert.equal(
    getAdminCreatorEmailLabel("missing", { ok: true, usersById: new Map() }),
    "Hesap bulunamadı",
  );
  assert.equal(
    getAdminCreatorEmailLabel("user-1", {
      ok: true,
      usersById: new Map([
        [
          "user-1",
          {
            userId: "user-1",
            email: null,
            createdAt: null,
            lastSignInAt: null,
            linkCount: 0,
            hasLinkVitrine: false,
          },
        ],
      ]),
    }),
    "E-posta bulunamadı",
  );
  assert.equal(
    getAdminCreatorEmailLabel("user-1", {
      ok: true,
      usersById: new Map([
        [
          "user-1",
          {
            userId: "user-1",
            email: " creator@example.com ",
            createdAt: null,
            lastSignInAt: null,
            linkCount: 2,
            hasLinkVitrine: false,
          },
        ],
      ]),
    }),
    "creator@example.com",
  );
});

test("central admin authorization reads profile only for an authenticated session", async () => {
  let profileReads = 0;
  const anonymousModule = loadTypeScriptModule("src/lib/admin-authorization.ts", {
    "server-only": {},
    react: { cache: (fn) => fn },
    "@/lib/auth/session": {
      getAuthStatus: async () => ({ isConfigured: true, isAuthenticated: false }),
    },
    "@/lib/auth/profile": {
      getCurrentProfile: async () => {
        profileReads += 1;
        return { role: "admin" };
      },
    },
  });

  assert.deepEqual(await anonymousModule.getAdminAccess(), {
    isConfigured: true,
    isAuthenticated: false,
    hasProfile: false,
    profileRole: null,
    isAdmin: false,
  });
  assert.equal(profileReads, 0);

  const adminModule = loadTypeScriptModule("src/lib/admin-authorization.ts", {
    "server-only": {},
    react: { cache: (fn) => fn },
    "@/lib/auth/session": {
      getAuthStatus: async () => ({ isConfigured: true, isAuthenticated: true }),
    },
    "@/lib/auth/profile": {
      getCurrentProfile: async () => ({ role: "admin" }),
    },
  });

  assert.equal((await adminModule.getAdminAccess()).isAdmin, true);

  const userModule = loadTypeScriptModule("src/lib/admin-authorization.ts", {
    "server-only": {},
    react: { cache: (fn) => fn },
    "@/lib/auth/session": {
      getAuthStatus: async () => ({ isConfigured: true, isAuthenticated: true }),
    },
    "@/lib/auth/profile": {
      getCurrentProfile: async () => ({ role: "user" }),
    },
  });

  assert.equal(await userModule.isCurrentUserAdmin(), false);
});

test("non-admin server data calls stop before the service-role client is created", async () => {
  let adminClientCreations = 0;
  let noStoreCalls = 0;
  const serverModule = loadTypeScriptModule("src/lib/admin-users-server.ts", {
    "server-only": {},
    "next/cache": {
      unstable_noStore() {
        noStoreCalls += 1;
      },
    },
    "@/lib/admin-authorization": { isCurrentUserAdmin: async () => false },
    "@/lib/admin-users": adminUsersModule,
    "@/lib/supabase/admin": {
      createAdminClient() {
        adminClientCreations += 1;
        throw new Error("service-role client must not be created");
      },
    },
  });

  assert.deepEqual(await serverModule.getAdminUserOverviews(["user-1"]), {
    ok: false,
    error: "admin_required",
  });
  assert.deepEqual(await serverModule.getAdminUsersPage(1), {
    ok: false,
    error: "admin_required",
  });
  assert.equal(adminClientCreations, 0);
  assert.equal(noStoreCalls, 2);
});

test("admin user listing is bounded, minimal, and merges one overview batch", async () => {
  const listCalls = [];
  const rpcCalls = [];
  const admin = {
    auth: {
      admin: {
        async listUsers(input) {
          listCalls.push(input);
          return {
            data: {
              users: [
                {
                  id: "user-1",
                  email: "authoritative@example.com",
                  created_at: "2026-08-01T09:00:00.000Z",
                  last_sign_in_at: null,
                  email_confirmed_at: "2026-08-01T09:05:00.000Z",
                  banned_until: null,
                  deleted_at: null,
                  identities: [{ provider: "email" }],
                  user_metadata: { private: "not-for-the-ui" },
                },
              ],
              nextPage: 2,
              lastPage: 2,
              total: 26,
            },
            error: null,
          };
        },
      },
    },
    async rpc(name, input) {
      rpcCalls.push({ name, input });
      return {
        data: [
          {
            user_id: "user-1",
            email: "overview@example.com",
            created_at: "2026-08-01T09:00:00.000Z",
            last_sign_in_at: null,
            link_count: "4",
            has_link_vitrine: true,
          },
        ],
        error: null,
      };
    },
  };
  const serverModule = loadTypeScriptModule("src/lib/admin-users-server.ts", {
    "server-only": {},
    "next/cache": { unstable_noStore() {} },
    "@/lib/admin-authorization": { isCurrentUserAdmin: async () => true },
    "@/lib/admin-users": adminUsersModule,
    "@/lib/supabase/admin": { createAdminClient: () => admin },
  });

  const result = await serverModule.getAdminUsersPage(1);

  assert.deepEqual(listCalls, [{ page: 1, perPage: 25 }]);
  assert.deepEqual(rpcCalls, [
    { name: "get_admin_user_overviews", input: { p_user_ids: ["user-1"] } },
  ]);
  assert.deepEqual(result, {
    ok: true,
    users: [
      {
        id: "user-1",
        email: "authoritative@example.com",
        createdAt: "2026-08-01T09:00:00.000Z",
        lastSignInAt: null,
        linkCount: 4,
        hasLinkVitrine: true,
        status: "active",
      },
    ],
    page: 1,
    pageSize: 25,
    total: 26,
    totalPages: 2,
    hasPreviousPage: false,
    hasNextPage: true,
    overviewUnavailable: false,
  });
});

test("empty out-of-range user pages preserve the reported Auth total", async () => {
  let overviewCalls = 0;
  const admin = {
    auth: {
      admin: {
        async listUsers(input) {
          assert.deepEqual(input, { page: 99, perPage: 25 });
          return {
            data: {
              users: [],
              nextPage: null,
              lastPage: 2,
              total: 26,
            },
            error: null,
          };
        },
      },
    },
    async rpc() {
      overviewCalls += 1;
      return { data: [], error: null };
    },
  };
  const serverModule = loadTypeScriptModule("src/lib/admin-users-server.ts", {
    "server-only": {},
    "next/cache": { unstable_noStore() {} },
    "@/lib/admin-authorization": { isCurrentUserAdmin: async () => true },
    "@/lib/admin-users": adminUsersModule,
    "@/lib/supabase/admin": { createAdminClient: () => admin },
  });

  const result = await serverModule.getAdminUsersPage(99);

  assert.equal(result.ok, true);
  assert.equal(result.total, 26);
  assert.equal(result.totalPages, 2);
  assert.equal(result.hasPreviousPage, true);
  assert.equal(result.hasNextPage, false);
  assert.equal(overviewCalls, 0);
});

test("overview resolution batches unique IDs instead of issuing per-user requests", async () => {
  const rpcBatches = [];
  const admin = {
    async rpc(name, input) {
      assert.equal(name, "get_admin_user_overviews");
      rpcBatches.push(input.p_user_ids);
      return { data: [], error: null };
    },
  };
  const serverModule = loadTypeScriptModule("src/lib/admin-users-server.ts", {
    "server-only": {},
    "next/cache": { unstable_noStore() {} },
    "@/lib/admin-authorization": { isCurrentUserAdmin: async () => true },
    "@/lib/admin-users": adminUsersModule,
    "@/lib/supabase/admin": { createAdminClient: () => admin },
  });
  const ids = Array.from({ length: 101 }, (_, index) => `user-${index + 1}`);

  const result = await serverModule.getAdminUserOverviews([
    " ",
    ...ids,
    "user-1",
    "user-2",
  ]);

  assert.equal(result.ok, true);
  assert.equal(rpcBatches.length, 2);
  assert.equal(rpcBatches[0].length, 100);
  assert.deepEqual(rpcBatches[1], ["user-101"]);
});

test("admin server modules are no-store, centralized, and contain no N+1 Auth lookup", () => {
  assert.match(adminAuthorizationSource, /^import "server-only";/);
  assert.match(adminUsersServerSource, /^import "server-only";/);
  assert.match(adminAuthorizationSource, /profile\?\.role === "admin"/);
  assert.match(adminUsersServerSource, /unstable_noStore as noStore/);
  assert.equal(occurrences(adminUsersServerSource, /noStore\(\)/g), 2);
  assert.match(adminUsersServerSource, /from "@\/lib\/supabase\/admin"/);
  assert.match(adminUsersServerSource, /auth\.admin\.listUsers\(\{/);
  assert.match(adminUsersServerSource, /perPage: ADMIN_USERS_PAGE_SIZE/);
  assert.match(adminUsersServerSource, /"get_admin_user_overviews"/);
  assert.match(adminUsersServerSource, /p_user_ids: batch/);
  assert.match(
    adminUsersServerSource,
    /index \+= ADMIN_USER_LOOKUP_BATCH_SIZE/,
  );
  assert.doesNotMatch(adminUsersServerSource, /getUserById/);
  assert.doesNotMatch(adminUsersServerSource, /process\.env|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(
    adminUsersServerSource,
    /error\.message|JSON\.stringify\(error\)|user_metadata|app_metadata|identities/,
  );
});

test("both admin routes are dynamic, centrally authorized Server Components", () => {
  for (const pageSource of [adminLinksPageSource, adminUsersPageSource]) {
    assert.match(pageSource, /export const dynamic = "force-dynamic"/);
    assert.match(pageSource, /getAdminAccess\(\)/);
    assert.match(pageSource, /AdminAccessRequired/);
    assert.match(pageSource, /AdminSectionNav/);
    assert.doesNotMatch(pageSource, /^\s*["']use client["'];/m);
    assert.doesNotMatch(
      pageSource,
      /createBrowserClient|@\/lib\/supabase\/client|SUPABASE_SERVICE_ROLE_KEY/,
    );
  }

  assert.match(adminLinksPageSource, /<AdminSectionNav active="links"/);
  assert.match(adminUsersPageSource, /<AdminSectionNav active="users"/);
});

test("admin navigation stays semantic and exposes both sections", () => {
  assert.match(adminNavSource, /aria-label="Admin bölümleri"/);
  assert.match(adminNavSource, /href: "\/admin"/);
  assert.match(adminNavSource, /href: "\/admin\/users"/);
  assert.match(adminNavSource, /label: "Linkler"/);
  assert.match(adminNavSource, /label: "Kullanıcılar"/);
  assert.match(adminNavSource, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(adminNavSource, /flex min-w-0 flex-1/);
});

test("link cards add creator data while preserving analytics and moderation", () => {
  assert.match(adminLinksPageSource, /getAdminUserOverviews\(/);
  assert.match(adminLinksPageSource, /getAdminCreatorEmailLabel\(/);
  assert.match(adminLinksPageSource, /formatAdminDateTime\(request\.createdAt/);
  assert.match(adminLinksPageSource, />Oluşturan</);
  assert.match(adminLinksPageSource, />Oluşturulma</);
  assert.match(adminLinksPageSource, /break-all/);
  assert.doesNotMatch(adminLinksPageSource, /getUserById/);

  for (const existingCopy of [
    "Toplam tıklama",
    "Son tıklama",
    "En sık referrer",
    "Bekleyen link talepleri",
    "Onayla",
    "Reddet",
  ]) {
    assert.match(adminLinksPageSource, new RegExp(existingCopy));
  }

  assert.match(adminLinksPageSource, /linkRequestStatusTones\[request\.status\]/);
  assert.match(adminLinksPageSource, /reviewLinkRequestAction/);
  assert.match(adminActionsSource, /profile\?\.role !== "admin"/);
  assert.match(adminActionsSource, /\.eq\("status", "pending"\)/);
  assert.match(adminActionsSource, /intent|status/);
});

test("users UI covers required fields, fallbacks, and bounded pagination", () => {
  assert.match(adminUsersPageSource, /normalizeAdminUsersPage\(/);
  assert.match(adminUsersPageSource, /getAdminUsersPage\(/);
  assert.match(adminUsersPageSource, /formatAdminDateTime\(user\.createdAt/);
  assert.match(
    adminUsersPageSource,
    /formatAdminDateTime\([^]*?user\.lastSignInAt,[^]*?user\.lastSignInAt \? "Tarih bilinmiyor" : "Henüz giriş yapmadı"/,
  );

  for (const requiredCopy of [
    "E-posta",
    "Kayıt tarihi",
    "Son giriş",
    "Oluşturulan link",
    "Link Vitrini",
    "Önceki",
    "Sonraki",
    "Kullanıcı bilgileri yüklenemedi",
  ]) {
    assert.match(adminUsersPageSource, new RegExp(requiredCopy));
  }

  assert.match(adminUsersPageSource, /adminUserStatusLabels\[user\.status\]/);
  assert.match(adminUsersPageSource, /adminUserStatusTones\[user\.status\]/);
  assert.match(adminUsersPageSource, /break-all/);
  assert.match(adminUsersPageSource, /\?page=\$\{/);
  assert.match(adminUsersPageSource, /hasPreviousPage/);
  assert.match(adminUsersPageSource, /hasNextPage/);
  assert.match(adminUsersPageSource, /overviewUnavailable/);
});

test("admin overview RPC is narrow, grouped, and executable only by service_role", () => {
  assert.match(
    compactAdminOverviewMigration,
    /create or replace function public\.get_admin_user_overviews\(p_user_ids uuid\[\]\)/,
  );
  assert.match(compactAdminOverviewMigration, /returns table\s*\(/);
  for (const outputColumn of [
    "user_id uuid",
    "email text",
    "link_count bigint",
    "has_link_vitrine boolean",
  ]) {
    assert.match(compactAdminOverviewMigration, new RegExp(outputColumn));
  }

  assert.match(compactAdminOverviewMigration, /language sql/);
  assert.match(compactAdminOverviewMigration, /security definer/);
  assert.match(compactAdminOverviewMigration, /set search_path = ''/);
  assert.match(compactAdminOverviewMigration, /auth\.users/);
  assert.match(compactAdminOverviewMigration, /public\.link_requests/);
  assert.match(compactAdminOverviewMigration, /public\.link_vitrines/);
  assert.match(compactAdminOverviewMigration, /group by/);
  assert.match(
    compactAdminOverviewMigration,
    /revoke all on function public\.get_admin_user_overviews\(uuid\[\]\) from public, anon, authenticated, service_role;/,
  );
  assert.match(
    compactAdminOverviewMigration,
    /grant execute on function public\.get_admin_user_overviews\(uuid\[\]\) to service_role;/,
  );
  assert.doesNotMatch(compactAdminOverviewMigration, /grant (?:select|all) on table/);
  assert.doesNotMatch(compactAdminOverviewMigration, /create policy|alter table .* disable row level security/);
});

test("client modules contain no service-role secret or admin data capability", () => {
  assert.match(envExampleSource, /^SUPABASE_SERVICE_ROLE_KEY=$/m);
  assert.doesNotMatch(envExampleSource, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);

  const clientModules = sourceFilesUnder(path.join(projectRoot, "src"))
    .map((filePath) => ({ filePath, contents: readFileSync(filePath, "utf8") }))
    .filter(({ contents }) => /^\s*["']use client["'];/m.test(contents));

  assert.ok(clientModules.length > 0);
  for (const { filePath, contents } of clientModules) {
    assert.doesNotMatch(
      contents,
      /SUPABASE_SERVICE_ROLE_KEY|createAdminClient|auth\.admin\.listUsers|get_admin_user_overviews|@\/lib\/admin-(?:authorization|users-server)/,
      path.relative(projectRoot, filePath),
    );
  }
});

test("package exposes the focused admin regression command", () => {
  assert.match(
    packageSource,
    /"test:admin": "node --test tests\/admin-panel\.test\.mjs"/,
  );
  assert.match(adminUsersSource, /export const ADMIN_USERS_PAGE_SIZE = 25/);
});
