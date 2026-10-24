import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { NextResponse } from "next/server.js";

import {
  applySupabaseAuthResponseHeaders,
  SUPABASE_AUTH_CACHE_CONTROL,
} from "../src/lib/supabase/auth-response-headers.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proxyPath = path.join(projectRoot, "src", "lib", "supabase", "proxy.ts");
const serverPath = path.join(projectRoot, "src", "lib", "supabase", "server.ts");
const confirmPath = path.join(projectRoot, "src", "app", "auth", "confirm", "route.ts");
const actionsPath = path.join(projectRoot, "src", "app", "auth", "actions.ts");
const nextActionHandlerPath = path.join(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "server",
  "app-render",
  "action-handler.js",
);

const supabaseResponseHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function cacheControlDirectives(headers) {
  return new Set(
    (headers.get("cache-control") ?? "")
      .split(",")
      .map((directive) => directive.trim().toLowerCase()),
  );
}

function assertPrivateNoStore(headers) {
  const directives = cacheControlDirectives(headers);

  assert.ok(directives.has("private"));
  assert.ok(directives.has("no-store"));
  assert.equal(headers.get("expires"), "0");
  assert.equal(headers.get("pragma"), "no-cache");
}

test("forwards future safe headers and forces the canonical auth cache policy", () => {
  const targetHeaders = new Headers({
    "Cache-Control": "public, max-age=0, must-revalidate",
    Location: "https://example.com/dashboard",
    "X-Existing": "preserved",
  });

  applySupabaseAuthResponseHeaders(targetHeaders, {
    ...supabaseResponseHeaders,
    "X-Supabase-Future-Safe": "forwarded",
  });

  assert.equal(targetHeaders.get("cache-control"), SUPABASE_AUTH_CACHE_CONTROL);
  assertPrivateNoStore(targetHeaders);
  assert.equal(targetHeaders.get("location"), "https://example.com/dashboard");
  assert.equal(targetHeaders.get("x-existing"), "preserved");
  assert.equal(targetHeaders.get("x-supabase-future-safe"), "forwarded");
});

test("blocks structural headers and replaces dangerous source cache values", () => {
  const targetHeaders = new Headers({
    Age: "120",
    "CDN-Cache-Control": "public, max-age=600",
    "Content-Length": "42",
    "Content-Type": "text/html; charset=utf-8",
    Location: "https://example.com/dashboard",
    "Set-Cookie": "existing=one; Path=/",
    "Surrogate-Control": "max-age=600",
    Vary: "RSC, Next-Router-State-Tree",
    "X-Middleware-Next": "1",
    "X-Nextjs-Data": "1",
  });

  applySupabaseAuthResponseHeaders(targetHeaders, {
    "Cache-Control": "public, s-maxage=600",
    "CDN-Cache-Control": "public, max-age=600",
    "Content-Length": "999",
    "Content-Type": "text/plain",
    Expires: "Wed, 15 Jul 2026 12:00:00 GMT",
    Location: "https://evil.example/redirect",
    Pragma: "cache",
    Refresh: "0; url=https://evil.example/redirect",
    "Set-Cookie": "injected=two; Path=/",
    "Transfer-Encoding": "chunked",
    Vary: "Cookie",
    "X-Middleware-Next": "0",
    "X-Nextjs-Data": "0",
    "X-Supabase-Future-Safe": "forwarded",
  });

  assert.equal(targetHeaders.get("cache-control"), SUPABASE_AUTH_CACHE_CONTROL);
  assertPrivateNoStore(targetHeaders);
  assert.equal(targetHeaders.get("content-length"), "42");
  assert.equal(targetHeaders.get("content-type"), "text/html; charset=utf-8");
  assert.equal(targetHeaders.get("location"), "https://example.com/dashboard");
  assert.equal(targetHeaders.get("set-cookie"), "existing=one; Path=/");
  assert.equal(targetHeaders.get("vary"), "RSC, Next-Router-State-Tree");
  assert.equal(targetHeaders.get("x-middleware-next"), "1");
  assert.equal(targetHeaders.get("x-nextjs-data"), "1");
  assert.equal(targetHeaders.has("transfer-encoding"), false);
  assert.equal(targetHeaders.has("age"), false);
  assert.equal(targetHeaders.has("cdn-cache-control"), false);
  assert.equal(targetHeaders.has("refresh"), false);
  assert.equal(targetHeaders.has("surrogate-control"), false);
  assert.equal(targetHeaders.get("x-supabase-future-safe"), "forwarded");
});

test("is idempotent while preserving redirect metadata and tested cookie options", () => {
  const response = NextResponse.redirect("https://example.com/reset-password");

  response.cookies.set("sb-public-client", "first", {
    httpOnly: false,
    maxAge: 3600,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
  response.cookies.set("sb-http-only-example", "second", {
    httpOnly: true,
    path: "/auth",
    sameSite: "strict",
  });

  applySupabaseAuthResponseHeaders(response.headers, supabaseResponseHeaders);
  const headersAfterFirstApplication = [...response.headers.entries()];
  const cookiesAfterFirstApplication = response.headers.getSetCookie();

  applySupabaseAuthResponseHeaders(response.headers, supabaseResponseHeaders);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://example.com/reset-password");
  assertPrivateNoStore(response.headers);
  assert.deepEqual([...response.headers.entries()], headersAfterFirstApplication);
  assert.deepEqual(response.headers.getSetCookie(), cookiesAfterFirstApplication);

  const setCookies = response.headers.getSetCookie();
  const publicClientCookie = setCookies.find((value) =>
    value.startsWith("sb-public-client=first"),
  );
  const httpOnlyCookie = setCookies.find((value) =>
    value.startsWith("sb-http-only-example=second"),
  );

  assert.equal(setCookies.length, 2);
  assert.match(publicClientCookie ?? "", /Path=\//);
  assert.match(publicClientCookie ?? "", /Max-Age=3600/);
  assert.match(publicClientCookie ?? "", /SameSite=lax/);
  assert.match(publicClientCookie ?? "", /Secure/);
  assert.doesNotMatch(publicClientCookie ?? "", /HttpOnly/);
  assert.match(httpOnlyCookie ?? "", /Path=\/auth/);
  assert.match(httpOnlyCookie ?? "", /SameSite=strict/);
  assert.match(httpOnlyCookie ?? "", /HttpOnly/);
});

test("wires the second setAll argument to the final proxy and confirm responses", () => {
  const proxySource = readFileSync(proxyPath, "utf8");
  const confirmSource = readFileSync(confirmPath, "utf8");

  assert.match(proxySource, /setAll\(cookiesToSet, responseHeaders\)/);
  assert.match(confirmSource, /setAll\(cookiesToSet, responseHeaders\)/);

  const proxyResponseRecreation = proxySource.lastIndexOf("response = NextResponse.next");
  const proxyHeaderApplication = proxySource.indexOf(
    "applySupabaseAuthResponseHeaders(response.headers, responseHeaders)",
  );
  const proxyCookieWrite = proxySource.indexOf(
    "response.cookies.set(name, value, options)",
    proxyHeaderApplication,
  );

  assert.ok(proxyResponseRecreation >= 0);
  assert.ok(proxyHeaderApplication > proxyResponseRecreation);
  assert.ok(proxyCookieWrite > proxyHeaderApplication);

  const confirmHeaderApplication = confirmSource.indexOf(
    "applySupabaseAuthResponseHeaders(successResponse.headers, responseHeaders)",
  );
  const confirmCookieWrite = confirmSource.indexOf(
    "successResponse.cookies.set(name, value, options)",
    confirmHeaderApplication,
  );

  assert.ok(confirmHeaderApplication >= 0);
  assert.ok(confirmCookieWrite > confirmHeaderApplication);
  assert.doesNotMatch(proxySource, /httpOnly\s*:\s*true/);
  assert.doesNotMatch(confirmSource, /httpOnly\s*:\s*true/);
});

test("keeps the server cookie adapter options and enforces its no-store boundary", () => {
  const serverSource = readFileSync(serverPath, "utf8");

  assert.match(serverSource, /setAll\(cookiesToSet, responseHeaders\)/);
  assert.match(serverSource, /Object\.keys\(responseHeaders\)\.length > 0/);
  assert.match(serverSource, /noStore\(\)/);
  assert.match(serverSource, /cookieStore\.set\(name, value, options\)/);
  assert.doesNotMatch(serverSource, /assertSupabaseAuthResponseHeaders/);
  assert.doesNotMatch(serverSource, /httpOnly\s*:\s*true/);
  assert.doesNotMatch(serverSource, /new Headers\(/);
});

test("the installed Next Server Action response boundary also forces no-store", () => {
  const actionHandlerSource = readFileSync(nextActionHandlerPath, "utf8");

  assert.match(
    actionHandlerSource,
    /res\.setHeader\('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate'\)/,
  );
});

test("preserves the existing login, signup, callback, refresh, recovery and signout entry points", () => {
  const proxySource = readFileSync(proxyPath, "utf8");
  const confirmSource = readFileSync(confirmPath, "utf8");
  const actionsSource = readFileSync(actionsPath, "utf8");

  assert.match(actionsSource, /supabase\.auth\.signInWithPassword\(/);
  assert.match(actionsSource, /supabase\.auth\.signUp\(/);
  assert.match(actionsSource, /supabase\.auth\.resetPasswordForEmail\(/);
  assert.match(actionsSource, /supabase\.auth\.signOut\(\)/);
  assert.match(proxySource, /await supabase\.auth\.getClaims\(\)/);
  assert.match(confirmSource, /supabase\.auth\.verifyOtp\(/);
  assert.match(confirmSource, /const \{ data \} = await supabase\.auth\.getUser\(\)/);
  assert.match(confirmSource, /value === "recovery"/);
});
