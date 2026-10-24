export const ADMIN_USERS_PAGE_SIZE = 25;
export const ADMIN_USER_LOOKUP_BATCH_SIZE = 100;

export type AdminUserAccountStatus =
  | "active"
  | "suspended"
  | "unconfirmed"
  | "deleted";

export type AdminUserOverview = {
  userId: string;
  email: string | null;
  linkCount: number;
  hasLinkVitrine: boolean;
};

export type AdminUserOverviewLookup =
  | {
      ok: true;
      usersById: ReadonlyMap<string, AdminUserOverview>;
    }
  | {
      ok: false;
      error: "admin_required" | "load_failed";
    };

export type AdminAuthUserSnapshot = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  deletedAt: string | null;
};

export type AdminUserSummary = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  linkCount: number | null;
  hasLinkVitrine: boolean | null;
  status: AdminUserAccountStatus;
};

export const adminUserStatusLabels: Record<AdminUserAccountStatus, string> = {
  active: "Aktif",
  suspended: "Askıda",
  unconfirmed: "E-posta doğrulanmadı",
  deleted: "Silindi",
};

export const adminUserStatusTones: Record<AdminUserAccountStatus, string> = {
  active: "border-[#80c99a]/55 bg-[#effbf3] text-[#0d6a3a]",
  suspended: "border-[#e47d6b]/50 bg-[#fff0ed] text-[#8d2d1f]",
  unconfirmed: "border-[#e6c46b]/55 bg-[#fff8e7] text-[#7a5a10]",
  deleted: "border-[var(--color-border)] bg-white text-[var(--color-muted)]",
};

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeAdminUsersPage(value: string | null | undefined) {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function deduplicateAdminUserIds(userIds: readonly string[]) {
  return Array.from(
    new Set(
      userIds
        .map((userId) => userId.trim())
        .filter((userId) => userId.length > 0),
    ),
  );
}

export function normalizeAdminLinkCount(value: number | string | null) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function getAdminUserAccountStatus(
  user: AdminAuthUserSnapshot,
  now = new Date(),
): AdminUserAccountStatus {
  if (user.deletedAt) {
    return "deleted";
  }

  if (user.bannedUntil) {
    const bannedUntil = new Date(user.bannedUntil);

    if (!Number.isNaN(bannedUntil.getTime()) && bannedUntil > now) {
      return "suspended";
    }
  }

  if (user.email && !user.emailConfirmedAt) {
    return "unconfirmed";
  }

  return "active";
}

export function buildAdminUserSummary(
  user: AdminAuthUserSnapshot,
  overview: AdminUserOverview | null,
  now = new Date(),
): AdminUserSummary {
  return {
    id: user.id,
    email: normalizeOptionalString(user.email),
    createdAt: normalizeOptionalString(user.createdAt),
    lastSignInAt: normalizeOptionalString(user.lastSignInAt),
    linkCount: overview?.linkCount ?? null,
    hasLinkVitrine: overview?.hasLinkVitrine ?? null,
    status: getAdminUserAccountStatus(user, now),
  };
}

export function getAdminCreatorEmailLabel(
  userId: string,
  lookup: AdminUserOverviewLookup,
) {
  if (!lookup.ok) {
    return "Kullanıcı bilgileri yüklenemedi";
  }

  const user = lookup.usersById.get(userId);

  if (!user) {
    return "Hesap bulunamadı";
  }

  return normalizeOptionalString(user.email) ?? "E-posta bulunamadı";
}
