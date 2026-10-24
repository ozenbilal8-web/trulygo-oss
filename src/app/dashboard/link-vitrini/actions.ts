"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEFAULT_BANNER_POSITION,
  LINK_VITRINE_PLATFORMS,
  clampBannerPosition,
  createDefaultLinkVitrineItems,
  isLinkVitrineAnimationType,
  isLinkVitrinePlatform,
  isLinkVitrineSponsoredLabel,
  isLinkVitrineTheme,
  isValidVitrineHandle,
  normalizeVitrineHandle,
  validatePlatformUrl,
  type LinkVitrineAnimationType,
  type LinkVitrineItemInput,
  type LinkVitrinePlatform,
  type LinkVitrineSponsoredLabel,
} from "@/lib/link-vitrine-config";
import {
  isValidCollaborationEmail,
  normalizeCollaborationEmail,
  parseLinkVitrineCollaborationBoolean,
} from "@/lib/link-vitrine-collaboration";
import {
  checkLinkVitrineCollaborationSettingsRateLimit,
  persistOwnedLinkVitrineCollaborationSettings,
} from "@/lib/link-vitrine-collaboration-settings-server";
import { getCurrentUserId } from "@/lib/link-vitrines";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ExistingVitrine = {
  id: string;
  handle: string;
  avatar_url: string | null;
  banner_url: string | null;
  is_published: boolean;
  link_vitrine_items?: Array<{
    id: string;
  }> | null;
};

type PersistedLinkVitrineItemInput = LinkVitrineItemInput & {
  id: string | null;
};

const AVATAR_BUCKET = "link-vitrine-avatars";
const BANNER_BUCKET = "link-vitrine-banners";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PLATFORM_LABEL_LENGTH = 48;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const imageMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalField(formData: FormData, key: string) {
  const value = getField(formData, key);
  return value ? value : null;
}

const EDITOR_PATH = "/dashboard/link-vitrini/new";

function getErrorPath(error: string) {
  return `${EDITOR_PATH}?error=${error}`;
}

function getSuccessPath(intent: "publish" | "save") {
  return `${EDITOR_PATH}?message=${intent === "publish" ? "published" : "saved"}`;
}

function getIntent(formData: FormData) {
  return getField(formData, "intent") === "publish" ? "publish" : "save";
}

function getSubmittedCollaborationSettings(formData: FormData): {
  error: "invalid_collaboration_settings" | null;
  settings: {
    notificationEmail: string;
    requestsEnabled: boolean;
  } | null;
} {
  const dirtyValue = formData.get("collaboration_settings_dirty");

  // The settings loader can fail closed to a UI fallback. Only a deliberate
  // client-side change may write through the profile form, otherwise a normal
  // profile save could overwrite the real DB value with that fallback.
  if (dirtyValue === null || dirtyValue === "false") {
    return { error: null, settings: null };
  }

  if (dirtyValue !== "true") {
    return { error: "invalid_collaboration_settings", settings: null };
  }

  const requestsEnabled = parseLinkVitrineCollaborationBoolean(
    formData.get("collaboration_requests_enabled"),
  );
  const notificationEmail = normalizeCollaborationEmail(
    formData.get("collaboration_notification_email"),
  );

  if (
    requestsEnabled === undefined ||
    !isValidCollaborationEmail(notificationEmail)
  ) {
    return { error: "invalid_collaboration_settings", settings: null };
  }

  return {
    error: null,
    settings: { notificationEmail, requestsEnabled },
  };
}

function getImageFile({
  formData,
  inputName,
  invalidTypeError,
  maxSizeBytes,
  tooLargeError,
}: {
  formData: FormData;
  inputName: string;
  invalidTypeError: string;
  maxSizeBytes: number;
  tooLargeError: string;
}) {
  const value = formData.get(inputName);

  if (!(value instanceof File) || value.size === 0) {
    return { error: null, file: null, extension: null };
  }

  if (value.size > maxSizeBytes) {
    return { error: tooLargeError, file: null, extension: null };
  }

  const extension = imageMimeTypes[value.type as keyof typeof imageMimeTypes];

  if (!extension) {
    return { error: invalidTypeError, file: null, extension: null };
  }

  return { error: null, file: value, extension };
}

function getAvatarFile(formData: FormData) {
  return getImageFile({
    formData,
    inputName: "avatar",
    invalidTypeError: "avatar_invalid_type",
    maxSizeBytes: MAX_AVATAR_SIZE_BYTES,
    tooLargeError: "avatar_too_large",
  });
}

function getBannerFile(formData: FormData) {
  return getImageFile({
    formData,
    inputName: "banner",
    invalidTypeError: "banner_invalid_type",
    maxSizeBytes: MAX_BANNER_SIZE_BYTES,
    tooLargeError: "banner_too_large",
  });
}

function getStoragePathFromPublicUrl(publicUrl: string | null, bucket: string) {
  if (!publicUrl) {
    return null;
  }

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function removeStorageObjectBestEffort(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string,
) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    // Stale object cleanup is best-effort: the DB row is already authoritative,
    // so a failed storage delete only leaves an orphan file. Logging is enough.
    console.warn("[link-vitrine] failed to remove stale storage object", {
      bucket,
      path,
      message: error.message,
    });
  }
}

async function uploadAvatar({
  existingAvatarUrl,
  extension,
  file,
  supabase,
  userId,
  vitrineId,
}: {
  existingAvatarUrl: string | null;
  extension: string;
  file: File;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  vitrineId: string;
}) {
  // Safe order: upload the new file FIRST (upsert overwrites at the same path),
  // then let the caller update the DB. The previous file is only deleted by
  // the caller after the DB update succeeds, so a failed upload or failed DB
  // write never leaves the user without an avatar.
  const path = `${userId}/${vitrineId}/avatar.${extension}`;
  const previousPath = getStoragePathFromPublicUrl(existingAvatarUrl, AVATAR_BUCKET);
  const stalePath = previousPath && previousPath !== path ? previousPath : null;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return { error: "avatar_upload_failed" as const, publicUrl: null, stalePath: null };
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;

  if (!publicUrl) {
    return { error: "avatar_upload_failed" as const, publicUrl: null, stalePath: null };
  }

  return { error: null, publicUrl, stalePath };
}

async function uploadBanner({
  existingBannerUrl,
  extension,
  file,
  supabase,
  userId,
  vitrineId,
}: {
  existingBannerUrl: string | null;
  extension: string;
  file: File;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  vitrineId: string;
}) {
  // See uploadAvatar for the safe upload-then-delete rationale.
  const path = `${userId}/${vitrineId}/banner.${extension}`;
  const previousPath = getStoragePathFromPublicUrl(existingBannerUrl, BANNER_BUCKET);
  const stalePath = previousPath && previousPath !== path ? previousPath : null;

  const { error } = await supabase.storage.from(BANNER_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return { error: "banner_upload_failed" as const, publicUrl: null, stalePath: null };
  }

  const { data } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;

  if (!publicUrl) {
    return { error: "banner_upload_failed" as const, publicUrl: null, stalePath: null };
  }

  return { error: null, publicUrl, stalePath };
}

async function removeBanner({
  existingBannerUrl,
  supabase,
}: {
  existingBannerUrl: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const previousPath = getStoragePathFromPublicUrl(existingBannerUrl, BANNER_BUCKET);

  if (previousPath) {
    // DB has already been cleared to banner_url=null before this runs, so a
    // storage delete failure only leaves an orphan file; do not block the
    // user-facing save flow on it.
    await removeStorageObjectBestEffort(supabase, BANNER_BUCKET, previousPath);
  }
}

function isUserIdUniqueConflict(error: {
  message?: string | null;
  details?: string | null;
}) {
  const combined = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    combined.includes("link_vitrines_user_id_key") ||
    combined.includes("(user_id)")
  );
}

type SubmittedVitrineItem = {
  id: string | null;
  platform: LinkVitrinePlatform;
  label: string;
  url: string;
  isActive: boolean;
  sortOrder: number | null;
  isSponsored: boolean;
  sponsoredLabel: LinkVitrineSponsoredLabel | null;
  animationEnabled: boolean;
  animationType: LinkVitrineAnimationType | null;
  originalIndex: number;
};

function getStringFromUnknown(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBooleanFromUnknown(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function getNumberFromUnknown(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getSubmittedVitrineItems(formData: FormData): {
  items: SubmittedVitrineItem[] | null;
  error: string | null;
} {
  const rawItems = getField(formData, "items_json");

  if (!rawItems) {
    return { items: null, error: null };
  }

  try {
    const parsed = JSON.parse(rawItems) as unknown;

    if (!Array.isArray(parsed)) {
      return { items: null, error: "invalid_platform_config" };
    }

    const items: SubmittedVitrineItem[] = [];
    const submittedIds = new Set<string>();

    for (const [index, rawItem] of parsed.entries()) {
      if (!rawItem || typeof rawItem !== "object") {
        return { items: null, error: "invalid_platform_config" };
      }

      const record = rawItem as Record<string, unknown>;
      const rawId = record.id;
      const id =
        typeof rawId === "string"
          ? rawId.trim() || null
          : rawId === null || rawId === undefined
            ? null
            : null;

      if (
        (rawId !== null && rawId !== undefined && typeof rawId !== "string") ||
        (id !== null && !UUID_PATTERN.test(id)) ||
        (id !== null && submittedIds.has(id))
      ) {
        return { items: null, error: "invalid_platform_config" };
      }

      if (id) {
        submittedIds.add(id);
      }

      const platform = getStringFromUnknown(record.platform);

      if (!isLinkVitrinePlatform(platform)) {
        return { items: null, error: "invalid_platform_config" };
      }

      const isSponsored = getBooleanFromUnknown(record.isSponsored);
      const rawSponsoredLabel = getStringFromUnknown(record.sponsoredLabel);
      const sponsoredLabel =
        rawSponsoredLabel && isLinkVitrineSponsoredLabel(rawSponsoredLabel)
          ? rawSponsoredLabel
          : null;
      const animationEnabled = getBooleanFromUnknown(record.animationEnabled);
      const rawAnimationType = getStringFromUnknown(record.animationType);
      const animationType =
        rawAnimationType && isLinkVitrineAnimationType(rawAnimationType)
          ? rawAnimationType
          : null;

      if ((isSponsored && !sponsoredLabel) || (animationEnabled && !animationType)) {
        return { items: null, error: "invalid_platform_config" };
      }

      items.push({
        id,
        platform,
        label: getStringFromUnknown(record.label),
        url: getStringFromUnknown(record.url),
        isActive: getBooleanFromUnknown(record.isActive),
        sortOrder: getNumberFromUnknown(record.sortOrder),
        isSponsored,
        sponsoredLabel: isSponsored ? sponsoredLabel : null,
        animationEnabled,
        animationType: animationEnabled ? animationType : null,
        originalIndex: index,
      });
    }

    return { items, error: null };
  } catch {
    return { items: null, error: "invalid_platform_config" };
  }
}

function getLegacyVitrineItems(formData: FormData): {
  items: PersistedLinkVitrineItemInput[];
  error: string | null;
} {
  const defaultItems = createDefaultLinkVitrineItems();
  const items: PersistedLinkVitrineItemInput[] = [];

  for (const [index, platform] of LINK_VITRINE_PLATFORMS.entries()) {
    const rawUrl = getField(formData, `${platform.id}_url`);
    const isActive = formData.get(`${platform.id}_active`) === "on";

    if (isActive && !rawUrl) {
      return { items: [], error: "missing_platform_url" };
    }

    const validation = validatePlatformUrl(platform.id, rawUrl);

    if (validation.error) {
      return { items: [], error: "invalid_platform_url" };
    }

    items.push({
      id: null,
      platform: platform.id,
      label: platform.label,
      url: validation.url,
      isActive: isActive && Boolean(validation.url),
      sortOrder: defaultItems[index]?.sortOrder ?? index + 1,
      isSponsored: false,
      sponsoredLabel: null,
      animationEnabled: false,
      animationType: null,
    });
  }

  return { items, error: null };
}

function getDisplayOrderNumber(value: number | null) {
  if (!Number.isInteger(value) || value === null || value < 1) {
    return null;
  }

  return value;
}

function getVitrineItems(formData: FormData): {
  items: PersistedLinkVitrineItemInput[];
  error: string | null;
} {
  const parsedItems = getSubmittedVitrineItems(formData);

  if (parsedItems.error) {
    return { items: [], error: parsedItems.error };
  }

  if (!parsedItems.items) {
    return getLegacyVitrineItems(formData);
  }

  const submittedByPlatform = new Map<LinkVitrinePlatform, SubmittedVitrineItem[]>();
  const usedActiveDisplayOrders = new Map<number, string>();

  for (const item of parsedItems.items) {
    const platformItems = submittedByPlatform.get(item.platform) ?? [];
    platformItems.push(item);
    submittedByPlatform.set(item.platform, platformItems);
  }

  const items: PersistedLinkVitrineItemInput[] = [];

  for (const [platformIndex, platform] of LINK_VITRINE_PLATFORMS.entries()) {
    const platformId = platform.id;
    const submittedRows = (submittedByPlatform.get(platformId) ?? []).sort(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.originalIndex - b.originalIndex,
    );
    const isPlatformActive = submittedRows.some((item) => item.isActive);
    const platformLinks: PersistedLinkVitrineItemInput[] = [];

    for (const submittedRow of submittedRows) {
      if (!submittedRow.url) {
        continue;
      }

      const validation = validatePlatformUrl(platformId, submittedRow.url);

      if (validation.error) {
        return { items: [], error: "invalid_platform_url" };
      }

      const label = submittedRow.label.trim();

      if (label.length > MAX_PLATFORM_LABEL_LENGTH) {
        return { items: [], error: "invalid_platform_label" };
      }

      const displayOrder = getDisplayOrderNumber(submittedRow.sortOrder);

      if (isPlatformActive && !displayOrder) {
        return { items: [], error: "invalid_display_order" };
      }

      if (isPlatformActive && displayOrder) {
        const owner = usedActiveDisplayOrders.get(displayOrder);

        if (owner) {
          return { items: [], error: "duplicate_display_order" };
        }

        usedActiveDisplayOrders.set(
          displayOrder,
          `${platform.label} - ${label || platform.label}`,
        );
      }

      platformLinks.push({
        id: submittedRow.id,
        platform: platformId,
        label: label || platform.label,
        url: validation.url,
        isActive: false,
        sortOrder: displayOrder ?? submittedRow.originalIndex + 1,
        isSponsored: submittedRow.isSponsored,
        sponsoredLabel: submittedRow.isSponsored ? submittedRow.sponsoredLabel : null,
        animationEnabled: submittedRow.animationEnabled,
        animationType: submittedRow.animationEnabled ? submittedRow.animationType : null,
      });
    }

    if (isPlatformActive && platformLinks.length === 0) {
      return { items: [], error: "missing_platform_url" };
    }

    if (platformLinks.length === 0) {
      items.push({
        id: null,
        platform: platformId,
        label: platform.label,
        url: null,
        isActive: false,
        sortOrder: platformIndex + 1,
        isSponsored: false,
        sponsoredLabel: null,
        animationEnabled: false,
        animationType: null,
      });
      continue;
    }

    items.push(
      ...platformLinks.map((item) => ({
        ...item,
        isActive: isPlatformActive,
      })),
    );
  }

  return { items, error: null };
}

export async function saveLinkVitrineAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect(getErrorPath("auth_not_configured"));
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  // Explicit trim: getField already trims, but we call .trim() again so the
  // length check and the saved value stay in sync even if getField changes.
  // Whitespace-only input becomes "" and fails the length floor below.
  const displayName = getField(formData, "display_name").trim();
  const handle = normalizeVitrineHandle(getField(formData, "handle"));
  const bio = getOptionalField(formData, "bio");
  const theme = getField(formData, "theme");
  const intent = getIntent(formData);
  const avatar = getAvatarFile(formData);
  const banner = getBannerFile(formData);
  const shouldRemoveBanner = formData.get("remove_banner") === "true" && !banner.file;
  // Form'da hidden olarak gelen yüzde değerini 0-100 aralığına clamp ediyoruz.
  // Banner kaldırıldığında istemci tarafı da defaulta dönüyor ama burada da
  // banner_url null'a düşerse pozisyonu reset etmek istiyoruz; hem DB hem UI
  // tarafı eski pozisyonu tutmasın diye aşağıdaki payload'a default değer
  // veriyoruz.
  const bannerPositionX = clampBannerPosition(getField(formData, "banner_position_x"));
  const bannerPositionY = clampBannerPosition(getField(formData, "banner_position_y"));
  const collaborationSubmission = getSubmittedCollaborationSettings(formData);

  if (collaborationSubmission.error) {
    redirect(getErrorPath(collaborationSubmission.error));
  }

  if (avatar.error) {
    redirect(getErrorPath(avatar.error));
  }

  if (banner.error) {
    redirect(getErrorPath(banner.error));
  }

  if (displayName.length < 2 || displayName.length > 40) {
    redirect(getErrorPath("invalid_display_name"));
  }

  if (!isValidVitrineHandle(handle)) {
    redirect(getErrorPath("invalid_handle"));
  }

  if (!isLinkVitrineTheme(theme)) {
    redirect(getErrorPath("invalid_theme"));
  }

  if (bio && bio.length > 140) {
    redirect(getErrorPath("invalid_bio"));
  }

  const parsedItems = getVitrineItems(formData);

  if (parsedItems.error) {
    redirect(getErrorPath(parsedItems.error));
  }

  // Fail-open rate limit: a transient DB hiccup must not block legitimate
  // edits. Existing handle/owner/unique checks below still enforce data rules.
  const ipKey = await getClientIp();
  const isUploading = Boolean(avatar.file || banner.file);

  const userSaveAllowed = await checkRateLimit({
    action: "vitrine:save:user",
    key: userId,
    limit: 15,
    windowSeconds: 300,
    mode: "fail-open",
  });

  if (!userSaveAllowed) {
    redirect(getErrorPath("rate_limited"));
  }

  const ipSaveAllowed = await checkRateLimit({
    action: "vitrine:save:ip",
    key: ipKey,
    limit: 30,
    windowSeconds: 300,
    mode: "fail-open",
  });

  if (!ipSaveAllowed) {
    redirect(getErrorPath("rate_limited"));
  }

  if (isUploading) {
    const userUploadAllowed = await checkRateLimit({
      action: "vitrine:upload:user",
      key: userId,
      limit: 10,
      windowSeconds: 1800,
      mode: "fail-open",
    });

    if (!userUploadAllowed) {
      redirect(getErrorPath("rate_limited"));
    }

    const ipUploadAllowed = await checkRateLimit({
      action: "vitrine:upload:ip",
      key: ipKey,
      limit: 20,
      windowSeconds: 1800,
      mode: "fail-open",
    });

    if (!ipUploadAllowed) {
      redirect(getErrorPath("rate_limited"));
    }
  }

  const supabase = await createClient();

  const { data: existingRow, error: existingError } = await supabase
    .from("link_vitrines")
    .select("id,handle,avatar_url,banner_url,is_published,link_vitrine_items(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    redirect(getErrorPath("save_failed"));
  }

  const existing: ExistingVitrine | null = existingRow
    ? (existingRow as ExistingVitrine)
    : null;
  const existingItemIds = new Set(
    (existing?.link_vitrine_items ?? []).map((item) => item.id),
  );

  if (
    parsedItems.items.some(
      (item) => item.id !== null && !existingItemIds.has(item.id),
    )
  ) {
    redirect(getErrorPath("invalid_platform_config"));
  }

  const handleConflictQuery = supabase
    .from("link_vitrines")
    .select("id")
    .eq("handle", handle)
    .neq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const { data: conflictRow, error: conflictError } = await handleConflictQuery;

  if (conflictError) {
    redirect(getErrorPath("save_failed"));
  }

  if (conflictRow) {
    redirect(getErrorPath("handle_unavailable"));
  }

  if (collaborationSubmission.settings) {
    const collaborationRateLimit =
      await checkLinkVitrineCollaborationSettingsRateLimit(userId);

    if (collaborationRateLimit === "rate_limited") {
      redirect(getErrorPath("rate_limited"));
    }

    if (collaborationRateLimit === "unavailable") {
      redirect(getErrorPath("collaboration_save_failed"));
    }
  }

  const payload = {
    user_id: userId,
    handle,
    display_name: displayName,
    bio,
    theme,
    avatar_url: existing?.avatar_url ?? null,
    banner_url: shouldRemoveBanner ? null : (existing?.banner_url ?? null),
    // Banner kaldırılıyorsa pozisyonu varsayılana çek; banner kalıyor (veya
    // yeni yükleniyorsa) form'dan gelen pozisyonu kullan.
    banner_position_x: shouldRemoveBanner ? DEFAULT_BANNER_POSITION : bannerPositionX,
    banner_position_y: shouldRemoveBanner ? DEFAULT_BANNER_POSITION : bannerPositionY,
    is_published: intent === "publish" ? true : (existing?.is_published ?? false),
    ...(shouldRemoveBanner ? { banner_updated_at: new Date().toISOString() } : {}),
  };

  const saveResult = existing
    ? await supabase
        .from("link_vitrines")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("id")
        .single()
    : await supabase.from("link_vitrines").insert(payload).select("id").single();

  if (saveResult.error || !saveResult.data) {
    if (saveResult.error?.code === "23505") {
      // Two concurrent inserts from the same user can both pass the earlier
      // existing-row check and race here. The user_id unique index then fires
      // on one of them. We distinguish that case from a real handle conflict
      // so the message points the user back to the existing vitrine.
      if (isUserIdUniqueConflict(saveResult.error)) {
        redirect(getErrorPath("vitrine_already_exists"));
      }

      redirect(getErrorPath("handle_unavailable"));
    }

    redirect(getErrorPath("save_failed"));
  }

  const vitrineId = (saveResult.data as { id: string }).id;

  if (avatar.file && avatar.extension) {
    const uploadResult = await uploadAvatar({
      existingAvatarUrl: existing?.avatar_url ?? null,
      extension: avatar.extension,
      file: avatar.file,
      supabase,
      userId,
      vitrineId,
    });

    if (uploadResult.error) {
      redirect(getErrorPath(uploadResult.error));
    }

    const { error: avatarUpdateError } = await supabase
      .from("link_vitrines")
      .update({ avatar_url: uploadResult.publicUrl })
      .eq("id", vitrineId)
      .eq("user_id", userId);

    if (avatarUpdateError) {
      // DB update failed: new file is orphaned at the new path but the user
      // still has the old avatar URL pointing to a valid object. Do NOT
      // delete the stale path here — the old avatar would be lost on top of
      // the failure. The orphan will be overwritten on the next successful
      // upload.
      redirect(getErrorPath("avatar_upload_failed"));
    }

    // DB now points at the new file; safe to clean up the stale object.
    if (uploadResult.stalePath) {
      await removeStorageObjectBestEffort(
        supabase,
        AVATAR_BUCKET,
        uploadResult.stalePath,
      );
    }
  }

  if (shouldRemoveBanner) {
    await removeBanner({
      existingBannerUrl: existing?.banner_url ?? null,
      supabase,
    });
  }

  if (banner.file && banner.extension) {
    const uploadResult = await uploadBanner({
      existingBannerUrl: existing?.banner_url ?? null,
      extension: banner.extension,
      file: banner.file,
      supabase,
      userId,
      vitrineId,
    });

    if (uploadResult.error) {
      redirect(getErrorPath(uploadResult.error));
    }

    const { error: bannerUpdateError } = await supabase
      .from("link_vitrines")
      .update({
        banner_url: uploadResult.publicUrl,
        banner_updated_at: new Date().toISOString(),
      })
      .eq("id", vitrineId)
      .eq("user_id", userId);

    if (bannerUpdateError) {
      // Same rationale as the avatar branch: keep the user's existing banner
      // URL valid by leaving the old object in place when the DB write fails.
      redirect(getErrorPath("banner_upload_failed"));
    }

    if (uploadResult.stalePath) {
      await removeStorageObjectBestEffort(
        supabase,
        BANNER_BUCKET,
        uploadResult.stalePath,
      );
    }
  }

  const itemPayloads = parsedItems.items.map((item) => ({
    id: item.id,
    platform: item.platform,
    label: item.label,
    url: item.url,
    is_active: item.isActive,
    sort_order: item.sortOrder,
    is_sponsored: item.isSponsored,
    sponsored_label: item.isSponsored ? item.sponsoredLabel : null,
    animation_enabled: item.animationEnabled,
    animation_type: item.animationEnabled ? item.animationType : null,
  }));
  const { error: syncItemsError } = await supabase.rpc(
    "sync_owned_link_vitrine_items",
    {
      p_vitrine_id: vitrineId,
      p_items: itemPayloads,
    },
  );

  if (syncItemsError) {
    redirect(getErrorPath("save_failed"));
  }

  if (collaborationSubmission.settings) {
    const collaborationSettings =
      await persistOwnedLinkVitrineCollaborationSettings({
        notificationEmail:
          collaborationSubmission.settings.notificationEmail,
        requestsEnabled: collaborationSubmission.settings.requestsEnabled,
        supabase,
        vitrineId,
      });

    if (!collaborationSettings) {
      redirect(getErrorPath("collaboration_save_failed"));
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(EDITOR_PATH);
  revalidatePath(`/dashboard/link-vitrini/${vitrineId}`);
  revalidatePath(`/v/${handle}`);
  // Sitemap ISR cache'i (revalidate=3600) yeni yayın / handle değişikliği /
  // yayından kaldırma durumlarında en geç bir saatte yenilense de, sitemap'i
  // burada da invalidate ediyoruz ki public yayınlar bot'lara hemen görünsün.
  revalidatePath("/sitemap.xml");

  if (existing?.handle && existing.handle !== handle) {
    revalidatePath(`/v/${existing.handle}`);
  }

  redirect(getSuccessPath(intent));
}
