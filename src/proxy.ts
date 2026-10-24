import { type NextRequest } from "next/server";
import {
  CLICK_VISITOR_COOKIE_MAX_AGE_SECONDS,
  CLICK_VISITOR_COOKIE_NAME,
  createClickVisitorId,
  isValidClickVisitorId,
} from "@/lib/click-visitor-cookie";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const existingVisitorId = request.cookies.get(CLICK_VISITOR_COOKIE_NAME)?.value;
  const visitorId = isValidClickVisitorId(existingVisitorId) ? null : createClickVisitorId();
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-trulygo-pathname", request.nextUrl.pathname);

  if (visitorId) {
    request.cookies.set(CLICK_VISITOR_COOKIE_NAME, visitorId);
  }

  const response = await updateSession(request, requestHeaders);

  if (visitorId) {
    response.cookies.set(CLICK_VISITOR_COOKIE_NAME, visitorId, {
      httpOnly: true,
      maxAge: CLICK_VISITOR_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
