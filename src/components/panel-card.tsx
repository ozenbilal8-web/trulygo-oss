type PanelCardProps = {
  title: string;
  description: string;
  label?: string;
  tone?: "default" | "review" | "approved" | "blocked";
};

const toneStyles = {
  default: "",
  review: "panel-tone-review",
  approved: "panel-tone-approved",
  blocked: "panel-tone-blocked",
};

export function PanelCard({
  title,
  description,
  label,
  tone = "default",
}: PanelCardProps) {
  return (
    <article className={`surface-card-interactive p-5 ${toneStyles[tone]}`}>
      {label ? (
        <p className="mb-4 inline-flex rounded-full border border-[rgba(11,31,58,0.08)] bg-[rgba(11,31,58,0.05)] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          {label}
        </p>
      ) : null}
      <h2 className="text-xl font-semibold text-[var(--color-navy)]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
    </article>
  );
}
