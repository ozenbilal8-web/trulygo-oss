import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { OPERATOR_NAME, SUPPORT_EMAIL, PRIVACY_EMAIL } from "@/lib/operator";
import { NO_INDEX_ROBOTS, localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Cookie and local storage information",
  description: "The browser storage used by the application and the choices available to visitors.",
  robots: NO_INDEX_ROBOTS,
  alternates: localizedAlternates("/cerez-politikasi"),
};

const sections = [
  {
    "title": "Scope of this template",
    "items": [
      "This page is a self-hosting template. The operator must verify actual cookie names, durations, providers and purposes in its deployment and publish any additional cookies introduced by its hosting or integrations.",
      "A cookie being described here does not determine its legal basis. The operator is responsible for meeting the requirements applicable to this installation."
    ]
  },
  {
    "title": "Application storage",
    "items": [
      "Supabase Auth cookies maintain authentication sessions. Exact cookie names and expiry depend on the Auth and session configuration.",
      "tg_vid: a first-party pseudonymous visitor identifier used for click measurement and repeat-visitor handling, with a configured maximum age of 400 days.",
      "tg_signal_<anket-kodu>: a first-party survey vote marker set after voting, with a configured maximum age of 365 days.",
      "trulygo_consent (localStorage): stores the version, time and choice for optional analytics. The preference expires and can be cleared using cookie preferences.",
      "trulygo:public-utm-draft:v1 (sessionStorage): holds a temporary UTM draft in the current browser session."
    ]
  },
  {
    "title": "Optional analytics and controls",
    "items": [
      "Vercel Analytics and Speed Insights can be enabled by the operator and load only after an accepted optional analytics preference. Rejecting optional analytics does not disable core application features.",
      "Use the cookie preferences control in the footer to change or withdraw your choice. Browser settings can also remove or block storage; blocking authentication cookies may prevent sign-in.",
      "The operator must describe any other enabled provider and verify its actual storage and data transfers. Refer to the privacy notice for server-side logging, security and analytics processing."
    ]
  }
];

export default function LegalPage() {
  return (
    <main className="app-shell">
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading eyebrow="Independent installation" title="Cookie and local storage information"
          description="The browser storage used by the application and the choices available to visitors." />
        <section className="legal-card surface-card-interactive mt-8 p-6">
          <h2 className="text-xl font-semibold">Installation operator</h2>
          <p className="mt-3">{OPERATOR_NAME}</p>
          <p className="mt-2">Support: {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : "Not configured"}</p>
          <p className="mt-2">Privacy requests: {PRIVACY_EMAIL ? <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> : "Not configured"}</p>
          <p className="mt-4 text-sm text-[var(--color-muted)]">Template status: requires operator review before use with real users. This page is not legal advice or a claim of legal compliance.</p>
        </section>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="legal-card surface-card-interactive p-6">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="legal-list mt-4 grid gap-3 text-sm leading-6 text-[var(--color-muted)]">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <nav aria-label="Related legal information" className="mt-8 flex flex-wrap gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/acik-riza-metni">Optional analytics</Link>
          <Link href="/cerez-politikasi">Cookies</Link>
          <Link href="/kvkk-basvurusu">Privacy requests</Link>
        </nav>
        <p className="mt-8 text-sm text-[var(--color-muted)]">Template updated: 24 October 2026. The operator must publish its own effective date after review.</p>
      </section>
    </main>
  );
}
