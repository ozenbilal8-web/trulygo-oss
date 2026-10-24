"use client";

import { createPortal } from "react-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

type TooltipAnchor = {
  x: number;
  y: number;
};

type TooltipPosition = {
  left: number;
  top: number;
  maxWidth: number;
};

type ViewportAwareTooltipProps = {
  anchor: TooltipAnchor | null;
  children: ReactNode;
  className?: string;
  collisionPadding?: number;
  estimatedHeight?: number;
  estimatedWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  sideOffset?: number;
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getViewportBox() {
  const visualViewport = window.visualViewport;

  return {
    height: visualViewport?.height ?? window.innerHeight,
    left: visualViewport?.offsetLeft ?? 0,
    top: visualViewport?.offsetTop ?? 0,
    width: visualViewport?.width ?? window.innerWidth,
  };
}

function getSafePosition({
  anchor,
  collisionPadding,
  height,
  maxWidth,
  sideOffset,
  width,
}: {
  anchor: TooltipAnchor;
  collisionPadding: number;
  height: number;
  maxWidth: number;
  sideOffset: number;
  width: number;
}): TooltipPosition {
  const viewport = getViewportBox();
  const viewportMaxWidth = Math.max(0, viewport.width - collisionPadding * 2);
  const tooltipMaxWidth = Math.min(maxWidth, viewportMaxWidth);
  const safeWidth = Math.min(Math.max(width, 0), tooltipMaxWidth);
  const safeHeight = Math.min(Math.max(height, 0), Math.max(0, viewport.height - collisionPadding * 2));
  const minLeft = viewport.left + collisionPadding;
  const maxLeft = viewport.left + viewport.width - safeWidth - collisionPadding;
  const minTop = viewport.top + collisionPadding;
  const maxTop = viewport.top + viewport.height - safeHeight - collisionPadding;
  const maxBottom = viewport.top + viewport.height - collisionPadding;
  const aboveTop = anchor.y - safeHeight - sideOffset;
  const belowTop = anchor.y + sideOffset;
  const fitsAbove = aboveTop >= minTop;
  const fitsBelow = belowTop + safeHeight <= maxBottom;
  const roomAbove = anchor.y - sideOffset - minTop;
  const roomBelow = maxBottom - belowTop;
  const preferredTop = fitsAbove
    ? aboveTop
    : fitsBelow || roomBelow >= roomAbove
      ? belowTop
      : aboveTop;

  return {
    left: clamp(anchor.x - safeWidth / 2, minLeft, maxLeft),
    maxWidth: tooltipMaxWidth,
    top: clamp(preferredTop, minTop, maxTop),
  };
}

function applyPosition(element: HTMLDivElement, position: TooltipPosition) {
  element.style.left = `${position.left}px`;
  element.style.maxWidth = `${position.maxWidth}px`;
  element.style.top = `${position.top}px`;
}

export function ViewportAwareTooltip({
  anchor,
  children,
  className,
  collisionPadding = 12,
  estimatedHeight = 132,
  estimatedWidth = 240,
  minWidth = 208,
  maxWidth = 272,
  sideOffset = 14,
}: ViewportAwareTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
  const estimatedPosition =
    anchor && canUseDom
      ? getSafePosition({
          anchor,
          collisionPadding,
          height: estimatedHeight,
          maxWidth,
          sideOffset,
          width: estimatedWidth,
        })
      : null;

  useIsomorphicLayoutEffect(() => {
    if (!anchor || !tooltipRef.current) {
      return;
    }

    const rect = tooltipRef.current.getBoundingClientRect();
    applyPosition(tooltipRef.current, getSafePosition({
      anchor,
      collisionPadding,
      height: rect.height,
      maxWidth,
      sideOffset,
      width: rect.width,
    }));
  });

  useEffect(() => {
    if (!anchor) {
      return;
    }

    const currentAnchor = anchor;

    function updatePosition() {
      if (!tooltipRef.current) {
        return;
      }

      const rect = tooltipRef.current.getBoundingClientRect();
      applyPosition(tooltipRef.current, getSafePosition({
        anchor: currentAnchor,
        collisionPadding,
        height: rect.height,
        maxWidth,
        sideOffset,
        width: rect.width,
      }));
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [anchor, collisionPadding, maxWidth, sideOffset]);

  if (!anchor || !canUseDom || !estimatedPosition) {
    return null;
  }

  const style = {
    left: estimatedPosition.left,
    maxWidth: estimatedPosition.maxWidth,
    minWidth: Math.min(minWidth, estimatedPosition.maxWidth),
    overflowWrap: "anywhere",
    position: "fixed",
    top: estimatedPosition.top,
    whiteSpace: "normal",
    width: "max-content",
    wordBreak: "break-word",
    zIndex: 9999,
  } satisfies CSSProperties;

  return createPortal(
    <div ref={tooltipRef} className={className} style={style}>
      {children}
    </div>,
    document.body,
  );
}
