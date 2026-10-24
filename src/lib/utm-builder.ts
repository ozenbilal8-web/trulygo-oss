export type UtmBuilderInput = {
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export type UtmBuilderErrorField =
  | "destinationUrl"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign";

export type UtmBuilderErrorCode =
  | "required"
  | "invalid_url"
  | "unsupported_protocol"
  | "credentials_not_allowed";

export type UtmBuilderSuccess = {
  ok: true;
  destinationUrl: string;
  generatedUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  utmTerm: string | null;
};

export type UtmBuilderResult =
  | UtmBuilderSuccess
  | {
      ok: false;
      field: UtmBuilderErrorField;
      code: UtmBuilderErrorCode;
    };

const UTM_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

function normalizeRequiredValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalValue(value: unknown) {
  const normalized = normalizeRequiredValue(value);
  return normalized.length > 0 ? normalized : null;
}

function looksLikeProtocolLessDomain(value: string) {
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return false;
  }

  const authority = value.split(/[/?#]/, 1)[0] ?? "";
  if (!authority || authority.includes("@")) {
    return false;
  }

  const host = authority.replace(/:\d+$/, "");
  return host.includes(".") && !host.startsWith(".");
}

type DestinationParseResult =
  | { ok: true; url: URL }
  | { ok: false; code: Exclude<UtmBuilderErrorCode, "required"> };

function parseDestinationUrl(value: string): DestinationParseResult {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { ok: false, code: "invalid_url" };
  }
  if (trimmedValue.includes("\\")) {
    return { ok: false, code: "invalid_url" };
  }

  const schemeMatch = /^([a-z][a-z\d+.-]*):/i.exec(trimmedValue);
  const scheme = schemeMatch?.[1]?.toLowerCase() ?? null;
  const hostPortSuffix = schemeMatch
    ? trimmedValue.slice(schemeMatch[0].length).split(/[/?#]/, 1)[0]
    : "";
  const looksLikeHostPort = Boolean(scheme?.includes(".") && /^\d+$/.test(hostPortSuffix));

  if (scheme && scheme !== "http" && scheme !== "https" && !looksLikeHostPort) {
    return { ok: false, code: "unsupported_protocol" };
  }
  if ((scheme === "http" || scheme === "https") && !/^https?:\/\//i.test(trimmedValue)) {
    return { ok: false, code: "invalid_url" };
  }

  const candidate = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : looksLikeProtocolLessDomain(trimmedValue)
      ? `https://${trimmedValue}`
      : null;

  if (!candidate) {
    return { ok: false, code: "invalid_url" };
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, code: "unsupported_protocol" };
    }
    if (!url.hostname) {
      return { ok: false, code: "invalid_url" };
    }
    if (url.username || url.password) {
      return { ok: false, code: "credentials_not_allowed" };
    }

    return { ok: true, url };
  } catch {
    return { ok: false, code: "invalid_url" };
  }
}

function removeExistingUtmParams(url: URL) {
  for (const key of [...url.searchParams.keys()]) {
    if (UTM_QUERY_KEYS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
}

export function buildUtmUrl(input: UtmBuilderInput): UtmBuilderResult {
  const rawDestinationUrl = normalizeRequiredValue(input?.destinationUrl);
  if (!rawDestinationUrl) {
    return { ok: false, field: "destinationUrl", code: "required" };
  }

  const parsedDestination = parseDestinationUrl(rawDestinationUrl);
  if (!parsedDestination.ok) {
    return { ok: false, field: "destinationUrl", code: parsedDestination.code };
  }
  const destination = parsedDestination.url;

  const utmSource = normalizeRequiredValue(input?.utmSource);
  if (!utmSource) {
    return { ok: false, field: "utmSource", code: "required" };
  }

  const utmMedium = normalizeRequiredValue(input?.utmMedium);
  if (!utmMedium) {
    return { ok: false, field: "utmMedium", code: "required" };
  }

  const utmCampaign = normalizeRequiredValue(input?.utmCampaign);
  if (!utmCampaign) {
    return { ok: false, field: "utmCampaign", code: "required" };
  }

  const utmContent = normalizeOptionalValue(input?.utmContent);
  const utmTerm = normalizeOptionalValue(input?.utmTerm);
  const destinationUrl = destination.href;

  removeExistingUtmParams(destination);
  destination.searchParams.set("utm_source", utmSource);
  destination.searchParams.set("utm_medium", utmMedium);
  destination.searchParams.set("utm_campaign", utmCampaign);

  if (utmContent) {
    destination.searchParams.set("utm_content", utmContent);
  }
  if (utmTerm) {
    destination.searchParams.set("utm_term", utmTerm);
  }

  return {
    ok: true,
    destinationUrl,
    generatedUrl: destination.href,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
  };
}
