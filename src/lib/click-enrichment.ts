import { userAgentFromString } from "next/server";

// Derives coarse, privacy-preserving device + approximate-location signals for a
// click. No raw IP is read or returned here — only the User-Agent string and the
// edge geolocation headers Vercel injects. Every field is allowed to be null:
// VPNs, mobile carriers, iCloud Private Relay, corporate proxies and missing
// headers routinely leave location (and sometimes device) blank.

export type ClickDeviceType = "mobile" | "desktop" | "tablet" | "bot" | "unknown";

export type ClickDeviceInfo = {
  deviceType: ClickDeviceType;
  osName: string | null;
  browserName: string | null;
};

export type ClickLocationInfo = {
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  locationLabel: string | null;
};

export const UNKNOWN_LOCATION_LABEL = "Bilinmiyor";

// Turkish display labels for the stored (English) device_type values. Kept here
// so the recorder, the recent-clicks table and the distribution cards stay in
// sync. `unknown` intentionally has no entry — callers omit it / fall back to
// "Bilinmiyor".
export const DEVICE_TYPE_LABELS: Record<Exclude<ClickDeviceType, "unknown">, string> = {
  mobile: "Mobil",
  desktop: "Desktop",
  tablet: "Tablet",
  bot: "Bot",
};

// In-app browsers (a real human inside another app's webview). Detected from the
// raw UA because ua-parser does not reliably name them. Checked before the bot
// list so Instagram/Facebook webview users are not mistaken for crawlers.
const IN_APP_BROWSERS: { test: RegExp; name: string }[] = [
  { test: /instagram/i, name: "Instagram" },
  { test: /(fban|fbav|fb_iab|fbios|fbss|\[fb)/i, name: "Facebook" },
  { test: /tiktok|musical_ly|bytedance/i, name: "TikTok" },
];

// Conservative augmentation of ua-parser's isBot. Covers link-preview fetchers
// and headless clients that should never count as real device traffic.
const EXTRA_BOT_PATTERN =
  /bot\b|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|embedly|pinterest|redditbot|applebot|bingpreview|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptimerobot|python-requests|curl\/|wget\/|axios\/|go-http-client|node-fetch|okhttp/i;

function cleanToken(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return normalized ? normalized : null;
}

function normalizeOsName(name: string | undefined): string | null {
  const cleaned = cleanToken(name);

  if (!cleaned) {
    return null;
  }

  const lower = cleaned.toLowerCase();

  if (lower === "mac os" || lower === "macos" || lower === "mac os x") {
    return "macOS";
  }

  if (lower === "ios") {
    return "iOS";
  }

  if (lower.includes("windows")) {
    return "Windows";
  }

  if (lower.includes("android")) {
    return "Android";
  }

  if (lower.includes("chrome os") || lower === "chromium os") {
    return "Chrome OS";
  }

  if (lower.includes("ubuntu") || lower.includes("debian") || lower.includes("fedora") || lower === "linux") {
    return "Linux";
  }

  return cleaned;
}

function normalizeBrowserName(name: string | undefined): string | null {
  const cleaned = cleanToken(name);

  if (!cleaned) {
    return null;
  }

  const lower = cleaned.toLowerCase();

  // Order matters: Edge / Samsung / Opera UAs also contain "Chrome", and Chrome
  // UAs also contain "Safari", so the more specific names are matched first.
  if (lower.includes("instagram")) return "Instagram";
  if (lower.includes("facebook")) return "Facebook";
  if (lower.includes("edg")) return "Edge";
  if (lower.includes("samsung")) return "Samsung Internet";
  if (lower.includes("opera") || lower.includes("opr")) return "Opera";
  if (lower.includes("yandex")) return "Yandex";
  if (lower.includes("firefox") || lower.includes("fxios")) return "Firefox";
  if (lower.includes("chrome") || lower.includes("chromium") || lower.includes("crios")) return "Chrome";
  if (lower.includes("safari")) return "Safari";

  return cleaned;
}

export function deriveClickDeviceInfo(userAgent: string | null): ClickDeviceInfo {
  const ua = cleanToken(userAgent);

  if (!ua) {
    return { deviceType: "unknown", osName: null, browserName: null };
  }

  const parsed = userAgentFromString(ua);
  const isBot = parsed.isBot || EXTRA_BOT_PATTERN.test(ua);

  let browserName = normalizeBrowserName(parsed.browser?.name);
  for (const app of IN_APP_BROWSERS) {
    if (app.test.test(ua)) {
      browserName = app.name;
      break;
    }
  }

  const osName = normalizeOsName(parsed.os?.name);

  let deviceType: ClickDeviceType;
  if (isBot) {
    deviceType = "bot";
  } else {
    const parsedType = parsed.device?.type;

    if (parsedType === "mobile") {
      deviceType = "mobile";
    } else if (parsedType === "tablet") {
      deviceType = "tablet";
    } else if (!parsedType) {
      // ua-parser leaves `type` undefined for regular desktop browsers.
      deviceType = "desktop";
    } else {
      // console / smarttv / wearable / embedded — rare, not worth a column value.
      deviceType = "unknown";
    }
  }

  return { deviceType, osName, browserName };
}

// Approximate-location display label. Mirrors the product spec:
//   city + country  -> "Istanbul, TR"
//   country only    -> country name ("Türkiye"), falling back to the code
//   nothing         -> "Bilinmiyor"
function buildLocationLabel(
  city: string | null,
  countryCode: string | null,
  countryName: string | null,
): string {
  if (city && countryCode) {
    return `${city}, ${countryCode}`;
  }

  if (city) {
    return city;
  }

  if (countryName) {
    return countryName;
  }

  if (countryCode) {
    return countryCode;
  }

  return UNKNOWN_LOCATION_LABEL;
}

function decodeHeaderValue(value: string | null): string | null {
  const cleaned = cleanToken(value);

  if (!cleaned) {
    return null;
  }

  // Vercel URL-encodes non-ASCII city/region names (e.g. "%C4%B0stanbul").
  try {
    return cleanToken(decodeURIComponent(cleaned));
  } catch {
    return cleaned;
  }
}

export function deriveClickLocationInfo(headers: Headers): ClickLocationInfo {
  const rawCountry = cleanToken(headers.get("x-vercel-ip-country"));
  const countryCode = rawCountry ? rawCountry.toUpperCase() : null;
  const region = decodeHeaderValue(headers.get("x-vercel-ip-country-region"));
  const city = decodeHeaderValue(headers.get("x-vercel-ip-city"));
  const countryName = countryCode ? COUNTRY_NAMES[countryCode] ?? countryCode : null;
  const locationLabel = buildLocationLabel(city, countryCode, countryName);

  return { countryCode, countryName, region, city, locationLabel };
}

// Common country codes likely to appear in TrulyGo traffic. Unknown codes fall
// back to the raw ISO code, so this map only needs to cover the frequent ones.
const COUNTRY_NAMES: Record<string, string> = {
  TR: "Türkiye",
  DE: "Germany",
  US: "United States",
  GB: "United Kingdom",
  NL: "Netherlands",
  FR: "France",
  AT: "Austria",
  BE: "Belgium",
  CH: "Switzerland",
  IT: "Italy",
  ES: "Spain",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  RO: "Romania",
  BG: "Bulgaria",
  GR: "Greece",
  RU: "Russia",
  UA: "Ukraine",
  AZ: "Azerbaijan",
  GE: "Georgia",
  KZ: "Kazakhstan",
  IR: "Iran",
  IQ: "Iraq",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  QA: "Qatar",
  KW: "Kuwait",
  IL: "Israel",
  EG: "Egypt",
  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  CY: "Cyprus",
  CA: "Canada",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  IN: "India",
  PK: "Pakistan",
  BD: "Bangladesh",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  ID: "Indonesia",
  MY: "Malaysia",
  SG: "Singapore",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  AU: "Australia",
  NZ: "New Zealand",
  ZA: "South Africa",
  NG: "Nigeria",
  PT: "Portugal",
  IE: "Ireland",
  CZ: "Czechia",
  SK: "Slovakia",
  HU: "Hungary",
  HR: "Croatia",
  RS: "Serbia",
  SI: "Slovenia",
  TM: "Turkmenistan",
  UZ: "Uzbekistan",
  KG: "Kyrgyzstan",
};
