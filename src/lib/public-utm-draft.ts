export const PUBLIC_UTM_DRAFT_VERSION = 1 as const;
export const PUBLIC_UTM_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;
export const PUBLIC_UTM_DRAFT_STORAGE_KEY = "trulygo:public-utm-draft:v1";
export const PUBLIC_UTM_DRAFT_MAX_URL_LENGTH = 8_192;
export const PUBLIC_UTM_DRAFT_MAX_UTM_VALUE_LENGTH = 512;
export const PUBLIC_UTM_DRAFT_MAX_SERIALIZED_LENGTH = 24_576;

export type PublicUtmDraftStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type PublicUtmDraftInput = {
  generatedUrl: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export type PublicUtmDraft = {
  generatedUrl: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  utmTerm: string | null;
  createdAt: number;
  version: typeof PUBLIC_UTM_DRAFT_VERSION;
};

const DRAFT_FIELDS = new Set([
  "generatedUrl",
  "destinationUrl",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "createdAt",
  "version",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyDraftFields(value: Record<string, unknown>) {
  const keys = Object.keys(value);
  return keys.length === DRAFT_FIELDS.size && keys.every((key) => DRAFT_FIELDS.has(key));
}

function normalizeRequiredValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= PUBLIC_UTM_DRAFT_MAX_UTM_VALUE_LENGTH
    ? normalized
    : null;
}

function normalizeOptionalValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length > PUBLIC_UTM_DRAFT_MAX_UTM_VALUE_LENGTH) {
    return undefined;
  }

  return normalized.length > 0 ? normalized : null;
}

function normalizeSafeUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.length > PUBLIC_UTM_DRAFT_MAX_URL_LENGTH) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const normalized = url.href;
    return normalized.length <= PUBLIC_UTM_DRAFT_MAX_URL_LENGTH ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeDraft(value: unknown, now: number): PublicUtmDraft | null {
  if (!Number.isFinite(now) || !isRecord(value) || !hasOnlyDraftFields(value)) {
    return null;
  }
  if (value.version !== PUBLIC_UTM_DRAFT_VERSION) {
    return null;
  }
  const createdAt = value.createdAt;
  if (
    typeof createdAt !== "number" ||
    !Number.isSafeInteger(createdAt) ||
    createdAt < 0 ||
    createdAt > now
  ) {
    return null;
  }
  if (now - createdAt >= PUBLIC_UTM_DRAFT_TTL_MS) {
    return null;
  }

  const generatedUrl = normalizeSafeUrl(value.generatedUrl);
  const destinationUrl = normalizeSafeUrl(value.destinationUrl);
  const utmSource = normalizeRequiredValue(value.utmSource);
  const utmMedium = normalizeRequiredValue(value.utmMedium);
  const utmCampaign = normalizeRequiredValue(value.utmCampaign);
  const utmContent = normalizeOptionalValue(value.utmContent);
  const utmTerm = normalizeOptionalValue(value.utmTerm);

  if (
    !generatedUrl ||
    !destinationUrl ||
    !utmSource ||
    !utmMedium ||
    !utmCampaign ||
    utmContent === undefined ||
    utmTerm === undefined
  ) {
    return null;
  }

  return {
    generatedUrl,
    destinationUrl,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    createdAt,
    version: PUBLIC_UTM_DRAFT_VERSION,
  };
}

export function clearPublicUtmDraft(storage: PublicUtmDraftStorage) {
  try {
    storage.removeItem(PUBLIC_UTM_DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function savePublicUtmDraft(
  storage: PublicUtmDraftStorage,
  input: PublicUtmDraftInput,
  now = Date.now(),
) {
  const draft = normalizeDraft(
    {
      generatedUrl: input?.generatedUrl,
      destinationUrl: input?.destinationUrl,
      utmSource: input?.utmSource,
      utmMedium: input?.utmMedium,
      utmCampaign: input?.utmCampaign,
      utmContent: input?.utmContent ?? null,
      utmTerm: input?.utmTerm ?? null,
      createdAt: now,
      version: PUBLIC_UTM_DRAFT_VERSION,
    },
    now,
  );

  if (!draft) {
    return false;
  }

  const serialized = JSON.stringify(draft);
  if (serialized.length > PUBLIC_UTM_DRAFT_MAX_SERIALIZED_LENGTH) {
    return false;
  }

  try {
    storage.setItem(PUBLIC_UTM_DRAFT_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function readPublicUtmDraft(
  storage: PublicUtmDraftStorage,
  now = Date.now(),
): PublicUtmDraft | null {
  let serialized: string | null;
  try {
    serialized = storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!serialized) {
    return null;
  }
  if (serialized.length > PUBLIC_UTM_DRAFT_MAX_SERIALIZED_LENGTH) {
    clearPublicUtmDraft(storage);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    clearPublicUtmDraft(storage);
    return null;
  }

  const draft = normalizeDraft(parsed, now);
  if (!draft) {
    clearPublicUtmDraft(storage);
  }

  return draft;
}

export function consumePublicUtmDraft(
  storage: PublicUtmDraftStorage,
  now = Date.now(),
): PublicUtmDraft | null {
  const draft = readPublicUtmDraft(storage, now);
  if (!draft) {
    return null;
  }

  return clearPublicUtmDraft(storage) ? draft : null;
}
