import Link from "next/link";
import { redirect } from "next/navigation";
import { signalEditorErrorMessages } from "./messages";
import { getAuthStatus } from "@/lib/auth/session";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import {
  getCurrentUserSignalSurveys,
  type SignalSurveyListItem,
} from "@/lib/signal-surveys";
import { signalStatusLabels } from "@/lib/signal-validation";

type SignalListPageProps = {
  searchParams: Promise<{
    error?: keyof typeof signalEditorErrorMessages;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signal Anketleri",
  description: "TrulyGo Signal anketlerini oluştur ve yönet.",
  robots: NO_INDEX_ROBOTS,
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Tarih yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function SurveyCard({ survey }: { survey: SignalSurveyListItem }) {
  return (
    <article className="signal-list-card">
      <div className="signal-list-card-head">
        <span className={`signal-status signal-status--${survey.status}`}>
          {signalStatusLabels[survey.status]}
        </span>
        <span>{formatDate(survey.updatedAt)}</span>
      </div>
      <h2>{survey.title}</h2>
      <p>{survey.description || "Kısa açıklama eklenmemiş."}</p>
      <dl>
        <div>
          <dt>Soru</dt>
          <dd>{formatNumber(survey.questionCount)}</dd>
        </div>
        <div>
          <dt>Dallanma</dt>
          <dd>{formatNumber(survey.branchQuestionCount)}</dd>
        </div>
        <div>
          <dt>Katılımcı</dt>
          <dd>{formatNumber(survey.totalParticipants)}</dd>
        </div>
        <div>
          <dt>Cevap</dt>
          <dd>{formatNumber(survey.totalAnswers)}</dd>
        </div>
      </dl>
      <div className="signal-list-actions">
        <Link href={`/dashboard/signal/${survey.id}`}>
          Düzenle
          <ArrowIcon />
        </Link>
        <Link href={`/dashboard/signal/${survey.id}/results`}>
          Sonuçlar
          <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}

export default async function SignalListPage({ searchParams }: SignalListPageProps) {
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    redirect("/login");
  }

  const [params, surveys] = await Promise.all([
    searchParams,
    getCurrentUserSignalSurveys({ limit: 100 }),
  ]);
  const activeCount = surveys.filter((survey) => survey.status === "published").length;
  const participantCount = surveys.reduce((sum, survey) => sum + survey.totalParticipants, 0);

  return (
    <main className="signal-admin-shell">
      <section className="signal-list-shell">
        <div className="signal-list-hero">
          <div>
            <span>TrulyGo Signal</span>
            <h1>Signal Anketleri</h1>
            <p>Çok sorulu ve dallanabilen anketlerini buradan oluştur, yayınla ve ölç.</p>
          </div>
          <Link className="signal-action-button signal-action-button--primary" href="/dashboard/signal/new">
            <PlusIcon />
            Anket oluştur
          </Link>
        </div>

        {params.error ? (
          <div className="signal-feedback signal-feedback--error" role="alert">
            {signalEditorErrorMessages[params.error]}
          </div>
        ) : null}

        <section className="signal-summary-grid" aria-label="Signal özeti">
          <article>
            <span>Toplam anket</span>
            <strong>{formatNumber(surveys.length)}</strong>
          </article>
          <article>
            <span>Aktif anket</span>
            <strong>{formatNumber(activeCount)}</strong>
          </article>
          <article>
            <span>Toplam katılımcı</span>
            <strong>{formatNumber(participantCount)}</strong>
          </article>
        </section>

        {surveys.length > 0 ? (
          <section className="signal-list-grid" aria-label="Anket listesi">
            {surveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </section>
        ) : (
          <section className="signal-empty-state">
            <span>Signal</span>
            <h2>Henüz anket yok.</h2>
            <p>İlk anketini oluşturduğunda canlı bağlantı ve sonuç paneli burada görünecek.</p>
            <Link className="signal-action-button signal-action-button--primary" href="/dashboard/signal/new">
              <PlusIcon />
              Anket oluştur
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
