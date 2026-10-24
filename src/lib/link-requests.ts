import { getCurrentProfile } from "@/lib/auth/profile";
import { validateRequestedSlug } from "@/lib/slugs";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isSafeHttpUrl } from "@/lib/urls";
import {
  WEB_RISK_THREAT_TYPES,
  type WebRiskStatus,
  type WebRiskThreatType,
} from "@/lib/web-risk";

export type LinkRequestStatus = "pending" | "approved" | "rejected" | "suspended";

export type LinkRequestWebRisk = {
  status: WebRiskStatus | null;
  threats: WebRiskThreatType[];
  checkedAt: string | null;
  autoApprovalBlocked: boolean;
};

export type LinkRequest = {
  id: string;
  userId: string;
  targetUrl: string;
  requestedSlug: string | null;
  campaignName: string | null;
  note: string | null;
  status: LinkRequestStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  analytics: LinkRequestAnalytics;
  webRisk: LinkRequestWebRisk;
};

export type LinkRequestAnalytics = {
  totalClicks: number;
  lastClickedAt: string | null;
  topReferrer: string | null;
};

export type ApprovedLinkRedirect = {
  id: string;
  requestedSlug: string;
  clickedSlug: string;
  targetUrl: string;
  channelLinkId: string | null;
  channelKey: string;
  channelLabel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
};

type LinkRequestRow = {
  id: string;
  user_id: string;
  target_url: string;
  requested_slug: string | null;
  campaign_name: string | null;
  note: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  auto_approval_blocked: boolean | null;
  web_risk_status: string | null;
  web_risk_threats: string[] | null;
  web_risk_checked_at: string | null;
};

type ClickSummaryRow = {
  link_request_id: string;
  total_clicks: number | string | null;
  last_clicked_at: string | null;
  top_referrer: string | null;
};

const linkRequestColumns = [
  "id",
  "user_id",
  "target_url",
  "requested_slug",
  "campaign_name",
  "note",
  "status",
  "admin_note",
  "reviewed_by",
  "reviewed_at",
  "created_at",
  "updated_at",
  "auto_approval_blocked",
  "web_risk_status",
  "web_risk_threats",
  "web_risk_checked_at",
].join(",");

const emptyAnalytics: LinkRequestAnalytics = {
  totalClicks: 0,
  lastClickedAt: null,
  topReferrer: null,
};

export const linkRequestStatusLabels: Record<LinkRequestStatus, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  suspended: "Askıda",
};

export const linkRequestStatusTones: Record<LinkRequestStatus, string> = {
  pending: "border-[#e6c46b]/55 bg-[#fff8e7] text-[#7a5a10]",
  approved: "border-[#80c99a]/55 bg-[#effbf3] text-[#0d6a3a]",
  rejected: "border-[#e47d6b]/50 bg-[#fff0ed] text-[#8d2d1f]",
  suspended: "border-[var(--color-border)] bg-white text-[var(--color-muted)]",
};

function isLinkRequestStatus(status: string): status is LinkRequestStatus {
  return (
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "suspended"
  );
}

const WEB_RISK_STATUS_VALUES: readonly WebRiskStatus[] = [
  "clean",
  "flagged",
  "error",
  "skipped",
];

function isWebRiskStatus(value: string | null): value is WebRiskStatus {
  return (
    value !== null &&
    (WEB_RISK_STATUS_VALUES as readonly string[]).includes(value)
  );
}

function isWebRiskThreatType(value: unknown): value is WebRiskThreatType {
  return (
    typeof value === "string" &&
    (WEB_RISK_THREAT_TYPES as readonly string[]).includes(value)
  );
}

function mapWebRisk(row: LinkRequestRow): LinkRequestWebRisk {
  const status = row.web_risk_status;
  const threats = Array.isArray(row.web_risk_threats)
    ? row.web_risk_threats.filter(isWebRiskThreatType)
    : [];

  return {
    status: isWebRiskStatus(status) ? status : null,
    threats,
    checkedAt: row.web_risk_checked_at,
    autoApprovalBlocked: row.auto_approval_blocked === true,
  };
}

function mapLinkRequest(row: LinkRequestRow): LinkRequest | null {
  if (!isLinkRequestStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    targetUrl: row.target_url,
    requestedSlug: row.requested_slug,
    campaignName: row.campaign_name,
    note: row.note,
    status: row.status,
    adminNote: row.admin_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    analytics: emptyAnalytics,
    webRisk: mapWebRisk(row),
  };
}

function mapLinkRequests(rows: LinkRequestRow[] | null): LinkRequest[] {
  return (rows ?? []).flatMap((row) => {
    const request = mapLinkRequest(row);
    return request ? [request] : [];
  });
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !userId) {
    return null;
  }

  return userId;
}

function parseClickCount(value: number | string | null) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function getClickSummaries(linkRequestIds: string[]) {
  if (linkRequestIds.length === 0) {
    return new Map<string, LinkRequestAnalytics>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_link_request_click_summaries", {
    p_link_request_ids: linkRequestIds,
  });

  if (error) {
    return new Map<string, LinkRequestAnalytics>();
  }

  const rows = (data ?? []) as unknown as ClickSummaryRow[];

  return new Map(
    rows.map((row) => [
      row.link_request_id,
      {
        totalClicks: parseClickCount(row.total_clicks),
        lastClickedAt: row.last_clicked_at,
        topReferrer: row.top_referrer,
      },
    ]),
  );
}

async function withClickSummaries(requests: LinkRequest[]) {
  const summaries = await getClickSummaries(requests.map((request) => request.id));

  return requests.map((request) => ({
    ...request,
    analytics: summaries.get(request.id) ?? emptyAnalytics,
  }));
}

export const USER_LINK_REQUESTS_PAGE_SIZE = 50;

export async function getCurrentUserLinkRequests(
  { limit = USER_LINK_REQUESTS_PAGE_SIZE }: { limit?: number } = {},
): Promise<LinkRequest[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_requests")
    .select(linkRequestColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return [];
  }

  return withClickSummaries(mapLinkRequests(data as unknown as LinkRequestRow[] | null));
}

export async function getCurrentUserLinkRequestById(id: string): Promise<LinkRequest | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_requests")
    .select(linkRequestColumns)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const request = mapLinkRequest(data as unknown as LinkRequestRow);

  if (!request) {
    return null;
  }

  const [requestWithAnalytics] = await withClickSummaries([request]);

  return requestWithAnalytics ?? null;
}

export async function getPendingLinkRequestsForAdmin(): Promise<LinkRequest[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const profile = await getCurrentProfile();

  if (profile?.role !== "admin") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_requests")
    .select(linkRequestColumns)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return withClickSummaries(mapLinkRequests(data as unknown as LinkRequestRow[] | null));
}

export async function getAdminLinkRequests(): Promise<LinkRequest[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const profile = await getCurrentProfile();

  if (profile?.role !== "admin") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_requests")
    .select(linkRequestColumns)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return [];
  }

  return withClickSummaries(mapLinkRequests(data as unknown as LinkRequestRow[] | null));
}

type PublicRedirectRpcRow = {
  link_request_id: string;
  requested_slug: string | null;
  target_url: string;
  clicked_slug: string;
  channel_link_id: string | null;
  channel_key: string;
  channel_label: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export async function getApprovedLinkBySlug(slug: string): Promise<ApprovedLinkRedirect | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const validation = validateRequestedSlug(slug);

  if (validation.error || !validation.slug) {
    return null;
  }

  // resolve_public_link_redirect is a SECURITY DEFINER RPC that returns at most
  // one row with only the columns the public redirect needs. The previous
  // direct SELECT against link_requests / channel_links allowed an authenticated
  // caller to project admin-only columns (admin_note, note, reviewed_by,
  // user_id, ...) of any approved row; the RPC closes that leak at the DB layer.
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("resolve_public_link_redirect", { p_slug: validation.slug })
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as PublicRedirectRpcRow;

  if (!row.requested_slug || !isSafeHttpUrl(row.target_url)) {
    return null;
  }

  return {
    id: row.link_request_id,
    requestedSlug: row.requested_slug,
    clickedSlug: row.clicked_slug,
    targetUrl: row.target_url,
    channelLinkId: row.channel_link_id,
    channelKey: row.channel_key,
    channelLabel: row.channel_label,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
  };
}
