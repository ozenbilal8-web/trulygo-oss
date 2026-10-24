import { SITE_HOST } from "@/lib/seo";
import Link from "next/link";
import { buildVitrineInitials } from "@/lib/link-vitrine-config";
import type { LinkVitrineSummary } from "@/lib/link-vitrines";

export function LinkVitrineDiscovery({ vitrines }: { vitrines: LinkVitrineSummary[] }) {
  if (vitrines.length < 3) {
    return null;
  }

  return (
    <section className="brand-section py-16 sm:py-20" aria-labelledby="vitrin-kesfet-baslik">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="tg-eyebrow tg-eyebrow-mint">Yayındaki vitrinler</p>
          <h2
            id="vitrin-kesfet-baslik"
            className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-5xl"
          >
            TrulyGo ile oluşturulmuş Link Vitrinleri
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            Yayında olan örnek public profillerden bazıları. Her biri kendi
            <span className="font-mono text-white/82"> /v/handle </span>
            adresinde paylaşılır.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vitrines.map((vitrine) => (
            <li key={vitrine.handle}>
              <Link
                href={`/v/${vitrine.handle}`}
                className="group flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-[#9ee6b5]/40 hover:bg-white/[0.07]"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-[#9ee6b5]/12 text-sm font-bold text-[#c9f7d8]">
                  {vitrine.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      decoding="async"
                      loading="lazy"
                      src={vitrine.avatarUrl}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    buildVitrineInitials(vitrine.displayName)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-white">
                    {vitrine.displayName}
                  </span>
                  <span className="block truncate text-sm text-white/55">
                    {SITE_HOST}/v/{vitrine.handle}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-white/42 transition group-hover:text-[#9ee6b5]"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
