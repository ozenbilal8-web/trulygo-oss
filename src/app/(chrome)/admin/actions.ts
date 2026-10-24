"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { validateRequestedSlug } from "@/lib/slugs";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isSafeHttpUrl } from "@/lib/urls";

type ReviewStatus = "approved" | "rejected";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isReviewStatus(status: string): status is ReviewStatus {
  return status === "approved" || status === "rejected";
}

export async function reviewLinkRequestAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect("/admin?error=auth_not_configured");
  }

  const profile = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/admin?error=admin_required");
  }

  const requestId = getField(formData, "request_id");
  const status = getField(formData, "status");

  if (!requestId || !isReviewStatus(status)) {
    redirect("/admin?error=invalid_review");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const reviewerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !reviewerId) {
    redirect("/admin?error=admin_required");
  }

  if (status === "approved") {
    const { data: requestData, error: requestError } = await supabase
      .from("link_requests")
      .select("requested_slug,target_url")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError || !requestData) {
      redirect("/admin?error=review_failed");
    }

    const requestRow = requestData as unknown as {
      requested_slug: string | null;
      target_url: string | null;
    };

    if (!isSafeHttpUrl(requestRow.target_url)) {
      redirect("/admin?error=invalid_target_url");
    }

    const validation = validateRequestedSlug(requestRow.requested_slug);

    if (!validation.slug) {
      redirect(`/admin?error=${validation.error ?? "missing_slug"}`);
    }

    if (requestRow.requested_slug !== validation.slug) {
      redirect("/admin?error=invalid_slug");
    }
  }

  const adminNote = getField(formData, "admin_note");
  const { data, error } = await supabase
    .from("link_requests")
    .update({
      status,
      admin_note: adminNote || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/admin?error=review_failed");
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(`/admin?message=request_${status}`);
}
