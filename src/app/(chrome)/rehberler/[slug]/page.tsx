import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticleView } from "@/components/guides/guide-article";
import { getPublishedGuide, publishedGuides } from "@/content/guides";
import {
  buildGuideArticleJsonLd,
  buildGuideBreadcrumbJsonLd,
  createGuideMetadata,
} from "@/lib/guide-seo";
import { NO_INDEX_ROBOTS, canonicalUrl, serializeJsonLd } from "@/lib/seo";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublishedGuide(slug);

  if (!guide) {
    return {
      title: { absolute: "Rehber bulunamadı | TrulyGo" },
      robots: NO_INDEX_ROBOTS,
      alternates: { canonical: canonicalUrl(`/rehberler/${slug}`) },
    };
  }

  return createGuideMetadata(guide);
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getPublishedGuide(slug);

  if (!guide) {
    notFound();
  }

  const jsonLd = [buildGuideArticleJsonLd(guide), buildGuideBreadcrumbJsonLd(guide)];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <GuideArticleView guide={guide} />
    </>
  );
}
