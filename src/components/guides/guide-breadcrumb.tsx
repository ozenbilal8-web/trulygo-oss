import Link from "next/link";

type GuideBreadcrumbProps = {
  current?: string;
};

export function GuideBreadcrumb({ current }: GuideBreadcrumbProps) {
  return (
    <nav aria-label="Sayfa yolu" className="text-sm text-white/58">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="micro-link hover:text-white">
            Ana Sayfa
          </Link>
        </li>
        <li aria-hidden="true" className="text-white/30">
          /
        </li>
        <li>
          {current ? (
            <Link href="/rehberler" className="micro-link hover:text-white">
              Rehberler
            </Link>
          ) : (
            <span aria-current="page" className="text-white/82">
              Rehberler
            </span>
          )}
        </li>
        {current ? (
          <>
            <li aria-hidden="true" className="text-white/30">
              /
            </li>
            <li className="max-w-full truncate text-white/82" aria-current="page">
              {current}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
