import type {
  LinkPerformanceBreakdownSeries,
  LinkPerformanceChannelSeries,
  LinkPerformanceData,
  LinkPerformanceDay,
} from "@/lib/link-analytics";

export type LinkPerformanceTrend = "empty" | "new" | "up" | "down" | "stable";
export type LinkPerformanceTrendTone = "empty" | "positive" | "negative" | "neutral";

export type LinkPerformanceSummaryTopItem = {
  label: string;
  count: number;
};

export type LinkPerformanceSummaryPeakDay = {
  label: string;
  longLabel: string;
  count: number;
};

export type LinkPerformanceSummaryPeriod = {
  startKey: string;
  endKey: string;
  dateRangeLabel: string;
};

export type LinkPerformanceSummary = {
  rangeDays: number;
  currentTotal: number;
  previousTotal: number;
  currentPeriod: LinkPerformanceSummaryPeriod;
  previousPeriod: LinkPerformanceSummaryPeriod;
  changePercent: number | null;
  changeLabel: string;
  comparisonLabel: string;
  trend: LinkPerformanceTrend;
  trendLabel: string;
  trendTone: LinkPerformanceTrendTone;
  peakDay: LinkPerformanceSummaryPeakDay | null;
  topChannel: LinkPerformanceSummaryTopItem | null;
  topDevice: LinkPerformanceSummaryTopItem | null;
  topLocation: LinkPerformanceSummaryTopItem | null;
};

const STABLE_CHANGE_THRESHOLD = 10;
const SHORT_MONTH_LABELS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
] as const;

function sumDays(days: LinkPerformanceDay[]) {
  return days.reduce((sum, day) => sum + Math.max(day.total, 0), 0);
}

function parseDateKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDateKey(key: string, dayOffset: number) {
  const parsed = parseDateKey(key);

  if (!parsed) {
    return "";
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + dayOffset);

  return toDateKey(date);
}

function formatShortDateKey(key: string, includeYear: boolean) {
  const parsed = parseDateKey(key);

  if (!parsed) {
    return "";
  }

  const label = `${String(parsed.day).padStart(2, "0")} ${SHORT_MONTH_LABELS[parsed.month - 1]}`;

  return includeYear ? `${label} ${parsed.year}` : label;
}

function formatDateRange(startKey: string, endKey: string) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  if (!start || !end) {
    return "Tarih yok";
  }

  const includeYear = start.year !== end.year;

  return `${formatShortDateKey(startKey, includeYear)} - ${formatShortDateKey(
    endKey,
    includeYear,
  )}`;
}

function getPeriod(startKey: string, endKey: string): LinkPerformanceSummaryPeriod {
  return {
    startKey,
    endKey,
    dateRangeLabel: formatDateRange(startKey, endKey),
  };
}

function getPeriodDays(
  data: LinkPerformanceData,
  rangeDays: number,
  visibleDays?: LinkPerformanceDay[],
) {
  const safeRangeDays = Math.max(1, Math.trunc(rangeDays));

  if (visibleDays && visibleDays.length > 0) {
    const currentStartIndex = data.days.findIndex((day) => day.key === visibleDays[0].key);
    const currentStartKey = visibleDays[0]?.key ?? "";
    const currentEndKey = visibleDays[visibleDays.length - 1]?.key ?? currentStartKey;

    if (currentStartIndex >= 0) {
      const previousStartKey = shiftDateKey(currentStartKey, -safeRangeDays);
      const previousEndKey = shiftDateKey(currentStartKey, -1);

      return {
        currentDays: visibleDays,
        currentPeriod: getPeriod(currentStartKey, currentEndKey),
        previousDays: data.days.slice(
          Math.max(0, currentStartIndex - safeRangeDays),
          currentStartIndex,
        ),
        previousPeriod: getPeriod(previousStartKey, previousEndKey),
      };
    }
  }

  const currentStart = Math.max(0, data.days.length - safeRangeDays);
  const previousStart = Math.max(0, currentStart - safeRangeDays);
  const currentDays = data.days.slice(currentStart);
  const previousDays = data.days.slice(previousStart, currentStart);
  const currentStartKey = currentDays[0]?.key ?? "";
  const currentEndKey = currentDays[currentDays.length - 1]?.key ?? currentStartKey;
  const previousStartKey = currentStartKey
    ? shiftDateKey(currentStartKey, -safeRangeDays)
    : (previousDays[0]?.key ?? "");
  const previousEndKey = currentStartKey
    ? shiftDateKey(currentStartKey, -1)
    : (previousDays[previousDays.length - 1]?.key ?? previousStartKey);

  return {
    currentDays,
    currentPeriod: getPeriod(currentStartKey, currentEndKey),
    previousDays,
    previousPeriod: getPeriod(previousStartKey, previousEndKey),
  };
}

function getComparisonLabel({
  changeLabel,
  trend,
  trendLabel,
}: {
  changeLabel: string;
  trend: LinkPerformanceTrend;
  trendLabel: string;
}) {
  if (trend === "empty" || trend === "new") {
    return changeLabel;
  }

  return `${changeLabel} · ${trendLabel}`;
}

function formatChangePercent(value: number) {
  const rounded = Math.round(value);

  if (rounded > 0) {
    return `+%${rounded}`;
  }

  if (rounded < 0) {
    return `-%${Math.abs(rounded)}`;
  }

  return "%0";
}

function getTrend({
  currentTotal,
  previousTotal,
  changePercent,
}: {
  currentTotal: number;
  previousTotal: number;
  changePercent: number | null;
}): {
  changeLabel: string;
  trend: LinkPerformanceTrend;
  trendLabel: string;
  trendTone: LinkPerformanceTrendTone;
} {
  if (currentTotal === 0 && previousTotal === 0) {
    return {
      changeLabel: "Veri yok",
      trend: "empty",
      trendLabel: "Veri yok",
      trendTone: "empty",
    };
  }

  if (previousTotal === 0 && currentTotal > 0) {
    return {
      changeLabel: "Yeni trafik",
      trend: "new",
      trendLabel: "Yeni trafik",
      trendTone: "positive",
    };
  }

  const safeChangePercent = changePercent ?? 0;

  if (safeChangePercent > STABLE_CHANGE_THRESHOLD) {
    return {
      changeLabel: formatChangePercent(safeChangePercent),
      trend: "up",
      trendLabel: "Artışta",
      trendTone: "positive",
    };
  }

  if (safeChangePercent < -STABLE_CHANGE_THRESHOLD) {
    return {
      changeLabel: formatChangePercent(safeChangePercent),
      trend: "down",
      trendLabel: "Düşüşte",
      trendTone: "negative",
    };
  }

  return {
    changeLabel: formatChangePercent(safeChangePercent),
    trend: "stable",
    trendLabel: "Stabil",
    trendTone: "neutral",
  };
}

function getPeakDay(days: LinkPerformanceDay[]): LinkPerformanceSummaryPeakDay | null {
  const peak = days.reduce<LinkPerformanceDay | null>((currentPeak, day) => {
    if (day.total <= 0) {
      return currentPeak;
    }

    if (!currentPeak || day.total > currentPeak.total) {
      return day;
    }

    return currentPeak;
  }, null);

  return peak
    ? {
        label: peak.label,
        longLabel: peak.longLabel,
        count: peak.total,
      }
    : null;
}

function getTopSeriesItem(
  series: Array<LinkPerformanceChannelSeries | LinkPerformanceBreakdownSeries>,
  visibleDayKeys: Set<string>,
): LinkPerformanceSummaryTopItem | null {
  const top = series.reduce<LinkPerformanceSummaryTopItem | null>((currentTop, item) => {
    const count = item.points.reduce(
      (sum, point) => sum + (visibleDayKeys.has(point.dayKey) ? Math.max(point.value, 0) : 0),
      0,
    );

    if (count <= 0) {
      return currentTop;
    }

    if (!currentTop || count > currentTop.count) {
      return {
        label: item.label,
        count,
      };
    }

    return currentTop;
  }, null);

  return top;
}

export function buildLinkPerformanceSummary(
  data: LinkPerformanceData,
  rangeDays: number,
  visibleDays?: LinkPerformanceDay[],
): LinkPerformanceSummary {
  const { currentDays, previousDays, currentPeriod, previousPeriod } = getPeriodDays(
    data,
    rangeDays,
    visibleDays,
  );
  const currentTotal = sumDays(currentDays);
  const previousTotal = sumDays(previousDays);
  const changePercent =
    previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const visibleDayKeys = new Set(currentDays.map((day) => day.key));
  const trend = getTrend({ currentTotal, previousTotal, changePercent });

  return {
    rangeDays: Math.max(1, Math.trunc(rangeDays)),
    currentTotal,
    previousTotal,
    currentPeriod,
    previousPeriod,
    changePercent,
    ...trend,
    comparisonLabel: getComparisonLabel(trend),
    peakDay: getPeakDay(currentDays),
    topChannel: getTopSeriesItem(data.channels, visibleDayKeys),
    topDevice: getTopSeriesItem(data.devices, visibleDayKeys),
    topLocation: getTopSeriesItem(data.locations, visibleDayKeys),
  };
}
