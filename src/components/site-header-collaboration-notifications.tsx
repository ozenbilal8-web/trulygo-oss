"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { getLinkVitrineCollaborationNotificationsAction } from "@/app/dashboard/link-vitrini/collaboration-actions";
import { LinkVitrineCollaborationRequestDetailModal } from "@/components/link-vitrine-collaboration-request-detail-modal";
import {
  getLinkVitrineCollaborationNotificationBadgeLabel,
  getLinkVitrineCollaborationNotificationSubject,
  getNewestLinkVitrineCollaborationNotifications,
  type LinkVitrineCollaborationNotificationSnapshot,
  type LinkVitrineCollaborationNotificationSummary,
  type LinkVitrineCollaborationStatus,
} from "@/lib/link-vitrine-collaboration";

type CollaborationNotificationsResult =
  | {
      ok: true;
      snapshot: LinkVitrineCollaborationNotificationSnapshot;
    }
  | {
      ok: false;
      error: "unavailable";
      hasVitrine: boolean;
    };

type PanelPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

type HeaderPopupEventDetail = {
  source?: string;
};

const HEADER_POPUP_EVENT = "trulygo:header-popup-open";
const HEADER_POPUP_SOURCE = "link-vitrine-collaboration-notifications";
const PANEL_EDGE_GAP = 12;
const PANEL_SIDE_OFFSET = 8;
const PANEL_MAX_WIDTH = 360;
const POLL_INTERVAL_MS = 60_000;

function getViewportBox() {
  const viewport = window.visualViewport;

  return {
    height: viewport?.height ?? window.innerHeight,
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  if (maximum < minimum) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

export function SiteHeaderCollaborationNotifications({
  initialResult,
}: {
  initialResult: CollaborationNotificationsResult;
}) {
  const pathname = usePathname();
  const reactId = useId();
  const panelId = `site-collaboration-notifications-${reactId.replaceAll(":", "")}`;
  const badgeDescriptionId = `${panelId}-badge-description`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const statusRevisionRef = useRef(0);
  const statusMutationSequenceRef = useRef(0);
  const latestStatusMutationByRequestRef = useRef(
    new Map<string, number>(),
  );
  const routeRef = useRef(pathname);
  const hasFocusedPanelRef = useRef(false);
  const [snapshot, setSnapshot] =
    useState<LinkVitrineCollaborationNotificationSnapshot | null>(
      initialResult.ok ? initialResult.snapshot : null,
    );
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(!initialResult.ok);
  const [hasVitrineHint, setHasVitrineHint] = useState(
    initialResult.ok
      ? initialResult.snapshot.hasVitrine
      : initialResult.hasVitrine,
  );
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<LinkVitrineCollaborationNotificationSummary | null>(null);
  const requests = useMemo(
    () =>
      getNewestLinkVitrineCollaborationNotifications(snapshot?.requests ?? []),
    [snapshot?.requests],
  );
  const badgeLabel = hasLoadError
    ? null
    : getLinkVitrineCollaborationNotificationBadgeLabel(
        snapshot?.unreadCount ?? 0,
      );
  const hasVitrine =
    snapshot?.hasVitrine === true ||
    (snapshot === null && hasVitrineHint);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const viewport = getViewportBox();
    const availableWidth = Math.max(
      0,
      viewport.width - PANEL_EDGE_GAP * 2,
    );
    const width = Math.min(PANEL_MAX_WIDTH, availableWidth);
    const minimumLeft = viewport.left + PANEL_EDGE_GAP;
    const maximumLeft =
      viewport.left + viewport.width - width - PANEL_EDGE_GAP;
    const top = triggerRect.bottom + PANEL_SIDE_OFFSET;
    const viewportBottom =
      viewport.top + viewport.height - PANEL_EDGE_GAP;

    setPanelPosition({
      left: clamp(triggerRect.right - width, minimumLeft, maximumLeft),
      maxHeight: Math.max(0, viewportBottom - top),
      top,
      width,
    });
  }, []);

  const refreshNotifications = useCallback(() => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setIsRefreshing(true);
    const statusRevision = statusRevisionRef.current;
    const pending = (async () => {
      try {
        const result =
          await getLinkVitrineCollaborationNotificationsAction();

        if (!result.ok) {
          setHasVitrineHint((current) => current || result.hasVitrine);
          setHasLoadError(true);
          return;
        }

        setHasVitrineHint(result.snapshot.hasVitrine);
        setHasLoadError(false);

        if (statusRevision !== statusRevisionRef.current) {
          return;
        }

        setSnapshot(result.snapshot);

        if (!result.snapshot.hasVitrine) {
          setIsOpen(false);
          setSelectedRequest(null);
        }
      } catch {
        setHasLoadError(true);
      } finally {
        setIsRefreshing(false);
      }
    })();

    inFlightRef.current = pending;
    void pending.finally(() => {
      if (inFlightRef.current === pending) {
        inFlightRef.current = null;
      }
    });

    return pending;
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const queueAuthoritativeRefresh = useCallback(() => {
    const refreshAfterCurrentRequest = () => {
      window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          void refreshNotifications();
        }
      }, 0);
    };
    const currentRefresh = inFlightRef.current;

    if (currentRefresh) {
      void currentRefresh.finally(refreshAfterCurrentRequest);
      return;
    }

    refreshAfterCurrentRequest();
  }, [refreshNotifications]);

  const openPanel = useCallback(() => {
    hasFocusedPanelRef.current = false;
    updatePanelPosition();
    window.dispatchEvent(
      new CustomEvent<HeaderPopupEventDetail>(HEADER_POPUP_EVENT, {
        detail: { source: HEADER_POPUP_SOURCE },
      }),
    );
    setIsOpen(true);
    void refreshNotifications();
  }, [refreshNotifications, updatePanelPosition]);

  const handleTriggerClick = useCallback(() => {
    if (isOpen) {
      closePanel();
      return;
    }

    openPanel();
  }, [closePanel, isOpen, openPanel]);

  const handleRequestClick = useCallback(
    (request: LinkVitrineCollaborationNotificationSummary) => {
      setIsOpen(false);
      setSelectedRequest(request);
    },
    [],
  );

  const handleStatusMutationStart = useCallback((requestId: string) => {
    const mutationRevision = statusMutationSequenceRef.current + 1;
    statusMutationSequenceRef.current = mutationRevision;
    latestStatusMutationByRequestRef.current.set(
      requestId,
      mutationRevision,
    );
    return mutationRevision;
  }, []);

  const handleStatusChange = useCallback(
    (
      requestId: string,
      status: LinkVitrineCollaborationStatus,
      mutationRevision?: number,
    ) => {
      statusRevisionRef.current += 1;

      if (
        mutationRevision !== undefined &&
        latestStatusMutationByRequestRef.current.get(requestId) !==
          mutationRevision
      ) {
        queueAuthoritativeRefresh();
        return;
      }

      setSnapshot((current) => {
        if (!current) {
          return current;
        }

        const currentRequest = current.requests.find(
          (request) => request.id === requestId,
        );
        const previousStatus =
          currentRequest?.status ??
          (selectedRequest?.id === requestId
            ? selectedRequest.status
            : null);

        if (!previousStatus || previousStatus === status) {
          return current;
        }

        const unreadDelta =
          Number(status === "new") - Number(previousStatus === "new");

        return {
          ...current,
          requests: current.requests.map((request) =>
            request.id === requestId ? { ...request, status } : request,
          ),
          unreadCount: Math.max(0, current.unreadCount + unreadDelta),
        };
      });
      setSelectedRequest((current) =>
        current?.id === requestId ? { ...current, status } : current,
      );
    },
    [queueAuthoritativeRefresh, selectedRequest],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let positionFrame = 0;
    const schedulePositionUpdate = () => {
      window.cancelAnimationFrame(positionFrame);
      positionFrame = window.requestAnimationFrame(updatePanelPosition);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        !(target instanceof Node) ||
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);
    window.visualViewport?.addEventListener(
      "resize",
      schedulePositionUpdate,
    );
    window.visualViewport?.addEventListener(
      "scroll",
      schedulePositionUpdate,
    );

    return () => {
      window.cancelAnimationFrame(positionFrame);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      window.visualViewport?.removeEventListener(
        "resize",
        schedulePositionUpdate,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        schedulePositionUpdate,
      );
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen || !panelPosition) {
      return;
    }

    const activeElement = document.activeElement;
    const focusRemainsInPanel =
      activeElement instanceof Node &&
      panelRef.current?.contains(activeElement) === true;

    if (hasFocusedPanelRef.current) {
      if (focusRemainsInPanel) {
        return;
      }

      if (
        activeElement instanceof HTMLElement &&
        activeElement !== document.body
      ) {
        return;
      }
    }

    const frame = window.requestAnimationFrame(() => {
      const initialFocus =
        panelRef.current?.querySelector<HTMLElement>(
          "[data-site-collaboration-notifications-initial-focus]:not([disabled])",
        ) ?? panelRef.current;

      initialFocus?.focus();
      hasFocusedPanelRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasLoadError, isOpen, isRefreshing, panelPosition, requests]);

  useEffect(() => {
    function handleHeaderPopup(event: Event) {
      const detail = (
        event as CustomEvent<HeaderPopupEventDetail>
      ).detail;

      if (detail?.source !== HEADER_POPUP_SOURCE) {
        setIsOpen(false);
      }
    }

    window.addEventListener(HEADER_POPUP_EVENT, handleHeaderPopup);
    return () =>
      window.removeEventListener(HEADER_POPUP_EVENT, handleHeaderPopup);
  }, []);

  useEffect(() => {
    if (routeRef.current === pathname) {
      return;
    }

    routeRef.current = pathname;
    const timeout = window.setTimeout(() => setIsOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!hasVitrine && !hasLoadError) {
      return;
    }

    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    const startPolling = () => {
      stopPolling();

      if (document.visibilityState !== "visible") {
        return;
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void refreshNotifications();
        }
      }, POLL_INTERVAL_MS);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
        startPolling();
      } else {
        stopPolling();
      }
    };
    const handleWindowFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [hasLoadError, hasVitrine, refreshNotifications]);

  if (!hasVitrine) {
    return null;
  }

  const panelStyle = panelPosition
    ? ({
        left: panelPosition.left,
        maxHeight: panelPosition.maxHeight,
        position: "fixed",
        top: panelPosition.top,
        width: panelPosition.width,
      } satisfies CSSProperties)
    : undefined;
  const canUsePortal = typeof document !== "undefined";

  return (
    <>
      <span className="site-collaboration-notifications">
        <button
          aria-controls={panelId}
          aria-describedby={badgeLabel ? badgeDescriptionId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="İş birliği bildirimleri"
          className="site-collaboration-notifications-button"
          data-link-vitrine-collaboration-notifications-trigger
          onClick={handleTriggerClick}
          ref={triggerRef}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M10 21h4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
          {badgeLabel ? (
            <>
              <span
                aria-hidden="true"
                className="site-collaboration-notifications-badge"
              >
                {badgeLabel}
              </span>
              <span className="sr-only" id={badgeDescriptionId}>
                {snapshot?.unreadCount} okunmamış iş birliği talebi
              </span>
            </>
          ) : null}
        </button>
      </span>

      {isOpen && panelPosition && canUsePortal
        ? createPortal(
            <section
              aria-busy={isRefreshing || undefined}
              aria-labelledby={`${panelId}-title`}
              aria-modal="false"
              className="site-collaboration-notifications-panel"
              id={panelId}
              ref={panelRef}
              role="dialog"
              style={panelStyle}
              tabIndex={-1}
            >
              <div className="site-collaboration-notifications-panel-head">
                <h2 id={`${panelId}-title`}>
                  İş Birliği Talepleri
                </h2>
              </div>

              <ul className="site-collaboration-notifications-list">
                {hasLoadError ? (
                  <li className="site-collaboration-notifications-state">
                    <span role="alert">
                      Bildirimler şu anda yüklenemiyor.
                    </span>
                    <button
                      data-site-collaboration-notifications-initial-focus
                      disabled={isRefreshing}
                      onClick={() => void refreshNotifications()}
                      type="button"
                    >
                      Tekrar dene
                    </button>
                  </li>
                ) : requests.length === 0 ? (
                  <li className="site-collaboration-notifications-state">
                    Henüz iş birliği talebi yok.
                  </li>
                ) : (
                  requests.map((request, index) => {
                    const subject =
                      getLinkVitrineCollaborationNotificationSubject(
                        request.subject,
                      );
                    const isUnread = request.status === "new";

                    return (
                      <li key={request.id}>
                        <button
                          className={`site-collaboration-notifications-item${
                            isUnread ? " is-unread" : ""
                          }`}
                          data-site-collaboration-notifications-initial-focus={
                            index === 0 ? "" : undefined
                          }
                          onClick={() => handleRequestClick(request)}
                          type="button"
                        >
                          {isUnread ? (
                            <>
                              <span className="sr-only">Okunmamış: </span>
                              <span
                                aria-hidden="true"
                                className="site-collaboration-notifications-unread"
                              />
                            </>
                          ) : null}
                          <span className="site-collaboration-notifications-item-subject">
                            {subject}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>,
            document.body,
          )
        : null}

      <LinkVitrineCollaborationRequestDetailModal
        onClose={() => setSelectedRequest(null)}
        onStatusMutationStart={handleStatusMutationStart}
        onStatusChange={handleStatusChange}
        request={selectedRequest}
      />
    </>
  );
}
