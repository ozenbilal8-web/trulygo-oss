export type SupabaseAuthResponseHeaders = Readonly<Record<string, string>>;

export const SUPABASE_AUTH_CACHE_CONTROL =
  "private, no-cache, no-store, must-revalidate, max-age=0";

const CANONICAL_AUTH_CACHE_HEADERS = {
  "Cache-Control": SUPABASE_AUTH_CACHE_CONTROL,
  Expires: "0",
  Pragma: "no-cache",
} as const;

// Vendor-specific cache headers can take precedence over Cache-Control. Remove
// them from auth-cookie responses so the canonical no-store policy is decisive.
const CACHE_OVERRIDE_RESPONSE_HEADERS = new Set([
  "age",
  "cdn-cache-control",
  "cloudflare-cdn-cache-control",
  "surrogate-control",
  "vercel-cdn-cache-control",
  "x-accel-expires",
]);

// Preserve response metadata and transport/framework headers that Supabase's
// cookie callback must not replace on an existing NextResponse.
const PROTECTED_RESPONSE_HEADERS = new Set([
  ...CACHE_OVERRIDE_RESPONSE_HEADERS,
  "clear-site-data",
  "connection",
  "content-disposition",
  "content-encoding",
  "content-length",
  "content-range",
  "content-type",
  "date",
  "etag",
  "keep-alive",
  "last-modified",
  "location",
  "proxy-authenticate",
  "proxy-authorization",
  "refresh",
  "server",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "vary",
  "www-authenticate",
  "x-accel-redirect",
  "x-sendfile",
]);

const PROTECTED_RESPONSE_HEADER_PREFIXES = [
  "x-middleware-",
  "x-nextjs-",
  "x-vercel-",
];

function isProtectedResponseHeader(name: string) {
  const normalizedName = name.toLowerCase();

  return (
    PROTECTED_RESPONSE_HEADERS.has(normalizedName) ||
    PROTECTED_RESPONSE_HEADER_PREFIXES.some((prefix) =>
      normalizedName.startsWith(prefix),
    )
  );
}

export function applySupabaseAuthResponseHeaders(
  targetHeaders: Headers,
  responseHeaders: SupabaseAuthResponseHeaders,
) {
  for (const [name, value] of Object.entries(responseHeaders)) {
    if (!isProtectedResponseHeader(name)) {
      targetHeaders.set(name, value);
    }
  }

  for (const name of CACHE_OVERRIDE_RESPONSE_HEADERS) {
    targetHeaders.delete(name);
  }

  for (const [name, value] of Object.entries(CANONICAL_AUTH_CACHE_HEADERS)) {
    targetHeaders.set(name, value);
  }
}
