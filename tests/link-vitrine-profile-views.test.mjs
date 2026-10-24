import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { recordLinkVitrineProfileViewBestEffort } from "../src/lib/link-vitrine-profile-view-transport.ts";
import {
  buildLinkVitrineProfileViewPath,
  formatLinkVitrineProfileViewCount,
  normalizeLinkVitrineProfileViewCount,
  parseLinkVitrineProfileViewCount,
} from "../src/lib/link-vitrine-profile-views.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}

const publicPageSource = source("src/app/v/[handle]/page.tsx");
const publicViewSource = source("src/components/link-vitrine-public-view.tsx");
const linkVitrineSeoSource = source("src/lib/link-vitrine-seo.ts");
const trackerSource = source(
  "src/components/link-vitrine-profile-view-tracker.tsx",
);
const transportSource = source(
  "src/lib/link-vitrine-profile-view-transport.ts",
);
const editorSource = source(
  "src/app/dashboard/link-vitrini/link-vitrini-editor.tsx",
);
const editorPageSource = source("src/app/dashboard/link-vitrini/new/page.tsx");
const editorActionSource = source("src/app/dashboard/link-vitrini/actions.ts");
const publicCssSource = source("src/app/globals.css");
const vitrineDataSource = source("src/lib/link-vitrines.ts");
const clickEventsSource = source("src/lib/click-events.ts");
const shortLinkRedirectSource = source("src/app/[slug]/page.tsx");
const profileViewMigrationSource = source(
  "supabase/migrations/20260724120000_link_vitrine_profile_views.sql",
);
const itemClickCleanupMigrationSource = source(
  "supabase/post_deploy/20260724121000_remove_link_vitrine_item_click_runtime.sql",
);
const itemClickRollbackSource = source(
  "supabase/rollbacks/20260724121000_restore_link_vitrine_item_click_runtime.sql",
);
const historicalItemClickMigrationSource = source(
  "supabase/migrations/20260723120000_link_vitrine_item_click_totals.sql",
);
const compactProfileViewMigration = compact(profileViewMigrationSource);
const recordProfileViewFunctionSource =
  profileViewMigrationSource.match(
    /create or replace function public\.record_link_vitrine_profile_view[^]*?revoke all on function public\.record_link_vitrine_profile_view/,
  )?.[0] ?? "";
const ownerCountFunctionSource =
  profileViewMigrationSource.match(
    /create or replace function public\.get_current_user_link_vitrine_profile_view_count[^]*?revoke all on function public\.get_current_user_link_vitrine_profile_view_count/,
  )?.[0] ?? "";
const publicVitrineSelect =
  vitrineDataSource.match(/const publicVitrineSelect = `([\s\S]*?)`;/)?.[1] ??
  "";

test("profile view totals retain bigint precision and use Turkish grouping", () => {
  assert.equal(normalizeLinkVitrineProfileViewCount("0001284"), "1284");
  assert.equal(
    normalizeLinkVitrineProfileViewCount(9_007_199_254_740_991),
    "9007199254740991",
  );
  assert.equal(
    normalizeLinkVitrineProfileViewCount(9_007_199_254_740_992),
    null,
  );
  assert.equal(normalizeLinkVitrineProfileViewCount(12_345n), "12345");
  assert.equal(normalizeLinkVitrineProfileViewCount(-1n), null);
  assert.equal(normalizeLinkVitrineProfileViewCount("-1"), null);
  assert.equal(normalizeLinkVitrineProfileViewCount("1.5"), null);
  assert.equal(normalizeLinkVitrineProfileViewCount(""), null);
  assert.equal(normalizeLinkVitrineProfileViewCount(null), null);

  assert.equal(parseLinkVitrineProfileViewCount("1284"), "1284");
  assert.equal(
    parseLinkVitrineProfileViewCount([{ profile_view_count: "1284" }]),
    "1284",
  );
  assert.equal(parseLinkVitrineProfileViewCount({ profile_view_count: 7 }), "7");
  assert.equal(parseLinkVitrineProfileViewCount({ total_clicks: "7" }), null);

  assert.equal(formatLinkVitrineProfileViewCount(0), "0");
  assert.equal(formatLinkVitrineProfileViewCount("1284"), "1.284");

  const largeTotal = "12345678901234567890";
  const formattedLargeTotal = formatLinkVitrineProfileViewCount(largeTotal);
  assert.equal(formattedLargeTotal?.replace(/\D/g, ""), largeTotal);
  assert.doesNotMatch(formattedLargeTotal ?? "", /[KM]/);
});

test("profile view path accepts only a canonical saved handle", () => {
  assert.equal(
    buildLinkVitrineProfileViewPath("samplecreator"),
    "/v/samplecreator/view",
  );
  assert.equal(
    buildLinkVitrineProfileViewPath("sample-creator"),
    "/v/sample-creator/view",
  );
  assert.equal(buildLinkVitrineProfileViewPath("Sample-creator"), null);
  assert.equal(buildLinkVitrineProfileViewPath(" sample-creator"), null);
  assert.equal(buildLinkVitrineProfileViewPath("sample_creator"), null);
  assert.equal(buildLinkVitrineProfileViewPath("ab"), null);
  assert.equal(
    buildLinkVitrineProfileViewPath(`a${"b".repeat(32)}`),
    null,
  );
});

test("profile view transport sends one empty-body same-origin POST", () => {
  const calls = [];
  const fetchRequest = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve();
  };

  recordLinkVitrineProfileViewBestEffort("/v/samplecreator/view", {
    fetchRequest,
  });

  assert.deepEqual(calls, [
    {
      url: "/v/samplecreator/view",
      init: {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        keepalive: true,
      },
    },
  ]);
  assert.equal("body" in calls[0].init, false);

  recordLinkVitrineProfileViewBestEffort(null, { fetchRequest });
  assert.equal(calls.length, 1);
  assert.doesNotThrow(() =>
    recordLinkVitrineProfileViewBestEffort("/v/samplecreator/view", {
      fetchRequest: () => {
        throw new Error("fetch unavailable");
      },
    }),
  );
});

test("tracker mounts only after a valid public profile and never in editor preview", () => {
  const missingProfileGuardIndex = publicPageSource.indexOf("if (!vitrine)");
  const notFoundIndex = publicPageSource.indexOf("notFound()", missingProfileGuardIndex);
  const trackerIndex = publicPageSource.indexOf(
    "<LinkVitrineProfileViewTracker",
  );

  assert.ok(missingProfileGuardIndex >= 0);
  assert.ok(notFoundIndex > missingProfileGuardIndex);
  assert.ok(trackerIndex > notFoundIndex);
  assert.match(
    trackerSource,
    /useEffect\(\(\) => \{\s*recordLinkVitrineProfileViewBestEffort\(viewPath,/,
  );
  assert.match(trackerSource, /\}, \[viewPath\]\);/);
  assert.match(transportSource, /method: "POST"/);
  assert.doesNotMatch(publicViewSource, /LinkVitrineProfileViewTracker/);
  assert.doesNotMatch(editorSource, /LinkVitrineProfileViewTracker/);
});

test("Link Vitrini items navigate directly without any per-item tracking", () => {
  assert.match(
    publicViewSource,
    /<a\s+className=\{linkClassName\}[^]*href=\{item\.url \?\? "#"\}[^]*target="_blank"[^]*>\s*\{children\}\s*<\/a>/,
  );
  assert.doesNotMatch(
    publicViewSource,
    /trackingPath|sendBeacon|recordLinkVitrineClick|buildLinkVitrineItemClickPath/,
  );
  assert.doesNotMatch(publicViewSource, /\bonClick=/);

  for (const removedPath of [
    "src/app/v/[handle]/click/[itemId]/route.ts",
    "src/components/link-vitrine-tracked-link.tsx",
    "src/lib/link-vitrine-click-request.ts",
    "src/lib/link-vitrine-click-transport.ts",
    "src/lib/link-vitrine-clicks.ts",
  ]) {
    assert.equal(existsSync(path.join(projectRoot, removedPath)), false);
  }

  assert.doesNotMatch(
    clickEventsSource,
    /recordLinkVitrineItemClick|record_link_vitrine_item_click/,
  );
  assert.match(shortLinkRedirectSource, /after\(\(\) =>\s*recordLinkClick/);
  assert.match(shortLinkRedirectSource, /redirect\(redirectUrl\)/);
});

test("owner editor shows one profile total and no item totals", () => {
  assert.equal(countOccurrences(editorSource, "Profil görüntülenmeleri"), 1);
  assert.match(
    editorSource,
    /initialProfileViewCount: LinkVitrineProfileViewCount/,
  );
  assert.match(
    editorSource,
    /formatLinkVitrineProfileViewCount\(initialProfileViewCount\) \?\? "—"/,
  );
  assert.match(
    publicCssSource,
    /\.link-vitrine-profile-view-stat\s*\{[^}]*text-align: right;/,
  );
  assert.doesNotMatch(
    editorSource,
    /initialItemClickTotals|formatLinkVitrineClickTotal|tıklama/,
  );
  assert.doesNotMatch(publicCssSource, /\.link-vitrine-platform-click-count/);

  assert.match(
    editorPageSource,
    /getCurrentUserLinkVitrineProfileViewCount\(\)/,
  );
  assert.match(
    editorPageSource,
    /initialProfileViewCount=\{initialProfileViewCount\}/,
  );
  assert.doesNotMatch(editorPageSource, /ItemClick|itemClick|clickTotals/);

  assert.doesNotMatch(publicViewSource, /Profil görüntülenmeleri|profileViewCount/);
  assert.doesNotMatch(publicPageSource, /profileViewCount|profile_view_count/);
  assert.doesNotMatch(publicVitrineSelect, /profile_view|view_count/i);
});

test("owner count read is parameterless and fails without inventing a total", () => {
  const getterSource = vitrineDataSource.slice(
    vitrineDataSource.indexOf(
      "export async function getCurrentUserLinkVitrineProfileViewCount",
    ),
    vitrineDataSource.indexOf(
      "export const getPublicLinkVitrineByHandle",
    ),
  );

  assert.match(
    getterSource,
    /\.rpc\(\s*"get_current_user_link_vitrine_profile_view_count",?\s*\)/,
  );
  assert.doesNotMatch(getterSource, /p_vitrine_id|vitrineId/);
  assert.match(
    getterSource,
    /profile view count query failed[^]*return null;/,
  );
  assert.match(
    getterSource,
    /profile view count query threw[^]*return null;/,
  );
});

test("stable item IDs and owner-checked atomic editor sync remain intact", () => {
  assert.match(editorSource, /items\.map\(\(item\) => \(\{\s*id: item\.id,/);
  assert.match(editorSource, /id: draftRow\.id,/);
  assert.match(editorSource, /key=\{draftRow\.clientKey\}/);
  assert.match(
    editorActionSource,
    /\.select\("id,handle,avatar_url,banner_url,is_published,link_vitrine_items\(id\)"\)/,
  );
  assert.match(
    editorActionSource,
    /item\.id !== null && !existingItemIds\.has\(item\.id\)/,
  );
  assert.match(
    editorActionSource,
    /\.rpc\(\s*"sync_owned_link_vitrine_items",\s*\{[^]*p_vitrine_id: vitrineId,[^]*p_items: itemPayloads/,
  );
  assert.match(
    historicalItemClickMigrationSource,
    /create or replace function public\.sync_owned_link_vitrine_items/,
  );
  assert.match(
    historicalItemClickMigrationSource,
    /link_vitrines\.user_id = \(select auth\.uid\(\)\)[^]*for update;/,
  );
  assert.match(
    historicalItemClickMigrationSource,
    /grant execute on function public\.sync_owned_link_vitrine_items\(uuid, jsonb\)\s*to authenticated;/,
  );
});

test("profile views use private event and total tables without changing click_events", () => {
  assert.match(
    profileViewMigrationSource,
    /create table public\.link_vitrine_profile_views \([^]*vitrine_id uuid not null[^]*visitor_hash text not null[^]*viewed_at timestamptz not null/,
  );
  assert.match(
    profileViewMigrationSource,
    /create table public\.link_vitrine_profile_view_totals \([^]*profile_view_count bigint not null default 0/,
  );
  assert.match(
    profileViewMigrationSource,
    /references public\.link_vitrines\(id\)\s*on delete cascade/,
  );
  assert.match(
    profileViewMigrationSource,
    /create index link_vitrine_profile_views_dedupe_idx\s*on public\.link_vitrine_profile_views \(\s*vitrine_id,\s*visitor_hash,\s*viewed_at desc\s*\)/,
  );
  assert.doesNotMatch(
    profileViewMigrationSource,
    /alter table public\.click_events|insert into public\.click_events|delete from public\.click_events/,
  );

  const eventTableDefinition =
    profileViewMigrationSource.match(
      /create table public\.link_vitrine_profile_views \([^]*?\n\);/,
    )?.[0] ?? "";
  assert.doesNotMatch(
    eventTableDefinition,
    /\b(?:ip|ip_address|user_agent|referrer|device_type|location)\b/i,
  );
});

test("record RPC resolves a published handle and dedupes one profile visitor for 30 minutes", () => {
  const lockIndex = recordProfileViewFunctionSource.indexOf(
    "pg_advisory_xact_lock",
  );
  const recentViewIndex = recordProfileViewFunctionSource.indexOf(
    "where not exists",
    lockIndex,
  );
  const totalUpdateIndex = recordProfileViewFunctionSource.indexOf(
    "insert into public.link_vitrine_profile_view_totals",
    recentViewIndex,
  );

  assert.ok(lockIndex >= 0);
  assert.ok(recentViewIndex > lockIndex);
  assert.ok(totalUpdateIndex > recentViewIndex);
  assert.match(recordProfileViewFunctionSource, /security definer/);
  assert.match(recordProfileViewFunctionSource, /set search_path = ''/);
  assert.match(
    recordProfileViewFunctionSource,
    /where link_vitrines\.handle = normalized_handle\s*and link_vitrines\.is_published = true/,
  );
  assert.match(
    recordProfileViewFunctionSource,
    /if target_vitrine_id is null then\s*return false;/,
  );
  assert.match(
    recordProfileViewFunctionSource,
    /target_vitrine_id::text[^]*normalized_visitor_hash/,
  );
  assert.match(
    recordProfileViewFunctionSource,
    /recent_view\.vitrine_id = target_vitrine_id\s*and recent_view\.visitor_hash = normalized_visitor_hash\s*and recent_view\.viewed_at > recorded_at - interval '30 minutes'/,
  );
  assert.match(
    recordProfileViewFunctionSource,
    /on conflict \(vitrine_id\)\s*do update set\s*profile_view_count = totals\.profile_view_count \+ 1/,
  );
  assert.doesNotMatch(
    recordProfileViewFunctionSource,
    /p_vitrine_id|p_user_id|p_profile_view_count/,
  );
});

test("database grants expose only service recording and owner count reading", () => {
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
    /grant execute on function public\.record_link_vitrine_profile_view\(text, text\) to service_role;/,
  );
  assert.doesNotMatch(
    compactProfileViewMigration,
    /grant execute on function public\.record_link_vitrine_profile_view\(text, text\) to (?:public|anon|authenticated)/,
  );

  assert.match(ownerCountFunctionSource, /returns text/);
  assert.match(ownerCountFunctionSource, /security definer/);
  assert.match(ownerCountFunctionSource, /auth\.uid\(\)/);
  assert.match(
    ownerCountFunctionSource,
    /where link_vitrines\.user_id = current_user_id/,
  );
  assert.match(
    compactProfileViewMigration,
    /grant execute on function public\.get_current_user_link_vitrine_profile_view_count\(\) to authenticated;/,
  );
  assert.doesNotMatch(
    compactProfileViewMigration,
    /grant execute on function public\.get_current_user_link_vitrine_profile_view_count\(\) to (?:public|anon)/,
  );
});

test("post-deploy cleanup is staged outside automatic migrations", () => {
  assert.match(
    itemClickCleanupMigrationSource,
    /intentionally lives outside\s*-- supabase\/migrations/,
  );
  assert.match(
    itemClickCleanupMigrationSource,
    /Apply only after the new profile-view app release is verified and its\s*-- rollback window has closed/,
  );
  assert.match(
    itemClickCleanupMigrationSource,
    /drop function if exists public\.record_link_vitrine_item_click\(/,
  );
  assert.match(
    itemClickCleanupMigrationSource,
    /drop function if exists public\.get_link_vitrine_item_click_totals\(uuid\)/,
  );
  assert.doesNotMatch(
    itemClickCleanupMigrationSource,
    /\bdrop\s+(?:table|column|index)\b|\bdelete\s+from\b|\btruncate\b/i,
  );
  assert.doesNotMatch(
    itemClickCleanupMigrationSource,
    /drop function if exists public\.sync_owned_link_vitrine_items/,
  );
  assert.match(
    itemClickCleanupMigrationSource,
    /click_events rows, columns, constraints, foreign keys and indexes/,
  );
  assert.match(
    itemClickCleanupMigrationSource,
    /cleanup_click_events_older_than\(integer\)/,
  );
  assert.match(
    itemClickCleanupMigrationSource,
    /supabase\/rollbacks\/20260724121000_restore_link_vitrine_item_click_runtime\.sql/,
  );
});

test("runtime cleanup has a data-preserving rollback contract", () => {
  assert.match(
    itemClickRollbackSource,
    /create or replace function public\.record_link_vitrine_item_click\(/,
  );
  assert.match(
    itemClickRollbackSource,
    /grant execute on function public\.record_link_vitrine_item_click\([^]*\) to service_role;/,
  );
  assert.match(
    itemClickRollbackSource,
    /create or replace function public\.get_link_vitrine_item_click_totals\(/,
  );
  assert.match(
    itemClickRollbackSource,
    /grant execute on function public\.get_link_vitrine_item_click_totals\(uuid\)\s*to authenticated;/,
  );
  assert.doesNotMatch(
    itemClickRollbackSource,
    /\bdrop\s+(?:table|column|index)\b|\bdelete\s+from\b|\btruncate\b/i,
  );
});

test("public profile still omits visual handle and keeps identity metadata", () => {
  assert.doesNotMatch(publicViewSource, /link-vitrine-public-handle/);
  assert.doesNotMatch(publicViewSource, /@\$\{handle\}/);
  assert.match(
    publicViewSource,
    /<h1>\s*\{displayName\}\s*<CheckBadge \/>\s*<\/h1>/,
  );
  assert.match(
    publicViewSource,
    /\{vitrine\.bio \? <p className="link-vitrine-public-bio">\{vitrine\.bio\}<\/p> : null\}/,
  );
  assert.doesNotMatch(publicCssSource, /\.link-vitrine-public-handle/);
  assert.match(publicPageSource, /canonicalUrl\(`\/v\/\$\{vitrine\.handle\}`\)/);
  assert.match(publicPageSource, /handle: vitrine\.handle/);
  assert.match(linkVitrineSeoSource, /mainEntity\.alternateName = profile\.handle/);
});
