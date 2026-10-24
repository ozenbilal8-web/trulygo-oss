"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTrustedLinkRequest } from "@/lib/link-request-command";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateRequestedSlug } from "@/lib/slugs";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { normalizeHttpUrl } from "@/lib/urls";
import { checkUrlWithWebRisk, shouldBlockAutoApproval } from "@/lib/web-risk";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalField(formData: FormData, key: string) {
  const value = getField(formData, key);
  return value.length > 0 ? value : null;
}

function isTrustedLinkCreateV2Enabled() {
  return process.env.TRULYGO_TRUSTED_LINK_CREATE_V2 === "true";
}

export async function createLinkRequestAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect("/dashboard?error=auth_not_configured");
  }

  const targetUrl = normalizeHttpUrl(getField(formData, "target_url"));

  if (!targetUrl) {
    redirect("/dashboard?error=invalid_target_url");
  }

  if (formData.get("immutable_acknowledgement") !== "accepted") {
    redirect("/dashboard?error=immutable_ack_required#new-link");
  }

  const rawSlug = optionalField(formData, "requested_slug");

  if (!rawSlug) {
    redirect("/dashboard?error=missing_slug");
  }

  const { slug: requestedSlug, error: slugError } = validateRequestedSlug(rawSlug);

  if (slugError || !requestedSlug) {
    redirect(`/dashboard?error=${slugError ?? "invalid_slug"}`);
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    redirect("/dashboard?error=unauthenticated");
  }

  // Rate-limit buckets are selected and written only by the server. Link
  // creation retains its documented fail-open behavior on limiter failure;
  // V2 safety attestation and pending review remain separate boundaries.
  const ipKey = await getClientIp();

  const userAllowed = await checkRateLimit({
    action: "link:request:create:user",
    key: userId,
    limit: 10,
    windowSeconds: 600,
    mode: "fail-open",
  });

  if (!userAllowed) {
    redirect("/dashboard?error=rate_limited");
  }

  const ipAllowed = await checkRateLimit({
    action: "link:request:create:ip",
    key: ipKey,
    limit: 20,
    windowSeconds: 600,
    mode: "fail-open",
  });

  if (!ipAllowed) {
    redirect("/dashboard?error=rate_limited");
  }

  if (isTrustedLinkCreateV2Enabled()) {
    const result = await createTrustedLinkRequest({
      authenticatedUserId: userId,
      targetUrl,
      requestedSlug,
      campaignName: optionalField(formData, "campaign_name"),
      note: optionalField(formData, "note"),
    });

    // Fail closed on the V2 path. An RPC/configuration/transport failure must
    // never fall back to the legacy authenticated INSERT boundary.
    if (!result.ok) {
      redirect(`/dashboard?error=${result.error}`);
    }

    revalidatePath("/dashboard");
    redirect(
      result.autoApprovalBlocked
        ? "/dashboard?message=link_request_security_review"
        : "/dashboard?message=link_request_created",
    );
  }

  // Google Web Risk pre-approval gate. Runs AFTER the rate-limit checks above
  // so attackers can't burn through Web Risk quota cheaply, and BEFORE the
  // insert so the row lands in DB already carrying the decision. Any status
  // other than `clean` (flagged, error, skipped) routes the request into the
  // admin queue: auto_approval_blocked=true makes the auto_approve RPC's
  // WHERE clause silently no-op even after the edge function approves the URL
  // on its own checks. This legacy branch stays unchanged during EXPAND.
  const webRiskResult = await checkUrlWithWebRisk(targetUrl);
  const blockAutoApproval = shouldBlockAutoApproval(webRiskResult);

  const { error } = await supabase.from("link_requests").insert({
    user_id: userId,
    target_url: targetUrl,
    requested_slug: requestedSlug,
    campaign_name: optionalField(formData, "campaign_name"),
    note: optionalField(formData, "note"),
    auto_approval_blocked: blockAutoApproval,
    web_risk_status: webRiskResult.status,
    web_risk_threats: webRiskResult.threats,
    web_risk_checked_at: webRiskResult.checkedAt,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/dashboard?error=slug_unavailable");
    }

    redirect("/dashboard?error=create_failed");
  }

  revalidatePath("/dashboard");
  redirect(
    blockAutoApproval
      ? "/dashboard?message=link_request_security_review"
      : "/dashboard?message=link_request_created",
  );
}
