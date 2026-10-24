import "server-only";

import fontkit from "@pdf-lib/fontkit";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LinkReportPdfSectionKey } from "@/lib/link-report-options";
import {
  buildLinkReportFilename,
  type LinkReportData,
  type LinkReportColumnType,
  type LinkReportTable,
} from "@/lib/link-report-data";

const EXCEL_MAX_CELL_LENGTH = 32767;
const INVALID_WORKSHEET_NAME_CHARS = /[\*\?:\\/\[\]]/g;

const XLSX_COLORS = {
  navy: "0B1F3A",
  navySoft: "102B4D",
  green: "128C4A",
  greenBright: "49B56A",
  greenSoft: "DDF8E8",
  page: "F5F8FC",
  surface: "FFFFFF",
  border: "D8E1EA",
  muted: "536272",
  danger: "C4422C",
};

type PdfFonts = {
  regular: PDFFont;
  semiBold: PDFFont;
  bold: PDFFont;
};

type PdfAssets = {
  logo: PDFImage;
  mark: PDFImage;
};

function cleanExportText(value: string, maxLength = EXCEL_MAX_CELL_LENGTH) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "-";
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxLength - 3))}...`;
}

function toCellText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Evet" : "Hayır";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "-";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "-" : value.toISOString();
  }

  return cleanExportText(String(value));
}

function sanitizeCellValue(value: unknown, type?: LinkReportColumnType) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "-";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "-" : value;
  }

  if (typeof value === "boolean") {
    return value ? "Evet" : "Hayır";
  }

  const maxLength = type === "url" ? 8000 : EXCEL_MAX_CELL_LENGTH;

  return cleanExportText(String(value), maxLength);
}

function sanitizeWorksheetName(name: string) {
  const cleaned = cleanExportText(name, 31)
    .replace(INVALID_WORKSHEET_NAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned === "-" ? "Rapor" : cleaned.slice(0, 31).trim() || "Rapor";
}

function getUniqueWorksheetName(workbook: ExcelJS.Workbook, name: string) {
  const base = sanitizeWorksheetName(name);
  let candidate = base;
  let index = 2;

  while (
    workbook.worksheets.some(
      (worksheet) => worksheet.name.toLocaleLowerCase("tr-TR") === candidate.toLocaleLowerCase("tr-TR"),
    )
  ) {
    const suffix = ` ${index}`;
    candidate = `${base.slice(0, 31 - suffix.length).trim()}${suffix}`;
    index += 1;
  }

  return candidate;
}

function formatReportDateTime(value: string | null | undefined) {
  if (!value) {
    return "Henüz yok";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Henüz yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeCsvCell(value: unknown) {
  const text = toCellText(value);
  const safeText = typeof value === "number" || text === "-" ? text : text.replace(/^([=+\-@])/, "'$1");
  const escaped = safeText.replace(/"/g, '""');

  return /[;"\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function buildCsvContent(table: LinkReportTable) {
  const header = table.columns.map((column) => escapeCsvCell(column.header)).join(";");
  const rows = table.rows.map((row) =>
    table.columns.map((column) => escapeCsvCell(row[column.key])).join(";"),
  );

  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}

export async function buildCsvZip(tables: LinkReportTable[]) {
  const zip = new JSZip();

  tables.forEach((table) => {
    zip.file(table.csvFileName, buildCsvContent(table));
  });

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function styleCellBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: XLSX_COLORS.border } },
    left: { style: "thin", color: { argb: XLSX_COLORS.border } },
    bottom: { style: "thin", color: { argb: XLSX_COLORS.border } },
    right: { style: "thin", color: { argb: XLSX_COLORS.border } },
  };
}

function applyCellFormat(cell: ExcelJS.Cell, type = "text") {
  if (type === "integer" || type === "number") {
    cell.numFmt = '#,##0';
    cell.alignment = { horizontal: "right", vertical: "middle" };
    return;
  }

  if (type === "percent") {
    cell.numFmt = '0.0%';
    cell.alignment = { horizontal: "right", vertical: "middle" };
    return;
  }

  if (type === "url") {
    cell.alignment = { wrapText: true, vertical: "middle" };
    cell.font = { color: { argb: XLSX_COLORS.navySoft }, underline: true };
    return;
  }

  cell.alignment = { wrapText: true, vertical: "middle" };
}

function setWorksheetChrome(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ showGridLines: false }];
  worksheet.properties.defaultRowHeight = 22;
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.55,
      bottom: 0.55,
      header: 0.2,
      footer: 0.2,
    },
  };
}

function applyReportHeader(
  worksheet: ExcelJS.Worksheet,
  report: LinkReportData,
  title: string,
  description: string,
) {
  worksheet.mergeCells("A1:B2");
  const logoCell = worksheet.getCell("A1");
  logoCell.value = {
    richText: [
      { text: "Truly", font: { bold: true, color: { argb: XLSX_COLORS.navy }, size: 18 } },
      { text: "Go", font: { bold: true, color: { argb: XLSX_COLORS.green }, size: 18 } },
    ],
  };
  logoCell.alignment = { vertical: "middle" };

  worksheet.mergeCells("C1:H1");
  const titleCell = worksheet.getCell("C1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 18, color: { argb: XLSX_COLORS.navy } };
  titleCell.alignment = { vertical: "middle" };

  worksheet.mergeCells("C2:H2");
  const descriptionCell = worksheet.getCell("C2");
  descriptionCell.value = description;
  descriptionCell.font = { size: 10, color: { argb: XLSX_COLORS.muted } };

  worksheet.mergeCells("I1:K1");
  worksheet.getCell("I1").value = `Rapor tarihi: ${report.generatedAtLabel}`;
  worksheet.getCell("I1").font = { bold: true, size: 10, color: { argb: XLSX_COLORS.navySoft } };
  worksheet.getCell("I1").alignment = { horizontal: "right" };

  worksheet.mergeCells("I2:K2");
  worksheet.getCell("I2").value = `Tarih aralığı: ${report.dateRangeLabel}`;
  worksheet.getCell("I2").font = { size: 10, color: { argb: XLSX_COLORS.muted } };
  worksheet.getCell("I2").alignment = { horizontal: "right" };
}

function addMetadataBlock(worksheet: ExcelJS.Worksheet, report: LinkReportData, startRow: number) {
  const rows = [
    ["Kampanya / Link", report.linkName, "Kısa Link", report.shortUrl ?? "-"],
    ["Hedef URL", report.request.targetUrl, "Aralık", `${report.rangeDays} gün`],
  ];

  rows.forEach((row, index) => {
    const currentRow = worksheet.getRow(startRow + index);
    currentRow.values = row.map((value) => sanitizeCellValue(value));
    currentRow.height = 24;
    [1, 3].forEach((columnIndex) => {
      const cell = currentRow.getCell(columnIndex);
      cell.font = { bold: true, color: { argb: XLSX_COLORS.green } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.greenSoft } };
    });
    [2, 4].forEach((columnIndex) => {
      const cell = currentRow.getCell(columnIndex);
      cell.alignment = { wrapText: true, vertical: "middle" };
      cell.font = { color: { argb: XLSX_COLORS.navy } };
    });
  });
}

function addKpiCards(worksheet: ExcelJS.Worksheet, report: LinkReportData, startRow: number) {
  const kpis = [
    ["Toplam Tıklama", report.request.analytics.totalClicks],
    ["Bugün", report.analytics.todayClicks],
    ["Son 7 Gün", report.analytics.last7DaysClicks],
    ["Son Tıklama", formatReportDateTime(report.request.analytics.lastClickedAt)],
    ["Seçili Aralık", report.summary.currentTotal],
    ["Önceki Dönem", report.summary.previousTotal],
    ["En Güçlü Kanal", report.summary.topChannel?.label ?? "Veri yok"],
    ["En Güçlü Cihaz", report.summary.topDevice?.label ?? "Veri yok"],
  ];

  kpis.forEach(([label, value], index) => {
    const rowOffset = Math.floor(index / 4) * 3;
    const columnOffset = (index % 4) * 3 + 1;
    const topLeft = worksheet.getCell(startRow + rowOffset, columnOffset);
    const valueCell = worksheet.getCell(startRow + rowOffset + 1, columnOffset);

    worksheet.mergeCells(startRow + rowOffset, columnOffset, startRow + rowOffset, columnOffset + 1);
    worksheet.mergeCells(startRow + rowOffset + 1, columnOffset, startRow + rowOffset + 2, columnOffset + 1);
    topLeft.value = label;
    topLeft.font = { bold: true, size: 9, color: { argb: XLSX_COLORS.green } };
    topLeft.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.greenSoft } };
    topLeft.alignment = { vertical: "middle" };
    valueCell.value = sanitizeCellValue(value);
    valueCell.font = { bold: true, size: 15, color: { argb: XLSX_COLORS.navy } };
    valueCell.alignment = { wrapText: true, vertical: "middle" };

    for (let row = startRow + rowOffset; row <= startRow + rowOffset + 2; row += 1) {
      for (let column = columnOffset; column <= columnOffset + 1; column += 1) {
        const cell = worksheet.getCell(row, column);
        cell.fill ??= { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.surface } };
        styleCellBorder(cell);
      }
    }
  });
}

function addTableToWorksheet(
  worksheet: ExcelJS.Worksheet,
  table: LinkReportTable,
  startRow: number,
) {
  const headerRow = worksheet.getRow(startRow);
  headerRow.values = table.columns.map((column) => sanitizeCellValue(column.header));
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.navy } };
    cell.alignment = { vertical: "middle", wrapText: true };
    styleCellBorder(cell);
  });

  table.rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(startRow + 1 + rowIndex);
    excelRow.values = table.columns.map((column) => sanitizeCellValue(row[column.key], column.type));
    excelRow.height = 23;
    excelRow.eachCell((cell, columnIndex) => {
      const column = table.columns[columnIndex - 1];
      const fill = rowIndex % 2 === 0 ? XLSX_COLORS.surface : XLSX_COLORS.page;

      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.font = { color: { argb: XLSX_COLORS.navy } };
      applyCellFormat(cell, column?.type);
      styleCellBorder(cell);
    });
  });

  table.columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width ?? 18;
  });

  worksheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow + table.rows.length, column: table.columns.length },
  };
  worksheet.views = [{ state: "frozen", ySplit: startRow, showGridLines: false }];
}

function addSummaryWorksheet(
  workbook: ExcelJS.Workbook,
  report: LinkReportData,
  table: LinkReportTable,
) {
  const worksheet = workbook.addWorksheet("Özet");
  setWorksheetChrome(worksheet);
  worksheet.columns = Array.from({ length: 11 }, () => ({ width: 16 }));

  applyReportHeader(worksheet, report, "Link Performans Raporu", "Paylaşılabilir TrulyGo yönetici özeti");
  addMetadataBlock(worksheet, report, 4);
  addKpiCards(worksheet, report, 8);

  worksheet.mergeCells("A16:K17");
  const insightCell = worksheet.getCell("A16");
  insightCell.value = report.insightText;
  insightCell.font = { bold: true, color: { argb: XLSX_COLORS.navy }, size: 11 };
  insightCell.alignment = { wrapText: true, vertical: "middle" };
  insightCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.greenSoft } };
  styleCellBorder(insightCell);

  addTableToWorksheet(worksheet, table, 20);
}

function addRegularWorksheet(
  workbook: ExcelJS.Workbook,
  report: LinkReportData,
  table: LinkReportTable,
) {
  const worksheet = workbook.addWorksheet(getUniqueWorksheetName(workbook, table.worksheetName));
  setWorksheetChrome(worksheet);
  applyReportHeader(worksheet, report, table.title, table.description);
  addTableToWorksheet(worksheet, table, 5);
}

export async function buildXlsxReport(report: LinkReportData, tables: LinkReportTable[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TrulyGo";
  workbook.created = report.generatedAt;
  workbook.modified = report.generatedAt;

  tables.forEach((table) => {
    if (table.section === "summary") {
      addSummaryWorksheet(workbook, report, table);
    } else {
      addRegularWorksheet(workbook, report, table);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}

async function loadPdfFonts(pdfDoc: PDFDocument): Promise<PdfFonts> {
  pdfDoc.registerFontkit(fontkit);
  const basePath = path.join(process.cwd(), "node_modules", "geist", "dist", "fonts", "geist-sans");
  const [regular, semiBold, bold] = await Promise.all([
    readFile(path.join(basePath, "Geist-Regular.ttf")),
    readFile(path.join(basePath, "Geist-SemiBold.ttf")),
    readFile(path.join(basePath, "Geist-Bold.ttf")),
  ]);

  return {
    regular: await pdfDoc.embedFont(regular, { subset: true }),
    semiBold: await pdfDoc.embedFont(semiBold, { subset: true }),
    bold: await pdfDoc.embedFont(bold, { subset: true }),
  };
}

async function loadPdfAssets(pdfDoc: PDFDocument): Promise<PdfAssets> {
  const brandPath = path.join(process.cwd(), "public", "brand");
  const [logo, mark] = await Promise.all([
    readFile(path.join(brandPath, "trulygo-report-logo.png")),
    readFile(path.join(brandPath, "trulygo-report-mark.png")),
  ]);

  return {
    logo: await pdfDoc.embedPng(logo),
    mark: await pdfDoc.embedPng(mark),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

const REPORT_PAGE = {
  width: 594.96,
  height: 841.92,
  marginX: 34,
  contentWidth: 526.96,
};

const REPORT_COLORS = {
  white: rgb(1, 1, 1),
  navy: rgb(0.086, 0.188, 0.361),
  navyText: rgb(0.086, 0.188, 0.361),
  navyCard: rgb(0.129, 0.231, 0.384),
  green: rgb(0.298, 0.655, 0.416),
  greenText: rgb(0.18, 0.49, 0.31),
  greenSoft: rgb(0.906, 0.957, 0.925),
  page: rgb(1, 1, 1),
  card: rgb(1, 1, 1),
  softCard: rgb(0.961, 0.973, 0.984),
  insight: rgb(0.929, 0.965, 0.941),
  insightBorder: rgb(0.827, 0.91, 0.859),
  border: rgb(0.886, 0.91, 0.945),
  grid: rgb(0.929, 0.945, 0.969),
  muted: rgb(0.486, 0.541, 0.627),
  label: rgb(0.392, 0.455, 0.545),
  body: rgb(0.2, 0.255, 0.361),
  progressTrack: rgb(0.933, 0.949, 0.969),
};

type ReferenceTextOptions = {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color?: RGB;
  maxWidth?: number;
  lineHeight?: number;
  maxLines?: number;
};

type ReportDistributionRow = {
  name: string;
  value: number;
  valueLabel: string;
  percentLabel: string;
  widthPercent: number;
};

function roundedRectPath(width: number, height: number, radius: number) {
  const right = width;
  const bottom = height;
  const r = Math.min(radius, width / 2, height / 2);
  const c = r * 0.5522847498;

  return [
    `M ${r} 0`,
    `L ${right - r} 0`,
    `C ${right - r + c} 0 ${right} ${r - c} ${right} ${r}`,
    `L ${right} ${bottom - r}`,
    `C ${right} ${bottom - r + c} ${right - r + c} ${bottom} ${right - r} ${bottom}`,
    `L ${r} ${bottom}`,
    `C ${r - c} ${bottom} 0 ${bottom - r + c} 0 ${bottom - r}`,
    `L 0 ${r}`,
    `C 0 ${r - c} ${r - c} 0 ${r} 0`,
    "Z",
  ].join(" ");
}

function drawRoundedRect(
  page: PDFPage,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    color: RGB;
    borderColor?: RGB;
    borderWidth?: number;
  },
) {
  page.drawSvgPath(roundedRectPath(options.width, options.height, options.radius), {
    x: options.x,
    y: options.y + options.height,
    color: options.color,
    borderColor: options.borderColor,
    borderWidth: options.borderColor ? (options.borderWidth ?? 1) : 0,
  });
}

function drawImageByHeight(page: PDFPage, image: PDFImage, x: number, y: number, height: number) {
  page.drawImage(image, {
    x,
    y,
    width: image.width * (height / image.height),
    height,
  });
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number, forceEllipsis = false) {
  if (!forceEllipsis && font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let next = text;
  while (next.length > 0 && font.widthOfTextAtSize(`${next}...`, size) > maxWidth) {
    next = next.slice(0, -1);
  }

  return next ? `${next}...` : "...";
}

function wrapReferenceText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 99) {
  const tokens = cleanExportText(text).split(/\s+/g);
  const lines: string[] = [];
  let line = "";

  for (const token of tokens) {
    const pieces: string[] = [];
    let rest = token;

    while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
      let piece = rest;
      while (piece.length > 1 && font.widthOfTextAtSize(piece, size) > maxWidth) {
        piece = piece.slice(0, -1);
      }
      pieces.push(piece);
      rest = rest.slice(piece.length);
    }
    pieces.push(rest);

    for (const piece of pieces) {
      const candidate = line ? `${line} ${piece}` : piece;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
      }
      line = piece;

      if (lines.length === maxLines) {
        lines[maxLines - 1] = truncateToWidth(lines[maxLines - 1], font, size, maxWidth, true);
        return lines;
      }
    }
  }

  if (line) {
    lines.push(line);
  }

  if (lines.length > maxLines) {
    return [
      ...lines.slice(0, maxLines - 1),
      truncateToWidth(lines[maxLines - 1], font, size, maxWidth, true),
    ];
  }

  return lines.length > 0 ? lines : ["-"];
}

function drawReferenceText(page: PDFPage, text: string, options: ReferenceTextOptions) {
  const lineHeight = options.lineHeight ?? options.size + 3;
  const lines = options.maxWidth
    ? wrapReferenceText(text, options.font, options.size, options.maxWidth, options.maxLines)
    : [text];
  let cursorY = options.y;

  lines.forEach((line) => {
    page.drawText(line, {
      x: options.x,
      y: cursorY,
      size: options.size,
      font: options.font,
      color: options.color ?? REPORT_COLORS.navyText,
    });
    cursorY -= lineHeight;
  });

  return cursorY;
}

function drawRightAlignedText(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  size: number,
  font: PDFFont,
  color: RGB,
) {
  const safeText = cleanExportText(text);
  page.drawText(safeText, {
    x: xRight - font.widthOfTextAtSize(safeText, size),
    y,
    size,
    font,
    color,
  });
}

function drawMetaRow(page: PDFPage, fonts: PdfFonts, label: string, value: string, y: number) {
  const valueText = cleanExportText(value);
  const labelText = cleanExportText(label);
  const valueSize = 7.8;
  const labelSize = 7.8;
  const xRight = 561;
  const valueWidth = fonts.bold.widthOfTextAtSize(valueText, valueSize);
  const labelWidth = fonts.regular.widthOfTextAtSize(labelText, labelSize);
  const valueX = xRight - valueWidth;

  page.drawText(labelText, {
    x: valueX - labelWidth - 5,
    y,
    size: labelSize,
    font: fonts.regular,
    color: REPORT_COLORS.muted,
  });
  page.drawText(valueText, {
    x: valueX,
    y,
    size: valueSize,
    font: fonts.bold,
    color: REPORT_COLORS.navyText,
  });
}

function addReferencePage(pdfDoc: PDFDocument) {
  const page = pdfDoc.addPage([REPORT_PAGE.width, REPORT_PAGE.height]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: REPORT_PAGE.width,
    height: REPORT_PAGE.height,
    color: REPORT_COLORS.page,
  });

  return page;
}

function formatReportDateOnly(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatReferenceDateTime(value: string | null | undefined) {
  if (!value) {
    return "Henüz yok";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Henüz yok";
  }

  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = (parts.find((part) => part.type === "month")?.value ?? "").replace(".", "");
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";

  return `${day} ${month}, ${hour}:${minute}`.trim();
}

function getReportTypeLabel(sections: LinkReportPdfSectionKey[], explicit?: string) {
  if (explicit) {
    return explicit;
  }

  return sections.includes("hourly") ? "Link Detay Analizi" : "Yönetici Özeti";
}

function getChangeChip(report: LinkReportData) {
  const label = report.summary.changeLabel;

  if (report.summary.trendTone === "positive") {
    return `▲ ${label}`;
  }

  if (report.summary.trendTone === "negative") {
    return `▼ ${label}`;
  }

  return label;
}

function getClickDetail(count: number | null | undefined) {
  return typeof count === "number" && count > 0 ? `${formatNumber(count)} tıklama` : "Veri yok";
}

function sumSeriesForDays(
  series: { points: Array<{ dayKey: string; value: number }> },
  dayKeys: Set<string>,
) {
  return series.points.reduce((sum, point) => sum + (dayKeys.has(point.dayKey) ? Math.max(point.value, 0) : 0), 0);
}

function buildDistributionRows(
  rows: Array<{ label: string; value: number }>,
  limit: number,
): ReportDistributionRow[] {
  const cleaned = rows
    .map((row) => ({ label: cleanExportText(row.label), value: Math.max(0, row.value) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "tr"))
    .slice(0, limit);
  const max = Math.max(1, ...cleaned.map((row) => row.value));
  const total = cleaned.reduce((sum, row) => sum + row.value, 0);
  const finalRows = cleaned.length > 0 ? cleaned : [{ label: "Veri yok", value: 0 }];

  return finalRows.map((row) => ({
    name: row.label,
    value: row.value,
    valueLabel: formatNumber(row.value),
    percentLabel: total > 0 ? `%${Math.round((row.value / total) * 100)}` : "%0",
    widthPercent: row.value <= 0 ? 0 : Math.max(3, Math.round((row.value / max) * 100)),
  }));
}

function getChannelDistributionRows(report: LinkReportData) {
  return buildDistributionRows(
    report.performance.channels.map((series) => ({
      label: series.label,
      value: sumSeriesForDays(series, report.currentDayKeys),
    })),
    4,
  );
}

function getDeviceDistributionRows(report: LinkReportData) {
  return buildDistributionRows(
    report.performance.devices.map((series) => ({
      label: series.label,
      value: sumSeriesForDays(series, report.currentDayKeys),
    })),
    3,
  );
}

function getLocationDistributionRows(report: LinkReportData) {
  return buildDistributionRows(
    report.performance.locations.map((series) => ({
      label: series.label,
      value: sumSeriesForDays(series, report.currentDayKeys),
    })),
    3,
  );
}

function getBrowserOsDistributionRows(report: LinkReportData) {
  const rows = new Map<string, number>();

  report.currentEvents.forEach((event) => {
    const label = `${event.os} / ${event.browser}`;
    rows.set(label, (rows.get(label) ?? 0) + 1);
  });

  return buildDistributionRows(
    Array.from(rows.entries()).map(([label, value]) => ({ label, value })),
    3,
  );
}

function getRowsTotal(rows: ReportDistributionRow[]) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}

function formatHourRange(hour: number) {
  return `${String(hour).padStart(2, "0")}:00 - ${String((hour + 1) % 24).padStart(2, "0")}:00`;
}

function getReferenceHourlySummary(report: LinkReportData) {
  const hourCounts = Array.from({ length: 24 }, () => 0);

  report.currentEvents.forEach((event) => {
    hourCounts[event.hour] = (hourCounts[event.hour] ?? 0) + 1;
  });

  const total = hourCounts.reduce((sum, value) => sum + value, 0);
  const peakValue = Math.max(...hourCounts);
  const lowValue = Math.min(...hourCounts);
  const peakHour = hourCounts.findIndex((value) => value === peakValue);
  const lowHour = hourCounts.findIndex((value) => value === lowValue);
  const avg = total / 24;

  if (total <= 0) {
    return {
      peak: "Veri yok",
      low: "Veri yok",
      average: "0",
      insight: "Bu tarih aralığında saatlik yoğunluk oluşmadı.",
    };
  }

  const peakShare = Math.round((peakValue / total) * 100);

  return {
    peak: formatHourRange(Math.max(0, peakHour)),
    low: formatHourRange(Math.max(0, lowHour)),
    average: new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(avg),
    insight: `Tıklamalar ${formatHourRange(Math.max(0, peakHour))} aralığında yoğunlaşıyor; bu saat aralığı toplam trafiğin yaklaşık %${peakShare}'ini oluşturuyor.`,
  };
}

function drawReferenceHeader(
  page: PDFPage,
  fonts: PdfFonts,
  assets: PdfAssets,
  report: LinkReportData,
  reportTypeLabel: string,
) {
  drawImageByHeight(page, assets.logo, 33.5, 777, 22.5);
  drawMetaRow(page, fonts, "Rapor Tarihi", formatReportDateOnly(report.generatedAt), 801);
  drawMetaRow(page, fonts, "Tarih Aralığı", report.dateRangeLabel, 789);
  drawMetaRow(page, fonts, "Rapor Tipi", reportTypeLabel, 777);
}

function drawReferenceFooter(page: PDFPage, fonts: PdfFonts, assets: PdfAssets) {
  page.drawLine({
    start: { x: 0, y: 34 },
    end: { x: REPORT_PAGE.width, y: 34 },
    thickness: 0.5,
    color: REPORT_COLORS.border,
  });
  page.drawText("Bu rapor TrulyGo tarafından oluşturulmuştur.", {
    x: REPORT_PAGE.marginX,
    y: 17,
    size: 7.2,
    font: fonts.regular,
    color: REPORT_COLORS.muted,
  });
  drawImageByHeight(page, assets.logo, 514, 10.5, 12);
}

function drawHero(page: PDFPage, fonts: PdfFonts, report: LinkReportData) {
  const x = REPORT_PAGE.marginX;
  const y = 628;
  const width = REPORT_PAGE.contentWidth;
  const height = 139;

  drawRoundedRect(page, { x, y, width, height, radius: 10, color: REPORT_COLORS.navy });
  page.drawText("TRULYGO · LINK ANALİTİĞİ", {
    x: x + 22,
    y: y + height - 28,
    size: 8,
    font: fonts.bold,
    color: rgb(0.49, 0.86, 0.6),
  });
  page.drawText("Link Performans", {
    x: x + 22,
    y: y + height - 61,
    size: 24,
    font: fonts.bold,
    color: REPORT_COLORS.white,
  });
  page.drawText("Raporu", {
    x: x + 22,
    y: y + height - 87,
    size: 24,
    font: fonts.bold,
    color: REPORT_COLORS.white,
  });
  drawReferenceText(
    page,
    "Bu rapor, seçilen tarih aralığındaki tıklama trafiğini kanal, cihaz ve lokasyon kırılımlarını özetler.",
    {
      x: x + 22,
      y: y + 24,
      size: 8.5,
      font: fonts.regular,
      color: rgb(0.73, 0.79, 0.88),
      maxWidth: 250,
      lineHeight: 12,
      maxLines: 2,
    },
  );

  const infoX = x + 291;
  const infoY = y + 20;
  drawRoundedRect(page, {
    x: infoX,
    y: infoY,
    width: 216,
    height: 99,
    radius: 7,
    color: REPORT_COLORS.navyCard,
    borderColor: rgb(0.294, 0.392, 0.537),
    borderWidth: 0.6,
  });

  const infoRows = [
    ["KAMPANYA / LINK ADI", report.linkName, 0],
    ["KISA LINK", report.shortUrl ?? "-", 34],
    ["HEDEF URL", report.request.targetUrl, 56],
  ] as const;

  infoRows.forEach(([label, value, offset]) => {
    page.drawText(label, {
      x: infoX + 12,
      y: infoY + 80 - offset,
      size: 6.7,
      font: fonts.bold,
      color: rgb(0.58, 0.64, 0.73),
    });
    drawReferenceText(page, value, {
      x: infoX + 12,
      y: infoY + 68 - offset,
      size: offset === 34 ? 10.8 : 9.2,
      font: offset === 34 ? fonts.bold : fonts.semiBold,
      color: offset === 34 ? rgb(0.52, 0.91, 0.63) : REPORT_COLORS.white,
      maxWidth: 190,
      lineHeight: 10.5,
      maxLines: label === "HEDEF URL" ? 2 : 1,
    });
  });
}

function drawKpiSection(page: PDFPage, fonts: PdfFonts, report: LinkReportData) {
  const gap = 9;
  const width = (REPORT_PAGE.contentWidth - gap * 3) / 4;
  const y = 534;
  const height = 83;
  const kpis = [
    {
      label: "TOPLAM TIKLAMA",
      value: formatNumber(report.request.analytics.totalClicks),
      detail: "Yayına alındığından beri",
      active: true,
    },
    {
      label: "BUGÜN",
      value: formatNumber(report.analytics.todayClicks),
      detail: "Europe/Istanbul gün başlangıcı",
    },
    {
      label: "SON 7 GÜN",
      value: formatNumber(report.analytics.last7DaysClicks),
      detail: "Günlük unique / toplam trafik",
    },
    {
      label: "SON TIKLAMA",
      value: formatReferenceDateTime(report.request.analytics.lastClickedAt),
      detail: "En son kayıtlı yönlendirme",
    },
  ];

  kpis.forEach((item, index) => {
    const x = REPORT_PAGE.marginX + index * (width + gap);
    drawRoundedRect(page, {
      x,
      y,
      width,
      height,
      radius: 9,
      color: item.active ? REPORT_COLORS.navy : REPORT_COLORS.card,
      borderColor: item.active ? REPORT_COLORS.navy : REPORT_COLORS.border,
      borderWidth: 0.7,
    });
    page.drawText(item.label, {
      x: x + 14,
      y: y + height - 18,
      size: 7.2,
      font: fonts.bold,
      color: item.active ? rgb(0.52, 0.91, 0.63) : REPORT_COLORS.label,
    });
    drawReferenceText(page, item.value, {
      x: x + 14,
      y: y + 40,
      size: index === 3 ? 15 : 20,
      font: fonts.bold,
      color: item.active ? REPORT_COLORS.white : REPORT_COLORS.navyText,
      maxWidth: width - 28,
      maxLines: 1,
    });
    drawReferenceText(page, item.detail, {
      x: x + 14,
      y: y + 15,
      size: 7.5,
      font: fonts.regular,
      color: item.active ? rgb(0.68, 0.75, 0.84) : REPORT_COLORS.muted,
      maxWidth: width - 28,
      lineHeight: 8.5,
      maxLines: 2,
    });
  });
}

function drawPerformanceSummary(page: PDFPage, fonts: PdfFonts, report: LinkReportData) {
  const x = REPORT_PAGE.marginX;
  const y = 385;
  const width = REPORT_PAGE.contentWidth;
  const height = 139;
  const headerHeight = 33;
  const rowOneHeight = 51;
  const rowTwoHeight = height - headerHeight - rowOneHeight;

  drawRoundedRect(page, {
    x,
    y,
    width,
    height,
    radius: 9,
    color: REPORT_COLORS.card,
    borderColor: REPORT_COLORS.border,
    borderWidth: 0.7,
  });
  page.drawText("Performans Özeti", {
    x: x + 14,
    y: y + height - 20,
    size: 10.8,
    font: fonts.bold,
    color: REPORT_COLORS.navyText,
  });
  drawRightAlignedText(
    page,
    `Son ${report.rangeDays} gün · önceki ${report.rangeDays} gün ile karşılaştırma`,
    x + width - 14,
    y + height - 19,
    7.2,
    fonts.regular,
    REPORT_COLORS.muted,
  );

  const rowOneTop = y + height - headerHeight;
  const rowOneBottom = rowOneTop - rowOneHeight;
  const rowTwoTop = rowOneBottom;

  page.drawLine({ start: { x, y: rowOneTop }, end: { x: x + width, y: rowOneTop }, thickness: 0.5, color: REPORT_COLORS.border });
  page.drawLine({ start: { x, y: rowOneBottom }, end: { x: x + width, y: rowOneBottom }, thickness: 0.5, color: REPORT_COLORS.border });

  for (let i = 1; i < 3; i += 1) {
    const lineX = x + (width / 3) * i;
    page.drawLine({ start: { x: lineX, y: rowOneBottom }, end: { x: lineX, y: rowOneTop }, thickness: 0.5, color: REPORT_COLORS.border });
  }
  for (let i = 1; i < 4; i += 1) {
    const lineX = x + (width / 4) * i;
    page.drawLine({ start: { x: lineX, y }, end: { x: lineX, y: rowTwoTop }, thickness: 0.5, color: REPORT_COLORS.border });
  }

  const firstRow = [
    [`SON ${report.rangeDays} GÜN`, formatNumber(report.summary.currentTotal), null],
    [`ÖNCEKİ ${report.rangeDays} GÜN`, formatNumber(report.summary.previousTotal), null],
    ["ÖNCEKİ DÖNEME GÖRE", getChangeChip(report), "chip"],
  ] as const;

  firstRow.forEach(([label, value, variant], index) => {
    const cellX = x + (width / 3) * index + 14;
    page.drawText(label, {
      x: cellX,
      y: rowOneTop - 18,
      size: 7.2,
      font: fonts.bold,
      color: REPORT_COLORS.label,
    });
    if (variant === "chip") {
      drawRoundedRect(page, {
        x: cellX,
        y: rowOneTop - 41,
        width: Math.min(92, fonts.bold.widthOfTextAtSize(value, 9.4) + 20),
        height: 18,
        radius: 9,
        color: report.summary.trendTone === "negative" ? rgb(0.992, 0.91, 0.898) : rgb(0.906, 0.957, 0.925),
      });
      page.drawText(value, {
        x: cellX + 10,
        y: rowOneTop - 36,
        size: 9.4,
        font: fonts.bold,
        color: report.summary.trendTone === "negative" ? rgb(0.7, 0.22, 0.16) : REPORT_COLORS.greenText,
      });
      return;
    }
    page.drawText(value, {
      x: cellX,
      y: rowOneTop - 36,
      size: 15,
      font: fonts.bold,
      color: REPORT_COLORS.navyText,
    });
  });

  const secondRow = [
    ["EN YOĞUN GÜN", report.summary.peakDay?.longLabel ?? "Veri yok", getClickDetail(report.summary.peakDay?.count)],
    ["EN GÜÇLÜ KANAL", report.summary.topChannel?.label ?? "Veri yok", getClickDetail(report.summary.topChannel?.count)],
    ["EN GÜÇLÜ CİHAZ", report.summary.topDevice?.label ?? "Veri yok", getClickDetail(report.summary.topDevice?.count)],
    ["EN GÜÇLÜ LOKASYON", report.summary.topLocation?.label ?? "Veri yok", getClickDetail(report.summary.topLocation?.count)],
  ];

  secondRow.forEach(([label, value, detail], index) => {
    const cellX = x + (width / 4) * index + 14;
    page.drawText(label, {
      x: cellX,
      y: rowTwoTop - 17,
      size: 7.2,
      font: fonts.bold,
      color: REPORT_COLORS.label,
    });
    drawReferenceText(page, value, {
      x: cellX,
      y: rowTwoTop - 33,
      size: 10.1,
      font: fonts.bold,
      color: REPORT_COLORS.navyText,
      maxWidth: width / 4 - 26,
      maxLines: 1,
    });
    page.drawText(detail, {
      x: cellX,
      y: rowTwoTop - 45,
      size: 7.2,
      font: fonts.regular,
      color: REPORT_COLORS.muted,
    });
  });

  void rowTwoHeight;
}

function drawDailyTrend(page: PDFPage, fonts: PdfFonts, report: LinkReportData) {
  const x = REPORT_PAGE.marginX;
  const y = 145;
  const width = REPORT_PAGE.contentWidth;
  const height = 229;
  const top = y + height;
  const plotX = x + 16;
  const plotY = y + 24;
  const plotWidth = width - 32;
  const plotHeight = 135;
  const days = report.visibleDays.length > 0 ? report.visibleDays : report.performance.days.slice(-report.rangeDays);
  const maxValue = Math.max(1, ...days.map((day) => Math.max(0, day.total)));

  drawRoundedRect(page, {
    x,
    y,
    width,
    height,
    radius: 9,
    color: REPORT_COLORS.card,
    borderColor: REPORT_COLORS.border,
    borderWidth: 0.7,
  });
  page.drawText("Günlük Tıklama Trendi", {
    x: x + 16,
    y: top - 24,
    size: 10.8,
    font: fonts.bold,
    color: REPORT_COLORS.navyText,
  });
  page.drawText(report.summary.currentPeriod.dateRangeLabel, {
    x: x + 16,
    y: top - 36,
    size: 7.2,
    font: fonts.regular,
    color: REPORT_COLORS.muted,
  });

  const legendY = top - 24;
  drawRoundedRect(page, {
    x: x + width - 144,
    y: legendY + 1,
    width: 6,
    height: 6,
    radius: 2,
    color: REPORT_COLORS.green,
  });
  page.drawText("Günlük tıklama", { x: x + width - 134, y: legendY, size: 7, font: fonts.regular, color: REPORT_COLORS.label });
  drawRoundedRect(page, {
    x: x + width - 72,
    y: legendY + 1,
    width: 6,
    height: 6,
    radius: 2,
    color: REPORT_COLORS.navy,
  });
  page.drawText("En yoğun gün", { x: x + width - 62, y: legendY, size: 7, font: fonts.regular, color: REPORT_COLORS.label });

  [0.25, 0.5, 0.75].forEach((ratio) => {
    const lineY = plotY + plotHeight * ratio;
    page.drawLine({ start: { x: plotX, y: lineY }, end: { x: plotX + plotWidth, y: lineY }, thickness: 0.5, color: REPORT_COLORS.grid });
  });
  page.drawLine({ start: { x: plotX, y: plotY }, end: { x: plotX + plotWidth, y: plotY }, thickness: 0.7, color: rgb(0.863, 0.89, 0.933) });

  const gap = days.length > 18 ? 3 : 7;
  const barWidth = Math.max(5, (plotWidth - gap * Math.max(0, days.length - 1)) / Math.max(1, days.length));
  const labelSize = days.length > 18 ? 5.5 : 6.2;
  const peakValue = Math.max(...days.map((day) => Math.max(0, day.total)), 0);

  days.forEach((day, index) => {
    const value = Math.max(0, day.total);
    const barHeight = value > 0 ? Math.max(4, (value / maxValue) * plotHeight) : 2;
    const barX = plotX + index * (barWidth + gap);
    const isPeak = value > 0 && value === peakValue;
    const barColor = isPeak ? REPORT_COLORS.navy : REPORT_COLORS.green;

    drawRoundedRect(page, {
      x: barX,
      y: plotY,
      width: barWidth,
      height: barHeight,
      radius: Math.min(4, barWidth / 2),
      color: barColor,
    });

    if (isPeak) {
      const valueLabel = formatNumber(value);
      const chipWidth = fonts.bold.widthOfTextAtSize(valueLabel, 7.4) + 14;
      drawRoundedRect(page, {
        x: barX + barWidth / 2 - chipWidth / 2,
        y: plotY + barHeight + 5,
        width: chipWidth,
        height: 14,
        radius: 7,
        color: REPORT_COLORS.navy,
      });
      page.drawText(valueLabel, {
        x: barX + barWidth / 2 - fonts.bold.widthOfTextAtSize(valueLabel, 7.4) / 2,
        y: plotY + barHeight + 9,
        size: 7.4,
        font: fonts.bold,
        color: REPORT_COLORS.white,
      });
    }

    const label = day.label.replace(".", "");
    drawRightAlignedText(
      page,
      label,
      barX + barWidth / 2 + fonts.regular.widthOfTextAtSize(label, labelSize) / 2,
      y + 12,
      labelSize,
      fonts.regular,
      rgb(0.55, 0.62, 0.72),
    );
  });
}

function drawDistributionCard(
  page: PDFPage,
  fonts: PdfFonts,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    meta: string;
    rows: ReportDistributionRow[];
  },
) {
  drawRoundedRect(page, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    radius: 9,
    color: REPORT_COLORS.card,
    borderColor: REPORT_COLORS.border,
    borderWidth: 0.7,
  });

  const top = options.y + options.height;
  page.drawText(options.title, {
    x: options.x + 14,
    y: top - 20,
    size: 9.4,
    font: fonts.bold,
    color: REPORT_COLORS.navyText,
  });
  drawRightAlignedText(page, options.meta, options.x + options.width - 14, top - 19, 6.8, fonts.regular, REPORT_COLORS.muted);

  options.rows.forEach((row, index) => {
    const rowY = top - 39 - index * 17.2;
    drawReferenceText(page, row.name, {
      x: options.x + 14,
      y: rowY,
      size: 7.8,
      font: fonts.regular,
      color: REPORT_COLORS.body,
      maxWidth: 86,
      maxLines: 1,
    });
    const trackX = options.x + 106;
    const trackWidth = options.width - 188;
    drawRoundedRect(page, {
      x: trackX,
      y: rowY + 1.5,
      width: trackWidth,
      height: 4.2,
      radius: 2.1,
      color: REPORT_COLORS.progressTrack,
    });
    if (row.widthPercent > 0) {
      drawRoundedRect(page, {
        x: trackX,
        y: rowY + 1.5,
        width: Math.max(2, (trackWidth * row.widthPercent) / 100),
        height: 4.2,
        radius: 2.1,
        color: REPORT_COLORS.green,
      });
    }
    drawRightAlignedText(page, row.valueLabel, options.x + options.width - 44, rowY, 8.3, fonts.bold, REPORT_COLORS.navyText);
    drawRightAlignedText(page, row.percentLabel, options.x + options.width - 14, rowY, 6.8, fonts.regular, rgb(0.58, 0.65, 0.75));
  });
}

function drawDistributionsPage(page: PDFPage, fonts: PdfFonts, report: LinkReportData) {
  const x = REPORT_PAGE.marginX;
  const cardGap = 10;
  const cardWidth = (REPORT_PAGE.contentWidth - cardGap) / 2;
  const channelRows = getChannelDistributionRows(report);
  const deviceRows = getDeviceDistributionRows(report);
  const browserRows = getBrowserOsDistributionRows(report);
  const locationRows = getLocationDistributionRows(report);

  page.drawText("Dağılım Özetleri", {
    x,
    y: 783,
    size: 11.5,
    font: fonts.bold,
    color: REPORT_COLORS.navyText,
  });
  drawRightAlignedText(
    page,
    "Kanal · Cihaz · Sistem · Lokasyon kırılımı",
    x + REPORT_PAGE.contentWidth,
    784,
    7.2,
    fonts.regular,
    REPORT_COLORS.muted,
  );

  drawDistributionCard(page, fonts, {
    x,
    y: 666,
    width: cardWidth,
    height: 106,
    title: "Kanal Özeti",
    meta: `Toplam ${formatNumber(getRowsTotal(channelRows))}`,
    rows: channelRows,
  });
  drawDistributionCard(page, fonts, {
    x: x + cardWidth + cardGap,
    y: 666,
    width: cardWidth,
    height: 106,
    title: "Cihaz Özeti",
    meta: `Toplam ${formatNumber(getRowsTotal(deviceRows))}`,
    rows: deviceRows,
  });
  drawDistributionCard(page, fonts, {
    x,
    y: 568,
    width: cardWidth,
    height: 88,
    title: "İşletim Sistemi / Tarayıcı",
    meta: "İlk 3 kombinasyon",
    rows: browserRows,
  });
  drawDistributionCard(page, fonts, {
    x: x + cardWidth + cardGap,
    y: 568,
    width: cardWidth,
    height: 88,
    title: "Lokasyon Özeti",
    meta: "İlk 3 şehir",
    rows: locationRows,
  });
}

function drawHourlyInsightSections(page: PDFPage, fonts: PdfFonts, assets: PdfAssets, report: LinkReportData) {
  const hourly = getReferenceHourlySummary(report);
  const x = REPORT_PAGE.marginX;
  const width = REPORT_PAGE.contentWidth;

  drawRoundedRect(page, {
    x,
    y: 459,
    width,
    height: 99,
    radius: 9,
    color: REPORT_COLORS.softCard,
    borderColor: REPORT_COLORS.border,
    borderWidth: 0.7,
  });
  page.drawText("Saatlik Yoğunluk Özeti", {
    x: x + 14,
    y: 535,
    size: 9.8,
    font: fonts.bold,
    color: REPORT_COLORS.navyText,
  });
  const hourItems = [
    ["EN YOĞUN SAAT", hourly.peak],
    ["EN DÜŞÜK SAAT", hourly.low],
    ["ORT. SAATLİK TIKLAMA", hourly.average],
  ];
  hourItems.forEach(([label, value], index) => {
    const itemX = x + 14 + index * 170;
    page.drawText(label, {
      x: itemX,
      y: 517,
      size: 7.2,
      font: fonts.bold,
      color: REPORT_COLORS.label,
    });
    page.drawText(value, {
      x: itemX,
      y: 501,
      size: 11.8,
      font: fonts.bold,
      color: REPORT_COLORS.navyText,
    });
  });
  page.drawLine({ start: { x: x + 14, y: 492 }, end: { x: x + width - 14, y: 492 }, thickness: 0.5, color: REPORT_COLORS.border });
  drawReferenceText(page, hourly.insight, {
    x: x + 14,
    y: 476,
    size: 8.2,
    font: fonts.regular,
    color: rgb(0.271, 0.325, 0.42),
    maxWidth: width - 28,
    lineHeight: 11,
    maxLines: 2,
  });

  drawRoundedRect(page, {
    x,
    y: 379,
    width,
    height: 70,
    radius: 9,
    color: REPORT_COLORS.insight,
    borderColor: REPORT_COLORS.insightBorder,
    borderWidth: 0.7,
  });
  drawImageByHeight(page, assets.mark, x + 15, 426.5, 11.25);
  page.drawText("KISA İÇGÖRÜ", {
    x: x + 36.5,
    y: 430,
    size: 7.5,
    font: fonts.bold,
    color: REPORT_COLORS.greenText,
  });
  drawReferenceText(page, report.insightText, {
    x: x + 14,
    y: 407,
    size: 8.7,
    font: fonts.regular,
    color: rgb(0.153, 0.216, 0.31),
    maxWidth: width - 28,
    lineHeight: 12,
    maxLines: 3,
  });
}

export async function buildPdfReport({
  report,
  tables,
  sections,
  reportTypeLabel,
}: {
  report: LinkReportData;
  tables: LinkReportTable[];
  sections: LinkReportPdfSectionKey[];
  reportTypeLabel?: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const [fonts, assets] = await Promise.all([loadPdfFonts(pdfDoc), loadPdfAssets(pdfDoc)]);
  const label = getReportTypeLabel(sections, reportTypeLabel);
  const firstPage = addReferencePage(pdfDoc);
  const secondPage = addReferencePage(pdfDoc);

  void tables;

  drawReferenceHeader(firstPage, fonts, assets, report, label);
  drawHero(firstPage, fonts, report);
  drawKpiSection(firstPage, fonts, report);
  drawPerformanceSummary(firstPage, fonts, report);
  drawDailyTrend(firstPage, fonts, report);
  drawDistributionsPage(secondPage, fonts, report);
  drawHourlyInsightSections(secondPage, fonts, assets, report);

  pdfDoc.getPages().forEach((pdfPage) => drawReferenceFooter(pdfPage, fonts, assets));
  const bytes = await pdfDoc.save();

  return Buffer.from(bytes);
}

export function getDownloadHeaders(filename: string, contentType: string) {
  const safeFilename = filename.replace(/[\r\n"]/g, "");
  const encodedFilename = encodeURIComponent(safeFilename);

  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
    "Cache-Control": "no-store",
  };
}

export function getReportDownloadName(
  report: LinkReportData,
  extension: "pdf" | "xlsx" | "csv" | "zip",
  suffix?: string,
) {
  if (extension === "pdf") {
    const suffixPart = suffix ? `-${suffix}` : "";

    return `trulygo-link-report-${report.fileSlug}-${report.rangeDays}-gun${suffixPart}.${extension}`;
  }

  return buildLinkReportFilename(report, extension, suffix);
}
