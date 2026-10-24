export const LINK_VITRINE_THEME_IDS = [
  "dark-premium",
  "minimal-light",
  "green-glow",
  "glass-effect",
  "plain-black",
  "rose-premium",
  "violet-neon",
  "cyan-tech",
  "amber-gold",
  "dark-ruby",
] as const;

export type LinkVitrineTheme = (typeof LINK_VITRINE_THEME_IDS)[number];

export const LINK_VITRINE_THEMES: Array<{
  id: LinkVitrineTheme;
  label: string;
  swatch: [string, string, string];
}> = [
  {
    id: "dark-premium",
    label: "Koyu Premium",
    swatch: ["#0f1a33", "#1f2a47", "#66d98f"],
  },
  {
    id: "minimal-light",
    label: "Minimal Açık",
    swatch: ["#f6f6f2", "#ffffff", "#0a1020"],
  },
  {
    id: "green-glow",
    label: "Yeşil Glow",
    swatch: ["#07130d", "#1f6b43", "#6ee99a"],
  },
  {
    id: "glass-effect",
    label: "Cam Efekti",
    swatch: ["#1b2547", "#ffffff40", "#f3f5fb"],
  },
  {
    id: "plain-black",
    label: "Sade Siyah",
    swatch: ["#000000", "#1a1a1a", "#ffffff"],
  },
  {
    id: "rose-premium",
    label: "Rose Premium",
    swatch: ["#1b0f17", "#9d2b62", "#f9a8d4"],
  },
  {
    id: "violet-neon",
    label: "Violet Neon",
    swatch: ["#140d2c", "#7c3aed", "#c4b5fd"],
  },
  {
    id: "cyan-tech",
    label: "Cyan Tech",
    swatch: ["#07182b", "#0891b2", "#67e8f9"],
  },
  {
    id: "amber-gold",
    label: "Amber Gold",
    swatch: ["#1c1308", "#b45309", "#fbbf24"],
  },
  {
    id: "dark-ruby",
    label: "Dark Ruby",
    swatch: ["#1a0710", "#9f1239", "#fb7185"],
  },
];

export const LINK_VITRINE_PLATFORM_IDS = [
  "instagram",
  "facebook",
  "x",
  "linkedin",
  "youtube",
  "tiktok",
  "twitch",
  "kick",
  "discord",
  "telegram",
  "whatsapp",
  "website",
  "hepsiburada",
  "trendyol",
  "amazon",
  "n11",
  "idefix",
  "pttavm",
  "ciceksepeti",
  "pazarama",
] as const;

export type LinkVitrinePlatform = (typeof LINK_VITRINE_PLATFORM_IDS)[number];
export type LinkVitrinePlatformCategory = "social" | "marketplace";

export const LINK_VITRINE_SPONSORED_LABEL_IDS = [
  "ad",
  "sponsored",
  "collaboration",
] as const;

export type LinkVitrineSponsoredLabel =
  (typeof LINK_VITRINE_SPONSORED_LABEL_IDS)[number];

export const LINK_VITRINE_SPONSORED_LABELS: Array<{
  id: LinkVitrineSponsoredLabel;
  label: string;
}> = [
  { id: "ad", label: "Reklam" },
  { id: "sponsored", label: "Sponsorlu" },
  { id: "collaboration", label: "İş Birliği" },
];

export const LINK_VITRINE_ANIMATION_TYPE_IDS = [
  "pulse",
  "shake",
  "neon",
  "shine",
  "glow",
] as const;

export type LinkVitrineAnimationType =
  (typeof LINK_VITRINE_ANIMATION_TYPE_IDS)[number];

export const LINK_VITRINE_ANIMATION_TYPES: Array<{
  id: LinkVitrineAnimationType;
  label: string;
}> = [
  { id: "pulse", label: "Yumuşak Pulse" },
  { id: "shake", label: "Hafif Sallanma" },
  { id: "neon", label: "Neon Çerçeve" },
  { id: "shine", label: "Parıltı Geçişi" },
  { id: "glow", label: "Glow Nefes" },
];

export const LINK_VITRINE_PLATFORM_CATEGORIES: Array<{
  id: LinkVitrinePlatformCategory;
  label: string;
}> = [
  { id: "social", label: "Sosyal Platformlar" },
  { id: "marketplace", label: "Marketplace" },
];

export const LINK_VITRINE_PLATFORMS: Array<{
  id: LinkVitrinePlatform;
  category: LinkVitrinePlatformCategory;
  label: string;
  placeholder: string;
  allowedHosts: string[];
  accent: string;
}> = [
  {
    id: "instagram",
    category: "social",
    label: "Instagram",
    placeholder: "https://instagram.com/kullaniciadi",
    allowedHosts: ["instagram.com"],
    accent: "#e1306c",
  },
  {
    id: "facebook",
    category: "social",
    label: "Facebook",
    placeholder: "https://facebook.com/sayfaadi",
    allowedHosts: ["facebook.com"],
    accent: "#1877f2",
  },
  {
    id: "x",
    category: "social",
    label: "X / Twitter",
    placeholder: "https://x.com/kullaniciadi",
    allowedHosts: ["x.com", "twitter.com"],
    accent: "#e6eaf2",
  },
  {
    id: "linkedin",
    category: "social",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/kullanici",
    allowedHosts: ["linkedin.com"],
    accent: "#0a66c2",
  },
  {
    id: "youtube",
    category: "social",
    label: "YouTube",
    placeholder: "https://youtube.com/@kanal",
    allowedHosts: ["youtube.com", "youtu.be"],
    accent: "#ff0033",
  },
  {
    id: "tiktok",
    category: "social",
    label: "TikTok",
    placeholder: "https://tiktok.com/@kullanici",
    allowedHosts: ["tiktok.com"],
    accent: "#00f2ea",
  },
  {
    id: "twitch",
    category: "social",
    label: "Twitch",
    placeholder: "https://twitch.tv/kullanici",
    allowedHosts: ["twitch.tv"],
    accent: "#9146ff",
  },
  {
    id: "kick",
    category: "social",
    label: "Kick",
    placeholder: "https://kick.com/kullanici",
    allowedHosts: ["kick.com"],
    accent: "#53fc18",
  },
  {
    id: "discord",
    category: "social",
    label: "Discord",
    placeholder: "https://discord.gg/davet",
    allowedHosts: ["discord.gg", "discord.com"],
    accent: "#5865f2",
  },
  {
    id: "telegram",
    category: "social",
    label: "Telegram",
    placeholder: "https://t.me/kullaniciadi",
    allowedHosts: ["t.me", "telegram.me", "telegram.org"],
    accent: "#26a5e4",
  },
  {
    id: "whatsapp",
    category: "social",
    label: "WhatsApp",
    placeholder: "https://wa.me/905XXXXXXXXX",
    allowedHosts: ["wa.me", "whatsapp.com"],
    accent: "#25d366",
  },
  {
    id: "website",
    category: "social",
    label: "Website",
    placeholder: "https://siteniz.com",
    allowedHosts: [],
    accent: "#a6b0c8",
  },
  {
    id: "hepsiburada",
    category: "marketplace",
    label: "Hepsiburada",
    placeholder: "https://www.hepsiburada.com/magaza/magaza-adi",
    allowedHosts: ["hepsiburada.com"],
    accent: "#ff6000",
  },
  {
    id: "trendyol",
    category: "marketplace",
    label: "Trendyol",
    placeholder: "https://www.trendyol.com/magaza/magaza-adi",
    allowedHosts: ["trendyol.com"],
    accent: "#f27a1a",
  },
  {
    id: "amazon",
    category: "marketplace",
    label: "Amazon",
    placeholder: "https://www.amazon.com.tr/shop/kullaniciadi",
    allowedHosts: ["amazon.com", "amazon.com.tr"],
    accent: "#ff9900",
  },
  {
    id: "n11",
    category: "marketplace",
    label: "n11",
    placeholder: "https://www.n11.com/magaza/magaza-adi",
    allowedHosts: ["n11.com"],
    accent: "#5d3ebc",
  },
  {
    id: "idefix",
    category: "marketplace",
    label: "idefix",
    placeholder: "https://www.idefix.com/magaza/magaza-adi",
    allowedHosts: ["idefix.com"],
    accent: "#d71920",
  },
  {
    id: "pttavm",
    category: "marketplace",
    label: "PttAVM",
    placeholder: "https://www.pttavm.com/magaza/magaza-adi",
    allowedHosts: ["pttavm.com"],
    accent: "#f8c300",
  },
  {
    id: "ciceksepeti",
    category: "marketplace",
    label: "ÇiçekSepeti",
    placeholder: "https://www.ciceksepeti.com/magaza/magaza-adi",
    allowedHosts: ["ciceksepeti.com"],
    accent: "#2f9e44",
  },
  {
    id: "pazarama",
    category: "marketplace",
    label: "Pazarama",
    placeholder: "https://www.pazarama.com/magaza/magaza-adi",
    allowedHosts: ["pazarama.com"],
    accent: "#005bac",
  },
];

export type LinkVitrineItemInput = {
  platform: LinkVitrinePlatform;
  label: string;
  url: string | null;
  isActive: boolean;
  sortOrder: number;
  isSponsored: boolean;
  sponsoredLabel: LinkVitrineSponsoredLabel | null;
  animationEnabled: boolean;
  animationType: LinkVitrineAnimationType | null;
};

export const DEFAULT_BANNER_POSITION = 50;

export function clampBannerPosition(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return DEFAULT_BANNER_POSITION;
  }

  if (numberValue <= 0) {
    return 0;
  }

  if (numberValue >= 100) {
    return 100;
  }

  return numberValue;
}

export function isLinkVitrineTheme(value: string): value is LinkVitrineTheme {
  return LINK_VITRINE_THEME_IDS.includes(value as LinkVitrineTheme);
}

export function isLinkVitrinePlatform(value: string): value is LinkVitrinePlatform {
  return LINK_VITRINE_PLATFORM_IDS.includes(value as LinkVitrinePlatform);
}

export function isLinkVitrineSponsoredLabel(
  value: string,
): value is LinkVitrineSponsoredLabel {
  return LINK_VITRINE_SPONSORED_LABEL_IDS.includes(
    value as LinkVitrineSponsoredLabel,
  );
}

export function isLinkVitrineAnimationType(
  value: string,
): value is LinkVitrineAnimationType {
  return LINK_VITRINE_ANIMATION_TYPE_IDS.includes(
    value as LinkVitrineAnimationType,
  );
}

export function getLinkVitrinePlatform(platform: LinkVitrinePlatform) {
  return LINK_VITRINE_PLATFORMS.find((item) => item.id === platform);
}

export function getLinkVitrinePlatformsByCategory(category: LinkVitrinePlatformCategory) {
  return LINK_VITRINE_PLATFORMS.filter((platform) => platform.category === category);
}

export function createDefaultLinkVitrineItems(): LinkVitrineItemInput[] {
  return LINK_VITRINE_PLATFORMS.map((platform, index) => ({
    platform: platform.id,
    label: platform.label,
    url: null,
    isActive: false,
    sortOrder: index + 1,
    isSponsored: false,
    sponsoredLabel: null,
    animationEnabled: false,
    animationType: null,
  }));
}

export function normalizeVitrineHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function isValidVitrineHandle(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(value);
}

export function resolveVitrineDisplayName(vitrine: {
  displayName?: string | null;
  handle?: string | null;
}): string {
  const name = vitrine.displayName?.trim();

  if (name) {
    return name;
  }

  return vitrine.handle?.trim() || "Link Vitrini";
}

export function buildVitrineInitials(value: string) {
  const initials = value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "TG";
}

function hasProtocol(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function isAllowedHost(host: string, allowedHosts: string[]) {
  const normalizedHost = normalizeHost(host);

  return allowedHosts.some((allowedHost) => {
    const normalizedAllowed = normalizeHost(allowedHost);

    return normalizedHost === normalizedAllowed || normalizedHost.endsWith(`.${normalizedAllowed}`);
  });
}

export function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!hasProtocol(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (!url.hostname || !url.hostname.includes(".")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function validatePlatformUrl(platformId: LinkVitrinePlatform, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { url: null, error: null };
  }

  const url = normalizeExternalUrl(trimmed);

  if (!url) {
    return { url: null, error: "Geçerli bir http/https URL gir." };
  }

  const parsed = new URL(url);
  const platform = getLinkVitrinePlatform(platformId);

  if (!platform) {
    return { url: null, error: "Desteklenmeyen platform." };
  }

  if (platform.id !== "website" && !isAllowedHost(parsed.hostname, platform.allowedHosts)) {
    return {
      url: null,
      error: `${platform.label} alanı için yalnızca ${platform.allowedHosts.join(" veya ")} kullanılabilir.`,
    };
  }

  return { url, error: null };
}
