import { headers } from "next/headers";

function normalizeOrigin(value: string | null | undefined) {
  const origin = value?.trim();

  if (!origin) {
    return null;
  }

  try {
    const url = new URL(origin);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? null;
}

function normalizeForwardedHost(value: string | null) {
  const host = firstHeaderValue(value);

  if (!host || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) {
    return null;
  }

  return host;
}

function normalizeForwardedProtocol(value: string | null, host: string) {
  const protocol = firstHeaderValue(value);

  if (protocol === "http" || protocol === "https") {
    return protocol;
  }

  return host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
}

export async function getAppOrigin() {
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL,
  );

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const requestHeaders = await headers();
  const host =
    normalizeForwardedHost(requestHeaders.get("x-forwarded-host")) ??
    normalizeForwardedHost(requestHeaders.get("host"));

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = normalizeForwardedProtocol(requestHeaders.get("x-forwarded-proto"), host);

  return `${protocol}://${host}`;
}
