import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getAuthStatus } from "@/lib/auth/session";
import { serializeJsonLd } from "@/lib/seo";
import {
  seoLandingBreadcrumbItems,
  seoLandingPages,
  seoLandingStructuredData,
  type SeoLandingDefinitionItem,
  type SeoLandingPageConfig,
  type SeoLandingPageId,
  type SeoLandingSection,
  type SeoLandingValue,
  type TextCard,
} from "@/lib/seo-landing-pages";

type SeoLandingPageProps = {
  page: SeoLandingPageConfig;
  isAuthenticated: boolean;
  afterHero?: ReactNode;
  discovery?: ReactNode;
};

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/72 sm:text-base">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-green-bright)] shadow-[0_0_10px_rgba(73,181,106,0.65)]"
          />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SeoLandingActions({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <Link href={primaryHref} className="btn btn-primary w-full sm:w-auto">
        {primaryLabel}
      </Link>
      {secondaryHref && secondaryLabel ? (
        <Link href={secondaryHref} className="btn btn-ghost-dark w-full sm:w-auto">
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}

function SeoLandingBreadcrumb({ page }: { page: SeoLandingPageConfig }) {
  const breadcrumbs = seoLandingBreadcrumbItems(page);

  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto w-full max-w-7xl px-4 pt-8 text-sm text-white/62 sm:px-6 lg:px-8"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="flex min-w-0 items-center gap-x-2">
            {index === 0 ? (
              <Link
                href={breadcrumb.path}
                className="rounded-sm font-semibold text-[#9ee6b5] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9ee6b5]"
              >
                {breadcrumb.name}
              </Link>
            ) : (
              <span aria-current="page" className="min-w-0 break-words font-semibold text-white/82">
                {breadcrumb.name}
              </span>
            )}
            {index < breadcrumbs.length - 1 ? (
              <span aria-hidden="true" className="shrink-0 text-white/34">
                &gt;
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SeoHeroVisual({ page }: { page: SeoLandingPageConfig }) {
  const statusLabel =
    page.visual.statusLabel === undefined ? "Public" : page.visual.statusLabel;
  const footerItems = page.visual.footerItems ?? ["Onay", "Kanal", "Analiz"];

  return (
    <aside
      className="relative mx-auto w-full min-w-0 max-w-md lg:mx-0"
      aria-label={`${page.footerLabel} örneği`}
    >
      <div className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.06]">
              <Image
                src="/brand/trulygo-mark.svg"
                alt=""
                width={28}
                height={22}
                className="h-6 w-7 object-contain"
                unoptimized
              />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#9ee6b5]">
                {page.visual.label}
              </p>
              <h2 className="mt-1 break-words text-lg font-semibold text-white [overflow-wrap:anywhere]">
                {page.visual.title}
              </h2>
            </div>
          </div>
          {statusLabel ? (
            <span className="max-w-28 shrink-0 break-words rounded-lg border border-[#9ee6b5]/35 bg-[#9ee6b5]/10 px-2.5 py-1 text-center text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#c9f7d8]">
              {statusLabel}
            </span>
          ) : null}
        </div>

        <p className="mt-5 text-sm leading-6 text-white/70">{page.visual.caption}</p>

        <div className="mt-5 grid gap-2.5">
          {page.visual.rows.map((row, index) => (
            <div
              key={row}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white/82"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#9ee6b5]/12 font-mono text-[0.68rem] font-bold text-[#c9f7d8]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 break-words font-semibold [overflow-wrap:anywhere]">
                {row}
              </span>
              <span aria-hidden="true" className="shrink-0 text-white/42">
                →
              </span>
            </div>
          ))}
        </div>

        {footerItems.length > 0 ? (
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {footerItems.map((item) => (
              <span
                key={item}
                className="break-words rounded-lg border border-white/10 bg-white/[0.035] px-2 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/55"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function SeoLandingHero({
  page,
  isAuthenticated,
}: {
  page: SeoLandingPageConfig;
  isAuthenticated: boolean;
}) {
  const defaultPrimaryHref = isAuthenticated ? page.cta.authHref : page.cta.guestHref;
  const defaultPrimaryLabel = isAuthenticated ? page.cta.authLabel : page.cta.guestLabel;
  const primaryHref = page.heroCta?.primaryHref ?? defaultPrimaryHref;
  const primaryLabel = page.heroCta?.primaryLabel ?? defaultPrimaryLabel;
  const secondaryHref = page.heroCta?.secondaryHref ?? page.cta.secondaryHref;
  const secondaryLabel = page.heroCta?.secondaryLabel ?? page.cta.secondaryLabel;

  return (
    <section className="mx-auto grid min-h-[calc(100vh-11rem)] w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:items-center lg:px-8">
      <div className="min-w-0 text-white">
        <p className="tg-eyebrow tg-eyebrow-mint">{page.eyebrow}</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-normal text-white sm:text-6xl">
          {page.title}
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-white/76 sm:text-lg sm:leading-8">
          {page.description}
        </p>
        <div className="mt-8">
          <SeoLandingActions
            primaryHref={primaryHref}
            primaryLabel={primaryLabel}
            secondaryHref={secondaryHref}
            secondaryLabel={secondaryLabel}
          />
        </div>
        <ul className="mt-7 flex max-w-full flex-wrap gap-2" aria-label="Öne çıkan kullanım alanları">
          {page.chips.map((chip) => (
            <li
              key={chip}
              className="max-w-full break-words rounded-full border border-white/16 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-white/78"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>
      <SeoHeroVisual page={page} />
    </section>
  );
}

function LegacySeoLandingSections({ page }: { page: SeoLandingPageConfig }) {
  if (page.sections) {
    return null;
  }

  return (
    <>
      <section className="landing-section landing-section-dark">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <article className="glass-panel p-5 sm:p-6">
            <p className="tg-eyebrow tg-eyebrow-mint">Ne işe yarar?</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{page.purpose.title}</h2>
            <p className="mt-4 text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
              {page.purpose.description}
            </p>
          </article>
          <article className="glass-panel p-5 sm:p-6">
            <p className="tg-eyebrow tg-eyebrow-mint">Kimler kullanmalı?</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Doğru kullanım alanları</h2>
            <BulletList items={page.audience} />
          </article>
          <article className="glass-panel p-5 sm:p-6">
            <p className="tg-eyebrow tg-eyebrow-mint">TrulyGo ile</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Nasıl kullanılır?</h2>
            <BulletList items={page.workflow} />
          </article>
        </div>
      </section>

      <section className="brand-section py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="tg-eyebrow tg-eyebrow-mint">Örnek senaryolar</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">
              Günlük kampanya akışlarına uyumlu.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {page.scenarios.map((scenario) => (
              <article key={scenario.title} className="glass-panel p-5">
                <h3 className="text-xl font-semibold text-white">{scenario.title}</h3>
                <p className="mt-3 break-words text-sm leading-6 text-white/72">
                  {scenario.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-dark">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:px-8">
          <div>
            <p className="tg-eyebrow tg-eyebrow-mint">TrulyGo avantajları</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">
              Public sayfa sade, ürün işlemleri güvenli panelde.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/72">
              Bu landing sayfası arama motorları ve ziyaretçiler için açıklayıcıdır. Gerçek link,
              QR, UTM ve vitrin yönetimi giriş sonrası Panelim içinde kalır.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {page.advantages.map((advantage) => (
              <div
                key={advantage}
                className="rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold leading-6 text-white/78"
              >
                {advantage}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SeoLandingFaqItems
        eyebrow="SSS"
        title="Sık sorulan sorular"
        items={page.faqs}
        className="brand-section py-16 sm:py-20"
      />
    </>
  );
}

function SeoLandingSectionHeader({ section }: { section: SeoLandingSection }) {
  return (
    <div className="max-w-4xl">
      {section.eyebrow ? (
        <p className="tg-eyebrow tg-eyebrow-mint">{section.eyebrow}</p>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">
        {section.title}
      </h2>
      {section.description ? (
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
          {section.description}
        </p>
      ) : null}
    </div>
  );
}

function SeoLandingCardGrid({
  items,
  columns = "md:grid-cols-2",
}: {
  items: TextCard[];
  columns?: string;
}) {
  return (
    <div className={`mt-10 grid gap-4 ${columns}`}>
      {items.map((item) => (
        <article key={item.title} className="glass-panel min-w-0 p-5 sm:p-6">
          <h3 className="break-words text-xl font-semibold text-white">{item.title}</h3>
          <p className="mt-3 break-words text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
            {item.description}
          </p>
        </article>
      ))}
    </div>
  );
}

function SeoLandingDefinitionList({ items }: { items: SeoLandingDefinitionItem[] }) {
  const detailHeaders =
    items.find((item) => item.details && item.details.length > 0)?.details?.map((detail) => detail.label) ?? [];

  if (detailHeaders.length === 0) {
    return (
      <dl className="mt-10 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.term} className="glass-panel min-w-0 p-5 sm:p-6">
            <dt className="break-words font-mono text-base font-bold text-[#9ee6b5] [overflow-wrap:anywhere]">
              {item.term}
            </dt>
            {item.description ? (
              <dd className="mt-3 break-words text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
                {item.description}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <>
      <dl className="mt-10 grid gap-4 md:hidden">
        {items.map((item) => (
          <div key={item.term} className="glass-panel min-w-0 p-5">
            <dt className="break-words text-xl font-semibold text-white">{item.term}</dt>
            {item.description ? (
              <dd className="mt-2 break-words text-sm leading-6 text-white/68">
                {item.description}
              </dd>
            ) : null}
            <dd className="mt-4">
              <dl className="grid min-w-0 gap-3">
                {detailHeaders.map((header) => {
                  const value = item.details?.find((detail) => detail.label === header)?.value ?? "—";

                  return (
                    <div
                      key={header}
                      className="grid min-w-0 grid-cols-[minmax(7rem,0.46fr)_minmax(0,1fr)] gap-3 border-t border-white/8 pt-3"
                    >
                      <dt className="break-words text-xs font-bold text-white/48 [overflow-wrap:anywhere]">
                        {header}
                      </dt>
                      <dd className="min-w-0 break-words text-right font-mono text-sm font-semibold text-[#c9f7d8] [overflow-wrap:anywhere]">
                        {value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 hidden rounded-xl border border-white/10 bg-white/[0.035] md:block">
        <table className="w-full table-fixed border-collapse text-left" aria-label="Kanal değerleri">
          <thead>
            <tr className="border-b border-white/12 bg-white/[0.035]">
              <th scope="col" className="w-[18%] break-words px-4 py-4 text-sm font-bold text-white">
                Kanal
              </th>
              {detailHeaders.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="break-words px-3 py-4 text-xs font-bold text-white/58 [overflow-wrap:anywhere]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.term} className="border-b border-white/8 last:border-0">
                <th scope="row" className="break-words px-4 py-4 text-sm font-semibold text-white">
                  {item.term}
                </th>
                {detailHeaders.map((header) => {
                  const value = item.details?.find((detail) => detail.label === header)?.value ?? "—";

                  return (
                    <td
                      key={header}
                      className="break-words px-3 py-4 font-mono text-sm font-semibold text-[#c9f7d8] [overflow-wrap:anywhere]"
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SeoLandingExampleValue({ value }: { value: SeoLandingValue }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9ee6b5]">{value.label}</p>
      <code className="mt-3 block whitespace-pre-wrap break-words font-mono text-sm leading-6 text-white/82 [overflow-wrap:anywhere]">
        {value.value}
      </code>
    </div>
  );
}

function SeoLandingExample({ section }: { section: Extract<SeoLandingSection, { type: "example" }> }) {
  return (
    <div className="mt-10 grid min-w-0 gap-4">
      {section.input ? <SeoLandingExampleValue value={section.input} /> : null}
      {section.changes && section.changes.length > 0 ? (
        <dl className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {section.changes.map((change) => (
            <div key={change.label} className="glass-panel min-w-0 p-4">
              <dt className="break-words text-xs font-bold text-white/48 [overflow-wrap:anywhere]">
                {change.label}
              </dt>
              <dd className="mt-2 break-words font-mono text-sm font-semibold text-[#c9f7d8] [overflow-wrap:anywhere]">
                {change.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {section.output ? <SeoLandingExampleValue value={section.output} /> : null}
      {section.notes && section.notes.length > 0 ? <BulletList items={section.notes} /> : null}
    </div>
  );
}

function SeoLandingFaqItems({
  className,
  eyebrow,
  items,
  title,
}: {
  className?: string;
  eyebrow?: string;
  items: TextCard[];
  title: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {eyebrow ? <p className="tg-eyebrow tg-eyebrow-mint">{eyebrow}</p> : null}
        <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white sm:text-5xl">
          {title}
        </h2>
        <div className="mt-9 grid gap-4">
          {items.map((faq) => (
            <article key={faq.title} className="glass-panel p-5 sm:p-6">
              <h3 className="break-words text-lg font-semibold text-white">{faq.title}</h3>
              <p className="mt-3 break-words text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
                {faq.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeoLandingSectionContent({ section }: { section: SeoLandingSection }) {
  switch (section.type) {
    case "prose":
      return (
        <div className="mt-9 max-w-4xl">
          <div className="grid gap-4">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="break-words text-base leading-7 text-white/74 sm:text-lg sm:leading-8">
                {paragraph}
              </p>
            ))}
          </div>
          {section.bullets && section.bullets.length > 0 ? (
            <BulletList items={section.bullets} />
          ) : null}
        </div>
      );
    case "steps":
      return (
        <ol className="mt-10 grid gap-4 lg:grid-cols-3">
          {section.items.map((item, index) => (
            <li key={item.title} className="glass-panel min-w-0 p-5 sm:p-6">
              <span className="font-mono text-xs font-bold text-[#9ee6b5]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 break-words text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 break-words text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      );
    case "definition-list":
      return <SeoLandingDefinitionList items={section.items} />;
    case "example":
      return <SeoLandingExample section={section} />;
    case "scope":
      return <SeoLandingCardGrid items={section.items} />;
    case "comparison":
      return <SeoLandingCardGrid items={section.items} columns="md:grid-cols-2" />;
    case "faq":
      return (
        <div className="mt-9 grid gap-4">
          {section.items.map((faq) => (
            <article key={faq.title} className="glass-panel p-5 sm:p-6">
              <h3 className="break-words text-lg font-semibold text-white">{faq.title}</h3>
              <p className="mt-3 break-words text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
                {faq.description}
              </p>
            </article>
          ))}
        </div>
      );
  }
}

function FlexibleSeoLandingSections({ sections }: { sections: SeoLandingSection[] }) {
  return sections.map((section, index) => (
    <section
      key={`${section.type}-${section.id ?? section.title}`}
      id={section.id}
      className={
        index % 2 === 0
          ? "landing-section landing-section-dark"
          : "brand-section py-16 sm:py-20"
      }
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SeoLandingSectionHeader section={section} />
        <SeoLandingSectionContent section={section} />
      </div>
    </section>
  ));
}

function SeoLandingRelatedLinks({ page }: { page: SeoLandingPageConfig }) {
  if (page.related.length === 0) {
    return null;
  }

  return (
    <section className="landing-section landing-section-dark" aria-labelledby="ilgili-sayfalar-baslik">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="tg-eyebrow tg-eyebrow-mint">İlgili sayfalar</p>
          <h2
            id="ilgili-sayfalar-baslik"
            className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-5xl"
          >
            TrulyGo&apos;da ilgili çözümler
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            Kısa link, UTM, kampanya, kanal ve QR akışlarını birbirini tamamlayan sayfalardan keşfet.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.related.map((relatedId) => {
            const target = seoLandingPages[relatedId];

            return (
              <li key={target.path}>
                <Link
                  href={target.path}
                  className="group flex h-full items-center gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-[#9ee6b5]/40 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9ee6b5]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#9ee6b5]">
                      {target.eyebrow}
                    </span>
                    <span className="mt-1 block break-words text-base font-semibold text-white">
                      {target.footerLabel}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-white/42 transition group-hover:text-[#9ee6b5]">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function SeoLandingCta({
  page,
  isAuthenticated,
}: {
  page: SeoLandingPageConfig;
  isAuthenticated: boolean;
}) {
  const primaryHref = isAuthenticated ? page.cta.authHref : page.cta.guestHref;
  const primaryLabel = isAuthenticated ? page.cta.authLabel : page.cta.guestLabel;

  return (
    <section className="brand-section pb-16 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="landing-cta-panel p-6 text-white sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <p className="tg-eyebrow tg-eyebrow-mint">TrulyGo ile başla</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
              {page.cta.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/76 sm:text-lg">
              {page.cta.description}
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <SeoLandingActions
              primaryHref={primaryHref}
              primaryLabel={primaryLabel}
              secondaryHref={page.cta.secondaryHref}
              secondaryLabel={page.cta.secondaryLabel}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function SeoLandingPage({
  page,
  isAuthenticated,
  afterHero,
  discovery,
}: SeoLandingPageProps) {
  return (
    <main className="app-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(seoLandingStructuredData(page)) }}
      />
      <SeoLandingBreadcrumb page={page} />
      <SeoLandingHero page={page} isAuthenticated={isAuthenticated} />
      {afterHero}
      {page.sections ? (
        <FlexibleSeoLandingSections sections={page.sections} />
      ) : (
        <LegacySeoLandingSections page={page} />
      )}
      <SeoLandingRelatedLinks page={page} />
      {discovery}
      <SeoLandingCta page={page} isAuthenticated={isAuthenticated} />
    </main>
  );
}

export async function SeoLandingRoute({ pageId }: { pageId: SeoLandingPageId }) {
  const auth = await getAuthStatus();

  return <SeoLandingPage page={seoLandingPages[pageId]} isAuthenticated={auth.isAuthenticated} />;
}
