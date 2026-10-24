import "server-only";

import {
  isUuid,
  isValidCollaborationEmail,
  normalizeCollaborationEmail,
  type LinkVitrineCollaborationSettings,
} from "@/lib/link-vitrine-collaboration";
import { mapCollaborationSettings } from "@/lib/link-vitrine-collaboration-data";
import { buildCollaborationOwnerRateLimitHash } from "@/lib/link-vitrine-collaboration-hash";
import { checkRateLimit } from "@/lib/rate-limit";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function checkLinkVitrineCollaborationSettingsRateLimit(
  userId: string,
): Promise<"allowed" | "rate_limited" | "unavailable"> {
  const ownerRateKey = buildCollaborationOwnerRateLimitHash(userId);

  if (!ownerRateKey) {
    return "unavailable";
  }

  const allowed = await checkRateLimit({
    action: "link-vitrine:collaboration:settings",
    key: ownerRateKey,
    limit: 30,
    windowSeconds: 60 * 60,
    mode: "fail-closed",
  });

  return allowed ? "allowed" : "rate_limited";
}

function firstRow<T>(value: unknown): T | null {
  return Array.isArray(value) && value.length > 0
    ? (value[0] as T)
    : null;
}

export async function persistOwnedLinkVitrineCollaborationSettings({
  notificationEmail,
  requestsEnabled,
  supabase,
  vitrineId,
}: {
  notificationEmail: string;
  requestsEnabled: boolean;
  supabase: SupabaseServerClient;
  vitrineId: string;
}): Promise<LinkVitrineCollaborationSettings | null> {
  const normalizedEmail = normalizeCollaborationEmail(notificationEmail);

  if (
    !isUuid(vitrineId) ||
    !isValidCollaborationEmail(normalizedEmail) ||
    typeof requestsEnabled !== "boolean"
  ) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "save_current_user_link_vitrine_collaboration_settings",
    {
      p_vitrine_id: vitrineId,
      p_notification_email: normalizedEmail,
      p_requests_enabled: requestsEnabled,
    },
  );
  const settingsRow = firstRow<Parameters<typeof mapCollaborationSettings>[0]>(
    data,
  );
  const settings =
    !error && settingsRow ? mapCollaborationSettings(settingsRow) : null;

  if (
    !settings ||
    settings.vitrineId !== vitrineId ||
    settings.notificationEmail !== normalizedEmail ||
    settings.requestsEnabled !== requestsEnabled
  ) {
    return null;
  }

  return settings;
}
