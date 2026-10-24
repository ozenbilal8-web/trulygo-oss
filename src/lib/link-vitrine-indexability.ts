const AUTO_GENERATED_DISPLAY_NAME = "trulygo kullanıcısı";

export type VitrineIndexabilityItem = {
  isActive: boolean;
  url: string | null;
};

export type VitrineIndexabilityInput = {
  bio: string | null;
  displayName: string | null;
  handle: string | null;
  isPublished: boolean;
  items: readonly VitrineIndexabilityItem[] | null | undefined;
};

function normalizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function normalizeDisplayName(value: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function isSafePublicVitrineUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return Boolean(url.hostname) && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

export function isVitrineIndexable(vitrine: VitrineIndexabilityInput) {
  const handle = vitrine.handle ?? "";
  const displayName = normalizeDisplayName(vitrine.displayName);
  const hasValidNormalizedHandle =
    /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(handle) && normalizeHandle(handle) === handle;
  const hasActualDisplayName =
    Boolean(displayName) && displayName.toLocaleLowerCase("tr-TR") !== AUTO_GENERATED_DISPLAY_NAME;
  const hasBio = Boolean(vitrine.bio?.trim());
  const hasActivePublicLink = (vitrine.items ?? []).some(
    (item) => item.isActive && isSafePublicVitrineUrl(item.url),
  );

  return (
    vitrine.isPublished &&
    hasValidNormalizedHandle &&
    hasActualDisplayName &&
    (hasBio || hasActivePublicLink)
  );
}
