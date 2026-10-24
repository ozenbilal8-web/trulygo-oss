import Link from "next/link";
import {
  getGuidesByCategory,
  guideCategories,
  getGuideCategory,
} from "@/content/guides";
import { GuideBreadcrumb } from "./guide-breadcrumb";

export function GuideIndex() {
  return (
    <main className="app-shell min-h-screen bg-[radial-gradient(circle_at_top,rgba(63,150,89,0.2),transparent_35%),linear-gradient(180deg,#081321_0%,#0b1b30_55%,#07111f_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <GuideBreadcrumb />

        <header className="mt-10 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9ee6b5]">Kaynak merkezi</p>
          <h1 className="mt-4 text-balance text-4xl font-bold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            TrulyGo Rehberler
          </h1>
          <p className="mt-5 text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl">
            Linklerini daha bilinçli kur, ölç ve yönet
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72 sm:text-xl">
            UTM etiketlerinden kanal bağlantılarına, Link Vitrini’nden çevrim içi ankete kadar uygulanabilir ve ürün sınırlarını açıkça anlatan Türkçe rehberler.
          </p>
        </header>

        <nav aria-label="Rehber kategorileri" className="mt-8 flex flex-wrap gap-3">
          {guideCategories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-white/76 transition hover:border-[#6ee99a]/35 hover:text-white"
            >
              {category.label}
            </a>
          ))}
        </nav>

        <div className="mt-16 space-y-20">
          {guideCategories.map((category) => {
            const categoryGuides = getGuidesByCategory(category.id);
            const pillar = categoryGuides.find((guide) => guide.slug === category.pillarSlug);
            const supporting = categoryGuides.filter((guide) => guide.slug !== category.pillarSlug);

            return (
              <section key={category.id} id={category.id} className="scroll-mt-24" aria-labelledby={`${category.id}-title`}>
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9ee6b5]">İçerik kümesi</p>
                  <h2 id={`${category.id}-title`} className="mt-2 text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
                    {category.label}
                  </h2>
                  <p className="mt-3 leading-7 text-white/66">{category.description}</p>
                </div>

                {pillar ? (
                  <Link
                    href={`/rehberler/${pillar.slug}`}
                    className="group mt-7 grid gap-5 rounded-3xl border border-[#6ee99a]/25 bg-[linear-gradient(135deg,rgba(63,150,89,0.2),rgba(255,255,255,0.04))] p-6 transition hover:border-[#6ee99a]/45 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#baf4ca]">Başlangıç rehberi</p>
                      <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{pillar.title}</h3>
                      <p className="mt-3 max-w-3xl leading-7 text-white/68">{pillar.description}</p>
                    </div>
                    <span className="font-semibold text-[#baf4ca] group-hover:text-white">Rehberi oku →</span>
                  </Link>
                ) : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {supporting.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/rehberler/${guide.slug}`}
                      className="group flex min-h-56 flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-[#6ee99a]/35 hover:bg-white/[0.055]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ee6b5]">
                        {getGuideCategory(guide.category).shortLabel}
                      </p>
                      <h3 className="mt-3 text-xl font-semibold leading-7 text-white group-hover:text-[#d8ffe3]">
                        {guide.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">{guide.description}</p>
                      <span className="mt-auto pt-5 text-sm font-semibold text-[#9ee6b5]">Okumaya başla →</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
