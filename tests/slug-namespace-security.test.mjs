import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20261024101235_harden_shared_slug_namespace.sql", import.meta.url), "utf8");
const functionBody = (name) => {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1);
  return sql.slice(start, sql.indexOf("$$;", start) + 3);
};

test("cross-table writers check hidden rows with a fixed privileged execution context", () => {
  for (const name of ["enforce_channel_link_parent", "prevent_link_request_channel_slug_conflict"]) {
    const body = functionBody(name);
    assert.match(body, /volatile\s+security definer\s+set search_path = ''/);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\(\\) from public, anon, authenticated, service_role;`));
  }
  assert.match(functionBody("enforce_channel_link_parent"), /main\.id = new\.link_request_id and main\.user_id = new\.user_id/);
  assert.match(functionBody("enforce_channel_link_parent"), /new\.user_id is distinct from auth\.uid\(\)/);
  assert.doesNotMatch(sql, /raise exception[^;]*target_url/);
});

test("both writers share sorted old/new transaction locks before any collision query", () => {
  const helper = functionBody("lock_link_slug_namespace");
  assert.match(helper, /select distinct pg_catalog\.hashtextextended/);
  assert.match(helper, /pg_catalog\.lower\(candidate\.slug\)/);
  assert.match(helper, /unnest\(array\[p_old_slug, p_new_slug\]\)/);
  assert.match(helper, /order by lock_value\s+loop\s+perform pg_catalog\.pg_advisory_xact_lock/);
  for (const [name, field] of [["enforce_channel_link_parent", "slug"], ["prevent_link_request_channel_slug_conflict", "requested_slug"]]) {
    const body = functionBody(name);
    assert.ok(body.includes(`old_slug := old.${field};`));
    assert.ok(body.includes(`perform public.lock_link_slug_namespace(old_slug, new.${field});`));
    assert.ok(body.indexOf("perform public.lock_link_slug_namespace") < body.indexOf("if exists (") || name === "prevent_link_request_channel_slug_conflict");
    assert.ok(body.indexOf("perform public.lock_link_slug_namespace") < body.indexOf("from public."));
  }
});

test("snapshot isolation cannot bypass checks after a concurrent lock wait", () => {
  assert.match(functionBody("lock_link_slug_namespace"), /current_setting\('transaction_isolation'\) <> 'read committed'/);
  assert.match(functionBody("lock_link_slug_namespace"), /errcode = 'feature_not_supported'/);
});

test("migration preserves active main and unconditional channel reservation semantics", () => {
  assert.match(functionBody("enforce_channel_link_parent"), /main\.status in \('pending', 'approved'\)/);
  const main = functionBody("prevent_link_request_channel_slug_conflict");
  assert.match(main, /new\.status in \('pending', 'approved'\)/);
  assert.match(main, /select 1 from public\.channel_links as channel\s+where pg_catalog\.lower\(channel\.slug\)/);
  assert.match(sql, /lock table public\.link_requests, public\.channel_links in share row exclusive mode/);
  assert.match(sql, /existing main\/channel slug collision requires operator resolution/);
  assert.doesNotMatch(sql, /delete from|truncate|update public\./i);
});

test("anonymous grants are revoked at column and table levels without removing owner access", () => {
  assert.match(sql, /revoke select on table public\.link_requests, public\.channel_links from public, anon;/);
  assert.match(sql, /revoke select \(id, requested_slug, target_url, campaign_name, status\)\s+on table public\.link_requests from public, anon;/);
  assert.match(sql, /revoke select \(id, link_request_id, slug,[\s\S]+?on table public\.channel_links from public, anon;/);
  for (const table of ["link_requests", "channel_links"]) {
    assert.ok(sql.includes(`has_any_column_privilege('anon', 'public.${table}', 'SELECT')`));
  }
  assert.doesNotMatch(sql, /revoke select[^;]*from[^;]*authenticated/);
});
