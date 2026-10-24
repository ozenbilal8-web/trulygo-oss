import "server-only";

import { validateRequestedSlug } from "@/lib/slugs";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHttpUrl } from "@/lib/urls";
import {
  checkUrlWithWebRisk,
  type WebRiskCheckResult,
} from "@/lib/web-risk";

const SAFETY_POLICY_VERSION = "google-web-risk-lookup-v1";

type TrustedSafetyStatus = "unverified" | "clean" | "blocked" | "error";

export type CreateTrustedLinkRequestInput = {
  authenticatedUserId: string;
  targetUrl: string;
  requestedSlug: string;
  campaignName: string | null;
  note: string | null;
};

export type CreateTrustedLinkRequestResult =
  | {
      ok: true;
      id: string;
      autoApprovalBlocked: boolean;
    }
  | {
      ok: false;
      error: "slug_unavailable" | "create_failed";
    };

type SafetyDecision = {
  status: TrustedSafetyStatus;
  verifiedAt: string | null;
  autoApprovalBlocked: boolean;
};

type CreateLinkRequestV2Row = {
  id: string;
  status: string;
  auto_approval_blocked: boolean;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapWebRiskDecision(result: WebRiskCheckResult): SafetyDecision {
  switch (result.status) {
    case "clean":
      return {
        status: "clean",
        verifiedAt: result.checkedAt,
        autoApprovalBlocked: false,
      };
    case "flagged":
      return {
        status: "blocked",
        verifiedAt: result.checkedAt,
        autoApprovalBlocked: true,
      };
    case "error":
      return {
        status: "error",
        verifiedAt: null,
        autoApprovalBlocked: true,
      };
    case "skipped":
      return {
        status: "unverified",
        verifiedAt: null,
        autoApprovalBlocked: true,
      };
  }
}

/**
 * Creates a trusted link request through the service-role-only V2 RPC.
 * `authenticatedUserId` must come from the Server Action's verified session,
 * never from FormData or another browser-controlled field.
 */
export async function createTrustedLinkRequest(
  input: CreateTrustedLinkRequestInput,
): Promise<CreateTrustedLinkRequestResult> {
  const targetUrl = normalizeHttpUrl(input.targetUrl);
  const slugResult = validateRequestedSlug(input.requestedSlug);

  if (
    !isUuid(input.authenticatedUserId) ||
    !targetUrl ||
    slugResult.error ||
    !slugResult.slug
  ) {
    console.warn("[link-create-v2] rejected invalid server input", {
      reason: "invalid_server_input",
    });
    return { ok: false, error: "create_failed" };
  }

  const webRiskResult = await checkUrlWithWebRisk(targetUrl);
  const safetyDecision = mapWebRiskDecision(webRiskResult);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("create_link_request_v2", {
        p_user_id: input.authenticatedUserId,
        p_target_url: targetUrl,
        p_requested_slug: slugResult.slug,
        p_campaign_name: input.campaignName,
        p_note: input.note,
        p_safety_status: safetyDecision.status,
        p_safety_verified_at: safetyDecision.verifiedAt,
        p_safety_policy_version: SAFETY_POLICY_VERSION,
        p_web_risk_status: webRiskResult.status,
        p_web_risk_threats: webRiskResult.threats,
        p_web_risk_checked_at: webRiskResult.checkedAt,
      })
      .maybeSingle();

    if (error) {
      console.error("[link-create-v2] RPC failed", {
        code: error.code || "unknown",
        reason: "rpc_failed",
      });
      return {
        ok: false,
        error: error.code === "23505" ? "slug_unavailable" : "create_failed",
      };
    }

    if (!data) {
      console.error("[link-create-v2] RPC returned no row", {
        reason: "missing_result",
      });
      return { ok: false, error: "create_failed" };
    }

    const row = data as unknown as CreateLinkRequestV2Row;

    if (
      !isUuid(row.id) ||
      row.status !== "pending" ||
      typeof row.auto_approval_blocked !== "boolean"
    ) {
      console.error("[link-create-v2] RPC returned an invalid row", {
        reason: "invalid_result_shape",
      });
      return { ok: false, error: "create_failed" };
    }

    return {
      ok: true,
      id: row.id,
      autoApprovalBlocked:
        row.auto_approval_blocked === true ||
        safetyDecision.autoApprovalBlocked,
    };
  } catch {
    console.error("[link-create-v2] command failed", {
      reason: "configuration_or_transport_failure",
    });
    return { ok: false, error: "create_failed" };
  }
}
