"use server";

import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { CLICK_VISITOR_COOKIE_NAME } from "@/lib/click-visitor-cookie";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSignalResultsForSurvey } from "@/lib/signal-results";
import { getPublicSignalSurveyById } from "@/lib/signal-surveys";
import { getSignalVoteCookieName } from "@/lib/signal-vote-cookie";
import { buildSignalVoterTokenHash } from "@/lib/signal-voter-token";
import { createClient } from "@/lib/supabase/server";

type VotePayload = {
  answers: Record<string, string>;
  surveyId: string;
};

const VOTE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Statuses the submit_signal_vote RPC is documented to return. Anything outside
// this set means the RPC and this action have drifted (e.g. a broken/old RPC),
// which is worth a single server warning. The expected validation outcomes
// (empty/invalid_answer/not_*) are included so normal failures never spam logs.
const KNOWN_SIGNAL_VOTE_STATUSES = new Set([
  "ok",
  "already_voted",
  "not_found",
  "not_published",
  "empty",
  "invalid_answer",
]);

function buildVoteCookieOptions() {
  return {
    httpOnly: true,
    maxAge: VOTE_COOKIE_MAX_AGE_SECONDS,
    path: "/signal",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function isVotePayload(value: unknown): value is VotePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.surveyId === "string" &&
    Boolean(record.answers) &&
    typeof record.answers === "object" &&
    !Array.isArray(record.answers)
  );
}

export async function submitSignalVoteAction(input: unknown) {
  if (!isVotePayload(input)) {
    return { error: "invalid_payload" as const, ok: false };
  }

  const survey = await getPublicSignalSurveyById(input.surveyId);

  if (!survey || survey.status !== "published") {
    return { error: "not_published" as const, ok: false };
  }

  const cookieStore = await cookies();
  const cookieName = getSignalVoteCookieName(survey.id);

  // Fast path: this browser already voted on this survey. Return before touching
  // the rate limiter so legitimate re-viewers are never throttled.
  if (cookieStore.get(cookieName)?.value) {
    return {
      alreadyVoted: true,
      error: null,
      ok: true,
      results: survey.showResultsToVoters ? await getSignalResultsForSurvey(survey) : null,
      showResults: survey.showResultsToVoters,
    };
  }

  // Anti-flood rate limit on real vote attempts. These are intentionally generous
  // caps, not one-vote-per-person enforcement (the cookie + the DB unique index on
  // (survey_id, voter_token_hash) do that). Many legitimate voters share a public
  // IP via carrier-grade NAT, so a tight per-IP cap would block real people during
  // a popular poll. fail-open: a limiter/infra hiccup must not block genuine voters.
  const ip = await getClientIp();
  const [withinSurveyLimit, withinIpLimit] = await Promise.all([
    checkRateLimit({
      action: "signal_vote",
      key: `${ip}:${survey.id}`,
      limit: 15,
      windowSeconds: 60,
      mode: "fail-open",
    }),
    checkRateLimit({
      action: "signal_vote_ip",
      key: ip,
      limit: 40,
      windowSeconds: 300,
      mode: "fail-open",
    }),
  ]);

  if (!withinSurveyLimit || !withinIpLimit) {
    return { error: "rate_limited" as const, ok: false };
  }

  // Validate answers in the app layer for precise per-question messaging, and
  // build the [{ question_id, option_id }] payload the atomic RPC re-validates.
  const normalizedAnswers = new Map<string, string>();

  for (const [questionId, optionId] of Object.entries(input.answers)) {
    if (typeof questionId === "string" && typeof optionId === "string") {
      normalizedAnswers.set(questionId, optionId);
    }
  }

  const answerRows: { option_id: string; question_id: string }[] = [];

  for (const question of survey.questions) {
    const optionId = normalizedAnswers.get(question.id);

    if (!optionId || !question.options.some((option) => option.id === optionId)) {
      return { error: "missing_answer" as const, ok: false };
    }

    answerRows.push({ question_id: question.id, option_id: optionId });

    if (question.branch && optionId === question.branch.triggerOptionId) {
      const branchOptionId = normalizedAnswers.get(question.branch.id);

      if (
        !branchOptionId ||
        !question.branch.options.some((option) => option.id === branchOptionId)
      ) {
        return { error: "missing_branch_answer" as const, ok: false };
      }

      answerRows.push({ question_id: question.branch.id, option_id: branchOptionId });
    }
  }

  // Survey-scoped deterministic hash for server-side soft dedup. Prefers the
  // tg_vid cookie; null when there is no stable material or no secret, in which
  // case this voter relies on the cookie + rate limit only.
  const requestHeaders = await headers();
  const voterTokenHash = buildSignalVoterTokenHash({
    surveyId: survey.id,
    visitorCookieId: cookieStore.get(CLICK_VISITOR_COOKIE_NAME)?.value ?? null,
    ipAddress: ip === "unknown" ? null : ip,
    userAgent: requestHeaders.get("user-agent"),
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_signal_vote", {
    p_answers: answerRows,
    p_survey_id: survey.id,
    p_voter_token_hash: voterTokenHash,
  });

  if (error) {
    // Log the RPC's own SQL fault (code + message only — no voter data) so a
    // broken RPC is diagnosable in prod logs while the voter still sees a
    // generic friendly message. This is what would have surfaced the original
    // "function pg_catalog.coalesce does not exist" failure immediately.
    console.warn("[signal-vote] submit_signal_vote rpc error", {
      code: error.code,
      message: error.message,
    });
    return { error: "save_failed" as const, ok: false };
  }

  const status = typeof data === "string" ? data : "save_failed";

  if (!KNOWN_SIGNAL_VOTE_STATUSES.has(status)) {
    console.warn("[signal-vote] unexpected submit_signal_vote status", { status });
  }

  if (status !== "ok" && status !== "already_voted") {
    if (status === "not_published" || status === "not_found") {
      return { error: "not_published" as const, ok: false };
    }

    return { error: "save_failed" as const, ok: false };
  }

  // 'ok' and 'already_voted' are both success from the voter's perspective: mark
  // the browser so future loads hit the fast path, then show results / thanks.
  cookieStore.set(cookieName, randomUUID(), buildVoteCookieOptions());

  return {
    alreadyVoted: status === "already_voted",
    error: null,
    ok: true,
    results: survey.showResultsToVoters ? await getSignalResultsForSurvey(survey) : null,
    showResults: survey.showResultsToVoters,
  };
}
