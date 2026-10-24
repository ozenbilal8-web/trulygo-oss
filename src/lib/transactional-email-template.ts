export const TRULYGO_TRANSACTIONAL_EMAIL_FROM =
  process.env.RESEND_FROM?.trim() || "";
export const TRULYGO_TRANSACTIONAL_EMAIL_SUPPORT = process.env.SUPPORT_EMAIL?.trim() || "";
export const TRULYGO_TRANSACTIONAL_EMAIL_LOGO_PATH =
  "/brand/trulygo-report-logo.png";

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function paragraphizeEmailText(value: string) {
  return escapeEmailHtml(value).replace(/\n/g, "<br>");
}

export function getTransactionalEmailBrandLogoUrl(actionUrl: string) {
  return new URL(TRULYGO_TRANSACTIONAL_EMAIL_LOGO_PATH, actionUrl).toString();
}

export function buildTransactionalEmailAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
    <tr>
      <td bgcolor="#56e6a8" style="border-radius:12px;text-align:center;">
        <a href="${escapeEmailHtml(href)}" style="display:inline-block;padding:13px 20px;border:1px solid #56e6a8;border-radius:12px;background:#56e6a8;color:#062319;font-size:14px;font-weight:800;line-height:1.2;text-decoration:none;">${escapeEmailHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function buildTransactionalEmailLinkFallback({
  href,
  intro = "Buton çalışmazsa bu bağlantıyı tarayıcınıza kopyalayın:",
}: {
  href: string;
  intro?: string;
}) {
  const safeHref = escapeEmailHtml(href);

  return `<p style="margin:20px 0 0;color:#789288;font-size:12px;line-height:1.6;">
    ${escapeEmailHtml(intro)}<br>
    <a href="${safeHref}" style="color:#8ff0c4;text-decoration:underline;word-break:break-all;">${safeHref}</a>
  </p>`;
}

export function buildTransactionalEmailSecurityNote(message: string) {
  return `<div style="margin:22px 0 0;padding:14px 16px;border:1px solid #1d352d;border-radius:12px;background:#09130f;color:#9db8ae;font-size:12px;line-height:1.65;">
    ${paragraphizeEmailText(message)}
  </div>`;
}

export function buildTransactionalEmailSupportFooter() {
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(TRULYGO_TRANSACTIONAL_EMAIL_SUPPORT)) return "";
  const support = escapeEmailHtml(TRULYGO_TRANSACTIONAL_EMAIL_SUPPORT);
  return `<p style="margin:24px 0 0;padding-top:18px;border-top:1px solid #1d352d;color:#789288;font-size:12px;line-height:1.6;">
    Yardıma ihtiyacınız varsa
    <a href="mailto:${support}" style="color:#8ff0c4;text-decoration:underline;">${support}</a>
    adresinden bize ulaşabilirsiniz.
  </p>`;
}

export function buildTransactionalEmailShell({
  brandLogoUrl,
  bodyHtml,
  preheader,
}: {
  brandLogoUrl: string;
  bodyHtml: string;
  preheader: string;
}) {
  const safeBrandLogoUrl = escapeEmailHtml(brandLogoUrl);

  // bodyHtml must be application-authored markup. Escape every untrusted value
  // before interpolating it, using the helpers in this module.
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>TrulyGo</title>
  </head>
  <body style="margin:0;background:#07100d;color:#eafff5;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none!important;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeEmailHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#07100d;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#0d1915;border:1px solid #214136;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 18px;border-bottom:1px solid #1d352d;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:8px 12px;background:#f4fbf7;border:1px solid #dbeee5;border-radius:12px;">
                      <img src="${safeBrandLogoUrl}" width="190" height="49" alt="TrulyGo" style="display:block;width:190px;max-width:100%;height:auto;border:0;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 34px;">${bodyHtml}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
