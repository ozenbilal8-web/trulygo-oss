type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <div className="page-heading-hero max-w-[22.5rem] sm:max-w-4xl">
      <p className="page-heading-eyebrow">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-normal text-[var(--color-navy)] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">{description}</p>
    </div>
  );
}
