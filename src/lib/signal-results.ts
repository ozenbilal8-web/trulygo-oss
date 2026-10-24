import { createClient } from "@/lib/supabase/server";
import type { SignalSurvey, SignalSurveyOption, SignalSurveyQuestion } from "@/lib/signal-surveys";

export type SignalOptionResult = {
  optionId: string;
  optionText: string;
  percentage: number;
  position: number;
  votes: number;
};

export type SignalQuestionResult = {
  branch: SignalQuestionResult | null;
  eligibleResponses: number;
  options: SignalOptionResult[];
  position: number;
  questionId: string;
  questionText: string;
  totalAnswers: number;
  triggerOptionText: string | null;
};

export type SignalResults = {
  completionRate: number;
  participantCount: number;
  questions: SignalQuestionResult[];
  totalAnswers: number;
};

type SignalResponseRow = {
  id: string;
  completed_at: string | null;
};

type SignalAnswerRow = {
  response_id: string;
  question_id: string;
  option_id: string;
};

function getPercentage(votes: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((votes / total) * 100);
}

function buildOptionResults(options: SignalSurveyOption[], answerRows: SignalAnswerRow[]) {
  const voteCounts = new Map<string, number>();

  for (const answer of answerRows) {
    voteCounts.set(answer.option_id, (voteCounts.get(answer.option_id) ?? 0) + 1);
  }

  const total = answerRows.length;

  return options.map((option) => {
    const votes = voteCounts.get(option.id) ?? 0;

    return {
      optionId: option.id,
      optionText: option.text,
      percentage: getPercentage(votes, total),
      position: option.position,
      votes,
    };
  });
}

function buildQuestionResult({
  allAnswers,
  eligibleResponses,
  question,
}: {
  allAnswers: SignalAnswerRow[];
  eligibleResponses: number;
  question: SignalSurveyQuestion;
}): SignalQuestionResult {
  const questionAnswers = allAnswers.filter((answer) => answer.question_id === question.id);
  const triggerOption = question.branch
    ? question.options.find((option) => option.id === question.branch?.triggerOptionId)
    : null;
  const branchAnswers =
    question.branch === null
      ? []
      : allAnswers.filter((answer) => answer.question_id === question.branch?.id);
  const branchEligibleResponses =
    question.branch === null
      ? 0
      : allAnswers.filter(
          (answer) =>
            answer.question_id === question.id &&
            answer.option_id === question.branch?.triggerOptionId,
        ).length;
  const branch =
    question.branch === null
      ? null
      : {
          branch: null,
          eligibleResponses: branchEligibleResponses,
          options: buildOptionResults(question.branch.options, branchAnswers),
          position: question.branch.position,
          questionId: question.branch.id,
          questionText: question.branch.questionText,
          totalAnswers: branchAnswers.length,
          triggerOptionText: triggerOption?.text ?? null,
        };

  return {
    branch,
    eligibleResponses,
    options: buildOptionResults(question.options, questionAnswers),
    position: question.position,
    questionId: question.id,
    questionText: question.questionText,
    totalAnswers: questionAnswers.length,
    triggerOptionText: null,
  };
}

export function buildSignalResults({
  answers,
  responses,
  survey,
}: {
  answers: SignalAnswerRow[];
  responses: SignalResponseRow[];
  survey: SignalSurvey;
}): SignalResults {
  const completedResponseIds = new Set(
    responses.filter((response) => response.completed_at).map((response) => response.id),
  );
  const completedAnswers = answers.filter((answer) => completedResponseIds.has(answer.response_id));
  const mainQuestionIds = new Set(survey.questions.map((question) => question.id));
  const mainAnswerCount = completedAnswers.filter((answer) => mainQuestionIds.has(answer.question_id)).length;
  const possibleMainAnswers = completedResponseIds.size * survey.questions.length;
  const completionRate = possibleMainAnswers
    ? Math.round((mainAnswerCount / possibleMainAnswers) * 100)
    : 0;

  return {
    completionRate,
    participantCount: completedResponseIds.size,
    questions: survey.questions.map((question) =>
      buildQuestionResult({
        allAnswers: completedAnswers,
        eligibleResponses: completedResponseIds.size,
        question,
      }),
    ),
    totalAnswers: completedAnswers.length,
  };
}

export async function getSignalResultsForSurvey(survey: SignalSurvey): Promise<SignalResults> {
  const supabase = await createClient();
  const { data: responseData, error: responseError } = await supabase
    .from("signal_responses")
    .select("id,completed_at")
    .eq("survey_id", survey.id);

  if (responseError) {
    return buildSignalResults({ answers: [], responses: [], survey });
  }

  const { data: answerData, error: answerError } = await supabase
    .from("signal_answers")
    .select("response_id,question_id,option_id")
    .eq("survey_id", survey.id);

  return buildSignalResults({
    answers: answerError ? [] : ((answerData ?? []) as unknown as SignalAnswerRow[]),
    responses: (responseData ?? []) as unknown as SignalResponseRow[],
    survey,
  });
}
