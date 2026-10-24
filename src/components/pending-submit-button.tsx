"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Submit button that mirrors the form's pending state (via `useFormStatus`)
// and drives the global navigation-progress bar through window CustomEvents.
//
// - While the parent form action is running, the button reports
//   `data-pending="true"` + `aria-busy="true"` and renders `pendingLabel`
//   instead of its idle children. Hover/active/focus-visible styling is
//   handled by the regular button class; `disabled={pending}` also short-
//   circuits any second submit.
// - When the form has multiple submit buttons (e.g. Save / Publish), pass
//   `intentName` + `intentValue` so only the clicked button swaps to the
//   "pending" label — the others go to a quiet disabled state.
// - On every pending transition we fire `trulygo:progress-start` /
//   `trulygo:progress-finish` so the top progress bar reacts to server
//   actions, not only client-side anchor navigation. If the action ends
//   with `redirect()`, the bar is finished by the existing routeKey effect
//   inside `NavigationProgress` (this component will have unmounted).

type PendingSubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children"
> & {
  children: ReactNode;
  pendingLabel: ReactNode;
  intentName?: string;
  intentValue?: string;
};

export function PendingSubmitButton({
  children,
  pendingLabel,
  intentName,
  intentValue,
  disabled,
  ...rest
}: PendingSubmitButtonProps) {
  const { pending, data } = useFormStatus();
  const wasPendingRef = useRef(false);

  const submittedIntent =
    intentName && data ? data.get(intentName) : null;
  const isThisButtonActive =
    pending && (intentValue ? submittedIntent === intentValue : true);

  useEffect(() => {
    if (pending && !wasPendingRef.current) {
      window.dispatchEvent(new CustomEvent("trulygo:progress-start"));
    } else if (!pending && wasPendingRef.current) {
      window.dispatchEvent(new CustomEvent("trulygo:progress-finish"));
    }
    wasPendingRef.current = pending;
  }, [pending]);

  return (
    <button
      {...rest}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : "false"}
      disabled={Boolean(disabled) || pending}
      name={intentName ?? rest.name}
      type="submit"
      value={intentValue ?? rest.value}
    >
      {isThisButtonActive ? (
        <>
          <PendingSpinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

function PendingSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="tg-pending-spinner"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 24"
      />
    </svg>
  );
}
