import "server-only";

import {
  isLinkVitrineCollaborationBudgetCurrency,
  isLinkVitrineCollaborationRequestType,
  isUuid,
  type LinkVitrineCollaborationBudgetCurrency,
  type LinkVitrineCollaborationRequestType,
} from "@/lib/link-vitrine-collaboration";
import type { ValidatedLinkVitrineCollaborationRequest } from "@/lib/link-vitrine-collaboration-request";
import { createAdminClient } from "@/lib/supabase/admin";

type CreatedRequestRpcRow = {
  request_id: string;
  request_created: boolean;
  recipient_email: string;
  profile_display_name: string;
  profile_handle: string;
  request_created_at: string;
};

export type CreatedCollaborationRequest = {
  requestId: string;
  created: boolean;
  recipientEmail: string;
  profileDisplayName: string;
  profileHandle: string;
  createdAt: string;
};

function firstRow<T>(value: unknown): T | null {
  return Array.isArray(value) && value.length > 0
    ? (value[0] as T)
    : null;
}

export async function createLinkVitrineCollaborationRequest({
  handle,
  payload,
  visitorHash,
  payloadHash,
}: {
  handle: string;
  payload: ValidatedLinkVitrineCollaborationRequest;
  visitorHash: string;
  payloadHash: string;
}): Promise<CreatedCollaborationRequest | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc(
      "create_link_vitrine_collaboration_request",
      {
        p_handle: handle,
        p_sender_name: payload.senderName,
        p_sender_email: payload.senderEmail,
        p_sender_phone: payload.senderPhone,
        p_request_type: payload.requestType,
        p_budget_amount: payload.budgetAmount,
        p_budget_currency: payload.budgetCurrency,
        p_subject: payload.subject,
        p_message: payload.message,
        p_visitor_hash: visitorHash,
        p_payload_hash: payloadHash,
      },
    );

    if (error) {
      console.warn("[link-vitrine-collaboration] request RPC failed", {
        code: error.code,
      });
      return null;
    }

    const row = firstRow<CreatedRequestRpcRow>(data);

    if (
      !row ||
      !isUuid(row.request_id) ||
      !row.recipient_email ||
      !row.profile_display_name ||
      !row.profile_handle ||
      !row.request_created_at
    ) {
      return null;
    }

    return {
      requestId: row.request_id,
      created: row.request_created === true,
      recipientEmail: row.recipient_email,
      profileDisplayName: row.profile_display_name,
      profileHandle: row.profile_handle,
      createdAt: row.request_created_at,
    };
  } catch {
    return null;
  }
}

export async function updateLinkVitrineCollaborationNotification({
  requestId,
  status,
  providerId,
  errorCode,
}: {
  requestId: string;
  status: "sent" | "failed";
  providerId: string | null;
  errorCode: string | null;
}) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc(
      "update_link_vitrine_collaboration_notification",
      {
        p_request_id: requestId,
        p_notification_status: status,
        p_provider_id: providerId,
        p_error_code: errorCode,
      },
    );

    return !error && data === true;
  } catch {
    return false;
  }
}

export async function prepareLinkVitrineCollaborationEmailVerification({
  vitrineId,
  ownerUserId,
  email,
  tokenHash,
  expiresAt,
}: {
  vitrineId: string;
  ownerUserId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
}) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc(
      "prepare_link_vitrine_collaboration_email_verification",
      {
        p_vitrine_id: vitrineId,
        p_owner_user_id: ownerUserId,
        p_email: email,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
      },
    );

    return !error && data === true;
  } catch {
    return false;
  }
}

export async function revokeLinkVitrineCollaborationEmailVerification(
  tokenHash: string,
) {
  try {
    const admin = createAdminClient();
    await admin.rpc(
      "revoke_link_vitrine_collaboration_email_verification",
      { p_token_hash: tokenHash },
    );
  } catch {
    // Best effort only. The unconsumed token still expires after 45 minutes.
  }
}

export async function consumeLinkVitrineCollaborationEmailVerification(
  tokenHash: string,
) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc(
      "consume_link_vitrine_collaboration_email_verification",
      { p_token_hash: tokenHash },
    );
    const row = firstRow<{
      verified: boolean;
      profile_handle: string | null;
    }>(data);

    if (error || !row?.verified || !row.profile_handle) {
      return null;
    }

    return { handle: row.profile_handle };
  } catch {
    return null;
  }
}

export function isValidCreatedRequestPayload(
  value: ValidatedLinkVitrineCollaborationRequest,
): value is ValidatedLinkVitrineCollaborationRequest & {
  requestType: LinkVitrineCollaborationRequestType;
  budgetCurrency: LinkVitrineCollaborationBudgetCurrency | null;
} {
  return (
    isLinkVitrineCollaborationRequestType(value.requestType) &&
    (value.budgetCurrency === null ||
      isLinkVitrineCollaborationBudgetCurrency(value.budgetCurrency))
  );
}
