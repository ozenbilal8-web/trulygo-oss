import { getGuideCategory, getPublishedGuide } from "@/content/guides";
import { createGuideOgImage } from "@/lib/guide-og-image";

type GuideOgRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: GuideOgRouteContext) {
  const { slug } = await params;
  const guide = getPublishedGuide(slug);

  if (!guide) {
    return new Response("Not found", { status: 404 });
  }

  return createGuideOgImage({
    category: getGuideCategory(guide.category).label,
    slug: guide.slug,
    title: guide.title,
  });
}
