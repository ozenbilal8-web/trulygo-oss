const adminDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Istanbul",
  year: "numeric",
});

const adminTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function formatAdminDateTime(
  value: string | null | undefined,
  fallback = "Tarih yok",
) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return `${adminDateFormatter.format(parsed)} · ${adminTimeFormatter.format(parsed)}`;
}
