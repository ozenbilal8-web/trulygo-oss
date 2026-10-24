import Link from "next/link";
import { notFound } from "next/navigation";
import { createChannelLinkAction } from "./actions";
import { DeleteLinkButton } from "./delete-link-button";
import { CopyShortLinkButton } from "@/components/copy-short-link-button";
import { LinkPerformancePanel } from "@/components/link-performance-panel";
import { PlatformIcon } from "@/components/link-vitrine-public-view";
import { PageHeading } from "@/components/page-heading";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { QrCodeCard } from "@/components/qr-code-card";
import { getAuthStatus } from "@/lib/auth/session";
import { DEVICE_TYPE_LABELS } from "@/lib/click-enrichment";
import {
  channelPresets,
  getCurrentUserChannelLinks,
  type ChannelLink,
} from "@/lib/channel-links";
import {
  getCurrentUserLinkClickAnalytics,
  getCurrentUserLinkHourlyDetailData,
  getCurrentUserLinkPerformanceData,
  type LinkClickEvent,
} from "@/lib/link-analytics";
import {
  getCurrentUserLinkRequestById,
  linkRequestStatusLabels,
  type LinkRequest,
} from "@/lib/link-requests";
import type { LinkVitrinePlatform } from "@/lib/link-vitrine-config";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { buildShortUrl, formatShortLinkLabel } from "@/lib/slugs";

type LinkAnalyticsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    channelError?: keyof typeof channelErrorMessages;
    channelMessage?: keyof typeof channelSuccessMessages;
  }>;
};

export const metadata = {
  title: "Link Analizi",
  description:
    "Kısa linkin tıklama, kanal ve kampanya performansını detaylı incele.",
  robots: NO_INDEX_ROBOTS,
};

const channelErrorMessages = {
  auth_not_configured: "Supabase Auth ayarları tamamlanmadan takip linki oluşturulamaz.",
  unauthenticated: "Takip linki oluşturmak için tekrar giriş yapın.",
  link_not_found: "Ana link bulunamadı veya bu hesaba ait değil.",
  not_approved: "Takip linkleri yalnızca onaylı ana linkler için oluşturulabilir.",
  invalid_channel: "Kanal adı güvenli kısa link formatına çevrilemedi.",
  channel_exists: "Bu kanal veya kısa takip linki zaten oluşturulmuş.",
  create_failed: "Takip linki oluşturulamadı. Lütfen tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
} as const;

const channelSuccessMessages = {
  channel_created: "Takip linki oluşturuldu.",
} as const;

const qrChannelKey = "qr";

const channelIconPlatformMap = {
  instagram: "instagram",
  whatsapp: "whatsapp",
  youtube: "youtube",
  facebook: "facebook",
  x: "x",
  linkedin: "linkedin",
  tiktok: "tiktok",
  telegram: "telegram",
} as const satisfies Record<string, LinkVitrinePlatform>;

const heroStatusTones: Record<LinkRequest["status"], string> = {
  pending: "border-[#e6c46b]/40 bg-[#e6c46b]/10 text-[#ffe6a3]",
  approved: "border-[#80c99a]/45 bg-[#80c99a]/12 text-[#ddf8e8]",
  rejected: "border-[#e47d6b]/40 bg-[#e47d6b]/12 text-[#ffd4cc]",
  suspended: "border-white/[0.18] bg-white/[0.08] text-white/72",
};

function formatDateTime(value: string | null, fallback = "Bilinmiyor") {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayValue(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "Bilinmiyor";
}

function getReferrerDisplay(value: string | null) {
  const referrer = value?.trim();

  if (!referrer) {
    return "Bilinmiyor";
  }

  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "") || referrer;
  } catch {
    return referrer;
  }
}

// "Mobil · iOS · Safari" / "Bot" / "Bilinmiyor". Old rows (all-null) fall back to
// "Bilinmiyor"; unknown device type is dropped but a known OS/browser still shows.
function getDeviceDisplay(event: LinkClickEvent) {
  if (event.deviceType === "bot") {
    return "Bot";
  }

  const parts: string[] = [];

  if (
    event.deviceType === "mobile" ||
    event.deviceType === "desktop" ||
    event.deviceType === "tablet"
  ) {
    parts.push(DEVICE_TYPE_LABELS[event.deviceType]);
  }

  if (event.osName) {
    parts.push(event.osName);
  }

  if (event.browserName) {
    parts.push(event.browserName);
  }

  return parts.length > 0 ? parts.join(" · ") : "Bilinmiyor";
}

function getLocationDisplay(event: LinkClickEvent) {
  const label = event.locationLabel?.trim();
  return label ? label : "Bilinmiyor";
}

function getStatusAnalyticsMessage(status: LinkRequest["status"]) {
  if (status === "pending") {
    return "Link onaylandıktan sonra analizler aktif olur.";
  }

  if (status === "rejected") {
    return "Bu link aktif olmadığı için analiz oluşturulmaz.";
  }

  if (status === "suspended") {
    return "Bu link askıya alındığı için analiz oluşturulmaz.";
  }

  return "Henüz tıklama yok. Link paylaşıldığında veriler burada görünür.";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface-card border-dashed px-4 py-6 text-center">
      <p className="text-base font-semibold text-[var(--color-navy)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-muted)]">
        {description}
      </p>
    </div>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 6.5h16v11H4z" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5 6.5h14v9H9l-4 3z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

function ChannelPresetIcon({ channelKey }: { channelKey: string }) {
  const platform = channelIconPlatformMap[channelKey as keyof typeof channelIconPlatformMap];

  return (
    <span className="channel-preset-icon" aria-hidden="true">
      {platform ? <PlatformIcon platform={platform} size={18} /> : null}
      {channelKey === "email" ? <MailIcon /> : null}
      {channelKey === "sms" ? <MessageIcon /> : null}
    </span>
  );
}

function getEventChannelDisplay(event: LinkClickEvent) {
  if (event.channelLabel) {
    return event.channelLabel;
  }

  if (event.channelKey === "main") {
    return "Doğrudan / Ana link";
  }

  return displayValue(event.utmSource);
}

function getEventChannelGlyph(event: LinkClickEvent) {
  if (event.channelKey === "main") {
    return "★";
  }

  const source = event.channelLabel || event.channelKey || event.utmSource || "-";
  return source.trim().slice(0, 2).toUpperCase();
}

function RecentClicksTable({
  events,
  appOrigin,
}: {
  events: LinkClickEvent[];
  appOrigin: string;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Henüz tıklama yok."
        description="Link paylaşıldığında son tıklamalar; kanal, cihaz ve yaklaşık konum detaylarıyla burada görünür."
      />
    );
  }

  return (
    <div className="recent-clicks-card soft-scroll overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead className="bg-[var(--color-page)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          <tr>
            <th className="px-4 py-3">Tarih / saat</th>
            <th className="px-4 py-3">Kanal</th>
            <th className="px-4 py-3">Kısa link</th>
            <th className="px-4 py-3">Cihaz</th>
            <th className="px-4 py-3">Yaklaşık konum</th>
            <th className="px-4 py-3">Geldiği yer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-muted)]">
          {events.map((event) => (
            <tr key={event.id} className="transition hover:bg-[var(--color-page)]">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--color-navy)]">
                {formatDateTime(event.clickedAt)}
              </td>
              <td className="px-4 py-3">
                <span className="data-pill">
                  <span className="data-pill-glyph">{getEventChannelGlyph(event)}</span>
                  {getEventChannelDisplay(event)}
                </span>
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const url = buildShortUrl(appOrigin, event.slug);
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block max-w-[18rem] truncate font-mono text-xs font-semibold text-[var(--color-navy)] transition hover:text-[var(--color-green)]"
                      title={url}
                    >
                      {formatShortLinkLabel(url)}
                    </a>
                  );
                })()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--color-navy)]">
                {getDeviceDisplay(event)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {getLocationDisplay(event)}
              </td>
              <td className="break-all px-4 py-3">
                <span className="data-pill is-muted">
                  <span className="data-pill-glyph">↗</span>
                  {getReferrerDisplay(event.referrer)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QrChannelPanel({
  request,
  appOrigin,
  qrChannelLink,
}: {
  request: LinkRequest;
  appOrigin: string;
  qrChannelLink: ChannelLink | null;
}) {
  const isApproved = request.status === "approved";
  const qrShortUrl = qrChannelLink ? buildShortUrl(appOrigin, qrChannelLink.slug) : null;

  if (isApproved && qrChannelLink && qrShortUrl) {
    return (
      <QrCodeCard
        className="qr-channel-card"
        title="QR Kod oluştur"
        description="Oluşturduğun link için QR Kod oluştur."
        value={qrShortUrl}
        pngFilename={`trulygo-qr-${qrChannelLink.slug}.png`}
        brandedPngFilename={`trulygo-branded-qr-${qrChannelLink.slug}.png`}
        svgFilename={`trulygo-${qrChannelLink.slug}.svg`}
        helperText="Redirect, UTM ve kanal takibi mevcut sistem üzerinden çalışır."
        collapsible
        defaultOpen={false}
        readyLabel="Aktif"
      />
    );
  }

  return (
    <section className="qr-channel-panel">
      <div className="qr-channel-panel-head">
        <div>
          <p>QR Kod</p>
          <h3>QR Kod oluştur</h3>
          <span>Oluşturduğun link için QR Kod oluştur.</span>
        </div>
        <b>{qrChannelLink ? "Aktif" : "Henüz yok"}</b>
      </div>

      {isApproved ? (
        <div className="qr-channel-empty">
          <div>
            <strong>QR Kod oluştur</strong>
            <p>
              Oluşturulduğunda bu link için ayrı ölçülen QR kanal linki hazırlanır.
            </p>
          </div>
          <form action={createChannelLinkAction}>
            <input type="hidden" name="link_request_id" value={request.id} />
            <input type="hidden" name="channel_key" value={qrChannelKey} />
            <PendingSubmitButton
              className="btn btn-primary btn-sm"
              pendingLabel="Oluşturuluyor..."
            >
              QR Kod oluştur
            </PendingSubmitButton>
          </form>
        </div>
      ) : (
        <EmptyState
          title="QR Kod henüz kapalı."
          description="Ana link onaylandıktan sonra QR Kod oluşturulabilir."
        />
      )}
    </section>
  );
}

function ChannelLinksPanel({
  request,
  appOrigin,
  channelLinks,
  channelError,
  channelMessage,
}: {
  request: LinkRequest;
  appOrigin: string;
  channelLinks: ChannelLink[];
  channelError: string | null;
  channelMessage: string | null;
}) {
  const isApproved = request.status === "approved";
  const qrChannelLink = channelLinks.find((link) => link.channelKey === qrChannelKey) ?? null;
  const standardChannelLinks = channelLinks.filter((link) => link.channelKey !== qrChannelKey);
  const standardChannelPresets = channelPresets.filter((preset) => preset.key !== qrChannelKey);
  const createdChannelKeys = new Set(standardChannelLinks.map((link) => link.channelKey));
  const channelCountLabel = qrChannelLink
    ? `${standardChannelLinks.length} kanal + QR`
    : `${standardChannelLinks.length} kanal`;

  return (
    <section className="channel-console mt-6 overflow-hidden">
      <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-green)]">
            Takip linkleri oluştur
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-navy)]">
            Kanal bazlı kısa linkler
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Kanal seç, kısa takip linkini kopyala; uzun UTM adreslerini kullanıcıya göstermeden ölçüm yap.
          </p>
        </div>
        <p className="inline-flex w-fit rounded-lg border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-2 text-sm font-bold text-[var(--color-muted)]">
          {channelCountLabel}
        </p>
      </div>

      {channelError ? (
        <div className="mt-4 rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f]">
          {channelError}
        </div>
      ) : null}

      {channelMessage ? (
        <div className="mt-4 rounded-lg border border-[#80c99a]/55 bg-[var(--color-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[#0d6a3a]">
          {channelMessage}
        </div>
      ) : null}
      </div>

      {isApproved ? (
        <div className="p-4 sm:p-5">
          <div className="soft-scroll -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5">
            <div className="flex w-max min-w-full gap-2">
            {standardChannelPresets.map((preset) => {
              const isCreated = createdChannelKeys.has(preset.key);

              return (
                <form key={preset.key} action={createChannelLinkAction} className="shrink-0">
                  <input type="hidden" name="link_request_id" value={request.id} />
                  <input type="hidden" name="channel_key" value={preset.key} />
                  <PendingSubmitButton
                    aria-pressed={isCreated}
                    className={
                      isCreated
                        ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-[#80c99a]/45 bg-[#ddf8e8]/12 px-3.5 text-sm font-bold text-[#ddf8e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/[0.06] px-3.5 text-sm font-bold text-[var(--color-navy)] transition hover:border-[#80c99a]/60 hover:bg-[#ddf8e8]/10 hover:text-[#ddf8e8]"
                    }
                    disabled={isCreated}
                    pendingLabel="Oluşturuluyor..."
                  >
                    {isCreated ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green-bright)]" aria-hidden="true" />
                    ) : null}
                    <ChannelPresetIcon channelKey={preset.key} />
                    {preset.label}
                  </PendingSubmitButton>
                </form>
              );
            })}
            </div>
          </div>

          <form
            action={createChannelLinkAction}
            className="mt-4 grid gap-3 rounded-lg border border-[var(--color-border)] bg-white/[0.055] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          >
            <input type="hidden" name="link_request_id" value={request.id} />
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[var(--color-navy)]">
              Özel kanal adı
              <input
                name="custom_channel_label"
                type="text"
                placeholder="Steam, Discord, Fuar..."
                className="form-field"
              />
            </label>
            <PendingSubmitButton
              className="btn btn-primary self-end"
              pendingLabel="Oluşturuluyor..."
            >
              Oluştur
            </PendingSubmitButton>
          </form>

          <div className="mt-4">
            <QrChannelPanel
              request={request}
              appOrigin={appOrigin}
              qrChannelLink={qrChannelLink}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <EmptyState
            title="Takip linkleri henüz kapalı."
            description="Ana link admin tarafından onaylandıktan sonra kanal bazlı kısa takip linkleri oluşturulabilir."
          />
        </div>
      )}

      <div className="border-t border-[var(--color-border)] p-4 sm:p-5">
        {standardChannelLinks.length > 0 ? (
          <div className="soft-scroll max-h-[23rem] overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {standardChannelLinks.map((channelLink) => {
              const shortUrl = buildShortUrl(appOrigin, channelLink.slug);

              return (
                <div
                  key={channelLink.id}
                  className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.045))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-navy)]">{channelLink.channelLabel}</p>
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate font-mono text-xs font-semibold text-[var(--color-muted)] transition hover:text-[#ddf8e8]"
                        title={shortUrl}
                      >
                        {formatShortLinkLabel(shortUrl)}
                      </a>
                    </div>
                    <CopyShortLinkButton
                      value={shortUrl}
                      className="btn btn-secondary btn-sm shrink-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        ) : (
          <EmptyState
            title="Henüz takip linki yok."
            description="Instagram, WhatsApp veya özel kanallar için kısa takip linkleri burada listelenir. QR linki ayrı QR / Offline alanında gösterilir."
          />
        )}
      </div>
    </section>
  );
}

function DeleteLinkSection({ request }: { request: LinkRequest }) {
  return (
    <section className="surface-card mt-6 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8d2d1f]">
            Link silme
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-navy)]">
            Bu linki sil
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Bu linki silerseniz link artık çalışmaz ve bu linke ait tıklama verileri
            kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
          </p>
        </div>
        <DeleteLinkButton linkRequestId={request.id} />
      </div>
    </section>
  );
}

export default async function LinkAnalyticsPage({ params, searchParams }: LinkAnalyticsPageProps) {
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    return (
      <main className="app-shell">
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
          <PageHeading
            eyebrow="Link analizi"
            title="Analizleri görmek için giriş yap."
            description={
              auth.isConfigured
                ? "Link performansı sadece link sahibi hesaba gösterilir."
                : "Supabase Auth ortam değişkenleri henüz ayarlı değil."
            }
          />
          <Link
            href="/login"
            className="btn btn-primary mt-8"
          >
            Giriş Yap
          </Link>
        </section>
      </main>
    );
  }

  const [{ id }, pageParams] = await Promise.all([params, searchParams]);
  const [request, appOrigin] = await Promise.all([
    getCurrentUserLinkRequestById(id),
    getAppOrigin(),
  ]);

  if (!request) {
    notFound();
  }

  const shortUrl = request.requestedSlug ? buildShortUrl(appOrigin, request.requestedSlug) : null;
  const isApproved = request.status === "approved";
  const [analytics, channelLinks] = isApproved
    ? await Promise.all([
        getCurrentUserLinkClickAnalytics(request.id, request.requestedSlug),
        getCurrentUserChannelLinks(request.id),
      ])
    : [null, [] as ChannelLink[]];
  const [performanceData, hourlyDetailData] = isApproved
    ? await Promise.all([
        getCurrentUserLinkPerformanceData({
          linkRequestId: request.id,
          mainSlug: request.requestedSlug,
          knownChannels: channelLinks,
        }),
        getCurrentUserLinkHourlyDetailData({
          linkRequestId: request.id,
          linkCreatedAt: request.createdAt,
        }),
      ])
    : [null, null];
  const totalClicks = request.analytics.totalClicks;
  const channelError = pageParams.channelError
    ? channelErrorMessages[pageParams.channelError]
    : null;
  const channelMessage = pageParams.channelMessage
    ? channelSuccessMessages[pageParams.channelMessage]
    : null;

  return (
    <main className="app-shell">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/dashboard"
          className="micro-link inline-flex text-sm font-bold text-[var(--color-muted)]"
        >
          Panele dön
        </Link>

        <div className="analytics-hero-card mt-5 overflow-hidden p-5 text-white sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9ee6b5]">
                Link analizi
              </p>
              <h1 className="mt-3 break-all text-3xl font-semibold leading-tight sm:text-4xl">
                {request.requestedSlug ? `/${request.requestedSlug}` : "Kısa link talebi"}
              </h1>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] px-3.5 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/44">
                  Hedef URL
                </p>
                <p className="mt-1 break-all text-sm font-medium leading-6 text-white/76">
                  {request.targetUrl}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Onaylanan linkin hedef adresi ürün kuralı gereği kullanıcı tarafından değiştirilemez.
              </p>
            </div>
            <span
              className={`status-pill border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${heroStatusTones[request.status]}`}
            >
              {linkRequestStatusLabels[request.status]}
            </span>
          </div>

          {shortUrl ? (
            <div className="mt-5 rounded-lg border border-[#ddf8e8]/14 bg-[rgba(2,11,22,0.28)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#9ee6b5]">
                <span>Kısa link</span>
                <span className="font-semibold tracking-[0.1em] text-white/48">· UTM YOK</span>
              </p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {isApproved ? (
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate font-mono text-sm font-semibold text-white/90 transition hover:text-[#ddf8e8]"
                    title={shortUrl}
                  >
                    {formatShortLinkLabel(shortUrl)}
                  </a>
                ) : (
                  <p className="min-w-0 truncate font-mono text-sm font-semibold text-white/86" title={shortUrl}>
                    {formatShortLinkLabel(shortUrl)}
                  </p>
                )}
                {isApproved ? (
                  <CopyShortLinkButton
                    value={shortUrl}
                    className="btn btn-ghost btn-sm shrink-0 border-[#ddf8e8]/24 bg-[#ddf8e8]/[0.08] text-[#ddf8e8] shadow-none hover:border-[#ddf8e8]/42 hover:bg-[#ddf8e8]/12"
                  />
                ) : null}
              </div>
              <p className="mt-2 max-w-4xl text-xs leading-5 text-white/58">
                TrulyGo tıklamaları ölçmeye devam eder ancak bu bağlantı UTM etiketi içermez. Kanal bazlı ölçüm için aşağıdan bir kanal seçin.
              </p>
            </div>
          ) : null}
        </div>

        <ChannelLinksPanel
          request={request}
          appOrigin={appOrigin}
          channelLinks={channelLinks}
          channelError={channelError}
          channelMessage={channelMessage}
        />

        {isApproved && analytics ? (
          <>
            {performanceData ? (
              <LinkPerformancePanel
                linkRequestId={request.id}
                data={performanceData}
                hourlyData={hourlyDetailData}
                linkCreatedAt={request.createdAt}
                kpis={{
                  totalClicks,
                  todayClicks: analytics.todayClicks,
                  last7DaysClicks: analytics.last7DaysClicks,
                  lastClickedAt: formatDateTime(request.analytics.lastClickedAt, "Henüz yok"),
                }}
                distribution={{
                  device: analytics.deviceSummary,
                  os: analytics.osSummary,
                  location: analytics.locationSummary,
                }}
              />
            ) : null}

            <div className="mt-5">
              <section className="analytics-surface p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-green)]">
                  Son hareketler
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-navy)]">
                  Son tıklamalar
                </h2>
                <div className="mt-5">
                  <RecentClicksTable events={analytics.recentEvents} appOrigin={appOrigin} />
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title={getStatusAnalyticsMessage(request.status)}
              description="TrulyGo linkleri admin onayından geçmeden public redirect üretmez; bu nedenle analizler sadece aktif linklerde tutulur."
            />
          </div>
        )}

        <DeleteLinkSection request={request} />
      </section>
    </main>
  );
}
