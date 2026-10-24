import { redirect } from "next/navigation";
import {
  signalEditorErrorMessages,
  signalEditorSuccessMessages,
} from "../messages";
import { SignalSurveyEditor } from "../signal-survey-editor";
import { getAuthStatus } from "@/lib/auth/session";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { getCurrentUserSignalSurveyById, type SignalSurvey } from "@/lib/signal-surveys";
import type { SignalSurveyInput } from "@/lib/signal-validation";

type EditSignalPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: keyof typeof signalEditorErrorMessages;
    message?: keyof typeof signalEditorSuccessMessages;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signal Anketi",
  description: "TrulyGo Signal anketini düzenle.",
  robots: NO_INDEX_ROBOTS,
};

function toEditorInput(survey: SignalSurvey): SignalSurveyInput {
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    slug: survey.slug,
    status: survey.status,
    showResultsToVoters: survey.showResultsToVoters,
    showInLinkVitrine: survey.showInLinkVitrine,
    questions: survey.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
      })),
      branch: question.branch
        ? {
            id: question.branch.id,
            triggerOptionId: question.branch.triggerOptionId,
            questionText: question.branch.questionText,
            options: question.branch.options.map((option) => ({
              id: option.id,
              text: option.text,
            })),
          }
        : null,
    })),
  };
}

export default async function EditSignalPage({ params, searchParams }: EditSignalPageProps) {
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    redirect("/login");
  }

  const [{ id }, appOrigin, query] = await Promise.all([params, getAppOrigin(), searchParams]);
  const survey = await getCurrentUserSignalSurveyById(id);

  if (!survey) {
    redirect("/dashboard/signal?error=not_found");
  }

  const feedback = query.error
    ? { message: signalEditorErrorMessages[query.error], tone: "error" as const }
    : query.message
      ? { message: signalEditorSuccessMessages[query.message], tone: "success" as const }
      : null;

  return (
    <SignalSurveyEditor
      appOrigin={appOrigin}
      feedback={feedback}
      initialSurvey={toEditorInput(survey)}
      mode="edit"
    />
  );
}
