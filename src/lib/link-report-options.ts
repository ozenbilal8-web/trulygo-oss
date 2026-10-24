export const LINK_REPORT_RANGE_OPTIONS = [7, 14, 30] as const;

export type LinkReportRangeDays = (typeof LINK_REPORT_RANGE_OPTIONS)[number];
export type LinkReportDataFormat = "xlsx" | "csv";
export type LinkReportDataType = "standard" | "detailed" | "custom";
export type LinkReportPdfType = "executive" | "detailed";

export type LinkReportSectionKey =
  | "summary"
  | "daily"
  | "hourly"
  | "channels"
  | "devices"
  | "locations"
  | "raw";

export type LinkReportSectionDefinition = {
  key: LinkReportSectionKey;
  label: string;
  csvFileName: string;
  standard: boolean;
  detailed: boolean;
};

export const LINK_REPORT_SECTIONS = [
  {
    key: "summary",
    label: "Özet",
    csvFileName: "summary.csv",
    standard: true,
    detailed: true,
  },
  {
    key: "daily",
    label: "Günlük Veriler",
    csvFileName: "daily-data.csv",
    standard: true,
    detailed: true,
  },
  {
    key: "hourly",
    label: "Saatlik Veriler",
    csvFileName: "hourly-data.csv",
    standard: false,
    detailed: true,
  },
  {
    key: "channels",
    label: "Kanal Dağılımı",
    csvFileName: "channels.csv",
    standard: true,
    detailed: true,
  },
  {
    key: "devices",
    label: "Cihaz / OS / Tarayıcı",
    csvFileName: "devices-browsers.csv",
    standard: true,
    detailed: true,
  },
  {
    key: "locations",
    label: "Lokasyon",
    csvFileName: "locations.csv",
    standard: true,
    detailed: true,
  },
  {
    key: "raw",
    label: "Ham Veri",
    csvFileName: "raw-events.csv",
    standard: false,
    detailed: true,
  },
] as const satisfies readonly LinkReportSectionDefinition[];

export const LINK_REPORT_SECTION_KEYS = LINK_REPORT_SECTIONS.map((section) => section.key);

export const LINK_REPORT_PDF_SECTIONS = [
  "performance",
  "dailyTrend",
  "channels",
  "devices",
  "locations",
  "hourly",
] as const;

export type LinkReportPdfSectionKey = (typeof LINK_REPORT_PDF_SECTIONS)[number];

export function normalizeReportRangeDays(value: unknown): LinkReportRangeDays {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : 7;

  return LINK_REPORT_RANGE_OPTIONS.includes(parsed as LinkReportRangeDays)
    ? (parsed as LinkReportRangeDays)
    : 7;
}

export function isReportSectionKey(value: unknown): value is LinkReportSectionKey {
  return typeof value === "string" && LINK_REPORT_SECTION_KEYS.includes(value as LinkReportSectionKey);
}

export function normalizeDataReportType(value: unknown): LinkReportDataType {
  return value === "detailed" || value === "custom" || value === "standard"
    ? value
    : "standard";
}

export function normalizePdfReportType(value: unknown): LinkReportPdfType {
  return value === "detailed" ? "detailed" : "executive";
}

export function getDefaultDataSections(type: LinkReportDataType): LinkReportSectionKey[] {
  const flag = type === "detailed" ? "detailed" : "standard";

  return LINK_REPORT_SECTIONS.filter((section) => section[flag]).map((section) => section.key);
}

export function normalizeDataSections(
  sections: unknown,
  reportType: LinkReportDataType,
  options: { includeSummary?: boolean } = {},
): LinkReportSectionKey[] {
  const includeSummary = options.includeSummary ?? true;
  const fallback = getDefaultDataSections(reportType);
  const requested = Array.isArray(sections)
    ? sections.filter(isReportSectionKey)
    : fallback;
  const allowed = reportType === "standard"
    ? new Set(getDefaultDataSections("standard"))
    : new Set(LINK_REPORT_SECTION_KEYS);
  const seeded = includeSummary ? (["summary", ...requested] as LinkReportSectionKey[]) : requested;
  const unique = Array.from(new Set(seeded)).filter(
    (section) => allowed.has(section),
  );

  if (unique.length > 0) {
    return unique;
  }

  return includeSummary ? ["summary"] : fallback;
}

export function normalizePdfSections(
  sections: unknown,
  reportType: LinkReportPdfType,
): LinkReportPdfSectionKey[] {
  const defaults: LinkReportPdfSectionKey[] =
    reportType === "detailed"
      ? ["performance", "dailyTrend", "channels", "devices", "locations", "hourly"]
      : ["performance", "dailyTrend", "channels", "devices", "locations"];
  const requested = Array.isArray(sections)
    ? sections.filter((section): section is LinkReportPdfSectionKey =>
        LINK_REPORT_PDF_SECTIONS.includes(section as LinkReportPdfSectionKey),
      )
    : defaults;
  const unique = Array.from(new Set(requested));

  return unique.length > 0 ? unique : defaults;
}
