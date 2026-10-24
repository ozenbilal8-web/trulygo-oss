import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { OPERATOR_NAME, SUPPORT_EMAIL, PRIVACY_EMAIL } from "@/lib/operator";
import { NO_INDEX_ROBOTS, localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy notice template",
  description: "How this installation can process data, and what its operator must document before accepting real users.",
  robots: NO_INDEX_ROBOTS,
  alternates: localizedAlternates("/privacy"),
};

const sections = [
  {
    "title": "Who operates this installation?",
    "items": [
      "This page is a self-hosting template, not a completed privacy notice. The operator of this installation is responsible for its data processing. The source-code maintainers do not automatically operate or receive data from independently hosted installations.",
      "Before accepting real users, the operator must publish its legal identity, contact details, applicable purposes and legal grounds, recipients, hosting locations, retention periods, and the rights and request procedure that apply to this installation."
    ]
  },
  {
    "title": "Data handled by the application",
    "items": [
      "Accounts and sessions: email address, authentication records managed by Supabase Auth, profile role and approval status, and the time/version recorded when registration terms and the privacy notice are shown.",
      "Links and moderation: destination URLs, slugs, campaigns, channel links, status, review notes and security-check results. Approved destinations are used for redirects.",
      "Click analytics: time, referrer, User-Agent, UTM parameters, derived device information, approximate location headers when supplied by the host, and pseudonymous visitor hashes. Raw IP addresses can be transient inputs for hashing and abuse protection; hosting providers may also log requests.",
      "Link Vitrini: public handle, display name, biography, avatar/banner, published links and settings. Account email and administrative role are not public profile fields. Published profiles may appear in search engines.",
      "Collaboration requests: sender name, email address, optional phone, message and optional request fields, notification-email verification records and abuse-prevention hashes. Requests are shared with the relevant profile owner and may be emailed when email delivery is configured.",
      "Signal: survey questions, options, responses, vote times and pseudonymous deduplication identifiers. Public result settings can expose response combinations and vote times to other visitors.",
      "Authorized administrators can access account and moderation information needed to operate the service. Access must be limited and reviewed by the operator."
    ]
  },
  {
    "title": "Optional services and transfers",
    "items": [
      "Supabase provides Auth, database and Storage functions. A local development stack keeps these services local; an independently configured hosted project has its own location, contracts and logging settings.",
      "Google Web Risk receives the destination URL only when the operator configures that integration. Avoid confidential information in destination URLs. Missing or unsuccessful screening requires manual review.",
      "Resend receives recipient addresses and email content only when the operator configures email delivery. No mail delivery or provider retention promise is made by this template.",
      "Vercel Analytics and Speed Insights are optional integrations. The operator must disclose enabled providers and obtain any required permission; the consent controls do not by themselves establish lawful processing or international transfers."
    ]
  },
  {
    "title": "Retention and deletion",
    "items": [
      "There is no universal automatic deletion schedule enabled by the application. The operator must configure and verify retention, backups, log access, and deletion procedures.",
      "Account deletion attempts to remove the account and associated database records. Storage objects, infrastructure logs, backups and messages already delivered to recipients may require separate deletion procedures.",
      "Visitor identifiers such as tg_vid and survey cookies are described on the cookie page. Pseudonymous data can still be personal data."
    ]
  },
  {
    "title": "Your requests",
    "items": [
      "Contact the operator using the privacy contact below for access, correction, deletion or other applicable data-rights requests. Do not send identity documents or secrets unless a verified operator explains why proportionate verification is necessary.",
      "The operator must specify applicable response deadlines and available supervisory-authority or court remedies. This template does not select a jurisdiction or promise legal compliance."
    ]
  }
];

export default function LegalPage() {
  return (
    <main className="app-shell">
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading eyebrow="Independent installation" title="Privacy notice template"
          description="How this installation can process data, and what its operator must document before accepting real users." />
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
