import {
  isLinkVitrineCollaborationBudgetCurrency,
  isLinkVitrineCollaborationRequestType,
  isValidCollaborationEmail,
  normalizeCollaborationEmail,
  type LinkVitrineCollaborationBudgetCurrency,
  type LinkVitrineCollaborationRequestType,
} from "@/lib/link-vitrine-collaboration";

export const COLLABORATION_REQUEST_MAX_BODY_BYTES = 16 * 1024;
export const COLLABORATION_MINIMUM_FILL_TIME_MS = 3_000;
export const COLLABORATION_CHALLENGE_MAX_AGE_MS = 2 * 60 * 60 * 1_000;

export type ValidatedLinkVitrineCollaborationRequest = {
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  requestType: LinkVitrineCollaborationRequestType;
  budgetAmount: string | null;
  budgetCurrency: LinkVitrineCollaborationBudgetCurrency | null;
  subject: string;
  message: string;
  challenge: string;
};

export type CollaborationRequestValidationResult =
  | {
      ok: true;
      data: ValidatedLinkVitrineCollaborationRequest;
      honeypot: false;
    }
  | {
      ok: true;
      data: null;
      honeypot: true;
    }
  | {
      ok: false;
      error: "invalid_payload";
    };

const BIDI_CONTROL_PATTERN = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const HEADER_CONTROL_PATTERN = /[\r\n\u0000-\u001f\u007f-\u009f]/u;
const BODY_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
const AUTOMATED_USER_AGENT_PATTERN =
  /\b(bot|crawler|spider|preview|headless|phantom|selenium|curl|wget|python-requests|go-http-client|uptime|healthcheck)\b/i;

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSafeHeaderText(value: string, minimum: number, maximum: number) {
  return (
    value.length >= minimum &&
    value.length <= maximum &&
    !HEADER_CONTROL_PATTERN.test(value) &&
    !BIDI_CONTROL_PATTERN.test(value)
  );
}

function normalizeMessage(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").trim()
    : "";
}

function parseBudgetAmount(value: unknown) {
  const amount = getTrimmedString(value);

  if (!amount) {
    return null;
  }

  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(amount)) {
    return undefined;
  }

  return amount;
}

export function validateLinkVitrineCollaborationRequest(
  value: unknown,
): CollaborationRequestValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_payload" };
  }

  const payload = value as Record<string, unknown>;
  const honeypot = getTrimmedString(payload.website);

  if (honeypot) {
    return { ok: true, data: null, honeypot: true };
  }

  const senderName = getTrimmedString(payload.senderName);
  const senderEmail = normalizeCollaborationEmail(payload.senderEmail);
  const senderPhone = getTrimmedString(payload.senderPhone);
  const subject = getTrimmedString(payload.subject);
  const message = normalizeMessage(payload.message);
  const challenge = getTrimmedString(payload.challenge);
  const budgetAmount = parseBudgetAmount(payload.budgetAmount);
  const budgetCurrency = payload.budgetCurrency;

  if (
    !isSafeHeaderText(senderName, 1, 100) ||
    !isValidCollaborationEmail(senderEmail) ||
    (senderPhone &&
      (!isSafeHeaderText(senderPhone, 1, 30) ||
        !/^[\p{L}\p{N}\s()+./#*-]+$/u.test(senderPhone))) ||
    !isLinkVitrineCollaborationRequestType(payload.requestType) ||
    budgetAmount === undefined ||
    !isSafeHeaderText(subject, 1, 150) ||
    message.length < 20 ||
    message.length > 3_000 ||
    BODY_CONTROL_PATTERN.test(message) ||
    BIDI_CONTROL_PATTERN.test(message) ||
    !challenge ||
    challenge.length > 512
  ) {
    return { ok: false, error: "invalid_payload" };
  }

  if (
    budgetAmount !== null &&
    !isLinkVitrineCollaborationBudgetCurrency(budgetCurrency)
  ) {
    return { ok: false, error: "invalid_payload" };
  }

  if (
    budgetAmount === null &&
    budgetCurrency !== null &&
    budgetCurrency !== undefined &&
    budgetCurrency !== ""
  ) {
    return { ok: false, error: "invalid_payload" };
  }

  return {
    ok: true,
    honeypot: false,
    data: {
      senderName,
      senderEmail,
      senderPhone: senderPhone || null,
      requestType: payload.requestType,
      budgetAmount,
      budgetCurrency:
        budgetAmount === null
          ? null
          : (budgetCurrency as LinkVitrineCollaborationBudgetCurrency),
      subject,
      message,
      challenge,
    },
  };
}

export function isSameOriginCollaborationRequest(
  requestUrl: string,
  headers: Headers,
) {
  const origin = headers.get("origin")?.trim();
  const fetchSite = headers.get("sec-fetch-site")?.trim().toLowerCase();

  if (!origin || (fetchSite && fetchSite !== "same-origin")) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

export function isJsonCollaborationRequest(headers: Headers) {
  const contentType = headers.get("content-type")?.trim().toLowerCase() ?? "";
  return /^application\/json(?:\s*;\s*charset=utf-8)?$/.test(contentType);
}

export function isAutomatedCollaborationRequest(headers: Headers) {
  const purpose = [
    headers.get("purpose"),
    headers.get("sec-purpose"),
    headers.get("x-moz"),
  ]
    .filter(Boolean)
    .join(" ");
  const userAgent = headers.get("user-agent")?.trim() ?? "";

  return (
    /\b(prefetch|prerender|preview)\b/i.test(purpose) ||
    !userAgent ||
    AUTOMATED_USER_AGENT_PATTERN.test(userAgent)
  );
}

export async function readCollaborationJsonBody(
  request: Request,
  maxBytes = COLLABORATION_REQUEST_MAX_BODY_BYTES,
) {
  const contentLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    (contentLength < 0 || contentLength > maxBytes)
  ) {
    return null;
  }

  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } catch {
    return null;
  }

  if (totalBytes === 0) {
    return null;
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(decoded) as unknown;
  } catch {
    return null;
  }
}
