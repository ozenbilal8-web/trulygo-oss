"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildCustomChannelDraft,
  buildPresetChannelDraft,
  getChannelPreset,
} from "@/lib/channel-links";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type LinkRequestActionRow = {
  id: string;
  user_id: string;
  requested_slug: string | null;
  campaign_name: string | null;
  status: string;
};

type LinkRequestDeleteRow = {
  id: string;
  requested_slug: string | null;
};

type ChannelLinkSlugRow = {
  slug: string | null;
};

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToLink(
  linkRequestId: string,
  key: "channelError" | "channelMessage",
  value: string,
): never {
  redirect(`/dashboard/links/${encodeURIComponent(linkRequestId)}?${key}=${value}`);
}

export async function createChannelLinkAction(formData: FormData) {
  const linkRequestId = getField(formData, "link_request_id");

  if (!linkRequestId) {
    redirect("/dashboard?error=create_failed");
  }

  if (!getSupabasePublicConfig()) {
    redirectToLink(linkRequestId, "channelError", "auth_not_configured");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    redirectToLink(linkRequestId, "channelError", "unauthenticated");
  }

  const { data, error: requestError } = await supabase
    .from("link_requests")
    .select("id,user_id,requested_slug,campaign_name,status")
    .eq("id", linkRequestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (requestError || !data) {
    redirectToLink(linkRequestId, "channelError", "link_not_found");
  }

  const request = data as unknown as LinkRequestActionRow;

  if (request.status !== "approved" || !request.requested_slug) {
    redirectToLink(linkRequestId, "channelError", "not_approved");
  }

  // Fail-open rate limit: a transient DB hiccup must not block channel-link
  // creation; reserved/unique/owner checks below remain as the safety net.
  const userAllowed = await checkRateLimit({
    action: "link:channel:create:user",
    key: userId,
    limit: 20,
    windowSeconds: 600,
    mode: "fail-open",
  });

  if (!userAllowed) {
    redirectToLink(linkRequestId, "channelError", "rate_limited");
  }

  const linkAllowed = await checkRateLimit({
    action: "link:channel:create:link",
    key: request.id,
    limit: 10,
    windowSeconds: 600,
    mode: "fail-open",
  });

  if (!linkAllowed) {
    redirectToLink(linkRequestId, "channelError", "rate_limited");
  }

  const channelKey = getField(formData, "channel_key");
  const preset = channelKey ? getChannelPreset(channelKey) : null;
  const draft = preset
    ? buildPresetChannelDraft({
        parentSlug: request.requested_slug,
        campaignName: request.campaign_name,
        preset,
      })
    : buildCustomChannelDraft({
        parentSlug: request.requested_slug,
        campaignName: request.campaign_name,
        label: getField(formData, "custom_channel_label"),
      });

  if (!draft) {
    redirectToLink(linkRequestId, "channelError", "invalid_channel");
  }

  const { error } = await supabase.from("channel_links").insert({
    link_request_id: request.id,
    user_id: userId,
    slug: draft.slug,
    channel_key: draft.channelKey,
    channel_label: draft.channelLabel,
    utm_source: draft.utmSource,
    utm_medium: draft.utmMedium,
    utm_campaign: draft.utmCampaign,
    utm_content: draft.utmContent,
    is_custom: draft.isCustom,
  });

  if (error) {
    if (error.code === "23505") {
      redirectToLink(linkRequestId, "channelError", "channel_exists");
    }

    if (error.code === "23514" || error.code === "42501") {
      redirectToLink(linkRequestId, "channelError", "not_approved");
    }

    redirectToLink(linkRequestId, "channelError", "create_failed");
  }

  revalidatePath(`/dashboard/links/${linkRequestId}`);
  redirectToLink(linkRequestId, "channelMessage", "channel_created");
}

export async function deleteLinkRequestAction(linkRequestId: string) {
  const safeLinkRequestId = linkRequestId.trim();

  if (!safeLinkRequestId) {
    return { error: "delete_failed" as const };
  }

  if (!getSupabasePublicConfig()) {
    return { error: "auth_not_configured" as const };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    return { error: "unauthenticated" as const };
  }

  const { data: requestData, error: requestError } = await supabase
    .from("link_requests")
    .select("id,requested_slug")
    .eq("id", safeLinkRequestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (requestError || !requestData) {
    return { error: "delete_failed" as const };
  }

  const request = requestData as unknown as LinkRequestDeleteRow;
  const { data: channelData } = await supabase
    .from("channel_links")
    .select("slug")
    .eq("link_request_id", request.id)
    .eq("user_id", userId);

  const channelSlugs = ((channelData ?? []) as unknown as ChannelLinkSlugRow[])
    .map((row) => row.slug)
    .filter((slug): slug is string => Boolean(slug));
  const { data: deleted, error } = await supabase.rpc("delete_own_link_request", {
    p_link_request_id: request.id,
  });

  if (error || deleted !== true) {
    console.error("[links] delete_own_link_request failed", error?.message ?? "not deleted");
    return { error: "delete_failed" as const };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
  revalidatePath(`/dashboard/links/${request.id}`);
  revalidatePath("/sitemap.xml");

  if (request.requested_slug) {
    revalidatePath(`/${request.requested_slug}`);
  }

  channelSlugs.forEach((slug) => {
    revalidatePath(`/${slug}`);
  });

  redirect("/dashboard/links?message=link_deleted");
}
