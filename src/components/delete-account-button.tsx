"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/auth/actions";

export function DeleteAccountButton() {
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
      const result = await deleteAccountAction();
      if (result?.error) {
        setError("Hesap silinemedi. Lütfen tekrar deneyin.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => setOpen(true)}
      >
        Hesabımı Sil
      </button>
      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Hesabını silmek istediğine emin misin?</h3>
            <p>
              Hesabınız ve hesaba bağlı veritabanı kayıtları silinmeye çalışılacaktır.
              Yüklediğiniz avatar veya kapak dosyaları ile yasal saklama yükümlülükleri,
              hizmet sağlayıcı logları ve yedekleri ayrı temizleme ya da saklama
              süreçlerine tabi olabilir. Bu işlem geri alınamaz. Onaylıyor musunuz?
            </p>
            {error ? (
              <p className="checkbox-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={submit}
                disabled={isPending}
              >
                {isPending ? "Siliniyor..." : "Evet, hesabımı sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
