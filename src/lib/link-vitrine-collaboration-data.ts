import "server-only";

import {
  getCollaborationVerificationStatus,
  getLinkVitrineCollaborationNotificationSubject,
  getNewestLinkVitrineCollaborationNotifications,
  isLinkVitrineCollaborationBudgetCurrency,
  isLinkVitrineCollaborationRequestType,
  isLinkVitrineCollaborationStatus,
  isUuid,
  isValidCollaborationEmail,
  normalizeCollaborationEmail,
  type LinkVitrineCollaborationNotificationSnapshot,
  type LinkVitrineCollaborationNotificationSummary,
  type LinkVitrineCollaborationRequestDetail,
  type LinkVitrineCollaborationRequestSummary,
  type LinkVitrineCollaborationSettings,
} from "@/lib/link-vitrine-collaboration";
import { normalizeVitrineHandle } from "@/lib/link-vitrine-config";
import { createAnonymousClient, createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type CollaborationSettingsRow = {
  vitrine_id: string;
  requests_enabled: boolean;
  notification_email: string;
  notification_email_verified_at: string | null;
  verification_requested_at: string | null;
  verification_expires_at: string | null;
};

type CollaborationRequestSummaryRow = {
  request_id: string;
  sender_name: string;
  request_type: string;
  budget_amount: string | null;
  budget_currency: string | null;
  subject: string;
  message_preview: string;
  status: string;
  created_at: string;
};

type CollaborationRequestDetailRow = CollaborationRequestSummaryRow & {
  sender_email: string;
  sender_phone: string | null;
  message: string;
  notification_status: string;
  notification_attempted_at: string | null;
};

type CollaborationNotificationRow = {
  has_vitrine: boolean;
  request_id: string | null;
  subject: string | null;
  status: string | null;
  created_at: string | null;
  unread_count: number | string;
};

export type LinkVitrineCollaborationNotificationsDataResult =
  | {
      ok: true;
      snapshot: LinkVitrineCollaborationNotificationSnapshot;
    }
  | {
      ok: false;
      error: "unavailable";
      hasVitrine: boolean;
    };

function firstRow<T>(value: unknown): T | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return value[0] as T;
}

export function mapCollaborationSettings(
  row: CollaborationSettingsRow,
): LinkVitrineCollaborationSettings | null {
  if (
    !row?.vitrine_id ||
    !isValidCollaborationEmail(row.notification_email)
  ) {
    return null;
  }

  return {
    vitrineId: row.vitrine_id,
    requestsEnabled: Boolean(row.requests_enabled),
    notificationEmail: normalizeCollaborationEmail(row.notification_email),
    notificationEmailVerifiedAt:
      row.notification_email_verified_at ?? null,
    verificationRequestedAt: row.verification_requested_at ?? null,
    verificationExpiresAt: row.verification_expires_at ?? null,
    verificationStatus: getCollaborationVerificationStatus({
      notificationEmailVerifiedAt:
        row.notification_email_verified_at ?? null,
      verificationExpiresAt: row.verification_expires_at ?? null,
    }),
  };
}

function mapRequestSummary(
  row: CollaborationRequestSummaryRow,
): LinkVitrineCollaborationRequestSummary | null {
  if (
    !row?.request_id ||
    !row.sender_name ||
    !row.subject ||
    !row.created_at ||
    !isLinkVitrineCollaborationRequestType(row.request_type) ||
    !isLinkVitrineCollaborationStatus(row.status) ||
    (row.budget_currency !== null &&
      !isLinkVitrineCollaborationBudgetCurrency(row.budget_currency))
  ) {
    return null;
  }

  return {
    id: row.request_id,
    senderName: row.sender_name,
    requestType: row.request_type,
    budgetAmount: row.budget_amount,
    budgetCurrency: row.budget_currency,
    subject: row.subject,
    messagePreview: row.message_preview ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapRequestDetail(
  row: CollaborationRequestDetailRow,
): LinkVitrineCollaborationRequestDetail | null {
  const summary = mapRequestSummary(row);

  if (
    !summary ||
    !isValidCollaborationEmail(row.sender_email) ||
    !row.message ||
    !["pending", "sent", "failed"].includes(row.notification_status)
  ) {
    return null;
  }

  return {
    ...summary,
    senderEmail: normalizeCollaborationEmail(row.sender_email),
    senderPhone: row.sender_phone ?? null,
    message: row.message,
    notificationStatus: row.notification_status as
      | "pending"
      | "sent"
      | "failed",
    notificationAttemptedAt: row.notification_attempted_at ?? null,
  };
}

function parseUnreadCount(value: unknown) {
  const count =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[0-9]+$/.test(value)
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function mapNotificationSummary(
  row: CollaborationNotificationRow,
): LinkVitrineCollaborationNotificationSummary | null {
  if (
    !isUuid(row.request_id) ||
    !isLinkVitrineCollaborationStatus(row.status) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at))
  ) {
    return null;
  }

  return {
    id: row.request_id,
    subject: getLinkVitrineCollaborationNotificationSubject(row.subject),
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getUnavailableNotificationsResult(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<LinkVitrineCollaborationNotificationsDataResult> {
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    return { ok: false, error: "unavailable", hasVitrine: false };
  }

  const { data, error } = await supabase
    .from("link_vitrines")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return {
    ok: false,
    error: "unavailable",
    hasVitrine: !error && Boolean(data?.id),
  };
}

export async function getCurrentUserLinkVitrineCollaborationSettingsData({
  fallbackEmail,
  vitrineId,
}: {
  fallbackEmail: string | null;
  vitrineId: string | null;
}) {
  if (!isSupabaseConfigured() || !vitrineId) {
    return null;
  }

  const supabase = await createClient();
  const settingsResult = await supabase.rpc(
    "get_current_user_link_vitrine_collaboration_settings",
  );

  let settings = settingsResult.error
    ? null
    : mapCollaborationSettings(
        firstRow<CollaborationSettingsRow>(settingsResult.data) ??
          ({} as CollaborationSettingsRow),
      );

  const normalizedFallbackEmail = normalizeCollaborationEmail(fallbackEmail);

  if (!settings && isValidCollaborationEmail(normalizedFallbackEmail)) {
    settings = {
      vitrineId,
      requestsEnabled: false,
      notificationEmail: normalizedFallbackEmail,
      notificationEmailVerifiedAt: null,
      verificationRequestedAt: null,
      verificationExpiresAt: null,
      verificationStatus: "unverified",
    };
  }

  if (settingsResult.error) {
    console.warn("[link-vitrine-collaboration] settings query failed", {
      settingsCode: settingsResult.error?.code ?? null,
    });
  }

  return settings;
}

export async function getCurrentUserLinkVitrineCollaborationNotifications(): Promise<LinkVitrineCollaborationNotificationsDataResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "unavailable", hasVitrine: false };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_current_user_link_vitrine_collaboration_notifications",
    );

    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) {
        console.warn(
          "[link-vitrine-collaboration] notifications query failed",
          { code: error.code ?? null },
        );
      }

      return getUnavailableNotificationsResult(supabase);
    }

    const rows = data as CollaborationNotificationRow[];
    const first = rows[0];
    const unreadCount = parseUnreadCount(first.unread_count);

    if (
      typeof first.has_vitrine !== "boolean" ||
      unreadCount === null ||
      rows.some(
        (row) =>
          row.has_vitrine !== first.has_vitrine ||
          parseUnreadCount(row.unread_count) !== unreadCount,
      )
    ) {
      return getUnavailableNotificationsResult(supabase);
    }

    if (!first.has_vitrine) {
      if (
        unreadCount !== 0 ||
        rows.length !== 1 ||
        first.request_id !== null ||
        first.subject !== null ||
        first.status !== null ||
        first.created_at !== null
      ) {
        return getUnavailableNotificationsResult(supabase);
      }

      return {
        ok: true,
        snapshot: {
          hasVitrine: false,
          requests: [],
          unreadCount: 0,
        },
      };
    }

    const requestRows = rows.filter((row) => row.request_id !== null);
    const mappedRequests = requestRows.map(mapNotificationSummary);

    if (
      mappedRequests.some((request) => request === null) ||
      (requestRows.length === 0 &&
        (rows.length !== 1 ||
          first.request_id !== null ||
          first.subject !== null ||
          first.status !== null ||
          first.created_at !== null)) ||
      (requestRows.length > 0 && requestRows.length !== rows.length)
    ) {
      return getUnavailableNotificationsResult(supabase);
    }

    const requests = mappedRequests.filter(
      (
        request,
      ): request is LinkVitrineCollaborationNotificationSummary =>
        request !== null,
    );

    return {
      ok: true,
      snapshot: {
        hasVitrine: true,
        requests: getNewestLinkVitrineCollaborationNotifications(requests),
        unreadCount,
      },
    };
  } catch {
    return { ok: false, error: "unavailable", hasVitrine: false };
  }
}

export async function getCurrentUserLinkVitrineCollaborationRequestDetail(
  requestId: string,
) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_current_user_link_vitrine_collaboration_request_detail",
    { p_request_id: requestId },
  );

  if (error) {
    return null;
  }

  const row = firstRow<CollaborationRequestDetailRow>(data);
  return row ? mapRequestDetail(row) : null;
}

export async function getPublicLinkVitrineCollaborationAvailability(
  handle: string,
) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const canonicalHandle = normalizeVitrineHandle(handle);

  if (!canonicalHandle || canonicalHandle !== handle) {
    return false;
  }

  try {
    const supabase = createAnonymousClient();
    const { data, error } = await supabase.rpc(
      "get_public_link_vitrine_collaboration_availability",
      { p_handle: canonicalHandle },
    );

    if (error) {
      console.warn("[link-vitrine-collaboration] availability query failed", {
        code: error.code,
      });
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}
