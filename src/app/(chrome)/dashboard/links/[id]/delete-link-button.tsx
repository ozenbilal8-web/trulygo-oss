"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteLinkRequestAction } from "./actions";

type DeleteLinkButtonProps = {
  linkRequestId: string;
};

export function DeleteLinkButton({ linkRequestId }: DeleteLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (isPending && !wasPendingRef.current) {
      window.dispatchEvent(new CustomEvent("trulygo:progress-start"));
    } else if (!isPending && wasPendingRef.current) {
      window.dispatchEvent(new CustomEvent("trulygo:progress-finish"));
    }

    wasPendingRef.current = isPending;
  }, [isPending]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteLinkRequestAction(linkRequestId);

      if (result?.error) {
        setError("Link silinemedi. Lütfen tekrar deneyin.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Linki sil
      </button>

      {open ? (
        <div
          className="modal-backdrop link-delete-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-delete-modal-title"
          aria-describedby="link-delete-modal-description"
        >
          <div className="modal-card link-delete-modal-card">
            <h3 id="link-delete-modal-title" className="link-delete-modal-title">
              Bu linki sil
            </h3>
            <p id="link-delete-modal-description" className="link-delete-modal-description">
              Bu linki silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>

            {error ? (
              <p className="checkbox-error link-delete-modal-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="modal-actions link-delete-modal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm link-delete-cancel-button"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm link-delete-confirm-button"
                onClick={submit}
                disabled={isPending}
              >
                {isPending ? "Siliniyor..." : "Evet, linki sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
