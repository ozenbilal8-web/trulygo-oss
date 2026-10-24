import "server-only";

import {
  checkUrlWithWebRiskCore,
  type WebRiskCheckResult,
} from "@/lib/web-risk-core";

export { WEB_RISK_THREAT_TYPES } from "@/lib/web-risk-core";
export type {
  WebRiskCheckResult,
  WebRiskStatus,
  WebRiskThreatType,
} from "@/lib/web-risk-core";

function getApiKey(): string | null {
  const value = process.env.GOOGLE_WEB_RISK_API_KEY?.trim();
  return value && value.length > 0 ? value : null;
}

function logFailure(detail: string, extra?: Record<string, unknown>) {
  // Never include the API key, target URL, response body, or other request
  // context here. The optional fields are limited to safe status metadata.
  console.warn("[web-risk] lookup failed", { detail, ...extra });
}

/**
 * Server-only Google Web Risk lookup. Only an exact, empty JSON object is
 * classified as clean. Any unrecognized or malformed successful response is
 * treated as an error so callers remain fail-closed.
 */
export function checkUrlWithWebRisk(
  targetUrl: string | null | undefined,
): Promise<WebRiskCheckResult> {
  return checkUrlWithWebRiskCore(targetUrl, {
    apiKey: getApiKey(),
    onFailure: logFailure,
  });
}

export function shouldBlockAutoApproval(result: WebRiskCheckResult): boolean {
  return result.status !== "clean";
}
