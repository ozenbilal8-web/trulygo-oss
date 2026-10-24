export const reservedSlugs = [
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
] as const;

export type SlugValidationError = "invalid_slug" | "reserved_slug";

const asciiFoldMap: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function isReservedSlug(slug: string) {
  return reservedSlugs.includes(slug.toLowerCase() as (typeof reservedSlugs)[number]);
}

export function slugifyToAscii(value: string | null) {
  if (!value) {
    return null;
  }

  const folded = value
    .trim()
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (character) => asciiFoldMap[character] ?? character)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || null;
}

export function normalizeRequestedSlug(value: string | null) {
  return slugifyToAscii(value);
}

export function validateRequestedSlug(
  value: string | null,
): { slug: string | null; error: SlugValidationError | null } {
  const hasValue = Boolean(value?.trim());
  const slug = normalizeRequestedSlug(value);

  if (!slug) {
    return { slug: null, error: hasValue ? "invalid_slug" : null };
  }

  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    return { slug: null, error: "invalid_slug" };
  }

  if (isReservedSlug(slug)) {
    return { slug: null, error: "reserved_slug" };
  }

  return { slug, error: null };
}

export function buildChannelSlug(parentSlug: string, suffixValue: string) {
  const suffix = slugifyToAscii(suffixValue);

  if (!suffix) {
    return null;
  }

  const maxParentLength = 80 - suffix.length - 1;

  if (maxParentLength < 2) {
    return null;
  }

  const parentSegment = parentSlug.slice(0, maxParentLength).replace(/-+$/g, "");

  if (parentSegment.length < 2) {
    return null;
  }

  const channelSlug = `${parentSegment}-${suffix}`;

  return isReservedSlug(channelSlug) ? null : channelSlug;
}

export function buildShortUrl(origin: string, slug: string) {
  return `${origin.replace(/\/+$/g, "")}/${slug}`;
}

/**
 * Display-only label for a short link. Strips the http(s):// protocol prefix and any
 * trailing slash so the UI reads `example.invalid/foo-wa` instead of `https://example.invalid/foo-wa/`.
 * The original URL is preserved for href, title, clipboard copy, and analytics.
 */
export function formatShortLinkLabel(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}
