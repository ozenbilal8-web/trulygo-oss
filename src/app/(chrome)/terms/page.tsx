import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { OPERATOR_NAME, SUPPORT_EMAIL, PRIVACY_EMAIL } from "@/lib/operator";
import { NO_INDEX_ROBOTS, localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of use template",
  description: "A starting point for the operator of an independent installation to publish its service terms.",
  robots: NO_INDEX_ROBOTS,
  alternates: localizedAlternates("/terms"),
};

const sections = [
  {
    "title": "Before using this installation",
    "items": [
      "This page is a self-hosting template, not a completed service contract. The operator must replace or adapt it before accepting real users, identify the contracting party, and explain the terms that apply in the relevant jurisdiction.",
      "This installation is independently operated. The open-source maintainers do not promise hosting, support, account access, data recovery, availability or any service level for it."
    ]
  },
  {
    "title": "Acceptable use and content",
    "items": [
      "Use only content and destination URLs you are entitled to publish. Do not create links for malware, phishing, deception, illegal content, harassment or unauthorized disclosure of personal information.",
      "Do not bypass access controls, abuse rate limits, impersonate others, or attempt to access another user's private records. Keep account credentials private.",
      "Public profiles and survey content are visible according to their publication settings. The account holder is responsible for obtaining necessary rights and providing any notices required for the content they collect or publish."
    ]
  },
  {
    "title": "Review and limitations",
    "items": [
      "Link requests can require administrator review. Approval or automated screening is not a guarantee that a destination is safe or will stay safe.",
      "Approved link destinations are immutable within the normal editing workflow. The operator must describe moderation, removal, suspension and appeal procedures for this installation.",
      "The operator must specify any charges, cancellation rights, availability commitments and limitations permitted by applicable law. No such commercial promises are made by this template."
    ]
  },
  {
    "title": "Software license and trademarks",
    "items": [
      "Original project source code is distributed under the MIT License in the repository. The code license is separate from the operator's service terms and does not grant access to a hosted service, user data or credentials.",
      "Dependencies and third-party material retain their own licenses. Names and trademarks are not licensed by the MIT License. Using a platform name to identify a supported destination does not imply endorsement."
    ]
  },
  {
    "title": "Privacy and contact",
    "items": [
      "Review the privacy, cookie and optional analytics pages before using data-backed features. Contract acceptance is separate from optional analytics consent.",
      "The operator must provide a working support and privacy contact, an effective date, and a process for material changes to these terms. Do not assume that the repository issue tracker is a private support channel."
    ]
  }
];

export default function LegalPage() {
  return (
    <main className="app-shell">
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading eyebrow="Independent installation" title="Terms of use template"
          description="A starting point for the operator of an independent installation to publish its service terms." />
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
