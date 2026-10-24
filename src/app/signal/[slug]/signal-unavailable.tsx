import Image from "next/image";
import Link from "next/link";

export function SignalUnavailable({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <main className="signal-public-shell">
      <div className="signal-public-ambient" aria-hidden="true" />
      <section className="signal-public-missing">
        <Image alt="" height={32} src="/brand/trulygo-mark.svg" unoptimized width={38} />
        <span>TrulyGo Signal</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link href="/">Ana sayfaya dön</Link>
      </section>
    </main>
  );
}
