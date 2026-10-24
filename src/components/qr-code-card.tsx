"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import * as QRCode from "qrcode";
import { CopyShortLinkButton } from "@/components/copy-short-link-button";
import { formatShortLinkLabel } from "@/lib/slugs";

type QrCodeCardProps = {
  title: string;
  description: string;
  value: string;
  pngFilename: string;
  brandedPngFilename?: string;
  svgFilename: string;
  showCopyButton?: boolean;
  helperText?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  readyLabel?: string;
  className?: string;
};

type QrCodeState = {
  status: "rendering" | "ready" | "error";
  signature: string | null;
};

type LogoState = {
  name: string;
  url: string;
  width: number;
  height: number;
  warning: string | null;
};

type SwatchStyle = CSSProperties & {
  "--qr-swatch-color": string;
};

const QR_CODE_COLORS = [
  { label: "Siyah", value: "#111827" },
  { label: "Koyu Gri", value: "#374151" },
  { label: "Lacivert", value: "#1E3A8A" },
  { label: "Mavi", value: "#1D4ED8" },
  { label: "Mor", value: "#6D28D9" },
  { label: "Bordo", value: "#9F1239" },
  { label: "Koyu Kırmızı", value: "#991B1B" },
  { label: "Zümrüt", value: "#047857" },
  { label: "Petrol", value: "#0F766E" },
  { label: "Kahverengi", value: "#78350F" },
] as const;

const ACCEPTED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DEFAULT_QR_COLOR = QR_CODE_COLORS[0].value;
const LOGO_MAX_FILE_SIZE_BYTES = 1024 * 1024;
const MIN_RECOMMENDED_LOGO_SIZE = 512;
const PREVIEW_QR_SIZE = 224;
const EXPORT_QR_SIZE = 1024;
const LOGO_SIZE_RATIO = 0.14;
const LOGO_MAX_SIZE_RATIO = 0.18;

const qrRenderOptionsBase = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getQrRenderOptions(width: number, darkColor: string) {
  return {
    ...qrRenderOptionsBase,
    width,
    color: {
      dark: darkColor,
      light: "#ffffff",
    },
  };
}

function getBrandedPngFilename(filename: string) {
  if (filename.startsWith("trulygo-qr-")) {
    return filename.replace(/^trulygo-qr-/, "trulygo-branded-qr-");
  }

  if (filename.startsWith("trulygo-")) {
    return `trulygo-branded-${filename.slice("trulygo-".length)}`;
  }

  return `branded-${filename}`;
}

function loadImageFromUrl(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Canvas could not be exported."));
    }, type);
  });
}

function fillRoundedSquare(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, size / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + size - safeRadius, y);
  context.quadraticCurveTo(x + size, y, x + size, y + safeRadius);
  context.lineTo(x + size, y + size - safeRadius);
  context.quadraticCurveTo(x + size, y + size, x + size - safeRadius, y + size);
  context.lineTo(x + safeRadius, y + size);
  context.quadraticCurveTo(x, y + size, x, y + size - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
  context.fill();
}

function drawLogoOverlay(canvas: HTMLCanvasElement, image: HTMLImageElement | null) {
  if (!image) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const canvasSize = Math.min(canvas.width, canvas.height);
  const logoSize = Math.round(
    Math.min(canvasSize * LOGO_SIZE_RATIO, canvasSize * LOGO_MAX_SIZE_RATIO),
  );
  const backgroundPadding = Math.max(8, Math.round(logoSize * 0.24));
  const backgroundSize = logoSize + backgroundPadding * 2;
  const backgroundX = Math.round((canvas.width - backgroundSize) / 2);
  const backgroundY = Math.round((canvas.height - backgroundSize) / 2);
  const logoRatio = Math.min(logoSize / image.naturalWidth, logoSize / image.naturalHeight);
  const drawWidth = Math.round(image.naturalWidth * logoRatio);
  const drawHeight = Math.round(image.naturalHeight * logoRatio);
  const drawX = Math.round((canvas.width - drawWidth) / 2);
  const drawY = Math.round((canvas.height - drawHeight) / 2);

  context.save();
  context.fillStyle = "#ffffff";
  fillRoundedSquare(context, backgroundX, backgroundY, backgroundSize, Math.round(backgroundSize * 0.18));
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isOpen ? "qr-code-chevron is-open" : "qr-code-chevron"}
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function QrCodeCard({
  title,
  description,
  value,
  pngFilename,
  brandedPngFilename,
  svgFilename,
  showCopyButton = true,
  helperText,
  collapsible = false,
  defaultOpen,
  readyLabel = "Hazır",
  className,
}: QrCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const logoUrlRef = useRef<string | null>(null);
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen ?? !collapsible);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_QR_COLOR);
  const [logo, setLogo] = useState<LogoState | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [qrCodeState, setQrCodeState] = useState<QrCodeState>({
    status: "rendering",
    signature: null,
  });
  const shouldRenderContent = !collapsible || isOpen;
  const renderSignature = `${value}\n${selectedColor}\n${logo?.url ?? ""}`;
  const currentColorLabel =
    QR_CODE_COLORS.find((color) => color.value === selectedColor)?.label ?? "Seçili";

  useEffect(() => {
    return () => {
      if (logoUrlRef.current) {
        URL.revokeObjectURL(logoUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setQrCodeState({ status: "error", signature: renderSignature });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    if (!shouldRenderContent) {
      return () => {
        cancelled = true;
      };
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setQrCodeState({ status: "error", signature: renderSignature });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    void QRCode.toCanvas(canvas, value, getQrRenderOptions(PREVIEW_QR_SIZE, selectedColor))
      .then(() => {
        if (cancelled) {
          return;
        }

        drawLogoOverlay(canvas, logoImageRef.current);

        if (!cancelled) {
          setQrCodeState({ status: "ready", signature: renderSignature });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeState({ status: "error", signature: renderSignature });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [logo?.url, renderSignature, selectedColor, shouldRenderContent, value]);

  async function downloadPng() {
    if (!value || !isReady) {
      return;
    }

    try {
      const exportCanvas = document.createElement("canvas");

      await QRCode.toCanvas(exportCanvas, value, getQrRenderOptions(EXPORT_QR_SIZE, selectedColor));
      drawLogoOverlay(exportCanvas, logoImageRef.current);

      const blob = await canvasToBlob(exportCanvas, "image/png");
      const filename = logo ? brandedPngFilename ?? getBrandedPngFilename(pngFilename) : pngFilename;

      downloadBlob(blob, filename);
    } catch {
      setQrCodeState({ status: "error", signature: renderSignature });
    }
  }

  async function downloadSvg() {
    if (!value || currentStatus === "error") {
      return;
    }

    try {
      const svg = await QRCode.toString(value, {
        ...getQrRenderOptions(PREVIEW_QR_SIZE, selectedColor),
        type: "svg" as const,
      });

      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), svgFilename);
    } catch {
      setQrCodeState({ status: "error", signature: renderSignature });
    }
  }

  function revokeCurrentLogoUrl() {
    if (logoUrlRef.current) {
      URL.revokeObjectURL(logoUrlRef.current);
      logoUrlRef.current = null;
    }
  }

  function clearLogo() {
    revokeCurrentLogoUrl();
    logoImageRef.current = null;
    setLogo(null);
    setLogoError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setLogoError(null);

    if (!file) {
      return;
    }

    if (!ACCEPTED_LOGO_TYPES.has(file.type)) {
      setLogoError("Logo PNG, JPG veya WEBP formatında olmalı.");
      event.target.value = "";
      return;
    }

    if (file.size > LOGO_MAX_FILE_SIZE_BYTES) {
      setLogoError("Logo dosyası 1 MB'tan büyük olmamalı.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await loadImageFromUrl(objectUrl);
      const warning =
        image.naturalWidth < MIN_RECOMMENDED_LOGO_SIZE ||
        image.naturalHeight < MIN_RECOMMENDED_LOGO_SIZE
          ? "Bu logo düşük çözünürlüklü görünüyor. Baskıda bulanık çıkabilir."
          : null;

      revokeCurrentLogoUrl();
      logoUrlRef.current = objectUrl;
      logoImageRef.current = image;
      setLogo({
        name: file.name,
        url: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
        warning,
      });
      event.target.value = "";
    } catch {
      URL.revokeObjectURL(objectUrl);
      setLogoError("Görsel yüklenemedi. Farklı bir PNG, JPG veya WEBP deneyin.");
      event.target.value = "";
    }
  }

  const currentStatus = qrCodeState.signature === renderSignature
    ? qrCodeState.status
    : shouldRenderContent
      ? "rendering"
      : "ready";
  const isReady = currentStatus === "ready";
  const rootClassName = [
    "qr-code-card",
    collapsible ? "is-collapsible" : "",
    isOpen ? "is-open" : "is-collapsed",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const statusLabel = isReady ? readyLabel : currentStatus === "error" ? "Hata" : "Üretiliyor";
  const headerContent = (
    <>
      <div className="qr-code-title-group">
        <p>QR Kod</p>
        <h3>{title}</h3>
        <span className="qr-code-description">{description}</span>
      </div>
      <span className="qr-code-header-actions">
        <span className={isReady ? "qr-code-status is-ready" : "qr-code-status"}>
          {statusLabel}
        </span>
        {collapsible ? <ChevronIcon isOpen={isOpen} /> : null}
      </span>
    </>
  );

  return (
    <section className={rootClassName} aria-label={title}>
      {collapsible ? (
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className="qr-code-card-header qr-code-card-toggle"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {headerContent}
        </button>
      ) : (
        <div className="qr-code-card-header">{headerContent}</div>
      )}

      {shouldRenderContent ? (
        <div className="qr-code-card-content" id={contentId}>
          <div className="qr-code-card-body">
            <div className="qr-code-preview">
              <canvas ref={canvasRef} role="img" aria-label={`${title} için taranabilir QR kod`} />
            </div>

            <div className="qr-code-meta">
              <span>QR içeriği</span>
              <a href={value} target="_blank" rel="noopener noreferrer" title={value}>
                {formatShortLinkLabel(value)}
              </a>
              {helperText ? <p>{helperText}</p> : null}
              {currentStatus === "error" ? (
                <p className="qr-code-error" role="alert">
                  QR kod oluşturulamadı. Sayfayı yenileyip tekrar deneyin.
                </p>
              ) : null}
            </div>
          </div>

          <div className="qr-code-controls" aria-label="Markalı QR Kod ayarları">
            <div className="qr-code-control-group">
              <div className="qr-code-control-head">
                <span>QR rengi</span>
                <strong>{currentColorLabel}</strong>
              </div>
              <div className="qr-color-swatches" role="radiogroup" aria-label="QR kod koyu piksel rengi">
                {QR_CODE_COLORS.map((color) => {
                  const isSelected = selectedColor === color.value;

                  return (
                    <button
                      aria-checked={isSelected}
                      aria-label={`${color.label} QR rengi`}
                      className={isSelected ? "qr-color-swatch is-selected" : "qr-color-swatch"}
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      role="radio"
                      style={{ "--qr-swatch-color": color.value } as SwatchStyle}
                      title={color.label}
                      type="button"
                    >
                      <span aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="qr-code-control-group">
              <div className="qr-code-control-head">
                <span>Logo</span>
                <strong>{logo ? "Logo yüklendi" : "Opsiyonel"}</strong>
              </div>
              <div className="qr-logo-controls">
                <label className="btn btn-secondary btn-sm qr-logo-upload-button">
                  Logo yükle
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleLogoChange}
                    ref={fileInputRef}
                    type="file"
                  />
                </label>
                {logo ? (
                  <button className="btn btn-secondary btn-sm" onClick={clearLogo} type="button">
                    Logo kaldır
                  </button>
                ) : null}
              </div>
              {logo ? (
                <p className="qr-logo-state" title={logo.name}>
                  {logo.name} · {logo.width}×{logo.height} px
                </p>
              ) : null}
              <p className="qr-logo-help">
                Önerilen: kare, şeffaf PNG, en az 512×512 px. Maks. 1 MB. Logo otomatik olarak QR’ın ortasına yerleştirilir. Baskıdan önce test edin.
              </p>
              {logoError ? (
                <p className="qr-code-error" role="alert">
                  {logoError}
                </p>
              ) : null}
              {logo?.warning ? (
                <p className="qr-code-warning" role="status">
                  {logo.warning}
                </p>
              ) : null}
              {logo ? (
                <p className="qr-code-svg-note">
                  Logolu indirme için PNG kullanın. SVG çıktısı logosuz oluşturulur.
                </p>
              ) : null}
            </div>
          </div>

          <div className="qr-code-actions">
            <button className="btn btn-secondary btn-sm" disabled={!isReady} onClick={downloadPng} type="button">
              PNG indir
            </button>
            <button className="btn btn-secondary btn-sm" disabled={!isReady} onClick={downloadSvg} type="button">
              SVG indir
            </button>
            {showCopyButton ? (
              <CopyShortLinkButton
                value={value}
                className="btn btn-secondary btn-sm"
                idleLabel="QR linkini kopyala"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
