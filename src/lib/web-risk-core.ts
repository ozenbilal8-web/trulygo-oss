const WEB_RISK_LOOKUP_ENDPOINT =
  "https://webrisk.googleapis.com/v1/uris:search";

const DEFAULT_FETCH_TIMEOUT_MS = 3_500;

export const WEB_RISK_THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
] as const;

export type WebRiskThreatType = (typeof WEB_RISK_THREAT_TYPES)[number];

export type WebRiskStatus = "clean" | "flagged" | "error" | "skipped";

export type WebRiskCheckResult = {
  status: WebRiskStatus;
  threats: WebRiskThreatType[];
  checkedAt: string;
};

type FailureLogger = (
  detail: string,
  extra?: Record<string, unknown>,
) => void;

type WebRiskCoreOptions = {
  apiKey: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
  onFailure?: FailureLogger;
};

type ResponseDecision =
  | { status: "clean"; threats: WebRiskThreatType[] }
  | { status: "flagged"; threats: WebRiskThreatType[] }
  | { status: "error"; threats: WebRiskThreatType[] };

function buildLookupUrl(apiKey: string, targetUrl: string): string {
  const url = new URL(WEB_RISK_LOOKUP_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("uri", targetUrl);
  for (const threatType of WEB_RISK_THREAT_TYPES) {
    url.searchParams.append("threatTypes", threatType);
  }
  return url.href;
}

function isThreatType(value: unknown): value is WebRiskThreatType {
  return (
    typeof value === "string" &&
    (WEB_RISK_THREAT_TYPES as readonly string[]).includes(value)
  );
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function classifyResponseBody(body: unknown): ResponseDecision {
  if (!isPlainJsonObject(body)) {
    return { status: "error", threats: [] };
  }

  const responseKeys = Object.keys(body);
  if (responseKeys.length === 0) {
    return { status: "clean", threats: [] };
  }

  if (responseKeys.length !== 1 || responseKeys[0] !== "threat") {
    return { status: "error", threats: [] };
  }

  const threat = body.threat;
  if (!isPlainJsonObject(threat)) {
    return { status: "error", threats: [] };
  }

  const threatKeys = Object.keys(threat);
  if (
    !hasOwn(threat, "threatTypes") ||
    threatKeys.some((key) => key !== "threatTypes" && key !== "expireTime")
  ) {
    return { status: "error", threats: [] };
  }

  const threatTypes = threat.threatTypes;
  if (!Array.isArray(threatTypes) || threatTypes.length === 0) {
    return { status: "error", threats: [] };
  }

  if (hasOwn(threat, "expireTime")) {
    const expireTime = threat.expireTime;
    if (typeof expireTime !== "string" || expireTime.trim().length === 0) {
      return { status: "error", threats: [] };
    }
  }

  const seen = new Set<WebRiskThreatType>();
  for (const value of threatTypes) {
    if (!isThreatType(value)) {
      return { status: "error", threats: [] };
    }
    seen.add(value);
  }

  return { status: "flagged", threats: Array.from(seen) };
}

export async function checkUrlWithWebRiskCore(
  targetUrl: string | null | undefined,
  options: WebRiskCoreOptions,
): Promise<WebRiskCheckResult> {
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  const trimmedUrl = targetUrl?.trim();
  const onFailure = options.onFailure ?? (() => undefined);

  if (!trimmedUrl) {
    onFailure("empty_target_url");
    return { status: "error", threats: [], checkedAt };
  }

  if (!options.apiKey) {
    return { status: "skipped", threats: [], checkedAt };
  }

  const lookupUrl = buildLookupUrl(options.apiKey, trimmedUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(lookupUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      onFailure("non_ok_response", { status: response.status });
      return { status: "error", threats: [], checkedAt };
    }

    const body = (await response.json()) as unknown;
    const decision = classifyResponseBody(body);

    if (decision.status === "error") {
      onFailure("invalid_response_shape");
    }

    return { ...decision, checkedAt };
  } catch (error) {
    const detail =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_error";
    onFailure(detail);
    return { status: "error", threats: [], checkedAt };
  } finally {
    clearTimeout(timeoutId);
  }
}
