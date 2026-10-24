import "server-only";


const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 8_000;

export type ResendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
};

export type ResendEmailResult =
  | { ok: true; providerId: string }
  | { ok: false; errorCode: string };

export function getConfiguredCollaborationAppOrigin() {
  const rawOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.APP_URL;

  if (!rawOrigin) {
    return process.env.NODE_ENV === "production"
      ? null
      : "http://localhost:3000";
  }

  try {
    const origin = new URL(rawOrigin.trim());
    return origin.protocol === "http:" || origin.protocol === "https:"
      ? origin.origin
      : null;
  } catch {
    return null;
  }
}

function normalizeResendErrorCode(status: number) {
  if (status === 408 || status === 504) {
    return "resend_timeout";
  }

  if (status === 429) {
    return "resend_rate_limited";
  }

  if (status >= 400 && status < 500) {
    return "resend_rejected";
  }

  return "resend_unavailable";
}

export async function sendResendEmail(
  input: ResendEmailInput,
): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !from || /[\r\n]/.test(from)) {
    return { ok: false, errorCode: "resend_not_configured" };
  }

  try {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        errorCode: normalizeResendErrorCode(response.status),
      };
    }

    const responseText = await response.text();
    const payload = JSON.parse(responseText) as { id?: unknown };
    const providerId =
      typeof payload.id === "string" ? payload.id.trim().slice(0, 255) : "";

    if (!providerId) {
      return { ok: false, errorCode: "resend_invalid_response" };
    }

    return { ok: true, providerId };
  } catch (error) {
    const errorCode =
      error instanceof Error && error.name === "TimeoutError"
        ? "resend_timeout"
        : "resend_unavailable";
    return { ok: false, errorCode };
  }
}
