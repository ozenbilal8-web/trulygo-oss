import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { OPERATOR_NAME, SUPPORT_EMAIL, PRIVACY_EMAIL } from "@/lib/operator";
import { NO_INDEX_ROBOTS, localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy requests",
  description: "How to contact the operator of this installation about personal data.",
  robots: NO_INDEX_ROBOTS,
  alternates: localizedAlternates("/kvkk-basvurusu"),
};

const sections = [
  {
    "title": "Operator request procedure",
    "items": [
      "This page is a self-hosting template. The operator must publish a working contact channel, legal identity, applicable rights, verification process, response deadlines and escalation options before accepting real users.",
      "The route name is retained for compatibility; this template does not assume that a particular country's law applies. The operator must adapt the procedure to its actual jurisdiction and users."
    ]
  },
  {
    "title": "Sending a request",
    "items": [
      "Use the privacy contact below. Describe the request and, if relevant, the account email or public content URL needed to locate your records.",
      "Do not post private account information, credentials, access tokens or identity documents in public repository issues. This repository is not the operator's private data-rights request channel.",
      "An operator may need proportionate verification before disclosing or changing personal data. Do not send unnecessary identity documents; ask for a secure channel and an explanation of the minimum information required."
    ]
  },
  {
    "title": "Information the operator must provide",
    "items": [
      "Explain how requests for access, correction, deletion, objection or other applicable rights are handled, and how a representative can demonstrate authority when needed.",
      "State the response deadlines, possible lawful exceptions, retention of request records, and applicable supervisory-authority or court remedies.",
      "If no privacy contact is configured, the operator has not completed this template. Do not send requests to the original project maintainers on the assumption that they control this installation."
    ]
  }
];

export default function LegalPage() {
  return (
    <main className="app-shell">
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading eyebrow="Independent installation" title="Privacy requests"
          description="How to contact the operator of this installation about personal data." />
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
