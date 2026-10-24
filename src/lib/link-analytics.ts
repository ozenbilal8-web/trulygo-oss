import { DEVICE_TYPE_LABELS, UNKNOWN_LOCATION_LABEL } from "@/lib/click-enrichment";
import type { LinkHourlyDetailData } from "@/lib/link-hourly-distribution";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const TOP_LIMIT = 12;
const RECENT_LIMIT = 20;
const MIN_PERCENT = 8;
const PERFORMANCE_RANGE_DAYS = 60;
const PERFORMANCE_PAGE_SIZE = 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type LinkClickEvent = {
  id: string;
  linkRequestId: string;
  channelLinkId: string | null;
  slug: string;
  clickedAt: string;
  referrer: string | null;
  userAgent: string | null;
  channelKey: string | null;
  channelLabel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  // Enriched (nullable for click_events recorded before this feature shipped).
  deviceType: string | null;
  osName: string | null;
  browserName: string | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  locationLabel: string | null;
};

export type AnalyticsBar = {
  key: string;
  label: string;
  value: number;
  percentage: number;
};

export type LinkAnalyticsSummaryItem = {
  label: string;
  count: number;
};

export type LinkClickAnalytics = {
  events: LinkClickEvent[];
  recentEvents: LinkClickEvent[];
  todayClicks: number;
  last7DaysClicks: number;
  dailyClicks: AnalyticsBar[];
  channelDistribution: AnalyticsBar[];
  sourceDistribution: AnalyticsBar[];
  campaignDistribution: AnalyticsBar[];
  deviceSummary: LinkAnalyticsSummaryItem[];
  osSummary: LinkAnalyticsSummaryItem[];
  locationSummary: LinkAnalyticsSummaryItem[];
};

export type LinkPerformanceKnownChannel = {
  id: string;
  slug: string;
  channelKey: string;
  channelLabel: string;
};

export type LinkPerformanceDay = {
  key: string;
  label: string;
  longLabel: string;
  total: number;
};

export type LinkPerformanceChannelPoint = {
  dayKey: string;
  value: number;
  dailyTotal: number;
};

export type LinkPerformanceChannelSeries = {
  key: string;
  label: string;
  slug: string | null;
  total: number;
  points: LinkPerformanceChannelPoint[];
};

export type LinkPerformanceBreakdownPoint = {
  dayKey: string;
  value: number;
};

export type LinkPerformanceBreakdownSeries = {
  key: string;
  label: string;
  total: number;
  points: LinkPerformanceBreakdownPoint[];
};

export type LinkPerformanceData = {
  rangeDays: number;
  days: LinkPerformanceDay[];
  channels: LinkPerformanceChannelSeries[];
  devices: LinkPerformanceBreakdownSeries[];
  locations: LinkPerformanceBreakdownSeries[];
  hasClicks: boolean;
};

type RawBucket = { label: string; value: number };
type RawDaily = { key: string; value: number };
type PerformanceRawEvent = {
  id: string;
  channel_link_id: string | null;
  slug: string;
  clicked_at: string;
  clicked_day: string | null;
  visitor_key: string | null;
  channel_key: string | null;
  channel_label: string | null;
  utm_source: string | null;
  device_type: string | null;
  location_label: string | null;
};

type ChannelAccumulator = {
  key: string;
  label: string;
  slug: string | null;
  order: number;
  total: number;
  dayCounts: Map<string, number>;
};

type BreakdownAccumulator = {
  key: string;
  label: string;
  total: number;
  dayCounts: Map<string, number>;
};

const istanbulDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "short",
});

const istanbulLongDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const istanbulDateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDailyLabel(key: string) {
  const parsed = new Date(`${key}T00:00:00+03:00`);
  if (Number.isNaN(parsed.getTime())) {
    return key;
  }
  return istanbulDateFormatter.format(parsed);
}

function formatLongDailyLabel(key: string) {
  const parsed = new Date(`${key}T00:00:00+03:00`);
  if (Number.isNaN(parsed.getTime())) {
    return key;
  }
  return istanbulLongDateFormatter.format(parsed);
}

function formatIstanbulDateKey(value: Date) {
  const parts = istanbulDateKeyFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getIstanbulDayKeys(rangeDays: number) {
  const safeRangeDays = Math.min(Math.max(Math.trunc(rangeDays), 1), PERFORMANCE_RANGE_DAYS);
  const todayKey = formatIstanbulDateKey(new Date());
  const todayStart = new Date(`${todayKey}T00:00:00+03:00`).getTime();
  const start = todayStart - (safeRangeDays - 1) * DAY_IN_MS;

  return Array.from({ length: safeRangeDays }, (_, index) =>
    formatIstanbulDateKey(new Date(start + index * DAY_IN_MS)),
  );
}

function normalizeChannelLabel(label: string | null) {
  const normalized = label?.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "Bilinmiyor";
  }

  const lower = normalized.toLocaleLowerCase("tr-TR");

  if (lower === "main" || lower.includes("ana link") || lower.includes("doğrudan")) {
    return "Ana Link";
  }

  if (lower === "youtube") {
    return "YouTube";
  }

  if (lower === "whatsapp") {
    return "WhatsApp";
  }

  if (lower === "instagram") {
    return "Instagram";
  }

  if (lower === "qr") {
    return "QR";
  }

  if (lower === "email" || lower === "e-posta" || lower === "eposta") {
    return "E-posta";
  }

  if (lower === "x" || lower === "twitter" || lower === "x/twitter") {
    return "X/Twitter";
  }

  if (lower === "linkedin") {
    return "LinkedIn";
  }

  if (lower === "tiktok") {
    return "TikTok";
  }

  if (lower === "telegram") {
    return "Telegram";
  }

  if (lower === "sms") {
    return "SMS";
  }

  return normalized;
}

function normalizeDeviceLabel(label: string | null) {
  const key = label?.trim().toLowerCase();

  if (key === "mobile" || key === "desktop" || key === "tablet" || key === "bot") {
    return DEVICE_TYPE_LABELS[key];
  }

  return UNKNOWN_LOCATION_LABEL;
}

function normalizeLocationLabel(label: string | null) {
  const normalized = label?.trim();

  return normalized ? normalized : UNKNOWN_LOCATION_LABEL;
}

function getEventDayKey(row: PerformanceRawEvent) {
  return row.clicked_day ?? formatIstanbulDateKey(new Date(row.clicked_at));
}

function getUniqueClickKey(row: PerformanceRawEvent) {
  return [
    row.channel_link_id ?? "00000000-0000-0000-0000-000000000000",
    getEventDayKey(row),
    row.visitor_key ?? row.id,
  ].join(":");
}
type RawEvent = {
  id: string;
  link_request_id: string;
  channel_link_id: string | null;
  slug: string;
  clicked_at: string;
  referrer: string | null;
  user_agent: string | null;
  channel_key: string | null;
  channel_label: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  device_type: string | null;
  os_name: string | null;
  browser_name: string | null;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  location_label: string | null;
};

type SummaryPayload = {
  today_clicks: number;
  last7_days_clicks: number;
  daily: RawDaily[];
  channels: RawBucket[];
  sources: RawBucket[];
  campaigns: RawBucket[];
  devices: RawBucket[];
  operating_systems: RawBucket[];
  locations: RawBucket[];
  recent: RawEvent[];
};

const performanceClickEventColumns = [
  "id",
  "channel_link_id",
  "slug",
  "clicked_at",
  "clicked_day",
  "visitor_key",
  "channel_key",
  "channel_label",
  "utm_source",
  "device_type",
  "location_label",
].join(",");

function toEvent(row: RawEvent): LinkClickEvent {
  return {
    id: row.id,
    linkRequestId: row.link_request_id,
    channelLinkId: row.channel_link_id,
    slug: row.slug,
    clickedAt: row.clicked_at,
    referrer: row.referrer,
    userAgent: row.user_agent,
    channelKey: row.channel_key,
    channelLabel: row.channel_label,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    utmTerm: row.utm_term,
    deviceType: row.device_type,
    osName: row.os_name,
    browserName: row.browser_name,
    countryCode: row.country_code,
    countryName: row.country_name,
    region: row.region,
    city: row.city,
    locationLabel: row.location_label,
  };
}

function bucketsToBars(buckets: RawBucket[]): AnalyticsBar[] {
  const filtered = buckets.filter((b) => b.value > 0);
  const max = Math.max(...filtered.map((b) => b.value), 0);

  return filtered.map((bucket) => ({
    key: bucket.label,
    label: bucket.label,
    value: bucket.value,
    percentage: max > 0 ? Math.max(MIN_PERCENT, Math.round((bucket.value / max) * 100)) : 0,
  }));
}

function mergeSummaryBuckets(
  buckets: RawBucket[],
  mapLabel: (rawLabel: string) => string,
): LinkAnalyticsSummaryItem[] {
  const totals = new Map<string, number>();

  for (const bucket of buckets ?? []) {
    const value = Number(bucket.value ?? 0);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    const label = mapLabel((bucket.label ?? "").trim());
    totals.set(label, (totals.get(label) ?? 0) + value);
  }

  return Array.from(totals.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "tr"));
}

// Stored device_type is an English token (mobile/desktop/tablet/bot) or
// "unknown"/null for legacy rows — all mapped to Turkish display labels here.
function toDeviceSummary(buckets: RawBucket[]): LinkAnalyticsSummaryItem[] {
  return mergeSummaryBuckets(buckets, normalizeDeviceLabel);
}

function toOsSummary(buckets: RawBucket[]): LinkAnalyticsSummaryItem[] {
  return mergeSummaryBuckets(buckets, (raw) =>
    !raw || raw.toLowerCase() === "unknown" ? UNKNOWN_LOCATION_LABEL : raw,
  );
}

// location_label is already a display string ("Istanbul, TR" / "Türkiye" /
// "Bilinmiyor"); only empty values need the fallback.
function toLocationSummary(buckets: RawBucket[]): LinkAnalyticsSummaryItem[] {
  return mergeSummaryBuckets(buckets, normalizeLocationLabel);
}

function dailyToBars(daily: RawDaily[]): AnalyticsBar[] {
  const max = Math.max(...daily.map((d) => d.value), 0);

  return daily.map((entry) => ({
    key: entry.key,
    label: formatDailyLabel(entry.key),
    value: entry.value,
    percentage:
      max > 0 && entry.value > 0
        ? Math.max(MIN_PERCENT, Math.round((entry.value / max) * 100))
        : 0,
  }));
}

function emptyAnalytics(): LinkClickAnalytics {
  return {
    events: [],
    recentEvents: [],
    todayClicks: 0,
    last7DaysClicks: 0,
    dailyClicks: [],
    channelDistribution: [],
    sourceDistribution: [],
    campaignDistribution: [],
    deviceSummary: [],
    osSummary: [],
    locationSummary: [],
  };
}

function buildEmptyPerformanceData(
  dayKeys: string[],
  channels: Map<string, ChannelAccumulator>,
): LinkPerformanceData {
  const days = dayKeys.map((key) => ({
    key,
    label: formatDailyLabel(key),
    longLabel: formatLongDailyLabel(key),
    total: 0,
  }));

  return {
    rangeDays: dayKeys.length,
    days,
    channels: Array.from(channels.values())
      .sort((a, b) => a.order - b.order)
      .map((channel) => ({
        key: channel.key,
        label: channel.label,
        slug: channel.slug,
        total: 0,
        points: dayKeys.map((dayKey) => ({
          dayKey,
          value: 0,
          dailyTotal: 0,
        })),
      })),
    devices: [],
    locations: [],
    hasClicks: false,
  };
}

async function getPerformanceRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  linkRequestId: string,
  startIso: string,
) {
  const rows: PerformanceRawEvent[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("click_events")
      .select(performanceClickEventColumns)
      .eq("link_request_id", linkRequestId)
      .gte("clicked_at", startIso)
      .order("clicked_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PERFORMANCE_PAGE_SIZE - 1);

    if (error) {
      console.warn("[link-analytics] click_events performance query failed", error.message);
      return [];
    }

    const page = (data ?? []) as unknown as PerformanceRawEvent[];
    rows.push(...page);

    if (page.length < PERFORMANCE_PAGE_SIZE) {
      break;
    }

    from += PERFORMANCE_PAGE_SIZE;
  }

  return rows;
}

function getKnownChannelIdentity(channel: LinkPerformanceKnownChannel, order: number) {
  return {
    key: `channel:${channel.id}`,
    label: normalizeChannelLabel(channel.channelLabel || channel.channelKey),
    slug: channel.slug,
    order,
  };
}

function getEventChannelIdentity({
  row,
  mainSlug,
  knownChannelsById,
  order,
}: {
  row: PerformanceRawEvent;
  mainSlug?: string | null;
  knownChannelsById: Map<string, { key: string; label: string; slug: string | null; order: number }>;
  order: number;
}) {
  if (row.channel_link_id) {
    const knownChannel = knownChannelsById.get(row.channel_link_id);

    if (knownChannel) {
      return knownChannel;
    }
  }

  if (
    row.channel_key === "main" ||
    (!row.channel_link_id && mainSlug && row.slug === mainSlug)
  ) {
    return {
      key: "main",
      label: "Ana Link",
      slug: mainSlug ?? row.slug,
      order: 0,
    };
  }

  if (row.channel_link_id) {
    return {
      key: `channel:${row.channel_link_id}`,
      label: normalizeChannelLabel(row.channel_label ?? row.utm_source ?? row.channel_key),
      slug: row.slug || null,
      order,
    };
  }

  const fallbackKey = row.channel_key ?? row.utm_source ?? row.slug ?? "unknown";

  return {
    key: `source:${fallbackKey}`,
    label: normalizeChannelLabel(row.channel_label ?? row.utm_source ?? row.channel_key),
    slug: row.slug || null,
    order,
  };
}

function ensureChannel(
  channels: Map<string, ChannelAccumulator>,
  identity: { key: string; label: string; slug: string | null; order: number },
) {
  const existing = channels.get(identity.key);

  if (existing) {
    if (!existing.slug && identity.slug) {
      existing.slug = identity.slug;
    }

    return existing;
  }

  const channel: ChannelAccumulator = {
    key: identity.key,
    label: identity.label,
    slug: identity.slug,
    order: identity.order,
    total: 0,
    dayCounts: new Map(),
  };

  channels.set(identity.key, channel);

  return channel;
}

function getBreakdownKey(scope: string, label: string) {
  return `${scope}:${label.toLocaleLowerCase("tr-TR")}`;
}

function ensureBreakdown(
  breakdowns: Map<string, BreakdownAccumulator>,
  scope: string,
  label: string,
) {
  const key = getBreakdownKey(scope, label);
  const existing = breakdowns.get(key);

  if (existing) {
    return existing;
  }

  const breakdown: BreakdownAccumulator = {
    key,
    label,
    total: 0,
    dayCounts: new Map(),
  };

  breakdowns.set(key, breakdown);

  return breakdown;
}

function addBreakdownClick(
  breakdowns: Map<string, BreakdownAccumulator>,
  scope: string,
  label: string,
  dayKey: string,
) {
  const breakdown = ensureBreakdown(breakdowns, scope, label);

  breakdown.dayCounts.set(dayKey, (breakdown.dayCounts.get(dayKey) ?? 0) + 1);
  breakdown.total += 1;
}

function toBreakdownSeries(
  breakdowns: Map<string, BreakdownAccumulator>,
  dayKeys: string[],
): LinkPerformanceBreakdownSeries[] {
  return Array.from(breakdowns.values())
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "tr"))
    .map((breakdown) => ({
      key: breakdown.key,
      label: breakdown.label,
      total: breakdown.total,
      points: dayKeys.map((dayKey) => ({
        dayKey,
        value: breakdown.dayCounts.get(dayKey) ?? 0,
      })),
    }));
}

export async function getCurrentUserLinkClickAnalytics(
  linkRequestId: string,
  mainSlug?: string | null,
): Promise<LinkClickAnalytics> {
  if (!isSupabaseConfigured()) {
    return emptyAnalytics();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_link_click_summary", {
    p_link_request_id: linkRequestId,
    p_main_slug: mainSlug ?? null,
    p_top_limit: TOP_LIMIT,
    p_recent_limit: RECENT_LIMIT,
  });

  if (error || !data) {
    if (error) {
      console.warn("[link-analytics] get_link_click_summary failed", error.message);
    }
    return emptyAnalytics();
  }

  const payload = data as unknown as SummaryPayload;
  const recentEvents = (payload.recent ?? []).map(toEvent);

  return {
    events: recentEvents,
    recentEvents,
    todayClicks: Number(payload.today_clicks ?? 0),
    last7DaysClicks: Number(payload.last7_days_clicks ?? 0),
    dailyClicks: dailyToBars(payload.daily ?? []),
    channelDistribution: bucketsToBars(payload.channels ?? []),
    sourceDistribution: bucketsToBars(payload.sources ?? []),
    campaignDistribution: bucketsToBars(payload.campaigns ?? []),
    deviceSummary: toDeviceSummary(payload.devices ?? []),
    osSummary: toOsSummary(payload.operating_systems ?? []),
    locationSummary: toLocationSummary(payload.locations ?? []),
  };
}

export async function getCurrentUserLinkPerformanceData({
  linkRequestId,
  mainSlug,
  knownChannels = [],
  rangeDays = PERFORMANCE_RANGE_DAYS,
}: {
  linkRequestId: string;
  mainSlug?: string | null;
  knownChannels?: LinkPerformanceKnownChannel[];
  rangeDays?: number;
}): Promise<LinkPerformanceData> {
  const dayKeys = getIstanbulDayKeys(rangeDays);
  const dayKeySet = new Set(dayKeys);
  const dayTotals = new Map(dayKeys.map((key) => [key, 0]));
  const channels = new Map<string, ChannelAccumulator>();
  const devices = new Map<string, BreakdownAccumulator>();
  const locations = new Map<string, BreakdownAccumulator>();
  const knownChannelsById = new Map<
    string,
    { key: string; label: string; slug: string | null; order: number }
  >();
  let nextOrder = 1;

  ensureChannel(channels, {
    key: "main",
    label: "Ana Link",
    slug: mainSlug ?? null,
    order: 0,
  });

  for (const channel of knownChannels) {
    const identity = getKnownChannelIdentity(channel, nextOrder);
    nextOrder += 1;
    knownChannelsById.set(channel.id, identity);
    ensureChannel(channels, identity);
  }

  if (!isSupabaseConfigured()) {
    return buildEmptyPerformanceData(dayKeys, channels);
  }

  const supabase = await createClient();
  const startIso = new Date(`${dayKeys[0]}T00:00:00+03:00`).toISOString();
  const rows = await getPerformanceRows(supabase, linkRequestId, startIso);
  const uniqueRows = new Map<string, PerformanceRawEvent>();

  for (const row of rows) {
    const uniqueKey = getUniqueClickKey(row);

    if (!uniqueRows.has(uniqueKey)) {
      uniqueRows.set(uniqueKey, row);
    }
  }

  for (const row of uniqueRows.values()) {
    const dayKey = getEventDayKey(row);

    if (!dayKeySet.has(dayKey)) {
      continue;
    }

    const identity = getEventChannelIdentity({
      row,
      mainSlug,
      knownChannelsById,
      order: nextOrder,
    });

    if (!channels.has(identity.key)) {
      nextOrder += 1;
    }

    const channel = ensureChannel(channels, identity);
    const nextChannelTotal = (channel.dayCounts.get(dayKey) ?? 0) + 1;

    channel.dayCounts.set(dayKey, nextChannelTotal);
    channel.total += 1;
    dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + 1);
    addBreakdownClick(devices, "device", normalizeDeviceLabel(row.device_type), dayKey);
    addBreakdownClick(locations, "location", normalizeLocationLabel(row.location_label), dayKey);
  }

  const days = dayKeys.map((key) => ({
    key,
    label: formatDailyLabel(key),
    longLabel: formatLongDailyLabel(key),
    total: dayTotals.get(key) ?? 0,
  }));
  const channelSeries = Array.from(channels.values())
    .sort((a, b) => b.total - a.total || a.order - b.order)
    .map((channel) => ({
      key: channel.key,
      label: channel.label,
      slug: channel.slug,
      total: channel.total,
      points: dayKeys.map((dayKey) => ({
        dayKey,
        value: channel.dayCounts.get(dayKey) ?? 0,
        dailyTotal: dayTotals.get(dayKey) ?? 0,
      })),
    }));

  return {
    rangeDays: dayKeys.length,
    days,
    channels: channelSeries,
    devices: toBreakdownSeries(devices, dayKeys),
    locations: toBreakdownSeries(locations, dayKeys),
    hasClicks: uniqueRows.size > 0,
  };
}

export async function getCurrentUserLinkHourlyDetailData({
  linkRequestId,
  linkCreatedAt,
}: {
  linkRequestId: string;
  linkCreatedAt?: string | null;
}): Promise<LinkHourlyDetailData> {
  if (!isSupabaseConfigured()) {
    return {
      clicks: [],
      hasClicks: false,
      lastClickedAt: null,
    };
  }

  const parsedCreatedAt = linkCreatedAt ? new Date(linkCreatedAt) : null;
  const startIso =
    parsedCreatedAt && !Number.isNaN(parsedCreatedAt.getTime())
      ? parsedCreatedAt.toISOString()
      : new Date(Date.now() - (PERFORMANCE_RANGE_DAYS - 1) * DAY_IN_MS).toISOString();
  const supabase = await createClient();
  const rows = await getPerformanceRows(supabase, linkRequestId, startIso);
  const uniqueRows = new Map<string, PerformanceRawEvent>();

  for (const row of rows) {
    const uniqueKey = getUniqueClickKey(row);

    if (!uniqueRows.has(uniqueKey)) {
      uniqueRows.set(uniqueKey, row);
    }
  }

  const clicks = Array.from(uniqueRows.values())
    .map((row) => ({
      id: row.id,
      clickedAt: row.clicked_at,
    }))
    .sort((a, b) => new Date(a.clickedAt).getTime() - new Date(b.clickedAt).getTime());

  return {
    clicks,
    hasClicks: clicks.length > 0,
    lastClickedAt: clicks[clicks.length - 1]?.clickedAt ?? null,
  };
}

export async function getCurrentUserTotalClicksToday(): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_current_user_total_clicks_today");

  if (error) {
    console.warn("[link-analytics] get_current_user_total_clicks_today failed", error.message);
    return 0;
  }

  if (typeof data === "number") {
    return data;
  }

  if (typeof data === "string") {
    const parsed = Number.parseInt(data, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
