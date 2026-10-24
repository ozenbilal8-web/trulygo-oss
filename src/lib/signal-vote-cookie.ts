export function getSignalVoteCookieName(surveyId: string) {
  return `tg_signal_${surveyId.replace(/[^a-z0-9]/gi, "").slice(0, 48)}`;
}
