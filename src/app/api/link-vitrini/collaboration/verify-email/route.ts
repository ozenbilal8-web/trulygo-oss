import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildCollaborationGlobalIpRateLimitHash,
  hashCollaborationVerificationToken,
} from "@/lib/link-vitrine-collaboration-hash";
import {
  isAutomatedCollaborationRequest,
  isJsonCollaborationRequest,
  isSameOriginCollaborationRequest,
  readCollaborationJsonBody,
} from "@/lib/link-vitrine-collaboration-request";
import { consumeLinkVitrineCollaborationEmailVerification } from "@/lib/link-vitrine-collaboration-server";
import { getClientIpFromHeaders } from "@/lib/click-visitor";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST(request: Request) {
  if (
    !isSameOriginCollaborationRequest(request.url, request.headers) ||
    !isJsonCollaborationRequest(request.headers) ||
    isAutomatedCollaborationRequest(request.headers)
  ) {
    return response({ error: "invalid_request" }, 400);
  }

  const payload = await readCollaborationJsonBody(request, 2 * 1024);
  const token =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).token === "string"
      ? (payload as Record<string, string>).token.trim()
      : "";
  const tokenHash = hashCollaborationVerificationToken(token);
  const ipRateLimitHash = buildCollaborationGlobalIpRateLimitHash(
    getClientIpFromHeaders(request.headers),
  );

  if (!tokenHash || !ipRateLimitHash) {
    return response({ error: "invalid_or_expired" }, 400);
  }

  const allowed = await checkRateLimit({
    action: "link-vitrine:collaboration:verify-email",
    key: ipRateLimitHash,
    limit: 10,
    windowSeconds: 60 * 60,
    mode: "fail-closed",
  });

  if (!allowed) {
    return response({ error: "rate_limited" }, 429);
  }

  const result =
    await consumeLinkVitrineCollaborationEmailVerification(tokenHash);

  if (!result) {
    return response({ error: "invalid_or_expired" }, 400);
  }

  revalidatePath(`/v/${result.handle}`);
  revalidatePath("/dashboard/link-vitrini/new");
  return response({ ok: true });
}
