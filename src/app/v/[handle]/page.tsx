import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkVitrineProfileViewTracker } from "@/components/link-vitrine-profile-view-tracker";
import { LinkVitrinePublicView } from "@/components/link-vitrine-public-view";
import {
  getPublicLinkVitrineByHandle,
  resolveVitrineDisplayName,
} from "@/lib/link-vitrines";
import { normalizeVitrineHandle } from "@/lib/link-vitrine-config";
import { isVitrineIndexable } from "@/lib/link-vitrine-indexability";
import { getPublicLinkVitrineCollaborationAvailability } from "@/lib/link-vitrine-collaboration-data";
import {
  buildLinkVitrineMetaDescription,
  buildLinkVitrineProfileJsonLd,
} from "@/lib/link-vitrine-seo";
import { getPublishedSignalSurveysForVitrine } from "@/lib/signal-surveys";
import {
  DEFAULT_OG_IMAGE_URL,
  NO_INDEX_FOLLOW_ROBOTS,
  NO_INDEX_ROBOTS,
  PUBLIC_ROBOTS,
  absoluteUrl,
  canonicalUrl,
  serializeJsonLd,
} from "@/lib/seo";

type PublicLinkVitrinePageProps = {
  params: Promise<{
    handle: string;
  }>;
};

// Signal verisi cookie-aware server client kullandığı sürece bu route dinamik
// render edilir. Route tekrar tamamen cacheable olursa kısa ISR yedeğini koru;
// save/publish action'ları ayrıca eski ve yeni public handle'ı invalidate eder.
export const revalidate = 60;

export async function generateMetadata({ params }: PublicLinkVitrinePageProps): Promise<Metadata> {
  const { handle } = await params;
  const normalizedHandle = normalizeVitrineHandle(handle);
  const canonical = canonicalUrl(`/v/${normalizedHandle || handle}`);
  const vitrine = await getPublicLinkVitrineByHandle(normalizedHandle);

  if (!vitrine) {
    return {
      title: {
        absolute: "Link Vitrini yayında değil",
      },
      robots: NO_INDEX_ROBOTS,
      alternates: { canonical },
    };
  }

  const name = resolveVitrineDisplayName(vitrine);
  const title = `${name} | TrulyGo Link Vitrini`;
  const description = buildLinkVitrineMetaDescription({ bio: vitrine.bio, name });
  const imageUrl =
    absoluteUrl(vitrine.bannerUrl) ?? absoluteUrl(vitrine.avatarUrl) ?? DEFAULT_OG_IMAGE_URL;

  return {
    title: {
      absolute: title,
    },
    description,
    robots: isVitrineIndexable(vitrine) ? PUBLIC_ROBOTS : NO_INDEX_FOLLOW_ROBOTS,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${name} Link Vitrini`,
        },
      ],
    },
    twitter: {
      card: imageUrl === DEFAULT_OG_IMAGE_URL ? "summary" : "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PublicLinkVitrinePage({ params }: PublicLinkVitrinePageProps) {
  const { handle } = await params;
  const normalizedHandle = normalizeVitrineHandle(handle);
  const vitrine = await getPublicLinkVitrineByHandle(normalizedHandle);

  if (!vitrine) {
    notFound();
  }

  const [signalSurveys, collaborationAvailable] = await Promise.all([
    getPublishedSignalSurveysForVitrine(vitrine.id),
    getPublicLinkVitrineCollaborationAvailability(vitrine.handle),
  ]);
  const canonical = canonicalUrl(`/v/${vitrine.handle}`);
  const jsonLd = buildLinkVitrineProfileJsonLd(
    {
      avatarUrl: vitrine.avatarUrl,
      bannerUrl: vitrine.bannerUrl,
      bio: vitrine.bio,
      createdAt: vitrine.createdAt,
      handle: vitrine.handle,
      items: vitrine.items,
      name: resolveVitrineDisplayName(vitrine),
      updatedAt: vitrine.updatedAt,
    },
    canonical,
  );

  return (
    <main className="link-vitrine-public-shell">
      <LinkVitrineProfileViewTracker handle={vitrine.handle} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {vitrine.bannerUrl ? (
        <>
          <div
            aria-hidden="true"
            className="link-vitrine-public-banner-bg"
            style={{
              backgroundImage: `url("${vitrine.bannerUrl}")`,
              backgroundPosition: `${vitrine.bannerPositionX}% ${vitrine.bannerPositionY}%`,
            }}
          />
          <div className="link-vitrine-public-banner-bg-overlay" aria-hidden="true" />
        </>
      ) : null}
      <div className="link-vitrine-public-ambient" aria-hidden="true" />
      <section className="link-vitrine-public-card">
        <LinkVitrinePublicView
          collaborationAvailable={collaborationAvailable}
          signalSurveys={signalSurveys}
          vitrine={vitrine}
        />
      </section>
    </main>
  );
}
