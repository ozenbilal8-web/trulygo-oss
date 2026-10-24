import { guideCategories, getGuideCategory } from "./categories";
import { trackingGuides } from "./tracking-guides";
import type { GuideArticle } from "./types";
import { utmBasicsGuides } from "./utm-basics-guides";
import { vitrineSurveyGuides } from "./vitrine-survey-guides";

export { guideCategories, getGuideCategory };
export type { GuideArticle, GuideCategoryId } from "./types";

export const guides: GuideArticle[] = [
  ...utmBasicsGuides,
  ...trackingGuides,
  ...vitrineSurveyGuides,
];

export const publishedGuides = guides.filter((guide) => guide.status === "published");

export function getPublishedGuide(slug: string) {
  return publishedGuides.find((guide) => guide.slug === slug) ?? null;
}

export function getGuidesByCategory(category: GuideArticle["category"]) {
  return publishedGuides.filter((guide) => guide.category === category);
}
