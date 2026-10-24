import type { LinkVitrinePlatform } from "./link-vitrine-config";

export type LinkVitrineIdentityItem = {
  isActive: boolean;
  platform: LinkVitrinePlatform;
  url: string | null;
};

const HOSTS = {
  facebook: new Set(["facebook.com", "www.facebook.com"]),
  github: new Set(["github.com", "www.github.com"]),
  instagram: new Set(["instagram.com", "www.instagram.com"]),
  kick: new Set(["kick.com", "www.kick.com"]),
  linkedin: new Set(["linkedin.com", "www.linkedin.com"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com"]),
  twitch: new Set(["twitch.tv", "www.twitch.tv"]),
  x: new Set(["twitter.com", "www.twitter.com", "x.com", "www.x.com"]),
  youtube: new Set(["youtube.com", "www.youtube.com"]),
};

const RESERVED_SINGLE_SEGMENTS = {
  facebook: new Set([
    "ads",
    "business",
    "checkpoint",
    "events",
    "friends",
    "gaming",
    "groups",
    "help",
    "home.php",
    "live",
    "login",
    "login.php",
    "marketplace",
    "messages",
    "notifications",
    "pages",
    "permalink.php",
    "people",
    "policies",
    "photo",
    "photo.php",
    "photos",
    "profile.php",
    "privacy",
    "recover",
    "reel",
    "share",
    "share.php",
    "settings",
    "story.php",
    "terms",
    "video",
    "videos",
    "watch",
  ]),
  github: new Set([
    "account",
    "about",
    "apps",
    "codespaces",
    "collections",
    "contact",
    "copilot",
    "customer-stories",
    "dashboard",
    "enterprise",
    "events",
    "explore",
    "features",
    "issues",
    "login",
    "marketplace",
    "models",
    "new",
    "notifications",
    "organizations",
    "orgs",
    "pricing",
    "pulls",
    "readme",
    "resources",
    "search",
    "security",
    "settings",
    "signup",
    "solutions",
    "sponsors",
    "support",
    "topics",
    "trending",
    "user",
    "users",
  ]),
  instagram: new Set([
    "about",
    "accounts",
    "api",
    "challenge",
    "developer",
    "directory",
    "direct",
    "explore",
    "legal",
    "login",
    "p",
    "privacy",
    "reel",
    "reels",
    "stories",
    "terms",
    "tv",
  ]),
  kick: new Set([
    "browse",
    "categories",
    "category",
    "dashboard",
    "following",
    "login",
    "search",
    "settings",
    "signup",
    "subscriptions",
  ]),
  twitch: new Set([
    "directory",
    "downloads",
    "drops",
    "following",
    "inventory",
    "jobs",
    "login",
    "messages",
    "p",
    "redeem",
    "search",
    "settings",
    "signup",
    "subscriptions",
    "team",
    "turbo",
    "videos",
    "wallet",
  ]),
  x: new Set([
    "about",
    "account",
    "compose",
    "communities",
    "download",
    "explore",
    "hashtag",
    "home",
    "i",
    "intent",
    "jobs",
    "login",
    "logout",
    "messages",
    "notifications",
    "oauth",
    "privacy",
    "premium",
    "search",
    "settings",
    "share",
    "signup",
    "tos",
    "widgets",
  ]),
};

const FACEBOOK_TRACKING_PARAMETERS = new Set([
  "__cft__",
  "__tn__",
  "fbclid",
  "locale",
  "mibextid",
  "ref",
  "refid",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

const YOUTUBE_PROFILE_TABS = new Set([
  "about",
  "channels",
  "community",
  "featured",
  "playlists",
  "shorts",
  "streams",
  "videos",
]);

const X_USERNAME = /^[A-Za-z0-9_]{1,15}$/;
const LINKEDIN_SLUG = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?$/;
const YOUTUBE_HANDLE = /^@[A-Za-z0-9](?:[A-Za-z0-9._-]{1,28}[A-Za-z0-9])$/;
const YOUTUBE_CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const YOUTUBE_CUSTOM_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/;
const FACEBOOK_USERNAME = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*$/;
const FACEBOOK_PAGE_SLUG = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/;
const FACEBOOK_ID = /^[1-9]\d{0,31}$/;
const TWITCH_USERNAME = /^[A-Za-z0-9_]{4,25}$/;
const GITHUB_USERNAME = /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const KICK_USERNAME = /^[A-Za-z0-9_]{3,25}$/;

function parseHttpUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function decodePathSegments(url: URL) {
  const rawSegments = url.pathname.split("/");

  if (rawSegments.shift() !== "") {
    return null;
  }

  if (rawSegments.at(-1) === "") {
    rawSegments.pop();
  }

  if (rawSegments.some((segment) => !segment)) {
    return null;
  }

  try {
    const segments = rawSegments.map((segment) => decodeURIComponent(segment));

    if (
      segments.some(
        (segment) => segment.includes("%") || /[\/\\\u0000-\u001f\u007f]/.test(segment),
      )
    ) {
      return null;
    }

    return segments;
  } catch {
    return null;
  }
}

function hasHost(url: URL, allowedHosts: ReadonlySet<string>) {
  return allowedHosts.has(url.hostname.toLowerCase());
}

function isReserved(value: string, reserved: ReadonlySet<string>) {
  return reserved.has(value.toLowerCase());
}

function buildIdentityUrl(hostname: string, segments: readonly string[], queryId?: string) {
  const url = new URL("https://identity.invalid");
  url.hostname = hostname;
  url.pathname = `/${segments.join("/")}`;
  url.search = "";
  url.hash = "";

  if (queryId) {
    url.searchParams.set("id", queryId);
  }

  return url.toString();
}

function normalizeSingleSegmentProfile(
  url: URL,
  segments: readonly string[],
  allowedHosts: ReadonlySet<string>,
  canonicalHost: string,
  usernamePattern: RegExp,
  reserved: ReadonlySet<string>,
) {
  const username = segments[0];

  if (
    !hasHost(url, allowedHosts) ||
    segments.length !== 1 ||
    !username ||
    !usernamePattern.test(username) ||
    isReserved(username, reserved)
  ) {
    return null;
  }

  return buildIdentityUrl(canonicalHost, [username]);
}

function normalizeInstagram(url: URL, segments: readonly string[]) {
  const username = segments[0];

  if (
    !hasHost(url, HOSTS.instagram) ||
    segments.length !== 1 ||
    !username ||
    username.length > 30 ||
    !/^[A-Za-z0-9._]+$/.test(username) ||
    username.startsWith(".") ||
    username.endsWith(".") ||
    username.includes("..") ||
    isReserved(username, RESERVED_SINGLE_SEGMENTS.instagram)
  ) {
    return null;
  }

  return buildIdentityUrl("instagram.com", [username]);
}

function normalizeLinkedIn(url: URL, segments: readonly string[]) {
  if (
    !hasHost(url, HOSTS.linkedin) ||
    segments.length !== 2 ||
    !["company", "in", "school"].includes(segments[0]?.toLowerCase() ?? "") ||
    !LINKEDIN_SLUG.test(segments[1] ?? "")
  ) {
    return null;
  }

  return buildIdentityUrl("linkedin.com", [segments[0].toLowerCase(), segments[1]]);
}

function normalizeYouTube(url: URL, segments: readonly string[]) {
  if (!hasHost(url, HOSTS.youtube)) {
    return null;
  }

  const first = segments[0] ?? "";
  const second = segments[1] ?? "";
  const firstLower = first.toLowerCase();
  const secondLower = second.toLowerCase();

  if (
    YOUTUBE_HANDLE.test(first) &&
    (segments.length === 1 || (segments.length === 2 && YOUTUBE_PROFILE_TABS.has(secondLower)))
  ) {
    return buildIdentityUrl("youtube.com", [first]);
  }

  if (segments.length !== 2) {
    return null;
  }

  if (firstLower === "channel" && YOUTUBE_CHANNEL_ID.test(second)) {
    return buildIdentityUrl("youtube.com", ["channel", second]);
  }

  if (["c", "user"].includes(firstLower) && YOUTUBE_CUSTOM_ID.test(second)) {
    return buildIdentityUrl("youtube.com", [firstLower, second]);
  }

  return null;
}

function facebookProfileId(url: URL) {
  const ids = url.searchParams.getAll("id");

  if (ids.length !== 1 || !FACEBOOK_ID.test(ids[0] ?? "")) {
    return null;
  }

  for (const key of url.searchParams.keys()) {
    if (key !== "id" && !FACEBOOK_TRACKING_PARAMETERS.has(key.toLowerCase())) {
      return null;
    }
  }

  return ids[0];
}

function normalizeFacebook(url: URL, segments: readonly string[]) {
  if (!hasHost(url, HOSTS.facebook)) {
    return null;
  }

  if (segments.length === 1 && segments[0]?.toLowerCase() === "profile.php") {
    const id = facebookProfileId(url);
    return id ? buildIdentityUrl("facebook.com", ["profile.php"], id) : null;
  }

  const username = segments[0];

  if (
    segments.length === 1 &&
    username &&
    username.length >= 5 &&
    username.length <= 50 &&
    FACEBOOK_USERNAME.test(username) &&
    !isReserved(username, RESERVED_SINGLE_SEGMENTS.facebook)
  ) {
    return buildIdentityUrl("facebook.com", [username]);
  }

  if (
    segments.length === 3 &&
    ["pages", "people"].includes(segments[0]?.toLowerCase() ?? "") &&
    FACEBOOK_PAGE_SLUG.test(segments[1] ?? "") &&
    FACEBOOK_ID.test(segments[2] ?? "")
  ) {
    return buildIdentityUrl("facebook.com", [segments[0].toLowerCase(), segments[1], segments[2]]);
  }

  return null;
}

function normalizeTikTok(url: URL, segments: readonly string[]) {
  const username = segments[0] ?? "";

  if (
    !hasHost(url, HOSTS.tiktok) ||
    segments.length !== 1 ||
    !/^@[A-Za-z0-9][A-Za-z0-9._]{0,22}[A-Za-z0-9_]$/.test(username) ||
    username.includes("..")
  ) {
    return null;
  }

  return buildIdentityUrl("tiktok.com", [username]);
}

export function normalizeLinkVitrineIdentityUrl(item: LinkVitrineIdentityItem): string | null {
  if (!item.isActive) {
    return null;
  }

  const url = parseHttpUrl(item.url);
  const segments = url ? decodePathSegments(url) : null;

  if (!url || !segments) {
    return null;
  }

  switch (item.platform) {
    case "x":
      return normalizeSingleSegmentProfile(
        url,
        segments,
        HOSTS.x,
        "x.com",
        X_USERNAME,
        RESERVED_SINGLE_SEGMENTS.x,
      );
    case "instagram":
      return normalizeInstagram(url, segments);
    case "linkedin":
      return normalizeLinkedIn(url, segments);
    case "youtube":
      return normalizeYouTube(url, segments);
    case "facebook":
      return normalizeFacebook(url, segments);
    case "twitch":
      return normalizeSingleSegmentProfile(
        url,
        segments,
        HOSTS.twitch,
        "twitch.tv",
        TWITCH_USERNAME,
        RESERVED_SINGLE_SEGMENTS.twitch,
      );
    case "website":
      return normalizeSingleSegmentProfile(
        url,
        segments,
        HOSTS.github,
        "github.com",
        GITHUB_USERNAME,
        RESERVED_SINGLE_SEGMENTS.github,
      );
    case "tiktok":
      return normalizeTikTok(url, segments);
    case "kick":
      return normalizeSingleSegmentProfile(
        url,
        segments,
        HOSTS.kick,
        "kick.com",
        KICK_USERNAME,
        RESERVED_SINGLE_SEGMENTS.kick,
      );
    default:
      return null;
  }
}

export function buildLinkVitrineIdentitySameAs(
  items: readonly LinkVitrineIdentityItem[],
): string[] {
  return Array.from(
    new Set(
      items
        .map(normalizeLinkVitrineIdentityUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  );
}
