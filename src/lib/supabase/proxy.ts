import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySupabaseAuthResponseHeaders } from "./auth-response-headers";
import { getSupabasePublicConfig } from "./env";

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export async function updateSession(request: NextRequest, requestHeaders = request.headers) {
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const config = getSupabasePublicConfig();

  if (!config) {
    return response;
  }

  // Public/anonymous traffic (no Supabase session cookie) does not need a token refresh.
  // Short-circuiting here avoids a Supabase auth round-trip on every public short-link click.
  if (!hasSupabaseAuthCookie(request)) {
    return response;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

        applySupabaseAuthResponseHeaders(response.headers, responseHeaders);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}
