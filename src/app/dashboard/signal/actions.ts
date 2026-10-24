"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSignalCurrentUserId } from "@/lib/signal-surveys";
import {
  isSignalSurveyStatus,
  parseSignalSurveyPayload,
  type SignalSurveyInput,
  type SignalSurveyStatus,
} from "@/lib/signal-validation";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ExistingSurveyRow = {
  id: string;
  slug: string;
  published_at: string | null;
  status: string;
};

type SignalSurveyPayload = {
  id: string;
  user_id: string;
  link_vitrine_id: string | null;
  title: string;
  description: string | null;
  slug: string;
  status: SignalSurveyStatus;
  show_results_to_voters: boolean;
  show_in_link_vitrine: boolean;
  published_at: string | null;
  closed_at: string | null;
};

type ExistingQuestionRow = {
  id: string;
};

type ExistingOptionRow = {
  id: string;
};

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getEditorPath(surveyId: string | null, error?: string, message?: string) {
  const path = surveyId ? `/dashboard/signal/${surveyId}` : "/dashboard/signal/new";
  const params = new URLSearchParams();

  if (error) {
    params.set("error", error);
  }

  if (message) {
    params.set("message", message);
  }

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function uniqueIds(values: string[]) {
  return [...new Set(values)];
}

function getSubmittedQuestionIds(survey: SignalSurveyInput) {
  return uniqueIds(
    survey.questions.flatMap((question) =>
      question.branch ? [question.id, question.branch.id] : [question.id],
    ),
  );
}

function getSubmittedOptionIds(survey: SignalSurveyInput) {
  return uniqueIds(
    survey.questions.flatMap((question) => [
      ...question.options.map((option) => option.id),
      ...(question.branch?.options.map((option) => option.id) ?? []),
    ]),
  );
}

async function getCurrentLinkVitrine(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<{ handle: string | null; id: string | null }> {
  const { data, error } = await supabase
    .from("link_vitrines")
    .select("id,handle")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { handle: null, id: null };
  }

  const row = data as { handle: string | null; id: string | null };
  return { handle: row.handle, id: row.id };
}

async function persistSurveyStructure({
  survey,
  surveyId,
  supabase,
}: {
  survey: SignalSurveyInput;
  surveyId: string;
  supabase: SupabaseServerClient;
}) {
  const submittedQuestionIds = getSubmittedQuestionIds(survey);
  const submittedOptionIds = getSubmittedOptionIds(survey);

  const { data: existingQuestionData, error: existingQuestionError } = await supabase
    .from("signal_questions")
    .select("id")
    .eq("survey_id", surveyId);

  if (existingQuestionError) {
    return "save_failed" as const;
  }

  const existingQuestionIds = ((existingQuestionData ?? []) as ExistingQuestionRow[]).map(
    (question) => question.id,
  );

  if (existingQuestionIds.length > 0) {
    const { data: existingOptionData, error: existingOptionError } = await supabase
      .from("signal_options")
      .select("id")
      .in("question_id", existingQuestionIds);

    if (existingOptionError) {
      return "save_failed" as const;
    }

    const existingOptionIds = ((existingOptionData ?? []) as ExistingOptionRow[]).map(
      (option) => option.id,
    );
    const optionIdsToDelete = existingOptionIds.filter((id) => !submittedOptionIds.includes(id));
    const questionIdsToDelete = existingQuestionIds.filter((id) => !submittedQuestionIds.includes(id));

    if (optionIdsToDelete.length > 0) {
      const { error } = await supabase.from("signal_options").delete().in("id", optionIdsToDelete);

      if (error) {
        return "save_failed" as const;
      }
    }

    if (questionIdsToDelete.length > 0) {
      const { error } = await supabase
        .from("signal_questions")
        .delete()
        .in("id", questionIdsToDelete);

      if (error) {
        return "save_failed" as const;
      }
    }
  }

  const mainQuestionRows = survey.questions.map((question, index) => ({
    id: question.id,
    survey_id: surveyId,
    question_text: question.questionText,
    position: index + 1,
    question_type: "main",
    parent_question_id: null,
    parent_option_id: null,
  }));

  const mainOptionRows = survey.questions.flatMap((question) =>
    question.options.map((option, index) => ({
      id: option.id,
      question_id: question.id,
      option_text: option.text,
      position: index + 1,
    })),
  );

  const branchQuestionRows = survey.questions.flatMap((question, index) =>
    question.branch
      ? [
          {
            id: question.branch.id,
            survey_id: surveyId,
            question_text: question.branch.questionText,
            position: index + 1,
            question_type: "branch",
            parent_question_id: question.id,
            parent_option_id: question.branch.triggerOptionId,
          },
        ]
      : [],
  );

  const branchOptionRows = survey.questions.flatMap((question) =>
    question.branch
      ? question.branch.options.map((option, index) => ({
          id: option.id,
          question_id: question.branch?.id,
          option_text: option.text,
          position: index + 1,
        }))
      : [],
  );

  if (mainQuestionRows.length > 0) {
    const { error } = await supabase
      .from("signal_questions")
      .upsert(mainQuestionRows, { onConflict: "id" });

    if (error) {
      return "save_failed" as const;
    }
  }

  if (mainOptionRows.length > 0) {
    const { error } = await supabase
      .from("signal_options")
      .upsert(mainOptionRows, { onConflict: "id" });

    if (error) {
      return "save_failed" as const;
    }
  }

  if (branchQuestionRows.length > 0) {
    const { error } = await supabase
      .from("signal_questions")
      .upsert(branchQuestionRows, { onConflict: "id" });

    if (error) {
      return "save_failed" as const;
    }
  }

  if (branchOptionRows.length > 0) {
    const { error } = await supabase
      .from("signal_options")
      .upsert(branchOptionRows, { onConflict: "id" });

    if (error) {
      return "save_failed" as const;
    }
  }

  return null;
}

function getStatusTimestamps({
  existing,
  status,
}: {
  existing: ExistingSurveyRow | null;
  status: SignalSurveyStatus;
}) {
  const now = new Date().toISOString();

  if (status === "published") {
    return {
      published_at: existing?.published_at ?? now,
      closed_at: null,
    };
  }

  if (status === "closed") {
    return {
      published_at: existing?.published_at ?? null,
      closed_at: now,
    };
  }

  return {
    published_at: existing?.published_at ?? null,
    closed_at: null,
  };
}

async function getExistingSurvey({
  surveyId,
  supabase,
  userId,
}: {
  surveyId: string | null;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  if (!surveyId) {
    return null;
  }

  const { data, error } = await supabase
    .from("signal_surveys")
    .select("id,slug,published_at,status")
    .eq("id", surveyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return data as ExistingSurveyRow;
}

export async function saveSignalSurveyAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect(getEditorPath(null, "auth_not_configured"));
  }

  const userId = await getSignalCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const validation = parseSignalSurveyPayload(formData.get("survey_json"));

  if (validation.error || !validation.survey) {
    redirect(getEditorPath(null, validation.error ?? "invalid_payload"));
  }

  const survey = validation.survey;

  // Light per-user rate limit. Auth-gated so abuse is low-risk; fail-open keeps a
  // limiter hiccup from blocking a normal save. 20 saves / 2 min comfortably
  // covers rapid manual edits while capping scripted churn.
  const withinSaveLimit = await checkRateLimit({
    action: "signal_save",
    key: userId,
    limit: 20,
    windowSeconds: 120,
    mode: "fail-open",
  });

  if (!withinSaveLimit) {
    redirect(getEditorPath(survey.id, "rate_limited"));
  }

  const surveyId = survey.id ?? crypto.randomUUID();
  const supabase = await createClient();
  const existing = await getExistingSurvey({ surveyId: survey.id, supabase, userId });

  if (existing === undefined) {
    redirect(getEditorPath(null, "not_found"));
  }

  const vitrine = await getCurrentLinkVitrine(supabase, userId);
  const timestamps = getStatusTimestamps({ existing, status: survey.status });
  const payload: SignalSurveyPayload = {
    id: surveyId,
    user_id: userId,
    link_vitrine_id: vitrine.id,
    title: survey.title,
    description: survey.description,
    slug: survey.slug,
    status: survey.status,
    show_results_to_voters: survey.showResultsToVoters,
    show_in_link_vitrine: survey.showInLinkVitrine,
    ...timestamps,
  };

  const saveResult = existing
    ? await supabase
        .from("signal_surveys")
        .update(payload)
        .eq("id", surveyId)
        .eq("user_id", userId)
        .select("id")
        .single()
    : await supabase.from("signal_surveys").insert(payload).select("id").single();

  if (saveResult.error || !saveResult.data) {
    if (saveResult.error?.code === "23505") {
      redirect(getEditorPath(survey.id, "slug_unavailable"));
    }

    redirect(getEditorPath(survey.id, "save_failed"));
  }

  const structureError = await persistSurveyStructure({ survey, surveyId, supabase });

  if (structureError) {
    redirect(getEditorPath(surveyId, structureError));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/signal");
  revalidatePath(`/dashboard/signal/${surveyId}`);
  revalidatePath(`/dashboard/signal/${surveyId}/results`);
  revalidatePath(`/signal/${survey.slug}`);
  revalidatePath("/sitemap.xml");

  if (existing?.slug && existing.slug !== survey.slug) {
    revalidatePath(`/signal/${existing.slug}`);
  }

  if (vitrine.handle) {
    revalidatePath(`/v/${vitrine.handle}`);
  }

  if (survey.status === "published") {
    redirect(`/dashboard/signal/${surveyId}/results?message=published`);
  }

  redirect(getEditorPath(surveyId, undefined, existing ? "updated" : "saved"));
}

export async function updateSignalSurveyStatusAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect("/dashboard/signal?error=auth_not_configured");
  }

  const userId = await getSignalCurrentUserId();
  const surveyId = getField(formData, "survey_id");
  const status = getField(formData, "status");

  if (!userId) {
    redirect("/login");
  }

  if (!surveyId || !isSignalSurveyStatus(status)) {
    redirect("/dashboard/signal?error=invalid_status");
  }

  const supabase = await createClient();
  const existing = await getExistingSurvey({ surveyId, supabase, userId });

  if (!existing) {
    redirect("/dashboard/signal?error=not_found");
  }

  const timestamps = getStatusTimestamps({ existing, status });
  const { error } = await supabase
    .from("signal_surveys")
    .update({ status, ...timestamps })
    .eq("id", surveyId)
    .eq("user_id", userId);

  if (error) {
    redirect(`/dashboard/signal/${surveyId}/results?error=save_failed`);
  }

  const vitrine = await getCurrentLinkVitrine(supabase, userId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/signal");
  revalidatePath(`/dashboard/signal/${surveyId}`);
  revalidatePath(`/dashboard/signal/${surveyId}/results`);
  revalidatePath(`/signal/${existing.slug}`);

  if (vitrine.handle) {
    revalidatePath(`/v/${vitrine.handle}`);
  }

  const message = status === "closed" ? "closed" : "reopened";
  redirect(`/dashboard/signal/${surveyId}/results?message=${message}`);
}

export async function updateSignalSurveyVisibilityAction(formData: FormData) {
  const userId = await getSignalCurrentUserId();
  const surveyId = getField(formData, "survey_id");
  const nextValue = getField(formData, "show_results_to_voters") === "true";

  if (!userId) {
    redirect("/login");
  }

  if (!surveyId) {
    redirect("/dashboard/signal?error=not_found");
  }

  const supabase = await createClient();
  const existing = await getExistingSurvey({ surveyId, supabase, userId });

  if (!existing) {
    redirect("/dashboard/signal?error=not_found");
  }

  const { error } = await supabase
    .from("signal_surveys")
    .update({ show_results_to_voters: nextValue })
    .eq("id", surveyId)
    .eq("user_id", userId);

  if (error) {
    redirect(`/dashboard/signal/${surveyId}/results?error=save_failed`);
  }

  revalidatePath(`/dashboard/signal/${surveyId}/results`);
  revalidatePath(`/signal/${existing.slug}`);
  redirect(`/dashboard/signal/${surveyId}/results?message=visibility_updated`);
}

export async function deleteSignalSurveyAction(formData: FormData) {
  if (!getSupabasePublicConfig()) {
    redirect("/dashboard/signal?error=auth_not_configured");
  }

  const userId = await getSignalCurrentUserId();
  const surveyId = getField(formData, "survey_id");

  if (!userId) {
    redirect("/login");
  }

  if (!surveyId) {
    redirect("/dashboard/signal?error=not_found");
  }

  const supabase = await createClient();
  const existing = await getExistingSurvey({ surveyId, supabase, userId });

  if (!existing) {
    redirect("/dashboard/signal?error=not_found");
  }

  const vitrine = await getCurrentLinkVitrine(supabase, userId);
  const { error } = await supabase
    .from("signal_surveys")
    .delete()
    .eq("id", surveyId)
    .eq("user_id", userId);

  if (error) {
    redirect(`/dashboard/signal/${surveyId}/results?error=delete_failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/signal");
  revalidatePath(`/dashboard/signal/${surveyId}`);
  revalidatePath(`/dashboard/signal/${surveyId}/results`);
  revalidatePath(`/signal/${existing.slug}`);
  revalidatePath("/sitemap.xml");

  if (vitrine.handle) {
    revalidatePath(`/v/${vitrine.handle}`);
  }

  redirect("/dashboard/signal");
}
