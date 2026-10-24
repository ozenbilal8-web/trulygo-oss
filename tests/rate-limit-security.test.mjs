import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/rate-limit.ts", import.meta.url), "utf8");

function load({ configured = true, createAdminClient }) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  const stubs = {
    "server-only": {},
    "next/headers": { headers: async () => new Headers() },
    "@/lib/supabase/env": { isSupabaseConfigured: () => configured },
    "@/lib/supabase/admin": { createAdminClient },
  };
  new Function("require", "module", "exports", output)((id) => {
    assert.ok(Object.hasOwn(stubs, id), `Unexpected runtime dependency ${id}`);
    return stubs[id];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const bucket = { action: "auth:login:email", key: "user@example.invalid", limit: 8, windowSeconds: 600 };

test("rate limiting is server-only and invokes the privileged client with the server-selected bucket", async () => {
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /createAnonymousClient/);
  const calls = [];
  const limiter = load({ createAdminClient: () => ({ rpc: async (...args) => {
    calls.push(args);
    return { data: true, error: null };
  } }) });
  assert.equal(await limiter.checkRateLimit(bucket), true);
  assert.deepEqual(calls, [["check_rate_limit", {
    p_action: bucket.action, p_key: bucket.key, p_limit: 8, p_window_seconds: 600,
  }]]);
});

test("missing service credentials preserve fail-closed auth and explicit fail-open callers", async () => {
  const limiter = load({ createAdminClient: () => { throw new Error("not configured"); } });
  assert.equal(await limiter.checkRateLimit(bucket), false);
  assert.equal(await limiter.checkRateLimit({ ...bucket, mode: "fail-open" }), true);
});

test("configured database denials and malformed results never count as allowance", async () => {
  for (const data of [false, null, "true", 1]) {
    const limiter = load({ createAdminClient: () => ({ rpc: async () => ({ data, error: null }) }) });
    assert.equal(await limiter.checkRateLimit({ ...bucket, mode: "fail-open" }), false);
  }
});

test("unconfigured backend and empty buckets do not attempt privileged operations", async () => {
  const limiter = load({ configured: false, createAdminClient: () => { throw new Error("Must not be called"); } });
  assert.equal(await limiter.checkRateLimit(bucket), false);
  assert.equal(await limiter.checkRateLimit({ ...bucket, mode: "fail-open" }), true);
  assert.equal(await limiter.checkRateLimit({ ...bucket, key: " " }), false);
});

test("hardening migration removes public execution and verifies effective role privileges", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261024100758_restrict_rate_limit_rpc.sql", import.meta.url), "utf8");
  assert.match(sql, /revoke all on function public\.check_rate_limit\(text, text, integer, integer\)\s+from public, anon, authenticated;/i);
  assert.match(sql, /grant execute on function public\.check_rate_limit\(text, text, integer, integer\)\s+to service_role;/i);
  for (const role of ["anon", "authenticated", "service_role"]) {
    assert.ok(sql.includes(`pg_catalog.has_function_privilege('${role}',`));
  }
});
