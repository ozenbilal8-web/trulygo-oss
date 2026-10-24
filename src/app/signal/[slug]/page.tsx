import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SignalUnavailable } from "./signal-unavailable";
import { SignalVoter } from "./signal-voter";
import { getSignalResultsForSurvey } from "@/lib/signal-results";
import { getPublicSignalSurveyBySlug } from "@/lib/signal-surveys";
import { getSignalVoteCookieName } from "@/lib/signal-vote-cookie";
import { NO_INDEX_ROBOTS, canonicalUrl, cleanSeoDescription } from "@/lib/seo";

type SignalPublicPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SignalPublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const survey = await getPublicSignalSurveyBySlug(slug);

  if (!survey || survey.status !== "published") {
    return {
      title: { absolute: "Signal anketi yayında değil" },
      robots: NO_INDEX_ROBOTS,
    };
  }

  // Product decision: user-generated public surveys stay reachable by direct link
  // but are not indexed for now. The /anket-olusturucu landing remains indexable
  // (its own metadata) and Signal URLs are intentionally absent from the sitemap.
  return {
    title: { absolute: `${survey.title} | TrulyGo Signal` },
    description: cleanSeoDescription(
      survey.description,
      "TrulyGo Signal üzerinde oluşturulmuş public anket.",
    ),
    robots: NO_INDEX_ROBOTS,
    alternates: { canonical: canonicalUrl(`/signal/${survey.slug}`) },
  };
}

export default async function SignalPublicPage({ params }: SignalPublicPageProps) {
  const { slug } = await params;
  const survey = await getPublicSignalSurveyBySlug(slug);

  if (!survey) {
    notFound();
  }

  if (survey.status === "closed") {
    return (
      <SignalUnavailable
        description="Anket sahibi bu anketi kapattığı için yeni cevap kabul edilmiyor."
        title="Anket kapalı."
      />
    );
  }

  const cookieStore = await cookies();
  const alreadyVoted = Boolean(cookieStore.get(getSignalVoteCookieName(survey.id))?.value);
  const initialResults =
    alreadyVoted && survey.showResultsToVoters
      ? await getSignalResultsForSurvey(survey)
      : null;

  return (
    <SignalVoter
      alreadyVoted={alreadyVoted}
      initialResults={initialResults}
      survey={survey}
    />
  );
}
