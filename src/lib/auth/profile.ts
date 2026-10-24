import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "user" | "admin";

export type UserProfile = {
  id: string;
  email: string | null;
  username: string | null;
  role: ProfileRole;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  created_at: string | null;
  updated_at: string | null;
};

function isProfileRole(role: string): role is ProfileRole {
  return role === "user" || role === "admin";
}

function mapProfile(row: ProfileRow | null): UserProfile | null {
  if (!row || !isProfileRole(row.role)) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,username,role,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return mapProfile(data as ProfileRow | null);
});
