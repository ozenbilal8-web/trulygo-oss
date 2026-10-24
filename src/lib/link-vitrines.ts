import { cache } from "react";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAnonymousClient, createClient } from "@/lib/supabase/server";
import {
  isSafePublicVitrineUrl,
  isVitrineIndexable,
} from "@/lib/link-vitrine-indexability";
import {
  parseLinkVitrineProfileViewCount,
  type LinkVitrineProfileViewCount,
} from "@/lib/link-vitrine-profile-views";
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
  resolveVitrineDisplayName,
  type LinkVitrineAnimationType,
  type LinkVitrineItemInput,
  type LinkVitrinePlatform,
  type LinkVitrineSponsoredLabel,
  type LinkVitrineTheme,
} from "./link-vitrine-config";

export { resolveVitrineDisplayName };

export type LinkVitrineItem = LinkVitrineItemInput & {
  id: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LinkVitrine = {
  id: string | null;
  userId: string | null;
  handle: string;
  displayName: string;
  bio: string | null;
  theme: LinkVitrineTheme;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bannerUpdatedAt: string | null;
  bannerPositionX: number;
  bannerPositionY: number;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  items: LinkVitrineItem[];
};


type LinkVitrineItemRow = {
  id: string;
  platform: string;
  label: string;
  url: string | null;
  is_active: boolean;
  sort_order: number | null;
  is_sponsored: boolean;
  sponsored_label: string | null;
  animation_enabled: boolean;
  animation_type: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LinkVitrineRow = {
  id: string;
  user_id?: string | null;
  handle: string;
  display_name: string;
  bio: string | null;
  theme: string;
  avatar_url: string | null;
  banner_url: string | null;
  banner_updated_at: string | null;
  banner_position_x: number | string | null;
  banner_position_y: number | string | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
  link_vitrine_items?: LinkVitrineItemRow[] | null;
};

type LinkVitrineSitemapEntry = {
  handle: string;
  updatedAt: string | null;
};

type LinkVitrineSitemapRow = {
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  is_published: boolean;
  updated_at: string | null;
  link_vitrine_items?: Array<{
    url: string | null;
    is_active: boolean;
  }> | null;
};

export type LinkVitrineSummary = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

const vitrineSelect = `
  id,
  user_id,
  handle,
  display_name,
  bio,
  theme,
  avatar_url,
  banner_url,
  banner_updated_at,
  banner_position_x,
  banner_position_y,
  is_published,
  created_at,
  updated_at,
  link_vitrine_items (
    id,
    platform,
    label,
    url,
    is_active,
    sort_order,
    is_sponsored,
    sponsored_label,
    animation_enabled,
    animation_type,
    created_at,
    updated_at
  )
`;

const publicVitrineSelect = `
  id,
  handle,
  display_name,
  bio,
  theme,
  avatar_url,
  banner_url,
  banner_updated_at,
  banner_position_x,
  banner_position_y,
  is_published,
  created_at,
  updated_at,
  link_vitrine_items (
    id,
    platform,
    label,
    url,
    is_active,
    sort_order,
    is_sponsored,
    sponsored_label,
    animation_enabled,
    animation_type,
    created_at,
    updated_at
  )
`;

const sitemapVitrineSelect = `
  handle,
  display_name,
  bio,
  is_published,
  updated_at,
  link_vitrine_items (
    url,
    is_active
  )
`;

export function createLinkVitrineDraft({
  displayName,
  handle,
}: {
  displayName: string;
  handle: string;
}): LinkVitrine {
  return {
    id: null,
    userId: null,
    displayName,
    handle: normalizeVitrineHandle(handle) || "vitrin",
    bio: "",
    theme: "dark-premium",
    avatarUrl: null,
    bannerUrl: null,
    bannerUpdatedAt: null,
    bannerPositionX: DEFAULT_BANNER_POSITION,
    bannerPositionY: DEFAULT_BANNER_POSITION,
    isPublished: false,
    createdAt: null,
    updatedAt: null,
    items: createDefaultLinkVitrineItems().map((item) => ({
      ...item,
      id: null,
      createdAt: null,
      updatedAt: null,
    })),
  };
}

function mapItems(rows: LinkVitrineItemRow[] | null | undefined): LinkVitrineItem[] {
  const platformFallbackOrder = new Map<LinkVitrinePlatform, number>();
  const platformsWithRows = new Set<LinkVitrinePlatform>();
  const mappedRows: LinkVitrineItem[] = [];

  LINK_VITRINE_PLATFORMS.forEach((platform, index) => {
    platformFallbackOrder.set(platform.id, index + 1);
  });

  for (const row of rows ?? []) {
    if (!isLinkVitrinePlatform(row.platform)) {
      continue;
    }

    const platform = LINK_VITRINE_PLATFORMS.find((item) => item.id === row.platform);
    platformsWithRows.add(row.platform);
    const sponsoredLabel: LinkVitrineSponsoredLabel | null =
      row.sponsored_label && isLinkVitrineSponsoredLabel(row.sponsored_label)
        ? row.sponsored_label
        : null;
    const animationType: LinkVitrineAnimationType | null =
      row.animation_type && isLinkVitrineAnimationType(row.animation_type)
        ? row.animation_type
        : null;

    mappedRows.push({
      id: row.id,
      platform: row.platform,
      label: row.label?.trim() || platform?.label || row.platform,
      url: row.url,
      isActive: row.is_active,
      sortOrder: row.sort_order ?? platformFallbackOrder.get(row.platform) ?? mappedRows.length + 1,
      isSponsored: Boolean(row.is_sponsored && sponsoredLabel),
      sponsoredLabel: row.is_sponsored ? sponsoredLabel : null,
      animationEnabled: Boolean(row.animation_enabled && animationType),
      animationType: row.animation_enabled ? animationType : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  const rowsWithUrl = mappedRows.filter((item) => item.url?.trim());
  const emptyRows = mappedRows.filter((item) => !item.url?.trim());
  const sortedRowsWithUrl = rowsWithUrl.sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  );
  const shouldNormalizeLegacyDisplayOrder = sortedRowsWithUrl.some(
    (item) => item.sortOrder < 1 || item.sortOrder >= 1000,
  );
  const displayRows = shouldNormalizeLegacyDisplayOrder
    ? sortedRowsWithUrl.map((item, index) => ({ ...item, sortOrder: index + 1 }))
    : sortedRowsWithUrl;

  const defaultRows = createDefaultLinkVitrineItems()
    .filter((item) => !platformsWithRows.has(item.platform))
    .map((item) => ({
      ...item,
      sortOrder: 0,
      id: null,
      createdAt: null,
      updatedAt: null,
    }));

  return [
    ...displayRows,
    ...emptyRows.map((item) => ({ ...item, sortOrder: 0 })),
    ...defaultRows,
  ];
}

function mapVitrine(row: LinkVitrineRow | null): LinkVitrine | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id ?? null,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    theme: isLinkVitrineTheme(row.theme) ? row.theme : "dark-premium",
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    bannerUpdatedAt: row.banner_updated_at,
    bannerPositionX: clampBannerPosition(row.banner_position_x ?? DEFAULT_BANNER_POSITION),
    bannerPositionY: clampBannerPosition(row.banner_position_y ?? DEFAULT_BANNER_POSITION),
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: mapItems(row.link_vitrine_items),
  };
}

export async function getCurrentUserId() {
  if (!getSupabasePublicConfig()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !userId) {
    return null;
  }

  return userId;
}

export const getCurrentUserLinkVitrineById = cache(
  async (id: string): Promise<LinkVitrine | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const userId = await getCurrentUserId();

    if (!userId) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("link_vitrines")
      .select(publicVitrineSelect)
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapVitrine(data as unknown as LinkVitrineRow);
  },
);

export const getCurrentUserLinkVitrine = cache(async (): Promise<LinkVitrine | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_vitrines")
    .select(vitrineSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapVitrine(data as unknown as LinkVitrineRow);
});

export async function getCurrentUserLinkVitrineProfileViewCount(): Promise<LinkVitrineProfileViewCount> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_current_user_link_vitrine_profile_view_count",
    );

    if (error) {
      console.warn("[link-vitrine] profile view count query failed", {
        code: error.code,
        message: error.message,
      });
      return null;
    }

    return parseLinkVitrineProfileViewCount(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[link-vitrine] profile view count query threw", { message });
    return null;
  }
}

export const getPublicLinkVitrineByHandle = cache(
  async (handle: string): Promise<LinkVitrine | null> => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase public environment variables are not configured.");
    }

    const normalizedHandle = normalizeVitrineHandle(handle);

    if (!normalizedHandle) {
      return null;
    }

    const supabase = createAnonymousClient();
    const { data, error } = await supabase
      .from("link_vitrines")
      .select(publicVitrineSelect)
      .eq("handle", normalizedHandle)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      throw new Error("Public Link Vitrini query failed.", { cause: error });
    }

    if (!data) {
      return null;
    }

    const vitrine = mapVitrine(data as unknown as LinkVitrineRow);

    if (!vitrine?.isPublished) {
      return null;
    }

    return {
      ...vitrine,
      items: vitrine.items.filter(
        (item) => item.isActive && isSafePublicVitrineUrl(item.url),
      ),
    };
  },
);

export async function getPublicLinkVitrineSitemapEntries(): Promise<LinkVitrineSitemapEntry[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  const supabase = createAnonymousClient();
  const { data, error } = await supabase
    .from("link_vitrines")
    .select(sitemapVitrineSelect)
    .eq("is_published", true)
    .not("handle", "is", null)
    .eq("link_vitrine_items.is_active", true)
    .order("updated_at", { ascending: false })
    // Above 5,000 public profiles, split this feed with a sitemap index and pagination.
    .limit(5000);

  if (error) {
    throw new Error("Public Link Vitrini sitemap query failed.", { cause: error });
  }

  if (!data) {
    return [];
  }

  return (data as unknown as LinkVitrineSitemapRow[])
    .map((row) => {
      const handle = row.handle ?? "";
      const items = (row.link_vitrine_items ?? []).map((item) => ({
        isActive: item.is_active,
        url: item.url,
      }));

      if (
        !isVitrineIndexable({
          bio: row.bio,
          displayName: row.display_name,
          handle,
          isPublished: row.is_published,
          items,
        })
      ) {
        return null;
      }

      return {
        handle,
        updatedAt: row.updated_at,
      };
    })
    .filter((entry): entry is LinkVitrineSitemapEntry => entry !== null);
}

export async function getRecentPublicLinkVitrines(limit = 6): Promise<LinkVitrineSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = createAnonymousClient();
    const { data, error } = await supabase
      .from("link_vitrines")
      .select("handle, display_name, avatar_url, is_published, updated_at")
      .eq("is_published", true)
      .not("handle", "is", null)
      .order("updated_at", { ascending: false })
      .limit(Math.max(1, limit) * 4);

    if (error || !data) {
      return [];
    }

    const seen = new Set<string>();
    const summaries: LinkVitrineSummary[] = [];

    for (const row of data as Array<{
      handle: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }>) {
      const handle = row.handle ?? "";

      if (
        !isValidVitrineHandle(handle) ||
        handle !== normalizeVitrineHandle(handle) ||
        seen.has(handle)
      ) {
        continue;
      }

      seen.add(handle);
      summaries.push({
        handle,
        displayName: resolveVitrineDisplayName({ displayName: row.display_name ?? "", handle }),
        avatarUrl: row.avatar_url,
      });

      if (summaries.length >= limit) {
        break;
      }
    }

    return summaries;
  } catch {
    return [];
  }
}
