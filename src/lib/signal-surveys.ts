import { cache } from "react";
import { validateRequestedSlug } from "@/lib/slugs";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  SignalSurveyDraftBranch,
  SignalSurveyDraftOption,
  SignalSurveyDraftQuestion,
  SignalSurveyInput,
  SignalSurveyStatus,
} from "@/lib/signal-validation";

export type SignalSurveyOption = SignalSurveyDraftOption & {
  position: number;
};

export type SignalSurveyBranchQuestion = Omit<SignalSurveyDraftBranch, "options"> & {
  options: SignalSurveyOption[];
  position: number;
};

export type SignalSurveyQuestion = Omit<SignalSurveyDraftQuestion, "branch" | "options"> & {
  position: number;
  options: SignalSurveyOption[];
  branch: SignalSurveyBranchQuestion | null;
};

export type SignalSurvey = Omit<SignalSurveyInput, "id" | "questions"> & {
  id: string;
  userId: string;
  linkVitrineId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  questions: SignalSurveyQuestion[];
};

export type SignalSurveyListItem = Omit<SignalSurvey, "questions"> & {
  branchQuestionCount: number;
  questionCount: number;
  totalAnswers: number;
  totalParticipants: number;
};

export type SignalDashboardSummary = {
  activeSurveyCount: number;
  totalParticipants: number;
  totalSurveyCount: number;
};

export type SignalVitrineSurvey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  totalParticipants: number;
};

type SignalSurveyRow = {
  id: string;
  user_id?: string | null;
  link_vitrine_id: string | null;
  title: string;
  description: string | null;
  slug: string;
  status: string;
  show_results_to_voters: boolean;
  show_in_link_vitrine: boolean;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  closed_at: string | null;
};

type SignalQuestionRow = {
  id: string;
  survey_id: string;
  question_text: string;
  position: number | null;
  question_type: string;
  parent_question_id: string | null;
  parent_option_id: string | null;
  created_at: string | null;
};

type SignalOptionRow = {
  id: string;
  question_id: string;
  option_text: string;
  position: number | null;
  created_at: string | null;
};

type SignalResponseCountRow = {
  survey_id: string;
  completed_at: string | null;
};

type SignalAnswerCountRow = {
  survey_id: string;
};

const surveyColumns = [
  "id",
  "user_id",
  "link_vitrine_id",
  "title",
  "description",
  "slug",
  "status",
  "show_results_to_voters",
  "show_in_link_vitrine",
  "created_at",
  "updated_at",
  "published_at",
  "closed_at",
].join(",");

const publicSurveyColumns = [
  "id",
  "link_vitrine_id",
  "title",
  "description",
  "slug",
  "status",
  "show_results_to_voters",
  "show_in_link_vitrine",
  "created_at",
  "updated_at",
  "published_at",
  "closed_at",
].join(",");

function isSignalStatus(value: string): value is SignalSurveyStatus {
  return value === "draft" || value === "published" || value === "closed";
}

function mapSurveyBase(row: SignalSurveyRow): Omit<SignalSurvey, "questions"> | null {
  if (!isSignalStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id ?? "",
    linkVitrineId: row.link_vitrine_id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    status: row.status,
    showResultsToVoters: row.show_results_to_voters,
    showInLinkVitrine: row.show_in_link_vitrine,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
  };
}

function mapOptions(rows: SignalOptionRow[], questionId: string): SignalSurveyOption[] {
  return rows
    .filter((row) => row.question_id === questionId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((row, index) => ({
      id: row.id,
      text: row.option_text,
      position: row.position ?? index + 1,
    }));
}

function mapSurvey(
  surveyRow: SignalSurveyRow,
  questionRows: SignalQuestionRow[],
  optionRows: SignalOptionRow[],
): SignalSurvey | null {
  const base = mapSurveyBase(surveyRow);

  if (!base) {
    return null;
  }

  const branchRowsByParent = new Map<string, SignalQuestionRow>();

  for (const row of questionRows) {
    if (row.question_type === "branch" && row.parent_question_id) {
      branchRowsByParent.set(row.parent_question_id, row);
    }
  }

  const questions = questionRows
    .filter((row) => row.question_type === "main")
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((row, index): SignalSurveyQuestion => {
      const branchRow = branchRowsByParent.get(row.id);
      const branch =
        branchRow && branchRow.parent_option_id
          ? {
              id: branchRow.id,
              triggerOptionId: branchRow.parent_option_id,
              questionText: branchRow.question_text,
              position: branchRow.position ?? index + 1,
              options: mapOptions(optionRows, branchRow.id),
            }
          : null;

      return {
        id: row.id,
        questionText: row.question_text,
        position: row.position ?? index + 1,
        options: mapOptions(optionRows, row.id),
        branch,
      };
    });

  return { ...base, questions };
}

async function getCurrentUserId() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !userId) {
    return null;
  }

  return userId;
}

async function fetchQuestionsForSurvey(surveyId: string) {
  const supabase = await createClient();
  const { data: questionData, error: questionError } = await supabase
    .from("signal_questions")
    .select("id,survey_id,question_text,position,question_type,parent_question_id,parent_option_id,created_at")
    .eq("survey_id", surveyId)
    .order("position", { ascending: true });

  if (questionError || !questionData) {
    return { questionRows: [], optionRows: [] };
  }

  const questionRows = questionData as unknown as SignalQuestionRow[];
  const questionIds = questionRows.map((question) => question.id);

  if (questionIds.length === 0) {
    return { questionRows, optionRows: [] };
  }

  const { data: optionData, error: optionError } = await supabase
    .from("signal_options")
    .select("id,question_id,option_text,position,created_at")
    .in("question_id", questionIds)
    .order("position", { ascending: true });

  return {
    questionRows,
    optionRows: optionError || !optionData ? [] : (optionData as unknown as SignalOptionRow[]),
  };
}

async function getCountsBySurveyId(surveyIds: string[]) {
  const participantCounts = new Map<string, number>();
  const answerCounts = new Map<string, number>();

  if (surveyIds.length === 0) {
    return { answerCounts, participantCounts };
  }

  const supabase = await createClient();
  const { data: responseData } = await supabase
    .from("signal_responses")
    .select("survey_id,completed_at")
    .in("survey_id", surveyIds);
  const { data: answerData } = await supabase
    .from("signal_answers")
    .select("survey_id")
    .in("survey_id", surveyIds);

  for (const response of (responseData ?? []) as unknown as SignalResponseCountRow[]) {
    if (response.completed_at) {
      participantCounts.set(response.survey_id, (participantCounts.get(response.survey_id) ?? 0) + 1);
    }
  }

  for (const answer of (answerData ?? []) as unknown as SignalAnswerCountRow[]) {
    answerCounts.set(answer.survey_id, (answerCounts.get(answer.survey_id) ?? 0) + 1);
  }

  return { answerCounts, participantCounts };
}

export function createSignalSurveyDraft({
  defaultSlug,
}: {
  defaultSlug: string;
}): SignalSurveyInput {
  const questionId = crypto.randomUUID();

  return {
    id: null,
    title: "",
    description: "",
    slug: defaultSlug,
    status: "draft",
    showResultsToVoters: false,
    showInLinkVitrine: false,
    questions: [
      {
        id: questionId,
        questionText: "",
        options: [
          { id: crypto.randomUUID(), text: "" },
          { id: crypto.randomUUID(), text: "" },
        ],
        branch: null,
      },
    ],
  };
}

export async function getSignalCurrentUserId() {
  return getCurrentUserId();
}

export const getCurrentUserSignalSurveys = cache(
  async ({ limit = 50 }: { limit?: number } = {}): Promise<SignalSurveyListItem[]> => {
    const userId = await getCurrentUserId();

    if (!userId) {
      return [];
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("signal_surveys")
      .select(surveyColumns)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));

    if (error || !data) {
      return [];
    }

    const surveyBases = (data as unknown as SignalSurveyRow[]).flatMap((row) => {
      const survey = mapSurveyBase(row);
      return survey ? [survey] : [];
    });
    const surveyIds = surveyBases.map((survey) => survey.id);
    const { answerCounts, participantCounts } = await getCountsBySurveyId(surveyIds);

    const questionCounts = new Map<string, { branches: number; main: number }>();

    if (surveyIds.length > 0) {
      const { data: questionData } = await supabase
        .from("signal_questions")
        .select("survey_id,question_type")
        .in("survey_id", surveyIds);

      for (const row of (questionData ?? []) as unknown as Pick<SignalQuestionRow, "survey_id" | "question_type">[]) {
        const current = questionCounts.get(row.survey_id) ?? { branches: 0, main: 0 };

        if (row.question_type === "branch") {
          current.branches += 1;
        } else if (row.question_type === "main") {
          current.main += 1;
        }

        questionCounts.set(row.survey_id, current);
      }
    }

    return surveyBases.map((survey) => {
      const counts = questionCounts.get(survey.id) ?? { branches: 0, main: 0 };

      return {
        ...survey,
        branchQuestionCount: counts.branches,
        questionCount: counts.main,
        totalAnswers: answerCounts.get(survey.id) ?? 0,
        totalParticipants: participantCounts.get(survey.id) ?? 0,
      };
    });
  },
);

export const getCurrentUserSignalDashboardSummary = cache(
  async (): Promise<SignalDashboardSummary> => {
    const surveys = await getCurrentUserSignalSurveys({ limit: 100 });

    return {
      activeSurveyCount: surveys.filter((survey) => survey.status === "published").length,
      totalParticipants: surveys.reduce((sum, survey) => sum + survey.totalParticipants, 0),
      totalSurveyCount: surveys.length,
    };
  },
);

export const getCurrentUserSignalSurveyById = cache(
  async (id: string): Promise<SignalSurvey | null> => {
    const userId = await getCurrentUserId();

    if (!userId) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("signal_surveys")
      .select(surveyColumns)
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const { questionRows, optionRows } = await fetchQuestionsForSurvey(id);
    return mapSurvey(data as unknown as SignalSurveyRow, questionRows, optionRows);
  },
);

export const getPublicSignalSurveyBySlug = cache(
  async (slug: string): Promise<SignalSurvey | null> => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase public environment variables are not configured.");
    }

    const validation = validateRequestedSlug(slug);

    if (validation.error || !validation.slug) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("signal_surveys")
      .select(publicSurveyColumns)
      .eq("slug", validation.slug)
      .in("status", ["published", "closed"])
      .maybeSingle();

    if (error) {
      throw new Error("Public Signal survey query failed.", { cause: error });
    }

    if (!data) {
      return null;
    }

    const row = data as unknown as SignalSurveyRow;
    const { questionRows, optionRows } =
      row.status === "published"
        ? await fetchQuestionsForSurvey(row.id)
        : { questionRows: [], optionRows: [] };

    return mapSurvey(row, questionRows, optionRows);
  },
);

export const getPublicSignalSurveyById = cache(
  async (id: string): Promise<SignalSurvey | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("signal_surveys")
      .select(publicSurveyColumns)
      .eq("id", id)
      .in("status", ["published", "closed"])
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as unknown as SignalSurveyRow;
    const { questionRows, optionRows } =
      row.status === "published"
        ? await fetchQuestionsForSurvey(row.id)
        : { questionRows: [], optionRows: [] };

    return mapSurvey(row, questionRows, optionRows);
  },
);

export async function getPublishedSignalSurveysForVitrine(
  vitrineId: string | null,
  limit = 3,
): Promise<SignalVitrineSurvey[]> {
  if (!vitrineId || !isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("signal_surveys")
      .select("id,title,description,slug")
      .eq("link_vitrine_id", vitrineId)
      .eq("status", "published")
      .eq("show_in_link_vitrine", true)
      .order("published_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 6));

    if (error || !data) {
      return [];
    }

    const rows = data as unknown as Pick<SignalSurveyRow, "id" | "title" | "description" | "slug">[];
    const { participantCounts } = await getCountsBySurveyId(rows.map((row) => row.id));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      totalParticipants: participantCounts.get(row.id) ?? 0,
    }));
  } catch {
    return [];
  }
}
