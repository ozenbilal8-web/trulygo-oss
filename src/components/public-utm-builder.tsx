"use client";

import Link from "next/link";
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { track } from "@vercel/analytics";
import { getCookieConsent } from "@/lib/consent";
import { savePublicUtmDraft } from "@/lib/public-utm-draft";
import { buildUtmUrl } from "@/lib/utm-builder";

type PublicUtmBuilderProps = {
  isAuthenticated: boolean;
};

type UtmFieldName =
  | "destinationUrl"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmContent"
  | "utmTerm";

type UtmFormValues = Record<UtmFieldName, string>;
type UtmFieldErrors = Partial<Record<UtmFieldName, string>>;
type GeneratedUtmResult = Extract<ReturnType<typeof buildUtmUrl>, { ok: true }>;

type AnalyticsEventName =
  | "utm_tool_started"
  | "utm_link_generated"
  | "utm_link_copied"
  | "shorten_cta_clicked";

const INITIAL_VALUES: UtmFormValues = {
  destinationUrl: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
};

const FIELD_LABELS: Record<UtmFieldName, string> = {
  destinationUrl: "Hedef adresi",
  utmSource: "Kaynak",
  utmMedium: "Kanal",
  utmCampaign: "Kampanya",
  utmContent: "İçerik",
  utmTerm: "Terim",
};

function isUtmFieldName(value: unknown): value is UtmFieldName {
  return typeof value === "string" && value in FIELD_LABELS;
}

function getBuildErrorMessage(code: string, field: UtmFieldName | null) {
  if (
    code === "required" ||
    code === "missing_required" ||
    code === "required_field" ||
    code === "empty_required" ||
    code === "missing_destination_url" ||
    code === "missing_utm_source" ||
    code === "missing_utm_medium" ||
    code === "missing_utm_campaign"
  ) {
    return "Bu alan zorunludur.";
  }

  if (code === "unsupported_protocol" || code === "unsafe_protocol") {
    return "Yalnızca http ve https adresleri kabul edilir.";
  }

  if (code === "credentials_not_allowed") {
    return "Kullanıcı adı veya parola içeren adresler kabul edilmez.";
  }

  if (
    code === "invalid_url" ||
    code === "malformed_url" ||
    code === "invalid_destination_url"
  ) {
    return "Geçerli bir web adresi gir.";
  }

  return field === "destinationUrl"
    ? "Hedef adresini kontrol edip tekrar dene."
    : "Bu alanı kontrol edip tekrar dene.";
}

function trackConsentedEvent(
  name: AnalyticsEventName,
  properties?: Record<string, boolean>,
) {
  try {
    if (getCookieConsent() === "all") {
      track(name, properties);
    }
  } catch {
    // Analytics must never interrupt the public tool.
  }
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the legacy copy path for restricted browsers.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    window.getSelection()?.removeAllRanges();
  }
}

type UtmInputProps = {
  className?: string;
  error?: string;
  helperText: string;
  idPrefix: string;
  label: string;
  name: UtmFieldName;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  technicalName: string;
  value: string;
};

function UtmInput({
  className,
  error,
  helperText,
  idPrefix,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  technicalName,
  value,
}: UtmInputProps) {
  const inputId = `${idPrefix}-${name}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className={["grid min-w-0 gap-2", className].filter(Boolean).join(" ")}>
      <label
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm font-semibold text-white"
        htmlFor={inputId}
      >
        <span>
          {label}
          {required ? <span className="ml-1 text-[#9ee6b5]" aria-hidden="true">*</span> : null}
        </span>
        <span className="font-mono text-[0.7rem] font-medium text-white/46">
          {technicalName}
        </span>
      </label>
      <input
        aria-describedby={`${helperId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className="form-field min-w-0"
        id={inputId}
        inputMode={name === "destinationUrl" ? "url" : "text"}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        spellCheck={false}
        type="text"
        value={value}
      />
      <p className="text-xs leading-5 text-white/48" id={helperId}>
        {helperText}
      </p>
      {error ? (
        <p className="text-xs font-semibold leading-5 text-[#ffb9ae]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PublicUtmBuilder({ isAuthenticated }: PublicUtmBuilderProps) {
  const idPrefix = useId();
  const startedRef = useRef(false);
  const [values, setValues] = useState<UtmFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<UtmFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedUtmResult | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  function handleFirstInteraction() {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    trackConsentedEvent("utm_tool_started", {
      has_destination: values.destinationUrl.trim().length > 0,
    });
  }

  function handleFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as UtmFieldName;
    const value = event.target.value;

    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
    setGenerated(null);
    setCopyMessage(null);
    setDraftError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setGenerated(null);
    setCopyMessage(null);
    setDraftError(null);

    const result = buildUtmUrl(values);

    if (!result.ok) {
      const field = isUtmFieldName(result.field) ? result.field : null;
      const message = getBuildErrorMessage(result.code, field);

      if (field) {
        setFieldErrors({ [field]: message });
      } else {
        setFormError("Bağlantı oluşturulamadı. Alanları kontrol edip tekrar dene.");
      }
      return;
    }

    setGenerated(result);
    trackConsentedEvent("utm_link_generated", {
      has_content: Boolean(result.utmContent),
      has_term: Boolean(result.utmTerm),
    });
  }

  async function handleCopy() {
    if (!generated) {
      return;
    }

    const copied = await copyText(generated.generatedUrl);

    if (!copied) {
      setCopyMessage("Bağlantı kopyalanamadı");
      return;
    }

    setCopyMessage("Bağlantı kopyalandı");
    trackConsentedEvent("utm_link_copied", {
      has_content: Boolean(generated.utmContent),
      has_term: Boolean(generated.utmTerm),
    });
  }

  function handleShortenClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!generated) {
      event.preventDefault();
      return;
    }

    setDraftError(null);
    trackConsentedEvent("shorten_cta_clicked", {
      has_content: Boolean(generated.utmContent),
      has_term: Boolean(generated.utmTerm),
      is_authenticated: isAuthenticated,
    });

    let saved = false;

    try {
      saved = savePublicUtmDraft(window.sessionStorage, {
        generatedUrl: generated.generatedUrl,
        destinationUrl: generated.destinationUrl,
        utmSource: generated.utmSource,
        utmMedium: generated.utmMedium,
        utmCampaign: generated.utmCampaign,
        utmContent: generated.utmContent,
        utmTerm: generated.utmTerm,
      });
    } catch {
      saved = false;
    }

    if (!saved) {
      event.preventDefault();
      setDraftError(
        "Bilgiler bu sekmede güvenli biçimde saklanamadı. Tarayıcı depolama ayarlarını kontrol edip tekrar dene.",
      );
      return;
    }
  }

  const previewHost = generated
    ? (() => {
        try {
          return new URL(generated.generatedUrl).hostname;
        } catch {
          return "";
        }
      })()
    : "";

  const previewRows = generated
    ? [
        { label: "Hedef alan adı", value: previewHost },
        { label: "Source", value: generated.utmSource },
        { label: "Medium", value: generated.utmMedium },
        { label: "Campaign", value: generated.utmCampaign },
        ...(generated.utmContent
          ? [{ label: "Content", value: generated.utmContent }]
          : []),
        ...(generated.utmTerm ? [{ label: "Term", value: generated.utmTerm }] : []),
      ]
    : [];

  return (
    <section
      aria-labelledby={`${idPrefix}-title`}
      className="section-anchor relative isolate border-b border-white/10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      id="utm-link-olusturucu"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(103,217,143,0.13),transparent_28rem),radial-gradient(circle_at_88%_28%,rgba(92,188,205,0.09),transparent_26rem),linear-gradient(180deg,#04101f_0%,#07182f_100%)]"
      />
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#9ee6b5]">
            Üyeliksiz ve ücretsiz
          </p>
          <h2
            className="mt-4 text-3xl font-black leading-tight tracking-[-0.012em] text-white sm:text-5xl"
            id={`${idPrefix}-title`}
          >
            Ücretsiz UTM Link Oluşturucu
          </h2>
          <p className="mt-5 text-base leading-7 text-white/72 sm:text-lg">
            Bu araç yalnızca UTM’li URL hazırlar. Sonuçları hedef sitede kurulu
            GA4 veya başka bir analiz aracından inceleyebilirsin. TrulyGo tıklama
            raporları için ayrıca hesap ve onaylı kısa link gerekir.
          </p>
        </div>

        <div className="glass-panel mt-10 overflow-hidden p-5 sm:p-8">
          <form
            aria-label="UTM bağlantısı oluşturma formu"
            className="grid gap-6"
            noValidate
            onFocusCapture={handleFirstInteraction}
            onSubmit={handleSubmit}
          >
            {formError ? (
              <div
                aria-live="assertive"
                className="rounded-lg border border-[#ff9f8f]/28 bg-[#7a241d]/24 px-4 py-3 text-sm font-semibold text-[#ffd5ce]"
                role="alert"
              >
                {formError}
              </div>
            ) : null}

            <UtmInput
              className="md:col-span-2"
              error={fieldErrors.destinationUrl}
              helperText="Alan adı biçimindeki girişlere https:// eklenir; yalnız http ve https kabul edilir."
              idPrefix={idPrefix}
              label="Hedef adresi"
              name="destinationUrl"
              onChange={handleFieldChange}
              placeholder="https://site.com/urun"
              required
              technicalName="URL"
              value={values.destinationUrl}
            />

            <div className="grid min-w-0 gap-6 md:grid-cols-2">
              <UtmInput
                error={fieldErrors.utmSource}
                helperText="Trafiğin geldiği yer; örneğin instagram, youtube veya bulten yaz."
                idPrefix={idPrefix}
                label="Kaynak"
                name="utmSource"
                onChange={handleFieldChange}
                placeholder="instagram"
                required
                technicalName="utm_source"
                value={values.utmSource}
              />
              <UtmInput
                error={fieldErrors.utmMedium}
                helperText="Paylaşım türü; örneğin sosyal medya için social, e-posta için email yaz."
                idPrefix={idPrefix}
                label="Kanal"
                name="utmMedium"
                onChange={handleFieldChange}
                placeholder="social"
                required
                technicalName="utm_medium"
                value={values.utmMedium}
              />
              <UtmInput
                error={fieldErrors.utmCampaign}
                helperText="Örneğin yaz-kampanyasi yaz. Aynı kampanya için kaynak değişse de bu adı sabit tut."
                idPrefix={idPrefix}
                label="Kampanya"
                name="utmCampaign"
                onChange={handleFieldChange}
                placeholder="yaz-kampanyasi"
                required
                technicalName="utm_campaign"
                value={values.utmCampaign}
              />
              <UtmInput
                error={fieldErrors.utmContent}
                helperText="İsteğe bağlı içerik veya CTA ayrımı."
                idPrefix={idPrefix}
                label="İçerik"
                name="utmContent"
                onChange={handleFieldChange}
                placeholder="hikaye-buton"
                technicalName="utm_content"
                value={values.utmContent}
              />
              <UtmInput
                className="md:col-span-2"
                error={fieldErrors.utmTerm}
                helperText="İsteğe bağlı anahtar kelime veya hedefleme bilgisi."
                idPrefix={idPrefix}
                label="Terim"
                name="utmTerm"
                onChange={handleFieldChange}
                placeholder="oyuncu-bilgisayari"
                technicalName="utm_term"
                value={values.utmTerm}
              />
            </div>

            <div className="flex flex-col items-stretch gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-white/48">
                Oluşturma işlemi yalnızca bu tarayıcıda gerçekleşir.
              </p>
              <button className="btn btn-primary w-full sm:w-auto" type="submit">
                UTM bağlantısını oluştur
              </button>
            </div>
          </form>

          {generated ? (
            <div
              aria-live="polite"
              aria-labelledby={`${idPrefix}-result-title`}
              className="mt-8 border-t border-white/10 pt-8"
            >
              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
                <section className="min-w-0 rounded-lg border border-[#9ee6b5]/20 bg-[#061728]/76 p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ee6b5]">
                    Sonuç
                  </p>
                  <h3
                    className="mt-3 text-2xl font-semibold text-white"
                    id={`${idPrefix}-result-title`}
                  >
                    UTM bağlantın hazır
                  </h3>
                  <p
                    className="mt-4 max-w-full break-words rounded-lg border border-white/10 bg-black/20 p-4 font-mono text-sm leading-6 text-white/78 [overflow-wrap:anywhere]"
                    title={generated.generatedUrl}
                  >
                    {generated.generatedUrl}
                  </p>
                  <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <button
                      aria-describedby={`${idPrefix}-copy-status`}
                      aria-label="UTM bağlantısını kopyala"
                      className="btn btn-secondary w-full sm:w-auto"
                      onClick={handleCopy}
                      type="button"
                    >
                      Kopyala
                    </button>
                    <p
                      aria-live="polite"
                      className={`min-h-5 text-sm font-semibold ${
                        copyMessage === "Bağlantı kopyalandı"
                          ? "text-[#9ee6b5]"
                          : "text-[#ffb9ae]"
                      }`}
                      id={`${idPrefix}-copy-status`}
                      role="status"
                    >
                      {copyMessage}
                    </p>
                  </div>
                </section>

                <aside
                  aria-label="UTM bağlantısı canlı önizleme"
                  className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:p-6"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                    Canlı önizleme
                  </p>
                  <dl className="mt-4 grid min-w-0 gap-3">
                    {previewRows.map((row) => (
                      <div
                        className="grid min-w-0 grid-cols-[minmax(6.5rem,0.42fr)_minmax(0,1fr)] gap-3 border-b border-white/8 pb-3 last:border-0 last:pb-0"
                        key={row.label}
                      >
                        <dt className="text-xs font-semibold text-white/48">{row.label}</dt>
                        <dd className="min-w-0 break-words text-right text-sm font-semibold text-white/82 [overflow-wrap:anywhere]">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </aside>
              </div>

              <section className="mt-6 rounded-lg border border-[#67d98f]/24 bg-[linear-gradient(135deg,rgba(103,217,143,0.13),rgba(255,255,255,0.04)_48%,rgba(35,121,145,0.1))] p-5 sm:p-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
                <div className="max-w-3xl">
                  <h3 className="text-xl font-semibold leading-8 text-white sm:text-2xl">
                    Bu bağlantıyı daha kısa, ölçülebilir ve yönetilebilir hâle getir.
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/68 sm:text-base">
                    Hemen ücretsiz hesap oluştur; linkini kısalt, QR kodunu üret ve tıklama performansını ayrıntılı olarak takip et.
                  </p>
                </div>
                <div className="mt-5 shrink-0 lg:mt-0">
                  <Link
                    className="btn btn-primary w-full sm:w-auto"
                    href={isAuthenticated ? "/dashboard" : "/register"}
                    onClick={handleShortenClick}
                  >
                    TrulyGo ile kısalt ve takip et
                  </Link>
                </div>
              </section>

              {draftError ? (
                <p
                  aria-live="assertive"
                  className="mt-3 rounded-lg border border-[#ff9f8f]/28 bg-[#7a241d]/24 px-4 py-3 text-sm font-semibold text-[#ffd5ce]"
                  role="alert"
                >
                  {draftError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
