"use server";

import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/origin";
import {
  checkRateLimit,
  getClientIp,
  normalizeEmailForRateLimit,
} from "@/lib/rate-limit";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeErrorField(error: unknown, key: string) {
  if (!error || typeof error !== "object" || !(key in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function logPasswordResetError(error: unknown) {
  console.error("[auth] resetPasswordForEmail failed", {
    name: getSafeErrorField(error, "name"),
    message: getSafeErrorField(error, "message"),
    status: getSafeErrorField(error, "status"),
    code: getSafeErrorField(error, "code"),
  });
}

type SignUpUserFacingError =
  | "password_weak"
  | "invalid_email"
  | "rate_limited"
  | "register_failed";

// Maps a Supabase signUp failure to one of a small, fixed set of user-facing
// error keys consumed by the register page dictionary. Ham hata mesajı asla
// kullanıcıya geçmez; bilinmeyen her kod register_failed'e düşer. Çağıran
// yine de console.warn ile ham code/message'i loglar (observability bozulmaz).
function mapSignUpErrorCode(
  code: string | number | undefined,
  message: string | number | undefined,
): SignUpUserFacingError {
  if (typeof code === "string") {
    if (code === "weak_password") return "password_weak";
    if (code === "email_address_invalid") return "invalid_email";
    if (
      code === "over_email_send_rate_limit" ||
      code === "email_send_rate_limit" ||
      code === "over_request_rate_limit"
    ) {
      return "rate_limited";
    }
  }

  if (typeof message === "string") {
    const lower = message.toLowerCase();
    if (/password.*(weak|short|length|policy|character)/.test(lower)) {
      return "password_weak";
    }
    if (/email.*(invalid|format|address|valid)/.test(lower)) {
      return "invalid_email";
    }
  }

  return "register_failed";
}

export async function signInAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect("/login?error=auth_not_configured");
  }

  const email = getField(formData, "email");
  const password = getField(formData, "password");

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  const normalizedEmail = normalizeEmailForRateLimit(email);
  const ipKey = await getClientIp();

  const ipAllowed = await checkRateLimit({
    action: "auth:login:ip",
    key: ipKey,
    limit: 10,
    windowSeconds: 300,
    mode: "fail-closed",
  });

  if (!ipAllowed) {
    redirect("/login?error=rate_limited");
  }

  if (normalizedEmail) {
    const emailAllowed = await checkRateLimit({
      action: "auth:login:email",
      key: normalizedEmail,
      limit: 8,
      windowSeconds: 600,
      mode: "fail-closed",
    });

    if (!emailAllowed) {
      redirect("/login?error=rate_limited");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=login_failed");
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect("/register?error=auth_not_configured");
  }

  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const passwordConfirm = getField(formData, "password_confirm");

  if (!email || !password) {
    redirect("/register?error=missing_fields");
  }

  if (password.length < 8) {
    redirect("/register?error=password_too_short");
  }

  if (password !== passwordConfirm) {
    redirect("/register?error=password_mismatch");
  }

  if (formData.get("terms_consent") !== "accepted") {
    redirect("/register?error=consent_required");
  }

  const normalizedEmail = normalizeEmailForRateLimit(email);
  const ipKey = await getClientIp();

  const ipAllowed = await checkRateLimit({
    action: "auth:register:ip",
    key: ipKey,
    limit: 5,
    windowSeconds: 600,
    mode: "fail-closed",
  });

  if (!ipAllowed) {
    redirect("/register?error=rate_limited");
  }

  if (normalizedEmail) {
    const emailAllowed = await checkRateLimit({
      action: "auth:register:email",
      key: normalizedEmail,
      limit: 3,
      windowSeconds: 1800,
      mode: "fail-closed",
    });

    if (!emailAllowed) {
      redirect("/register?error=rate_limited");
    }
  }

  const origin = await getAppOrigin();
  const supabase = await createClient();
  const legalNoticeRecordedAt = new Date().toISOString();
  // The Supabase Confirm-signup email template renders the link from
  // {{ .TokenHash }} pointed at /auth/confirm (see RUNBOOK / SECURITY).
  // `emailRedirectTo` is only consulted as the {{ .RedirectTo }} fallback if
  // the template is ever reverted to {{ .ConfirmationURL }}, so we still
  // point it at /auth/confirm so degraded flows fail fast on a known route
  // instead of landing on /dashboard with an un-handled PKCE code.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      data: {
        terms_accepted_at: legalNoticeRecordedAt,
        terms_version: "2026-08-28",
        terms_source: "web_register",
        privacy_notice_shown_at: legalNoticeRecordedAt,
        privacy_notice_version: "2026-08-28",
        privacy_notice_source: "web_register",
      },
    },
  });

  if (error) {
    const errorCode = getSafeErrorField(error, "code");
    const errorMessage = getSafeErrorField(error, "message");
    const looksLikeExisting =
      errorCode === "user_already_exists" ||
      errorCode === "email_exists" ||
      (typeof errorMessage === "string" &&
        /already (registered|exists)/i.test(errorMessage));

    // Treat "email already exists" as the generic success branch so we do not
    // leak account existence via a distinct error message. All other errors
    // (validation failures, infra hiccups) still surface a retry prompt — but
    // mapped to a small set of safe user-facing keys instead of the legacy
    // generic register_failed for every Supabase failure.
    if (!looksLikeExisting) {
      console.warn("[auth] signUp failed", {
        name: getSafeErrorField(error, "name"),
        message: errorMessage,
        status: getSafeErrorField(error, "status"),
        code: errorCode,
      });
      const userFacingError = mapSignUpErrorCode(errorCode, errorMessage);
      redirect(`/register?error=${userFacingError}`);
    }
  }

  // With Email Enumeration Protection enabled (Supabase default), signUp on an
  // already-registered confirmed email returns no error but an obfuscated user
  // object with an empty identities array. We log this case for observability
  // and show the same generic success message to preserve the protection.
  if (
    !error &&
    data?.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    console.log("[auth] signUp on existing/obfuscated email", {
      emailDomain: email.split("@")[1] || "unknown",
    });
  }

  redirect("/register?message=check_email");
}

export async function requestPasswordResetAction(formData: FormData) {
  // The only branch we leak to the user is the generic "if registered, sent"
  // confirmation. Every other outcome — empty submission, rate-limit hit,
  // Supabase-side failure, unknown account — converges on the same redirect
  // so the public response cannot be used to enumerate registered emails.
  // Configuration errors are still surfaced because they indicate a misdeploy
  // and should never appear in a healthy production environment.
  if (!getSupabasePublicConfig()) {
    redirect("/forgot-password?error=auth_not_configured");
  }

  const email = getField(formData, "email");
  const normalizedEmail = normalizeEmailForRateLimit(email);
  const ipKey = await getClientIp();

  // Run the IP-keyed limiter before any branch returns so blank submissions
  // cannot be used to bypass it. The RPC increments on every call.
  const ipAllowed = await checkRateLimit({
    action: "auth:reset:ip",
    key: ipKey,
    limit: 5,
    windowSeconds: 900,
    mode: "fail-closed",
  });

  if (!ipAllowed) {
    redirect("/forgot-password?message=sent");
  }

  if (normalizedEmail) {
    const emailAllowed = await checkRateLimit({
      action: "auth:reset:email",
      key: normalizedEmail,
      limit: 3,
      windowSeconds: 3600,
      mode: "fail-closed",
    });

    if (!emailAllowed) {
      redirect("/forgot-password?message=sent");
    }
  }

  if (!email) {
    redirect("/forgot-password?message=sent");
  }

  const origin = await getAppOrigin();
  const supabase = await createClient();
  // The Supabase email template renders the recovery link from
  // {{ .TokenHash }} pointed at /auth/confirm (see RUNBOOK / SECURITY).
  // `redirectTo` is only consulted as the {{ .RedirectTo }} fallback if the
  // template is ever reverted to {{ .ConfirmationURL }}, so we still point
  // it at /auth/confirm so degraded flows fail fast instead of landing on a
  // PKCE-bound URL the client cannot complete.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    logPasswordResetError(error);
  }

  redirect("/forgot-password?message=sent");
}

export async function signOutAction() {
  if (getSupabasePublicConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}

export async function deleteAccountAction() {
  if (!getSupabasePublicConfig()) {
    return { error: "auth_not_configured" as const };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    return { error: "unauthenticated" as const };
  }

  const { error } = await supabase.rpc("delete_current_user");

  if (error) {
    console.error("[auth] delete_current_user failed", error.message);
    return { error: "delete_failed" as const };
  }

  await supabase.auth.signOut();
  redirect("/");
}
