import { createHash } from "node:crypto";
import {
  CLICK_VISITOR_COOKIE_NAME,
  isValidClickVisitorId,
} from "@/lib/click-visitor-cookie";

const visitorKeyVersion = "v1";
const profileViewVisitorHashVersion = "pv1";
const CANONICAL_VITRINE_HANDLE_PATTERN =
  /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const CLICK_VISITOR_KEY_PATTERN =
  /^v1:(cookie|fallback):[A-Za-z0-9_-]{43}$/;
// Dev-only secret used when CLICK_VISITOR_HASH_SECRET is not set on a non-production
// build. Never falls back to a public env var (NEXT_PUBLIC_*) so the hash space
// cannot be precomputed by anyone holding the public Supabase URL.
const DEV_ONLY_VISITOR_HASH_SECRET = "trulygo-click-visitor-dev-only";
let hasLoggedMissingSecret = false;

function getVisitorHashSecret(): string | null {
  const secret = process.env.CLICK_VISITOR_HASH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    if (!hasLoggedMissingSecret) {
      console.error(
        "[click-visitor] CLICK_VISITOR_HASH_SECRET is not configured; visitor-based analytics deduplication is disabled.",
      );
      hasLoggedMissingSecret = true;
    }
    return null;
  }

  return DEV_ONLY_VISITOR_HASH_SECRET;
}

function parseCookieHeader(cookieHeader: string | null) {
  const cookies = new Map<string, string>();

  cookieHeader?.split(";").forEach((cookiePart) => {
    const [rawName, ...rawValueParts] = cookiePart.split("=");
    const name = rawName?.trim();

    if (!name) {
      return;
    }

    const rawValue = rawValueParts.join("=").trim();

    try {
      cookies.set(name, decodeURIComponent(rawValue));
    } catch {
      cookies.set(name, rawValue);
    }
  });

  return cookies;
}

export function getClickVisitorCookieValue(cookieHeader: string | null) {
  const value = parseCookieHeader(cookieHeader).get(CLICK_VISITOR_COOKIE_NAME);
  return isValidClickVisitorId(value) ? value : null;
}

function firstForwardedIp(value: string | null) {
  const firstIp = value?.split(",")[0]?.trim();
  return firstIp || null;
}

export function getClientIpFromHeaders(headers: Headers) {
  return (
    firstForwardedIp(headers.get("x-forwarded-for")) ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("true-client-ip")?.trim() ||
    headers.get("fly-client-ip")?.trim() ||
    null
  );
}

function hashVisitorMaterial(kind: "cookie" | "fallback", material: string) {
  const normalizedMaterial = material.trim();

  if (!normalizedMaterial) {
    return null;
  }

  const secret = getVisitorHashSecret();

  // Fail-safe: when the production secret is missing we return null instead of
  // hashing with a public/predictable fallback. Callers keep navigation working
  // and may skip analytics that requires a stable privacy-preserving key.
  if (!secret) {
    return null;
  }

  const digest = createHash("sha256")
    .update(visitorKeyVersion)
    .update("\0")
    .update(kind)
    .update("\0")
    .update(secret)
    .update("\0")
    .update(normalizedMaterial)
    .digest("base64url");

  return `${visitorKeyVersion}:${kind}:${digest}`;
}

export function buildClickVisitorKey({
  cookieHeader,
  ipAddress,
  userAgent,
}: {
  cookieHeader: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const cookieValue = getClickVisitorCookieValue(cookieHeader);

  if (cookieValue) {
    return hashVisitorMaterial("cookie", cookieValue);
  }

  const fallbackMaterial = [ipAddress?.trim(), userAgent?.trim()].filter(Boolean).join("\n");

  return fallbackMaterial ? hashVisitorMaterial("fallback", fallbackMaterial) : null;
}

export function buildLinkVitrineProfileViewVisitorHash({
  cookieHeader,
  handle,
  ipAddress,
  userAgent,
}: {
  cookieHeader: string | null;
  handle: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const canonicalHandle = handle.trim();

  if (
    canonicalHandle !== handle ||
    !CANONICAL_VITRINE_HANDLE_PATTERN.test(canonicalHandle)
  ) {
    return null;
  }

  const visitorKey = buildClickVisitorKey({
    cookieHeader,
    ipAddress,
    userAgent,
  });
  const visitorKeyMatch = visitorKey?.match(CLICK_VISITOR_KEY_PATTERN);

  if (!visitorKey || !visitorKeyMatch) {
    return null;
  }

  const visitorKind = visitorKeyMatch[1];
  const digest = createHash("sha256")
    .update(profileViewVisitorHashVersion)
    .update("\0")
    .update(canonicalHandle)
    .update("\0")
    .update(visitorKey)
    .digest("base64url");

  return `${profileViewVisitorHashVersion}:${visitorKind}:${digest}`;
}

export function buildLinkVitrineProfileViewRateLimitKey({
  handle,
  ipAddress,
}: {
  handle: string;
  ipAddress: string | null;
}) {
  const canonicalHandle = handle.trim();
  const normalizedIpAddress = ipAddress?.trim();

  if (
    canonicalHandle !== handle ||
    !CANONICAL_VITRINE_HANDLE_PATTERN.test(canonicalHandle) ||
    !normalizedIpAddress
  ) {
    return null;
  }

  // This key is deliberately independent from the client-controlled tg_vid
  // cookie. Rotating cookie UUIDs therefore cannot rotate the abuse-control
  // bucket. The raw IP never leaves this process; only this secret-derived key
  // is sent to the rate-limit RPC, which hashes it once more before storage.
  return hashVisitorMaterial(
    "fallback",
    ["link-vitrine-profile-view-rate-limit", canonicalHandle, normalizedIpAddress].join(
      "\n",
    ),
  );
}
