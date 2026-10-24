"use client";

import { deleteSignalSurveyAction } from "./actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" />
    </svg>
  );
}

export function SignalDeleteSurveyForm({ surveyId }: { surveyId: string }) {
  return (
    <form
      action={deleteSignalSurveyAction}
      className="signal-delete-survey-form"
      onSubmit={(event) => {
        if (!window.confirm("Bu anket ve tüm cevapları silinecek. Emin misiniz?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="survey_id" type="hidden" value={surveyId} />
      <PendingSubmitButton
        className="signal-action-button signal-action-button--danger"
        pendingLabel="Siliniyor..."
      >
        <TrashIcon />
        Anketi sil
      </PendingSubmitButton>
    </form>
  );
}
