import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthStatus = {
  isConfigured: boolean;
  isAuthenticated: boolean;
  email: string | null;
};

export const getAuthStatus = cache(async (): Promise<AuthStatus> => {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      isAuthenticated: false,
      email: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return {
      isConfigured: true,
      isAuthenticated: false,
      email: null,
    };
  }

  const claims = data.claims as Record<string, unknown>;
  const email = typeof claims.email === "string" ? claims.email : null;

  return {
    isConfigured: true,
    isAuthenticated: true,
    email,
  };
});
