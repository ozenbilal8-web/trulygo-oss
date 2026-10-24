import "server-only";

import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Fail mode controls what happens if the rate-limit RPC errors or Supabase
// or its server credential is not configured. Auth endpoints prefer "fail-closed" (block on infra
// failure) because the cost of letting one extra brute-force attempt through
// is low compared to a silent bypass. Link creation prefers "fail-open"
// (allow on infra failure) so a transient DB hiccup does not block real
// users from creating link requests; the auto-approval + admin review
// pipeline remains as the safety net.
export type RateLimitMode = "fail-closed" | "fail-open";

export type RateLimitInput = {
  action: string;
  key: string;
  limit: number;
  windowSeconds: number;
  mode?: RateLimitMode;
};

const UNKNOWN_IP_KEY = "unknown";

function firstForwardedIp(value: string | null) {
  const firstIp = value?.split(",")[0]?.trim();
  return firstIp || null;
}

/**
 * Best-effort client IP for rate-limit keying. Reads the same forwarded
 * headers as src/lib/click-visitor.ts to stay consistent with how Vercel /
 * Cloudflare / Fly surface the visitor address. When no usable header is
 * available we return the sentinel "unknown" so the limiter still applies
 * (callers should treat this as a shared bucket for header-less traffic).
 */
export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const ip =
    firstForwardedIp(requestHeaders.get("x-forwarded-for")) ||
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    requestHeaders.get("true-client-ip")?.trim() ||
    requestHeaders.get("fly-client-ip")?.trim() ||
    null;

  return ip || UNKNOWN_IP_KEY;
}

export function normalizeEmailForRateLimit(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function failModeResult(mode: RateLimitMode | undefined) {
  return mode === "fail-open";
}

/**
 * Returns true when the caller is still under the limit and the request
 * should proceed. The RPC increments the counter atomically, so each call
 * to checkRateLimit consumes one slot in the current fixed window.
 */
export async function checkRateLimit({
  action,
  key,
  limit,
  windowSeconds,
  mode = "fail-closed",
}: RateLimitInput): Promise<boolean> {
  const normalizedKey = key?.trim();

  if (!action || !normalizedKey) {
    return failModeResult(mode);
  }

  if (!isSupabaseConfigured()) {
    return failModeResult(mode);
  }

  try {
    // The RPC accepts server-selected buckets and must never be callable by a
    // public client: otherwise callers could consume someone else's quota.
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_action: action,
      p_key: normalizedKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.warn("[rate-limit] check_rate_limit rpc failed", {
        action,
        code: error.code,
        message: error.message,
      });
      return failModeResult(mode);
    }

    return data === true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[rate-limit] check_rate_limit threw", { action, message });
    return failModeResult(mode);
  }
}
