import "server-only";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { normalizeVitrineHandle } from "@/lib/link-vitrine-config";
import type { ValidatedLinkVitrineCollaborationRequest } from "@/lib/link-vitrine-collaboration-request";
import {
  COLLABORATION_CHALLENGE_MAX_AGE_MS,
  COLLABORATION_MINIMUM_FILL_TIME_MS,
} from "@/lib/link-vitrine-collaboration-request";

const HASH_VERSION = "cr1";
const CHALLENGE_VERSION = "crc1";
const DEV_ONLY_HASH_SECRET = "trulygo-collaboration-dev-only";
let hasLoggedMissingSecret = false;

function getHashSecret() {
  const secret = process.env.CLICK_VISITOR_HASH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    if (!hasLoggedMissingSecret) {
      console.error(
        "[link-vitrine-collaboration] CLICK_VISITOR_HASH_SECRET is not configured; collaboration writes and verification are disabled.",
      );
      hasLoggedMissingSecret = true;
    }

    return null;
  }

  return DEV_ONLY_HASH_SECRET;
}

function digest(context: string, parts: string[]) {
  const secret = getHashSecret();

  if (!secret) {
    return null;
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(HASH_VERSION);
  hmac.update("\0");
  hmac.update(context);

  for (const part of parts) {
    hmac.update("\0");
    hmac.update(part);
  }

  return hmac.digest("base64url");
}

function createScopedHash(context: string, kind: string, parts: string[]) {
  const hash = digest(context, parts);
  return hash ? `${HASH_VERSION}:${kind}:${hash}` : null;
}

export function buildCollaborationVisitorHash({
  handle,
  ipAddress,
}: {
  handle: string;
  ipAddress: string | null;
}) {
  const canonicalHandle = normalizeVitrineHandle(handle);
  const normalizedIp = ipAddress?.trim();

  if (!canonicalHandle || canonicalHandle !== handle || !normalizedIp) {
    return null;
  }

  return createScopedHash(
    "link-vitrine-collaboration-visitor",
    "visitor",
    [canonicalHandle, normalizedIp],
  );
}

export function buildCollaborationGlobalIpRateLimitHash(
  ipAddress: string | null,
) {
  const normalizedIp = ipAddress?.trim();

  if (!normalizedIp) {
    return null;
  }

  return createScopedHash(
    "link-vitrine-collaboration-global-ip-rate-limit",
    "global-ip",
    [normalizedIp],
  );
}

export function buildCollaborationOwnerRateLimitHash(userId: string) {
  const normalizedUserId = userId.trim().toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      normalizedUserId,
    )
  ) {
    return null;
  }

  return createScopedHash(
    "link-vitrine-collaboration-owner-rate-limit",
    "owner",
    [normalizedUserId],
  );
}

export function buildCollaborationEmailRateLimitHash({
  email,
  handle,
}: {
  email: string;
  handle: string;
}) {
  const canonicalHandle = normalizeVitrineHandle(handle);
  const normalizedEmail = email.trim().toLowerCase();

  if (!canonicalHandle || canonicalHandle !== handle || !normalizedEmail) {
    return null;
  }

  return createScopedHash(
    "link-vitrine-collaboration-email-rate-limit",
    "email",
    [canonicalHandle, normalizedEmail],
  );
}

export function buildCollaborationPayloadHash({
  handle,
  payload,
}: {
  handle: string;
  payload: ValidatedLinkVitrineCollaborationRequest;
}) {
  const canonicalHandle = normalizeVitrineHandle(handle);

  if (!canonicalHandle || canonicalHandle !== handle) {
    return null;
  }

  return createScopedHash(
    "link-vitrine-collaboration-payload-dedupe",
    "payload",
    [
      canonicalHandle,
      payload.senderName,
      payload.senderEmail,
      payload.senderPhone ?? "",
      payload.requestType,
      payload.budgetAmount ?? "",
      payload.budgetCurrency ?? "",
      payload.subject,
      payload.message,
    ],
  );
}

export function createCollaborationChallenge(handle: string, now = Date.now()) {
  const canonicalHandle = normalizeVitrineHandle(handle);

  if (!canonicalHandle || canonicalHandle !== handle) {
    return null;
  }

  const issuedAt = String(Math.trunc(now));
  const nonce = randomBytes(16).toString("base64url");
  const signature = digest("link-vitrine-collaboration-challenge", [
    canonicalHandle,
    issuedAt,
    nonce,
  ]);

  return signature
    ? [CHALLENGE_VERSION, issuedAt, nonce, signature].join(".")
    : null;
}

export function verifyCollaborationChallenge({
  challenge,
  handle,
  now = Date.now(),
}: {
  challenge: string;
  handle: string;
  now?: number;
}) {
  const canonicalHandle = normalizeVitrineHandle(handle);
  const [version, rawIssuedAt, nonce, providedSignature, ...extra] =
    challenge.split(".");
  const issuedAt = Number(rawIssuedAt);

  if (
    !canonicalHandle ||
    canonicalHandle !== handle ||
    version !== CHALLENGE_VERSION ||
    extra.length > 0 ||
    !Number.isSafeInteger(issuedAt) ||
    !/^[A-Za-z0-9_-]{22}$/.test(nonce ?? "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(providedSignature ?? "")
  ) {
    return false;
  }

  const age = now - issuedAt;

  if (
    age < COLLABORATION_MINIMUM_FILL_TIME_MS ||
    age > COLLABORATION_CHALLENGE_MAX_AGE_MS
  ) {
    return false;
  }

  const expectedSignature = digest("link-vitrine-collaboration-challenge", [
    canonicalHandle,
    rawIssuedAt,
    nonce,
  ]);

  if (!expectedSignature) {
    return false;
  }

  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);

  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
}

export function createCollaborationVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashCollaborationVerificationToken(token);
  return tokenHash ? { token, tokenHash } : null;
}

export function hashCollaborationVerificationToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  return createScopedHash(
    "link-vitrine-collaboration-notification-email-verification",
    "verify",
    [token],
  );
}
