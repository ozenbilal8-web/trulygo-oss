type CopyShortLinkButtonProps = {
  value: string;
  className?: string;
  idleLabel?: string;
};

export function CopyShortLinkButton({
  value,
  className = "btn btn-secondary btn-sm",
  idleLabel = "Kopyala",
}: CopyShortLinkButtonProps) {
  const buttonClassName = ["copy-short-link-button", className].filter(Boolean).join(" ");
  const ariaLabel = value ? `${value} linkini kopyala` : "Kopyalanacak link bulunamadı";

  return (
    <button
      type="button"
      className={buttonClassName}
      title={value || "Kopyalanacak link bulunamadı"}
      data-trulygo-copy-button=""
      data-copy-url={value}
      data-copy-state="idle"
      data-idle-label={idleLabel}
      aria-label={ariaLabel}
    >
      {idleLabel}
    </button>
  );
}
