import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(relativePath) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", output)((id) => {
    if (id === "server-only") return {};
    throw new Error(`Unexpected dependency: ${id}`);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test("independent instance origins normalize correctly and reject unsafe configuration", () => {
  const { configuredSiteOrigin } = load("src/lib/seo.ts");
  assert.equal(configuredSiteOrigin(undefined), "http://localhost:3000");
  assert.equal(configuredSiteOrigin(" https://links.example.invalid/path "), "https://links.example.invalid");
  assert.equal(configuredSiteOrigin("http://127.0.0.1:3001"), "http://127.0.0.1:3001");
  for (const value of ["javascript:alert(1)", "file:///tmp/test", "https://user:pass@example.invalid", "not a URL"]) {
    assert.throws(() => configuredSiteOrigin(value));
  }
});

test("email delivery cannot contact the provider without an explicit sender", async () => {
  const before = { key: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM, fetch: globalThis.fetch };
  process.env.RESEND_API_KEY = "test-placeholder";
  globalThis.fetch = async () => { throw new Error("Provider must not be contacted"); };
  try {
    const { sendResendEmail } = load("src/lib/link-vitrine-collaboration-email-server.ts");
    const input = { to: "test@example.invalid", subject: "test", html: "test", text: "test", idempotencyKey: "test" };
    for (const from of ["", "test@example.invalid\r\nBcc: other@example.invalid"]) {
      process.env.RESEND_FROM = from;
      assert.deepEqual(await sendResendEmail(input), { ok: false, errorCode: "resend_not_configured" });
    }
  } finally {
    globalThis.fetch = before.fetch;
    for (const [name, value] of [["RESEND_API_KEY", before.key], ["RESEND_FROM", before.from]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
