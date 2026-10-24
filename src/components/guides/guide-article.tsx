import Image from "next/image";
import Link from "next/link";
import {
  getGuideCategory,
  getPublishedGuide,
  type GuideArticle,
} from "@/content/guides";
import type { GuideBlock, GuideInline } from "@/content/guides/types";
import { GuideBreadcrumb } from "./guide-breadcrumb";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function InlineContent({ content }: { content: GuideInline[] }) {
  return content.map((item, index) => {
    const key = `${item.text}-${index}`;
    let child: React.ReactNode = item.text;

    if (item.emphasis === "strong") {
      child = <strong className="font-semibold text-white">{child}</strong>;
    } else if (item.emphasis === "code") {
      child = (
        <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-[#baf4ca]">
          {child}
        </code>
      );
    }

    if (!item.href) {
      return <span key={key}>{child}</span>;
    }

    if (item.href.startsWith("/")) {
      return (
        <Link key={key} href={item.href} className="font-medium text-[#9ee6b5] underline decoration-[#9ee6b5]/35 underline-offset-4 hover:text-white">
          {child}
        </Link>
      );
    }

    return (
      <a
        key={key}
        href={item.href}
        className="font-medium text-[#9ee6b5] underline decoration-[#9ee6b5]/35 underline-offset-4 hover:text-white"
        rel="noopener noreferrer"
        target="_blank"
      >
        {child}
      </a>
    );
  });
}

function GuideBlockView({ block }: { block: GuideBlock }) {
  if (block.type === "paragraph") {
    return (
      <p className="text-[1.02rem] leading-8 text-white/76">
        <InlineContent content={block.content} />
      </p>
    );
  }

  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";

    return (
      <List
        className={`space-y-3 pl-6 text-[1.02rem] leading-8 text-white/76 ${
          block.ordered ? "list-decimal" : "list-disc marker:text-[#6ee99a]"
        }`}
      >
        {block.items.map((item, index) => (
          <li key={index} className="pl-1">
            <InlineContent content={item} />
          </li>
        ))}
      </List>
    );
  }

  if (block.type === "steps") {
    return (
      <ol className="space-y-4">
        {block.items.map((item, index) => (
          <li
            key={item.title}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:p-5"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6ee99a] text-sm font-bold text-[#0a1c2d]">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 leading-7 text-white/72">
                <InlineContent content={item.content} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#071526]/55">
        <table className="min-w-full border-collapse text-left text-sm leading-6 text-white/76">
          <caption className="border-b border-white/10 px-4 py-3 text-left font-medium text-white/82">
            {block.caption}
          </caption>
          <thead className="bg-white/[0.05] text-white">
            <tr>
              {block.headers.map((header) => (
                <th key={header} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/[0.08] align-top">
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={`${cell}-${cellIndex}`} scope="row" className="min-w-40 px-4 py-3 font-semibold text-white/88">
                      {cell}
                    </th>
                  ) : (
                    <td key={`${cell}-${cellIndex}`} className="min-w-40 px-4 py-3">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-[#6ee99a]/20 bg-[#050d18]">
        {block.label ? (
          <figcaption className="border-b border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/54">
            {block.label}
          </figcaption>
        ) : null}
        <pre className="overflow-x-auto p-4 text-sm leading-7 text-[#baf4ca]">
          <code>{block.code}</code>
        </pre>
      </figure>
    );
  }

  const toneClass = {
    note: "border-sky-300/25 bg-sky-300/[0.07]",
    tip: "border-[#6ee99a]/25 bg-[#6ee99a]/[0.07]",
    warning: "border-amber-300/25 bg-amber-300/[0.07]",
  }[block.tone];

  return (
    <aside className={`rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
      <p className="font-semibold text-white">{block.title}</p>
      <p className="mt-2 leading-7 text-white/72">
        <InlineContent content={block.content} />
      </p>
    </aside>
  );
}

export function GuideArticleView({ guide }: { guide: GuideArticle }) {
  const category = getGuideCategory(guide.category);
  const modified = guide.dateModified !== guide.datePublished;
  const related = guide.relatedArticles
    .map((slug) => getPublishedGuide(slug))
    .filter((item): item is GuideArticle => item !== null);

  return (
    <main className="app-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(63,150,89,0.18),transparent_34%),linear-gradient(180deg,#081321_0%,#0b1b30_55%,#07111f_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <GuideBreadcrumb current={guide.title} />

        <article className="mt-8">
          <header className="max-w-4xl">
            <Link
              href={`/rehberler#${guide.category}`}
              className="inline-flex rounded-full border border-[#6ee99a]/25 bg-[#6ee99a]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#baf4ca] hover:border-[#6ee99a]/50"
            >
              {category.label}
            </Link>
            {guide.hero?.eyebrow ? (
              <p className="mt-5 text-sm font-semibold text-[#9ee6b5]">{guide.hero.eyebrow}</p>
            ) : null}
            <h1 className="mt-5 max-w-4xl text-balance text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.6rem] lg:leading-[1.08]">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/72 sm:text-xl">
              {guide.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/58">
              <span>{guide.publisher.name}</span>
              <span aria-hidden="true">•</span>
              <time dateTime={guide.datePublished}>Yayın: {formatDate(guide.datePublished)}</time>
              {modified ? (
                <>
                  <span aria-hidden="true">•</span>
                  <time dateTime={guide.dateModified}>Güncelleme: {formatDate(guide.dateModified)}</time>
                </>
              ) : null}
            </div>
          </header>

          {guide.hero?.coverImage ? (
            <figure className="mt-10 overflow-hidden rounded-3xl border border-white/10">
              <Image
                src={guide.hero.coverImage}
                alt={guide.hero.coverImageAlt ?? ""}
                width={1200}
                height={630}
                className="h-auto w-full object-cover"
              />
            </figure>
          ) : null}

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,48rem)_minmax(14rem,18rem)] lg:justify-between lg:gap-16">
            <div className="min-w-0 space-y-12">
              {guide.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28 space-y-5">
                  <h2 className="text-balance text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
                    {section.title}
                  </h2>
                  {section.blocks.map((block, index) => (
                    <GuideBlockView key={`${section.id}-${block.type}-${index}`} block={block} />
                  ))}
                </section>
              ))}

              <section className="rounded-3xl border border-[#6ee99a]/25 bg-[linear-gradient(135deg,rgba(63,150,89,0.18),rgba(255,255,255,0.045))] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9ee6b5]">Uygulamaya geç</p>
                <h2 className="mt-3 text-2xl font-bold text-white">{guide.cta.title}</h2>
                <p className="mt-3 max-w-2xl leading-7 text-white/72">{guide.cta.description}</p>
                <Link href={guide.cta.href} className="btn btn-primary btn-lg mt-6 inline-flex">
                  {guide.cta.label}
                </Link>
              </section>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 lg:sticky lg:top-24">
              <nav aria-label="İçindekiler">
                <p className="text-sm font-semibold text-white">İçindekiler</p>
                <ol className="mt-4 space-y-3 text-sm leading-5 text-white/62">
                  {guide.sections.map((section, index) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} className="micro-link flex gap-2 hover:text-[#baf4ca]">
                        <span className="text-white/32">{String(index + 1).padStart(2, "0")}</span>
                        <span>{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          </div>
        </article>

        {related.length > 0 ? (
          <section aria-labelledby="related-guides-title" className="mt-20 border-t border-white/10 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9ee6b5]">Okumaya devam et</p>
                <h2 id="related-guides-title" className="mt-2 text-2xl font-bold text-white">
                  İlgili rehberler
                </h2>
              </div>
              <Link href="/rehberler" className="micro-link text-sm font-semibold text-[#9ee6b5] hover:text-white">
                Tüm rehberleri gör →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/rehberler/${item.slug}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-[#6ee99a]/35 hover:bg-white/[0.055]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ee6b5]">
                    {getGuideCategory(item.category).shortLabel}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold leading-7 text-white group-hover:text-[#d8ffe3]">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/62">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
