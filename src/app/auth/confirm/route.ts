import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { applySupabaseAuthResponseHeaders } from "@/lib/supabase/auth-response-headers";

// Handles Supabase email confirmation links that use the token_hash flow
// (configured in the Supabase Dashboard email templates, e.g.:
//
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}
//     &type=recovery&next=/reset-password
//
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}
//     &type=signup&next=/dashboard
//
// ). For supported types we exchange the token_hash for a session via
// verifyOtp, set the session cookie, and forward the user to the path in
// `next`. Anything malformed lands on the per-type error page below.
//
// type=recovery → success: next (default /reset-password); failure: /reset-password?error=invalid_link
// type=signup   → success: next (default /dashboard);      failure: /login?error=invalid_link
// type=email    → success: next (default /dashboard);      failure: /login?error=invalid_link

type AllowedConfirmType = Extract<EmailOtpType, "recovery" | "signup" | "email">;

type TypeConfig = {
  defaultNext: string;
  errorRedirect: string;
};

const TYPE_CONFIG: Record<AllowedConfirmType, TypeConfig> = {
  recovery: {
    defaultNext: "/reset-password",
    errorRedirect: "/reset-password?error=invalid_link",
  },
  signup: {
    defaultNext: "/dashboard",
    errorRedirect: "/login?error=invalid_link",
  },
  email: {
    defaultNext: "/dashboard",
    errorRedirect: "/login?error=invalid_link",
  },
};

const UNKNOWN_TYPE_REDIRECT = "/login?error=invalid_link";

function isAllowedType(value: string | null): value is AllowedConfirmType {
  return value === "recovery" || value === "signup" || value === "email";
}

function isSafeNext(value: string | null): value is string {
  if (!value) {
    return false;
  }
  if (!value.startsWith("/")) {
    return false;
  }
  // Reject protocol-relative ("//evil") and back-slash variants Safari and
  // Chrome resolve to absolute URLs.
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next");

  const type = isAllowedType(typeParam) ? typeParam : null;
  const errorRedirectPath = type
    ? TYPE_CONFIG[type].errorRedirect
    : UNKNOWN_TYPE_REDIRECT;

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL(errorRedirectPath, request.url));
  }

  const publicConfig = getSupabasePublicConfig();
  if (!publicConfig) {
    return NextResponse.redirect(new URL(errorRedirectPath, request.url));
  }

  const typeConfig = TYPE_CONFIG[type];
  const next = isSafeNext(nextParam) ? nextParam : typeConfig.defaultNext;

  // Build the success redirect up front and bind the Supabase client to it so
  // verifyOtp's Set-Cookie headers land on the exact response we return.
  // Cookies written through next/headers cookies() are not reliably attached to
  // a manually constructed NextResponse.redirect() inside a route handler, which
  // previously dropped the recovery/signup session and made valid links look
  // expired once the user reached the next page. Mirrors lib/supabase/proxy.ts.
  const successResponse = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(publicConfig.url, publicConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        applySupabaseAuthResponseHeaders(successResponse.headers, responseHeaders);

        cookiesToSet.forEach(({ name, value, options }) => {
          successResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // A consumed or expired one-time token still reaches here. If the visitor
    // already holds a valid session — e.g. they clicked the single-use link
    // twice, or an email security scanner pre-fetched it after their first
    // successful click — let them continue instead of bouncing a usable
    // session to the error page. getUser() refreshes the session cookie onto
    // successResponse when needed (verified against Supabase, not just cookies).
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      return successResponse;
    }

    console.error("[auth] verifyOtp failed", {
      type,
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return NextResponse.redirect(new URL(typeConfig.errorRedirect, request.url));
  }

  return successResponse;
}
