function getSafeHttpUrl(value: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (!url.hostname || url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function normalizeHttpUrl(value: string | null) {
  return getSafeHttpUrl(value)?.href ?? null;
}

export function isSafeHttpUrl(value: string | null) {
  return getSafeHttpUrl(value) !== null;
}
