import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/auth/profile";
import { buildPrivacyUpdateEmail } from "@/lib/privacy-update-email-template";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const runtime = "nodejs";
// Resend batch API limit is 100 emails per request and ~100 requests/sec. We allow up to
// 5 minutes so a tenant with up to ~30000 users finishes inside one invocation. Vercel
// returns 400 with "Invalid maxDuration" if it exceeds the deployment's max; reviewers
// can lower this number if their plan caps lower.
export const maxDuration = 300;

const RESEND_BATCH_LIMIT = 100;
const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";

type BatchResult = {
  batchIndex: number;
  recipients: number;
  status: "sent" | "failed";
  error?: string;
};

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? null;
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() ?? null;
}

function getFromAddress() {
  return process.env.RESEND_FROM?.trim() || "";
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function fetchAllUserEmails(serviceRoleUrl: string, serviceRoleKey: string) {
  const admin = createSupabaseClient(serviceRoleUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const collected: string[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`auth.admin.listUsers failed: ${error.message}`);
    }

    for (const user of data.users) {
      if (user.email) {
        collected.push(user.email);
      }
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return Array.from(new Set(collected));
}

async function sendBatch(
  apiKey: string,
  from: string,
  batch: string[],
  batchIndex: number,
): Promise<BatchResult> {
  const payload = batch.map((email) =>
    buildPrivacyUpdateEmail({ from, to: email }),
  );

  try {
    const response = await fetch(RESEND_BATCH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return {
        batchIndex,
        recipients: batch.length,
        status: "failed",
        error: body.slice(0, 240),
      };
    }

    return { batchIndex, recipients: batch.length, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      batchIndex,
      recipients: batch.length,
      status: "failed",
      error: message.slice(0, 240),
    };
  }
}

export async function POST() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const publicConfig = getSupabasePublicConfig();
  const serviceRoleKey = getServiceRoleKey();
  const resendApiKey = getResendApiKey();
  const from = getFromAddress();

  if (!publicConfig || !serviceRoleKey) {
    return NextResponse.json(
      { error: "supabase_service_role_not_configured" },
      { status: 500 },
    );
  }

  if (!resendApiKey || !from || !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return NextResponse.json({ error: "resend_not_configured" }, { status: 500 });
  }

  // Lightweight idempotency / runaway guard. The notify operation is a singleton
  // across the org (the whole user base is emailed), so both buckets key on a
  // constant "global" value rather than the admin id — the goal is to block any
  // re-fire, including across separate admin sessions. The shorter bucket
  // catches accidental double-click retries; the longer bucket caps daily
  // firings. Fail-closed: a transient DB hiccup blocks the send rather than
  // letting a runaway through. Config errors above are checked first so a
  // misdeploy does not burn a rate-limit slot.
  const idempotencyAllowed = await checkRateLimit({
    action: "admin:notify:privacy:idempotent",
    key: "global",
    limit: 1,
    windowSeconds: 180,
    mode: "fail-closed",
  });

  if (!idempotencyAllowed) {
    return NextResponse.json({ error: "duplicate_request" }, { status: 429 });
  }

  const dailyAllowed = await checkRateLimit({
    action: "admin:notify:privacy:daily",
    key: "global",
    limit: 3,
    windowSeconds: 86400,
    mode: "fail-closed",
  });

  if (!dailyAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let emails: string[];
  try {
    emails = await fetchAllUserEmails(publicConfig.url, serviceRoleKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: "fetch_users_failed", message }, { status: 500 });
  }

  const batches = chunk(emails, RESEND_BATCH_LIMIT);
  const results = await Promise.all(
    batches.map((batch, index) => sendBatch(resendApiKey, from, batch, index)),
  );

  const sent = results
    .filter((r) => r.status === "sent")
    .reduce((acc, r) => acc + r.recipients, 0);
  const failed = results
    .filter((r) => r.status === "failed")
    .reduce((acc, r) => acc + r.recipients, 0);

  return NextResponse.json({
    total: emails.length,
    sent,
    failed,
    batches: results,
  });
}
