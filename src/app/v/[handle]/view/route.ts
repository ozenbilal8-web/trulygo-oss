import {
  buildLinkVitrineProfileViewRateLimitKey,
  buildLinkVitrineProfileViewVisitorHash,
  getClientIpFromHeaders,
} from "@/lib/click-visitor";
import {
  isAutomatedLinkVitrineProfileViewRequest,
  hasTrustedLinkVitrineProfileViewOrigin,
  hasUnexpectedLinkVitrineProfileViewRequestBody,
} from "@/lib/link-vitrine-profile-view-request";
import { recordLinkVitrineProfileView } from "@/lib/link-vitrine-profile-views-server";
import {
  isValidVitrineHandle,
  normalizeVitrineHandle,
} from "@/lib/link-vitrine-config";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROFILE_VIEW_RATE_LIMIT = 30;
const PROFILE_VIEW_RATE_LIMIT_WINDOW_SECONDS = 60;

type LinkVitrineProfileViewRouteContext = {
  params: Promise<{
    handle: string;
  }>;
};

function noContentResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST(
  request: Request,
  { params }: LinkVitrineProfileViewRouteContext,
) {
  try {
    const { handle } = await params;
    const hasCanonicalHandle =
      isValidVitrineHandle(handle) && handle === normalizeVitrineHandle(handle);

    if (
      !hasCanonicalHandle ||
      !hasTrustedLinkVitrineProfileViewOrigin(request) ||
      (await hasUnexpectedLinkVitrineProfileViewRequestBody(request)) ||
      isAutomatedLinkVitrineProfileViewRequest(request)
    ) {
      return noContentResponse();
    }

    const requestHeaders = request.headers;
    const clientIp = getClientIpFromHeaders(requestHeaders);
    const visitorHash = buildLinkVitrineProfileViewVisitorHash({
      cookieHeader: requestHeaders.get("cookie"),
      handle,
      ipAddress: clientIp,
      userAgent: requestHeaders.get("user-agent"),
    });
    const profileViewRateLimitKey = buildLinkVitrineProfileViewRateLimitKey({
      handle,
      ipAddress: clientIp,
    });

    if (!visitorHash || !profileViewRateLimitKey) {
      return noContentResponse();
    }

    const isWithinRateLimit = await checkRateLimit({
      action: "link-vitrine:profile-view",
      key: profileViewRateLimitKey,
      limit: PROFILE_VIEW_RATE_LIMIT,
      windowSeconds: PROFILE_VIEW_RATE_LIMIT_WINDOW_SECONDS,
      mode: "fail-closed",
    });

    if (!isWithinRateLimit) {
      return noContentResponse();
    }

    await recordLinkVitrineProfileView({
      handle,
      visitorHash,
    });
  } catch {
    console.warn("[link-vitrine-profile-view] request processing failed");
  }

  return noContentResponse();
}
