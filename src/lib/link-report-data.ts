import "server-only";

import { DEVICE_TYPE_LABELS, UNKNOWN_LOCATION_LABEL } from "@/lib/click-enrichment";
import { getCurrentUserChannelLinks } from "@/lib/channel-links";
import {
  getCurrentUserLinkClickAnalytics,
  getCurrentUserLinkPerformanceData,
  type LinkClickAnalytics,
  type LinkPerformanceBreakdownSeries,
  type LinkPerformanceChannelSeries,
  type LinkPerformanceData,
  type LinkPerformanceDay,
} from "@/lib/link-analytics";
import {
  buildLinkPerformanceSummary,
  type LinkPerformanceSummary,
} from "@/lib/link-performance-summary";
import type { LinkRequest } from "@/lib/link-requests";
import {
  LINK_REPORT_SECTIONS,
  type LinkReportRangeDays,
  type LinkReportSectionKey,
} from "@/lib/link-report-options";
import { getAppOrigin } from "@/lib/origin";
import { buildShortUrl, slugifyToAscii } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/server";

const REPORT_TIME_ZONE = "Europe/Istanbul";
const PERFORMANCE_CONTEXT_DAYS = 60;
const REPORT_EVENT_PAGE_SIZE = 1000;

export type ReportCellValue = string | number | boolean | null;

export type LinkReportColumnType =
  | "text"
  | "number"
  | "integer"
  | "percent"
  | "date"
  | "datetime"
  | "time"
  | "url";

export type LinkReportColumn = {
  key: string;
  header: string;
  type?: LinkReportColumnType;
  width?: number;
};

export type LinkReportTable = {
  section: LinkReportSectionKey;
  title: string;
  description: string;
  worksheetName: string;
  csvFileName: string;
  columns: LinkReportColumn[];
  rows: Record<string, ReportCellValue>[];
  emptyMessage: string;
};

export type LinkReportEvent = {
  clickedAt: string;
  clickedDayKey: string;
  dateLabel: string;
  dateTimeLabel: string;
  hour: number;
  hourLabel: string;
  channel: string;
  device: string;
  os: string;
  browser: string;
  country: string;
  city: string;
  location: string;
  referrer: string;
  slug: string;
  shortLinkVariant: string;
  isQr: boolean;
};

export type LinkReportData = {
  request: LinkRequest;
  appOrigin: string;
  shortUrl: string | null;
  linkName: string;
  generatedAt: Date;
  generatedAtLabel: string;
  rangeDays: LinkReportRangeDays;
  dateRangeLabel: string;
  fileSlug: string;
  analytics: LinkClickAnalytics;
  currentDayKeys: Set<string>;
  previousDayKeys: Set<string>;
  performance: LinkPerformanceData;
  visibleDays: LinkPerformanceDay[];
  previousDays: LinkPerformanceDay[];
  summary: LinkPerformanceSummary;
  currentEvents: LinkReportEvent[];
  comparisonEvents: LinkReportEvent[];
  insightText: string;
};

type ReportEventRow = {
  slug: string;
  clicked_at: string;
  clicked_day: string | null;
  referrer: string | null;
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

const reportEventColumns = [
  "slug",
  "clicked_at",
  "clicked_day",
  "referrer",
  "channel_key",
  "channel_label",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "device_type",
  "os_name",
  "browser_name",
  "country_code",
  "country_name",
  "region",
  "city",
  "location_label",
].join(",");

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const reportDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: REPORT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const reportDateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: REPORT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const reportHourFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: REPORT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function cleanText(value: string | null | undefined, fallback = "-") {
  const cleaned = value?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

  return cleaned || fallback;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDateKeyLabel(key: string) {
  const date = new Date(`${key}T00:00:00+03:00`);

  return Number.isNaN(date.getTime()) ? key : reportDateFormatter.format(date);
}

function formatDateTime(value: Date | string | null | undefined, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return Number.isNaN(date.getTime()) ? fallback : reportDateTimeFormatter.format(date);
}

function getIstanbulDateKey(value: Date) {
  const parts = dateKeyFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getIstanbulHour(value: Date) {
  const parts = reportHourFormatter.formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");

  return Number.isFinite(hour) ? hour % 24 : 0;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getHourRangeLabel(hour: number) {
  return `${pad(hour)}:00 - ${pad((hour + 1) % 24)}:00`;
}

function normalizeChannelLabel(label: string | null | undefined) {
  const normalized = cleanText(label, "");
  const lower = normalized.toLocaleLowerCase("tr-TR");

  if (!normalized) {
    return "Bilinmiyor";
  }

  if (lower === "main" || lower.includes("ana link") || lower.includes("doğrudan")) {
    return "Ana Link";
  }

  if (lower === "youtube") return "YouTube";
  if (lower === "whatsapp") return "WhatsApp";
  if (lower === "instagram") return "Instagram";
  if (lower === "qr") return "QR";
  if (lower === "email" || lower === "e-posta" || lower === "eposta") return "E-posta";
  if (lower === "x" || lower === "twitter" || lower === "x/twitter") return "X/Twitter";
  if (lower === "linkedin") return "LinkedIn";
  if (lower === "tiktok") return "TikTok";
  if (lower === "telegram") return "Telegram";
  if (lower === "sms") return "SMS";

  return normalized;
}

function getEventChannel(row: ReportEventRow) {
  if (row.channel_key === "main") {
    return "Ana Link";
  }

  return normalizeChannelLabel(row.channel_label ?? row.utm_source ?? row.channel_key);
}

function getDeviceLabel(value: string | null) {
  const key = value?.trim().toLowerCase();

  if (key === "mobile" || key === "desktop" || key === "tablet" || key === "bot") {
    return DEVICE_TYPE_LABELS[key];
  }

  return UNKNOWN_LOCATION_LABEL;
}

function getLocationLabel(row: ReportEventRow) {
  const location = cleanText(row.location_label, "");

  if (location) {
    return location;
  }

  const city = cleanText(row.city, "");
  const country = cleanText(row.country_name ?? row.country_code, "");

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country || UNKNOWN_LOCATION_LABEL;
}

function getReferrerDisplay(value: string | null) {
  const referrer = cleanText(value, "");

  if (!referrer) {
    return "-";
  }

  try {
    const url = new URL(referrer);
    const path = url.pathname && url.pathname !== "/" ? url.pathname : "";

    return `${url.hostname.replace(/^www\./, "")}${path}`.slice(0, 160);
  } catch {
    return referrer.replace(/[?#].*$/g, "").slice(0, 160);
  }
}

function getChangeRate(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous : null;
}

function getChangeDescription(current: number, previous: number) {
  if (current === 0 && previous === 0) {
    return "Veri yok";
  }

  if (previous === 0 && current > 0) {
    return "Yeni trafik";
  }

  const rate = getChangeRate(current, previous);

  if (rate === null) {
    return "-";
  }

  if (Math.abs(rate) < 0.01) {
    return "Stabil";
  }

  return rate > 0 ? "Artış" : "Düşüş";
}

function getSeriesCount(
  series: LinkPerformanceChannelSeries | LinkPerformanceBreakdownSeries,
  dayKeys: Set<string>,
) {
  return series.points.reduce(
    (sum, point) => sum + (dayKeys.has(point.dayKey) ? Math.max(point.value, 0) : 0),
    0,
  );
}

function getPointValue(series: LinkPerformanceChannelSeries, dayKey: string) {
  return series.points.find((point) => point.dayKey === dayKey)?.value ?? 0;
}

function getTopFromMap(map: Map<string, number>) {
  let topLabel = "-";
  let topValue = 0;

  for (const [label, value] of map.entries()) {
    if (value > topValue || (value === topValue && label.localeCompare(topLabel, "tr") < 0)) {
      topLabel = label;
      topValue = value;
    }
  }

  return topValue > 0 ? topLabel : "-";
}

function incrementMap(map: Map<string, number>, label: string, value = 1) {
  map.set(label, (map.get(label) ?? 0) + value);
}

function getSelectedAndPreviousDays(performance: LinkPerformanceData, rangeDays: LinkReportRangeDays) {
  const visibleDays = performance.days.slice(-rangeDays);
  const firstVisibleIndex = performance.days.findIndex((day) => day.key === visibleDays[0]?.key);
  const previousDays =
    firstVisibleIndex > 0
      ? performance.days.slice(Math.max(0, firstVisibleIndex - rangeDays), firstVisibleIndex)
      : [];

  return { visibleDays, previousDays };
}

function getReportInsightText(summary: LinkPerformanceSummary) {
  if (summary.currentTotal === 0) {
    return "Bu tarih aralığında veri yok. Link paylaşıldıkça kanal, cihaz ve lokasyon içgörüleri burada oluşacaktır.";
  }

  const channel = summary.topChannel?.label ?? "belirgin bir kanal";
  const day = summary.peakDay?.longLabel ?? "ölçülen dönem";
  const device = summary.topDevice?.label ?? "ölçülen cihazlar";
  const location = summary.topLocation?.label ?? "ölçülen lokasyonlar";

  return `Bu tarih aralığında trafik ağırlıklı olarak ${channel} kanalından gelmiştir. En yoğun gün ${day} olarak ölçülmüştür. Kullanıcıların çoğunluğu ${device} cihazlardan ve ${location} lokasyonundan erişmiştir.`;
}

async function getReportEventRows(linkRequestId: string, startIso: string) {
  const supabase = await createClient();
  const rows: ReportEventRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("click_events")
      .select(reportEventColumns)
      .eq("link_request_id", linkRequestId)
      .gte("clicked_at", startIso)
      .order("clicked_at", { ascending: true })
      .range(from, from + REPORT_EVENT_PAGE_SIZE - 1);

    if (error) {
      console.warn("[link-report] click_events export query failed", error.message);
      return [];
    }

    const page = (data ?? []) as unknown as ReportEventRow[];
    rows.push(...page);

    if (page.length < REPORT_EVENT_PAGE_SIZE) {
      return rows;
    }

    from += REPORT_EVENT_PAGE_SIZE;
  }
}

function toReportEvent(row: ReportEventRow): LinkReportEvent {
  const clickedAt = new Date(row.clicked_at);
  const clickedDayKey = row.clicked_day ?? getIstanbulDateKey(clickedAt);
  const hour = getIstanbulHour(clickedAt);
  const channel = getEventChannel(row);
  const slug = cleanText(row.slug, "-");

  return {
    clickedAt: row.clicked_at,
    clickedDayKey,
    dateLabel: formatDateKeyLabel(clickedDayKey),
    dateTimeLabel: formatDateTime(row.clicked_at),
    hour,
    hourLabel: getHourRangeLabel(hour),
    channel,
    device: getDeviceLabel(row.device_type),
    os: cleanText(row.os_name, UNKNOWN_LOCATION_LABEL),
    browser: cleanText(row.browser_name, UNKNOWN_LOCATION_LABEL),
    country: cleanText(row.country_name ?? row.country_code, UNKNOWN_LOCATION_LABEL),
    city: cleanText(row.city, UNKNOWN_LOCATION_LABEL),
    location: getLocationLabel(row),
    referrer: getReferrerDisplay(row.referrer),
    slug,
    shortLinkVariant: slug === "-" ? "-" : `/${slug}`,
    isQr: row.channel_key === "qr" || channel.toLocaleLowerCase("tr-TR") === "qr" || slug.endsWith("-qr"),
  };
}

function getTableDefinition(section: LinkReportSectionKey) {
  return LINK_REPORT_SECTIONS.find((item) => item.key === section);
}

function ensureRows(
  rows: Record<string, ReportCellValue>[],
  columns: LinkReportColumn[],
  emptyMessage: string,
) {
  if (rows.length > 0) {
    return rows;
  }

  const emptyRow: Record<string, ReportCellValue> = {};
  columns.forEach((column, index) => {
    emptyRow[column.key] = index === 0 ? emptyMessage : "-";
  });

  return [emptyRow];
}

function createTable({
  section,
  title,
  description,
  columns,
  rows,
  emptyMessage = "Bu tarih aralığında veri yok",
}: {
  section: LinkReportSectionKey;
  title: string;
  description: string;
  columns: LinkReportColumn[];
  rows: Record<string, ReportCellValue>[];
  emptyMessage?: string;
}): LinkReportTable {
  const definition = getTableDefinition(section);

  return {
    section,
    title,
    description,
    worksheetName: definition?.label ?? title,
    csvFileName: definition?.csvFileName ?? `${section}.csv`,
    columns,
    rows: ensureRows(rows, columns, emptyMessage),
    emptyMessage,
  };
}

export async function buildLinkReportData({
  request,
  rangeDays,
}: {
  request: LinkRequest;
  rangeDays: LinkReportRangeDays;
}): Promise<LinkReportData> {
  const [appOrigin, channelLinks, analytics] = await Promise.all([
    getAppOrigin(),
    getCurrentUserChannelLinks(request.id),
    getCurrentUserLinkClickAnalytics(request.id, request.requestedSlug),
  ]);
  const [performance] = await Promise.all([
    getCurrentUserLinkPerformanceData({
      linkRequestId: request.id,
      mainSlug: request.requestedSlug,
      knownChannels: channelLinks,
      rangeDays: PERFORMANCE_CONTEXT_DAYS,
    }),
  ]);
  const { visibleDays, previousDays } = getSelectedAndPreviousDays(performance, rangeDays);
  const summary = buildLinkPerformanceSummary(performance, rangeDays, visibleDays);
  const currentDayKeys = new Set(visibleDays.map((day) => day.key));
  const previousDayKeys = new Set(previousDays.map((day) => day.key));
  const comparisonStartKey = previousDays[0]?.key ?? visibleDays[0]?.key ?? getIstanbulDateKey(new Date());
  const comparisonStartIso = new Date(`${comparisonStartKey}T00:00:00+03:00`).toISOString();
  const comparisonEvents = (await getReportEventRows(request.id, comparisonStartIso)).map(toReportEvent);
  const currentEvents = comparisonEvents.filter((event) => currentDayKeys.has(event.clickedDayKey));
  const shortUrl = request.requestedSlug ? buildShortUrl(appOrigin, request.requestedSlug) : null;
  const linkName = cleanText(request.campaignName ?? request.requestedSlug, "Kısa link");
  const fileSlug = (slugifyToAscii(request.requestedSlug ?? request.campaignName) ?? "link").slice(0, 80);
  const generatedAt = new Date();

  return {
    request: {
      ...request,
      analytics: {
        ...request.analytics,
        totalClicks: request.analytics.totalClicks,
        lastClickedAt: request.analytics.lastClickedAt,
      },
    },
    appOrigin,
    shortUrl,
    linkName,
    generatedAt,
    generatedAtLabel: formatDateTime(generatedAt),
    rangeDays,
    dateRangeLabel: summary.currentPeriod.dateRangeLabel,
    fileSlug,
    analytics,
    currentDayKeys,
    previousDayKeys,
    performance,
    visibleDays,
    previousDays,
    summary,
    currentEvents,
    comparisonEvents,
    insightText: getReportInsightText(summary),
  };
}

function buildSummaryTable(report: LinkReportData) {
  const { request, summary } = report;
  const columns: LinkReportColumn[] = [
    { key: "metric", header: "Metrik", width: 28 },
    { key: "value", header: "Değer", width: 42 },
    { key: "note", header: "Açıklama", width: 56 },
  ];
  const rows = [
    { metric: "Kampanya / Link Adı", value: report.linkName, note: "Raporlanan link" },
    { metric: "Kısa Link", value: report.shortUrl ?? "-", note: "Paylaşılan kısa adres" },
    { metric: "Hedef URL", value: request.targetUrl, note: "Onaylanan hedef adres" },
    { metric: "Tarih Aralığı", value: report.dateRangeLabel, note: `${report.rangeDays} günlük dönem` },
    { metric: "Rapor Tarihi", value: report.generatedAtLabel, note: REPORT_TIME_ZONE },
    { metric: "Toplam Tıklama", value: request.analytics.totalClicks, note: "Yayına alındığından beri" },
    { metric: "Bugünkü Tıklama", value: report.analytics.todayClicks, note: "Europe/Istanbul gün başlangıcı" },
    { metric: "Son 7 Gün Tıklama", value: report.analytics.last7DaysClicks, note: "Bugün dahil son 7 gün" },
    { metric: "Seçili Tarih Aralığı Toplamı", value: summary.currentTotal, note: summary.currentPeriod.dateRangeLabel },
    { metric: "Önceki Dönem Toplamı", value: summary.previousTotal, note: summary.previousPeriod.dateRangeLabel },
    { metric: "Değişim Oranı", value: summary.changePercent === null ? "-" : summary.changePercent / 100, note: summary.comparisonLabel },
    {
      metric: "En Yoğun Gün",
      value: summary.peakDay ? `${summary.peakDay.longLabel} (${formatNumber(summary.peakDay.count)})` : "Veri yok",
      note: "Seçili aralıkta",
    },
    {
      metric: "En Güçlü Kanal",
      value: summary.topChannel ? `${summary.topChannel.label} (${formatNumber(summary.topChannel.count)})` : "Veri yok",
      note: "Seçili aralıkta",
    },
    {
      metric: "En Güçlü Cihaz",
      value: summary.topDevice ? `${summary.topDevice.label} (${formatNumber(summary.topDevice.count)})` : "Veri yok",
      note: "Seçili aralıkta",
    },
    {
      metric: "En Güçlü Lokasyon",
      value: summary.topLocation ? `${summary.topLocation.label} (${formatNumber(summary.topLocation.count)})` : "Veri yok",
      note: "Seçili aralıkta",
    },
    { metric: "Otomatik İçgörü", value: report.insightText, note: "TrulyGo rapor özeti" },
  ];

  return createTable({
    section: "summary",
    title: "Özet",
    description: "Link performans raporunun ana metrikleri ve içgörüleri.",
    columns,
    rows,
  });
}

function buildDailyTable(report: LinkReportData) {
  const activeChannels = report.performance.channels.filter(
    (series) => getSeriesCount(series, report.currentDayKeys) > 0 || series.key === "main",
  );
  const channelColumns: LinkReportColumn[] = activeChannels.map((series, index) => ({
    key: `channel_${index}`,
    header: series.label,
    type: "integer",
    width: Math.max(14, Math.min(24, series.label.length + 5)),
  }));
  const columns: LinkReportColumn[] = [
    { key: "date", header: "Tarih", type: "date", width: 14 },
    { key: "total", header: "Toplam Tıklama", type: "integer", width: 18 },
    ...channelColumns,
    { key: "change", header: "Önceki Güne Göre Değişim", type: "percent", width: 24 },
    { key: "note", header: "Not / Özet", width: 44 },
  ];
  const rows = report.visibleDays.map((day, dayIndex) => {
    const row: Record<string, ReportCellValue> = {
      date: formatDateKeyLabel(day.key),
      total: day.total,
      change: null,
      note: day.total > 0 ? "Trafik oluştu" : "Veri yok",
    };
    const previousDay = report.visibleDays[dayIndex - 1] ?? null;

    if (previousDay) {
      row.change = getChangeRate(day.total, previousDay.total);
    }

    let topChannel = "-";
    let topChannelValue = 0;

    activeChannels.forEach((series, index) => {
      const value = getPointValue(series, day.key);
      row[`channel_${index}`] = value;

      if (value > topChannelValue) {
        topChannel = series.label;
        topChannelValue = value;
      }
    });

    if (topChannelValue > 0) {
      row.note = `${topChannel} öne çıktı`;
    }

    return row;
  });

  return createTable({
    section: "daily",
    title: "Günlük Veriler",
    description: "Seçili tarih aralığındaki günlük tıklama ve kanal kırılımları.",
    columns,
    rows,
  });
}

function buildHourlyTable(report: LinkReportData) {
  type HourAggregate = {
    clicks: number;
    channels: Map<string, number>;
    devices: Map<string, number>;
    locations: Map<string, number>;
  };

  const aggregates = new Map<string, HourAggregate>();

  for (const event of report.currentEvents) {
    const key = `${event.clickedDayKey}:${event.hour}`;
    const aggregate = aggregates.get(key) ?? {
      clicks: 0,
      channels: new Map<string, number>(),
      devices: new Map<string, number>(),
      locations: new Map<string, number>(),
    };

    aggregate.clicks += 1;
    incrementMap(aggregate.channels, event.channel);
    incrementMap(aggregate.devices, event.device);
    incrementMap(aggregate.locations, event.location);
    aggregates.set(key, aggregate);
  }

  const columns: LinkReportColumn[] = [
    { key: "date", header: "Tarih", type: "date", width: 14 },
    { key: "hour", header: "Saat", type: "time", width: 18 },
    { key: "clicks", header: "Tıklama", type: "integer", width: 12 },
    { key: "channel", header: "En Yoğun Kanal", width: 24 },
    { key: "device", header: "En Güçlü Cihaz", width: 20 },
    { key: "location", header: "En Güçlü Lokasyon", width: 28 },
  ];
  const rows: Record<string, ReportCellValue>[] = [];

  for (const day of report.visibleDays) {
    for (let hour = 0; hour < 24; hour += 1) {
      const aggregate = aggregates.get(`${day.key}:${hour}`);

      rows.push({
        date: formatDateKeyLabel(day.key),
        hour: getHourRangeLabel(hour),
        clicks: aggregate?.clicks ?? 0,
        channel: aggregate ? getTopFromMap(aggregate.channels) : "-",
        device: aggregate ? getTopFromMap(aggregate.devices) : "-",
        location: aggregate ? getTopFromMap(aggregate.locations) : "-",
      });
    }
  }

  return createTable({
    section: "hourly",
    title: "Saatlik Veriler",
    description: "Seçili aralıkta saat bazlı tıklama yoğunluğu ve baskın kırılımlar.",
    columns,
    rows,
  });
}

function buildChannelsTable(report: LinkReportData) {
  const currentTotal = Math.max(report.summary.currentTotal, 0);
  const columns: LinkReportColumn[] = [
    { key: "channel", header: "Kanal", width: 28 },
    { key: "clicks", header: "Tıklama", type: "integer", width: 14 },
    { key: "ratio", header: "Oran", type: "percent", width: 12 },
    { key: "previous", header: "Önceki Dönem Tıklama", type: "integer", width: 22 },
    { key: "change", header: "Değişim", type: "percent", width: 14 },
    { key: "description", header: "Açıklama", width: 34 },
  ];
  const rows = report.performance.channels
    .map((series) => {
      const current = getSeriesCount(series, report.currentDayKeys);
      const previous = getSeriesCount(series, report.previousDayKeys);

      return {
        channel: series.label,
        clicks: current,
        ratio: currentTotal > 0 ? current / currentTotal : 0,
        previous,
        change: getChangeRate(current, previous),
        description: getChangeDescription(current, previous),
      };
    })
    .filter((row) => row.clicks > 0 || row.previous > 0);

  return createTable({
    section: "channels",
    title: "Kanallar",
    description: "Kanal bazlı tıklama dağılımı ve önceki dönem karşılaştırması.",
    columns,
    rows,
  });
}

function buildDevicesTable(report: LinkReportData) {
  type DeviceAggregate = {
    device: string;
    os: string;
    browser: string;
    current: number;
    previous: number;
  };

  const aggregates = new Map<string, DeviceAggregate>();

  for (const event of report.comparisonEvents) {
    const key = `${event.device}|${event.os}|${event.browser}`;
    const aggregate = aggregates.get(key) ?? {
      device: event.device,
      os: event.os,
      browser: event.browser,
      current: 0,
      previous: 0,
    };

    if (report.currentDayKeys.has(event.clickedDayKey)) {
      aggregate.current += 1;
    } else if (report.previousDayKeys.has(event.clickedDayKey)) {
      aggregate.previous += 1;
    }

    aggregates.set(key, aggregate);
  }

  const currentTotal = Array.from(aggregates.values()).reduce((sum, item) => sum + item.current, 0);
  const columns: LinkReportColumn[] = [
    { key: "device", header: "Cihaz", width: 18 },
    { key: "os", header: "İşletim Sistemi", width: 20 },
    { key: "browser", header: "Tarayıcı", width: 20 },
    { key: "clicks", header: "Tıklama", type: "integer", width: 14 },
    { key: "ratio", header: "Oran", type: "percent", width: 12 },
    { key: "previous", header: "Önceki Dönem", type: "integer", width: 18 },
    { key: "change", header: "Değişim", type: "percent", width: 14 },
  ];
  const rows = Array.from(aggregates.values())
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => b.current - a.current || a.device.localeCompare(b.device, "tr"))
    .map((item) => ({
      device: item.device,
      os: item.os,
      browser: item.browser,
      clicks: item.current,
      ratio: currentTotal > 0 ? item.current / currentTotal : 0,
      previous: item.previous,
      change: getChangeRate(item.current, item.previous),
    }));

  return createTable({
    section: "devices",
    title: "Cihazlar",
    description: "Cihaz, işletim sistemi ve tarayıcı dağılımı.",
    columns,
    rows,
  });
}

function buildLocationsTable(report: LinkReportData) {
  type LocationAggregate = {
    country: string;
    city: string;
    current: number;
    previous: number;
  };

  const aggregates = new Map<string, LocationAggregate>();

  for (const event of report.comparisonEvents) {
    const key = `${event.country}|${event.city}`;
    const aggregate = aggregates.get(key) ?? {
      country: event.country,
      city: event.city,
      current: 0,
      previous: 0,
    };

    if (report.currentDayKeys.has(event.clickedDayKey)) {
      aggregate.current += 1;
    } else if (report.previousDayKeys.has(event.clickedDayKey)) {
      aggregate.previous += 1;
    }

    aggregates.set(key, aggregate);
  }

  const currentTotal = Array.from(aggregates.values()).reduce((sum, item) => sum + item.current, 0);
  const columns: LinkReportColumn[] = [
    { key: "country", header: "Ülke", width: 22 },
    { key: "city", header: "Şehir", width: 22 },
    { key: "clicks", header: "Tıklama", type: "integer", width: 14 },
    { key: "ratio", header: "Oran", type: "percent", width: 12 },
    { key: "previous", header: "Önceki Dönem", type: "integer", width: 18 },
    { key: "change", header: "Değişim", type: "percent", width: 14 },
  ];
  const rows = Array.from(aggregates.values())
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => b.current - a.current || a.country.localeCompare(b.country, "tr"))
    .map((item) => ({
      country: item.country,
      city: item.city,
      clicks: item.current,
      ratio: currentTotal > 0 ? item.current / currentTotal : 0,
      previous: item.previous,
      change: getChangeRate(item.current, item.previous),
    }));

  return createTable({
    section: "locations",
    title: "Lokasyon",
    description: "Ülke ve şehir bazlı yaklaşık lokasyon dağılımı.",
    columns,
    rows,
  });
}

function buildRawTable(report: LinkReportData) {
  const columns: LinkReportColumn[] = [
    { key: "dateTime", header: "Tarih/Saat", type: "datetime", width: 20 },
    { key: "channel", header: "Kanal", width: 22 },
    { key: "device", header: "Cihaz", width: 16 },
    { key: "os", header: "İşletim Sistemi", width: 20 },
    { key: "browser", header: "Tarayıcı", width: 20 },
    { key: "country", header: "Ülke", width: 22 },
    { key: "city", header: "Şehir", width: 22 },
    { key: "referrer", header: "Referrer", width: 34 },
    { key: "variant", header: "Kısa Link Varyantı", width: 24 },
    { key: "isQr", header: "QR mı?", width: 10 },
  ];
  const rows = report.currentEvents.map((event) => ({
    dateTime: event.dateTimeLabel,
    channel: event.channel,
    device: event.device,
    os: event.os,
    browser: event.browser,
    country: event.country,
    city: event.city,
    referrer: event.referrer,
    variant: event.shortLinkVariant,
    isQr: event.isQr ? "Evet" : "Hayır",
  }));

  return createTable({
    section: "raw",
    title: "Ham Veri",
    description: "IP, kullanıcı e-postası, auth ID, internal ID ve raw user-agent içermeyen sanitize edilmiş olay çıktısı.",
    columns,
    rows,
  });
}

const tableBuilders: Record<LinkReportSectionKey, (report: LinkReportData) => LinkReportTable> = {
  summary: buildSummaryTable,
  daily: buildDailyTable,
  hourly: buildHourlyTable,
  channels: buildChannelsTable,
  devices: buildDevicesTable,
  locations: buildLocationsTable,
  raw: buildRawTable,
};

type BuildLinkReportTablesOptions = {
  onSectionStart?: (section: LinkReportSectionKey) => void;
  onSectionSuccess?: (section: LinkReportSectionKey, table: LinkReportTable) => void;
  onSectionError?: (section: LinkReportSectionKey, error: unknown) => void;
};

export function buildLinkReportTables(
  report: LinkReportData,
  sections: LinkReportSectionKey[],
  options: BuildLinkReportTablesOptions = {},
) {
  const requested = new Set<LinkReportSectionKey>(sections.length > 0 ? sections : ["summary"]);
  const tables: LinkReportTable[] = [];

  for (const section of LINK_REPORT_SECTIONS) {
    if (!requested.has(section.key)) {
      continue;
    }

    options.onSectionStart?.(section.key);

    try {
      const table = tableBuilders[section.key](report);
      options.onSectionSuccess?.(section.key, table);
      tables.push(table);
    } catch (error) {
      options.onSectionError?.(section.key, error);
      throw error;
    }
  }

  return tables;
}

export function buildLinkReportFilename(
  report: Pick<LinkReportData, "fileSlug" | "rangeDays">,
  extension: "pdf" | "xlsx" | "csv" | "zip",
  suffix?: string,
) {
  const suffixPart = suffix ? `-${suffix}` : "";

  return `trulygo-link-report-${report.fileSlug}-${report.rangeDays}${suffixPart}.${extension}`;
}
