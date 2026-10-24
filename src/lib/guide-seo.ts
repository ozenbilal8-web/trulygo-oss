import type { Metadata } from "next";
import type { GuideArticle } from "@/content/guides";
import {
  PUBLIC_ROBOTS,
  SITE_NAME,
  canonicalUrl,
  localizedAlternates,
} from "@/lib/seo";

export function guidePath(slug: string) {
  return `/rehberler/${slug}`;
}

export function guideImagePath(slug: string) {
  return `${guidePath(slug)}/og-image`;
}

export function createGuideMetadata(guide: GuideArticle): Metadata {
  const path = guidePath(guide.slug);
  const canonical = canonicalUrl(path);
  const image = guideImagePath(guide.slug);

  return {
    title: { absolute: guide.seoTitle },
    description: guide.description,
    keywords: null,
    robots: PUBLIC_ROBOTS,
    alternates: localizedAlternates(path),
    openGraph: {
      type: "article",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url: canonical,
      title: guide.seoTitle,
      description: guide.description,
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.seoTitle,
      description: guide.description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
  };
}

export function buildGuideArticleJsonLd(guide: GuideArticle) {
  const url = canonicalUrl(guidePath(guide.slug));
  const image = canonicalUrl(guideImagePath(guide.slug));

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    image: [image],
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    inLanguage: "tr-TR",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": guide.publisher.type,
      name: guide.publisher.name,
      url: guide.publisher.url,
    },
    publisher: {
      "@type": guide.publisher.type,
      name: guide.publisher.name,
      url: guide.publisher.url,
      logo: {
        "@type": "ImageObject",
        url: guide.publisher.logo,
      },
    },
  };
}

export function buildGuideBreadcrumbJsonLd(guide: GuideArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: canonicalUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Rehberler",
        item: canonicalUrl("/rehberler"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: canonicalUrl(guidePath(guide.slug)),
      },
    ],
  };
}
