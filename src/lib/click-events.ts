import "server-only";

import type { ClickDeviceInfo, ClickLocationInfo } from "@/lib/click-enrichment";
import { normalizeUtmParam, type UtmParams } from "@/lib/click-event-utm";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAnonymousClient } from "@/lib/supabase/server";

export { appendUtmParams, extractUtmParams } from "@/lib/click-event-utm";
export type { AppendUtmParamsOptions, UtmParams } from "@/lib/click-event-utm";

export type ClickChannelParams = {
  channelLinkId: string | null;
  channelKey: string | null;
  channelLabel: string | null;
};

function normalizeTrackedValue(value: string | null, maxLength: number) {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function recordLinkClick({
  linkRequestId,
  slug,
  channel,
  referrer,
  userAgent,
  visitorKey,
  utmParams,
  device,
  location,
}: {
  linkRequestId: string;
  slug: string;
  channel: ClickChannelParams;
  referrer: string | null;
  userAgent: string | null;
  visitorKey: string | null;
  utmParams: UtmParams;
  device: ClickDeviceInfo;
  location: ClickLocationInfo;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    // Cookieless client: this function may run inside Next.js `after()`, which
    // forbids reading cookies(). The RPC is granted to anon and does not need
    // user-session context.
    const supabase = createAnonymousClient();
    const { error } = await supabase.rpc("record_link_click", {
      p_link_request_id: linkRequestId,
      p_slug: slug,
      p_channel_link_id: channel.channelLinkId,
      p_channel_key: normalizeTrackedValue(channel.channelKey, 255),
      p_channel_label: normalizeTrackedValue(channel.channelLabel, 255),
      p_referrer: normalizeTrackedValue(referrer, 2000),
      p_user_agent: normalizeTrackedValue(userAgent, 1000),
      p_visitor_key: normalizeTrackedValue(visitorKey, 128),
      p_utm_source: normalizeUtmParam(utmParams.utm_source),
      p_utm_medium: normalizeUtmParam(utmParams.utm_medium),
      p_utm_campaign: normalizeUtmParam(utmParams.utm_campaign),
      p_utm_content: normalizeUtmParam(utmParams.utm_content),
      p_utm_term: normalizeUtmParam(utmParams.utm_term),
      // Derived, privacy-preserving signals — no raw IP is ever sent here.
      p_device_type: normalizeTrackedValue(device.deviceType, 32),
      p_os_name: normalizeTrackedValue(device.osName, 64),
      p_browser_name: normalizeTrackedValue(device.browserName, 64),
      p_country_code: normalizeTrackedValue(location.countryCode, 8),
      p_country_name: normalizeTrackedValue(location.countryName, 96),
      p_region: normalizeTrackedValue(location.region, 96),
      p_city: normalizeTrackedValue(location.city, 96),
      p_location_label: normalizeTrackedValue(location.locationLabel, 160),
    });

    if (error) {
      console.warn("[click-events] record_link_click rpc returned an error", {
        slug,
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    // Analytics must never block a public redirect — but log so silent drops are visible.
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[click-events] record_link_click threw", { slug, message });
  }
}
