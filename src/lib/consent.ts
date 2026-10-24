export type CookieConsentChoice = "essential" | "all";

export const CONSENT_STORAGE_KEY = "trulygo_consent";
export const CONSENT_VERSION = "2026-08-28";
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const CONSENT_EVENT = "trulygo:consent-changed";
const MAX_TIMER_DELAY_MS = 2_147_000_000;

type StoredConsent = {
  choice: CookieConsentChoice;
  decidedAt: string;
  version: string;
};

// When browser storage is unavailable, keep the user's current-tab decision
// fail-closed instead of falling back to a stale persisted "all" value.
let runtimeConsentOverride: StoredConsent | null | undefined;

function isClient() {
  return typeof window !== "undefined";
}

function readRaw(): string | null {
  if (!isClient()) return null;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function removeRaw() {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // A malformed or expired value still fails closed even if storage is blocked.
  }
}

function parseStoredConsent(raw: string): StoredConsent | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    const decidedAt = typeof parsed.decidedAt === "string" ? Date.parse(parsed.decidedAt) : NaN;
    const age = Date.now() - decidedAt;

    if (
      (parsed.choice !== "essential" && parsed.choice !== "all") ||
      parsed.version !== CONSENT_VERSION ||
      typeof parsed.decidedAt !== "string" ||
      !Number.isFinite(decidedAt) ||
      age < 0 ||
      age >= CONSENT_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      choice: parsed.choice,
      decidedAt: parsed.decidedAt,
      version: parsed.version,
    };
  } catch {
    // Legacy raw values did not include a decision time or notice version.
    return null;
  }
}

function getStoredConsent(): StoredConsent | null {
  if (runtimeConsentOverride !== undefined) return runtimeConsentOverride;

  const raw = readRaw();
  if (!raw) return null;

  const stored = parseStoredConsent(raw);
  if (!stored) removeRaw();
  return stored;
}

export function getCookieConsent(): CookieConsentChoice | null {
  return getStoredConsent()?.choice ?? null;
}

export function setCookieConsent(value: CookieConsentChoice) {
  if (!isClient()) return;
  const stored: StoredConsent = {
    choice: value,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  runtimeConsentOverride = stored;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    runtimeConsentOverride = undefined;
  } catch {
    // Storage may be blocked; in-tab listeners still fire via the custom event.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function clearCookieConsent() {
  if (!isClient()) return;
  runtimeConsentOverride = null;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    runtimeConsentOverride = undefined;
  } catch {
    // Keep the in-tab revocation active even if a stale persisted value cannot be removed.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function filterOptionalAnalyticsEvent<T>(event: T): T | null {
  return getCookieConsent() === "all" ? event : null;
}

export function subscribeCookieConsent(callback: () => void) {
  if (!isClient()) return () => {};
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleExpiry = () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;

    const stored = getStoredConsent();
    if (!stored) return;

    const expiresIn = Date.parse(stored.decidedAt) + CONSENT_MAX_AGE_MS - Date.now();
    const delay = Math.min(Math.max(expiresIn, 0), MAX_TIMER_DELAY_MS);
    expiryTimer = setTimeout(() => {
      if (expiresIn <= MAX_TIMER_DELAY_MS) {
        getCookieConsent();
        callback();
      }
      scheduleExpiry();
    }, delay);
  };

  const notify = () => {
    callback();
    scheduleExpiry();
  };
  const handleStorage = () => {
    runtimeConsentOverride = undefined;
    notify();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CONSENT_EVENT, notify);
  scheduleExpiry();
  return () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CONSENT_EVENT, notify);
  };
}
