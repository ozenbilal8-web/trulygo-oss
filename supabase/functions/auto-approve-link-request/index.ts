import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.105.4";

const WEBHOOK_SECRET_HEADER = "x-trulygo-webhook-secret";
const WEBHOOK_SECRET_ENV = "LINK_REQUEST_AUTO_APPROVE_WEBHOOK_SECRET";
const AUTO_REVIEWER_ENV = "LINK_REQUEST_AUTO_APPROVER_USER_ID";
const SAFETY_ATTESTATION_ENV = "REQUIRE_LINK_SAFETY_ATTESTATION";
const FETCH_TIMEOUT_MS = 3_500;
const MAX_REDIRECTS = 5;

const checkerHeaders = {
  "user-agent": "Mozilla/5.0 compatible TrulyGoLinkChecker/1.0",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
};

const turkishSecondLevelPublicSuffixes = new Set([
  "av.tr",
  "bel.tr",
  "biz.tr",
  "com.tr",
  "dr.tr",
  "edu.tr",
  "gen.tr",
  "gov.tr",
  "info.tr",
  "k12.tr",
  "kep.tr",
  "mil.tr",
  "name.tr",
  "net.tr",
  "org.tr",
  "pol.tr",
  "tel.tr",
  "tsk.tr",
  "tv.tr",
  "web.tr",
]);

const knownShortLinkHosts = new Set([
  "bit.ly",
  "bitly.com",
  "buff.ly",
  "cutt.ly",
  "dub.sh",
  "goo.gl",
  "is.gd",
  "lnkd.in",
  "ow.ly",
  "rb.gy",
  "rebrand.ly",
  "s.id",
  "shorturl.at",
  "t.co",
  "tiny.cc",
  "tinyurl.com",
  "urlr.me",
]);

const forbiddenKeywords = [
  "bet",
  "iddaa",
  "iddia",
  "bahis",
  "casino",
  "kumar",
  "gambling",
  "adult",
  "porno",
  "porn",
  "escort",
  "sex",
  "onlyfans",
  "airdrop",
  "wallet",
  "crypto",
  "free crypto",
  "giveaway",
  "free gift",
  "gift",
  "steam gift",
  "robux",
  "login verify",
  "account verify",
  "verify account",
  "bank login",
  "password",
  "password reset",
  "account recovery",
  "phishing",
  "malware",
  "scam",
  "spam",
  "crack",
  "hack",
  "warez",
  "virus",
  "ransomware",
  "xxx",
];

const reservedSlugs = new Set([
  "admin",
  "s",
  "dashboard",
  "signal",
  "login",
  "register",
  "v",
  "privacy",
  "terms",
  "not-approved",
  "api",
  "auth",
  "static",
  "opengraph-image",
  "link-vitrini",
  "bitly-alternatifi",
  "utm-link-olusturucu",
  "qr-kod-olusturucu",
  "whatsapp-link-olusturucu",
  "kampanya-linki-olusturma",
  "kanal-linki-olusturma",
  "link-kisaltma",
  "rehberler",
  "anket-olusturucu",
  "cerez-politikasi",
  "acik-riza-metni",
  "kvkk-basvurusu",
  "forgot-password",
  "reset-password",
]);

type LinkRequestRecord = {
  id?: unknown;
  requested_slug?: unknown;
  status?: unknown;
  target_url?: unknown;
};

type WebhookPayload = {
  record?: LinkRequestRecord;
  schema?: unknown;
  table?: unknown;
  type?: unknown;
};

type SafetyApprovedReason =
  | "approved_direct_ok"
  | "approved_inner_page_domain_ok"
  | "approved_inner_page_bot_blocked_domain";

type SafetyPendingReason =
  | "pending_forbidden_keyword"
  | "pending_invalid_url"
  | "pending_redirect_risky"
  | "pending_domain_unreachable"
  | "pending_fetch_error"
  | "pending_dns_rebinding_risk";

type SafetyResult =
  | {
      finalUrl: string;
      ok: true;
      reason: SafetyApprovedReason;
      detail?: string;
    }
  | {
      ok: false;
      reason: SafetyPendingReason;
      detail?: string;
    };

type ReachabilityResult =
  | {
      finalUrl: string;
      finalUrlObject: URL;
      ok: true;
      status: number;
    }
  | {
      ok: false;
      reason: SafetyPendingReason;
      detail: string;
      lastUrl?: URL;
      retryWithGet?: boolean;
      status?: number;
    };

type UrlInspectionResult =
  | {
      ok: true;
      url: URL;
    }
  | {
      ok: false;
      reason: SafetyPendingReason;
      detail: string;
    };

type LinkRequestRow = {
  auto_approval_blocked: boolean;
  id: string;
  requested_slug: string | null;
  safety_policy_version: string | null;
  safety_status: string | null;
  safety_verified_at: string | null;
  status: string;
  submission_source: string | null;
  target_url: string;
};

type AttestationFailureReason =
  | "submission_source_not_trusted"
  | "safety_status_not_clean"
  | "safety_verified_at_missing"
  | "safety_policy_version_missing"
  | "auto_approval_blocked";

type AttestationResult =
  | { ok: true; reason: null }
  | { ok: false; reason: AttestationFailureReason };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    status,
  });
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiresSafetyAttestation() {
  return Deno.env.get(SAFETY_ATTESTATION_ENV) === "true";
}

function checkSafetyAttestation(linkRequest: LinkRequestRow): AttestationResult {
  if (linkRequest.submission_source !== "trusted_server_v2") {
    return { ok: false, reason: "submission_source_not_trusted" };
  }

  if (linkRequest.safety_status !== "clean") {
    return { ok: false, reason: "safety_status_not_clean" };
  }

  if (!asString(linkRequest.safety_verified_at)) {
    return { ok: false, reason: "safety_verified_at_missing" };
  }

  if (!asString(linkRequest.safety_policy_version)) {
    return { ok: false, reason: "safety_policy_version_missing" };
  }

  if (linkRequest.auto_approval_blocked !== false) {
    return { ok: false, reason: "auto_approval_blocked" };
  }

  return { ok: true, reason: null };
}

function getSubmissionClass(value: string | null) {
  return value === "trusted_server_v2"
    ? "trusted_server_v2"
    : "legacy_or_unknown";
}

function getSafetyStatusClass(value: string | null) {
  switch (value) {
    case "clean":
    case "blocked":
    case "error":
    case "unverified":
      return value;
    default:
      return "unknown";
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

function verifyWebhookSecret(request: Request) {
  const expectedSecret = Deno.env.get(WEBHOOK_SECRET_ENV)?.trim();
  const providedSecret = request.headers.get(WEBHOOK_SECRET_HEADER)?.trim() ?? "";

  if (!expectedSecret) {
    return { ok: false, reason: "webhook_secret_not_configured" };
  }

  if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return { ok: false, reason: "invalid_webhook_secret" };
  }

  return { ok: true, reason: null };
}

function getPendingInsertRecord(payload: WebhookPayload) {
  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "link_requests" ||
    payload.record?.status !== "pending"
  ) {
    return null;
  }

  return payload.record;
}

function isValidStoredSlug(value: string | null) {
  if (!value) {
    return false;
  }

  return /^[a-z0-9-]{2,80}$/.test(value) && !reservedSlugs.has(value);
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^\[(.*)\]$/, "$1");
}

function stripWwwPrefix(hostname: string) {
  return normalizeHostname(hostname).replace(/^www\./, "");
}

function getComparableDomain(hostname: string) {
  const host = stripWwwPrefix(hostname);
  const labels = host.split(".").filter(Boolean);

  if (labels.length <= 2) {
    return host;
  }

  const publicSuffix = labels.slice(-2).join(".");

  if (turkishSecondLevelPublicSuffixes.has(publicSuffix) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }

  return labels.slice(-2).join(".");
}

function isSameApprovalDomain(left: URL, right: URL) {
  return getComparableDomain(left.hostname) === getComparableDomain(right.hostname);
}

function isIpv4Hostname(hostname: string) {
  const parts = hostname.split(".");

  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) {
        return false;
      }

      const value = Number.parseInt(part, 10);
      return value >= 0 && value <= 255;
    })
  );
}

function isIpv6Hostname(hostname: string) {
  return hostname.includes(":") && /^[0-9a-f:.]+$/i.test(hostname);
}

function isIpHostname(hostname: string) {
  return isIpv4Hostname(hostname) || isIpv6Hostname(hostname);
}

// ---------------------------------------------------------------------------
// SSRF / DNS rebinding defense (Sprint 5)
//
// String-level host checks above (localhost / .local / literal IPv4 / IPv6)
// cover the easy cases. They do not catch a public hostname whose A/AAAA
// record points at a private address — the classic DNS rebinding shape. The
// helpers below resolve the hostname with Deno.resolveDns and reject the
// URL if any resolved address is private, loopback, link-local, CGNAT,
// multicast, documentation, broadcast or otherwise reserved.
//
// DNS resolution failure is treated as a soft-fail: we let the existing
// fetch / bot-block flow decide. This keeps legitimate sites with transient
// DNS issues working and matches the project's overall fail-open posture
// for the auto-approval pipeline.
// ---------------------------------------------------------------------------

function parseIpv4Octets(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number.parseInt(part, 10);
    if (value < 0 || value > 255) return null;
    octets.push(value);
  }

  return [octets[0], octets[1], octets[2], octets[3]];
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const octets = parseIpv4Octets(ip);
  if (!octets) return false;
  const [a, b, c] = octets;

  // 0.0.0.0/8 — "this network"
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 100.64.0.0/10 — CGNAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 169.254.0.0/16 — link-local (includes 169.254.169.254 cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 — IETF protocol assignments
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24 — TEST-NET-1
  if (a === 192 && b === 0 && c === 2) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 — benchmarking
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 — TEST-NET-2
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 — TEST-NET-3
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 — reserved (covers 255.255.255.255/32 broadcast too)
  if (a >= 240) return true;

  return false;
}

function expandIpv6(ip: string): string[] | null {
  // Strip RFC 4007 zone identifier (e.g. "fe80::1%eth0").
  const zoneIndex = ip.indexOf("%");
  let clean = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);

  // Handle IPv4-in-IPv6 notation (e.g. "::ffff:192.168.1.1") by converting
  // the dotted-quad tail to two hex groups before expansion.
  const dotIndex = clean.indexOf(".");
  if (dotIndex !== -1) {
    const lastColon = clean.lastIndexOf(":", dotIndex);
    if (lastColon === -1) return null;
    const ipv4Tail = clean.slice(lastColon + 1);
    const octets = parseIpv4Octets(ipv4Tail);
    if (!octets) return null;
    const [a, b, c, d] = octets;
    const h1 = ((a << 8) | b).toString(16);
    const h2 = ((c << 8) | d).toString(16);
    clean = `${clean.slice(0, lastColon + 1)}${h1}:${h2}`;
  }

  const doubleColonOccurrences = clean.split("::").length - 1;
  if (doubleColonOccurrences > 1) return null;

  let parts: string[];
  if (doubleColonOccurrences === 1) {
    const [leftRaw, rightRaw] = clean.split("::");
    const leftParts = leftRaw ? leftRaw.split(":") : [];
    const rightParts = rightRaw ? rightRaw.split(":") : [];
    const missing = 8 - leftParts.length - rightParts.length;
    if (missing < 0) return null;
    const middle = new Array(missing).fill("0");
    parts = [...leftParts, ...middle, ...rightParts];
  } else {
    parts = clean.split(":");
  }

  if (parts.length !== 8) return null;

  const normalized: string[] = [];
  for (const part of parts) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
    normalized.push(part.toLowerCase().padStart(4, "0"));
  }

  return normalized;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const parts = expandIpv6(ip);
  if (!parts) return false;

  const first = Number.parseInt(parts[0], 16);
  const second = Number.parseInt(parts[1], 16);

  // ::/128 — unspecified
  if (parts.every((p) => p === "0000")) return true;

  // ::1/128 — loopback
  if (parts.slice(0, 7).every((p) => p === "0000") && parts[7] === "0001") {
    return true;
  }

  // fc00::/7 — unique local addresses
  if ((first & 0xfe00) === 0xfc00) return true;
  // fe80::/10 — link-local
  if ((first & 0xffc0) === 0xfe80) return true;
  // ff00::/8 — multicast
  if ((first & 0xff00) === 0xff00) return true;
  // 2001:db8::/32 — documentation
  if (first === 0x2001 && second === 0x0db8) return true;

  // IPv4-mapped (::ffff:0:0/96) — block when the embedded IPv4 is private.
  if (
    parts.slice(0, 5).every((p) => p === "0000") &&
    parts[5] === "ffff"
  ) {
    const lowHigh = Number.parseInt(parts[6], 16);
    const lowLow = Number.parseInt(parts[7], 16);
    const mapped = `${(lowHigh >> 8) & 0xff}.${lowHigh & 0xff}.${
      (lowLow >> 8) & 0xff
    }.${lowLow & 0xff}`;
    if (isPrivateOrReservedIpv4(mapped)) return true;
  }

  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes(":")) {
    return isPrivateOrReservedIpv6(ip);
  }

  return isPrivateOrReservedIpv4(ip);
}

async function resolveHostnameIps(hostname: string): Promise<{
  ips: string[];
  anyResolved: boolean;
}> {
  const ips: string[] = [];
  let anyResolved = false;

  try {
    const aRecords = await Deno.resolveDns(hostname, "A");
    if (aRecords.length > 0) {
      anyResolved = true;
      ips.push(...aRecords);
    }
  } catch {
    // No A record or DNS lookup failed — keep going and try AAAA.
  }

  try {
    const aaaaRecords = await Deno.resolveDns(hostname, "AAAA");
    if (aaaaRecords.length > 0) {
      anyResolved = true;
      ips.push(...aaaaRecords);
    }
  } catch {
    // No AAAA record or DNS lookup failed.
  }

  return { ips, anyResolved };
}

type ResolvedIpInspectionResult =
  | { ok: true }
  | { ok: false; reason: SafetyPendingReason; detail: string };

async function inspectResolvedIps(url: URL): Promise<ResolvedIpInspectionResult> {
  const hostname = normalizeHostname(url.hostname);

  // Literal IP hostnames are handled by inspectUrl already; if we got here
  // through redirect chain juggling, double-check to keep behavior consistent.
  if (isIpHostname(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        ok: false,
        reason: "pending_invalid_url",
        detail: "literal_private_ip",
      };
    }
    return { ok: true };
  }

  const { ips, anyResolved } = await resolveHostnameIps(hostname);

  if (!anyResolved) {
    // DNS resolution unavailable. We deliberately fall through so transient
    // resolver issues do not break legitimate URLs; fetch will use its own
    // resolver and the existing bot-block / reachability checks remain the
    // safety net for the network-level decision.
    console.log("dns resolution skipped", {
      reason: "no_usable_records",
    });
    return { ok: true };
  }

  for (const ip of ips) {
    if (isPrivateOrReservedIp(ip)) {
      console.warn("dns rebinding guard tripped", {
        ipFamily: ip.includes(":") ? "ipv6" : "ipv4",
        reason: "private_or_reserved_ip",
        resolvedIpCount: ips.length,
      });
      return {
        ok: false,
        reason: "pending_dns_rebinding_risk",
        detail: `resolved_private_ip:${ip}`,
      };
    }
  }

  return { ok: true };
}

function isBlockedLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "ip6-localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  );
}

function isKnownShortLinkHost(hostname: string) {
  for (const shortHost of knownShortLinkHosts) {
    if (hostname === shortHost || hostname.endsWith(`.${shortHost}`)) {
      return true;
    }
  }

  return false;
}

function safeDecodeUrlText(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeKeywordText(value: string) {
  return value
    .toLowerCase()
    .replace(/\u0130/g, "i")
    .replace(/[\u0131i]/g, "i")
    .replace(/[\u015f]/g, "s")
    .replace(/[\u011f]/g, "g")
    .replace(/[\u00fc]/g, "u")
    .replace(/[\u00f6]/g, "o")
    .replace(/[\u00e7]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeKeywordPhrase(value: string) {
  return normalizeKeywordText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsForbiddenKeyword(url: URL) {
  const decodedText = safeDecodeUrlText(`${url.hostname}${url.pathname}${url.search}`);
  const normalizedText = normalizeKeywordText(decodedText);
  const normalizedPhraseText = normalizeKeywordPhrase(decodedText);
  const compactPhraseText = normalizedPhraseText.replace(/\s+/g, "");

  return forbiddenKeywords.some((keyword) => {
    const normalizedKeyword = normalizeKeywordPhrase(keyword);
    const compactKeyword = normalizedKeyword.replace(/\s+/g, "");

    return (
      normalizedText.includes(normalizedKeyword) ||
      normalizedPhraseText.includes(normalizedKeyword) ||
      compactPhraseText.includes(compactKeyword)
    );
  });
}

function inspectUrl(rawUrl: string): UrlInspectionResult {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return { detail: "empty_url", ok: false, reason: "pending_invalid_url" };
  }

  let url: URL;

  try {
    url = new URL(trimmedUrl);
  } catch {
    return { detail: "parse_failed", ok: false, reason: "pending_invalid_url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { detail: "invalid_protocol", ok: false, reason: "pending_invalid_url" };
  }

  if (!url.hostname) {
    return { detail: "missing_hostname", ok: false, reason: "pending_invalid_url" };
  }

  if (url.username || url.password) {
    return { detail: "credentials_in_url", ok: false, reason: "pending_invalid_url" };
  }

  const hostname = normalizeHostname(url.hostname);

  if (isIpHostname(hostname)) {
    return { detail: "ip_hostname", ok: false, reason: "pending_invalid_url" };
  }

  if (isBlockedLocalHostname(hostname)) {
    return { detail: "local_hostname", ok: false, reason: "pending_invalid_url" };
  }

  if (isKnownShortLinkHost(hostname)) {
    return { detail: "known_shortener", ok: false, reason: "pending_invalid_url" };
  }

  if (containsForbiddenKeyword(url)) {
    return { detail: "forbidden_keyword", ok: false, reason: "pending_forbidden_keyword" };
  }

  return { ok: true, url };
}

function isRedirectStatus(status: number) {
  return status >= 300 && status < 400;
}

function isCleanHttpStatus(status: number) {
  return status >= 200 && status < 400;
}

function isBotBlockStatus(status: number | undefined) {
  return (
    status === 401 ||
    status === 403 ||
    status === 405 ||
    status === 406 ||
    status === 429 ||
    status === 501 ||
    status === 503
  );
}

function canRetryHeadWithGet(status: number) {
  return isBotBlockStatus(status);
}

function hasInnerPathOrQuery(url: URL) {
  return url.pathname !== "/" || url.search !== "";
}

async function cancelBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // Best-effort cancellation only; the safety decision does not depend on it.
  }
}

async function fetchWithTimeout(url: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: checkerHeaders,
      method,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function followRedirects(initialUrl: URL, method: "GET" | "HEAD"): Promise<ReachabilityResult> {
  let currentUrl = initialUrl;
  const visitedUrls = new Set<string>();

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const inspectedUrl = inspectUrl(currentUrl.href);

    if (!inspectedUrl.ok) {
      return {
        detail: inspectedUrl.detail,
        lastUrl: currentUrl,
        ok: false,
        reason: inspectedUrl.reason,
      };
    }

    currentUrl = inspectedUrl.url;

    if (!isSameApprovalDomain(initialUrl, currentUrl)) {
      return {
        detail: "redirect_cross_domain",
        lastUrl: currentUrl,
        ok: false,
        reason: "pending_redirect_risky",
      };
    }

    if (visitedUrls.has(currentUrl.href)) {
      return {
        detail: "redirect_loop",
        lastUrl: currentUrl,
        ok: false,
        reason: "pending_redirect_risky",
      };
    }

    visitedUrls.add(currentUrl.href);

    // DNS rebinding defense: if the (already string-validated) hostname
    // resolves to a private / reserved IP, refuse to fetch. Runs on every
    // redirect hop so a later hop cannot smuggle an internal target through.
    const resolvedIpCheck = await inspectResolvedIps(currentUrl);
    if (!resolvedIpCheck.ok) {
      return {
        detail: resolvedIpCheck.detail,
        lastUrl: currentUrl,
        ok: false,
        reason: resolvedIpCheck.reason,
      };
    }

    let response: Response;

    try {
      response = await fetchWithTimeout(currentUrl.href, method);
    } catch (error) {
      const detail = error instanceof DOMException && error.name === "AbortError"
        ? "timeout"
        : "fetch_failed";

      return {
        detail,
        lastUrl: currentUrl,
        ok: false,
        reason: "pending_domain_unreachable",
        retryWithGet: method === "HEAD",
      };
    }

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      await cancelBody(response);

      if (!location) {
        return {
          detail: "redirect_without_location",
          lastUrl: currentUrl,
          ok: false,
          reason: "pending_redirect_risky",
        };
      }

      try {
        currentUrl = new URL(location, currentUrl.href);
      } catch {
        return {
          detail: "invalid_redirect_url",
          lastUrl: currentUrl,
          ok: false,
          reason: "pending_redirect_risky",
        };
      }

      continue;
    }

    await cancelBody(response);

    if (isCleanHttpStatus(response.status)) {
      return {
        finalUrl: currentUrl.href,
        finalUrlObject: currentUrl,
        ok: true,
        status: response.status,
      };
    }

    if (method === "HEAD" && canRetryHeadWithGet(response.status)) {
      return {
        detail: `head_rejected_${response.status}`,
        lastUrl: currentUrl,
        ok: false,
        reason: "pending_fetch_error",
        retryWithGet: true,
        status: response.status,
      };
    }

    const detailPrefix = isBotBlockStatus(response.status) ? "bot_block_status" : "unapproved_status";

    return {
      detail: `${detailPrefix}_${response.status}`,
      lastUrl: currentUrl,
      ok: false,
      reason: "pending_fetch_error",
      status: response.status,
    };
  }

  return {
    detail: "too_many_redirects",
    lastUrl: currentUrl,
    ok: false,
    reason: "pending_redirect_risky",
  };
}

async function checkReachability(url: URL): Promise<ReachabilityResult> {
  const headResult = await followRedirects(url, "HEAD");

  if (headResult.ok || !headResult.retryWithGet) {
    return headResult;
  }

  return followRedirects(url, "GET");
}

async function checkUrlSafety(rawUrl: string): Promise<SafetyResult> {
  const inspectedUrl = inspectUrl(rawUrl);

  if (!inspectedUrl.ok) {
    return {
      detail: inspectedUrl.detail,
      ok: false,
      reason: inspectedUrl.reason,
    };
  }

  const targetUrl = inspectedUrl.url;
  const reachability = await checkReachability(targetUrl);

  if (reachability.ok) {
    return {
      finalUrl: reachability.finalUrl,
      ok: true,
      reason: "approved_direct_ok",
    };
  }

  if (
    hasInnerPathOrQuery(targetUrl) &&
    isBotBlockStatus(reachability.status) &&
    reachability.lastUrl &&
    isSameApprovalDomain(targetUrl, reachability.lastUrl)
  ) {
    const homepageUrl = new URL("/", targetUrl.href);
    const homepageReachability = await checkReachability(homepageUrl);

    if (homepageReachability.ok) {
      return {
        detail: `target_${reachability.status}_homepage_ok`,
        finalUrl: reachability.lastUrl.href,
        ok: true,
        reason: "approved_inner_page_domain_ok",
      };
    }

    if (
      isBotBlockStatus(homepageReachability.status) &&
      homepageReachability.lastUrl &&
      isSameApprovalDomain(targetUrl, homepageReachability.lastUrl)
    ) {
      return {
        detail: `target_bot_block_status_${reachability.status}_homepage_bot_block_status_${homepageReachability.status}`,
        finalUrl: reachability.lastUrl.href,
        ok: true,
        reason: "approved_inner_page_bot_blocked_domain",
      };
    }

    return {
      detail: `homepage_${homepageReachability.detail}`,
      ok: false,
      reason: homepageReachability.reason,
    };
  }

  return {
    detail: reachability.detail,
    ok: false,
    reason: reachability.reason,
  };
}

function logSafetyDecision(requestId: string, result: SafetyResult) {
  console.log("auto approval safety decision", {
    id: requestId,
    ok: result.ok,
    reason: result.reason,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const secretCheck = verifyWebhookSecret(request);

  if (!secretCheck.ok) {
    return jsonResponse({ error: secretCheck.reason }, 401);
  }

  try {
    const payload = (await request.json()) as WebhookPayload;
    const record = getPendingInsertRecord(payload);

    if (!record) {
      return jsonResponse({ action: "skipped", reason: "not_pending_insert" });
    }

    const requestId = asString(record.id);

    if (!isUuid(requestId)) {
      return jsonResponse({ action: "left_pending", reason: "invalid_request_id" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const autoReviewerUserId = Deno.env.get(AUTO_REVIEWER_ENV)?.trim() ?? "";

    if (!supabaseUrl || !serviceRoleKey || !isUuid(autoReviewerUserId)) {
      return jsonResponse({ error: "auto_approval_secrets_not_configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: pendingRequest, error: readError } = await supabase
      .from("link_requests")
      .select(
        "id,target_url,requested_slug,status,submission_source,safety_status,safety_verified_at,safety_policy_version,auto_approval_blocked",
      )
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (readError) {
      console.error("auto approval read failed", {
        code: readError.code || "unknown",
        id: requestId,
        reason: "read_failed",
      });
      return jsonResponse({ error: "read_failed" }, 500);
    }

    if (!pendingRequest) {
      return jsonResponse({ action: "skipped", reason: "not_pending" });
    }

    const linkRequest = pendingRequest as LinkRequestRow;
    const attestationRequired = requiresSafetyAttestation();
    const attestation = checkSafetyAttestation(linkRequest);

    console.log("auto approval request classification", {
      attestationEligible: attestation.ok,
      attestationRequired,
      id: linkRequest.id,
      safetyStatus: getSafetyStatusClass(linkRequest.safety_status),
      submissionSource: getSubmissionClass(linkRequest.submission_source),
    });

    if (attestationRequired && !attestation.ok) {
      return jsonResponse({
        action: "left_pending",
        detail: attestation.reason,
        reason: "safety_attestation_required",
      });
    }

    if (!isValidStoredSlug(linkRequest.requested_slug)) {
      return jsonResponse({ action: "left_pending", reason: "invalid_slug" });
    }

    const safetyResult = await checkUrlSafety(linkRequest.target_url);
    logSafetyDecision(linkRequest.id, safetyResult);

    if (!safetyResult.ok) {
      return jsonResponse({
        action: "left_pending",
        detail: safetyResult.detail,
        reason: safetyResult.reason,
      });
    }

    const approvalRpc = attestationRequired
      ? "auto_approve_link_request_v2"
      : "auto_approve_link_request";
    const { data: approvedRequest, error: updateError } = await supabase
      .rpc(approvalRpc, {
        request_id: linkRequest.id,
        reviewer_id: autoReviewerUserId,
      })
      .maybeSingle();

    if (updateError) {
      console.error("auto approval rpc failed", {
        code: updateError.code || "unknown",
        id: linkRequest.id,
        reason: "approval_rpc_failed",
      });
      return jsonResponse({ error: "approval_rpc_failed", reason: "approval_rpc_failed" }, 500);
    }

    if (!approvedRequest) {
      return jsonResponse({
        action: "skipped",
        reason: attestationRequired
          ? "attestation_or_status_changed"
          : "status_changed",
      });
    }

    return jsonResponse({
      action: "approved",
      finalUrl: safetyResult.finalUrl,
      id: linkRequest.id,
      reason: safetyResult.reason,
    });
  } catch (error) {
    console.error("auto approval failed", {
      errorName: error instanceof Error ? error.name : "unknown",
      reason: "unexpected_error",
    });
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
