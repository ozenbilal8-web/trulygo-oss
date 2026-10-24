import { getAuthStatus } from "@/lib/auth/session";
import {
  buildLinkReportData,
  buildLinkReportTables,
  type LinkReportTable,
} from "@/lib/link-report-data";
import {
  buildCsvContent,
  buildCsvZip,
  buildPdfReport,
  buildXlsxReport,
  getDownloadHeaders,
  getReportDownloadName,
} from "@/lib/link-report-files";
import {
  normalizeDataReportType,
  normalizeDataSections,
  normalizePdfReportType,
  normalizePdfSections,
  normalizeReportRangeDays,
  type LinkReportSectionKey,
} from "@/lib/link-report-options";
import { getCurrentUserLinkRequestById } from "@/lib/link-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRouteProps = {
  params: Promise<{ id: string }>;
};

type ExportRequestBody = {
  exportType?: "pdf" | "data";
  format?: "xlsx" | "csv";
  rangeDays?: number | string;
  reportType?: string;
  sections?: unknown;
};

type ExportLogContext = {
  linkRequestId: string;
  exportType: "pdf" | "data";
  format: "pdf" | "xlsx" | "csv";
  rangeDays: number;
  reportType: string;
  sections: string[];
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readBody(request: Request): Promise<ExportRequestBody> {
  try {
    return (await request.json()) as ExportRequestBody;
  } catch {
    return {};
  }
}

function serializeExportError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function getTableLoggers(context: ExportLogContext) {
  return {
    onSectionStart(section: LinkReportSectionKey) {
      console.info("[link-report] processing section", { ...context, section });
    },
    onSectionSuccess(section: LinkReportSectionKey, table: LinkReportTable) {
      console.info("[link-report] section ready", {
        ...context,
        section,
        rows: table.rows.length,
        columns: table.columns.length,
        worksheetName: table.worksheetName,
        csvFileName: table.csvFileName,
      });
    },
    onSectionError(section: LinkReportSectionKey, error: unknown) {
      console.error("[link-report] section failed", {
        ...context,
        section,
        error: serializeExportError(error),
      });
    },
  };
}

export async function POST(request: Request, { params }: ExportRouteProps) {
  const auth = await getAuthStatus();

  if (!auth.isConfigured) {
    return jsonError("Supabase Auth ayarları tamamlanmadan rapor oluşturulamaz.", 503);
  }

  if (!auth.isAuthenticated) {
    return jsonError("Rapor indirmek için tekrar giriş yapın.", 401);
  }

  const [{ id }, body] = await Promise.all([params, readBody(request)]);
  const rangeDays = normalizeReportRangeDays(body.rangeDays);

  try {
    const linkRequest = await getCurrentUserLinkRequestById(id);

    if (!linkRequest) {
      return jsonError("Link bulunamadı veya bu hesaba ait değil.", 404);
    }

    const report = await buildLinkReportData({ request: linkRequest, rangeDays });

    if (body.exportType === "pdf") {
      const reportType = normalizePdfReportType(body.reportType);
      const pdfSections = normalizePdfSections(body.sections, reportType);
      const context: ExportLogContext = {
        linkRequestId: id,
        exportType: "pdf",
        format: "pdf",
        rangeDays,
        reportType,
        sections: [...pdfSections],
      };
      const tableSections: LinkReportSectionKey[] = [
        "summary",
        "daily",
        "channels",
        "devices",
        "locations",
        "hourly",
      ];

      console.info("[link-report] export requested", context);

      const tables = buildLinkReportTables(report, tableSections, getTableLoggers(context));
      const file = await buildPdfReport({
        report,
        tables,
        sections: pdfSections,
        reportTypeLabel: reportType === "detailed" ? "Link Detay Analizi" : "Yönetici Özeti",
      });
      const filename = getReportDownloadName(report, "pdf");

      console.info("[link-report] export response ready", {
        ...context,
        filename,
        contentType: "application/pdf",
      });

      return new Response(new Uint8Array(file), {
        headers: getDownloadHeaders(filename, "application/pdf"),
      });
    }

    const format = body.format === "csv" ? "csv" : "xlsx";
    const reportType = normalizeDataReportType(body.reportType);
    const sections = normalizeDataSections(body.sections, reportType, {
      includeSummary: format !== "csv",
    });
    const context: ExportLogContext = {
      linkRequestId: id,
      exportType: "data",
      format,
      rangeDays,
      reportType,
      sections: [...sections],
    };

    console.info("[link-report] export requested", context);

    const tables = buildLinkReportTables(report, sections, getTableLoggers(context));

    if (format === "csv") {
      if (tables.length === 1) {
        const file = Buffer.from(buildCsvContent(tables[0]), "utf8");
        const filename = getReportDownloadName(report, "csv");

        console.info("[link-report] export response ready", {
          ...context,
          filename,
          contentType: "text/csv; charset=utf-8",
          csvFiles: tables.map((table) => table.csvFileName),
        });

        return new Response(new Uint8Array(file), {
          headers: getDownloadHeaders(filename, "text/csv; charset=utf-8"),
        });
      }

      const file = await buildCsvZip(tables);
      const filename = getReportDownloadName(report, "zip", "csv");

      console.info("[link-report] export response ready", {
        ...context,
        filename,
        contentType: "application/zip",
        csvFiles: tables.map((table) => table.csvFileName),
      });

      return new Response(new Uint8Array(file), {
        headers: getDownloadHeaders(filename, "application/zip"),
      });
    }

    const file = await buildXlsxReport(report, tables);
    const filename = getReportDownloadName(report, "xlsx");

    console.info("[link-report] export response ready", {
      ...context,
      filename,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      worksheets: tables.map((table) => table.worksheetName),
    });

    return new Response(new Uint8Array(file), {
      headers: getDownloadHeaders(
        filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    });
  } catch (error) {
    const exportType = body.exportType === "pdf" ? "pdf" : "data";
    const format = exportType === "pdf" ? "pdf" : body.format === "csv" ? "csv" : "xlsx";

    console.error("[link-report] export failed", {
      linkRequestId: id,
      exportType,
      format,
      rangeDays,
      reportType: body.reportType ?? null,
      sections: Array.isArray(body.sections) ? body.sections : null,
      error: serializeExportError(error),
    });

    return jsonError("Rapor oluşturulamadı.", 500);
  }
}
