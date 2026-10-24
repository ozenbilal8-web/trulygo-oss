"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createLinkRequestAction } from "@/app/dashboard/actions";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { ImmutableAckCheckbox } from "@/components/immutable-ack-checkbox";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { DashboardChannelSummary } from "@/lib/channel-links";
import type { LinkRequest } from "@/lib/link-requests";
import { consumePublicUtmDraft } from "@/lib/public-utm-draft";

type Feedback = {
  message: string;
  tone: "error" | "success";
} | null;

type PanelimDashboardProps = {
  appOrigin: string;
  channelSummaries: Record<string, DashboardChannelSummary>;
  displayName: string;
  feedback: Feedback;
  initialCreateOpen: boolean;
  requests: LinkRequest[];
  todayClicks: number;
};

const statusLabels: Record<LinkRequest["status"], string> = {
  approved: "Onaylandı",
  pending: "Bekliyor",
  rejected: "Reddedildi",
  suspended: "Askıda",
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l2.6-2.6a5 5 0 0 0-7.07-7.07L11.6 5.34" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2.6 2.6a5 5 0 0 0 7.07 7.07l1.47-1.47" />
    </svg>
  );
}

function ClickIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11.2V7.5a2.5 2.5 0 0 1 5 0V14" />
      <path d="M14 10.5a2.5 2.5 0 0 1 5 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.9-5L3.5 14a2.5 2.5 0 0 1 4.32-2.5" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 2h12M6 22h12M6 2v4a6 6 0 0 0 12 0V2M18 22v-4a6 6 0 0 0-12 0v4" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
    </svg>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Tarih yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatLastClick(value: string | null) {
  if (!value) {
    return "Henüz yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function getTargetDisplay(targetUrl: string) {
  try {
    const url = new URL(targetUrl);
    return `${url.hostname}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return targetUrl.replace(/^https?:\/\//i, "");
  }
}

function buildShortUrl(appOrigin: string, slug: string | null) {
  if (!slug) {
    return null;
  }

  return `${appOrigin.replace(/\/$/, "")}/${slug}`;
}

function getShortLabel(shortUrl: string | null) {
  return shortUrl ? shortUrl.replace(/^https?:\/\//i, "") : "Kısa link bekleniyor";
}

function getCampaignLabel(request: LinkRequest) {
  return request.campaignName?.trim() || getTargetDisplay(request.targetUrl) || "İsimsiz link";
}

function getChannelLabel(summary: DashboardChannelSummary | undefined) {
  if (!summary?.primaryLabel) {
    return "Doğrudan";
  }

  return summary.count > 1 ? `${summary.primaryLabel} +${summary.count - 1}` : summary.primaryLabel;
}

function StatCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <article className="panelim-stat-card">
      <div className="panelim-stat-label">
        <span>{label}</span>
        <span className="panelim-stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function StatusPill({ status }: { status: LinkRequest["status"] }) {
  return (
    <span className={`panelim-status panelim-status--${status}`}>
      <span aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function CreateLinkModal({
  feedback,
  initialTargetUrl,
  onClose,
}: {
  feedback: Feedback;
  initialTargetUrl: string;
  onClose: () => void;
}) {
  return (
    <div className="panelim-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="panelim-create-title"
        aria-modal="true"
        className="panelim-modal"
        id="new-link"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="panelim-modal-head">
          <div>
            <p>Yeni talep</p>
            <h2 id="panelim-create-title">Link oluştur</h2>
          </div>
          <button
            aria-label="Link oluşturma formunu kapat"
            className="panelim-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {feedback?.tone === "error" ? (
          <div className="panelim-alert panelim-alert--error" role="alert">
            {feedback.message}
          </div>
        ) : null}

        <form action={createLinkRequestAction} className="panelim-form">
          <label className="panelim-field">
            <span>Hedef URL</span>
            <input
              autoFocus
              defaultValue={initialTargetUrl}
              name="target_url"
              placeholder="https://kampanya.example.com/bahar/lp"
              required
              type="url"
            />
            <small>Onaylandıktan sonra bu adres değiştirilemez.</small>
          </label>

          <div className="panelim-field-row">
            <label className="panelim-field">
              <span>Kısa ad / slug</span>
              <input
                inputMode="text"
                name="requested_slug"
                pattern="[A-Za-z0-9-]{2,80}"
                placeholder="bahar-24"
                required
                title="Yalnızca harf, rakam ve tire kullanın."
                type="text"
              />
              <small>Yalnızca harf, rakam ve tire.</small>
            </label>
            <label className="panelim-field">
              <span>Kampanya adı</span>
              <input name="campaign_name" placeholder="Bahar Kampanyası" type="text" />
            </label>
          </div>

          <label className="panelim-field">
            <span>Not</span>
            <textarea
              name="note"
              placeholder="Admin incelemesi için kısa bağlam ekleyebilirsin."
              rows={4}
            />
          </label>

          <ImmutableAckCheckbox />

          <div className="panelim-form-actions">
            <button className="panelim-button panelim-button--muted" onClick={onClose} type="button">
              Vazgeç
            </button>
            <PendingSubmitButton
              className="panelim-button panelim-button--primary"
              pendingLabel="Oluşturuluyor..."
            >
              Talep oluştur
            </PendingSubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}

export function PanelimDashboard({
  appOrigin,
  channelSummaries,
  displayName,
  feedback,
  initialCreateOpen,
  requests,
  todayClicks,
}: PanelimDashboardProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);
  const [initialTargetUrl, setInitialTargetUrl] = useState("");
  const hasConsumedPublicUtmDraftRef = useRef(false);
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const totalClicks = requests.reduce((sum, request) => sum + request.analytics.totalClicks, 0);
  const latestRequestDate = requests[0]?.createdAt ? formatDate(requests[0].createdAt) : null;
  const rows = useMemo(
    () =>
      requests.map((request) => {
        const shortUrl = buildShortUrl(appOrigin, request.requestedSlug);

        return {
          channel: getChannelLabel(channelSummaries[request.id]),
          campaign: getCampaignLabel(request),
          request,
          shortLabel: getShortLabel(shortUrl),
          target: getTargetDisplay(request.targetUrl),
        };
      }),
    [appOrigin, channelSummaries, requests],
  );

  useEffect(() => {
    if (hasConsumedPublicUtmDraftRef.current) {
      return;
    }

    hasConsumedPublicUtmDraftRef.current = true;
    const draft = (() => {
      try {
        return consumePublicUtmDraft(window.sessionStorage);
      } catch {
        return null;
      }
    })();

    if (!draft) {
      return;
    }

    queueMicrotask(() => {
      setInitialTargetUrl(draft.generatedUrl);
      setIsCreateOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!isCreateOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateOpen]);

  return (
    <main className="panelim-dashboard-shell">
      <div className="panelim-bg" aria-hidden="true">
        <div className="panelim-grid" />
      </div>

      <div className="panelim-app">
        <header className="panelim-topbar">
          <div className="panelim-brand">
            <span className="panelim-brand-mark">
              <Image
                alt="TrulyGo"
                height={24}
                priority
                src="/brand/trulygo-mark.svg"
                unoptimized
                width={28}
              />
            </span>
            <span className="panelim-brand-copy">
              <span>
                Truly<span>Go</span>
              </span>
              <i aria-hidden="true" />
              <b>Panelim</b>
            </span>
          </div>
          <div className="panelim-topbar-actions">
            <Link className="panelim-back-link" href="/">
              <ArrowLeftIcon />
              Ana sayfaya dön
            </Link>
          </div>
        </header>

        <section className="panelim-hero">
          <p className="panelim-eyebrow">
            <span aria-hidden="true" />
            Hoş geldin, {displayName}
          </p>
          <h1>Panelim</h1>
          <p>
            Onaylı linklerini, kampanya bağlantılarını ve tıklama performansını buradan
            yönet.
          </p>
        </section>

        <section className="panelim-actions" aria-label="Panel aksiyonları">
          <button
            className="panelim-button panelim-button--primary"
            onClick={() => setIsCreateOpen(true)}
            type="button"
          >
            <PlusIcon />
            Link oluştur
          </button>
          <Link
            className="panelim-button panelim-button--vitrine"
            href="/dashboard/link-vitrini/new"
          >
            <PlusIcon />
            Link Vitrini Oluştur/Düzenle
          </Link>
          <Link className="panelim-button panelim-button--signal" href="/dashboard/signal/new">
            <PlusIcon />
            Anket Oluştur
          </Link>
        </section>

        {feedback ? (
          <div className={`panelim-alert panelim-alert--${feedback.tone}`} role="status">
            {feedback.message}
          </div>
        ) : null}

        <section className="panelim-stats" aria-label="Özet istatistikler">
          <StatCard
            detail="Tüm linkler"
            icon={<ClickIcon />}
            label="Toplam tıklama"
            value={formatNumber(totalClicks)}
          />
          <StatCard
            detail="onaylanmış"
            icon={<LinkIcon />}
            label="Aktif link"
            value={formatNumber(approvedCount)}
          />
          <StatCard
            detail="inceleme bekliyor"
            icon={<HourglassIcon />}
            label="Onay bekleyen"
            value={formatNumber(pendingCount)}
          />
          <StatCard
            detail="Europe/Istanbul"
            icon={<BoltIcon />}
            label="Bugün"
            value={formatNumber(todayClicks)}
          />
        </section>

        <section className="panelim-links-panel" aria-labelledby="panelim-links-title">
          <div className="panelim-panel-head">
            <div>
              <h2 id="panelim-links-title">Linklerim</h2>
              <span>
                {requests.length} link{latestRequestDate ? ` · son talep ${latestRequestDate}` : ""}
              </span>
            </div>
          </div>

          {rows.length > 0 ? (
            <>
              <div className="panelim-table-wrap soft-scroll">
                <table className="panelim-table">
                  <thead>
                    <tr>
                      <th>Kısa link</th>
                      <th>Kampanya adı</th>
                      <th>Kanal</th>
                      <th>Durum</th>
                      <th className="panelim-num">Tıklama</th>
                      <th>Son tıklama</th>
                      <th>
                        <span className="sr-only">Aksiyon</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ campaign, channel, request, shortLabel, target }) => (
                      <tr key={request.id}>
                        <td>
                          <div className="panelim-link-cell">
                            <strong>{shortLabel}</strong>
                            <span title={request.targetUrl}>{target}</span>
                          </div>
                        </td>
                        <td>
                          <div className="panelim-campaign-cell">
                            <strong>{campaign}</strong>
                            <span>{formatDate(request.createdAt)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="panelim-channel">{channel}</span>
                        </td>
                        <td>
                          <StatusPill status={request.status} />
                        </td>
                        <td className="panelim-num">
                          {formatNumber(request.analytics.totalClicks)}
                        </td>
                        <td>
                          <span className="panelim-last-click">
                            {formatLastClick(request.analytics.lastClickedAt)}
                          </span>
                        </td>
                        <td className="panelim-action-cell">
                          <Link className="panelim-detail-link" href={`/dashboard/links/${request.id}`}>
                            Detay
                            <ArrowRightIcon />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panelim-mobile-list soft-scroll">
                {rows.map(({ campaign, channel, request, shortLabel }) => (
                  <article className="panelim-mobile-card" key={request.id}>
                    <div className="panelim-mobile-card-top">
                      <div>
                        <strong>{shortLabel}</strong>
                        <span>{campaign}</span>
                      </div>
                      <StatusPill status={request.status} />
                    </div>
                    <dl>
                      <div>
                        <dt>Kanal</dt>
                        <dd>{channel}</dd>
                      </div>
                      <div>
                        <dt>Tıklama</dt>
                        <dd>{formatNumber(request.analytics.totalClicks)}</dd>
                      </div>
                      <div>
                        <dt>Son tıklama</dt>
                        <dd>{formatLastClick(request.analytics.lastClickedAt)}</dd>
                      </div>
                    </dl>
                    <Link className="panelim-detail-link" href={`/dashboard/links/${request.id}`}>
                      Detay
                      <ArrowRightIcon />
                    </Link>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="panelim-empty">
              Henüz link talebi yok. İlk kampanya linkini oluşturduğunda burada görünür.
            </div>
          )}
        </section>

        <section className="panelim-account-actions-compact" id="hesap-sil">
          <span>Hesap işlemleri</span>
          <small>Kalıcı silme işlemi.</small>
          <DeleteAccountButton />
        </section>
      </div>

      {isCreateOpen ? (
        <CreateLinkModal
          feedback={feedback}
          initialTargetUrl={initialTargetUrl}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
    </main>
  );
}
