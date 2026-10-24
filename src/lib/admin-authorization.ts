import "server-only";

import { cache } from "react";
import type { ProfileRole } from "@/lib/auth/profile";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAuthStatus } from "@/lib/auth/session";

export type AdminAccess = {
  isConfigured: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  profileRole: ProfileRole | null;
  isAdmin: boolean;
};

export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const auth = await getAuthStatus();
  const profile = auth.isAuthenticated ? await getCurrentProfile() : null;

  return {
    isConfigured: auth.isConfigured,
    isAuthenticated: auth.isAuthenticated,
    hasProfile: profile !== null,
    profileRole: profile?.role ?? null,
    isAdmin: profile?.role === "admin",
  };
});

export async function isCurrentUserAdmin() {
  return (await getAdminAccess()).isAdmin;
}
