import { canonicalUrl } from "@/lib/seo";
import {
  buildTransactionalEmailAction,
  buildTransactionalEmailLinkFallback,
  buildTransactionalEmailShell,
  buildTransactionalEmailSupportFooter,
  escapeEmailHtml,
  getTransactionalEmailBrandLogoUrl,
} from "@/lib/transactional-email-template";

export const PRIVACY_UPDATE_EMAIL_SUBJECT = "Privacy and terms update | TrulyGo";

export function buildPrivacyUpdateEmail({ from, to }: { from: string; to: string }) {
  const pages = [
    ["Privacy notice", "/privacy"],
    ["Consent information", "/acik-riza-metni"],
    ["Privacy requests", "/kvkk-basvurusu"],
    ["Cookie information", "/cerez-politikasi"],
    ["Terms", "/terms"],
  ];
  const privacyUrl = canonicalUrl("/privacy");
  const html = buildTransactionalEmailShell({
    brandLogoUrl: getTransactionalEmailBrandLogoUrl(privacyUrl),
    preheader: "Review the operator's updated privacy notice and terms.",
    bodyHtml: `
      <h1 style="margin:0 0 14px;font-size:25px;color:#f3fff9;">Privacy and terms update</h1>
      <p style="color:#b8cec5;font-size:15px;line-height:1.65;">The operator of your TrulyGo instance has updated its notices. Please review the current information:</p>
      <ul>${pages.map(([label, route]) => `<li><a href="${escapeEmailHtml(canonicalUrl(route))}" style="color:#8ff0c4;">${escapeEmailHtml(label)}</a></li>`).join("")}</ul>
      ${buildTransactionalEmailAction({ href: privacyUrl, label: "Review updates" })}
      ${buildTransactionalEmailLinkFallback({ href: privacyUrl })}
      ${buildTransactionalEmailSupportFooter()}`,
  });
  const text = [
    "The operator of your TrulyGo instance has updated its privacy notice and terms.",
    "",
    ...pages.map(([label, route]) => `${label}: ${canonicalUrl(route)}`),
  ].join("\n");
  return { from, to, subject: PRIVACY_UPDATE_EMAIL_SUBJECT, html, text };
}
