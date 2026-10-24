import { redirect } from "next/navigation";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

type LinkVitrineEditPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Link Vitrini",
  description: "TrulyGo Link Vitrini yönetim ekranı.",
  robots: NO_INDEX_ROBOTS,
};

function buildQuery(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string");

      if (first) {
        params.set(key, first);
      }
    }
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

export default async function EditLinkVitrinePage({ searchParams }: LinkVitrineEditPageProps) {
  const query = await searchParams;
  redirect(`/dashboard/link-vitrini/new${buildQuery(query)}`);
}
