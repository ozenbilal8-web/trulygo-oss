import { buildChannelSlug, slugifyToAscii } from "@/lib/slugs";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ChannelPreset = {
  key: string;
  label: string;
  suffix: string;
  utmSource: string;
  utmMedium: string;
};

export type ChannelLink = {
  id: string;
  linkRequestId: string;
  slug: string;
  channelKey: string;
  channelLabel: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  isCustom: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardChannelSummary = {
  count: number;
  primaryLabel: string | null;
};

export type ChannelLinkDraft = {
  slug: string;
  channelKey: string;
  channelLabel: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  isCustom: boolean;
};

type ChannelLinkRow = {
  id: string;
  link_request_id: string;
  slug: string;
  channel_key: string;
  channel_label: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  is_custom: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type DashboardChannelSummaryRow = {
  link_request_id: string;
  channel_label: string | null;
};

export const channelPresets = [
  {
    key: "instagram",
    label: "Instagram",
    suffix: "ig",
    utmSource: "instagram",
    utmMedium: "social",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    suffix: "wa",
    utmSource: "whatsapp",
    utmMedium: "messaging",
  },
  {
    key: "youtube",
    label: "YouTube",
    suffix: "yt",
    utmSource: "youtube",
    utmMedium: "video",
  },
  {
    key: "email",
    label: "E-posta",
    suffix: "email",
    utmSource: "email",
    utmMedium: "email",
  },
  {
    key: "qr",
    label: "QR",
    suffix: "qr",
    utmSource: "qr",
    utmMedium: "offline",
  },
  {
    key: "facebook",
    label: "Facebook",
    suffix: "fb",
    utmSource: "facebook",
    utmMedium: "social",
  },
  {
    key: "x",
    label: "X/Twitter",
    suffix: "x",
    utmSource: "x",
    utmMedium: "social",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    suffix: "li",
    utmSource: "linkedin",
    utmMedium: "social",
  },
  {
    key: "tiktok",
    label: "TikTok",
    suffix: "tt",
    utmSource: "tiktok",
    utmMedium: "social",
  },
  {
    key: "telegram",
    label: "Telegram",
    suffix: "tg",
    utmSource: "telegram",
    utmMedium: "messaging",
  },
  {
    key: "sms",
    label: "SMS",
    suffix: "sms",
    utmSource: "sms",
    utmMedium: "messaging",
  },
] as const satisfies ChannelPreset[];

const channelLinkColumns = [
  "id",
  "link_request_id",
  "slug",
  "channel_key",
  "channel_label",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "is_custom",
  "created_at",
  "updated_at",
].join(",");

function mapChannelLink(row: ChannelLinkRow): ChannelLink {
  return {
    id: row.id,
    linkRequestId: row.link_request_id,
    slug: row.slug,
    channelKey: row.channel_key,
    channelLabel: row.channel_label,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    isCustom: row.is_custom,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function truncateLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").slice(0, 80);
}

async function getCurrentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !userId) {
    return null;
  }

  return userId;
}

async function ownsLinkRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  linkRequestId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("link_requests")
    .select("id")
    .eq("id", linkRequestId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export function getChannelPreset(key: string | null) {
  return channelPresets.find((preset) => preset.key === key) ?? null;
}

export function getCampaignSlug(campaignName: string | null, fallbackSlug: string) {
  return slugifyToAscii(campaignName) ?? fallbackSlug;
}

export function buildPresetChannelDraft({
  parentSlug,
  campaignName,
  preset,
}: {
  parentSlug: string;
  campaignName: string | null;
  preset: ChannelPreset;
}): ChannelLinkDraft | null {
  const slug = buildChannelSlug(parentSlug, preset.suffix);

  if (!slug) {
    return null;
  }

  return {
    slug,
    channelKey: preset.key,
    channelLabel: preset.label,
    utmSource: preset.utmSource,
    utmMedium: preset.utmMedium,
    utmCampaign: getCampaignSlug(campaignName, parentSlug),
    utmContent: preset.key,
    isCustom: false,
  };
}

export function buildCustomChannelDraft({
  parentSlug,
  campaignName,
  label,
}: {
  parentSlug: string;
  campaignName: string | null;
  label: string;
}): ChannelLinkDraft | null {
  const channelLabel = truncateLabel(label);
  const channelKey = slugifyToAscii(channelLabel);

  if (!channelLabel || !channelKey || getChannelPreset(channelKey)) {
    return null;
  }

  const slug = buildChannelSlug(parentSlug, channelKey);

  if (!slug) {
    return null;
  }

  return {
    slug,
    channelKey,
    channelLabel,
    utmSource: channelKey,
    utmMedium: "custom",
    utmCampaign: getCampaignSlug(campaignName, parentSlug),
    utmContent: channelKey,
    isCustom: true,
  };
}

export async function getCurrentUserChannelLinks(linkRequestId: string): Promise<ChannelLink[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  if (!userId) {
    return [];
  }

  const isOwner = await ownsLinkRequest(supabase, linkRequestId, userId);

  if (!isOwner) {
    return [];
  }

  const { data, error } = await supabase
    .from("channel_links")
    .select(channelLinkColumns)
    .eq("link_request_id", linkRequestId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return ((data ?? []) as unknown as ChannelLinkRow[]).map(mapChannelLink);
}

export async function getCurrentUserDashboardChannelSummaries(
  linkRequestIds: string[],
): Promise<Map<string, DashboardChannelSummary>> {
  if (!isSupabaseConfigured() || linkRequestIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channel_links")
    .select("link_request_id,channel_label")
    .in("link_request_id", linkRequestIds)
    .order("created_at", { ascending: true });

  if (error) {
    return new Map();
  }

  const summaries = new Map<string, DashboardChannelSummary>();

  for (const row of (data ?? []) as unknown as DashboardChannelSummaryRow[]) {
    const current = summaries.get(row.link_request_id);
    const label = row.channel_label?.trim() || null;

    summaries.set(row.link_request_id, {
      count: (current?.count ?? 0) + 1,
      primaryLabel: current?.primaryLabel ?? label,
    });
  }

  return summaries;
}
