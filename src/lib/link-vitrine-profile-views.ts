export type LinkVitrineProfileViewCount = string | null;

const CANONICAL_VITRINE_HANDLE_PATTERN =
  /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function normalizeLinkVitrineProfileViewCount(
  value: number | string | bigint | null | undefined,
): LinkVitrineProfileViewCount {
  if (typeof value === "bigint") {
    return value >= BigInt(0) ? value.toString() : null;
  }

  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  }

  const normalized = value?.trim();

  if (!normalized || !/^\d+$/.test(normalized)) {
    return null;
  }

  try {
    return BigInt(normalized).toString();
  } catch {
    return null;
  }
}

export function parseLinkVitrineProfileViewCount(
  value: unknown,
): LinkVitrineProfileViewCount {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    value === null ||
    value === undefined
  ) {
    return normalizeLinkVitrineProfileViewCount(value);
  }

  const row = Array.isArray(value) ? value[0] : value;

  if (!row || typeof row !== "object") {
    return null;
  }

  const profileViewCount = (row as Record<string, unknown>).profile_view_count;

  return typeof profileViewCount === "string" ||
    typeof profileViewCount === "number" ||
    typeof profileViewCount === "bigint"
    ? normalizeLinkVitrineProfileViewCount(profileViewCount)
    : null;
}

export function formatLinkVitrineProfileViewCount(
  value: number | string | bigint | null | undefined,
) {
  const normalized = normalizeLinkVitrineProfileViewCount(value);
  return normalized === null ? null : BigInt(normalized).toLocaleString("tr-TR");
}

export function buildLinkVitrineProfileViewPath(handle: string) {
  const normalizedHandle = handle.trim();

  if (
    normalizedHandle !== handle ||
    !CANONICAL_VITRINE_HANDLE_PATTERN.test(normalizedHandle)
  ) {
    return null;
  }

  return `/v/${encodeURIComponent(normalizedHandle)}/view`;
}
