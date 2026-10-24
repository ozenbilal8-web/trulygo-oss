"use client";

import Link from "next/link";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveLinkVitrineAction } from "./actions";
import { LinkVitrinePhonePreview, PlatformIcon } from "@/components/link-vitrine-public-view";
import { LinkVitrineCollaborationSettingsEditor } from "@/components/link-vitrine-collaboration-editor";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { QrCodeCard } from "@/components/qr-code-card";
import {
  DEFAULT_BANNER_POSITION,
  LINK_VITRINE_ANIMATION_TYPES,
  LINK_VITRINE_PLATFORM_CATEGORIES,
  LINK_VITRINE_PLATFORMS,
  LINK_VITRINE_SPONSORED_LABELS,
  LINK_VITRINE_THEMES,
  buildVitrineInitials,
  clampBannerPosition,
  getLinkVitrinePlatform,
  getLinkVitrinePlatformsByCategory,
  normalizeVitrineHandle,
  validatePlatformUrl,
  type LinkVitrineAnimationType,
  type LinkVitrineItemInput,
  type LinkVitrinePlatform,
  type LinkVitrinePlatformCategory,
  type LinkVitrineSponsoredLabel,
  type LinkVitrineTheme,
} from "@/lib/link-vitrine-config";
import {
  formatLinkVitrineProfileViewCount,
  type LinkVitrineProfileViewCount,
} from "@/lib/link-vitrine-profile-views";
import type { LinkVitrine } from "@/lib/link-vitrines";
import type { LinkVitrineCollaborationSettings } from "@/lib/link-vitrine-collaboration";

type Feedback = {
  message: string;
  tone: "error" | "success";
} | null;

type EditorTab = "edit" | "preview";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const BANNER_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_PLATFORM_LABEL_LENGTH = 48;
const DEFAULT_SPONSORED_LABEL: LinkVitrineSponsoredLabel = "sponsored";
const DEFAULT_LINK_ANIMATION: LinkVitrineAnimationType = "glow";

type PlatformSummary = {
  isActive: boolean;
  linkCount: number;
  platform: (typeof LINK_VITRINE_PLATFORMS)[number];
  rows: LinkVitrine["items"];
};

type DraftPlatformLink = {
  animationEnabled: boolean;
  animationType: LinkVitrineAnimationType;
  clientKey: string;
  createdAt: string | null;
  id: string | null;
  isSponsored: boolean;
  label: string;
  sortOrder: string;
  sponsoredLabel: LinkVitrineSponsoredLabel;
  updatedAt: string | null;
  url: string;
};

let nextDraftPlatformLinkKey = 0;

function toEditableVitrine(vitrine: LinkVitrine): LinkVitrine {
  return {
    ...vitrine,
    items: vitrine.items.map((item) => ({ ...item })),
  };
}

function hasLinkUrl(item: LinkVitrineItemInput) {
  return Boolean(item.url?.trim());
}

function getPlatformRows(items: LinkVitrine["items"], platform: LinkVitrinePlatform) {
  return items
    .filter((item) => item.platform === platform)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function createPlatformPlaceholder(
  platform: LinkVitrinePlatform,
): LinkVitrine["items"][number] {
  const platformMeta = getLinkVitrinePlatform(platform);

  return {
    id: null,
    platform,
    label: platformMeta?.label ?? platform,
    url: null,
    isActive: false,
    sortOrder: 0,
    isSponsored: false,
    sponsoredLabel: null,
    animationEnabled: false,
    animationType: null,
    createdAt: null,
    updatedAt: null,
  };
}

function createDraftPlatformLink(patch: Partial<DraftPlatformLink> = {}): DraftPlatformLink {
  nextDraftPlatformLinkKey += 1;

  return {
    animationEnabled: false,
    animationType: DEFAULT_LINK_ANIMATION,
    clientKey: `link-vitrine-draft-${nextDraftPlatformLinkKey}`,
    createdAt: null,
    id: null,
    isSponsored: false,
    label: "",
    sortOrder: "",
    sponsoredLabel: DEFAULT_SPONSORED_LABEL,
    updatedAt: null,
    url: "",
    ...patch,
  };
}

function getPlatformSummaries(items: LinkVitrine["items"]): PlatformSummary[] {
  return LINK_VITRINE_PLATFORMS.map((platform) => {
    const rows = getPlatformRows(items, platform.id);
    const linkCount = rows.filter(hasLinkUrl).length;

    return {
      isActive: rows.some((item) => item.isActive && hasLinkUrl(item)),
      linkCount,
      platform,
      rows:
        rows.length > 0
          ? rows
          : [createPlatformPlaceholder(platform.id)],
    };
  });
}

function replacePlatformRows(
  items: LinkVitrine["items"],
  platform: LinkVitrinePlatform,
  rows: LinkVitrine["items"],
) {
  return [
    ...items.filter((item) => item.platform !== platform),
    ...rows,
  ];
}

function serializeVitrineItems(items: LinkVitrine["items"]) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      platform: item.platform,
      label: item.label,
      url: item.url,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      isSponsored: item.isSponsored,
      sponsoredLabel: item.isSponsored ? item.sponsoredLabel : null,
      animationEnabled: item.animationEnabled,
      animationType: item.animationEnabled ? item.animationType : null,
    })),
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v12M6 10l6-6 6 6M4 20h16" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <rect x="4" y="4" width="11" height="11" rx="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <span className="link-vitrine-field-label">
      <span>{children}</span>
      {hint ? <small>{hint}</small> : null}
    </span>
  );
}

function ThemeOption({
  active,
  id,
  label,
  onSelect,
  swatch,
}: {
  active: boolean;
  id: LinkVitrineTheme;
  label: string;
  onSelect: (theme: LinkVitrineTheme) => void;
  swatch: [string, string, string];
}) {
  return (
    <label className={active ? "link-vitrine-theme-option is-active" : "link-vitrine-theme-option"}>
      <input
        checked={active}
        name="theme"
        onChange={() => onSelect(id)}
        type="radio"
        value={id}
      />
      <span className="link-vitrine-theme-swatch" style={{ "--swatch-a": swatch[0], "--swatch-b": swatch[1], "--swatch-c": swatch[2] } as CSSProperties}>
        <i />
        <b />
        <b />
      </span>
      <span>
        {label}
        {active ? <CheckIcon /> : null}
      </span>
    </label>
  );
}

export function LinkVitrineEditor({
  appOrigin,
  defaultCollaborationEmail,
  feedback,
  initialCollaborationSettings,
  initialProfileViewCount,
  initialVitrine,
  mode,
}: {
  appOrigin: string;
  defaultCollaborationEmail: string;
  feedback: Feedback;
  initialCollaborationSettings: LinkVitrineCollaborationSettings | null;
  initialProfileViewCount: LinkVitrineProfileViewCount;
  initialVitrine: LinkVitrine;
  mode: "new" | "edit";
}) {
  const [vitrine, setVitrine] = useState(() => toEditableVitrine(initialVitrine));
  const [tab, setTab] = useState<EditorTab>("edit");
  const [platformCategory, setPlatformCategory] =
    useState<LinkVitrinePlatformCategory>("social");
  const [copied, setCopied] = useState(false);
  const [collaborationAvailable, setCollaborationAvailable] = useState(
    Boolean(
      initialCollaborationSettings?.requestsEnabled &&
        initialCollaborationSettings.verificationStatus === "verified",
    ),
  );
  const [collaborationSettingsPending, setCollaborationSettingsPending] =
    useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<LinkVitrinePlatform | null>(null);
  const [draftPlatformLinks, setDraftPlatformLinks] = useState<DraftPlatformLink[]>([]);
  const [platformModalError, setPlatformModalError] = useState<string | null>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const bannerPreviewRef = useRef<HTMLDivElement | null>(null);
  const bannerDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPositionX: number;
    startPositionY: number;
    width: number;
    height: number;
  } | null>(null);
  const publicUrl = `${appOrigin.replace(/\/$/, "")}/v/${vitrine.handle || "handle"}`;
  const hasSavedVitrine = Boolean(vitrine.id && vitrine.handle);
  const currentBannerUrl = removeBanner ? null : (bannerPreviewUrl ?? vitrine.bannerUrl);
  // Banner kaldırıldıysa pozisyonun preview'da ne olduğunun bir anlamı yok ama
  // save sırasında zaten default'a düşeceği için drag handler'ları da
  // currentBannerUrl yoksa devre dışı tutuyoruz.
  const bannerPositionX = currentBannerUrl ? vitrine.bannerPositionX : DEFAULT_BANNER_POSITION;
  const bannerPositionY = currentBannerUrl ? vitrine.bannerPositionY : DEFAULT_BANNER_POSITION;
  const bannerObjectPosition = `${bannerPositionX}% ${bannerPositionY}%`;
  const platformSummaries = useMemo(() => getPlatformSummaries(vitrine.items), [vitrine.items]);
  const visiblePlatformSummaries = useMemo(
    () => {
      const categoryPlatforms = new Set(
        getLinkVitrinePlatformsByCategory(platformCategory).map((platform) => platform.id),
      );

      return platformSummaries.filter((summary) =>
        categoryPlatforms.has(summary.platform.id),
      );
    },
    [platformCategory, platformSummaries],
  );
  const serializedItems = useMemo(() => serializeVitrineItems(vitrine.items), [vitrine.items]);
  const previewVitrine = useMemo(
    () => ({
      ...vitrine,
      avatarUrl: avatarPreviewUrl ?? vitrine.avatarUrl,
      bannerUrl: currentBannerUrl,
      bannerPositionX,
      bannerPositionY,
    }),
    [avatarPreviewUrl, bannerPositionX, bannerPositionY, currentBannerUrl, vitrine],
  );
  const activeCount = useMemo(
    () => vitrine.items.filter((item) => item.isActive && hasLinkUrl(item)).length,
    [vitrine.items],
  );
  const animatedActiveCount = useMemo(
    () =>
      vitrine.items.filter(
        (item) => item.isActive && hasLinkUrl(item) && item.animationEnabled,
      ).length,
    [vitrine.items],
  );
  const editingPlatformMeta = editingPlatform ? getLinkVitrinePlatform(editingPlatform) : null;
  const initials = buildVitrineInitials(vitrine.displayName);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      if (bannerPreviewUrl) {
        URL.revokeObjectURL(bannerPreviewUrl);
      }
    };
  }, [avatarPreviewUrl, bannerPreviewUrl]);

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function resetAvatarInput() {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  function resetBannerInput() {
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  }

  function clearAvatarPreview() {
    setAvatarPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
  }

  function clearBannerPreview() {
    setBannerPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
  }

  function handleAvatarChange(file: File | null) {
    if (!file) {
      setAvatarError(null);
      clearAvatarPreview();
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError("Profil fotoğrafı PNG, JPG veya WEBP formatında olmalı.");
      clearAvatarPreview();
      resetAvatarInput();
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Fotoğraf en fazla 2 MB olabilir.");
      clearAvatarPreview();
      resetAvatarInput();
      return;
    }

    setAvatarError(null);
    setAvatarPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return URL.createObjectURL(file);
    });
  }

  function handleBannerChange(file: File | null) {
    if (!file) {
      setBannerError(null);
      clearBannerPreview();
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setBannerError("Sadece JPG, PNG veya WEBP yükleyebilirsin.");
      clearBannerPreview();
      resetBannerInput();
      return;
    }

    if (file.size > BANNER_MAX_BYTES) {
      setBannerError("Banner görseli en fazla 5 MB olabilir.");
      clearBannerPreview();
      resetBannerInput();
      return;
    }

    setBannerError(null);
    setRemoveBanner(false);
    setBannerPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return URL.createObjectURL(file);
    });
  }

  function handleRemoveBanner() {
    setBannerError(null);
    setRemoveBanner(true);
    clearBannerPreview();
    resetBannerInput();
    // Banner kaldırılınca pozisyon değerlerini varsayılana (50/50) çekiyoruz
    // ki hem önizleme tutarlı olsun hem de save action varsayılan değerlerle
    // yazsın.
    setVitrine((current) => ({
      ...current,
      bannerPositionX: DEFAULT_BANNER_POSITION,
      bannerPositionY: DEFAULT_BANNER_POSITION,
    }));
    bannerDragStateRef.current = null;
    setIsDraggingBanner(false);
  }

  function handleBannerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!currentBannerUrl) {
      return;
    }

    const element = bannerPreviewRef.current;

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Eski tarayıcılarda setPointerCapture yoksa pointermove event'leri yine
      // de element üzerinde gelir; capture olmadan da drag çalışır.
    }

    bannerDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPositionX: vitrine.bannerPositionX,
      startPositionY: vitrine.bannerPositionY,
      width: rect.width,
      height: rect.height,
    };
    setIsDraggingBanner(true);
    event.preventDefault();
  }

  function handleBannerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = bannerDragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    // object-position ile drag mantığı ters: kullanıcı görseli sağa sürükledikçe
    // object-position-x DÜŞMELİ (sol kenar daha çok görünsün). dx/width ve
    // dy/height ile container'a göre orantılı bir değişim uyguluyoruz.
    const nextX = clampBannerPosition(
      dragState.startPositionX - (dx / dragState.width) * 100,
    );
    const nextY = clampBannerPosition(
      dragState.startPositionY - (dy / dragState.height) * 100,
    );

    setVitrine((current) =>
      current.bannerPositionX === nextX && current.bannerPositionY === nextY
        ? current
        : { ...current, bannerPositionX: nextX, bannerPositionY: nextY },
    );
  }

  function handleBannerPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = bannerDragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    bannerDragStateRef.current = null;
    setIsDraggingBanner(false);

    const element = bannerPreviewRef.current;

    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  }

  function getDisplayLabel(platform: LinkVitrinePlatform, label: string) {
    const platformMeta = getLinkVitrinePlatform(platform);
    const normalizedLabel = label.trim();

    return normalizedLabel || platformMeta?.label || platform;
  }

  function getNextAvailableDisplayOrder(
    items: LinkVitrine["items"],
    draftRows: Array<Pick<DraftPlatformLink, "sortOrder" | "url">> = [],
    excludedPlatform?: LinkVitrinePlatform,
  ) {
    const usedOrders = new Set<number>();

    for (const item of items) {
      if (item.platform === excludedPlatform) {
        continue;
      }

      if (item.isActive && hasLinkUrl(item) && Number.isInteger(item.sortOrder) && item.sortOrder > 0) {
        usedOrders.add(item.sortOrder);
      }
    }

    for (const draftRow of draftRows) {
      const order = Number(draftRow.sortOrder);

      if (Number.isInteger(order) && order > 0) {
        usedOrders.add(order);
      }
    }

    let nextOrder = 1;

    while (usedOrders.has(nextOrder)) {
      nextOrder += 1;
    }

    return nextOrder;
  }

  function getDisplayOrderNumber(value: string) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }

  function getOrderConflictMessage({
    isActive,
    platform,
    rows,
  }: {
    isActive: boolean;
    platform: LinkVitrinePlatform;
    rows: DraftPlatformLink[];
  }) {
    if (!isActive) {
      return null;
    }

    const usedOrders = new Map<number, string>();

    for (const item of vitrine.items) {
      if (item.platform === platform || !item.isActive || !hasLinkUrl(item)) {
        continue;
      }

      if (Number.isInteger(item.sortOrder) && item.sortOrder > 0) {
        usedOrders.set(
          item.sortOrder,
          `${getLinkVitrinePlatform(item.platform)?.label ?? item.platform} - ${getDisplayLabel(item.platform, item.label)}`,
        );
      }
    }

    for (const row of rows) {
      if (!row.url.trim()) {
        continue;
      }

      const order = getDisplayOrderNumber(row.sortOrder);

      if (!order) {
        return "Aktif bağlantılar için Gösterim Sırası zorunlu. Lütfen 1 veya daha büyük bir sayı girin.";
      }

      const owner = usedOrders.get(order);

      if (owner) {
        return `Bu gösterim sırası ${owner} tarafından kullanılıyor.`;
      }

      usedOrders.set(order, `${getLinkVitrinePlatform(platform)?.label ?? platform} - ${getDisplayLabel(platform, row.label)}`);
    }

    return null;
  }

  function openPlatformEditor(platform: LinkVitrinePlatform, message?: string) {
    const platformMeta = getLinkVitrinePlatform(platform);
    const rows = getPlatformRows(vitrine.items, platform).filter(hasLinkUrl);
    const draftRows =
      rows.length > 0
        ? rows.map((item) => createDraftPlatformLink({
            animationEnabled: item.animationEnabled,
            animationType: item.animationType ?? DEFAULT_LINK_ANIMATION,
            createdAt: item.createdAt,
            id: item.id,
            isSponsored: item.isSponsored,
            label: item.label === platformMeta?.label ? "" : item.label,
            sortOrder: item.sortOrder > 0 ? String(item.sortOrder) : "",
            sponsoredLabel: item.sponsoredLabel ?? DEFAULT_SPONSORED_LABEL,
            updatedAt: item.updatedAt,
            url: item.url ?? "",
          }))
        : [
            createDraftPlatformLink({
              sortOrder: String(getNextAvailableDisplayOrder(vitrine.items, [], platform)),
            }),
          ];

    setEditingPlatform(platform);
    setDraftPlatformLinks(draftRows);
    setPlatformModalError(message ?? null);
  }

  function closePlatformEditor() {
    setEditingPlatform(null);
    setDraftPlatformLinks([]);
    setPlatformModalError(null);
  }

  function updateDraftPlatformLink(index: number, patch: Partial<DraftPlatformLink>) {
    setDraftPlatformLinks((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function addDraftPlatformLink() {
    setDraftPlatformLinks((current) => [
      ...current,
      createDraftPlatformLink({
        sortOrder: String(getNextAvailableDisplayOrder(vitrine.items, current, editingPlatform ?? undefined)),
      }),
    ]);
    setPlatformModalError(null);
  }

  function removeDraftPlatformLink(index: number) {
    setDraftPlatformLinks((current) => {
      const nextRows = current.filter((_, itemIndex) => itemIndex !== index);
      return nextRows.length > 0
        ? nextRows
        : [
            createDraftPlatformLink({
              sortOrder: String(getNextAvailableDisplayOrder(vitrine.items, [], editingPlatform ?? undefined)),
            }),
          ];
    });
    setPlatformModalError(null);
  }

  function togglePlatform(platform: LinkVitrinePlatform, isActive: boolean) {
    const summary = platformSummaries.find((item) => item.platform.id === platform);

    if (isActive && (!summary || summary.linkCount === 0)) {
      const platformMeta = getLinkVitrinePlatform(platform);
      openPlatformEditor(
        platform,
        `${platformMeta?.label ?? "Bu platform"} için önce en az bir bağlantı eklemelisin.`,
      );
      return;
    }

    if (isActive && summary) {
      const draftRows = getPlatformRows(vitrine.items, platform)
        .filter(hasLinkUrl)
        .map((item) => createDraftPlatformLink({
          animationEnabled: item.animationEnabled,
          animationType: item.animationType ?? DEFAULT_LINK_ANIMATION,
          createdAt: item.createdAt,
          id: item.id,
          isSponsored: item.isSponsored,
          label: item.label,
          sortOrder: item.sortOrder > 0 ? String(item.sortOrder) : "",
          sponsoredLabel: item.sponsoredLabel ?? DEFAULT_SPONSORED_LABEL,
          updatedAt: item.updatedAt,
          url: item.url ?? "",
        }));
      const conflictMessage = getOrderConflictMessage({
        isActive: true,
        platform,
        rows: draftRows,
      });

      if (conflictMessage) {
        openPlatformEditor(platform, conflictMessage);
        return;
      }
    }

    setVitrine((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.platform === platform
          ? { ...item, isActive: isActive && hasLinkUrl(item) }
          : item,
      ),
    }));
  }

  function savePlatformLinks() {
    if (!editingPlatform || !editingPlatformMeta) {
      return;
    }

    const currentSummary = platformSummaries.find(
      (summary) => summary.platform.id === editingPlatform,
    );
    const shouldActivateAfterSave = currentSummary
      ? currentSummary.isActive || currentSummary.linkCount === 0
      : true;
    const savedRows: LinkVitrine["items"] = [];

    for (const draftRow of draftPlatformLinks) {
      const rawUrl = draftRow.url.trim();
      const label = draftRow.label.trim();

      if (!rawUrl) {
        continue;
      }

      const validation = validatePlatformUrl(editingPlatform, rawUrl);

      if (validation.error || !validation.url) {
        setPlatformModalError(
          `${editingPlatformMeta.label} bağlantısı ${validation.error ?? "geçerli değil"}`,
        );
        return;
      }

      if (label.length > MAX_PLATFORM_LABEL_LENGTH) {
        setPlatformModalError("Görünen ad en fazla 48 karakter olabilir.");
        return;
      }

      const parsedOrder = getDisplayOrderNumber(draftRow.sortOrder);

      if (shouldActivateAfterSave && !parsedOrder) {
        setPlatformModalError(
          "Aktif bağlantılar için Gösterim Sırası zorunlu. Lütfen 1 veya daha büyük bir sayı girin.",
        );
        return;
      }

      savedRows.push({
        id: draftRow.id,
        platform: editingPlatform,
        label: label || editingPlatformMeta.label,
        url: validation.url,
        isActive: Boolean(shouldActivateAfterSave),
        sortOrder: parsedOrder ?? getNextAvailableDisplayOrder(vitrine.items, savedRows.map((item) => ({
          animationEnabled: item.animationEnabled,
          animationType: item.animationType ?? DEFAULT_LINK_ANIMATION,
          isSponsored: item.isSponsored,
          label: item.label,
          sortOrder: String(item.sortOrder),
          sponsoredLabel: item.sponsoredLabel ?? DEFAULT_SPONSORED_LABEL,
          url: item.url ?? "",
        })), editingPlatform),
        isSponsored: draftRow.isSponsored,
        sponsoredLabel: draftRow.isSponsored ? draftRow.sponsoredLabel : null,
        animationEnabled: draftRow.animationEnabled,
        animationType: draftRow.animationEnabled ? draftRow.animationType : null,
        createdAt: draftRow.createdAt,
        updatedAt: draftRow.updatedAt,
      });
    }

    const conflictMessage = getOrderConflictMessage({
      isActive: Boolean(shouldActivateAfterSave),
      platform: editingPlatform,
      rows: savedRows.map((item) => createDraftPlatformLink({
        animationEnabled: item.animationEnabled,
        animationType: item.animationType ?? DEFAULT_LINK_ANIMATION,
        isSponsored: item.isSponsored,
        label: item.label,
        sortOrder: String(item.sortOrder),
        sponsoredLabel: item.sponsoredLabel ?? DEFAULT_SPONSORED_LABEL,
        url: item.url ?? "",
      })),
    });

    if (conflictMessage) {
      setPlatformModalError(conflictMessage);
      return;
    }

    const nextRows =
      savedRows.length > 0
        ? savedRows
        : [createPlatformPlaceholder(editingPlatform)];

    setVitrine((current) => ({
      ...current,
      items: replacePlatformRows(current.items, editingPlatform, nextRows),
    }));
    closePlatformEditor();
  }

  return (
    <main className="link-vitrine-admin-shell">
      <form
        action={saveLinkVitrineAction}
        className="link-vitrine-editor-form"
        onSubmit={(event) => {
          if (collaborationSettingsPending) {
            event.preventDefault();
          }
        }}
      >
        <input name="id" type="hidden" value={vitrine.id ?? ""} />
        <input name="current_is_published" type="hidden" value={vitrine.isPublished ? "true" : "false"} />
        <input name="remove_banner" type="hidden" value={removeBanner ? "true" : "false"} />
        <input name="banner_position_x" type="hidden" value={String(bannerPositionX)} />
        <input name="banner_position_y" type="hidden" value={String(bannerPositionY)} />
        <input name="items_json" type="hidden" value={serializedItems} />

        <div className="link-vitrine-mobile-tabs" role="tablist" aria-label="Link Vitrini görünümü">
          <button
            aria-selected={tab === "edit"}
            className={tab === "edit" ? "is-active" : ""}
            onClick={() => setTab("edit")}
            role="tab"
            type="button"
          >
            Düzenle
          </button>
          <button
            aria-selected={tab === "preview"}
            className={tab === "preview" ? "is-active" : ""}
            onClick={() => setTab("preview")}
            role="tab"
            type="button"
          >
            Önizleme
          </button>
        </div>

        <section className={tab === "preview" ? "link-vitrine-form-pane is-hidden-mobile" : "link-vitrine-form-pane"}>
          <div className="link-vitrine-page-heading">
            <p>Link Vitrini</p>
            <h1>{mode === "new" ? "Link Vitrini oluştur" : "Link Vitrini düzenle"}</h1>
            <span>
              Sosyal medya hesaplarını ve önemli bağlantılarını tek, temiz ve güvenilir bir
              sayfada topla.
            </span>
          </div>

          {feedback ? (
            <div className={`link-vitrine-feedback link-vitrine-feedback--${feedback.tone}`} role="status">
              {feedback.message}
            </div>
          ) : null}

          {mode === "edit" ? (
            <section className="link-vitrine-public-url-card">
              <div>
                <span>Public URL</span>
                <strong>{publicUrl.replace(/^https?:\/\//i, "")}</strong>
              </div>
              <div className="link-vitrine-profile-view-stat">
                <span>Profil görüntülenmeleri</span>
                <strong>
                  {formatLinkVitrineProfileViewCount(initialProfileViewCount) ?? "—"}
                </strong>
              </div>
              <button className="link-vitrine-mini-button" onClick={copyPublicUrl} type="button">
                <CopyIcon />
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
            </section>
          ) : null}

          <section className="link-vitrine-editor-section link-vitrine-qr-section">
            {hasSavedVitrine ? (
              <QrCodeCard
                title="Link Vitrini QR kodu"
                description="Bu QR kod doğrudan public Link Vitrini sayfasını açar."
                value={publicUrl}
                pngFilename={`trulygo-vitrin-${vitrine.handle}.png`}
                svgFilename={`trulygo-vitrin-${vitrine.handle}.svg`}
                helperText="Ekstra kısa redirect slug oluşturulmaz; QR içeriği doğrudan /v/[handle] adresidir."
                collapsible
                defaultOpen={false}
              />
            ) : (
              <>
                <div className="link-vitrine-section-head">
                  <h2>Vitrin QR kodu</h2>
                  <span>Public profil</span>
                </div>
                <div className="link-vitrine-qr-empty">
                  Vitrini kaydettikten sonra QR kod oluşturulabilir.
                </div>
              </>
            )}
          </section>

          <LinkVitrineCollaborationSettingsEditor
            defaultEmail={defaultCollaborationEmail}
            initialSettings={initialCollaborationSettings}
            onEffectiveAvailabilityChange={setCollaborationAvailable}
            onPendingChange={setCollaborationSettingsPending}
            vitrineId={vitrine.id}
          />

          <section className="link-vitrine-editor-section">
            <div className="link-vitrine-section-head">
              <h2>Profil</h2>
              <span>Vitrini sayfanda görünen kimlik</span>
            </div>

            <div className="link-vitrine-banner-editor">
              <div
                className={
                  currentBannerUrl
                    ? `link-vitrine-banner-preview has-image${isDraggingBanner ? " is-dragging" : ""}`
                    : "link-vitrine-banner-preview"
                }
                onPointerCancel={handleBannerPointerEnd}
                onPointerDown={handleBannerPointerDown}
                onPointerMove={handleBannerPointerMove}
                onPointerUp={handleBannerPointerEnd}
                ref={bannerPreviewRef}
                style={
                  currentBannerUrl
                    ? {
                        cursor: isDraggingBanner ? "grabbing" : "grab",
                        touchAction: "none",
                        userSelect: "none",
                      }
                    : undefined
                }
              >
                {currentBannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    draggable={false}
                    src={currentBannerUrl}
                    style={{
                      objectPosition: bannerObjectPosition,
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <span>Banner görseli</span>
                )}
              </div>
              <div className="link-vitrine-banner-controls">
                <FieldLabel>Banner görseli</FieldLabel>
                <div className="link-vitrine-banner-actions">
                  <label className="link-vitrine-upload-placeholder">
                    <UploadIcon />
                    {currentBannerUrl ? "Bannerı değiştir" : "Banner yükle"}
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      name="banner"
                      onChange={(event) => handleBannerChange(event.target.files?.[0] ?? null)}
                      ref={bannerInputRef}
                      type="file"
                    />
                  </label>
                  {currentBannerUrl ? (
                    <button
                      className="link-vitrine-mini-button"
                      onClick={handleRemoveBanner}
                      type="button"
                    >
                      Bannerı kaldır
                    </button>
                  ) : null}
                </div>
                <p>Önerilen: 1600x900, JPG/PNG/WEBP, maksimum 5 MB.</p>
                {currentBannerUrl ? (
                  <p className="link-vitrine-banner-hint">
                    Banner görünümünü ayarlamak için görseli sürükleyebilirsin.
                  </p>
                ) : null}
                {bannerError ? (
                  <p className="link-vitrine-upload-error" role="alert">
                    {bannerError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="link-vitrine-avatar-row">
              <div className="link-vitrine-admin-avatar" aria-hidden="true">
                {previewVitrine.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={previewVitrine.avatarUrl} />
                ) : (
                  initials
                )}
              </div>
              <div>
                <label className="link-vitrine-upload-placeholder">
                  <UploadIcon />
                  Fotoğraf yükle
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    name="avatar"
                    onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                    ref={avatarInputRef}
                    type="file"
                  />
                </label>
                <p>PNG, JPG veya WEBP · Maks. 2 MB</p>
                {avatarError ? (
                  <p
                    className="link-vitrine-upload-error"
                    role="alert"
                    style={{ color: "#ff6b6b", marginTop: 4 }}
                  >
                    {avatarError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="link-vitrine-field-grid">
              <label className="link-vitrine-field">
                <FieldLabel hint={`${vitrine.displayName.length}/40`}>Görünen ad</FieldLabel>
                <input
                  maxLength={40}
                  name="display_name"
                  onChange={(event) =>
                    setVitrine((current) => ({ ...current, displayName: event.target.value }))
                  }
                  placeholder="Ad Soyad veya marka adı"
                  required
                  type="text"
                  value={vitrine.displayName}
                />
              </label>
              <label className="link-vitrine-field">
                <FieldLabel hint="küçük harf, rakam, tire">Vitrin URL</FieldLabel>
                <span className="link-vitrine-prefixed-input">
                  <b>{new URL(appOrigin).host}/v/</b>
                  <input
                    maxLength={32}
                    name="handle"
                    onChange={(event) =>
                      setVitrine((current) => ({
                        ...current,
                        handle: normalizeVitrineHandle(event.target.value),
                      }))
                    }
                    placeholder="kullaniciadi"
                    required
                    type="text"
                    value={vitrine.handle}
                  />
                </span>
              </label>
            </div>

            <label className="link-vitrine-field">
              <FieldLabel hint={`${vitrine.bio?.length ?? 0}/140`}>Kısa açıklama</FieldLabel>
              <textarea
                maxLength={140}
                name="bio"
                onChange={(event) =>
                  setVitrine((current) => ({ ...current, bio: event.target.value }))
                }
                placeholder="Birkaç kelimeyle kendini veya markanı tanıt."
                rows={3}
                value={vitrine.bio ?? ""}
              />
            </label>
          </section>

          <section className="link-vitrine-editor-section">
            <div className="link-vitrine-section-head">
              <h2>Tema</h2>
              <span>Hazır tasarımlardan birini seç</span>
            </div>
            <div className="link-vitrine-theme-grid">
              {LINK_VITRINE_THEMES.map((theme) => (
                <ThemeOption
                  active={vitrine.theme === theme.id}
                  id={theme.id}
                  key={theme.id}
                  label={theme.label}
                  onSelect={(selectedTheme) =>
                    setVitrine((current) => ({ ...current, theme: selectedTheme }))
                  }
                  swatch={theme.swatch}
                />
              ))}
            </div>
          </section>

          <section className="link-vitrine-editor-section">
            <div className="link-vitrine-section-head">
              <h2>{platformCategory === "social" ? "Sosyal Platformlar" : "Marketplace"}</h2>
              <span>{activeCount} aktif bağlantı</span>
            </div>
            <div className="link-vitrine-category-tabs" role="tablist" aria-label="Bağlantı kategorisi">
              {LINK_VITRINE_PLATFORM_CATEGORIES.map((category) => (
                <button
                  aria-selected={platformCategory === category.id}
                  className={platformCategory === category.id ? "is-active" : ""}
                  key={category.id}
                  onClick={() => setPlatformCategory(category.id)}
                  role="tab"
                  type="button"
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="link-vitrine-platform-list">
              {visiblePlatformSummaries.map((summary) => {
                const platform = summary.platform;
                const iconClassName = [
                  "link-vitrine-platform-icon",                  platform.category === "marketplace" ? "is-marketplace-logo" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const rowClassName = [
                  "link-vitrine-platform-row",
                  summary.isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const summaryText =
                  summary.linkCount > 0
                    ? `${summary.linkCount} bağlantı eklendi`
                    : "Bağlantı yok";

                return (
                  <article className={rowClassName} key={platform.id}>
                    <span
                      className={iconClassName}
                      style={{ "--platform-accent": platform.accent } as CSSProperties}
                    >
                      <PlatformIcon platform={platform.id} />
                    </span>
                    <div className="link-vitrine-platform-main">
                      <strong>{platform.label}</strong>
                      <span>{summaryText}</span>
                    </div>
                    <button
                      className="link-vitrine-edit-platform-button"
                      onClick={() => openPlatformEditor(platform.id)}
                      type="button"
                    >
                      <EditIcon />
                      Düzenle
                    </button>
                    <div className="link-vitrine-platform-state">
                      <span>{summary.isActive ? "Aktif" : "Pasif"}</span>
                      <label className="link-vitrine-toggle">
                        <input
                          checked={summary.isActive}
                          name={`${platform.id}_active`}
                          onChange={(event) => togglePlatform(platform.id, event.target.checked)}
                          type="checkbox"
                        />
                        <span />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="link-vitrine-platform-note">
              Public profilde yalnızca aktif ve dolu bağlantılar görünür.
            </p>
            {animatedActiveCount > 3 ? (
              <p className="link-vitrine-platform-warning" role="status">
                Çok fazla animasyon vitrin görünümünü yorabilir.
              </p>
            ) : null}
          </section>

        </section>

        {editingPlatform && editingPlatformMeta ? (
          <div className="link-vitrine-platform-modal-backdrop">
            <section
              aria-labelledby="link-vitrine-platform-modal-title"
              aria-modal="true"
              className="link-vitrine-platform-modal"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              role="dialog"
            >
              <div className="link-vitrine-platform-modal-head">
                <div>
                  <span
                    className={[
                      "link-vitrine-platform-icon",                      editingPlatformMeta.category === "marketplace" ? "is-marketplace-logo" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ "--platform-accent": editingPlatformMeta.accent } as CSSProperties}
                  >
                    <PlatformIcon platform={editingPlatform} />
                  </span>
                  <h3 id="link-vitrine-platform-modal-title">
                    {editingPlatformMeta.label} bağlantıları
                  </h3>
                </div>
                <button
                  aria-label="Paneli kapat"
                  className="link-vitrine-icon-button"
                  onClick={closePlatformEditor}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="link-vitrine-platform-modal-list">
                {draftPlatformLinks.map((draftRow, index) => {
                  const linkNoun =
                    editingPlatformMeta.category === "marketplace" ? "bağlantı" : "profil";
                  const urlLabel =
                    draftPlatformLinks.length === 1
                      ? `${editingPlatformMeta.label} ${linkNoun} linki`
                      : `${editingPlatformMeta.label} ${linkNoun} linki ${index + 1}`;

                  return (
                    <div className="link-vitrine-platform-modal-row" key={draftRow.clientKey}>
                      <div className="link-vitrine-platform-modal-fields">
                        <label className="link-vitrine-field">
                          <FieldLabel>{urlLabel}</FieldLabel>
                          <input
                            onChange={(event) =>
                              updateDraftPlatformLink(index, { url: event.target.value })
                            }
                            placeholder={editingPlatformMeta.placeholder}
                            type="url"
                            value={draftRow.url}
                          />
                        </label>
                        <div className="link-vitrine-platform-modal-field-grid">
                          <label className="link-vitrine-field">
                            <FieldLabel hint="Opsiyonel">Görünen ad</FieldLabel>
                            <input
                              maxLength={MAX_PLATFORM_LABEL_LENGTH}
                              onChange={(event) =>
                                updateDraftPlatformLink(index, { label: event.target.value })
                              }
                              placeholder={index === 0 ? "Ana hesap" : "Kampanya hesabı"}
                              type="text"
                              value={draftRow.label}
                            />
                          </label>
                          <label className="link-vitrine-field link-vitrine-display-order-field">
                            <FieldLabel>Gösterim Sırası</FieldLabel>
                            <input
                              inputMode="numeric"
                              min={1}
                              onChange={(event) =>
                                updateDraftPlatformLink(index, { sortOrder: event.target.value })
                              }
                              type="number"
                              value={draftRow.sortOrder}
                            />
                          </label>
                        </div>
                        <div className="link-vitrine-link-settings">
                          <label className="link-vitrine-link-setting-toggle">
                            <span>Reklam etiketi göster</span>
                            <span className="link-vitrine-toggle">
                              <input
                                checked={draftRow.isSponsored}
                                onChange={(event) =>
                                  updateDraftPlatformLink(index, {
                                    isSponsored: event.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                              <span />
                            </span>
                          </label>
                          {draftRow.isSponsored ? (
                            <label className="link-vitrine-field link-vitrine-link-setting-select">
                              <FieldLabel>Etiket tipi</FieldLabel>
                              <select
                                onChange={(event) =>
                                  updateDraftPlatformLink(index, {
                                    sponsoredLabel: event.target.value as LinkVitrineSponsoredLabel,
                                  })
                                }
                                value={draftRow.sponsoredLabel}
                              >
                                {LINK_VITRINE_SPONSORED_LABELS.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}

                          <label className="link-vitrine-link-setting-toggle">
                            <span>Dikkat çekme animasyonu</span>
                            <span className="link-vitrine-toggle">
                              <input
                                checked={draftRow.animationEnabled}
                                onChange={(event) =>
                                  updateDraftPlatformLink(index, {
                                    animationEnabled: event.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                              <span />
                            </span>
                          </label>
                          {draftRow.animationEnabled ? (
                            <label className="link-vitrine-field link-vitrine-link-setting-select">
                              <FieldLabel>Animasyon tipi</FieldLabel>
                              <select
                                onChange={(event) =>
                                  updateDraftPlatformLink(index, {
                                    animationType: event.target.value as LinkVitrineAnimationType,
                                  })
                                }
                                value={draftRow.animationType}
                              >
                                {LINK_VITRINE_ANIMATION_TYPES.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                      </div>
                      <div className="link-vitrine-platform-modal-row-actions">
                        <button
                          aria-label={`${urlLabel} sil`}
                          onClick={() => removeDraftPlatformLink(index)}
                          type="button"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="link-vitrine-add-platform-link"
                onClick={addDraftPlatformLink}
                type="button"
              >
                + Birden fazla {editingPlatformMeta.label}{" "}
                {editingPlatformMeta.category === "marketplace" ? "bağlantısı" : "hesabı"} ekle
              </button>

              {platformModalError ? (
                <p className="link-vitrine-platform-modal-error" role="alert">
                  {platformModalError}
                </p>
              ) : null}

              <div className="link-vitrine-platform-modal-actions">
                <button
                  className="link-vitrine-action-button link-vitrine-action-button--ghost"
                  onClick={closePlatformEditor}
                  type="button"
                >
                  Vazgeç
                </button>
                <button
                  className="link-vitrine-action-button link-vitrine-action-button--primary"
                  onClick={savePlatformLinks}
                  type="button"
                >
                  Kaydet
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <aside className={tab === "edit" ? "link-vitrine-preview-pane is-hidden-mobile" : "link-vitrine-preview-pane"}>
          <LinkVitrinePhonePreview
            appOrigin={appOrigin}
            collaborationAvailable={collaborationAvailable}
            vitrine={previewVitrine}
          />
          <p className="link-vitrine-publication-notice">
            Yayınladığınız görünen ad, bio, avatar/banner, aktif bağlantılar ve sponsor
            etiketleri herkese açık olur; uygun profiller arama motorlarında
            listelenebilir. Hesap e-postanız public profile eklenmez.{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer">
              KVKK bilgileri
            </Link>
          </p>
          <div className="link-vitrine-action-bar">
            <Link className="link-vitrine-action-button link-vitrine-action-button--ghost" href="/dashboard">
              Panelime dön
            </Link>
            <PendingSubmitButton
              className="link-vitrine-action-button link-vitrine-action-button--secondary"
              disabled={collaborationSettingsPending}
              intentName="intent"
              intentValue="save"
              pendingLabel="Kaydediliyor..."
            >
              Kaydet
            </PendingSubmitButton>
            <PendingSubmitButton
              className="link-vitrine-action-button link-vitrine-action-button--primary"
              disabled={collaborationSettingsPending}
              intentName="intent"
              intentValue="publish"
              pendingLabel="Yayınlanıyor..."
            >
              <CheckIcon />
              Yayınla
            </PendingSubmitButton>
          </div>
        </aside>

        <div className="link-vitrine-mobile-action-bar">
          <p className="link-vitrine-publication-notice">
            Yayınlanan profil herkese açık olabilir ve arama motorlarında listelenebilir.{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer">
              KVKK bilgileri
            </Link>
          </p>
          <PendingSubmitButton
            className="link-vitrine-action-button link-vitrine-action-button--secondary"
            disabled={collaborationSettingsPending}
            intentName="intent"
            intentValue="save"
            pendingLabel="Kaydediliyor..."
          >
            Kaydet
          </PendingSubmitButton>
          <PendingSubmitButton
            className="link-vitrine-action-button link-vitrine-action-button--primary"
            disabled={collaborationSettingsPending}
            intentName="intent"
            intentValue="publish"
            pendingLabel="Yayınlanıyor..."
          >
            <CheckIcon />
            Yayınla
          </PendingSubmitButton>
        </div>
      </form>
    </main>
  );
}
