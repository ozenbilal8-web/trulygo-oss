"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveSignalSurveyAction } from "./actions";
import { SignalDeleteSurveyForm } from "./signal-delete-survey-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { slugifyToAscii } from "@/lib/slugs";
import type {
  SignalSurveyDraftBranch,
  SignalSurveyDraftOption,
  SignalSurveyDraftQuestion,
  SignalSurveyInput,
  SignalSurveyStatus,
} from "@/lib/signal-validation";

type Feedback = {
  message: string;
  tone: "error" | "success";
} | null;

type SignalSurveyEditorProps = {
  appOrigin: string;
  feedback: Feedback;
  initialSurvey: SignalSurveyInput;
  mode: "new" | "edit";
};

function createUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (
      Number(character) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(character) / 4)))
    ).toString(16),
  );
}

function createOption(text = ""): SignalSurveyDraftOption {
  return { id: createUuid(), text };
}

function createQuestion(): SignalSurveyDraftQuestion {
  return {
    id: createUuid(),
    questionText: "",
    options: [createOption(), createOption()],
    branch: null,
  };
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4v6a4 4 0 0 0 4 4h8M18 10l-4 4 4 4" />
      <circle cx="6" cy="4" r="2" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CopyCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

async function copyLinkToClipboard(value: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through to textarea fallback
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
    window.getSelection()?.removeAllRanges();
  }
}

function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<number | null>(null);
  const disabled = !url;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleClick() {
    if (!url) {
      return;
    }

    const success = await copyLinkToClipboard(url);
    setState(success ? "copied" : "failed");

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setState("idle");
      timerRef.current = null;
    }, 1800);
  }

  const label =
    state === "copied" ? "Kopyalandı" : state === "failed" ? "Hata" : "Kopyala";
  const ariaLabel =
    state === "copied"
      ? "Anket linki kopyalandı"
      : url
        ? `${url} linkini kopyala`
        : "Kopyalanacak link yok";

  return (
    <button
      aria-label={ariaLabel}
      className="signal-copy-link-button"
      data-copy-state={state}
      disabled={disabled}
      onClick={handleClick}
      title={url || "Önce slug yaz"}
      type="button"
    >
      {state === "copied" ? <CopyCheckIcon /> : <CopyIcon />}
      <span>{label}</span>
    </button>
  );
}

function MiniIconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="signal-icon-button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={checked ? "signal-toggle is-active" : "signal-toggle"}>
      <span className="signal-toggle-switch" aria-hidden="true">
        <span />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function BranchEditor({
  branch,
  onChange,
  onRemove,
  question,
}: {
  branch: SignalSurveyDraftBranch;
  onChange: (branch: SignalSurveyDraftBranch) => void;
  onRemove: () => void;
  question: SignalSurveyDraftQuestion;
}) {
  function updateOption(optionId: string, text: string) {
    onChange({
      ...branch,
      options: branch.options.map((option) =>
        option.id === optionId ? { ...option, text } : option,
      ),
    });
  }

  function addOption() {
    if (branch.options.length >= 4) {
      return;
    }

    onChange({ ...branch, options: [...branch.options, createOption()] });
  }

  function removeOption(optionId: string) {
    if (branch.options.length <= 2) {
      return;
    }

    onChange({
      ...branch,
      options: branch.options.filter((option) => option.id !== optionId),
    });
  }

  return (
    <div className="signal-branch-editor">
      <div className="signal-branch-head">
        <span>
          <BranchIcon />
          Dallanma
        </span>
        <label>
          <b>Tetikleyici şık</b>
          <select
            onChange={(event) => onChange({ ...branch, triggerOptionId: event.target.value })}
            value={branch.triggerOptionId}
          >
            {question.options.map((option, index) => (
              <option key={option.id} value={option.id}>
                {option.text || `Şık ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
        <MiniIconButton label="Dallanma sorusunu sil" onClick={onRemove}>
          <TrashIcon />
        </MiniIconButton>
      </div>

      <label className="signal-field">
        <span>Dallanma soru metni</span>
        <input
          maxLength={240}
          onChange={(event) => onChange({ ...branch, questionText: event.target.value })}
          placeholder="Bu cevabı seçenlere sorulacak ek soru"
          value={branch.questionText}
        />
      </label>

      <div className="signal-option-list">
        {branch.options.map((option, index) => (
          <div className="signal-option-row is-branch" key={option.id}>
            <span>{String.fromCharCode(65 + index)}</span>
            <input
              maxLength={120}
              onChange={(event) => updateOption(option.id, event.target.value)}
              placeholder={`Dallanma şıkkı ${index + 1}`}
              value={option.text}
            />
            <MiniIconButton
              disabled={branch.options.length <= 2}
              label="Dallanma şıkkını sil"
              onClick={() => removeOption(option.id)}
            >
              <TrashIcon />
            </MiniIconButton>
          </div>
        ))}
      </div>

      <button
        className="signal-dashed-button"
        disabled={branch.options.length >= 4}
        onClick={addOption}
        type="button"
      >
        <PlusIcon />
        Dallanma şıkkı ekle
      </button>
    </div>
  );
}

function QuestionEditor({
  index,
  isFocused,
  onChange,
  onFocus,
  onMoveDown,
  onMoveUp,
  onRemove,
  question,
  total,
}: {
  index: number;
  isFocused: boolean;
  onChange: (question: SignalSurveyDraftQuestion) => void;
  onFocus: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  question: SignalSurveyDraftQuestion;
  total: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function updateOption(optionId: string, text: string) {
    onChange({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId ? { ...option, text } : option,
      ),
    });
  }

  function addOption() {
    if (question.options.length >= 6) {
      return;
    }

    onChange({ ...question, options: [...question.options, createOption()] });
  }

  function removeOption(optionId: string) {
    if (question.options.length <= 2) {
      return;
    }

    onChange({
      ...question,
      options: question.options.filter((option) => option.id !== optionId),
      branch:
        question.branch?.triggerOptionId === optionId
          ? null
          : question.branch,
    });
  }

  function addBranch() {
    if (question.branch) {
      return;
    }

    onChange({
      ...question,
      branch: {
        id: createUuid(),
        triggerOptionId: question.options[0]?.id ?? "",
        questionText: "",
        options: [createOption(), createOption()],
      },
    });
    setCollapsed(false);
  }

  return (
    <article
      className={[
        "signal-question-card",
        isFocused ? "is-focused" : "",
        collapsed ? "is-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onFocus={onFocus}
    >
      <div className="signal-question-head">
        <button
          className="signal-question-collapse"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          <span>Soru {String(index + 1).padStart(2, "0")}</span>
          <small>
            {question.options.length} şık{question.branch ? " · 1 dallanma" : ""}
          </small>
        </button>
        <div className="signal-question-tools">
          <MiniIconButton disabled={index === 0} label="Soruyu yukarı taşı" onClick={onMoveUp}>
            <ArrowUpIcon />
          </MiniIconButton>
          <MiniIconButton
            disabled={index === total - 1}
            label="Soruyu aşağı taşı"
            onClick={onMoveDown}
          >
            <ArrowDownIcon />
          </MiniIconButton>
          <MiniIconButton disabled={total <= 1} label="Soruyu sil" onClick={onRemove}>
            <TrashIcon />
          </MiniIconButton>
        </div>
      </div>

      {collapsed ? null : (
        <div className="signal-question-body">
          <label className="signal-field">
            <span>Soru metni</span>
            <input
              maxLength={240}
              onChange={(event) => onChange({ ...question, questionText: event.target.value })}
              onFocus={onFocus}
              placeholder="Soru metnini yaz..."
              value={question.questionText}
            />
          </label>

          <div className="signal-option-list">
            {question.options.map((option, optionIndex) => {
              const isBranchTrigger = question.branch?.triggerOptionId === option.id;

              return (
                <div
                  className={isBranchTrigger ? "signal-option-row is-trigger" : "signal-option-row"}
                  key={option.id}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <input
                    maxLength={120}
                    onChange={(event) => updateOption(option.id, event.target.value)}
                    onFocus={onFocus}
                    placeholder={`Şık ${optionIndex + 1}`}
                    value={option.text}
                  />
                  {isBranchTrigger ? <b>↳ Dallanma</b> : null}
                  <MiniIconButton
                    disabled={question.options.length <= 2}
                    label="Şıkkı sil"
                    onClick={() => removeOption(option.id)}
                  >
                    <TrashIcon />
                  </MiniIconButton>
                </div>
              );
            })}
          </div>

          <button
            className="signal-dashed-button"
            disabled={question.options.length >= 6}
            onClick={addOption}
            type="button"
          >
            <PlusIcon />
            Şık ekle
          </button>

          {question.branch ? (
            <BranchEditor
              branch={question.branch}
              onChange={(branch) => onChange({ ...question, branch })}
              onRemove={() => onChange({ ...question, branch: null })}
              question={question}
            />
          ) : (
            <button className="signal-branch-button" onClick={addBranch} type="button">
              <BranchIcon />
              Dallanma sorusu ekle
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function PreviewPhone({
  appOrigin,
  focusedQuestionId,
  survey,
}: {
  appOrigin: string;
  focusedQuestionId: string;
  survey: SignalSurveyInput;
}) {
  const question =
    survey.questions.find((item) => item.id === focusedQuestionId) ?? survey.questions[0];
  const total = survey.questions.length + survey.questions.filter((item) => item.branch).length;
  const current = Math.max(1, survey.questions.findIndex((item) => item.id === question?.id) + 1);
  const publicUrl = `${appOrigin.replace(/\/$/, "")}/signal/${survey.slug || "anket-slugu"}`;

  return (
    <aside className="signal-preview-pane">
      <div className="signal-preview-head">
        <span>Canlı önizleme</span>
        <b>Telefon</b>
      </div>
      <div className="signal-phone">
        <div className="signal-phone-notch" aria-hidden="true" />
        <div className="signal-phone-screen">
          <div className="signal-phone-brand">
            <Image
              alt=""
              height={16}
              src="/brand/trulygo-mark.svg"
              unoptimized
              width={18}
            />
            <span>TrulyGo Signal</span>
          </div>
          <div>
            <h3>{survey.title || "Anket adı"}</h3>
            <p>{survey.description || "Anket açıklaması"}</p>
          </div>
          <div className="signal-phone-progress">
            <span>
              Soru {current} / {Math.max(total, 1)}
            </span>
            <i>
              <b style={{ width: `${(current / Math.max(total, 1)) * 100}%` }} />
            </i>
          </div>
          <div className="signal-phone-card">
            <strong>{question?.questionText || "Soru metni"}</strong>
            <div>
              {(question?.options ?? []).map((option, index) => (
                <span className={index === 0 ? "is-selected" : ""} key={option.id}>
                  <b>{String.fromCharCode(65 + index)}</b>
                  {option.text || `Şık ${index + 1}`}
                </span>
              ))}
            </div>
          </div>
          <small>{publicUrl.replace(/^https?:\/\//i, "")}</small>
        </div>
      </div>
    </aside>
  );
}

export function SignalSurveyEditor({
  appOrigin,
  feedback,
  initialSurvey,
  mode,
}: SignalSurveyEditorProps) {
  const [survey, setSurvey] = useState(initialSurvey);
  const [focusedQuestionId, setFocusedQuestionId] = useState(initialSurvey.questions[0]?.id ?? "");
  const normalizedOrigin = appOrigin.replace(/\/$/, "");
  const copyableUrl = survey.slug ? `${normalizedOrigin}/signal/${survey.slug}` : "";
  const questionCount = survey.questions.length;
  const branchCount = survey.questions.filter((question) => question.branch).length;
  const serializedSurvey = useMemo(() => JSON.stringify(survey), [survey]);

  function updateQuestion(questionId: string, nextQuestion: SignalSurveyDraftQuestion) {
    setSurvey((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? nextQuestion : question,
      ),
    }));
  }

  function removeQuestion(questionId: string) {
    if (survey.questions.length <= 1) {
      return;
    }

    setSurvey((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.id !== questionId),
    }));
    setFocusedQuestionId((currentId) =>
      currentId === questionId ? survey.questions.find((question) => question.id !== questionId)?.id ?? "" : currentId,
    );
  }

  function moveQuestion(questionId: string, direction: -1 | 1) {
    const currentIndex = survey.questions.findIndex((question) => question.id === questionId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= survey.questions.length) {
      return;
    }

    setSurvey((current) => {
      const questions = [...current.questions];
      const [item] = questions.splice(currentIndex, 1);

      if (!item) {
        return current;
      }

      questions.splice(nextIndex, 0, item);
      return { ...current, questions };
    });
  }

  function addQuestion() {
    if (survey.questions.length >= 20) {
      return;
    }

    const question = createQuestion();
    setSurvey((current) => ({ ...current, questions: [...current.questions, question] }));
    setFocusedQuestionId(question.id);
  }

  return (
    <main className="signal-admin-shell">
      <div className="signal-editor-topbar">
        <Link className="signal-back-link" href="/dashboard/signal">
          <ArrowLeftIcon />
          Anketlerim
        </Link>
        {mode === "edit" && survey.id ? (
          <SignalDeleteSurveyForm surveyId={survey.id} />
        ) : null}
      </div>
      <form action={saveSignalSurveyAction} className="signal-editor-form">
        <input name="survey_json" type="hidden" value={serializedSurvey} />

        <section className="signal-editor-pane">
          <div className="signal-page-heading">
            <span>Signal</span>
            <h1>TrulyGo Signal</h1>
            <p>Çok sorulu ve dallanabilen anketler oluştur.</p>
          </div>

          {feedback ? (
            <div className={`signal-feedback signal-feedback--${feedback.tone}`} role="status">
              {feedback.message}
            </div>
          ) : null}

          <section className="signal-editor-section">
            <div className="signal-section-head">
              <h2>Anket detayları</h2>
              <span>01 · Temel bilgiler</span>
            </div>
            <div className="signal-field-grid">
              <label className="signal-field">
                <span>Anket adı</span>
                <input
                  maxLength={100}
                  onChange={(event) => {
                    const title = event.target.value;
                    setSurvey((current) => ({
                      ...current,
                      title,
                      slug: current.slug || slugifyToAscii(title) || "",
                    }));
                  }}
                  placeholder="Akşam Yayın Planı"
                  required
                  value={survey.title}
                />
              </label>
              <label className="signal-field">
                <span>Durum</span>
                <select
                  onChange={(event) =>
                    setSurvey((current) => ({
                      ...current,
                      status: event.target.value as SignalSurveyStatus,
                    }))
                  }
                  value={survey.status}
                >
                  <option value="draft">Taslak</option>
                  <option value="published">Yayında</option>
                  <option value="closed">Kapalı</option>
                </select>
              </label>
            </div>

            <label className="signal-field">
              <span>Kısa açıklama</span>
              <textarea
                maxLength={240}
                onChange={(event) =>
                  setSurvey((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Anketin amacını birkaç cümleyle açıkla."
                rows={3}
                value={survey.description ?? ""}
              />
            </label>

            <label className="signal-field">
              <span>Anket Linki</span>
              <span className="signal-prefixed-input">
                <b>{`${normalizedOrigin.replace(/^https?:\/\//i, "")}/signal/`}</b>
                <input
                  maxLength={80}
                  onChange={(event) =>
                    setSurvey((current) => ({
                      ...current,
                      slug: slugifyToAscii(event.target.value) || "",
                    }))
                  }
                  placeholder="anket-slugu"
                  required
                  value={survey.slug}
                />
                <CopyLinkButton url={copyableUrl} />
              </span>
            </label>

            <div className="signal-toggle-grid">
              <ToggleField
                checked={survey.showResultsToVoters}
                description="Açıksa oy veren kişi anketten sonra dağılımı görebilir."
                label="Sonuçları oy verenlere göster"
                onChange={(checked) =>
                  setSurvey((current) => ({ ...current, showResultsToVoters: checked }))
                }
              />
              <ToggleField
                checked={survey.showInLinkVitrine}
                description="Yayındaki anket Link Vitrini içinde kart olarak görünsün."
                label="Link Vitrini’nde göster"
                onChange={(checked) =>
                  setSurvey((current) => ({ ...current, showInLinkVitrine: checked }))
                }
              />
            </div>

            <aside className="signal-compliance-notice" aria-label="Anket veri sorumluluğu">
              <strong>Hassas veri ve aydınlatma uyarısı</strong>
              <p>
                Sağlık, siyasi düşünce, din veya inanç, ceza mahkûmiyeti, biyometrik ya
                da genetik bilgi gibi özel nitelikli verileri veya üçüncü kişilere ait
                tanımlayıcı bilgileri gerekli hukuki şartlar, katmanlı aydınlatma ve ek
                güvenlik önlemleri olmadan sormayın. TrulyGo kullanmak anketinizi tek
                başına hukuka uygun hâle getirmez. Ayrıntılar için{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  Kullanım Şartları
                </Link>{" "}
                ve{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                  KVKK Aydınlatma Metni
                </Link>
                {"'ni inceleyin."}
              </p>
              <p>
                “Sonuçları katılımcılara göster” ayarı mevcut teknik erişimde oy
                zamanlarını ve cevap kombinasyonlarını public hâle getirebilir; hassas
                veri içeren anketlerde bu ayarı açmayın.
              </p>
            </aside>
          </section>

          <section className="signal-editor-section">
            <div className="signal-section-head">
              <h2>Soru oluşturucu</h2>
              <span>
                {String(questionCount).padStart(2, "0")}/20 ana soru · {branchCount} dallanma
              </span>
            </div>

            <div className="signal-question-list">
              {survey.questions.map((question, index) => (
                <QuestionEditor
                  index={index}
                  isFocused={focusedQuestionId === question.id}
                  key={question.id}
                  onChange={(nextQuestion) => updateQuestion(question.id, nextQuestion)}
                  onFocus={() => setFocusedQuestionId(question.id)}
                  onMoveDown={() => moveQuestion(question.id, 1)}
                  onMoveUp={() => moveQuestion(question.id, -1)}
                  onRemove={() => removeQuestion(question.id)}
                  question={question}
                  total={survey.questions.length}
                />
              ))}

              <button
                aria-label="Yeni soru ekle"
                className="signal-add-question"
                disabled={survey.questions.length >= 20}
                onClick={addQuestion}
                title={
                  survey.questions.length >= 20
                    ? "20 soru sınırına ulaşıldı"
                    : "En fazla 20 ana soru ekleyebilirsin"
                }
                type="button"
              >
                <PlusIcon />
                <span>Yeni soru ekle</span>
              </button>
            </div>
          </section>
        </section>

        <PreviewPhone
          appOrigin={appOrigin}
          focusedQuestionId={focusedQuestionId}
          survey={survey}
        />

        <footer className="signal-action-bar">
          <div className="signal-action-bar-main">
            <PendingSubmitButton
              className="signal-action-button signal-action-button--primary"
              pendingLabel="Kaydediliyor..."
            >
              <SaveIcon />
              Kaydet
            </PendingSubmitButton>
          </div>
        </footer>
      </form>
    </main>
  );
}
