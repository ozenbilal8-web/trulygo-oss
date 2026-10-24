import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./env";

export async function createClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        const hasAuthResponseMutation =
          cookiesToSet.length > 0 || Object.keys(responseHeaders).length > 0;

        if (hasAuthResponseMutation) {
          // next/headers has no writable outgoing Headers. Keep this scope
          // dynamic; Next also forces Server Action responses to no-store.
          noStore();
        }

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Proxy and Server Actions can.
        }
      },
    },
  });
}

// Cookieless anon client for fire-and-forget public RPCs (e.g. inside `after()`).
// Next.js does not allow reading cookies() inside `after()`, and the click-event
// RPC is granted to anon so it does not need a user session.
export function createAnonymousClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createSupabaseClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
