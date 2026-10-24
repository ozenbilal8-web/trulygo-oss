import type { LinkVitrineIdentityItem } from "@/lib/link-vitrine-identity";
import { buildLinkVitrineIdentitySameAs } from "@/lib/link-vitrine-identity";
import { absoluteUrl, cleanSeoDescription } from "@/lib/seo";

export type LinkVitrineSeoProfile = {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: string | null;
  handle: string;
  items: readonly LinkVitrineIdentityItem[];
  name: string;
  updatedAt: string | null;
};

function normalizePlainText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildLinkVitrineMetaDescription({
  bio,
  name,
}: Pick<LinkVitrineSeoProfile, "bio" | "name">) {
  const normalizedName = normalizePlainText(name);
  const fallback = `TrulyGo Link Vitrini üzerinden ${normalizedName} profilinin bağlantılarına ulaşın.`;

  return cleanSeoDescription(bio, fallback);
}

export function normalizeLinkVitrineSchemaDate(value: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

export function buildLinkVitrineProfileJsonLd(
  profile: LinkVitrineSeoProfile,
  canonical: string,
) {
  const name = normalizePlainText(profile.name);
  const description = profile.bio ? normalizePlainText(profile.bio) : "";
  const image = absoluteUrl(profile.avatarUrl) ?? absoluteUrl(profile.bannerUrl);
  const sameAs = buildLinkVitrineIdentitySameAs(profile.items);
  const dateCreated = normalizeLinkVitrineSchemaDate(profile.createdAt);
  const dateModified = normalizeLinkVitrineSchemaDate(profile.updatedAt);
  const mainEntity: Record<string, unknown> = {
    "@type": "Person",
    name,
    url: canonical,
  };

  if (profile.handle && profile.handle !== name) {
    mainEntity.alternateName = profile.handle;
  }

  if (description) {
    mainEntity.description = description;
  }

  if (image) {
    mainEntity.image = image;
  }

  if (sameAs.length > 0) {
    mainEntity.sameAs = sameAs;
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: canonical,
    name: `${name} | TrulyGo Link Vitrini`,
    ...(dateCreated ? { dateCreated } : {}),
    ...(dateModified ? { dateModified } : {}),
    mainEntity,
  };
}
