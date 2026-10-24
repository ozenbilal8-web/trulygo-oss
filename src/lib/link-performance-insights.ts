import type { LinkHourlyDistribution } from "@/lib/link-hourly-distribution";
import type { LinkPerformanceSummary, LinkPerformanceTrend } from "@/lib/link-performance-summary";

export type LinkPerformanceInsightKey =
  | "totalClicks"
  | "today"
  | "last7Days"
  | "latestClick"
  | "currentPeriod"
  | "previousPeriod"
  | "periodComparison"
  | "peakDay"
  | "strongestChannel"
  | "strongestDevice"
  | "strongestLocation"
  | "selectedDay"
  | "peakHour"
  | "firstHourlyClick"
  | "lastHourlyClick";

export type LinkPerformanceMetricInsight = {
  description: string;
  insight: string;
};

export type LinkPerformanceInsightMap = Record<
  LinkPerformanceInsightKey,
  LinkPerformanceMetricInsight
>;

export type BuildLinkPerformanceInsightsInput = {
  summary: LinkPerformanceSummary;
  hourlySummary: LinkHourlyDistribution;
  totalClicks: number;
  todayClicks: number;
  last7DaysClicks: number;
  lastClickedAt?: string | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function safeCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(safeCount(value));
}

function getShare(part: number, total: number) {
  const safeTotal = safeCount(total);

  return safeTotal > 0 ? safeCount(part) / safeTotal : 0;
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isToday(date: Date | null) {
  return Boolean(date && toLocalDateKey(date) === toLocalDateKey(new Date()));
}

function getDaysSince(date: Date | null) {
  if (!date) {
    return null;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((todayStart.getTime() - dateStart.getTime()) / DAY_IN_MS));
}

function getTodayInsight({
  todayClicks,
  last7DaysClicks,
  lastClickedAt,
}: {
  todayClicks: number;
  last7DaysClicks: number;
  lastClickedAt: Date | null;
}) {
  const today = safeCount(todayClicks);

  if (today === 0) {
    return "Bugün henüz tıklama yok.";
  }

  if (isToday(lastClickedAt)) {
    return `Bugün trafik aktif görünüyor; ${formatNumber(today)} tıklama kaydedilmiş.`;
  }

  const previousSixDaysTotal = Math.max(safeCount(last7DaysClicks) - today, 0);
  const previousAverage = previousSixDaysTotal / 6;

  if (previousAverage > 0 && today >= previousAverage * 1.25 && today - previousAverage >= 1) {
    return "Bugünkü trafik son günlerin ortalamasının üzerinde görünüyor.";
  }

  if (previousAverage > 0 && today <= previousAverage * 0.75 && previousAverage - today >= 1) {
    return "Bugünkü trafik son günlerin ortalamasının altında kalıyor.";
  }

  return `Bugün ${formatNumber(today)} tıklama kaydedilmiş.`;
}

function getLatestClickInsight(lastClickedAt: Date | null) {
  if (!lastClickedAt) {
    return "Henüz yönlendirme kaydı yok.";
  }

  if (isToday(lastClickedAt)) {
    return "Link bugün hâlâ trafik almaya devam ediyor.";
  }

  const daysSince = getDaysSince(lastClickedAt);

  if (daysSince !== null && daysSince <= 1) {
    return "Son aktivite yakın zamanda oluşmuş.";
  }

  return "Son aktivite üzerinden bir süre geçmiş.";
}

function getPeriodComparisonInsight(trend: LinkPerformanceTrend) {
  if (trend === "new") {
    return "Önceki dönemde trafik yokken bu dönemde tıklama oluşmuş.";
  }

  if (trend === "up") {
    return "Tıklama bazında önceki döneme göre artış var.";
  }

  if (trend === "down") {
    return "Tıklama bazında önceki döneme göre düşüş var.";
  }

  if (trend === "stable") {
    return "Tıklama hacmi önceki dönemle benzer seviyede.";
  }

  return "Kıyaslama için yeterli veri yok.";
}

function getPeakDayInsight(summary: LinkPerformanceSummary) {
  const currentTotal = safeCount(summary.currentTotal);

  if (!summary.peakDay || currentTotal === 0) {
    return "Yoğun gün hesaplamak için veri yok.";
  }

  const share = getShare(summary.peakDay.count, currentTotal);

  if (share >= 0.5) {
    return "Trafik belirgin şekilde bu güne yığılmış.";
  }

  if (share >= 0.25) {
    return "Bu gün dönem içinde öne çıkıyor.";
  }

  return "Trafik günlere daha dengeli yayılmış görünüyor.";
}

function getChannelInsight(summary: LinkPerformanceSummary) {
  const currentTotal = safeCount(summary.currentTotal);
  const topChannel = summary.topChannel;

  if (!topChannel || currentTotal === 0) {
    return "Kanal bazlı yorum için veri yok.";
  }

  const share = getShare(topChannel.count, currentTotal);

  if (share >= 0.995) {
    return `Bu dönemde trafik yalnızca ${topChannel.label} kanalından gelmiş.`;
  }

  if (share >= 0.8) {
    return `Trafiğin büyük kısmı ${topChannel.label} üzerinden geliyor; diğer kanal linkleri düşük kalmış.`;
  }

  if (share >= 0.5) {
    return `${topChannel.label} önde, ancak diğer kanallardan da anlamlı trafik gelebilir.`;
  }

  return "Trafik kanallar arasında daha dengeli dağılmış.";
}

function getDeviceInsight(summary: LinkPerformanceSummary) {
  const currentTotal = safeCount(summary.currentTotal);
  const topDevice = summary.topDevice;

  if (!topDevice || currentTotal === 0) {
    return "Cihaz yorumu için veri yok.";
  }

  const share = getShare(topDevice.count, currentTotal);

  if (share >= 0.7) {
    return `Trafik ağırlıklı olarak ${topDevice.label} cihazlardan geliyor.`;
  }

  if (share >= 0.45) {
    return `${topDevice.label} önde, ancak cihaz dağılımı tamamen tek tarafa yığılmamış.`;
  }

  return "Cihaz trafiği daha dengeli görünüyor.";
}

function getLocationInsight(summary: LinkPerformanceSummary) {
  const currentTotal = safeCount(summary.currentTotal);
  const topLocation = summary.topLocation;

  if (!topLocation || currentTotal === 0) {
    return "Konum bilgisi her tıklamada alınamayabilir.";
  }

  const share = getShare(topLocation.count, currentTotal);

  if (share >= 0.6) {
    return `Trafik yaklaşık konum verisine göre belirgin şekilde ${topLocation.label} lokasyonunda yoğunlaşıyor.`;
  }

  if (share >= 0.3) {
    return `${topLocation.label} lokasyonu öne çıkıyor, ancak trafik farklı bölgelerden de geliyor.`;
  }

  return "Trafik farklı lokasyonlara daha dengeli yayılmış görünüyor; konum verisi yaklaşıktır.";
}

function getPeakHourInsight(hourlySummary: LinkHourlyDistribution) {
  const total = safeCount(hourlySummary.selectedDateTotalClicks);

  if (!hourlySummary.peakHour || total === 0) {
    return "Saatlik yoğunluk için veri yok.";
  }

  const share = getShare(hourlySummary.peakHour.clicks, total);

  if (share >= 0.4) {
    return "Tıklamalar belirgin şekilde bu saate yoğunlaşmış.";
  }

  if (share >= 0.2) {
    return "Bu saat gün içinde öne çıkıyor.";
  }

  return "Tıklamalar gün içine daha dengeli yayılmış.";
}

export function buildLinkPerformanceInsights({
  summary,
  hourlySummary,
  totalClicks,
  todayClicks,
  last7DaysClicks,
  lastClickedAt,
}: BuildLinkPerformanceInsightsInput): LinkPerformanceInsightMap {
  const total = safeCount(totalClicks);
  const today = safeCount(todayClicks);
  const last7Days = safeCount(last7DaysClicks);
  const currentTotal = safeCount(summary.currentTotal);
  const previousTotal = safeCount(summary.previousTotal);
  const selectedDayTotal = safeCount(hourlySummary.selectedDateTotalClicks);
  const parsedLastClickedAt = parseDate(lastClickedAt);

  return {
    totalClicks: {
      description:
        "Link yayına alındığından beri alınan toplam yönlendirme sayısını gösterir.",
      insight:
        total === 0
          ? "Henüz tıklama kaydı yok."
          : `Bu link toplam ${formatNumber(total)} tıklama üretmiş.`,
    },
    today: {
      description:
        "Bugün alınan tıklamaları, dashboard'un yerel gün başlangıcına göre gösterir.",
      insight: getTodayInsight({ todayClicks: today, last7DaysClicks: last7Days, lastClickedAt: parsedLastClickedAt }),
    },
    last7Days: {
      description: "Bugün dahil son 7 gündeki tıklama performansını gösterir.",
      insight:
        last7Days === 0
          ? "Son 7 gün için yeterli tıklama verisi yok."
          : `Son 7 gün içinde ${formatNumber(last7Days)} tıklama alınmış.`,
    },
    latestClick: {
      description: "Bu link üzerinden kaydedilen en son yönlendirme zamanını gösterir.",
      insight: getLatestClickInsight(parsedLastClickedAt),
    },
    currentPeriod: {
      description: "Seçili tarih aralığında alınan toplam tıklamayı gösterir.",
      insight:
        currentTotal === 0
          ? "Bu dönemde tıklama yok."
          : `Bu dönem toplam ${formatNumber(currentTotal)} tıklama üretmiş.`,
    },
    previousPeriod: {
      description:
        "Seçili dönemden hemen önceki aynı uzunluktaki dönemle kıyaslama için kullanılır.",
      insight:
        previousTotal === 0
          ? "Önceki dönemde trafik olmadığı için artış yorumu sınırlı değerlendirilmelidir."
          : `Kıyaslama için önceki dönemde ${formatNumber(previousTotal)} tıklamalık referans mevcut.`,
    },
    periodComparison: {
      description:
        "Seçili dönem, hemen önceki aynı uzunluktaki dönemle karşılaştırılır.",
      insight: getPeriodComparisonInsight(summary.trend),
    },
    peakDay: {
      description: "Seçili dönemde en çok tıklama alınan günü gösterir.",
      insight: getPeakDayInsight(summary),
    },
    strongestChannel: {
      description: "Seçili dönemde en çok tıklama getiren kanal linkini gösterir.",
      insight: getChannelInsight(summary),
    },
    strongestDevice: {
      description: "Seçili dönemde en çok kullanılan cihaz türünü gösterir.",
      insight: getDeviceInsight(summary),
    },
    strongestLocation: {
      description:
        "Yaklaşık konum verisine göre en çok tıklama alınan lokasyonu gösterir.",
      insight: getLocationInsight(summary),
    },
    selectedDay: {
      description: "Seçilen takvim günündeki toplam tıklama sayısını gösterir.",
      insight:
        selectedDayTotal === 0
          ? "Bu tarihte tıklama kaydı yok."
          : `Bu tarihte ${formatNumber(selectedDayTotal)} tıklama alınmış.`,
    },
    peakHour: {
      description:
        "Seçili gün içinde en çok tıklama alınan saat aralığını gösterir.",
      insight: getPeakHourInsight(hourlySummary),
    },
    firstHourlyClick: {
      description: "Seçili gün içindeki ilk tıklama zamanını gösterir.",
      insight: hourlySummary.firstClickTime
        ? "Trafik bu saat itibarıyla başlamış."
        : "Bu gün için ilk tıklama yok.",
    },
    lastHourlyClick: {
      description: "Seçili gün içindeki son tıklama zamanını gösterir.",
      insight: hourlySummary.lastClickTime
        ? "Trafik bu saate kadar devam etmiş."
        : "Bu gün için son tıklama yok.",
    },
  };
}
