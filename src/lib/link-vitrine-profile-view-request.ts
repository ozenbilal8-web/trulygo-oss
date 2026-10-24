const BODY_PROBE_TIMEOUT_MS = 50;
const PREFETCH_PURPOSE_PATTERN = /\b(?:prefetch|prerender)\b/i;
const HUMAN_IN_APP_BROWSER_PATTERN =
  /instagram|fban|fbav|fb_iab|fbios|fbss|\[fb|tiktok|musical_ly|bytedance|whatsapp(?!bot)/i;
const AUTOMATED_USER_AGENT_PATTERN =
  /bot\b|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|embedly|pinterest|redditbot|applebot|bingpreview|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptimerobot|statuscake|health.?check|kube-probe|python-requests|curl\/|wget\/|axios\/|go-http-client|node-fetch|okhttp/i;

export function hasTrustedLinkVitrineProfileViewOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin !== null && origin !== requestOrigin) {
    return false;
  }

  if (fetchSite !== null && fetchSite !== "same-origin") {
    return false;
  }

  return origin === requestOrigin || fetchSite === "same-origin";
}

export async function hasUnexpectedLinkVitrineProfileViewRequestBody(
  request: Request,
) {
  const contentLength = request.headers.get("content-length");

  if (request.headers.has("transfer-encoding")) {
    return true;
  }

  if (contentLength !== null) {
    const normalizedContentLength = contentLength.trim();

    if (
      !/^\d+$/.test(normalizedContentLength) ||
      !/^0+$/.test(normalizedContentLength)
    ) {
      return true;
    }

    return false;
  }

  if (!request.body) {
    return false;
  }

  const reader = request.body.getReader();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  try {
    const outcome = await Promise.race([
      reader.read().then((result) => ({ kind: "read" as const, result })),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timeoutId = setTimeout(
          () => resolve({ kind: "timeout" }),
          BODY_PROBE_TIMEOUT_MS,
        );
      }),
    ]);

    if (outcome.kind === "timeout") {
      timedOut = true;
      return true;
    }

    return !outcome.result.done;
  } catch {
    return true;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    if (timedOut) {
      void reader.cancel().catch(() => undefined);
    } else {
      try {
        await reader.cancel();
      } catch {
        // A rejected or already-closed stream still counts as an invalid body.
      }

      reader.releaseLock();
    }
  }
}

function isExplicitPrefetchRequest(headers: Headers) {
  if (
    headers.has("next-router-prefetch") ||
    headers.has("x-middleware-prefetch")
  ) {
    return true;
  }

  return (
    PREFETCH_PURPOSE_PATTERN.test(headers.get("purpose") ?? "") ||
    PREFETCH_PURPOSE_PATTERN.test(headers.get("sec-purpose") ?? "")
  );
}

export function isAutomatedLinkVitrineProfileViewRequest(request: Request) {
  const userAgent = request.headers.get("user-agent")?.trim();

  if (!userAgent || isExplicitPrefetchRequest(request.headers)) {
    return true;
  }

  // Real people opening a profile inside a social app still use a browser
  // webview. Require a browser-shaped UA before applying this narrow exception
  // so bare preview fetchers such as "WhatsApp/..." remain filtered.
  if (
    /mozilla\/5\.0/i.test(userAgent) &&
    HUMAN_IN_APP_BROWSER_PATTERN.test(userAgent)
  ) {
    return false;
  }

  return AUTOMATED_USER_AGENT_PATTERN.test(userAgent);
}
