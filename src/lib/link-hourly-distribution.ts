export type LinkHourlyClickEvent = {
  id: string;
  clickedAt: string;
};

export type LinkHourlyDetailData = {
  clicks: LinkHourlyClickEvent[];
  hasClicks: boolean;
  lastClickedAt: string | null;
};

export type LinkHourlyBucket = {
  hour: number;
  label: string;
  rangeLabel: string;
  clicks: number;
};

export type LinkHourlyPeakHour = {
  hour: number;
  rangeLabel: string;
  clicks: number;
};

export type LinkHourlyDateLimits = {
  minDateKey: string;
  maxDateKey: string;
  defaultDateKey: string;
};

export type LinkHourlyDistribution = {
  selectedDateKey: string;
  selectedDateLabel: string;
  selectedDateTotalClicks: number;
  hourlyBuckets: LinkHourlyBucket[];
  peakHour: LinkHourlyPeakHour | null;
  firstClickTime: string | null;
  lastClickTime: string | null;
  hasClicks: boolean;
};

const EMPTY_HOURLY_DATA: LinkHourlyDetailData = {
  clicks: [],
  hasClicks: false,
  lastClickedAt: null,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

function parseDateKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getLocalDateKey(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function getTodayDateKey() {
  return getLocalDateKey(new Date());
}

function getClickDate(click: LinkHourlyClickEvent) {
  const date = new Date(click.clickedAt);

  return isValidDate(date) ? date : null;
}

function getLongDateLabel(dateKey: string) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return "Tarih yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTimeLabel(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getHourRangeLabel(hour: number) {
  return `${pad(hour)}:00 - ${pad((hour + 1) % 24)}:00`;
}

function buildEmptyBuckets(): LinkHourlyBucket[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${pad(hour)}:00`,
    rangeLabel: getHourRangeLabel(hour),
    clicks: 0,
  }));
}

function getFirstValidClickDate(clicks: LinkHourlyClickEvent[]) {
  for (const click of clicks) {
    const date = getClickDate(click);

    if (date) {
      return date;
    }
  }

  return null;
}

export function clampDateKey(dateKey: string, minDateKey: string, maxDateKey: string) {
  if (!parseDateKey(dateKey)) {
    return maxDateKey;
  }

  if (dateKey < minDateKey) {
    return minDateKey;
  }

  if (dateKey > maxDateKey) {
    return maxDateKey;
  }

  return dateKey;
}

export function getLinkHourlyDateLimits(
  data: LinkHourlyDetailData | null | undefined,
  linkCreatedAt: string | null | undefined,
): LinkHourlyDateLimits {
  const hourlyData = data ?? EMPTY_HOURLY_DATA;
  const todayKey = getTodayDateKey();
  const createdDate = linkCreatedAt ? new Date(linkCreatedAt) : null;
  const firstClickDate = getFirstValidClickDate(hourlyData.clicks);
  const rawMinDate =
    createdDate && isValidDate(createdDate)
      ? createdDate
      : (firstClickDate ?? new Date());
  let minDateKey = getLocalDateKey(rawMinDate);
  const maxDateKey = todayKey;

  if (minDateKey > maxDateKey) {
    minDateKey = maxDateKey;
  }

  const lastClickDate = hourlyData.lastClickedAt ? new Date(hourlyData.lastClickedAt) : null;
  const rawDefaultDate =
    lastClickDate && isValidDate(lastClickDate) ? getLocalDateKey(lastClickDate) : maxDateKey;

  return {
    minDateKey,
    maxDateKey,
    defaultDateKey: clampDateKey(rawDefaultDate, minDateKey, maxDateKey),
  };
}

export function buildLinkHourlyDistribution(
  data: LinkHourlyDetailData | null | undefined,
  selectedDateKey: string,
): LinkHourlyDistribution {
  const hourlyData = data ?? EMPTY_HOURLY_DATA;
  const hourlyBuckets = buildEmptyBuckets();
  const selectedClickDates = hourlyData.clicks
    .map((click) => getClickDate(click))
    .filter((date): date is Date => Boolean(date))
    .filter((date) => getLocalDateKey(date) === selectedDateKey)
    .sort((a, b) => a.getTime() - b.getTime());

  for (const clickDate of selectedClickDates) {
    hourlyBuckets[clickDate.getHours()].clicks += 1;
  }

  const selectedDateTotalClicks = selectedClickDates.length;
  const peakBucket = hourlyBuckets.reduce<LinkHourlyBucket | null>((currentPeak, bucket) => {
    if (bucket.clicks <= 0) {
      return currentPeak;
    }

    if (!currentPeak || bucket.clicks > currentPeak.clicks) {
      return bucket;
    }

    return currentPeak;
  }, null);

  return {
    selectedDateKey,
    selectedDateLabel: getLongDateLabel(selectedDateKey),
    selectedDateTotalClicks,
    hourlyBuckets,
    peakHour: peakBucket
      ? {
          hour: peakBucket.hour,
          rangeLabel: peakBucket.rangeLabel,
          clicks: peakBucket.clicks,
        }
      : null,
    firstClickTime: selectedClickDates[0] ? getTimeLabel(selectedClickDates[0]) : null,
    lastClickTime: selectedClickDates[selectedClickDates.length - 1]
      ? getTimeLabel(selectedClickDates[selectedClickDates.length - 1])
      : null,
    hasClicks: selectedDateTotalClicks > 0,
  };
}
