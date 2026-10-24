import { redirect } from "next/navigation";
import {
  signalEditorErrorMessages,
  signalEditorSuccessMessages,
} from "../messages";
import { SignalSurveyEditor } from "../signal-survey-editor";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAuthStatus } from "@/lib/auth/session";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { slugifyToAscii } from "@/lib/slugs";
import { createSignalSurveyDraft } from "@/lib/signal-surveys";

type NewSignalPageProps = {
  searchParams: Promise<{
    error?: keyof typeof signalEditorErrorMessages;
    message?: keyof typeof signalEditorSuccessMessages;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Yeni Signal Anketi",
  description: "TrulyGo Signal ile yeni anket oluştur.",
  robots: NO_INDEX_ROBOTS,
};

export default async function NewSignalPage({ searchParams }: NewSignalPageProps) {
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    redirect("/login");
  }

  const [profile, appOrigin, params] = await Promise.all([
    getCurrentProfile(),
    getAppOrigin(),
    searchParams,
  ]);
  const baseName = profile?.username ?? auth.email?.split("@")[0] ?? "signal";
  const defaultSlug = slugifyToAscii(`${baseName}-anket`) ?? "yeni-anket";
  const feedback = params.error
    ? { message: signalEditorErrorMessages[params.error], tone: "error" as const }
    : params.message
      ? { message: signalEditorSuccessMessages[params.message], tone: "success" as const }
      : null;

  return (
    <SignalSurveyEditor
      appOrigin={appOrigin}
      feedback={feedback}
      initialSurvey={createSignalSurveyDraft({ defaultSlug })}
      mode="new"
    />
  );
}
