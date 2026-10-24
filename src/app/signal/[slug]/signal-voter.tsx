"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { submitSignalVoteAction } from "./actions";
import type {
  SignalOptionResult,
  SignalResults,
  SignalQuestionResult,
} from "@/lib/signal-results";
import type { SignalSurvey, SignalSurveyOption } from "@/lib/signal-surveys";

type SignalVoterProps = {
  alreadyVoted: boolean;
  initialResults: SignalResults | null;
  survey: SignalSurvey;
};

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function OptionButton({
  index,
  isSelected,
  onSelect,
  option,
}: {
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  option: SignalSurveyOption;
}) {
  return (
    <button
      className={isSelected ? "signal-vote-option is-selected" : "signal-vote-option"}
      onClick={onSelect}
      type="button"
    >
      <span>{String.fromCharCode(65 + index)}</span>
      <strong>{option.text}</strong>
      <i aria-hidden="true">{isSelected ? <CheckIcon /> : null}</i>
    </button>
  );
}

function ResultOptionBars({ options }: { options: SignalOptionResult[] }) {
  const topVotes = options.reduce((max, option) => Math.max(max, option.votes), 0);

  return (
    <div className="signal-public-result-bars">
      {options.map((option, index) => (
        <div
          className={
            topVotes > 0 && option.votes === topVotes
              ? "signal-public-result-option is-top"
              : "signal-public-result-option"
          }
          key={option.optionId}
        >
          <i style={{ width: `${option.percentage}%` }} />
          <span>{String.fromCharCode(65 + index)}</span>
          <strong>{option.optionText}</strong>
          <small>{formatNumber(option.votes)}</small>
          <b>{option.percentage}%</b>
        </div>
      ))}
    </div>
  );
}

function ResultBars({
  result,
  showFollowUp,
}: {
  result: SignalQuestionResult;
  showFollowUp: boolean;
}) {
  return (
    <article className="signal-public-result-card">
      <div className="signal-public-result-head">
        <h3>{result.questionText}</h3>
        <span>{formatNumber(result.totalAnswers)} cevap</span>
      </div>
      {result.totalAnswers > 0 ? (
        <ResultOptionBars options={result.options} />
      ) : (
        <p className="signal-public-result-empty">Bu soru için henüz cevap yok.</p>
      )}
      {result.branch && showFollowUp ? (
        <div className="signal-public-followup">
          <h4>{result.branch.questionText}</h4>
          {result.branch.totalAnswers > 0 ? (
            <ResultOptionBars options={result.branch.options} />
          ) : (
            <p className="signal-public-result-empty">Bu soru için henüz cevap yok.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function CompleteHero({ survey }: { survey: SignalSurvey }) {
  return (
    <header className="signal-public-hero">
      <span className="signal-public-hero-eyebrow">Signal</span>
      <h1>{survey.title}</h1>
      {survey.description ? <p>{survey.description}</p> : null}
      <div className="signal-public-voted-note">
        <CheckIcon />
        Cevabınız kaydedildi.
      </div>
    </header>
  );
}

function ResultsView({
  answers,
  results,
  survey,
}: {
  answers: Record<string, string>;
  results: SignalResults;
  survey: SignalSurvey;
}) {
  // Only reveal a follow-up result for a branch whose trigger option THIS voter
  // actually selected. A voter must never see the follow-up (its title, its
  // results, or its empty state) attached to an option they did not pick — that
  // would leak the survey's hidden branch structure. When we don't know the
  // voter's picks (e.g. they voted in an earlier session, so the answers map is
  // empty), this set stays empty and no follow-up is shown to anyone.
  const triggeredQuestionIds = new Set<string>();

  for (const question of survey.questions) {
    if (question.branch && answers[question.id] === question.branch.triggerOptionId) {
      triggeredQuestionIds.add(question.id);
    }
  }

  return (
    <div className="signal-public-complete">
      <CompleteHero survey={survey} />

      <div className="signal-public-stats">
        <div>
          <span>Toplam katılımcı</span>
          <strong>{formatNumber(results.participantCount)}</strong>
        </div>
        <div>
          <span>Toplam cevap</span>
          <strong>{formatNumber(results.totalAnswers)}</strong>
        </div>
      </div>

      <div className="signal-public-results-list">
        <span className="signal-public-section-label">Sonuçlar</span>
        {results.questions.map((result) => (
          <ResultBars
            key={result.questionId}
            result={result}
            showFollowUp={triggeredQuestionIds.has(result.questionId)}
          />
        ))}
      </div>
    </div>
  );
}

function ThanksView({ survey }: { survey: SignalSurvey }) {
  return (
    <div className="signal-public-complete">
      <CompleteHero survey={survey} />
      <p className="signal-public-complete-note">
        Sonuçlar yalnızca anket sahibi tarafından görüntülenebilir.
      </p>
    </div>
  );
}

export function SignalVoter({ alreadyVoted, initialResults, survey }: SignalVoterProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(alreadyVoted);
  const [results, setResults] = useState<SignalResults | null>(initialResults);
  const currentQuestion = survey.questions[currentIndex];
  const progress = ((currentIndex + 1) / Math.max(survey.questions.length, 1)) * 100;
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : null;
  const shouldShowBranch =
    Boolean(currentQuestion?.branch) &&
    selectedOptionId === currentQuestion?.branch?.triggerOptionId;
  const branchAnswerId = currentQuestion?.branch ? answers[currentQuestion.branch.id] : null;
  const canContinue = useMemo(() => {
    if (!currentQuestion || !selectedOptionId) {
      return false;
    }

    if (shouldShowBranch) {
      return Boolean(branchAnswerId);
    }

    return true;
  }, [branchAnswerId, currentQuestion, selectedOptionId, shouldShowBranch]);
  const isLastQuestion = currentIndex === survey.questions.length - 1;

  function selectMainAnswer(optionId: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((current) => {
      const next = { ...current, [currentQuestion.id]: optionId };

      if (currentQuestion.branch && optionId !== currentQuestion.branch.triggerOptionId) {
        delete next[currentQuestion.branch.id];
      }

      return next;
    });
    setSubmitError(null);
  }

  function selectBranchAnswer(optionId: string) {
    if (!currentQuestion?.branch) {
      return;
    }

    setAnswers((current) => ({ ...current, [currentQuestion.branch!.id]: optionId }));
    setSubmitError(null);
  }

  async function finishSurvey() {
    if (!canContinue || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    window.dispatchEvent(new CustomEvent("trulygo:progress-start"));

    const result = await submitSignalVoteAction({
      surveyId: survey.id,
      answers,
    });

    setIsSubmitting(false);
    window.dispatchEvent(new CustomEvent("trulygo:progress-finish"));

    if (!result.ok) {
      if (result.error === "rate_limited") {
        setSubmitError("Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.");
      } else if (
        result.error === "missing_answer" ||
        result.error === "missing_branch_answer"
      ) {
        setSubmitError("Lütfen görünen soruları cevaplayın.");
      } else {
        setSubmitError("Cevabınız kaydedilemedi. Lütfen tekrar deneyin.");
      }

      return;
    }

    setResults(result.results ?? null);
    setIsComplete(true);
  }

  if (isComplete) {
    return (
      <SignalPublicShell survey={survey} completed>
        {survey.showResultsToVoters && results ? (
          <ResultsView answers={answers} results={results} survey={survey} />
        ) : (
          <ThanksView survey={survey} />
        )}
      </SignalPublicShell>
    );
  }

  if (!currentQuestion) {
    return (
      <SignalPublicShell survey={survey} completed>
        <ThanksView survey={survey} />
      </SignalPublicShell>
    );
  }

  return (
    <SignalPublicShell survey={survey}>
      <div className="signal-public-progress">
        <span>
          Soru {String(currentIndex + 1).padStart(2, "0")} /{" "}
          {String(survey.questions.length).padStart(2, "0")}
        </span>
        <i>
          <b style={{ width: `${progress}%` }} />
        </i>
      </div>

      <section className="signal-vote-card">
        <h2>{currentQuestion.questionText}</h2>
        <div className="signal-vote-options">
          {currentQuestion.options.map((option, index) => (
            <OptionButton
              index={index}
              isSelected={answers[currentQuestion.id] === option.id}
              key={option.id}
              onSelect={() => selectMainAnswer(option.id)}
              option={option}
            />
          ))}
        </div>
      </section>

      {shouldShowBranch && currentQuestion.branch ? (
        <section className="signal-vote-card is-branch">
          <span className="signal-branch-label">Ek soru</span>
          <h2>{currentQuestion.branch.questionText}</h2>
          <div className="signal-vote-options">
            {currentQuestion.branch.options.map((option, index) => (
              <OptionButton
                index={index}
                isSelected={answers[currentQuestion.branch!.id] === option.id}
                key={option.id}
                onSelect={() => selectBranchAnswer(option.id)}
                option={option}
              />
            ))}
          </div>
        </section>
      ) : null}

      {submitError ? (
        <div className="signal-public-error" role="alert">
          {submitError}
        </div>
      ) : null}

      <nav className="signal-vote-nav" aria-label="Anket adımları">
        <button
          disabled={currentIndex === 0 || isSubmitting}
          onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
          type="button"
        >
          <ArrowLeftIcon />
          Geri
        </button>
        <button
          disabled={!canContinue || isSubmitting}
          onClick={() => {
            if (isLastQuestion) {
              void finishSurvey();
            } else {
              setCurrentIndex((value) => Math.min(survey.questions.length - 1, value + 1));
            }
          }}
          type="button"
        >
          {isSubmitting ? "Kaydediliyor..." : isLastQuestion ? "Anketi tamamla" : "İleri"}
          <ArrowRightIcon />
        </button>
      </nav>
    </SignalPublicShell>
  );
}

function SignalPublicShell({
  children,
  completed = false,
  survey,
}: {
  children: React.ReactNode;
  completed?: boolean;
  survey: SignalSurvey;
}) {
  return (
    <main className="signal-public-shell">
      <div className="signal-public-ambient" aria-hidden="true" />
      <header className="signal-public-header">
        <span>
          <Image alt="" height={18} src="/brand/trulygo-mark.svg" unoptimized width={21} />
          TrulyGo Signal
        </span>
        {completed ? null : <b>Canlı anket</b>}
      </header>
      <section className="signal-public-container">
        {completed ? null : (
          <div className="signal-public-title">
            <h1>{survey.title}</h1>
            {survey.description ? <p>{survey.description}</p> : null}
          </div>
        )}
        <p className="signal-public-privacy">
          Anket içeriğini anket sahibi belirler. Seçtiğiniz yanıtlar, oy zamanı ve
          tekrar oyu/kötüye kullanımı azaltan takma adlı bir belirteçle işlenir. IP
          adresi ve tarayıcı bilgisi güvenlik sürecinde geçici olarak kullanılabilir;
          cevap kaydında açık olarak saklanmaz. Anket sahibi sonuç görünürlüğünü açtıysa
          uygulama özet sayımlar gösterir; mevcut veri erişiminde oy zamanları ve cevap
          kombinasyonları diğer ziyaretçiler tarafından da görülebilir. Özel nitelikli
          veya sizi tanımlayabilecek bilgi içeren anketleri yanıtlamayın.{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
            KVKK Aydınlatma Metni
          </Link>
        </p>
        {children}
      </section>
    </main>
  );
}
