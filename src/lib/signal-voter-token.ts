import { createHash } from "node:crypto";
import { isValidClickVisitorId } from "@/lib/click-visitor-cookie";

// Server-only helper. Builds a survey-scoped, deterministic hash used to soft-block
// repeat votes without ever storing the raw IP / user-agent / cookie id. Only this
// module imports the secret, and it is only imported by the "use server" vote action,
// so the secret never reaches a client bundle. We reuse CLICK_VISITOR_HASH_SECRET
// instead of introducing a new env: the security property we need (an unguessable,
// non-public hashing key) is identical to the click-tracking visitor hash.
const SIGNAL_VOTER_KEY_VERSION = "v1";
// Dev-only secret used when CLICK_VISITOR_HASH_SECRET is not set on a non-production
// build. Never falls back to a public (NEXT_PUBLIC_*) value so the hash space cannot
// be precomputed by anyone holding the public Supabase config.
const DEV_ONLY_SIGNAL_VOTER_HASH_SECRET = "trulygo-signal-voter-dev-only";
let hasLoggedMissingSecret = false;

function getSignalVoterHashSecret(): string | null {
  const secret = process.env.CLICK_VISITOR_HASH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    if (!hasLoggedMissingSecret) {
      console.error(
        "[signal-voter] CLICK_VISITOR_HASH_SECRET is not configured; soft dedup disabled. Repeat-vote prevention falls back to the per-survey cookie only.",
      );
      hasLoggedMissingSecret = true;
    }
    return null;
  }

  return DEV_ONLY_SIGNAL_VOTER_HASH_SECRET;
}

function hashSignalVoterMaterial(
  surveyId: string,
  kind: "cookie" | "fallback",
  material: string,
): string | null {
  const normalizedMaterial = material.trim();

  if (!normalizedMaterial) {
    return null;
  }

  const secret = getSignalVoterHashSecret();

  // Fail-safe: when the production secret is missing we return null rather than
  // hashing with a predictable fallback. The vote RPC treats a null hash as
  // "no soft dedup" (the partial unique index ignores null), so voting still works.
  if (!secret) {
    return null;
  }

  // surveyId is part of the digest so the same visitor produces a DIFFERENT hash
  // per survey (no cross-survey correlation) but a STABLE hash within one survey.
  const digest = createHash("sha256")
    .update(SIGNAL_VOTER_KEY_VERSION)
    .update("\0")
    .update(surveyId)
    .update("\0")
    .update(kind)
    .update("\0")
    .update(secret)
    .update("\0")
    .update(normalizedMaterial)
    .digest("base64url");

  return `${SIGNAL_VOTER_KEY_VERSION}:${kind}:${digest}`;
}

/**
 * Returns a survey-scoped deterministic voter hash, or null when no stable
 * material is available (cookie-less + header-less) or the production secret is
 * missing. Prefers the long-lived tg_vid cookie; falls back to IP + user-agent
 * only when the cookie is absent (rare, since middleware sets tg_vid before the
 * vote). A null result simply means this layer abstains; the cookie fast-path
 * and per-IP rate limit still apply.
 */
export function buildSignalVoterTokenHash({
  ipAddress,
  surveyId,
  userAgent,
  visitorCookieId,
}: {
  ipAddress: string | null;
  surveyId: string;
  userAgent: string | null;
  visitorCookieId: string | null;
}): string | null {
  const normalizedSurveyId = surveyId?.trim();

  if (!normalizedSurveyId) {
    return null;
  }

  if (visitorCookieId && isValidClickVisitorId(visitorCookieId)) {
    return hashSignalVoterMaterial(normalizedSurveyId, "cookie", visitorCookieId);
  }

  const fallbackMaterial = [ipAddress?.trim(), userAgent?.trim()].filter(Boolean).join("\n");

  return fallbackMaterial
    ? hashSignalVoterMaterial(normalizedSurveyId, "fallback", fallbackMaterial)
    : null;
}
