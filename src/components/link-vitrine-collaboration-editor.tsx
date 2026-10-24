"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestLinkVitrineCollaborationVerificationAction,
  saveLinkVitrineCollaborationSettingsAction,
} from "@/app/dashboard/link-vitrini/collaboration-actions";
import {
  normalizeCollaborationEmail,
  type LinkVitrineCollaborationSettings,
  type LinkVitrineCollaborationVerificationStatus,
} from "@/lib/link-vitrine-collaboration";

// The visible controls intentionally have no form owner so their native
// validation does not interfere with the profile form. Explicit hidden mirrors
// below let profile Save/Publish persist only a changed collaboration draft.
const ISOLATED_SETTINGS_FORM_ID =
  "link-vitrine-collaboration-settings-isolated-form";

function verificationStatusLabel(
  status: LinkVitrineCollaborationVerificationStatus,
) {
  if (status === "verified") {
    return "Doğrulandı";
  }

  if (status === "pending") {
    return "Doğrulama bekleniyor";
  }

  return "Doğrulanmadı";
}

export function LinkVitrineCollaborationSettingsEditor({
  defaultEmail,
  initialSettings,
  onEffectiveAvailabilityChange,
  onPendingChange,
  vitrineId,
}: {
  defaultEmail: string;
  initialSettings: LinkVitrineCollaborationSettings | null;
  onEffectiveAvailabilityChange?: (available: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  vitrineId: string | null;
}) {
  const { pending: profilePending } = useFormStatus();
  const [settings, setSettings] = useState(initialSettings);
  const [notificationEmail, setNotificationEmail] = useState(
    initialSettings?.notificationEmail ?? defaultEmail,
  );
  const [requestsEnabled, setRequestsEnabled] = useState(
    initialSettings?.requestsEnabled ?? false,
  );
  const [pendingAction, setPendingAction] = useState<
    "save" | "verify" | null
  >(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const normalizedEmail = normalizeCollaborationEmail(notificationEmail);
  const persistedEmail = normalizeCollaborationEmail(
    settings?.notificationEmail ?? defaultEmail,
  );
  const hasUnsavedSettings =
    requestsEnabled !== (settings?.requestsEnabled ?? false) ||
    normalizedEmail !== persistedEmail;
  const emailChanged =
    normalizedEmail !==
    normalizeCollaborationEmail(settings?.notificationEmail ?? "");
  const verificationStatus: LinkVitrineCollaborationVerificationStatus =
    emailChanged ? "unverified" : (settings?.verificationStatus ?? "unverified");
  const isEffectivelyEnabled =
    requestsEnabled && verificationStatus === "verified";
  const controlsDisabled =
    !vitrineId || Boolean(pendingAction) || profilePending;

  useEffect(() => {
    onEffectiveAvailabilityChange?.(isEffectivelyEnabled);
  }, [isEffectivelyEnabled, onEffectiveAvailabilityChange]);

  async function saveSettings() {
    if (!vitrineId || pendingAction || profilePending) {
      return;
    }

    setPendingAction("save");
    onPendingChange?.(true);
    setFeedback(null);
    try {
      const result = await saveLinkVitrineCollaborationSettingsAction({
        vitrineId,
        notificationEmail,
        requestsEnabled,
      });

      if (result.ok) {
        setSettings(result.settings);
        setNotificationEmail(result.settings.notificationEmail);
        setRequestsEnabled(result.settings.requestsEnabled);
        setFeedback({
          tone: "success",
          message: "İş birliği ayarları kaydedildi.",
        });
      } else {
        setFeedback({
          tone: "error",
          message:
            result.error === "rate_limited"
              ? "Çok kısa sürede fazla kayıt denendi. Lütfen biraz bekleyin."
              : "Ayarlar kaydedilemedi. E-posta adresini kontrol edip tekrar deneyin.",
        });
      }
    } catch {
      setFeedback({
        tone: "error",
        message: "Ayarlar kaydedilemedi. Lütfen biraz sonra tekrar deneyin.",
      });
    } finally {
      setPendingAction(null);
      onPendingChange?.(false);
    }
  }

  async function sendVerification() {
    if (!vitrineId || pendingAction || profilePending) {
      return;
    }

    setPendingAction("verify");
    onPendingChange?.(true);
    setFeedback(null);
    try {
      const result = await requestLinkVitrineCollaborationVerificationAction({
        vitrineId,
        notificationEmail,
        requestsEnabled,
      });

      if (result.ok) {
        const normalized = normalizeCollaborationEmail(notificationEmail);
        setSettings({
          vitrineId,
          requestsEnabled,
          notificationEmail: normalized,
          notificationEmailVerifiedAt: null,
          verificationRequestedAt: new Date().toISOString(),
          verificationExpiresAt: result.verificationExpiresAt,
          verificationStatus: "pending",
        });
        setNotificationEmail(normalized);
        setFeedback({
          tone: "success",
          message:
            "Doğrulama e-postası gönderildi. Bağlantı 45 dakika geçerlidir.",
        });
      } else {
        const message =
          result.error === "rate_limited"
            ? "Çok fazla doğrulama e-postası istendi. Lütfen daha sonra tekrar deneyin."
            : result.error === "email_not_configured"
              ? "E-posta servisi henüz yapılandırılmamış."
              : "Doğrulama e-postası gönderilemedi. Lütfen biraz sonra tekrar deneyin.";
        setFeedback({ tone: "error", message });
      }
    } catch {
      setFeedback({
        tone: "error",
        message:
          "Doğrulama e-postası gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
      });
    } finally {
      setPendingAction(null);
      onPendingChange?.(false);
    }
  }

  return (
    <section className="link-vitrine-editor-section link-vitrine-collaboration-settings">
      <input
        name="collaboration_settings_dirty"
        type="hidden"
        value={hasUnsavedSettings ? "true" : "false"}
      />
      <input
        name="collaboration_requests_enabled"
        type="hidden"
        value={requestsEnabled ? "true" : "false"}
      />
      <input
        name="collaboration_notification_email"
        type="hidden"
        value={notificationEmail}
      />
      <div className="link-vitrine-section-head">
        <h2>İş Birliği ve İletişim</h2>
        <span>Doğrulanmış bildirim adresi</span>
      </div>

      <div className="link-vitrine-collaboration-setting-row">
        <div>
          <strong>İş birliği taleplerini kabul et</strong>
          <p>
            Public profilinizde ziyaretçilere güvenli teklif formu gösterilir.
          </p>
        </div>
        <label className="link-vitrine-toggle">
          <input
            aria-label="İş birliği taleplerini kabul et"
            checked={requestsEnabled}
            disabled={controlsDisabled}
            form={ISOLATED_SETTINGS_FORM_ID}
            onChange={(event) => setRequestsEnabled(event.target.checked)}
            type="checkbox"
          />
          <span />
        </label>
      </div>

      <label className="link-vitrine-field">
        <span className="link-vitrine-field-label">
          <span>Bildirim e-posta adresi</span>
          <small>İş birliği bildirimleri bu adrese gönderilir</small>
        </span>
        <input
          autoComplete="email"
          disabled={controlsDisabled}
          form={ISOLATED_SETTINGS_FORM_ID}
          maxLength={254}
          onChange={(event) => setNotificationEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder="ornek@eposta.com"
          type="email"
          value={notificationEmail}
        />
      </label>

      <div className="link-vitrine-collaboration-verification-row">
        <span
          className={[
            "link-vitrine-collaboration-verification-badge",
            `is-${verificationStatus}`,
          ].join(" ")}
        >
          {verificationStatusLabel(verificationStatus)}
        </span>
        <p>
          {isEffectivelyEnabled
            ? "İletişim butonu public profilinizde görünür."
            : requestsEnabled
              ? "Buton, e-posta doğrulaması tamamlanana kadar public profilde görünmez."
              : "Eski talepler korunur; public iletişim butonu kapalıdır."}
        </p>
      </div>

      {!vitrineId ? (
        <p className="link-vitrine-collaboration-helper">
          İş birliği ayarlarını açmak için önce Link Vitrini profilinizi
          kaydedin.
        </p>
      ) : null}

      {feedback ? (
        <p
          className={`link-vitrine-collaboration-editor-feedback is-${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="link-vitrine-collaboration-settings-actions">
        <button
          className="link-vitrine-action-button link-vitrine-action-button--secondary"
          disabled={controlsDisabled}
          onClick={saveSettings}
          type="button"
        >
          {pendingAction === "save" ? "Kaydediliyor…" : "Ayarları kaydet"}
        </button>
        <button
          className="link-vitrine-action-button link-vitrine-action-button--ghost"
          disabled={
            controlsDisabled ||
            !normalizedEmail ||
            verificationStatus === "verified"
          }
          onClick={sendVerification}
          type="button"
        >
          {pendingAction === "verify"
            ? "Gönderiliyor…"
            : verificationStatus === "pending"
              ? "Doğrulama e-postasını yeniden gönder"
              : "Doğrulama e-postası gönder"}
        </button>
      </div>
    </section>
  );
}
