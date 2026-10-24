import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { OPERATOR_NAME, SUPPORT_EMAIL, PRIVACY_EMAIL } from "@/lib/operator";
import { NO_INDEX_ROBOTS, localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Optional analytics consent",
  description: "An explanation of the optional analytics preference in this self-hosted application.",
  robots: NO_INDEX_ROBOTS,
  alternates: localizedAlternates("/acik-riza-metni"),
};

const sections = [
  {
    "title": "Scope of this template",
    "items": [
      "This page is a self-hosting template. The operator must identify any analytics provider it actually enables, the data sent, purposes, retention, recipients and any applicable consent requirements before enabling it for users.",
      "An analytics preference is separate from accepting service terms and from reading a privacy notice. It does not grant marketing permission or consent for unrelated processing."
    ]
  },
  {
    "title": "Your choice",
    "items": [
      "The cookie banner offers accept and reject controls. Optional analytics is not enabled by an undecided or rejected consent preference.",
      "The application records a versioned preference in trulygo_consent in localStorage. The preference expires and can be withdrawn through cookie preferences in the footer.",
      "If analytics providers are enabled by the operator, accepting the optional preference can load Vercel Analytics and Speed Insights. Declining does not disable account, link or survey functionality."
    ]
  },
  {
    "title": "Withdrawing consent",
    "items": [
      "Use cookie preferences to clear your choice or choose reject. This stops future optional events from this browser; it cannot retract events already received by an enabled provider.",
      "Necessary sessions and application features are described separately on the cookie and privacy pages. Contact the operator for questions or data-rights requests."
    ]
  }
];

export default function LegalPage() {
  return (
    <main className="app-shell">
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading eyebrow="Independent installation" title="Optional analytics consent"
          description="An explanation of the optional analytics preference in this self-hosted application." />
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
