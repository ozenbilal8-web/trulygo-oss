"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useSyncExternalStore } from "react";
import {
  filterOptionalAnalyticsEvent,
  getCookieConsent,
  subscribeCookieConsent,
  type CookieConsentChoice,
} from "@/lib/consent";

function getClientSnapshot(): CookieConsentChoice | null {
  return getCookieConsent();
}

function getServerSnapshot(): null {
  return null;
}

export function ConsentedAnalytics() {
  const choice = useSyncExternalStore(
    subscribeCookieConsent,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true" || choice !== "all") {
    return null;
  }

  return (
    <>
      <Analytics beforeSend={filterOptionalAnalyticsEvent} />
      <SpeedInsights beforeSend={filterOptionalAnalyticsEvent} />
    </>
  );
}
