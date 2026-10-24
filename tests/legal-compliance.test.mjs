import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadConsentModule() {
  const relativePath = "src/lib/consent.ts";
  const absolutePath = path.join(projectRoot, relativePath);
  const output = ts.transpileModule(source(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absolutePath,
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("module", "exports", output)(compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const packageSource = source("package.json");
const footerSource = source("src/components/site-footer.tsx");
const cookieBannerSource = source("src/components/cookie-consent-banner.tsx");
const cookiePreferencesSource = source("src/components/cookie-preferences-button.tsx");
const analyticsSource = source("src/components/consented-analytics.tsx");
const registerConsentSource = source("src/components/register-consent.tsx");
const authActionsSource = source("src/app/auth/actions.ts");
const privacySource = source("src/app/(chrome)/privacy/page.tsx");
const cookiePolicySource = source("src/app/(chrome)/cerez-politikasi/page.tsx");
const explicitConsentSource = source("src/app/(chrome)/acik-riza-metni/page.tsx");
const applicationSource = source("src/app/(chrome)/kvkk-basvurusu/page.tsx");
const termsSource = source("src/app/(chrome)/terms/page.tsx");
const signalVoterSource = source("src/app/signal/[slug]/signal-voter.tsx");
const signalEditorSource = source("src/app/dashboard/signal/signal-survey-editor.tsx");
const vitrineEditorSource = source("src/app/dashboard/link-vitrini/link-vitrini-editor.tsx");
const globalsSource = source("src/app/globals.css");

test("consent preference is versioned, expires, and can be withdrawn", () => {
  const storage = new Map();
  const events = [];
  global.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    dispatchEvent: (event) => events.push(event.type),
  };

  try {
    const consent = loadConsentModule();

    storage.set(consent.CONSENT_STORAGE_KEY, "all");
    assert.equal(consent.getCookieConsent(), null, "legacy unversioned values must be renewed");
    assert.equal(storage.has(consent.CONSENT_STORAGE_KEY), false);

    const analyticsEvent = { route: "/privacy" };
    assert.equal(consent.filterOptionalAnalyticsEvent(analyticsEvent), null);

    consent.setCookieConsent("all");
    assert.equal(consent.getCookieConsent(), "all");
    assert.equal(consent.filterOptionalAnalyticsEvent(analyticsEvent), analyticsEvent);
    const stored = JSON.parse(storage.get(consent.CONSENT_STORAGE_KEY));
    assert.deepEqual(Object.keys(stored).sort(), ["choice", "decidedAt", "version"]);
    assert.equal(stored.version, "2026-08-28");

    storage.set(
      consent.CONSENT_STORAGE_KEY,
      JSON.stringify({
        choice: "all",
        decidedAt: new Date(Date.now() - consent.CONSENT_MAX_AGE_MS - 1).toISOString(),
        version: consent.CONSENT_VERSION,
      }),
    );
    assert.equal(consent.getCookieConsent(), null, "expired consent must not load analytics");
    assert.equal(storage.has(consent.CONSENT_STORAGE_KEY), false);

    consent.setCookieConsent("all");
    consent.clearCookieConsent();
    assert.equal(storage.has(consent.CONSENT_STORAGE_KEY), false);
    assert.equal(consent.filterOptionalAnalyticsEvent(analyticsEvent), null);

    consent.setCookieConsent("all");
    global.window.localStorage.removeItem = () => {
      throw new Error("storage blocked");
    };
    consent.clearCookieConsent();
    assert.equal(
      consent.filterOptionalAnalyticsEvent(analyticsEvent),
      null,
      "same-tab withdrawal must fail closed when persisted storage cannot be removed",
    );
    assert.ok(events.length >= 2);
  } finally {
    delete global.window;
  }
});

test("optional analytics stays opt-in and accept/reject controls are equal", () => {
  assert.match(analyticsSource, /if \(process\.env\.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true" \|\| choice !== "all"\)\s*\{\s*return null;/);
  assert.equal(
    (analyticsSource.match(/beforeSend=\{filterOptionalAnalyticsEvent\}/g) ?? []).length,
    2,
  );
  assert.match(cookieBannerSource, />\s*Reddet\s*</);
  assert.match(cookieBannerSource, />\s*Kabul et\s*</);
  assert.equal((cookieBannerSource.match(/className="btn btn-ghost btn-sm"/g) ?? []).length, 2);
  assert.doesNotMatch(cookieBannerSource, /btn-primary/);
  assert.match(cookieBannerSource, /className="cookie-preferences-trigger"/);
  assert.match(cookiePreferencesSource, /clearCookieConsent/);
  assert.match(footerSource, /<CookiePreferencesButton \/>/);
});

test("registration separates contract acceptance from KVKK notice", () => {
  assert.match(registerConsentSource, /name="terms_consent"/);
  assert.match(registerConsentSource, /Kullanım Şartları/);
  assert.match(registerConsentSource, /bir açık rıza veya sözleşme\s+kabulü değildir/);
  assert.doesNotMatch(registerConsentSource, /name="kvkk_consent"|name="marketing_consent"/);
  assert.match(authActionsSource, /formData\.get\("terms_consent"\)/);
  assert.doesNotMatch(authActionsSource, /formData\.get\("marketing_consent"\)/);
  for (const field of [
    "terms_accepted_at",
    "terms_version",
    "terms_source",
    "privacy_notice_shown_at",
    "privacy_notice_version",
    "privacy_notice_source",
  ]) {
    assert.match(authActionsSource, new RegExp(`${field}:`));
  }
  assert.match(authActionsSource, /terms_version: "2026-08-28"/);
  assert.match(authActionsSource, /privacy_notice_version: "2026-08-28"/);
});

test("legal templates retain routes and identify operator review requirements", () => {
  for (const [route, pageSource] of [
    ["/privacy", privacySource], ["/acik-riza-metni", explicitConsentSource],
    ["/kvkk-basvurusu", applicationSource], ["/cerez-politikasi", cookiePolicySource],
    ["/terms", termsSource],
  ]) {
    assert.ok(footerSource.includes(`href: "${route}"`));
    assert.match(pageSource, /NO_INDEX_ROBOTS/);
    assert.match(pageSource, /requires operator review before use with real users/);
    assert.match(pageSource, /not legal advice or a claim of legal compliance/);
    assert.match(pageSource, /OPERATOR_NAME/);
    assert.match(pageSource, /PRIVACY_EMAIL/);
    assert.match(pageSource, /SUPPORT_EMAIL/);
    assert.doesNotMatch(pageSource, /trulygo\.link|@[a-z]+\.com/);
  }
});

test("privacy templates describe actual data flows and avoid invented service promises", () => {
  for (const text of ["Google Web Risk", "administrators", "tg_vid", "Signal", "Resend", "Storage", "no universal automatic deletion schedule"]) {
    assert.ok(privacySource.includes(text));
  }
  assert.match(privacySource, /hosting providers may also log requests/);
  assert.match(privacySource, /may require separate deletion procedures/);
  assert.match(cookiePolicySource, /tg_signal_<anket-kodu>/);
  assert.match(cookiePolicySource, /trulygo_consent \(localStorage\)/);
  assert.match(cookiePolicySource, /trulygo:public-utm-draft:v1 \(sessionStorage\)/);
  assert.match(explicitConsentSource, /withdrawn through cookie preferences/);
  assert.match(termsSource, /MIT License/);
  assert.match(termsSource, /trademarks are not licensed/);
  assert.match(termsSource, /not a guarantee that a destination is safe/);
});

test("Signal and Link Vitrini expose layered notices at the point of use", () => {
  assert.match(signalVoterSource, /takma adlı bir belirteçle işlenir/);
  assert.match(signalVoterSource, /oy zamanları ve cevap\s+kombinasyonları diğer ziyaretçiler tarafından da görülebilir/);
  assert.match(signalVoterSource, /href="\/privacy"/);
  assert.match(signalEditorSource, /Hassas veri ve aydınlatma uyarısı/);
  assert.match(signalEditorSource, /TrulyGo kullanmak anketinizi tek\s+başına hukuka uygun hâle getirmez/);
  assert.match(signalEditorSource, /cevap kombinasyonlarını public hâle getirebilir/);
  assert.match(vitrineEditorSource, /uygun profiller arama motorlarında/);
  assert.match(vitrineEditorSource, /Hesap e-postanız public profile eklenmez/);
  assert.match(
    globalsSource,
    /\.link-vitrine-editor-form\s*\{[\s\S]*?padding-bottom: calc\(150px \+ env\(safe-area-inset-bottom\)\)/,
  );
});

test("privacy requests direct users to the operator without collecting unnecessary identity data", () => {
  assert.match(applicationSource, /working contact channel/);
  assert.match(applicationSource, /response deadlines and escalation options/);
  assert.match(applicationSource, /Do not post private account information/);
  assert.match(applicationSource, /proportionate verification/);
  assert.match(applicationSource, /Do not send unnecessary identity documents/);
  assert.match(applicationSource, /does not assume that a particular country/);
});

test("operator contact accepts valid email and rejects injection or malformed addresses", () => {
  const output = ts.transpileModule(source("src/lib/operator.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  new Function("module", "exports", "process", output)(compiled, compiled.exports, {env:{}});
  const { normalizeOperatorEmail, OPERATOR_NAME, SUPPORT_EMAIL, PRIVACY_EMAIL } = compiled.exports;
  assert.equal(OPERATOR_NAME, "Operator not configured");
  assert.equal(SUPPORT_EMAIL, "");
  assert.equal(PRIVACY_EMAIL, "");
  assert.equal(normalizeOperatorEmail("  support@example.org  "), "support@example.org");
  for (const value of [undefined, "", "bad", "x@example.org\r\nBcc:other@example.org", "x@example.org\n", "x?bcc=other@example.org", "x#fragment@example.org", "x@host..org", "<x@example.org>", "x".repeat(255) + "@example.org"]) {
    assert.equal(normalizeOperatorEmail(value), "");
  }
});

test("package exposes the focused legal compliance command", () => {
  assert.match(
    packageSource,
    /"test:legal": "node --test tests\/legal-compliance\.test\.mjs"/,
  );
});
