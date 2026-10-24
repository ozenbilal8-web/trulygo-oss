"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

// Subtle top-of-page progress indicator for App Router client-side navigation.
//
// Design notes:
//   - State machine: idle → loading → completing → idle. CSS handles every
//     transition via a `data-state` attribute, so React state changes are
//     limited to four per navigation; no per-frame work.
//   - One delegated document-level click listener catches internal anchor
//     clicks; ctrl/cmd/shift/alt-click, target="_blank", download links,
//     non-http(s) hrefs, external origins and same-location links are
//     filtered out so browser default navigation behaviour is untouched.
//   - usePathname + useSearchParams complete the bar when the App Router
//     finishes the transition. The Suspense boundary keeps useSearchParams
//     from forcing parent server components into client rendering.
//   - prefers-reduced-motion is honoured globally via the existing
//     `transition-duration: 1ms !important` rule in globals.css, so the
//     bar's CSS transitions automatically collapse for that audience.

type ProgressState = "idle" | "loading" | "completing";

// How long the bar must stay visible at the "loading" state before it is
// allowed to transition into "completing". Prefetched / cached navigations
// can land in <50ms; without this floor the bar would flash and disappear
// before the eye can register it.
const MIN_LOADING_VISIBLE_MS = 200;
const FINISH_HOLD_MS = 260;

function getNavigableInternalUrl(anchor: HTMLAnchorElement): URL | null {
  if (anchor.hasAttribute("download")) return null;

  const target = anchor.getAttribute("target");
  if (target && target !== "" && target !== "_self") return null;

  if (!anchor.href) return null;

  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin !== window.location.origin) return null;

  return url;
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>("idle");
  const loadingStartedAtRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const previousRouteKeyRef = useRef(routeKey);

  // Shared "start the bar now" logic. Used by both the anchor click handler
  // and the server-action progress event dispatched by PendingSubmitButton.
  // Resetting the timers + timestamp here keeps the MIN_LOADING_VISIBLE_MS
  // floor honest if a navigation and a form action overlap.
  const startLoadingNow = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    loadingStartedAtRef.current = Date.now();
    setState("loading");
  }, []);

  const finishLoadingNow = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    const startedAt = loadingStartedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_LOADING_VISIBLE_MS - elapsed);

    if (remaining === 0) {
      setState("completing");
      return;
    }

    holdTimerRef.current = window.setTimeout(() => {
      setState("completing");
      holdTimerRef.current = null;
    }, remaining);
  }, []);

  // Internal-anchor click → start loading.
  //
  // The listener is registered in the CAPTURE phase (third arg `true`) so it
  // runs BEFORE Next.js `<Link>`'s element-level onClick handler. That handler
  // calls `event.preventDefault()` to take over with the router, which would
  // otherwise mark this event as defaultPrevented before it bubbled up to the
  // document and we would never start the bar.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;

      const anchor = eventTarget.closest("a");
      if (!anchor) return;

      // `aria-disabled` links are visually inert; their click still fires
      // but they intentionally do not navigate (see Signal "Önizle" when
      // the slug is empty). Skip them so the bar does not flash.
      if (anchor.getAttribute("aria-disabled") === "true") return;

      const url = getNavigableInternalUrl(anchor as HTMLAnchorElement);
      if (!url) return;

      // Same-location clicks do not navigate — leave the bar at rest.
      const currentPath = window.location.pathname + window.location.search;
      const nextPath = url.pathname + url.search;
      if (currentPath === nextPath) return;

      startLoadingNow();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [startLoadingNow]);

  // Server-action submit (e.g. Save / Publish / Delete) → start loading.
  // The PendingSubmitButton component dispatches these events whenever
  // `useFormStatus()` reports a pending transition. We listen here so the
  // same green bar appears, irrespective of whether the action redirects
  // or just revalidates.
  useEffect(() => {
    function handleStart() {
      startLoadingNow();
    }

    function handleFinish() {
      // If the action triggered a redirect, the routeKey effect already
      // takes the bar to "completing" and we never get here for that
      // button (it unmounted). If the action only revalidated, the
      // button stays mounted and this branch lets us drop the bar back.
      if (state === "idle") return;
      finishLoadingNow();
    }

    window.addEventListener("trulygo:progress-start", handleStart);
    window.addEventListener("trulygo:progress-finish", handleFinish);

    return () => {
      window.removeEventListener("trulygo:progress-start", handleStart);
      window.removeEventListener("trulygo:progress-finish", handleFinish);
    };
  }, [state, startLoadingNow, finishLoadingNow]);

  // Route changed → finish the bar, but keep it visible for at least
  // MIN_LOADING_VISIBLE_MS so a cached / prefetched navigation does not flash.
  // Programmatic navigations that did not start with a click (state === "idle")
  // are skipped so server-action redirects do not paint a bar out of nowhere.
  useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) return;
    previousRouteKeyRef.current = routeKey;

    if (state === "idle") return;

    finishLoadingNow();
  }, [routeKey, state, finishLoadingNow]);

  // After completing, fade back to idle.
  useEffect(() => {
    if (state !== "completing") return;

    completionTimerRef.current = window.setTimeout(() => {
      setState("idle");
      completionTimerRef.current = null;
    }, FINISH_HOLD_MS);

    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [state]);

  // Tidy up the hold timer if the component ever unmounts mid-navigation.
  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div aria-hidden="true" className="navigation-progress" data-state={state} />
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
