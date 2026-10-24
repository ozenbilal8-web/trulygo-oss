import "server-only";

import type { User } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/admin-authorization";
import {
  ADMIN_USER_LOOKUP_BATCH_SIZE,
  ADMIN_USERS_PAGE_SIZE,
  buildAdminUserSummary,
  deduplicateAdminUserIds,
  normalizeAdminLinkCount,
  type AdminAuthUserSnapshot,
  type AdminUserOverview,
  type AdminUserOverviewLookup,
  type AdminUserSummary,
} from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type AdminUserOverviewRow = {
  user_id: string;
  email: string | null;
  link_count: number | string | null;
  has_link_vitrine: boolean | null;
};

export type AdminUsersPageResult =
  | {
      ok: true;
      users: AdminUserSummary[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      overviewUnavailable: boolean;
    }
  | {
      ok: false;
      error: "admin_required" | "load_failed";
    };

function getSafeErrorContext(error: unknown) {
  if (!error || typeof error !== "object") {
    return { kind: "unknown" };
  }

  const record = error as Record<string, unknown>;
  return {
    kind: typeof record.name === "string" ? record.name : "unknown",
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
  };
}

function logAdminDataFailure(operation: string, error: unknown) {
  console.error(`[admin-users] ${operation} failed`, getSafeErrorContext(error));
}

function toAuthUserSnapshot(user: User): AdminAuthUserSnapshot {
  return {
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    bannedUntil: user.banned_until ?? null,
    deletedAt: user.deleted_at ?? null,
  };
}

function mapOverviewRow(row: AdminUserOverviewRow): AdminUserOverview {
  return {
    userId: row.user_id,
    email: row.email,
    linkCount: normalizeAdminLinkCount(row.link_count),
    hasLinkVitrine: row.has_link_vitrine === true,
  };
}

async function fetchAdminUserOverviews(
  admin: AdminClient,
  userIds: readonly string[],
): Promise<AdminUserOverviewLookup> {
  const uniqueUserIds = deduplicateAdminUserIds(userIds);

  if (uniqueUserIds.length === 0) {
    return { ok: true, usersById: new Map() };
  }

  const rows: AdminUserOverviewRow[] = [];

  for (let index = 0; index < uniqueUserIds.length; index += ADMIN_USER_LOOKUP_BATCH_SIZE) {
    const batch = uniqueUserIds.slice(index, index + ADMIN_USER_LOOKUP_BATCH_SIZE);
    const { data, error } = await admin.rpc("get_admin_user_overviews", {
      p_user_ids: batch,
    });

    if (error) {
      logAdminDataFailure("overview query", error);
      return { ok: false, error: "load_failed" };
    }

    rows.push(...((data ?? []) as unknown as AdminUserOverviewRow[]));
  }

  const overviews = rows.map(mapOverviewRow);
  return {
    ok: true,
    usersById: new Map(overviews.map((overview) => [overview.userId, overview])),
  };
}

export async function getAdminUserOverviews(
  userIds: readonly string[],
): Promise<AdminUserOverviewLookup> {
  noStore();

  if (!(await isCurrentUserAdmin())) {
    return { ok: false, error: "admin_required" };
  }

  try {
    const admin = createAdminClient();
    return await fetchAdminUserOverviews(admin, userIds);
  } catch (error) {
    logAdminDataFailure("overview setup", error);
    return { ok: false, error: "load_failed" };
  }
}

export async function getAdminUsersPage(page: number): Promise<AdminUsersPageResult> {
  noStore();

  if (!(await isCurrentUserAdmin())) {
    return { ok: false, error: "admin_required" };
  }

  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      page: safePage,
      perPage: ADMIN_USERS_PAGE_SIZE,
    });

    if (error) {
      logAdminDataFailure("Auth user list", error);
      return { ok: false, error: "load_failed" };
    }

    const userIds = data.users.map((user) => user.id);
    const overviewLookup = await fetchAdminUserOverviews(admin, userIds);
    const minimumTotal = (safePage - 1) * ADMIN_USERS_PAGE_SIZE + data.users.length;
    const reportedTotal = Number.isSafeInteger(data.total) && data.total >= 0
      ? data.total
      : null;
    const visibleLowerBound = data.users.length > 0 ? minimumTotal : 0;
    const total = Math.max(reportedTotal ?? 0, visibleLowerBound);
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));
    const users = data.users.map((user) => {
      const snapshot = toAuthUserSnapshot(user);
      const overview = overviewLookup.ok
        ? (overviewLookup.usersById.get(user.id) ?? null)
        : null;
      return buildAdminUserSummary(snapshot, overview);
    });

    return {
      ok: true,
      users,
      page: safePage,
      pageSize: ADMIN_USERS_PAGE_SIZE,
      total,
      totalPages,
      hasPreviousPage: safePage > 1,
      hasNextPage: data.nextPage !== null || safePage < totalPages,
      overviewUnavailable: !overviewLookup.ok,
    };
  } catch (error) {
    logAdminDataFailure("user page setup", error);
    return { ok: false, error: "load_failed" };
  }
}
