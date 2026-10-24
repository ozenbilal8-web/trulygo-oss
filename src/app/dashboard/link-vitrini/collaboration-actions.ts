"use server";

import { revalidatePath } from "next/cache";
import {
  isLinkVitrineCollaborationStatus,
  isUuid,
  isValidCollaborationEmail,
  normalizeCollaborationEmail,
  type LinkVitrineCollaborationStatus,
} from "@/lib/link-vitrine-collaboration";
import {
  getCurrentUserLinkVitrineCollaborationNotifications,
  getCurrentUserLinkVitrineCollaborationRequestDetail,
} from "@/lib/link-vitrine-collaboration-data";
import {
  checkLinkVitrineCollaborationSettingsRateLimit,
  persistOwnedLinkVitrineCollaborationSettings,
} from "@/lib/link-vitrine-collaboration-settings-server";
import {
  buildCollaborationEmailRateLimitHash,
  buildCollaborationGlobalIpRateLimitHash,
  buildCollaborationOwnerRateLimitHash,
  createCollaborationVerificationToken,
} from "@/lib/link-vitrine-collaboration-hash";
import { buildCollaborationVerificationEmail } from "@/lib/link-vitrine-collaboration-email-template";
import {
  getConfiguredCollaborationAppOrigin,
  sendResendEmail,
} from "@/lib/link-vitrine-collaboration-email-server";
import {
  prepareLinkVitrineCollaborationEmailVerification,
  revokeLinkVitrineCollaborationEmailVerification,
} from "@/lib/link-vitrine-collaboration-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type OwnerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  handle: string;
};

async function getOwnerContext(vitrineId: string): Promise<OwnerContext | null> {
  if (!isSupabaseConfigured() || !isUuid(vitrineId)) {
    return null;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("link_vitrines")
    .select("handle")
    .eq("id", vitrineId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.handle) {
    return null;
  }

  return { supabase, userId, handle: data.handle };
}

export async function saveLinkVitrineCollaborationSettingsAction(input: {
  vitrineId: string;
  notificationEmail: string;
  requestsEnabled: boolean;
}) {
  const normalizedEmail = normalizeCollaborationEmail(
    input.notificationEmail,
  );

  if (
    !isUuid(input.vitrineId) ||
    !isValidCollaborationEmail(normalizedEmail) ||
    typeof input.requestsEnabled !== "boolean"
  ) {
    return { ok: false as const, error: "invalid_settings" as const };
  }

  const context = await getOwnerContext(input.vitrineId);

  if (!context) {
    return { ok: false as const, error: "unauthenticated" as const };
  }

  const rateLimitResult =
    await checkLinkVitrineCollaborationSettingsRateLimit(context.userId);

  if (rateLimitResult === "unavailable") {
    return {
      ok: false as const,
      error: "temporarily_unavailable" as const,
    };
  }

  if (rateLimitResult === "rate_limited") {
    return { ok: false as const, error: "rate_limited" as const };
  }

  const settings = await persistOwnedLinkVitrineCollaborationSettings({
    notificationEmail: normalizedEmail,
    requestsEnabled: input.requestsEnabled,
    supabase: context.supabase,
    vitrineId: input.vitrineId,
  });

  if (!settings) {
    return { ok: false as const, error: "save_failed" as const };
  }

  revalidatePath(`/v/${context.handle}`);
  revalidatePath("/dashboard/link-vitrini/new");

  return { ok: true as const, settings };
}

export async function requestLinkVitrineCollaborationVerificationAction(input: {
  vitrineId: string;
  notificationEmail: string;
  requestsEnabled: boolean;
}) {
  const normalizedEmail = normalizeCollaborationEmail(
    input.notificationEmail,
  );

  if (
    !isUuid(input.vitrineId) ||
    !isValidCollaborationEmail(normalizedEmail) ||
    typeof input.requestsEnabled !== "boolean"
  ) {
    return { ok: false as const, error: "invalid_settings" as const };
  }

  const appOrigin = getConfiguredCollaborationAppOrigin();

  if (!appOrigin || !process.env.RESEND_API_KEY?.trim()) {
    return { ok: false as const, error: "email_not_configured" as const };
  }

  const context = await getOwnerContext(input.vitrineId);

  if (!context) {
    return { ok: false as const, error: "unauthenticated" as const };
  }

  const visitorRateKey = buildCollaborationGlobalIpRateLimitHash(
    await getClientIp(),
  );
  const ownerRateKey = buildCollaborationOwnerRateLimitHash(context.userId);
  const emailRateKey = buildCollaborationEmailRateLimitHash({
    email: normalizedEmail,
    handle: context.handle,
  });

  if (!visitorRateKey || !ownerRateKey || !emailRateKey) {
    return { ok: false as const, error: "temporarily_unavailable" as const };
  }

  const [userAllowed, ipAllowed, emailAllowed] = await Promise.all([
    checkRateLimit({
      action: "link-vitrine:collaboration:verification-user",
      key: ownerRateKey,
      limit: 5,
      windowSeconds: 60 * 60,
      mode: "fail-closed",
    }),
    checkRateLimit({
      action: "link-vitrine:collaboration:verification-ip",
      key: visitorRateKey,
      limit: 10,
      windowSeconds: 60 * 60,
      mode: "fail-closed",
    }),
    checkRateLimit({
      action: "link-vitrine:collaboration:verification-email",
      key: emailRateKey,
      limit: 5,
      windowSeconds: 60 * 60,
      mode: "fail-closed",
    }),
  ]);

  if (!userAllowed || !ipAllowed || !emailAllowed) {
    return { ok: false as const, error: "rate_limited" as const };
  }

  const settings = await persistOwnedLinkVitrineCollaborationSettings({
    notificationEmail: normalizedEmail,
    requestsEnabled: input.requestsEnabled,
    supabase: context.supabase,
    vitrineId: input.vitrineId,
  });

  if (!settings) {
    return { ok: false as const, error: "save_failed" as const };
  }

  const verificationToken = createCollaborationVerificationToken();

  if (!verificationToken) {
    return { ok: false as const, error: "temporarily_unavailable" as const };
  }

  const expiresAt = new Date(Date.now() + 45 * 60 * 1_000).toISOString();
  const prepared = await prepareLinkVitrineCollaborationEmailVerification({
    vitrineId: input.vitrineId,
    ownerUserId: context.userId,
    email: normalizedEmail,
    tokenHash: verificationToken.tokenHash,
    expiresAt,
  });

  if (!prepared) {
    return { ok: false as const, error: "save_failed" as const };
  }

  const verificationUrl =
    `${appOrigin}/link-vitrini/bildirim-dogrula` +
    `#token=${encodeURIComponent(verificationToken.token)}`;
  const email = buildCollaborationVerificationEmail({ verificationUrl });
  const emailResult = await sendResendEmail({
    to: normalizedEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `link-vitrine-collaboration-verification/${verificationToken.tokenHash}`,
  });

  if (!emailResult.ok) {
    await revokeLinkVitrineCollaborationEmailVerification(
      verificationToken.tokenHash,
    );
    return { ok: false as const, error: "email_send_failed" as const };
  }

  revalidatePath(`/v/${context.handle}`);
  revalidatePath("/dashboard/link-vitrini/new");

  return {
    ok: true as const,
    verificationExpiresAt: expiresAt,
  };
}

export async function getLinkVitrineCollaborationNotificationsAction() {
  return getCurrentUserLinkVitrineCollaborationNotifications();
}

export async function getLinkVitrineCollaborationRequestDetailAction(
  requestId: string,
) {
  if (!isUuid(requestId)) {
    return { ok: false as const, error: "not_found" as const };
  }

  const detail =
    await getCurrentUserLinkVitrineCollaborationRequestDetail(requestId);

  return detail
    ? { ok: true as const, detail }
    : { ok: false as const, error: "not_found" as const };
}

export async function updateLinkVitrineCollaborationRequestStatusAction(input: {
  requestId: string;
  expectedStatus: LinkVitrineCollaborationStatus;
  newStatus: LinkVitrineCollaborationStatus;
}) {
  if (
    !isUuid(input.requestId) ||
    !isLinkVitrineCollaborationStatus(input.expectedStatus) ||
    !isLinkVitrineCollaborationStatus(input.newStatus) ||
    !isSupabaseConfigured()
  ) {
    return { ok: false as const, error: "invalid_status" as const };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "update_current_user_link_vitrine_collaboration_request_status",
    {
      p_request_id: input.requestId,
      p_expected_status: input.expectedStatus,
      p_new_status: input.newStatus,
    },
  );

  if (error || data !== true) {
    return { ok: false as const, error: "update_failed" as const };
  }

  revalidatePath("/dashboard/link-vitrini/new");
  return { ok: true as const, status: input.newStatus };
}
