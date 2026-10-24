"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ResetPasswordFormProps = {
  linkError: boolean;
};

type SessionState = "checking" | "ready" | "invalid";

const invalidLinkMessage =
  "Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.";

// Maps a supabase.auth.updateUser failure to a clear Turkish message. Supabase
// surfaces password-policy rejections (too short / weak / unchanged) with stable
// codes; everything else is treated as an expired/invalid recovery session so the
// user is told to request a fresh link rather than seeing a raw error.
function mapUpdateUserError(error: { code?: string; message?: string }) {
  const code = error.code;

  if (code === "weak_password") {
    return "Şifre çok zayıf. Daha uzun ve tahmin edilmesi zor bir şifre seçin.";
  }

  if (code === "same_password") {
    return "Yeni şifre eskisinden farklı olmalı.";
  }

  if (typeof error.message === "string" && /password/i.test(error.message)) {
    return "Şifre güvenlik kurallarını karşılamıyor. Daha güçlü bir şifre seçin.";
  }

  return "Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir; lütfen yeni bir bağlantı isteyin.";
}

function hasHashAuthError() {
  if (typeof window === "undefined") {
    return false;
  }

  const hash = window.location.hash;

  if (hash.length < 2) {
    return false;
  }

  const params = new URLSearchParams(hash.slice(1));
  return (
    params.has("error") || params.has("error_code") || params.has("error_description")
  );
}

export function ResetPasswordForm({ linkError }: ResetPasswordFormProps) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>(() =>
    linkError ? "invalid" : "checking",
  );
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (linkError) {
      return;
    }

    const authClient = supabase;
    let isMounted = true;
    let resolved = false;

    function markReady() {
      if (!isMounted || resolved) {
        return;
      }
      resolved = true;
      // /auth/confirm has already set the session cookie before redirecting
      // here, so the only thing left on the URL is a defensive cleanup of
      // any leftover hash fragment (legacy implicit-flow paths).
      if (window.location.hash.length > 1) {
        window.history.replaceState({}, "", "/reset-password");
      }
      setSessionState("ready");
    }

    function markInvalid() {
      if (!isMounted || resolved) {
        return;
      }
      resolved = true;
      setSessionState("invalid");
    }

    queueMicrotask(() => {
      if (!isMounted || resolved) {
        return;
      }

      if (!authClient) {
        markInvalid();
        return;
      }

      // Defensive: Supabase historically can surface failures on the hash
      // fragment (#error=...). The new token_hash flow lands on
      // /reset-password without a hash, but we keep this so any leftover
      // implicit-flow links continue to fail loudly instead of silently.
      if (hasHashAuthError()) {
        markInvalid();
        return;
      }

      // After /auth/confirm runs verifyOtp the session lives in the sb-*
      // cookies that the browser already has. getSession() reads from those
      // cookies (no network hop) so this resolves quickly.
      authClient.auth.getSession().then(({ data, error }) => {
        if (!isMounted || resolved) {
          return;
        }

        if (error || !data.session) {
          markInvalid();
          return;
        }

        markReady();
      });
    });

    return () => {
      isMounted = false;
    };
  }, [linkError, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    const authClient = supabase;

    if (!authClient || sessionState !== "ready") {
      setFormError(invalidLinkMessage);
      return;
    }

    if (password.length < 8) {
      setFormError("Şifre en az 8 karakter olmalı.");
      return;
    }

    if (password !== passwordRepeat) {
      setFormError("Şifreler eşleşmiyor.");
      return;
    }

    setIsSubmitting(true);
    window.dispatchEvent(new CustomEvent("trulygo:progress-start"));
    const { error } = await authClient.auth.updateUser({ password });
    setIsSubmitting(false);
    window.dispatchEvent(new CustomEvent("trulygo:progress-finish"));

    if (error) {
      setFormError(mapUpdateUserError(error));
      return;
    }

    setPassword("");
    setPasswordRepeat("");
    setSuccessMessage("Şifren güncellendi. Paneline yönlendiriliyorsun.");

    window.setTimeout(() => {
      router.refresh();
      window.location.replace("/dashboard");
    }, 900);
  }

  if (linkError || !supabase || sessionState === "invalid") {
    return (
      <div
        className="mt-6 rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f] shadow-[0_10px_24px_rgba(141,45,31,0.06)]"
        aria-live="polite"
      >
        {invalidLinkMessage}
      </div>
    );
  }

  if (sessionState === "checking") {
    return (
      <div
        className="soft-panel mt-6 px-4 py-4 text-sm font-medium leading-6 text-[var(--color-muted)]"
        aria-live="polite"
      >
        Şifre sıfırlama bağlantısı kontrol ediliyor.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-white/85">
        Yeni şifre
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="form-field"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-white/85">
        Yeni şifre tekrar
        <input
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="form-field"
        />
      </label>

      {formError ? (
        <div
          className="rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f] shadow-[0_10px_24px_rgba(141,45,31,0.06)]"
          aria-live="polite"
        >
          {formError}
        </div>
      ) : null}

      {successMessage ? (
        <div
          className="rounded-lg border border-[#80c99a]/55 bg-[var(--color-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[#0d6a3a] shadow-[0_10px_24px_rgba(18,140,74,0.08)]"
          aria-live="polite"
        >
          {successMessage}
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary mt-2" disabled={isSubmitting}>
        {isSubmitting ? "Güncelleniyor" : "Şifreyi güncelle"}
      </button>
    </form>
  );
}
