import type { GuideCategoryId } from "./types";

export type GuideCategory = {
  id: GuideCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  pillarSlug: string;
};

export const guideCategories = [
  {
    id: "utm-link-takibi",
    label: "UTM ve Link Takibi",
    shortLabel: "UTM ve takip",
    description:
      "Kampanya bağlantılarını tutarlı adlandırma, kanal ayrımı ve doğru yorumlama ilkeleriyle kurmak için uygulamalı rehberler.",
    pillarSlug: "utm-nedir",
  },
  {
    id: "link-vitrini",
    label: "Link Vitrini",
    shortLabel: "Link Vitrini",
    description:
      "Sosyal profillerden yönlendirilen trafiği düzenli, markalı ve yönetilebilir bir bağlantı sayfasında toplamak için rehberler.",
    pillarSlug: "link-vitrini-nedir",
  },
  {
    id: "anket",
    label: "Anket",
    shortLabel: "Anket",
    description:
      "Amacı netleştirmekten soruları yazmaya ve sonuçları sınırlarıyla okumaya kadar çevrim içi anket hazırlama rehberleri.",
    pillarSlug: "online-anket-nasil-hazirlanir",
  },
] as const satisfies readonly GuideCategory[];

export function getGuideCategory(id: GuideCategoryId) {
  const category = guideCategories.find((item) => item.id === id);

  if (!category) {
    throw new Error(`Unknown guide category: ${id}`);
  }

  return category;
}
