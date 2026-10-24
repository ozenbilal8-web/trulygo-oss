"use client";

import { useMemo, useState } from "react";
import {
  getDefaultDataSections,
  LINK_REPORT_PDF_SECTIONS,
  LINK_REPORT_RANGE_OPTIONS,
  LINK_REPORT_SECTIONS,
  type LinkReportDataFormat,
  type LinkReportDataType,
  type LinkReportPdfSectionKey,
  type LinkReportPdfType,
  type LinkReportRangeDays,
  type LinkReportSectionKey,
} from "@/lib/link-report-options";

type LinkReportExportControlsProps = {
  linkRequestId: string;
  rangeDays: LinkReportRangeDays;
};

type ExportStatus = {
  loading: boolean;
  error: string | null;
  success: string | null;
};

const PDF_SECTION_LABELS: Record<LinkReportPdfSectionKey, string> = {
  performance: "Performans özeti",
  dailyTrend: "Günlük trend grafiği",
  channels: "Kanal özeti",
  devices: "Cihaz özeti",
  locations: "Lokasyon özeti",
  hourly: "Saatlik yoğunluk özeti",
};

const PDF_DEFAULTS: Record<LinkReportPdfType, LinkReportPdfSectionKey[]> = {
  executive: ["performance", "dailyTrend", "channels", "devices", "locations"],
  detailed: ["performance", "dailyTrend", "channels", "devices", "locations", "hourly"],
};

function getFilenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) {
    return fallback;
  }

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return encodedMatch[1].trim().replace(/^"|"$/g, "") || fallback;
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(disposition);

  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = /filename=([^;]+)/i.exec(disposition);

  if (plainMatch?.[1]) {
    return plainMatch[1].trim().replace(/^"|"$/g, "") || fallback;
  }

  return fallback;
}

function getOrderedDataSections(sections: LinkReportSectionKey[]) {
  const selected = new Set(sections);

  selected.add("summary");

  return LINK_REPORT_SECTIONS
    .filter((section) => selected.has(section.key))
    .map((section) => section.key);
}

async function readExportError(response: Response) {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);

    if (body && typeof body.error === "string") {
      return body.error;
    }
  }

  const text = await response.text().catch(() => "");

  return text.trim() || "Rapor oluşturulamadı.";
}

async function downloadBlob({
  linkRequestId,
  payload,
  fallbackFilename,
}: {
  linkRequestId: string;
  payload: Record<string, unknown>;
  fallbackFilename: string;
}) {
  const response = await fetch(`/api/dashboard/links/${encodeURIComponent(linkRequestId)}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readExportError(response));
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("Rapor dosyası boş döndü.");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = getFilenameFromDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFilename,
  );
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function startProgress() {
  window.dispatchEvent(new CustomEvent("trulygo:progress-start"));
}

function finishProgress() {
  window.dispatchEvent(new CustomEvent("trulygo:progress-finish"));
}

export function LinkReportExportControls({
  linkRequestId,
  rangeDays,
}: LinkReportExportControlsProps) {
  const [dataOpen, setDataOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [dataRange, setDataRange] = useState<LinkReportRangeDays>(rangeDays);
  const [pdfRange, setPdfRange] = useState<LinkReportRangeDays>(rangeDays);
  const [format, setFormat] = useState<LinkReportDataFormat>("xlsx");
  const [dataReportType, setDataReportType] = useState<LinkReportDataType>("standard");
  const [selectedSections, setSelectedSections] = useState<LinkReportSectionKey[]>(
    getDefaultDataSections("standard"),
  );
  const [pdfReportType, setPdfReportType] = useState<LinkReportPdfType>("executive");
  const [pdfSections, setPdfSections] = useState<LinkReportPdfSectionKey[]>(PDF_DEFAULTS.executive);
  const [dataStatus, setDataStatus] = useState<ExportStatus>({
    loading: false,
    error: null,
    success: null,
  });
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>({
    loading: false,
    error: null,
    success: null,
  });

  const selectedSectionSet = useMemo(() => new Set(selectedSections), [selectedSections]);
  const selectedPdfSectionSet = useMemo(() => new Set(pdfSections), [pdfSections]);

  function openDataModal() {
    setDataRange(rangeDays);
    setDataStatus({ loading: false, error: null, success: null });
    setDataOpen(true);
  }

  function openPdfModal() {
    setPdfRange(rangeDays);
    setPdfStatus({ loading: false, error: null, success: null });
    setPdfOpen(true);
  }

  function updateDataReportType(type: LinkReportDataType) {
    setDataReportType(type);

    if (type !== "custom") {
      setSelectedSections(getDefaultDataSections(type));
    }
  }

  function updatePdfReportType(type: LinkReportPdfType) {
    setPdfReportType(type);
    setPdfSections(PDF_DEFAULTS[type]);
  }

  function toggleSection(section: LinkReportSectionKey) {
    if (section === "summary") {
      return;
    }

    setDataReportType("custom");
    setSelectedSections((current) => {
      const next = new Set(current);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      next.add("summary");
      return Array.from(next);
    });
  }

  function togglePdfSection(section: LinkReportPdfSectionKey) {
    setPdfSections((current) => {
      const next = new Set(current);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      return Array.from(next);
    });
  }

  async function submitDataExport() {
    setDataStatus({ loading: true, error: null, success: null });
    startProgress();

    try {
      await downloadBlob({
        linkRequestId,
        fallbackFilename: format === "csv" ? "trulygo-link-report.csv" : "trulygo-link-report.xlsx",
        payload: {
          exportType: "data",
          format,
          rangeDays: dataRange,
          reportType: dataReportType,
          sections: getOrderedDataSections(selectedSections),
        },
      });
      setDataStatus({ loading: false, error: null, success: "Rapor indirildi." });
    } catch (error) {
      setDataStatus({
        loading: false,
        error: error instanceof Error ? error.message : "Rapor oluşturulamadı.",
        success: null,
      });
    } finally {
      finishProgress();
    }
  }

  async function submitPdfExport() {
    setPdfStatus({ loading: true, error: null, success: null });
    startProgress();

    try {
      await downloadBlob({
        linkRequestId,
        fallbackFilename: "trulygo-link-report.pdf",
        payload: {
          exportType: "pdf",
          rangeDays: pdfRange,
          reportType: pdfReportType,
          sections: pdfSections,
        },
      });
      setPdfStatus({ loading: false, error: null, success: "PDF raporu indirildi." });
    } catch (error) {
      setPdfStatus({
        loading: false,
        error: error instanceof Error ? error.message : "PDF raporu oluşturulamadı.",
        success: null,
      });
    } finally {
      finishProgress();
    }
  }

  return (
    <>
      <div className="link-report-export-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={openPdfModal}>
          PDF indir
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={openDataModal}>
          Excel indir
        </button>
      </div>

      {dataOpen ? (
        <div
          className="modal-backdrop report-export-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="data-export-modal-title"
        >
          <div className="modal-card report-export-modal-card">
            <div className="report-export-modal-head">
              <div>
                <p>Veri export</p>
                <h3 id="data-export-modal-title">Raporu Dışa Aktar</h3>
              </div>
              <button
                type="button"
                className="report-export-close"
                onClick={() => setDataOpen(false)}
                disabled={dataStatus.loading}
                aria-label="Modalı kapat"
              >
                ×
              </button>
            </div>

            <ReportRangePicker value={dataRange} onChange={setDataRange} />

            <fieldset className="report-export-fieldset">
              <legend>Format</legend>
              <div className="report-export-option-grid">
                <button
                  type="button"
                  aria-pressed={format === "xlsx"}
                  className="report-export-choice"
                  onClick={() => setFormat("xlsx")}
                >
                  <strong>XLSX</strong>
                  <span>Tasarımlı Excel raporu</span>
                </button>
                <button
                  type="button"
                  aria-pressed={format === "csv"}
                  className="report-export-choice"
                  onClick={() => setFormat("csv")}
                >
                  <strong>CSV</strong>
                  <span>Ham veri / tablo çıktısı</span>
                </button>
              </div>
            </fieldset>

            <fieldset className="report-export-fieldset">
              <legend>Rapor tipi</legend>
              <div className="report-export-segmented">
                {(["standard", "detailed", "custom"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={dataReportType === type}
                    onClick={() => updateDataReportType(type)}
                  >
                    {type === "standard" ? "Standart" : type === "detailed" ? "Detaylı" : "Özel"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="report-export-fieldset">
              <legend>Dahil edilecek veri bölümleri</legend>
              <div className="report-export-check-grid">
                {LINK_REPORT_SECTIONS.map((section) => {
                  const disabled = section.key === "summary";

                  return (
                    <label key={section.key} className="report-export-check">
                      <input
                        type="checkbox"
                        checked={selectedSectionSet.has(section.key)}
                        disabled={disabled}
                        onChange={() => toggleSection(section.key)}
                      />
                      <span>{section.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <ModalStatus status={dataStatus} />

            <div className="modal-actions report-export-modal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm report-export-cancel"
                onClick={() => setDataOpen(false)}
                disabled={dataStatus.loading}
              >
                İptal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={submitDataExport}
                disabled={dataStatus.loading}
              >
                {dataStatus.loading ? "Hazırlanıyor..." : "İndir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pdfOpen ? (
        <div
          className="modal-backdrop report-export-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-export-modal-title"
        >
          <div className="modal-card report-export-modal-card">
            <div className="report-export-modal-head">
              <div>
                <p>PDF raporu</p>
                <h3 id="pdf-export-modal-title">PDF Raporu Oluştur</h3>
              </div>
              <button
                type="button"
                className="report-export-close"
                onClick={() => setPdfOpen(false)}
                disabled={pdfStatus.loading}
                aria-label="Modalı kapat"
              >
                ×
              </button>
            </div>

            <ReportRangePicker value={pdfRange} onChange={setPdfRange} />

            <fieldset className="report-export-fieldset">
              <legend>Rapor tipi</legend>
              <div className="report-export-segmented">
                {(["executive", "detailed"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={pdfReportType === type}
                    onClick={() => updatePdfReportType(type)}
                  >
                    {type === "executive" ? "Yönetici Özeti" : "Detaylı Rapor"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="report-export-fieldset">
              <legend>Dahil edilecek bölümler</legend>
              <div className="report-export-check-grid">
                {LINK_REPORT_PDF_SECTIONS.map((section) => (
                  <label key={section} className="report-export-check">
                    <input
                      type="checkbox"
                      checked={selectedPdfSectionSet.has(section)}
                      onChange={() => togglePdfSection(section)}
                    />
                    <span>{PDF_SECTION_LABELS[section]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <ModalStatus status={pdfStatus} />

            <div className="modal-actions report-export-modal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm report-export-cancel"
                onClick={() => setPdfOpen(false)}
                disabled={pdfStatus.loading}
              >
                İptal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={submitPdfExport}
                disabled={pdfStatus.loading}
              >
                {pdfStatus.loading ? "Hazırlanıyor..." : "PDF indir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ReportRangePicker({
  value,
  onChange,
}: {
  value: LinkReportRangeDays;
  onChange: (value: LinkReportRangeDays) => void;
}) {
  return (
    <fieldset className="report-export-fieldset">
      <legend>Tarih aralığı</legend>
      <div className="report-export-segmented">
        {LINK_REPORT_RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option} gün
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ModalStatus({ status }: { status: ExportStatus }) {
  if (status.error) {
    return (
      <p className="report-export-status is-error" role="alert">
        {status.error}
      </p>
    );
  }

  if (status.success) {
    return <p className="report-export-status is-success">{status.success}</p>;
  }

  return null;
}
