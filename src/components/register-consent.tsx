"use client";

import Link from "next/link";
import { useState } from "react";

const consentMessage = "Devam etmek için Kullanım Şartlarını kabul etmeniz gerekiyor";

export function RegisterConsent() {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="grid gap-3">
      <label className={`checkbox-row consent-row ${showWarning ? "is-error" : ""}`}>
        <input
          type="checkbox"
          name="terms_consent"
          value="accepted"
          required
          onInvalid={(event) => {
            event.currentTarget.setCustomValidity(consentMessage);
            setShowWarning(true);
          }}
          onChange={(event) => {
            event.currentTarget.setCustomValidity("");
            setShowWarning(!event.currentTarget.checked);
          }}
        />
        <span>
          <Link
            href="/terms"
            className="micro-link font-bold text-[#9ee6b5]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Kullanım Şartları
          </Link>
          {"'nı okudum ve kabul ediyorum."}
        </span>
      </label>
      {showWarning ? (
        <p className="checkbox-error" role="alert">
          {consentMessage}
        </p>
      ) : null}
      <p className="text-sm leading-6 text-white/72">
        Kayıt sırasında kişisel verilerinizin nasıl işlendiği hakkında{" "}
        <Link
          href="/privacy"
          className="micro-link font-bold text-[#9ee6b5]"
          target="_blank"
          rel="noopener noreferrer"
        >
          KVKK Aydınlatma Metni
        </Link>{" "}
        kapsamında bilgilendirilirsiniz. Bu bilgilendirme bir açık rıza veya sözleşme
        kabulü değildir.
      </p>
    </div>
  );
}
