import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { appendUtmParams, extractUtmParams, recordLinkClick } from "@/lib/click-events";
import { deriveClickDeviceInfo, deriveClickLocationInfo } from "@/lib/click-enrichment";
import { buildClickVisitorKey, getClientIpFromHeaders } from "@/lib/click-visitor";
import { getApprovedLinkBySlug } from "@/lib/link-requests";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PublicSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PublicSlugPageProps) {
  const { slug } = await params;
  const approvedLink = await getApprovedLinkBySlug(slug);

  if (approvedLink) {
    return {
      title: "Yönlendiriliyor",
      robots: NO_INDEX_ROBOTS,
    };
  }

  return {
    title: "Link Aktif Değil",
    robots: NO_INDEX_ROBOTS,
  };
}

export default async function PublicSlugPage({ params, searchParams }: PublicSlugPageProps) {
  const { slug } = await params;
  const approvedLink = await getApprovedLinkBySlug(slug);

  if (approvedLink) {
    const requestHeaders = await headers();
    const incomingUtmParams = extractUtmParams(await searchParams);
    const isChannelLink = Boolean(approvedLink.channelLinkId);
    const channelUtmParams = {
      utm_source: approvedLink.utmSource,
      utm_medium: approvedLink.utmMedium,
      utm_campaign: approvedLink.utmCampaign,
      utm_content: approvedLink.utmContent,
      utm_term: null,
    };
    const redirectUtmParams = isChannelLink ? channelUtmParams : incomingUtmParams;
    const recordedUtmParams = isChannelLink
      ? channelUtmParams
      : {
          utm_source: incomingUtmParams.utm_source ?? approvedLink.utmSource,
          utm_medium: incomingUtmParams.utm_medium ?? approvedLink.utmMedium,
          utm_campaign: incomingUtmParams.utm_campaign ?? approvedLink.utmCampaign,
          utm_content: incomingUtmParams.utm_content ?? approvedLink.utmContent,
          utm_term: incomingUtmParams.utm_term,
        };

    const redirectUrl = isChannelLink
      ? appendUtmParams(approvedLink.targetUrl, redirectUtmParams, {
          overwriteExisting: true,
        })
      : appendUtmParams(approvedLink.targetUrl, redirectUtmParams);
    const referrer = requestHeaders.get("referer") ?? requestHeaders.get("referrer");
    const userAgent = requestHeaders.get("user-agent");
    const visitorKey = buildClickVisitorKey({
      cookieHeader: requestHeaders.get("cookie"),
      ipAddress: getClientIpFromHeaders(requestHeaders),
      userAgent,
    });

    after(() =>
      recordLinkClick({
        linkRequestId: approvedLink.id,
        slug: approvedLink.clickedSlug,
        channel: {
          channelLinkId: approvedLink.channelLinkId,
          channelKey: approvedLink.channelKey,
          channelLabel: approvedLink.channelLabel,
        },
        referrer,
        userAgent,
        visitorKey,
        utmParams: recordedUtmParams,
        // Coarse device + approximate location derived after the response so the
        // redirect critical path is unchanged. Raw IP is only used for the
        // visitor hash above — never derived or stored here.
        device: deriveClickDeviceInfo(userAgent),
        location: deriveClickLocationInfo(requestHeaders),
      }),
    );

    redirect(redirectUrl);
  }

  return (
    <main className="auth-shell relative overflow-hidden">
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="glass-panel max-w-3xl p-6 text-white sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-green-soft)]">
            TrulyGo link
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl">
            Bu link aktif değil veya onaylanmamış.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            TrulyGo bağlantıları admin onayından geçmeden yönlendirme yapmaz. Link beklemede,
            reddedilmiş, askıya alınmış veya hiç oluşturulmamış olabilir.
          </p>

          <Link
            href="/"
            className="btn btn-secondary mt-8"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </section>
    </main>
  );
}
