"use client";

import { clearCookieConsent } from "@/lib/consent";

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      className="micro-link border-0 bg-transparent p-0 text-left text-inherit hover:text-white"
      onClick={clearCookieConsent}
    >
      Çerez tercihlerini değiştir
    </button>
  );
}
