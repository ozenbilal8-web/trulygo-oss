"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type VerificationState =
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "invalid"
  | "error";

export function LinkVitrineNotificationEmailVerification() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<VerificationState>("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const tokenValue =
        new URLSearchParams(hash).get("token")?.trim() ?? "";

      if (/^[A-Za-z0-9_-]{43}$/.test(tokenValue)) {
        setToken(tokenValue);
        setState("ready");
      } else {
        setState("invalid");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function verifyEmail() {
    if (state !== "ready" || !token) {
      return;
    }

    setState("submitting");

    try {
      const response = await fetch(
        "/api/link-vitrini/collaboration/verify-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ token }),
        },
      );

      if (response.ok) {
        window.history.replaceState(
          null,
          "",
          "/link-vitrini/bildirim-dogrula",
        );
        setToken("");
        setState("success");
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setState(body?.error === "invalid_or_expired" ? "invalid" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="link-vitrine-verification-shell">
      <section className="link-vitrine-verification-card">
        <div className="link-vitrine-verification-brand">
          <Image
            alt="TrulyGo"
            className="link-vitrine-verification-brand-logo"
            height={55}
            priority
            src="/brand/trulygo-report-logo.png"
            unoptimized
            width={213}
          />
        </div>
        <h1>Bildirim e-posta adresini doğrula</h1>
        {state === "loading" ? (
          <p role="status">Doğrulama bağlantısı hazırlanıyor…</p>
        ) : null}
        {state === "ready" || state === "submitting" ? (
          <>
            <p>
              Link Vitrini iş birliği bildirimlerini bu adreste almak için
              doğrulamayı tamamlayın.
            </p>
            <button
              disabled={state === "submitting"}
              onClick={verifyEmail}
              type="button"
            >
              {state === "submitting"
                ? "Doğrulanıyor…"
                : "E-posta adresini doğrula"}
            </button>
          </>
        ) : null}
        {state === "success" ? (
          <div className="link-vitrine-verification-result is-success" role="status">
            <strong>E-posta adresiniz doğrulandı.</strong>
            <p>İş birliği ayarlarınızı artık Link Vitrini editöründen yönetebilirsiniz.</p>
          </div>
        ) : null}
        {state === "invalid" ? (
          <div className="link-vitrine-verification-result is-error" role="alert">
            <strong>Bu bağlantı geçersiz veya süresi dolmuş.</strong>
            <p>Editörden yeni bir doğrulama e-postası isteyebilirsiniz.</p>
          </div>
        ) : null}
        {state === "error" ? (
          <div className="link-vitrine-verification-result is-error" role="alert">
            <strong>Doğrulama şu anda tamamlanamadı.</strong>
            <p>Lütfen biraz sonra tekrar deneyin.</p>
          </div>
        ) : null}
        <Link href="/dashboard/link-vitrini/new">Link Vitrini editörüne dön</Link>
      </section>
    </main>
  );
}
