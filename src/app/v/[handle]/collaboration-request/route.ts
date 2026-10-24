import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildCollaborationEmailRateLimitHash,
  buildCollaborationGlobalIpRateLimitHash,
  buildCollaborationPayloadHash,
  buildCollaborationVisitorHash,
  createCollaborationChallenge,
  verifyCollaborationChallenge,
} from "@/lib/link-vitrine-collaboration-hash";
import {
  buildCollaborationNotificationEmail,
} from "@/lib/link-vitrine-collaboration-email-template";
import {
  getConfiguredCollaborationAppOrigin,
  sendResendEmail,
} from "@/lib/link-vitrine-collaboration-email-server";
import {
  isAutomatedCollaborationRequest,
  isJsonCollaborationRequest,
  isSameOriginCollaborationRequest,
  readCollaborationJsonBody,
  validateLinkVitrineCollaborationRequest,
} from "@/lib/link-vitrine-collaboration-request";
import {
  createLinkVitrineCollaborationRequest,
  updateLinkVitrineCollaborationNotification,
} from "@/lib/link-vitrine-collaboration-server";
import { normalizeVitrineHandle } from "@/lib/link-vitrine-config";
import { getClientIpFromHeaders } from "@/lib/click-visitor";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

type CollaborationRequestRouteContext = {
  params: Promise<{ handle: string }>;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function GET(
  _request: Request,
  context: CollaborationRequestRouteContext,
) {
  const { handle } = await context.params;
  const canonicalHandle = normalizeVitrineHandle(handle);

  if (!canonicalHandle || canonicalHandle !== handle) {
    return jsonResponse({ error: "not_available" }, 404);
  }

  const challenge = createCollaborationChallenge(canonicalHandle);

  if (!challenge) {
    return jsonResponse({ error: "temporarily_unavailable" }, 503);
  }

  return jsonResponse({ challenge });
}

export async function POST(
  request: Request,
  context: CollaborationRequestRouteContext,
) {
  const { handle } = await context.params;
  const canonicalHandle = normalizeVitrineHandle(handle);

  if (!canonicalHandle || canonicalHandle !== handle) {
    return jsonResponse({ error: "not_available" }, 404);
  }

  if (
    !isSameOriginCollaborationRequest(request.url, request.headers) ||
    !isJsonCollaborationRequest(request.headers) ||
    isAutomatedCollaborationRequest(request.headers)
  ) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const rawBody = await readCollaborationJsonBody(request);
  const validation = validateLinkVitrineCollaborationRequest(rawBody);

  if (!validation.ok) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  if (validation.honeypot) {
    return jsonResponse({ ok: true });
  }

  const payload = validation.data;

  if (
    !verifyCollaborationChallenge({
      challenge: payload.challenge,
      handle: canonicalHandle,
    })
  ) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const clientIp = getClientIpFromHeaders(request.headers);
  const visitorHash = buildCollaborationVisitorHash({
    handle: canonicalHandle,
    ipAddress: clientIp,
  });
  const globalIpHash = buildCollaborationGlobalIpRateLimitHash(clientIp);
  const emailRateLimitHash = buildCollaborationEmailRateLimitHash({
    email: payload.senderEmail,
    handle: canonicalHandle,
  });
  const payloadHash = buildCollaborationPayloadHash({
    handle: canonicalHandle,
    payload,
  });

  if (
    !visitorHash ||
    !globalIpHash ||
    !emailRateLimitHash ||
    !payloadHash
  ) {
    return jsonResponse({ error: "temporarily_unavailable" }, 503);
  }

  const [visitorAllowed, emailAllowed, globalIpAllowed] = await Promise.all([
    checkRateLimit({
      action: "link-vitrine:collaboration:visitor-profile",
      key: visitorHash,
      limit: 3,
      windowSeconds: 30 * 60,
      mode: "fail-closed",
    }),
    checkRateLimit({
      action: "link-vitrine:collaboration:email-profile",
      key: emailRateLimitHash,
      limit: 5,
      windowSeconds: 24 * 60 * 60,
      mode: "fail-closed",
    }),
    checkRateLimit({
      action: "link-vitrine:collaboration:global-ip",
      key: globalIpHash,
      limit: 30,
      windowSeconds: 60 * 60,
      mode: "fail-closed",
    }),
  ]);

  if (!visitorAllowed || !emailAllowed || !globalIpAllowed) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const record = await createLinkVitrineCollaborationRequest({
    handle: canonicalHandle,
    payload,
    visitorHash,
    payloadHash,
  });

  if (!record) {
    return jsonResponse({ error: "not_available" }, 404);
  }

  if (!record.created) {
    return jsonResponse({ ok: true });
  }

  const appOrigin = getConfiguredCollaborationAppOrigin();

  if (!appOrigin) {
    await updateLinkVitrineCollaborationNotification({
      requestId: record.requestId,
      status: "failed",
      providerId: null,
      errorCode: "app_origin_not_configured",
    });
    return jsonResponse({ ok: true });
  }

  const detailUrl = `${appOrigin}/dashboard/link-vitrini/new`;
  const email = buildCollaborationNotificationEmail({
    senderName: payload.senderName,
    senderEmail: payload.senderEmail,
    senderPhone: payload.senderPhone,
    requestType: payload.requestType,
    budgetAmount: payload.budgetAmount,
    budgetCurrency: payload.budgetCurrency,
    subject: payload.subject,
    message: payload.message,
    createdAt: record.createdAt,
    profileDisplayName: record.profileDisplayName,
    profileHandle: record.profileHandle,
    detailUrl,
  });
  const emailResult = await sendResendEmail({
    to: record.recipientEmail,
    replyTo: payload.senderEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey: `link-vitrine-collaboration-request/${record.requestId}`,
  });
  const notificationUpdated =
    await updateLinkVitrineCollaborationNotification({
      requestId: record.requestId,
      status: emailResult.ok ? "sent" : "failed",
      providerId: emailResult.ok ? emailResult.providerId : null,
      errorCode: emailResult.ok ? null : emailResult.errorCode,
    });

  if (!notificationUpdated) {
    console.warn(
      "[link-vitrine-collaboration] notification result could not be persisted",
    );
  }

  revalidatePath("/dashboard/link-vitrini/new");
  return jsonResponse({ ok: true });
}
