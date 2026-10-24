"use client";

import { useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { LinkReportExportControls } from "@/components/link-report-export-controls";
import { ViewportAwareTooltip } from "@/components/viewport-aware-tooltip";
import {
  buildLinkHourlyDistribution,
  clampDateKey,
  getLinkHourlyDateLimits,
  type LinkHourlyBucket,
  type LinkHourlyDetailData,
  type LinkHourlyDistribution,
} from "@/lib/link-hourly-distribution";
import {
  buildLinkPerformanceInsights,
  type LinkPerformanceInsightMap,
  type LinkPerformanceMetricInsight,
} from "@/lib/link-performance-insights";
import {
  buildLinkPerformanceSummary,
  type LinkPerformanceSummary,
  type LinkPerformanceSummaryTopItem,
  type LinkPerformanceTrendTone,
} from "@/lib/link-performance-summary";
import type {
  LinkAnalyticsSummaryItem,
  LinkPerformanceChannelPoint,
  LinkPerformanceData,
  LinkPerformanceDay,
} from "@/lib/link-analytics";

const RANGE_OPTIONS = [7, 14, 30] as const;
const CHART_MODES = [
  { key: "daily", label: "Günlük Trend" },
  { key: "hourly", label: "Saatlik Detay" },
] as const;
const MAX_CHART_SERIES = 6;
const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const CHART_PADDING = {
  top: 28,
  right: 24,
  bottom: 54,
  left: 58,
};

const AUTO_COLORS = [
  "#a78bfa",
  "#fb7185",
  "#38bdf8",
  "#facc15",
  "#34d399",
  "#c084fc",
  "#f97316",
  "#22d3ee",
];

type PerformanceKpis = {
  totalClicks: number;
  todayClicks: number;
  last7DaysClicks: number;
  lastClickedAt: string;
};

type PerformanceDistribution = {
  device: LinkAnalyticsSummaryItem[];
  os: LinkAnalyticsSummaryItem[];
  location: LinkAnalyticsSummaryItem[];
};

type ChartMode = (typeof CHART_MODES)[number]["key"];

const DISTRIBUTION_CARD_LIMIT = 5;

type RangeSeries = {
  key: string;
  label: string;
  slug: string | null;
  total: number;
  points: LinkPerformanceChannelPoint[];
};

type ColoredSeries = RangeSeries & {
  color: string;
};

type ChartPoint = {
  day: LinkPerformanceDay;
  value: number;
  dailyTotal: number;
  x: number;
  y: number;
};

type ChartSeries = ColoredSeries & {
  chartPoints: ChartPoint[];
};

type TooltipState = {
  x: number;
  y: number;
  date: string;
  channel: string;
  clicks: number;
  slug: string | null;
  dailyTotal: number;
  color: string;
};

type HourlyTooltipState = {
  x: number;
  y: number;
  rangeLabel: string;
  clicks: number;
};

type MetricInsightTooltipState = {
  x: number;
  y: number;
};

type SummaryMetricItem = {
  label: string;
  value: string;
  detail?: string;
  insight: LinkPerformanceMetricInsight;
  tone?: LinkPerformanceTrendTone;
};

const HOURLY_TIMEZONE_HELPER =
  "Saatlik dağılım, seçili gündeki tıklamaların cihazınızın yerel saatine göre gruplanmasıyla hesaplanır.";

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function getTrendToneClass(tone: LinkPerformanceTrendTone) {
  if (tone === "positive") {
    return "border-[#80c99a]/45 bg-[#80c99a]/12 text-[#ddf8e8]";
  }

  if (tone === "negative") {
    return "border-[#e47d6b]/45 bg-[#e47d6b]/12 text-[#ffd4cc]";
  }

  if (tone === "neutral") {
    return "border-[#e6c46b]/40 bg-[#e6c46b]/10 text-[#ffe6a3]";
  }

  return "border-white/[0.1] bg-white/[0.045] text-white/56";
}

function MetricInfoButton({
  label,
  insight,
}: {
  label: string;
  insight: LinkPerformanceMetricInsight;
}) {
  const [anchor, setAnchor] = useState<MetricInsightTooltipState | null>(null);

  function showFromPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    setAnchor({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function showFromElement(element: HTMLButtonElement) {
    const rect = element.getBoundingClientRect();

    setAnchor({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={`${label} metriği hakkında bilgi`}
        className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.035] font-mono text-[0.6rem] font-black leading-none text-white/46 transition hover:border-white/[0.22] hover:text-white focus:border-[#80c99a]/60 focus:text-white focus:outline-none"
        onPointerEnter={showFromPointer}
        onPointerMove={showFromPointer}
        onPointerLeave={() => setAnchor(null)}
        onFocus={(event) => showFromElement(event.currentTarget)}
        onBlur={() => setAnchor(null)}
        onClick={(event) => showFromElement(event.currentTarget)}
      >
        i
      </button>

      {anchor ? (
        <ViewportAwareTooltip
          anchor={anchor}
          className="pointer-events-none max-w-[20rem] rounded-lg border border-white/[0.12] bg-[#04101f]/95 p-3 text-xs font-semibold leading-5 text-white/76 shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur"
          estimatedHeight={132}
          estimatedWidth={300}
          maxWidth={320}
        >
          <p className="font-bold text-white">{label}</p>
          <p className="mt-2">{insight.description}</p>
          <p className="mt-2 text-white/62">{insight.insight}</p>
        </ViewportAwareTooltip>
      ) : null}
    </>
  );
}

function formatTopSummaryItem(item: LinkPerformanceSummaryTopItem | null) {
  if (!item) {
    return "Veri yok";
  }

  return `${item.label} - ${formatNumber(item.count)} tıklama`;
}

function PerformanceSummaryCard({
  summary,
  insights,
}: {
  summary: LinkPerformanceSummary;
  insights: LinkPerformanceInsightMap;
}) {
  const summaryItems: SummaryMetricItem[] = [
    {
      label: `Son ${summary.rangeDays} gün`,
      detail: summary.currentPeriod.dateRangeLabel,
      value: `${formatNumber(summary.currentTotal)} tıklama`,
      insight: insights.currentPeriod,
    },
    {
      label: `Önceki ${summary.rangeDays} gün`,
      detail: summary.previousPeriod.dateRangeLabel,
      value: `${formatNumber(summary.previousTotal)} tıklama`,
      insight: insights.previousPeriod,
    },
    {
      label: "Önceki döneme göre",
      value: summary.comparisonLabel,
      insight: insights.periodComparison,
      tone: summary.trendTone,
    },
    {
      label: "En yoğun gün",
      value: summary.peakDay
        ? `${summary.peakDay.longLabel} - ${formatNumber(summary.peakDay.count)} tıklama`
        : "Yeterli veri yok",
      insight: insights.peakDay,
    },
    {
      label: "En güçlü kanal",
      value: formatTopSummaryItem(summary.topChannel),
      insight: insights.strongestChannel,
    },
    {
      label: "En güçlü cihaz",
      value: formatTopSummaryItem(summary.topDevice),
      insight: insights.strongestDevice,
    },
    {
      label: "En güçlü lokasyon",
      value: formatTopSummaryItem(summary.topLocation),
      insight: insights.strongestLocation,
    },
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/50">
          Performans Özeti
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {summaryItems.map((item) => (
          <article
            key={item.label}
            className="flex min-h-[6.25rem] min-w-0 flex-col rounded-lg border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.022))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="min-w-0 text-[0.68rem] font-black tracking-[0.04em] text-white/52">
                {item.label}
              </p>
              <MetricInfoButton label={item.label} insight={item.insight} />
            </div>

            {item.detail ? (
              <p className="mt-1 break-words font-mono text-[0.7rem] font-semibold leading-4 text-white/40">
                {item.detail}
              </p>
            ) : null}

            {item.tone ? (
              <span
                className={`mt-2 inline-flex max-w-full rounded-md border px-2 py-1 font-mono text-xs font-black leading-5 ${getTrendToneClass(
                  item.tone,
                )}`}
              >
                <span className="break-words">{item.value}</span>
              </span>
            ) : (
              <p className="mt-auto break-words pt-2 text-sm font-bold leading-5 text-white/84">
                {item.value}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function HourlySummaryCards({
  summary,
  insights,
}: {
  summary: LinkHourlyDistribution;
  insights: LinkPerformanceInsightMap;
}) {
  const summaryItems = [
    {
      label: "Seçili gün",
      value: summary.selectedDateLabel,
      detail: `${formatNumber(summary.selectedDateTotalClicks)} tıklama`,
      insight: insights.selectedDay,
    },
    {
      label: "En yoğun saat",
      value: summary.peakHour?.rangeLabel ?? "Veri yok",
      detail: summary.peakHour ? `${formatNumber(summary.peakHour.clicks)} tıklama` : undefined,
      insight: insights.peakHour,
    },
    {
      label: "İlk tıklama",
      value: summary.firstClickTime ?? "Veri yok",
      insight: insights.firstHourlyClick,
    },
    {
      label: "Son tıklama",
      value: summary.lastClickTime ?? "Veri yok",
      insight: insights.lastHourlyClick,
    },
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/50">
          Saatlik Özet
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <article
            key={item.label}
            className="flex min-h-[6.25rem] min-w-0 flex-col rounded-lg border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.022))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="min-w-0 text-[0.68rem] font-black tracking-[0.04em] text-white/52">
                {item.label}
              </p>
              <MetricInfoButton label={item.label} insight={item.insight} />
            </div>
            <p className="mt-auto break-words pt-2 text-sm font-bold leading-5 text-white/84">
              {item.value}
            </p>
            {item.detail ? (
              <p className="mt-1 font-mono text-[0.72rem] font-semibold leading-4 text-white/40">
                {item.detail}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function getHourlyBarGeometry({
  bucket,
  index,
  yMax,
}: {
  bucket: LinkHourlyBucket;
  index: number;
  yMax: number;
}) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const slotWidth = plotWidth / 24;
  const barWidth = Math.max(10, Math.min(24, slotWidth * 0.58));
  const height = (Math.max(bucket.clicks, 0) / Math.max(yMax, 1)) * plotHeight;
  const x = CHART_PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
  const y = CHART_PADDING.top + plotHeight - height;

  return {
    x,
    y,
    height,
    width: barWidth,
    hitX: CHART_PADDING.left + index * slotWidth,
    hitWidth: slotWidth,
  };
}

function HourlyDetailChart({ summary }: { summary: LinkHourlyDistribution }) {
  const [tooltip, setTooltip] = useState<HourlyTooltipState | null>(null);
  const maxValue = Math.max(0, ...summary.hourlyBuckets.map((bucket) => bucket.clicks));
  const yTicks = getYTicks(maxValue);
  const yMax = yTicks[yTicks.length - 1] ?? 1;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  function showTooltip(event: ReactPointerEvent<SVGRectElement>, bucket: LinkHourlyBucket) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      rangeLabel: bucket.rangeLabel,
      clicks: bucket.clicks,
    });
  }

  return (
    <div className="mt-5 min-w-0 rounded-lg border border-white/[0.08] bg-[rgba(4,16,31,0.38)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-white">Saatlik tıklama dağılımı</p>
          <p className="mt-1 font-mono text-xs font-semibold text-white/46">
            Seçili gün toplamı: {formatNumber(summary.selectedDateTotalClicks)}
          </p>
        </div>
        <p className="max-w-md text-xs font-semibold leading-5 text-white/44">
          {HOURLY_TIMEZONE_HELPER}
        </p>
      </div>

      <div className="relative mt-4 min-h-[18rem] overflow-hidden rounded-lg border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-[20.5rem] w-full sm:h-[23rem]"
          role="img"
          aria-label="Seçili güne göre saatlik tıklama grafiği"
        >
          {yTicks.map((tick) => {
            const y = CHART_PADDING.top + plotHeight - (tick / Math.max(yMax, 1)) * plotHeight;

            return (
              <g key={tick}>
                <line
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <text
                  x={CHART_PADDING.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-white/42 text-[11px] font-semibold"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}

          <text
            x={CHART_PADDING.left}
            y={18}
            className="fill-white/42 text-[11px] font-bold uppercase tracking-[0.16em]"
          >
            Tıklama
          </text>
          <text
            x={CHART_WIDTH - CHART_PADDING.right}
            y={CHART_HEIGHT - 12}
            textAnchor="end"
            className="fill-white/42 text-[11px] font-bold uppercase tracking-[0.16em]"
          >
            Saat
          </text>

          {summary.hourlyBuckets.map((bucket, index) => {
            const geometry = getHourlyBarGeometry({ bucket, index, yMax });
            const visibleHeight = bucket.clicks > 0 ? Math.max(geometry.height, 2) : 0;
            const y = CHART_PADDING.top + plotHeight - visibleHeight;
            const shouldShowLabel = bucket.hour % 3 === 0 || bucket.hour === 23;

            return (
              <g key={bucket.hour}>
                {visibleHeight > 0 ? (
                  <rect
                    x={geometry.x}
                    y={y}
                    width={geometry.width}
                    height={visibleHeight}
                    rx="4"
                    fill="#38bdf8"
                    opacity="0.86"
                  />
                ) : null}
                <rect
                  x={geometry.hitX}
                  y={CHART_PADDING.top}
                  width={geometry.hitWidth}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onPointerEnter={(event) => showTooltip(event, bucket)}
                  onPointerMove={(event) => showTooltip(event, bucket)}
                  onPointerLeave={() => setTooltip(null)}
                />
                {shouldShowLabel ? (
                  <text
                    x={geometry.hitX + geometry.hitWidth / 2}
                    y={CHART_HEIGHT - 30}
                    textAnchor="middle"
                    className="fill-white/42 text-[11px] font-semibold"
                  >
                    {bucket.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {!summary.hasClicks ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-lg border border-dashed border-white/[0.12] bg-[#04101f]/72 px-4 py-5 text-center shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur">
            <p className="text-sm font-semibold text-white/72">Bu tarihte tıklama yok.</p>
          </div>
        ) : null}

        {tooltip ? (
          <ViewportAwareTooltip
            anchor={{ x: tooltip.x, y: tooltip.y }}
            className="pointer-events-none min-w-[11rem] rounded-lg border border-white/[0.12] bg-[#04101f]/95 p-3 text-sm text-white shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur"
            estimatedHeight={92}
            estimatedWidth={196}
            maxWidth={232}
          >
            <p className="font-semibold text-white">{tooltip.rangeLabel}</p>
            <p className="mt-2 text-xs font-semibold text-white/64">
              {formatNumber(tooltip.clicks)} tıklama
            </p>
          </ViewportAwareTooltip>
        ) : null}
      </div>
    </div>
  );
}

function getSeriesColor(series: RangeSeries, index: number) {
  const identity = `${series.key} ${series.label}`.toLocaleLowerCase("tr-TR");

  if (series.key === "main" || identity.includes("ana link")) {
    return "#8fb5ff";
  }

  if (identity.includes("youtube")) {
    return "#ff4d5d";
  }

  if (identity.includes("whatsapp")) {
    return "#39d98a";
  }

  if (identity.includes("instagram")) {
    return "#e879f9";
  }

  if (identity.includes("qr")) {
    return "#5eead4";
  }

  if (identity.includes("e-posta") || identity.includes("email")) {
    return "#fbbf24";
  }

  if (identity.includes("facebook")) {
    return "#60a5fa";
  }

  if (identity.includes("x/twitter") || identity.includes("twitter")) {
    return "#e5e7eb";
  }

  if (identity.includes("linkedin")) {
    return "#38bdf8";
  }

  if (identity.includes("tiktok")) {
    return "#f472b6";
  }

  if (identity.includes("telegram")) {
    return "#2dd4bf";
  }

  if (identity.includes("diğer")) {
    return "#94a3b8";
  }

  return AUTO_COLORS[index % AUTO_COLORS.length];
}

function getNiceStep(maxValue: number) {
  const rawStep = Math.max(maxValue / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }

  if (normalized <= 2) {
    return 2 * magnitude;
  }

  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function getYTicks(maxValue: number) {
  const step = getNiceStep(maxValue);
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks: number[] = [];

  for (let value = 0; value <= top; value += step) {
    ticks.push(value);
  }

  return ticks.length >= 2 ? ticks : [0, top];
}

function buildSmoothPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function toRangeSeries(data: LinkPerformanceData, visibleDays: LinkPerformanceDay[]) {
  const visibleDayKeys = new Set(visibleDays.map((day) => day.key));

  return data.channels.map((channel) => {
    const points = channel.points.filter((point) => visibleDayKeys.has(point.dayKey));
    const total = points.reduce((sum, point) => sum + point.value, 0);

    return {
      key: channel.key,
      label: channel.label,
      slug: channel.slug,
      total,
      points,
    };
  });
}

function groupChartSeries(series: RangeSeries[], visibleDays: LinkPerformanceDay[]) {
  const positiveSeries = series.filter((item) => item.total > 0);

  if (positiveSeries.length <= MAX_CHART_SERIES) {
    return positiveSeries;
  }

  const mainSeries = positiveSeries.find((item) => item.key === "main");
  const remaining = positiveSeries.filter((item) => item.key !== mainSeries?.key);
  const topSlotCount = mainSeries ? MAX_CHART_SERIES - 2 : MAX_CHART_SERIES - 1;
  const topSeries = remaining.slice(0, topSlotCount);
  const groupedSeries = remaining.slice(topSlotCount);

  if (groupedSeries.length === 0) {
    return mainSeries ? [mainSeries, ...topSeries] : topSeries;
  }

  const otherPoints = visibleDays.map((day) => {
    const value = groupedSeries.reduce((sum, item) => {
      const point = item.points.find((entry) => entry.dayKey === day.key);
      return sum + (point?.value ?? 0);
    }, 0);

    return {
      dayKey: day.key,
      value,
      dailyTotal: day.total,
    };
  });
  const otherSeries: RangeSeries = {
    key: "other",
    label: "Diğer",
    slug: null,
    total: otherPoints.reduce((sum, point) => sum + point.value, 0),
    points: otherPoints,
  };

  return mainSeries
    ? [mainSeries, ...topSeries, otherSeries]
    : [...topSeries, otherSeries];
}

function getChartPoint({
  day,
  index,
  value,
  dailyTotal,
  visibleDays,
  yMax,
}: {
  day: LinkPerformanceDay;
  index: number;
  value: number;
  dailyTotal: number;
  visibleDays: LinkPerformanceDay[];
  yMax: number;
}): ChartPoint {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const xStep = visibleDays.length > 1 ? plotWidth / (visibleDays.length - 1) : 0;
  const x = CHART_PADDING.left + index * xStep;
  const y =
    CHART_PADDING.top +
    plotHeight -
    (Math.max(value, 0) / Math.max(yMax, 1)) * plotHeight;

  return {
    day,
    value,
    dailyTotal,
    x,
    y,
  };
}

function DistributionCard({
  title,
  items,
  accent,
}: {
  title: string;
  items: LinkAnalyticsSummaryItem[];
  accent: string;
}) {
  const visible = items.slice(0, DISTRIBUTION_CARD_LIMIT);
  const maxCount = Math.max(...visible.map((item) => item.count), 0);

  return (
    <article className="min-w-0 rounded-lg border border-white/[0.08] bg-[rgba(4,16,31,0.38)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/52">{title}</p>
      {visible.length > 0 ? (
        <div className="mt-3 grid gap-2.5">
          {visible.map((item) => {
            const percentage =
              maxCount > 0 ? Math.max(8, Math.round((item.count / maxCount) * 100)) : 0;

            return (
              <div key={item.label} className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-white/78">{item.label}</span>
                  <span className="font-mono text-sm font-black tabular-nums text-white">
                    {formatNumber(item.count)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-white/40">Veri yok</p>
      )}
    </article>
  );
}

export function LinkPerformancePanel({
  linkRequestId,
  data,
  hourlyData,
  linkCreatedAt,
  kpis,
  distribution,
}: {
  linkRequestId: string;
  data: LinkPerformanceData;
  hourlyData?: LinkHourlyDetailData | null;
  linkCreatedAt?: string | null;
  kpis: PerformanceKpis;
  distribution?: PerformanceDistribution;
}) {
  const hasDistribution = Boolean(
    distribution &&
      (distribution.device.length > 0 ||
        distribution.os.length > 0 ||
        distribution.location.length > 0),
  );
  const hourlyDateLimits = useMemo(
    () => getLinkHourlyDateLimits(hourlyData, linkCreatedAt),
    [hourlyData, linkCreatedAt],
  );
  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);
  const [selectedHourlyDateKey, setSelectedHourlyDateKey] = useState(
    hourlyDateLimits.defaultDateKey,
  );
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const availableRangeOptions = RANGE_OPTIONS.filter((option) => option <= data.rangeDays);
  const effectiveSelectedHourlyDateKey = clampDateKey(
    selectedHourlyDateKey,
    hourlyDateLimits.minDateKey,
    hourlyDateLimits.maxDateKey,
  );
  const hourlySummary = useMemo(
    () => buildLinkHourlyDistribution(hourlyData, effectiveSelectedHourlyDateKey),
    [effectiveSelectedHourlyDateKey, hourlyData],
  );

  const {
    visibleDays,
    summaryRows,
    performanceSummary,
    chartSeries,
    yTicks,
    yMax,
    hasVisibleClicks,
    rangeTotal,
  } = useMemo(() => {
    const days = data.days.slice(-rangeDays);
    const rangeSeries = toRangeSeries(data, days).sort(
      (a, b) => b.total - a.total || a.label.localeCompare(b.label, "tr"),
    );
    const groupedSeries = groupChartSeries(rangeSeries, days);
    const coloredSeries = groupedSeries.map((series, index) => ({
      ...series,
      color: getSeriesColor(series, index),
    }));
    const activeSeries = coloredSeries.filter((series) => !hiddenSeries.has(series.key));
    const maxValue = Math.max(
      0,
      ...activeSeries.flatMap((series) => series.points.map((point) => point.value)),
    );
    const ticks = getYTicks(maxValue);
    const maxTick = ticks[ticks.length - 1] ?? 1;
    const seriesWithPoints: ChartSeries[] = coloredSeries.map((series) => ({
      ...series,
      chartPoints: days.map((day, index) => {
        const point = series.points.find((entry) => entry.dayKey === day.key);

        return getChartPoint({
          day,
          index,
          value: point?.value ?? 0,
          dailyTotal: point?.dailyTotal ?? day.total,
          visibleDays: days,
          yMax: maxTick,
        });
      }),
    }));

    return {
      visibleDays: days,
      summaryRows: rangeSeries,
      performanceSummary: buildLinkPerformanceSummary(data, rangeDays, days),
      chartSeries: seriesWithPoints,
      yTicks: ticks,
      yMax: maxTick,
      hasVisibleClicks: rangeSeries.some((series) => series.total > 0),
      rangeTotal: days.reduce((sum, day) => sum + day.total, 0),
    };
  }, [data, hiddenSeries, rangeDays]);

  const latestClickAt = hourlyData?.lastClickedAt ?? null;
  const insights = useMemo(
    () =>
      buildLinkPerformanceInsights({
        summary: performanceSummary,
        hourlySummary,
        totalClicks: kpis.totalClicks,
        todayClicks: kpis.todayClicks,
        last7DaysClicks: kpis.last7DaysClicks,
        lastClickedAt: latestClickAt,
      }),
    [
      hourlySummary,
      kpis.last7DaysClicks,
      kpis.todayClicks,
      kpis.totalClicks,
      latestClickAt,
      performanceSummary,
    ],
  );

  const xLabelStep = Math.max(1, Math.ceil(visibleDays.length / 6));
  const maxSummaryValue = Math.max(...summaryRows.map((row) => row.total), 0);

  function toggleSeries(key: string) {
    setHiddenSeries((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function showTooltip(
    event: ReactPointerEvent<SVGCircleElement>,
    series: ChartSeries,
    point: ChartPoint,
  ) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      date: point.day.longLabel,
      channel: series.label,
      clicks: point.value,
      slug: series.slug,
      dailyTotal: point.dailyTotal,
      color: series.color,
    });
  }

  function updateSelectedHourlyDate(value: string) {
    setSelectedHourlyDateKey(
      clampDateKey(value, hourlyDateLimits.minDateKey, hourlyDateLimits.maxDateKey),
    );
  }

  const kpiItems = [
    {
      label: "Toplam Tıklama",
      value: formatNumber(kpis.totalClicks),
      detail: "Yayına alındığından beri",
      insight: insights.totalClicks,
    },
    {
      label: "Bugün",
      value: formatNumber(kpis.todayClicks),
      detail: "Europe/Istanbul gün başlangıcı",
      insight: insights.today,
    },
    {
      label: "Son 7 Gün",
      value: formatNumber(kpis.last7DaysClicks),
      detail: "Bugün dahil günlük unique",
      insight: insights.last7Days,
    },
    {
      label: "Son Tıklama",
      value: kpis.lastClickedAt,
      detail: "En son kayıtlı yönlendirme",
      insight: insights.latestClick,
      compact: true,
    },
  ];

  return (
    <section className="analytics-surface mt-6 overflow-hidden p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-green)]">
            Performans
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-navy)] sm:text-2xl">
            Performans Grafik Paneli
          </h2>
          <LinkReportExportControls linkRequestId={linkRequestId} rangeDays={rangeDays} />
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="inline-grid w-full grid-cols-2 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.045] p-1 sm:w-auto">
            {CHART_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                aria-pressed={chartMode === mode.key}
                onClick={() => setChartMode(mode.key)}
                className={`min-h-9 rounded-md px-3 text-sm font-bold transition ${
                  chartMode === mode.key
                    ? "bg-[#ddf8e8] text-[#071a31] shadow-[0_8px_20px_rgba(73,181,106,0.18)]"
                    : "text-white/62 hover:bg-white/[0.055] hover:text-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {chartMode === "daily" ? (
            <div className="inline-grid w-full grid-cols-3 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.045] p-1 sm:w-auto">
              {availableRangeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRangeDays(option)}
                  className={`min-h-9 rounded-md px-3 text-sm font-bold transition ${
                    rangeDays === option
                      ? "bg-[#ddf8e8] text-[#071a31] shadow-[0_8px_20px_rgba(73,181,106,0.18)]"
                      : "text-white/62 hover:bg-white/[0.055] hover:text-white"
                  }`}
                >
                  {option} gün
                </button>
              ))}
            </div>
          ) : (
            <label className="grid w-full gap-1 text-xs font-bold uppercase tracking-[0.12em] text-white/44 sm:w-auto">
              Tarih
              <input
                type="date"
                min={hourlyDateLimits.minDateKey}
                max={hourlyDateLimits.maxDateKey}
                value={effectiveSelectedHourlyDateKey}
                onChange={(event) => updateSelectedHourlyDate(event.target.value)}
                className="min-h-10 rounded-lg border border-white/[0.1] bg-white/[0.055] px-3 font-mono text-sm font-bold tracking-normal text-white outline-none transition [color-scheme:dark] hover:border-white/[0.18] focus:border-[#80c99a]/60"
              />
            </label>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiItems.map((item) => (
          <article
            key={item.label}
            className="min-w-0 rounded-lg border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="min-w-0 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/52">
                {item.label}
              </p>
              <MetricInfoButton label={item.label} insight={item.insight} />
            </div>
            <p
              className={`mt-2 font-mono font-black text-white ${
                item.compact
                  ? "break-words text-sm leading-5 sm:text-[0.95rem]"
                  : "text-2xl leading-none sm:text-3xl"
              }`}
            >
              {item.value}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/44">{item.detail}</p>
          </article>
        ))}
      </div>

      {chartMode === "daily" ? (
        <PerformanceSummaryCard insights={insights} summary={performanceSummary} />
      ) : (
        <HourlySummaryCards insights={insights} summary={hourlySummary} />
      )}

      {chartMode === "daily" ? (
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 rounded-lg border border-white/[0.08] bg-[rgba(4,16,31,0.38)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-white">Günlük kanal trendi</p>
              <p className="mt-1 font-mono text-xs font-semibold text-white/46">
                Seçili aralık toplamı: {formatNumber(rangeTotal)}
              </p>
            </div>

            {chartSeries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chartSeries.map((series) => {
                  const isHidden = hiddenSeries.has(series.key);

                  return (
                    <button
                      key={series.key}
                      type="button"
                      aria-pressed={!isHidden}
                      onClick={() => toggleSeries(series.key)}
                      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${
                        isHidden
                          ? "border-white/[0.06] bg-white/[0.025] text-white/34"
                          : "border-white/[0.1] bg-white/[0.055] text-white/76 hover:border-white/[0.18] hover:text-white"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: isHidden ? "rgba(255,255,255,0.22)" : series.color }}
                        aria-hidden="true"
                      />
                      {series.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div
            className="relative mt-4 min-h-[18rem] overflow-hidden rounded-lg border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
          >
            {hasVisibleClicks ? (
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="h-[20.5rem] w-full sm:h-[23rem]"
                role="img"
                aria-label="Günlere göre kanal tıklama grafiği"
              >
                <defs>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {yTicks.map((tick) => {
                  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
                  const y =
                    CHART_PADDING.top + plotHeight - (tick / Math.max(yMax, 1)) * plotHeight;

                  return (
                    <g key={tick}>
                      <line
                        x1={CHART_PADDING.left}
                        x2={CHART_WIDTH - CHART_PADDING.right}
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                      <text
                        x={CHART_PADDING.left - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-white/42 text-[11px] font-semibold"
                      >
                        {formatNumber(tick)}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={CHART_PADDING.left}
                  y={18}
                  className="fill-white/42 text-[11px] font-bold uppercase tracking-[0.16em]"
                >
                  Tıklama
                </text>
                <text
                  x={CHART_WIDTH - CHART_PADDING.right}
                  y={CHART_HEIGHT - 12}
                  textAnchor="end"
                  className="fill-white/42 text-[11px] font-bold uppercase tracking-[0.16em]"
                >
                  Gün
                </text>

                {visibleDays.map((day, index) => {
                  if (index % xLabelStep !== 0 && index !== visibleDays.length - 1) {
                    return null;
                  }

                  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
                  const x =
                    CHART_PADDING.left +
                    index * (visibleDays.length > 1 ? plotWidth / (visibleDays.length - 1) : 0);

                  return (
                    <text
                      key={day.key}
                      x={x}
                      y={CHART_HEIGHT - 30}
                      textAnchor="middle"
                      className="fill-white/42 text-[11px] font-semibold"
                    >
                      {day.label}
                    </text>
                  );
                })}

                {chartSeries.map((series) => {
                  if (hiddenSeries.has(series.key)) {
                    return null;
                  }

                  return (
                    <g key={series.key}>
                      <path
                        d={buildSmoothPath(series.chartPoints)}
                        fill="none"
                        stroke={series.color}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        filter="url(#lineGlow)"
                        vectorEffect="non-scaling-stroke"
                      />
                      {series.chartPoints.map((point) => (
                        <circle
                          key={`${series.key}-${point.day.key}`}
                          cx={point.x}
                          cy={point.y}
                          r="5"
                          fill="rgba(4,16,31,0.94)"
                          stroke={series.color}
                          strokeWidth="2.5"
                          className="cursor-crosshair transition hover:opacity-100"
                          onPointerEnter={(event) => showTooltip(event, series, point)}
                          onPointerMove={(event) => showTooltip(event, series, point)}
                          onPointerLeave={() => setTooltip(null)}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="grid min-h-[18rem] place-items-center px-5 py-10 text-center">
                <div>
                  <p className="text-base font-semibold text-white">
                    {data.hasClicks
                      ? "Seçili aralıkta tıklama yok."
                      : "Henüz yeterli tıklama yok. Linkin paylaşıldıkça grafik burada oluşacak."}
                  </p>
                </div>
              </div>
            )}

            {tooltip ? (
              <ViewportAwareTooltip
                anchor={{ x: tooltip.x, y: tooltip.y }}
                className="pointer-events-none min-w-[13rem] rounded-lg border border-white/[0.12] bg-[#04101f]/95 p-3 text-sm text-white shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur"
                estimatedHeight={132}
                estimatedWidth={240}
                maxWidth={272}
              >
                <p className="font-semibold text-white">{tooltip.date}</p>
                <p className="mt-2 inline-flex items-center gap-2 font-bold">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tooltip.color }}
                    aria-hidden="true"
                  />
                  {tooltip.channel}
                </p>
                <div className="mt-2 grid gap-1 text-xs font-semibold text-white/64">
                  <p>Tıklama: {formatNumber(tooltip.clicks)}</p>
                  {tooltip.slug ? <p>Kısa link: {tooltip.slug}</p> : null}
                  <p>Günlük toplam: {formatNumber(tooltip.dailyTotal)}</p>
                </div>
              </ViewportAwareTooltip>
            ) : null}
          </div>
        </div>

        <aside className="min-w-0 rounded-lg border border-white/[0.08] bg-[rgba(4,16,31,0.38)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Kanal özeti</p>
              <p className="mt-1 font-mono text-xs font-semibold text-white/46">
                {rangeDays} gün
              </p>
            </div>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 font-mono text-xs font-bold text-white/62">
              {formatNumber(rangeTotal)}
            </span>
          </div>

          <div className="mt-4 grid max-h-[23rem] gap-3 overflow-y-auto pr-1">
            {summaryRows.map((row, index) => {
              const percentage =
                maxSummaryValue > 0 ? Math.round((row.total / maxSummaryValue) * 100) : 0;
              const matchingSeries = chartSeries.find((series) => series.key === row.key);
              const color = matchingSeries?.color ?? getSeriesColor(row, index);

              return (
                <div key={row.key} className="min-w-0">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-white/78">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{row.label}</span>
                    </p>
                    <p className="font-mono text-sm font-black tabular-nums text-white">
                      {formatNumber(row.total)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 14px ${color}55`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
      ) : (
        <HourlyDetailChart summary={hourlySummary} />
      )}

      {chartMode === "daily" && distribution ? (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold text-white">Cihaz ve konum dağılımı</p>
            <p className="font-mono text-xs font-semibold text-white/46">Tüm zamanlar</p>
          </div>

          {hasDistribution ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DistributionCard title="Cihaz dağılımı" items={distribution.device} accent="#38bdf8" />
              <DistributionCard
                title="İşletim sistemi / Tarayıcı"
                items={distribution.os}
                accent="#a78bfa"
              />
              <DistributionCard
                title="Yaklaşık konum"
                items={distribution.location}
                accent="#34d399"
              />
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-white/60">
                Henüz cihaz ve konum verisi oluşmadı.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
