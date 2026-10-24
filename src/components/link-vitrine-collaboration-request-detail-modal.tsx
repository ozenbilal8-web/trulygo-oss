"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getLinkVitrineCollaborationRequestDetailAction,
  updateLinkVitrineCollaborationRequestStatusAction,
} from "@/app/dashboard/link-vitrini/collaboration-actions";
import {
  buildCollaborationReplyMailto,
  formatCollaborationBudget,
  getCollaborationRequestTypeLabel,
  getCollaborationStatusLabel,
  type LinkVitrineCollaborationNotificationSummary,
  type LinkVitrineCollaborationRequestDetail,
  type LinkVitrineCollaborationStatus,
} from "@/lib/link-vitrine-collaboration";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type StatusUpdateInput = {
  expectedStatus: LinkVitrineCollaborationStatus;
  generation: number;
  newStatus: LinkVitrineCollaborationStatus;
  requestId: string;
  successMessage?: string;
};

type LinkVitrineCollaborationRequestDetailModalProps = {
  request: LinkVitrineCollaborationNotificationSummary | null;
  onClose: () => void;
  onStatusMutationStart: (requestId: string) => number;
  onStatusChange: (
    requestId: string,
    status: LinkVitrineCollaborationStatus,
    mutationRevision?: number,
  ) => void;
};

export function LinkVitrineCollaborationRequestDetailModal({
  request,
  onClose,
  onStatusMutationStart,
  onStatusChange,
}: LinkVitrineCollaborationRequestDetailModalProps) {
  if (!request) {
    return null;
  }

  return (
    <LinkVitrineCollaborationRequestDetailModalSession
      key={request.id}
      onClose={onClose}
      onStatusMutationStart={onStatusMutationStart}
      onStatusChange={onStatusChange}
      request={request}
    />
  );
}

function LinkVitrineCollaborationRequestDetailModalSession({
  request,
  onClose,
  onStatusMutationStart,
  onStatusChange,
}: Omit<LinkVitrineCollaborationRequestDetailModalProps, "request"> & {
  request: LinkVitrineCollaborationNotificationSummary;
}) {
  const [detail, setDetail] =
    useState<LinkVitrineCollaborationRequestDetail | null>(null);
  const [detailState, setDetailState] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [statusPending, setStatusPending] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const requestGenerationRef = useRef(0);
  const callbacksRef = useRef({
    onClose,
    onStatusChange,
    onStatusMutationStart,
  });
  const requestId = request.id;
  const replyHref = detail
    ? buildCollaborationReplyMailto({
        email: detail.senderEmail,
        subject: detail.subject,
      })
    : null;

  useEffect(() => {
    callbacksRef.current = {
      onClose,
      onStatusChange,
      onStatusMutationStart,
    };
  }, [onClose, onStatusChange, onStatusMutationStart]);

  const isCurrentRequest = useCallback(
    (requestId: string, generation: number) =>
      activeRequestIdRef.current === requestId &&
      requestGenerationRef.current === generation,
    [],
  );

  const persistStatus = useCallback(
    async ({
      expectedStatus,
      generation,
      newStatus,
      requestId,
      successMessage,
    }: StatusUpdateInput) => {
      const mutationRevision =
        callbacksRef.current.onStatusMutationStart(requestId);
      setStatusPending(true);
      setStatusFeedback("");

      try {
        const result =
          await updateLinkVitrineCollaborationRequestStatusAction({
            requestId,
            expectedStatus,
            newStatus,
          });

        if (!result.ok) {
          if (isCurrentRequest(requestId, generation)) {
            setStatusFeedback(
              "Durum güncellenemedi. Talep başka bir oturumda değişmiş olabilir.",
            );
          }
          return false;
        }

        callbacksRef.current.onStatusChange(
          requestId,
          result.status,
          mutationRevision,
        );

        if (!isCurrentRequest(requestId, generation)) {
          return true;
        }

        setDetail((current) =>
          current?.id === requestId
            ? { ...current, status: result.status }
            : current,
        );
        setStatusFeedback(successMessage ?? "");
        return true;
      } catch {
        if (isCurrentRequest(requestId, generation)) {
          setStatusFeedback(
            "Durum güncellenemedi. Lütfen biraz sonra tekrar deneyin.",
          );
        }
        return false;
      } finally {
        if (isCurrentRequest(requestId, generation)) {
          setStatusPending(false);
        }
      }
    },
    [isCurrentRequest],
  );

  const closeModal = useCallback(() => {
    requestGenerationRef.current += 1;
    activeRequestIdRef.current = null;
    callbacksRef.current.onClose();
  }, []);

  useEffect(() => {
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    activeRequestIdRef.current = requestId;

    async function loadDetail() {
      try {
        const result =
          await getLinkVitrineCollaborationRequestDetailAction(requestId);

        if (!isCurrentRequest(requestId, generation)) {
          return;
        }

        if (!result.ok) {
          setDetailState("error");
          return;
        }

        setDetail(result.detail);
        setDetailState("idle");

        if (result.detail.status === "new") {
          await persistStatus({
            expectedStatus: "new",
            generation,
            newStatus: "read",
            requestId,
          });
        } else {
          callbacksRef.current.onStatusChange(
            requestId,
            result.detail.status,
          );
        }
      } catch {
        if (isCurrentRequest(requestId, generation)) {
          setDetailState("error");
        }
      }
    }

    void loadDetail();

    return () => {
      if (isCurrentRequest(requestId, generation)) {
        requestGenerationRef.current += 1;
        activeRequestIdRef.current = null;
      }
    };
  }, [isCurrentRequest, persistStatus, requestId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const activeElement =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    returnFocusRef.current =
      activeElement ??
      document.querySelector<HTMLElement>(
        "[data-link-vitrine-collaboration-notifications-trigger]",
      );
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("[data-initial-focus]")
        ?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1) ?? first;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      const focusTarget =
        returnFocusRef.current?.isConnected === true
          ? returnFocusRef.current
          : document.querySelector<HTMLElement>(
              "[data-link-vitrine-collaboration-notifications-trigger]",
            );
      window.requestAnimationFrame(() => focusTarget?.focus());
    };
  }, [closeModal, requestId]);

  async function updateStatus(newStatus: LinkVitrineCollaborationStatus) {
    if (!detail || statusPending || newStatus === detail.status) {
      return;
    }

    await persistStatus({
      expectedStatus: detail.status,
      generation: requestGenerationRef.current,
      newStatus,
      requestId: detail.id,
      successMessage: "Talep durumu güncellendi.",
    });
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="link-vitrine-collaboration-owner-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        aria-labelledby="link-vitrine-collaboration-owner-modal-title"
        aria-modal="true"
        className="link-vitrine-collaboration-owner-modal"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="link-vitrine-collaboration-owner-modal-head">
          <div>
            <span>İş birliği talebi</span>
            <h3 id="link-vitrine-collaboration-owner-modal-title">
              {detail?.subject || request.subject || "Talep ayrıntıları"}
            </h3>
          </div>
          <button
            aria-label="Talep ayrıntılarını kapat"
            data-initial-focus
            onClick={closeModal}
            type="button"
          >
            ×
          </button>
        </div>

        {detailState === "loading" ? (
          <p role="status">Talep ayrıntıları yükleniyor…</p>
        ) : null}
        {detailState === "error" ? (
          <p role="alert">
            Talep bulunamadı veya bu talebi görüntüleme yetkiniz yok.
          </p>
        ) : null}
        {detail ? (
          <>
            <dl className="link-vitrine-collaboration-detail-grid">
              <div>
                <dt>Ad soyad</dt>
                <dd>{detail.senderName}</dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>{detail.senderEmail}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{detail.senderPhone ?? "Belirtilmedi"}</dd>
              </div>
              <div>
                <dt>Talep türü</dt>
                <dd>{getCollaborationRequestTypeLabel(detail.requestType)}</dd>
              </div>
              <div>
                <dt>Bütçe</dt>
                <dd>
                  {formatCollaborationBudget({
                    amount: detail.budgetAmount,
                    currency: detail.budgetCurrency,
                  }) ?? "Belirtilmedi"}
                </dd>
              </div>
              <div>
                <dt>Oluşturulma</dt>
                <dd>{formatDate(detail.createdAt)}</dd>
              </div>
              <div>
                <dt>Bildirim</dt>
                <dd>
                  {detail.notificationStatus === "sent"
                    ? "Gönderildi"
                    : detail.notificationStatus === "failed"
                      ? "Gönderilemedi"
                      : "Bekliyor"}
                </dd>
              </div>
            </dl>
            <div className="link-vitrine-collaboration-detail-message">
              <strong>{detail.subject}</strong>
              <p>{detail.message}</p>
            </div>
            <div className="link-vitrine-collaboration-detail-status">
              <span>Talep durumu</span>
              <div>
                {(
                  ["new", "read", "replied"] as LinkVitrineCollaborationStatus[]
                ).map((status) => (
                  <button
                    aria-pressed={detail.status === status}
                    className={detail.status === status ? "is-active" : ""}
                    disabled={statusPending}
                    key={status}
                    onClick={() => updateStatus(status)}
                    type="button"
                  >
                    {getCollaborationStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
            {statusFeedback ? (
              <p
                className="link-vitrine-collaboration-status-feedback"
                role="status"
              >
                {statusFeedback}
              </p>
            ) : null}
            {replyHref ? (
              <a
                className="link-vitrine-collaboration-reply-button"
                href={replyHref}
              >
                E-posta ile yanıtla
              </a>
            ) : null}
          </>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
