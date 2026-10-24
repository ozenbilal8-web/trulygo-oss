import { reviewLinkRequestAction } from "./actions";
import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminSectionNav } from "@/components/admin-section-nav";
import { PageHeading } from "@/components/page-heading";
import { PanelCard } from "@/components/panel-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getAdminAccess } from "@/lib/admin-authorization";
import { formatAdminDateTime } from "@/lib/admin-date";
import { getAdminCreatorEmailLabel } from "@/lib/admin-users";
import { getAdminUserOverviews } from "@/lib/admin-users-server";
import {
  getAdminLinkRequests,
  getPendingLinkRequestsForAdmin,
  linkRequestStatusLabels,
  linkRequestStatusTones,
  type LinkRequest,
} from "@/lib/link-requests";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { buildShortUrl } from "@/lib/slugs";

const adminCards = [
  {
    title: "İnceleme bekleyen linkler",
    description: "Admin onayı bekleyen yeni talepler burada kuyruğa alınacak.",
    label: "Kuyruk",
    tone: "review" as const,
  },
  {
    title: "Onaylanan linkler",
    description: "Yayına alınan ve hedef adresi kilitlenen linkler burada izlenecek.",
    label: "Aktif",
    tone: "approved" as const,
  },
  {
    title: "Reddedilen linkler",
    description: "Spam, sahte kampanya, bahis veya zararlı yönlendirme şüphesiyle reddedilen talepler.",
    label: "Red",
    tone: "blocked" as const,
  },
  {
    title: "Askıya alınan linkler",
    description: "Sonradan riskli görülen veya yayından kaldırılan bağlantılar için takip alanı.",
    label: "Askıda",
  },
];

const errorMessages = {
  auth_not_configured:
    "Supabase Auth ortam değişkenleri henüz ayarlı değil. Admin rol kontrolü için önce lokal Supabase yapılandırmasını tamamlayın.",
  admin_required: "Bu işlem admin yetkisi gerektirir.",
  invalid_review: "İnceleme işlemi için geçerli bir talep ve karar gerekir.",
  invalid_target_url: "Talepteki hedef URL güvenli bir http veya https adresi olmalıdır.",
  missing_slug: "Talep onaylanmadan önce geçerli bir kısa ad içermelidir.",
  invalid_slug: "Talepteki kısa ad güvenli karakter kurallarına uymuyor.",
  reserved_slug: "Talepteki kısa ad sistem tarafından ayrılmıştır.",
  review_failed: "Talep güncellenemedi. Talep artık pending durumda olmayabilir.",
} as const;

const successMessages = {
  request_approved: "Link talebi onaylandı.",
  request_rejected: "Link talebi reddedildi.",
} as const;

type AdminPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
    message?: keyof typeof successMessages;
  }>;
};

export const metadata = {
  title: "Admin Paneli",
  description:
    "TrulyGo admin panelinde bekleyen link taleplerini incele, onayla veya reddet.",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

function getRequestTitle(request: LinkRequest) {
  return request.requestedSlug
    ? `/${request.requestedSlug}`
    : request.campaignName || "Kısa link talebi";
}

const webRiskStatusCopy: Record<NonNullable<LinkRequest["webRisk"]["status"]>, {
  label: string;
  tone: string;
}> = {
  clean: {
    label: "Google Web Risk: temiz",
    tone: "border-[#80c99a]/55 bg-[#effbf3] text-[#0d6a3a]",
  },
  flagged: {
    label: "Google Web Risk: tehdit tespit edildi",
    tone: "border-[#e47d6b]/55 bg-[#fff0ed] text-[#8d2d1f]",
  },
  error: {
    label: "Google Web Risk: kontrol edilemedi",
    tone: "border-[#e6c46b]/55 bg-[#fff8e7] text-[#7a5a10]",
  },
  skipped: {
    label: "Google Web Risk: yapılandırılmadı",
    tone: "border-[var(--color-border)] bg-white text-[var(--color-muted)]",
  },
};

const webRiskThreatLabels: Record<string, string> = {
  MALWARE: "Malware",
  SOCIAL_ENGINEERING: "Phishing / sosyal mühendislik",
  UNWANTED_SOFTWARE: "İstenmeyen yazılım",
};

function WebRiskSummary({ webRisk }: { webRisk: LinkRequest["webRisk"] }) {
  if (!webRisk.status && !webRisk.autoApprovalBlocked) {
    return null;
  }

  const copy = webRisk.status ? webRiskStatusCopy[webRisk.status] : null;

  return (
    <div className="mt-4 rounded-md border border-[var(--color-border)] bg-white/[0.055] px-3 py-3 text-sm leading-6 text-[var(--color-muted)]">
      <div className="flex flex-wrap items-center gap-2">
        {copy ? (
          <span className={`status-pill ${copy.tone}`}>{copy.label}</span>
        ) : null}
        {webRisk.autoApprovalBlocked ? (
          <span className="status-pill border-[#e47d6b]/40 bg-[#fff0ed] text-[#8d2d1f]">
            Otomatik onay engellendi
          </span>
        ) : null}
      </div>
      {webRisk.threats.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {webRisk.threats.map((threat) => (
            <li
              key={threat}
              className="rounded-md border border-[#e47d6b]/40 bg-[#fff0ed] px-2 py-0.5 text-xs font-semibold text-[#8d2d1f]"
            >
              {webRiskThreatLabels[threat] ?? threat}
            </li>
          ))}
        </ul>
      ) : null}
      {webRisk.checkedAt ? (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Kontrol zamanı: {formatAdminDateTime(webRisk.checkedAt)}
        </p>
      ) : null}
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const access = await getAdminAccess();
  const error = params.error ? errorMessages[params.error] : null;
  const message = params.message ? successMessages[params.message] : null;

  if (!access.isAdmin) {
    return <AdminAccessRequired access={access} />;
  }

  const [pendingRequests, adminRequests, appOrigin] = await Promise.all([
    getPendingLinkRequestsForAdmin(),
    getAdminLinkRequests(),
    getAppOrigin(),
  ]);
  const userOverviewLookup = await getAdminUserOverviews([
    ...pendingRequests.map((request) => request.userId),
    ...adminRequests.map((request) => request.userId),
  ]);

  return (
    <main className="app-shell">
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading
          eyebrow="Admin paneli"
          title="Her kısa link yayına alınmadan önce incelenir."
          description="Profil rolünüz server-side kontrol edildi. Bekleyen talepler RLS tarafında admin role sahip profillere açılır."
        />

        <AdminSectionNav active="links" />

        {error ? (
          <div className="mt-6 max-w-3xl rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f]">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 max-w-3xl rounded-lg border border-[#80c99a]/55 bg-[var(--color-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[#0d6a3a]">
            {message}
          </div>
        ) : null}

        {!userOverviewLookup.ok ? (
          <div className="mt-6 max-w-3xl rounded-lg border border-[#e6c46b]/45 bg-[#fff8e7] px-4 py-3 text-sm font-medium leading-6 text-[#7a5a10]">
            Kullanıcı bilgileri yüklenemedi. Link ve moderasyon verileri kullanılmaya devam ediyor.
          </div>
        ) : null}

        <section className="admin-console mt-10 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-green)]">
                Onay kuyruğu
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-navy)]">
                Bekleyen link talepleri
              </h2>
            </div>
            <p className="status-pill border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-muted)]">
              {pendingRequests.length} pending
            </p>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {pendingRequests.map((request) => {
                const shortUrl = request.requestedSlug
                  ? buildShortUrl(appOrigin, request.requestedSlug)
                  : null;

                return (
                  <article
                    key={request.id}
                    className="admin-request-card p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[var(--color-navy)]">
                          {getRequestTitle(request)}
                        </h3>
                        <a
                          href={request.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-green)]"
                        >
                          {request.targetUrl}
                        </a>
                      </div>
                      <span
                        className={`status-pill ${linkRequestStatusTones[request.status]}`}
                      >
                        {linkRequestStatusLabels[request.status]}
                      </span>
                    </div>

                    {shortUrl ? (
                      <p className="mt-3 rounded-md border border-[var(--color-border)] bg-white/[0.055] px-3 py-2 text-sm leading-6 text-[var(--color-muted)]">
                        <span className="font-bold text-[var(--color-navy)]">
                          Onaylanınca kısa link:{" "}
                        </span>
                        <span className="break-all font-semibold text-[var(--color-green)]">
                          {shortUrl}
                        </span>
                      </p>
                    ) : null}

                    <dl className="mt-4 grid gap-2 text-sm text-[var(--color-muted)] sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Kampanya</dt>
                        <dd>{request.campaignName || "Belirtilmedi"}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Oluşturan</dt>
                        <dd className="min-w-0 break-all" title={getAdminCreatorEmailLabel(request.userId, userOverviewLookup)}>
                          {getAdminCreatorEmailLabel(request.userId, userOverviewLookup)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Oluşturma</dt>
                        <dd>{formatAdminDateTime(request.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Talep ID</dt>
                        <dd className="break-all font-mono text-xs">{request.id}</dd>
                      </div>
                    </dl>

                    {request.note ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                        {request.note}
                      </p>
                    ) : null}

                    <WebRiskSummary webRisk={request.webRisk} />

                    <form action={reviewLinkRequestAction} className="mt-4 grid gap-3">
                      <input type="hidden" name="request_id" value={request.id} />
                      <label className="grid gap-2 text-sm font-semibold text-[var(--color-navy)]">
                        Admin notu
                        <textarea
                          name="admin_note"
                          rows={2}
                          className="form-field min-h-20 resize-y"
                        />
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <PendingSubmitButton
                          className="btn btn-primary btn-sm"
                          intentName="status"
                          intentValue="approved"
                          pendingLabel="Onaylanıyor..."
                        >
                          Onayla
                        </PendingSubmitButton>
                        <PendingSubmitButton
                          className="btn btn-danger btn-sm"
                          intentName="status"
                          intentValue="rejected"
                          pendingLabel="Reddediliyor..."
                        >
                          Reddet
                        </PendingSubmitButton>
                      </div>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-page)] px-4 py-5 text-sm leading-6 text-[var(--color-muted)]">
              Bekleyen link talebi bulunmuyor.
            </p>
          )}
        </section>

        <section className="admin-console mt-10 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-green)]">
                Tıklama özeti
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-navy)]">
                Son link talepleri
              </h2>
            </div>
            <p className="status-pill border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-muted)]">
              {adminRequests.length} kayıt
            </p>
          </div>

          {adminRequests.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {adminRequests.map((request) => {
                const shortUrl = request.requestedSlug
                  ? buildShortUrl(appOrigin, request.requestedSlug)
                  : null;

                return (
                  <article
                    key={request.id}
                    className="admin-request-card p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[var(--color-navy)]">
                          {getRequestTitle(request)}
                        </h3>
                        {shortUrl ? (
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-sm font-semibold text-[var(--color-green)]"
                          >
                            {shortUrl}
                          </a>
                        ) : null}
                      </div>
                      <span
                        className={`status-pill ${linkRequestStatusTones[request.status]}`}
                      >
                        {linkRequestStatusLabels[request.status]}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-[var(--color-muted)] sm:grid-cols-2 lg:grid-cols-5">
                      <div className="min-w-0">
                        <dt className="font-bold text-[var(--color-navy)]">Oluşturan</dt>
                        <dd className="break-all" title={getAdminCreatorEmailLabel(request.userId, userOverviewLookup)}>
                          {getAdminCreatorEmailLabel(request.userId, userOverviewLookup)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Oluşturulma</dt>
                        <dd>{formatAdminDateTime(request.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Toplam tıklama</dt>
                        <dd>{request.analytics.totalClicks}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">Son tıklama</dt>
                        <dd>
                          {request.analytics.lastClickedAt
                            ? formatAdminDateTime(request.analytics.lastClickedAt)
                            : "Henüz yok"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[var(--color-navy)]">En sık referrer</dt>
                        <dd className="break-all">{request.analytics.topReferrer || "Yok"}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-page)] px-4 py-5 text-sm leading-6 text-[var(--color-muted)]">
              Henüz link talebi bulunmuyor.
            </p>
          )}
        </section>

        <div className="mt-10 grid max-w-[22.5rem] gap-4 sm:max-w-none md:grid-cols-2">
          {adminCards.map((card) => (
            <PanelCard key={card.title} {...card} />
          ))}
        </div>
      </section>
    </main>
  );
}
