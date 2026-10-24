import { validateRequestedSlug } from "@/lib/slugs";

export type SignalSurveyStatus = "draft" | "published" | "closed";

export type SignalSurveyDraftOption = {
  id: string;
  text: string;
};

export type SignalSurveyDraftBranch = {
  id: string;
  triggerOptionId: string;
  questionText: string;
  options: SignalSurveyDraftOption[];
};

export type SignalSurveyDraftQuestion = {
  id: string;
  questionText: string;
  options: SignalSurveyDraftOption[];
  branch: SignalSurveyDraftBranch | null;
};

export type SignalSurveyInput = {
  id: string | null;
  title: string;
  description: string | null;
  slug: string;
  status: SignalSurveyStatus;
  showResultsToVoters: boolean;
  showInLinkVitrine: boolean;
  questions: SignalSurveyDraftQuestion[];
};

export type SignalValidationError =
  | "invalid_payload"
  | "missing_title"
  | "invalid_title"
  | "invalid_description"
  | "invalid_slug"
  | "reserved_slug"
  | "invalid_status"
  | "invalid_question_count"
  | "invalid_question"
  | "invalid_question_id"
  | "invalid_option_count"
  | "invalid_option"
  | "invalid_option_id"
  | "invalid_branch"
  | "invalid_branch_id"
  | "invalid_branch_trigger"
  | "invalid_branch_option_count"
  | "invalid_branch_option";

export type SignalValidationResult =
  | { survey: SignalSurveyInput; error: null }
  | { survey: null; error: SignalValidationError };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const signalStatusLabels: Record<SignalSurveyStatus, string> = {
  draft: "Taslak",
  published: "Yayında",
  closed: "Kapalı",
};

export function isSignalSurveyStatus(value: string): value is SignalSurveyStatus {
  return value === "draft" || value === "published" || value === "closed";
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown) {
  const text = readString(value);
  return text ? text : null;
}

function readBoolean(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function isUuid(value: string | null) {
  return Boolean(value && uuidPattern.test(value));
}

function normalizeOptions(value: unknown, max: number): {
  error: SignalValidationError | null;
  options: SignalSurveyDraftOption[];
} {
  if (!Array.isArray(value) || value.length < 2 || value.length > max) {
    return { error: max === 4 ? "invalid_branch_option_count" : "invalid_option_count", options: [] };
  }

  const options: SignalSurveyDraftOption[] = [];
  const seenIds = new Set<string>();

  for (const rawOption of value) {
    if (!rawOption || typeof rawOption !== "object") {
      return { error: max === 4 ? "invalid_branch_option" : "invalid_option", options: [] };
    }

    const option = rawOption as Record<string, unknown>;
    const id = readString(option.id).toLowerCase();
    const text = readString(option.text);

    if (!isUuid(id) || seenIds.has(id)) {
      return { error: "invalid_option_id", options: [] };
    }

    if (!text || text.length > 120) {
      return { error: max === 4 ? "invalid_branch_option" : "invalid_option", options: [] };
    }

    seenIds.add(id);
    options.push({ id, text });
  }

  return { error: null, options };
}

export function validateSignalSurveyPayload(
  payload: unknown,
  statusOverride?: SignalSurveyStatus,
): SignalValidationResult {
  if (!payload || typeof payload !== "object") {
    return { survey: null, error: "invalid_payload" };
  }

  const record = payload as Record<string, unknown>;
  const id = readNullableString(record.id)?.toLowerCase() ?? null;
  const title = readString(record.title);
  const description = readNullableString(record.description);
  const slugValidation = validateRequestedSlug(readString(record.slug));
  const rawStatus = statusOverride ?? readString(record.status);

  if (id && !isUuid(id)) {
    return { survey: null, error: "invalid_payload" };
  }

  if (!title) {
    return { survey: null, error: "missing_title" };
  }

  if (title.length > 100) {
    return { survey: null, error: "invalid_title" };
  }

  if (description && description.length > 240) {
    return { survey: null, error: "invalid_description" };
  }

  if (slugValidation.error || !slugValidation.slug) {
    return { survey: null, error: slugValidation.error ?? "invalid_slug" };
  }

  if (!isSignalSurveyStatus(rawStatus)) {
    return { survey: null, error: "invalid_status" };
  }

  const rawQuestions = record.questions;

  if (!Array.isArray(rawQuestions) || rawQuestions.length < 1 || rawQuestions.length > 20) {
    return { survey: null, error: "invalid_question_count" };
  }

  const questions: SignalSurveyDraftQuestion[] = [];
  const seenQuestionIds = new Set<string>();

  for (const rawQuestion of rawQuestions) {
    if (!rawQuestion || typeof rawQuestion !== "object") {
      return { survey: null, error: "invalid_question" };
    }

    const question = rawQuestion as Record<string, unknown>;
    const questionId = readString(question.id).toLowerCase();
    const questionText = readString(question.questionText);

    if (!isUuid(questionId) || seenQuestionIds.has(questionId)) {
      return { survey: null, error: "invalid_question_id" };
    }

    if (!questionText || questionText.length > 240) {
      return { survey: null, error: "invalid_question" };
    }

    const optionsResult = normalizeOptions(question.options, 6);

    if (optionsResult.error) {
      return { survey: null, error: optionsResult.error };
    }

    const optionIds = new Set(optionsResult.options.map((option) => option.id));
    const rawBranch = question.branch;
    let branch: SignalSurveyDraftBranch | null = null;

    if (rawBranch !== null && rawBranch !== undefined) {
      if (!rawBranch || typeof rawBranch !== "object") {
        return { survey: null, error: "invalid_branch" };
      }

      const branchRecord = rawBranch as Record<string, unknown>;
      const branchId = readString(branchRecord.id).toLowerCase();
      const triggerOptionId = readString(branchRecord.triggerOptionId).toLowerCase();
      const branchText = readString(branchRecord.questionText);

      if (!isUuid(branchId) || seenQuestionIds.has(branchId) || branchId === questionId) {
        return { survey: null, error: "invalid_branch_id" };
      }

      if (!optionIds.has(triggerOptionId)) {
        return { survey: null, error: "invalid_branch_trigger" };
      }

      if (!branchText || branchText.length > 240) {
        return { survey: null, error: "invalid_branch" };
      }

      const branchOptions = normalizeOptions(branchRecord.options, 4);

      if (branchOptions.error) {
        return { survey: null, error: branchOptions.error };
      }

      branch = {
        id: branchId,
        triggerOptionId,
        questionText: branchText,
        options: branchOptions.options,
      };
      seenQuestionIds.add(branchId);
    }

    questions.push({
      id: questionId,
      questionText,
      options: optionsResult.options,
      branch,
    });
    seenQuestionIds.add(questionId);
  }

  return {
    survey: {
      id,
      title,
      description,
      slug: slugValidation.slug,
      status: rawStatus,
      showResultsToVoters: readBoolean(record.showResultsToVoters),
      showInLinkVitrine: readBoolean(record.showInLinkVitrine),
      questions,
    },
    error: null,
  };
}

export function parseSignalSurveyPayload(
  value: FormDataEntryValue | null,
  statusOverride?: SignalSurveyStatus,
): SignalValidationResult {
  if (typeof value !== "string") {
    return { survey: null, error: "invalid_payload" };
  }

  try {
    return validateSignalSurveyPayload(JSON.parse(value), statusOverride);
  } catch {
    return { survey: null, error: "invalid_payload" };
  }
}
