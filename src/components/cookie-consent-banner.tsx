"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  clearCookieConsent,
  getCookieConsent,
  setCookieConsent,
  subscribeCookieConsent,
  type CookieConsentChoice,
} from "@/lib/consent";

// Sentinel for the first render on the server (and the matching first client render),
// so the banner never appears for one frame before localStorage has been read.
const SSR_PENDING = "__ssr_pending__" as const;

type SnapshotValue = CookieConsentChoice | null | typeof SSR_PENDING;

function getClientSnapshot(): CookieConsentChoice | null {
  return getCookieConsent();
}

function getServerSnapshot(): typeof SSR_PENDING {
  return SSR_PENDING;
}

export function CookieConsentBanner() {
  const value = useSyncExternalStore<SnapshotValue>(
    subscribeCookieConsent,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (value === SSR_PENDING) {
    return null;
  }

  if (value !== null) {
    return (
      <button
        type="button"
        className="cookie-preferences-trigger"
        onClick={clearCookieConsent}
      >
        Çerez tercihleri
      </button>
    );
  }

  const decide = (choice: CookieConsentChoice) => {
    setCookieConsent(choice);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-label="Çerez tercihi">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Oturum, güvenlik ve tekrar işlemleri azaltmak için zorunlu teknolojiler
          kullanıyoruz. İsteğe bağlı Vercel Web Analytics ve Speed Insights ölçümlerine
          ayrıca izin verebilirsiniz. Detaylar için{" "}
          <Link href="/cerez-politikasi">Çerez Politikamız</Link>
          {"'ı ve "}
          <Link href="/acik-riza-metni">Açık Rıza Metni</Link>
          {"'ni inceleyebilirsiniz."}
        </p>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => decide("essential")}
          >
            Reddet
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => decide("all")}
          >
            Kabul et
          </button>
        </div>
      </div>
    </div>
  );
}
