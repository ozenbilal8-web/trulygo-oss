import { SITE_URL } from "@/lib/seo";
export type GuideCategoryId = "utm-link-takibi" | "link-vitrini" | "anket";

export type GuideStatus = "draft" | "published";

export type GuidePublisher = {
  type: "Organization";
  name: "TrulyGo";
  url: string;
  logo: string;
};

export type GuideInline = {
  text: string;
  href?: string;
  emphasis?: "strong" | "code";
};

export type GuideParagraphBlock = {
  type: "paragraph";
  content: GuideInline[];
};

export type GuideListBlock = {
  type: "list";
  ordered?: boolean;
  items: GuideInline[][];
};

export type GuideStepsBlock = {
  type: "steps";
  items: Array<{
    title: string;
    content: GuideInline[];
  }>;
};

export type GuideTableBlock = {
  type: "table";
  caption: string;
  headers: string[];
  rows: string[][];
};

export type GuideCodeBlock = {
  type: "code";
  label?: string;
  code: string;
};

export type GuideCalloutBlock = {
  type: "callout";
  tone: "note" | "tip" | "warning";
  title: string;
  content: GuideInline[];
};

export type GuideBlock =
  | GuideParagraphBlock
  | GuideListBlock
  | GuideStepsBlock
  | GuideTableBlock
  | GuideCodeBlock
  | GuideCalloutBlock;

export type GuideSection = {
  id: string;
  title: string;
  blocks: GuideBlock[];
};

export type GuideCta = {
  href: string;
  label: string;
  title: string;
  description: string;
};

export type GuideArticle = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: GuideCategoryId;
  primaryIntent: string;
  secondaryIntents: string[];
  primaryQuery: string;
  secondaryQueries: string[];
  datePublished: string;
  dateModified: string;
  status: GuideStatus;
  publisher: GuidePublisher;
  hero?:
    | {
        eyebrow?: string;
        coverImage?: never;
        coverImageAlt?: never;
      }
    | {
        eyebrow?: string;
        coverImage: string;
        coverImageAlt: string;
      };
  relatedArticles: string[];
  cta: GuideCta;
  sections: GuideSection[];
};

export const TRULYGO_GUIDE_PUBLISHER = {
  type: "Organization",
  name: "TrulyGo",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/trulygo-mark.svg`,
} as const satisfies GuidePublisher;

export function plain(text: string): GuideInline[] {
  return [{ text }];
}

export function line(...content: Array<string | GuideInline>): GuideInline[] {
  return content.map((item) => (typeof item === "string" ? { text: item } : item));
}

export function guideLink(text: string, href: string): GuideInline {
  return { text, href };
}

export function strong(text: string): GuideInline {
  return { text, emphasis: "strong" };
}

export function inlineCode(text: string): GuideInline {
  return { text, emphasis: "code" };
}
