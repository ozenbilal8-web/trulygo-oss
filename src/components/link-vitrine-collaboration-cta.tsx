"use client";

import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  LINK_VITRINE_COLLABORATION_BUDGET_CURRENCIES,
  LINK_VITRINE_COLLABORATION_REQUEST_TYPES,
} from "@/lib/link-vitrine-collaboration";
import type { LinkVitrineTheme } from "@/lib/link-vitrine-config";

type SubmissionState =
  | "idle"
  | "loading-challenge"
  | "submitting"
  | "success"
  | "error";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function LinkVitrineCollaborationCta({
  handle,
  preview = false,
  theme,
}: {
  handle: string;
  preview?: boolean;
  theme: LinkVitrineTheme;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const modalGenerationRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : triggerRef.current;
    document.body.style.overflow = "hidden";

    const animationFrame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("[data-initial-focus]")
        ?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1) ?? first;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || submissionState !== "success") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("[data-success-focus]")
        ?.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isOpen, submissionState]);

  async function openModal() {
    const generation = modalGenerationRef.current + 1;
    modalGenerationRef.current = generation;
    setIsOpen(true);
    setChallenge("");
    setErrorMessage("");
    setSubmissionState("loading-challenge");

    try {
      const response = await fetch(
        `/v/${encodeURIComponent(handle)}/collaboration-request`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const body = (await response.json().catch(() => null)) as {
        challenge?: string;
      } | null;

      if (
        !response.ok ||
        !body?.challenge ||
        typeof body.challenge !== "string"
      ) {
        throw new Error("challenge_unavailable");
      }

      if (modalGenerationRef.current === generation) {
        setChallenge(body.challenge);
        setSubmissionState("idle");
      }
    } catch {
      if (modalGenerationRef.current !== generation) {
        return;
      }

      setErrorMessage(
        "Form şu anda hazırlanamadı. Lütfen biraz sonra tekrar deneyin.",
      );
      setSubmissionState("error");
    }
  }

  function closeModal() {
    modalGenerationRef.current += 1;
    setIsOpen(false);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challenge || submissionState === "submitting") {
      return;
    }

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      form.querySelector<HTMLElement>(":invalid")?.focus();
      return;
    }

    const formData = new FormData(form);
    const budgetAmount = String(formData.get("budgetAmount") ?? "").trim();
    const generation = modalGenerationRef.current;
    setErrorMessage("");
    setSubmissionState("submitting");

    try {
      const response = await fetch(
        `/v/${encodeURIComponent(handle)}/collaboration-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            senderName: formData.get("senderName"),
            senderEmail: formData.get("senderEmail"),
            senderPhone: formData.get("senderPhone"),
            requestType: formData.get("requestType"),
            budgetAmount: budgetAmount || null,
            budgetCurrency: budgetAmount
              ? formData.get("budgetCurrency")
              : null,
            subject: formData.get("subject"),
            message: formData.get("message"),
            website: formData.get("website"),
            challenge,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (modalGenerationRef.current !== generation) {
        return;
      }

      if (response.ok && body?.ok) {
        form.reset();
        setSubmissionState("success");
        return;
      }

      setErrorMessage(
        response.status === 429
          ? "Çok kısa sürede fazla talep gönderildi. Lütfen daha sonra tekrar deneyin."
          : "Teklif gönderilemedi. Alanları kontrol edip biraz sonra tekrar deneyin.",
      );
      setSubmissionState("error");
    } catch {
      if (modalGenerationRef.current !== generation) {
        return;
      }

      setErrorMessage(
        "Bağlantı kurulamadı. Lütfen biraz sonra tekrar deneyin.",
      );
      setSubmissionState("error");
    }
  }

  if (preview) {
    return (
      <button
        className="link-vitrine-collaboration-cta"
        disabled
        type="button"
      >
        İş Birliği Teklifi Gönder
      </button>
    );
  }

  return (
    <>
      <button
        aria-controls="link-vitrine-collaboration-dialog"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="link-vitrine-collaboration-cta"
        onClick={openModal}
        ref={triggerRef}
        type="button"
      >
        İş Birliği Teklifi Gönder
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className={[
                "link-vitrine-collaboration-modal-backdrop",
                `link-vitrine-theme--${theme}`,
              ].join(" ")}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeModal();
                }
              }}
            >
              <div
                aria-describedby="link-vitrine-collaboration-dialog-description"
                aria-labelledby="link-vitrine-collaboration-dialog-title"
                aria-modal="true"
                className="link-vitrine-collaboration-modal"
                id="link-vitrine-collaboration-dialog"
                ref={dialogRef}
                role="dialog"
                tabIndex={-1}
              >
                <div className="link-vitrine-collaboration-modal-head">
                  <div>
                    <span>İş birliği</span>
                    <h2 id="link-vitrine-collaboration-dialog-title">
                      İş Birliği Teklifi Gönder
                    </h2>
                  </div>
                  <button
                    aria-label="Modalı kapat"
                    className="link-vitrine-collaboration-modal-close"
                    onClick={closeModal}
                    type="button"
                  >
                    ×
                  </button>
                </div>
                <p
                  className="link-vitrine-collaboration-modal-description"
                  id="link-vitrine-collaboration-dialog-description"
                >
                  Teklif ayrıntılarını paylaşın; bilgileriniz doğrudan Link
                  Vitrini sahibine iletilir.
                </p>

                {submissionState === "success" ? (
                  <div
                    className="link-vitrine-collaboration-success"
                    role="status"
                  >
                    <strong>Teklifiniz başarıyla gönderildi.</strong>
                    <button
                      data-success-focus
                      onClick={closeModal}
                      type="button"
                    >
                      Tamam
                    </button>
                  </div>
                ) : (
                  <form
                    className="link-vitrine-collaboration-form"
                    noValidate={false}
                    onSubmit={submitRequest}
                  >
                    <div className="link-vitrine-collaboration-form-grid">
                      <label>
                        <span>Ad soyad</span>
                        <input
                          autoComplete="name"
                          data-initial-focus
                          maxLength={100}
                          name="senderName"
                          required
                          type="text"
                        />
                      </label>
                      <label>
                        <span>E-posta</span>
                        <input
                          autoComplete="email"
                          maxLength={254}
                          name="senderEmail"
                          required
                          type="email"
                        />
                      </label>
                      <label>
                        <span>Telefon <small>İsteğe bağlı</small></span>
                        <input
                          autoComplete="tel"
                          maxLength={30}
                          name="senderPhone"
                          type="tel"
                        />
                      </label>
                      <label>
                        <span>Talep türü</span>
                        <select defaultValue="" name="requestType" required>
                          <option disabled value="">
                            Seçin
                          </option>
                          {LINK_VITRINE_COLLABORATION_REQUEST_TYPES.map(
                            (option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>
                    <fieldset className="link-vitrine-collaboration-budget">
                      <legend>Teklif edilen bütçe <small>İsteğe bağlı</small></legend>
                      <input
                        inputMode="decimal"
                        min="0"
                        name="budgetAmount"
                        placeholder="0,00"
                        step="0.01"
                        type="number"
                      />
                      <select
                        aria-label="Para birimi"
                        defaultValue="TRY"
                        name="budgetCurrency"
                      >
                        {LINK_VITRINE_COLLABORATION_BUDGET_CURRENCIES.map(
                          (currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ),
                        )}
                      </select>
                    </fieldset>
                    <label>
                      <span>İş birliği konusu</span>
                      <input
                        maxLength={150}
                        name="subject"
                        required
                        type="text"
                      />
                    </label>
                    <label>
                      <span>
                        Teklif ve çalışma açıklaması
                        <small>20–3000 karakter</small>
                      </span>
                      <textarea
                        maxLength={3000}
                        minLength={20}
                        name="message"
                        required
                        rows={7}
                      />
                    </label>
                    <label
                      aria-hidden="true"
                      className="link-vitrine-collaboration-honeypot"
                    >
                      Website
                      <input
                        autoComplete="off"
                        name="website"
                        tabIndex={-1}
                        type="text"
                      />
                    </label>
                    <p className="link-vitrine-collaboration-privacy">
                      Ad, e-posta, isteğe bağlı telefon/bütçe ve mesaj bilgileriniz,
                      talebinizi Link Vitrini sahibine iletmek ve işlem bildirimini e-posta
                      hizmeti üzerinden göndermek amacıyla işlenir.{" "}
                      <Link href="/privacy" target="_blank">
                        Gizlilik ve KVKK bilgileri
                      </Link>
                    </p>
                    {errorMessage ? (
                      <p
                        className="link-vitrine-collaboration-error"
                        role="alert"
                      >
                        {errorMessage}
                      </p>
                    ) : null}
                    <button
                      className="link-vitrine-collaboration-submit"
                      disabled={
                        submissionState === "loading-challenge" ||
                        submissionState === "submitting" ||
                        !challenge
                      }
                      type="submit"
                    >
                      {submissionState === "loading-challenge"
                        ? "Form hazırlanıyor…"
                        : submissionState === "submitting"
                          ? "Gönderiliyor…"
                          : "Teklifi Gönder"}
                    </button>
                  </form>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
