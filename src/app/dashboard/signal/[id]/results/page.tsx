import Link from "next/link";
import { redirect } from "next/navigation";
import {
  updateSignalSurveyStatusAction,
  updateSignalSurveyVisibilityAction,
} from "../../actions";
import {
  signalEditorErrorMessages,
  signalEditorSuccessMessages,
} from "../../messages";
import { CopyShortLinkButton } from "@/components/copy-short-link-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getAuthStatus } from "@/lib/auth/session";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { getSignalResultsForSurvey, type SignalQuestionResult } from "@/lib/signal-results";
import { getCurrentUserSignalSurveyById } from "@/lib/signal-surveys";
import { getSignalPublicUrl } from "@/lib/signal-url";

type SignalResultsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: keyof typeof signalEditorErrorMessages;
    message?: keyof typeof signalEditorSuccessMessages;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signal Sonuçları",
  description: "TrulyGo Signal anket sonuçları ve yönetim ekranı.",
  robots: NO_INDEX_ROBOTS,
};

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" />
      <path d="M19 19H5V5h7" />
    </svg>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function StatCard({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <article className="signal-admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}

function QuestionResultsCard({
  indexLabel,
  isBranch = false,
  result,
}: {
  indexLabel: string;
  isBranch?: boolean;
  result: SignalQuestionResult;
}) {
  return (
    <article className={isBranch ? "signal-result-card is-branch" : "signal-result-card"}>
      <div className="signal-result-card-head">
        <span>{isBranch ? "↳ Dallanma" : indexLabel}</span>
        <div>
          <h3>{result.questionText}</h3>
          {result.triggerOptionText ? (
            <p>&quot;{result.triggerOptionText}&quot; cevabını verenler için gösterildi.</p>
          ) : null}
        </div>
        <b>{formatNumber(result.totalAnswers)} cevap</b>
      </div>

      {result.totalAnswers > 0 ? (
        <div className="signal-result-bars">
          {result.options.map((option, index) => (
            <div className="signal-result-option" key={option.optionId}>
              <i style={{ width: `${option.percentage}%` }} />
              <span>{String.fromCharCode(65 + index)}</span>
              <strong>{option.optionText}</strong>
              <small>{formatNumber(option.votes)}</small>
              <b>{option.percentage}%</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="signal-result-empty">Bu soru için henüz cevap yok.</div>
      )}
    </article>
  );
}

export default async function SignalResultsPage({ params, searchParams }: SignalResultsPageProps) {
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    redirect("/login");
  }

  const [{ id }, query, appOrigin] = await Promise.all([params, searchParams, getAppOrigin()]);
  const survey = await getCurrentUserSignalSurveyById(id);

  if (!survey) {
    redirect("/dashboard/signal?error=not_found");
  }

  const results = await getSignalResultsForSurvey(survey);
  const publicUrl = getSignalPublicUrl(appOrigin, survey.slug);
  const feedback = query.error
    ? { message: signalEditorErrorMessages[query.error], tone: "error" as const }
    : query.message
      ? { message: signalEditorSuccessMessages[query.message], tone: "success" as const }
      : null;

  return (
    <main className="signal-admin-shell">
      <section className="signal-results-shell">
        <Link className="signal-back-link" href={`/dashboard/signal/${survey.id}`}>
          <ArrowLeftIcon />
          Anketi düzenle
        </Link>
        <div className="signal-results-title">
          <div>
            <span>Signal · Yönetim</span>
            <h1>{survey.title}</h1>
            <p>{survey.description || "Kısa açıklama eklenmemiş."}</p>
          </div>
          <div className="signal-public-url-card">
            <span>Public anket linki</span>
            <strong>{publicUrl.replace(/^https?:\/\//i, "")}</strong>
            <div>
              <CopyShortLinkButton
                className="signal-mini-button"
                idleLabel="Kopyala"
                value={publicUrl}
              />
              <Link className="signal-mini-button" href={publicUrl} target="_blank">
                <ExternalIcon />
                Aç
              </Link>
            </div>
          </div>
        </div>

        {feedback ? (
          <div className={`signal-feedback signal-feedback--${feedback.tone}`} role="status">
            {feedback.message}
          </div>
        ) : null}

        <section className="signal-admin-stats" aria-label="Anket istatistikleri">
          <StatCard
            label="Toplam katılımcı"
            sub="tamamlanan yanıt"
            value={formatNumber(results.participantCount)}
          />
          <StatCard
            label="Toplam cevap"
            sub="ana + dallanma"
            value={formatNumber(results.totalAnswers)}
          />
          <StatCard
            label="Tamamlanma"
            sub={`${formatNumber(results.participantCount)} katılımcı`}
            value={`${results.completionRate}%`}
          />
          <StatCard
            label="Sonuç görünürlüğü"
            sub="oy veren ekranı"
            value={survey.showResultsToVoters ? "Açık" : "Kapalı"}
          />
        </section>

        <section className="signal-admin-control-row">
          <div>
            <strong>Sonuçları oy verenlere göster</strong>
            <span>
              {survey.showResultsToVoters
                ? "Oy verenler tamamladıktan sonra sonuçları görebilir."
                : "Sonuçlar yalnızca anket sahibi tarafından görüntülenebilir."}
            </span>
          </div>
          <form action={updateSignalSurveyVisibilityAction}>
            <input name="survey_id" type="hidden" value={survey.id} />
            <input
              name="show_results_to_voters"
              type="hidden"
              value={survey.showResultsToVoters ? "false" : "true"}
            />
            <PendingSubmitButton
              className="signal-action-button signal-action-button--secondary"
              pendingLabel="Güncelleniyor..."
            >
              {survey.showResultsToVoters ? "Kapat" : "Aç"}
            </PendingSubmitButton>
          </form>
        </section>

        <section className="signal-result-section">
          <div className="signal-section-head">
            <h2>Soru bazlı sonuçlar</h2>
            <span>
              {survey.questions.length} ana soru ·{" "}
              {survey.questions.filter((question) => question.branch).length} dallanma
            </span>
          </div>

          {results.totalAnswers > 0 ? (
            results.questions.map((result, index) => (
              <div className="signal-result-group" key={result.questionId}>
                <QuestionResultsCard
                  indexLabel={`Soru ${String(index + 1).padStart(2, "0")}`}
                  result={result}
                />
                {result.branch ? (
                  <QuestionResultsCard
                    indexLabel="Dallanma"
                    isBranch
                    result={result.branch}
                  />
                ) : null}
              </div>
            ))
          ) : (
            <div className="signal-empty-state">
              <span>Sonuçlar</span>
              <h2>Henüz cevap yok.</h2>
              <p>Anket yayınlandıktan sonra gerçek cevaplar burada görünecek.</p>
            </div>
          )}
        </section>
      </section>

      <footer className="signal-action-bar">
        <div className="signal-action-bar-main">
          <button
            className="signal-action-button signal-action-button--ghost"
            disabled
            title="CSV dışa aktarım yakında"
            type="button"
          >
            CSV indir · yakında
          </button>
          <Link className="signal-action-button signal-action-button--secondary" href={`/dashboard/signal/${survey.id}`}>
            Düzenle
          </Link>
          <form action={updateSignalSurveyStatusAction}>
            <input name="survey_id" type="hidden" value={survey.id} />
            <input
              name="status"
              type="hidden"
              value={survey.status === "published" ? "closed" : "published"}
            />
            <PendingSubmitButton
              className={
                survey.status === "published"
                  ? "signal-action-button signal-action-button--danger"
                  : "signal-action-button signal-action-button--primary"
              }
              pendingLabel={
                survey.status === "published" ? "Kapatılıyor..." : "Yayınlanıyor..."
              }
            >
              {survey.status === "published" ? "Anketi kapat" : "Yeniden yayına al"}
            </PendingSubmitButton>
          </form>
        </div>
      </footer>
    </main>
  );
}
