import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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

const commonTemplateModule = loadTypeScriptModule(
  "src/lib/transactional-email-template.ts",
);
const privacyTemplateModule = loadTypeScriptModule(
  "src/lib/privacy-update-email-template.ts",
  {
    "@/lib/transactional-email-template": commonTemplateModule,
    "@/lib/seo": loadTypeScriptModule("src/lib/seo.ts"),
  },
);

const authTemplateCases = [
  {
    htmlFile: "docs/email-templates/supabase-confirm-signup.html",
    textFile: "docs/email-templates/supabase-confirm-signup.txt",
    type: "signup",
    next: "/dashboard",
    subject: "E-posta adresinizi doğrulayın | TrulyGo",
  },
  {
    htmlFile: "docs/email-templates/supabase-reset-password.html",
    textFile: "docs/email-templates/supabase-reset-password.txt",
    type: "recovery",
    next: "/reset-password",
    subject: "Şifrenizi yenileyin | TrulyGo",
  },
  {
    htmlFile: "docs/email-templates/supabase-change-email.html",
    textFile: "docs/email-templates/supabase-change-email.txt",
    type: "email",
    next: "/dashboard",
    subject: "Yeni e-posta adresinizi doğrulayın | TrulyGo",
  },
];

test("Supabase Auth templates preserve the token-hash callback contract", () => {
  for (const template of authTemplateCases) {
    const html = source(template.htmlFile);
    const text = source(template.textFile);
    const htmlLink =
      `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}` +
      `&amp;type=${template.type}&amp;next=${template.next}`;
    const textLink =
      `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}` +
      `&type=${template.type}&next=${template.next}`;

    assert.ok(
      (html.match(new RegExp(htmlLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
        .length >= 2,
      template.htmlFile,
    );
    assert.match(text, new RegExp(textLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, /ConfirmationURL/);
    assert.doesNotMatch(text, /ConfirmationURL/);
  }
});

test("Supabase Auth HTML uses text branding and an email-safe shell", () => {
  for (const { htmlFile } of authTemplateCases) {
    const html = source(htmlFile);

    assert.match(html, /TrulyGo OSS<\/span>/);
    assert.doesNotMatch(html, /<img\b|src="https?:/);
    assert.match(html, /display:none!important/);
    assert.match(html, /role="presentation"/);
    assert.match(html, /background:#07100d/);
    assert.match(html, /background:#56e6a8/);
    assert.match(html, /Buton çalışmazsa bu bağlantıyı/);
    assert.doesNotMatch(html, /mailto:info@/);
    assert.doesNotMatch(html, /<script|<link\b|<style\b/i);
    assert.doesNotMatch(html, /utm_|tracking|pixel/i);
  }
});

test("email-change template keeps NewEmail in Go template auto-escape context", () => {
  const html = source("docs/email-templates/supabase-change-email.html");

  assert.match(html, /\{\{ \.NewEmail \}\}/);
  assert.doesNotMatch(html, /safeHTML|template\.HTML|htmlSafe/i);
});

test("template README records installation mapping and external-delivery boundaries", () => {
  const readme = source("docs/email-templates/README.md");

  for (const { htmlFile } of authTemplateCases) {
    assert.match(readme, new RegExp(path.basename(htmlFile).replaceAll(".", "\\.")));
  }

  assert.match(readme, /Auth SMTP is independent/);
  assert.match(readme, /Do not disable[^]*escaping or add tracking parameters/i);
  assert.match(readme, /cannot establish external delivery/);
  assert.match(readme, /does[^]*not currently provide an account-email-change initiation screen/);
});

test("common transactional helpers escape dynamic text and isolate logo from URL fragments", () => {
  const maliciousUrl =
    'http://localhost:3000/path?value="><img src=x onerror=alert(1)>#token=secret';
  const action = commonTemplateModule.buildTransactionalEmailAction({
    href: maliciousUrl,
    label: "<script>alert(1)</script>",
  });
  const securityNote =
    commonTemplateModule.buildTransactionalEmailSecurityNote(
      "<svg onload=alert(1)>",
    );
  const logoUrl =
    commonTemplateModule.getTransactionalEmailBrandLogoUrl(maliciousUrl);

  assert.doesNotMatch(action, /<script>|<img src=x/);
  assert.match(action, /&lt;script&gt;/);
  assert.match(action, /&quot;&gt;&lt;img/);
  assert.doesNotMatch(securityNote, /<svg/);
  assert.match(securityNote, /&lt;svg/);
  assert.equal(
    logoUrl,
    "http://localhost:3000/brand/trulygo-report-logo.png",
  );
  assert.doesNotMatch(logoUrl, /token|secret/);
});

test("KVKK batch builder now has matching HTML and plain-text alternatives", () => {
  const email = privacyTemplateModule.buildPrivacyUpdateEmail({
    from: "TrulyGo <verified@example.invalid>",
    to: "test@example.com",
  });

  assert.equal(email.from, "TrulyGo <verified@example.invalid>");
  assert.equal(email.to, "test@example.com");
  assert.match(email.subject, /Privacy and terms update/);
  assert.match(
    email.html,
    /http:\/\/localhost:3000\/brand\/trulygo-report-logo\.png/,
  );
  for (const route of [
    "/privacy",
    "/acik-riza-metni",
    "/kvkk-basvurusu",
    "/cerez-politikasi",
    "/terms",
  ]) {
    assert.ok(email.html.includes(`http://localhost:3000${route}`));
    assert.ok(email.text.includes(`http://localhost:3000${route}`));
  }
  assert.match(email.html, /Buton çalışmazsa bu bağlantıyı/);
  assert.doesNotMatch(email.text, /mailto:|info@/);
});

test("KVKK route keeps its admin, rate-limit, batch and sender behavior", () => {
  const route = source("src/app/api/admin/notify-privacy-update/route.ts");

  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /mode: "fail-closed"/);
  assert.match(route, /RESEND_BATCH_ENDPOINT/);
  assert.match(route, /buildPrivacyUpdateEmail\(\{ from, to: email \}\)/);
  assert.match(
    route,
    /process\.env\.RESEND_FROM\?\.trim\(\) \|\| ""/,
  );
});

test("auth confirm rejects external, protocol-relative and backslash next targets", async () => {
  const verified = [];
  const confirmModule = loadTypeScriptModule(
    "src/app/auth/confirm/route.ts",
    {
      "@supabase/ssr": {
        createServerClient() {
          return {
            auth: {
              async verifyOtp(input) {
                verified.push(input);
                return { error: null };
              },
              async getUser() {
                return { data: { user: null } };
              },
            },
          };
        },
      },
      "@supabase/supabase-js": {},
      "@/lib/supabase/env": {
        getSupabasePublicConfig() {
          return {
            url: "https://project.supabase.co",
            anonKey: "public-key",
          };
        },
      },
      "@/lib/supabase/auth-response-headers": {
        applySupabaseAuthResponseHeaders() {},
      },
    },
  );

  for (const next of [
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
  ]) {
    const request = {
      url:
        "http://localhost:3000/auth/confirm?token_hash=test-token" +
        `&type=signup&next=${encodeURIComponent(next)}`,
      cookies: { getAll: () => [] },
    };
    const response = await confirmModule.GET(request);

    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/dashboard",
    );
  }

  assert.deepEqual(
    verified.map(({ type, token_hash }) => ({ type, token_hash })),
    [
      { type: "signup", token_hash: "test-token" },
      { type: "signup", token_hash: "test-token" },
      { type: "signup", token_hash: "test-token" },
    ],
  );
});
