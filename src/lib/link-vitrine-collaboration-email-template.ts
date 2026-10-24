import {
  formatCollaborationBudget,
  getCollaborationRequestTypeLabel,
  type LinkVitrineCollaborationBudgetCurrency,
  type LinkVitrineCollaborationRequestType,
} from "@/lib/link-vitrine-collaboration";
import {
  buildTransactionalEmailAction,
  buildTransactionalEmailLinkFallback,
  buildTransactionalEmailSecurityNote,
  buildTransactionalEmailShell,
  buildTransactionalEmailSupportFooter,
  escapeEmailHtml,
  getTransactionalEmailBrandLogoUrl,
  paragraphizeEmailText,
  TRULYGO_TRANSACTIONAL_EMAIL_FROM,
  TRULYGO_TRANSACTIONAL_EMAIL_SUPPORT,
} from "@/lib/transactional-email-template";

export { escapeEmailHtml } from "@/lib/transactional-email-template";

export const LINK_VITRINE_COLLABORATION_EMAIL_FROM =
  TRULYGO_TRANSACTIONAL_EMAIL_FROM;
export const LINK_VITRINE_COLLABORATION_NOTIFICATION_SUBJECT =
  "Yeni bir iş birliği teklifi aldınız | TrulyGo";
export const LINK_VITRINE_COLLABORATION_VERIFICATION_SUBJECT =
  "Bildirim e-posta adresinizi doğrulayın | TrulyGo";

function buildDefinitionRow(label: string, value: string) {
  return `<tr>
    <td style="width:150px;padding:7px 14px 7px 0;color:#8eaaa0;font-size:13px;vertical-align:top;">${escapeEmailHtml(label)}</td>
    <td style="padding:7px 0;color:#ecfff7;font-size:14px;line-height:1.55;word-break:break-word;">${value}</td>
  </tr>`;
}

export function buildCollaborationVerificationEmail({
  verificationUrl,
}: {
  verificationUrl: string;
}) {
  const body = `
    <h1 style="margin:0 0 14px;font-size:25px;line-height:1.25;color:#f3fff9;">Bildirim adresinizi doğrulayın</h1>
    <p style="margin:0 0 22px;color:#b8cec5;font-size:15px;line-height:1.65;">
      Link Vitrini iş birliği bildirimlerini bu adreste almak için aşağıdaki düğmeyle doğrulamayı tamamlayın.
    </p>
    ${buildTransactionalEmailAction({
      href: verificationUrl,
      label: "E-posta adresini doğrula",
    })}
    ${buildTransactionalEmailLinkFallback({ href: verificationUrl })}
    ${buildTransactionalEmailSecurityNote(
      "Bu bağlantı 45 dakika geçerlidir ve yalnızca bir kez kullanılabilir. Bu isteği siz başlatmadıysanız e-postayı yok sayabilirsiniz.",
    )}
    ${buildTransactionalEmailSupportFooter()}`;

  return {
    subject: LINK_VITRINE_COLLABORATION_VERIFICATION_SUBJECT,
    html: buildTransactionalEmailShell({
      brandLogoUrl: getTransactionalEmailBrandLogoUrl(verificationUrl),
      bodyHtml: body,
      preheader: "Link Vitrini bildirim adresinizi doğrulayın.",
    }),
    text: [
      "Bildirim adresinizi doğrulayın",
      "",
      "Link Vitrini iş birliği bildirimlerini bu adreste almak için bağlantıyı açın:",
      verificationUrl,
      "",
      "Bu bağlantı 45 dakika geçerlidir ve yalnızca bir kez kullanılabilir.",
      "Bu isteği siz başlatmadıysanız e-postayı yok sayabilirsiniz.",
      "",
      ...(TRULYGO_TRANSACTIONAL_EMAIL_SUPPORT ? [`Destek: ${TRULYGO_TRANSACTIONAL_EMAIL_SUPPORT}`] : []),
    ].join("\n"),
  };
}


export function buildCollaborationNotificationEmail({
  senderName,
  senderEmail,
  senderPhone,
  requestType,
  budgetAmount,
  budgetCurrency,
  subject,
  message,
  createdAt,
  profileDisplayName,
  profileHandle,
  detailUrl,
}: {
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  requestType: LinkVitrineCollaborationRequestType;
  budgetAmount: string | null;
  budgetCurrency: LinkVitrineCollaborationBudgetCurrency | null;
  subject: string;
  message: string;
  createdAt: string;
  profileDisplayName: string;
  profileHandle: string;
  detailUrl: string;
}) {
  const requestTypeLabel = getCollaborationRequestTypeLabel(requestType);
  const budget = formatCollaborationBudget({
    amount: budgetAmount,
    currency: budgetCurrency,
  });
  const createdAtLabel = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(createdAt));
  const rows = [
    buildDefinitionRow("Gönderen", escapeEmailHtml(senderName)),
    buildDefinitionRow("E-posta", escapeEmailHtml(senderEmail)),
    senderPhone
      ? buildDefinitionRow("Telefon", escapeEmailHtml(senderPhone))
      : "",
    buildDefinitionRow("Talep türü", escapeEmailHtml(requestTypeLabel)),
    budget ? buildDefinitionRow("Bütçe", escapeEmailHtml(budget)) : "",
    buildDefinitionRow("Konu", escapeEmailHtml(subject)),
    buildDefinitionRow("Gönderim", escapeEmailHtml(createdAtLabel)),
    buildDefinitionRow(
      "Profil",
      `${escapeEmailHtml(profileDisplayName)} · ${escapeEmailHtml(profileHandle)}`,
    ),
  ].join("");
  const body = `
    <h1 style="margin:0 0 14px;font-size:25px;line-height:1.25;color:#f3fff9;">Yeni bir iş birliği teklifi aldınız</h1>
    <p style="margin:0 0 22px;color:#b8cec5;font-size:15px;line-height:1.65;">
      Link Vitrini profiliniz üzerinden yeni bir iş birliği teklifi aldınız.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">${rows}</table>
    <div style="margin:0 0 24px;padding:16px;border-radius:12px;background:#09130f;border:1px solid #1d352d;color:#dff7ed;font-size:14px;line-height:1.7;word-break:break-word;">${paragraphizeEmailText(message)}</div>
    ${buildTransactionalEmailAction({
      href: detailUrl,
      label: "Talebi görüntüle",
    })}
    ${buildTransactionalEmailLinkFallback({ href: detailUrl })}
    ${buildTransactionalEmailSupportFooter()}`;

  return {
    subject: LINK_VITRINE_COLLABORATION_NOTIFICATION_SUBJECT,
    html: buildTransactionalEmailShell({
      brandLogoUrl: getTransactionalEmailBrandLogoUrl(detailUrl),
      bodyHtml: body,
      preheader: "Link Vitrini profilinizden yeni bir iş birliği teklifi geldi.",
    }),
    text: [
      "Link Vitrini profiliniz üzerinden yeni bir iş birliği teklifi aldınız.",
      "",
      `Gönderen: ${senderName}`,
      `E-posta: ${senderEmail}`,
      ...(senderPhone ? [`Telefon: ${senderPhone}`] : []),
      `Talep türü: ${requestTypeLabel}`,
      ...(budget ? [`Bütçe: ${budget}`] : []),
      `Konu: ${subject}`,
      `Gönderim: ${createdAtLabel}`,
      `Profil: ${profileDisplayName} · ${profileHandle}`,
      "",
      message,
      "",
      `Talebi görüntüle: ${detailUrl}`,
    ].join("\n"),
  };
}
