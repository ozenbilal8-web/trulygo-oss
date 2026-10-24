import Image from "next/image";
import Link from "next/link";
import { PanelimDashboard } from "./panelim-dashboard";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAuthStatus } from "@/lib/auth/session";
import { getCurrentUserDashboardChannelSummaries } from "@/lib/channel-links";
import { getCurrentUserTotalClicksToday } from "@/lib/link-analytics";
import { getCurrentUserLinkRequests } from "@/lib/link-requests";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

const errorMessages = {
  auth_not_configured:
    "Giriş sistemi şu anda yapılandırılamadı. Lütfen daha sonra tekrar deneyin veya destek ekibiyle iletişime geçin.",
  unauthenticated: "Link talebi oluşturmak için tekrar giriş yapın.",
  invalid_target_url: "Hedef URL geçerli bir http veya https adresi olmalıdır.",
  missing_slug: "Kısa link oluşturmak için önerilen kısa ad alanı gereklidir.",
  invalid_slug:
    "Önerilen kısa ad yalnızca harf, rakam ve tire içerebilir; boşluk ve özel karakter kabul edilmez.",
  immutable_ack_required:
    "Devam etmek için hedef adresin onay sonrası değiştirilemeyeceğini kabul etmelisin.",
  reserved_slug: "Bu kısa ad sistem tarafından ayrılmıştır. Lütfen farklı bir kısa ad deneyin.",
  slug_unavailable: "Bu kısa ad bekleyen veya onaylanmış başka bir talepte kullanılıyor.",
  create_failed: "Link talebi oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
} as const;

const successMessages = {
  link_deleted: "Link silindi.",
  link_request_created: "Link talebi alındı. Admin onayından geçmeden aktif olmayacak.",
  link_request_security_review:
    "Bu bağlantı güvenlik kontrolünden geçemedi ve incelemeye alındı.",
} as const;

type DashboardPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
    message?: keyof typeof successMessages;
  }>;
};

export const metadata = {
  title: "Panelim",
  description:
    "TrulyGo Panelim ekranında onaylı linklerini, kampanya bağlantılarını ve tıklama performansını yönet.",
  robots: NO_INDEX_ROBOTS,
};

function getDashboardName(email?: string | null, username?: string | null) {
  return username || email?.split("@")[0] || "kullanıcı";
}

function PanelimTopbar() {
  return (
    <header className="panelim-topbar">
      <Link className="panelim-brand" href="/" aria-label="TrulyGo ana sayfa">
        <span className="panelim-brand-mark">
          <Image
            alt="TrulyGo"
            height={24}
            priority
            src="/brand/trulygo-mark.svg"
            unoptimized
            width={28}
          />
        </span>
        <span className="panelim-brand-copy">
          <span>
            Truly<span>Go</span>
          </span>
          <i aria-hidden="true" />
          <b>Panelim</b>
        </span>
      </Link>
      <Link className="panelim-back-link" href="/">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Ana sayfaya dön
      </Link>
    </header>
  );
}

function UnauthenticatedPanelim({ isConfigured }: { isConfigured: boolean }) {
  return (
    <main className="panelim-dashboard-shell">
      <div className="panelim-bg" aria-hidden="true">
        <div className="panelim-grid" />
      </div>
      <div className="panelim-app">
        <PanelimTopbar />
        <section className="panelim-auth-card">
          <p className="panelim-eyebrow">
            <span aria-hidden="true" />
            Kullanıcı paneli
          </p>
          <h1>Link oluşturmak için hesap gerekir.</h1>
          <p>
            {isConfigured
              ? "TrulyGo'da link talebi oluşturmak ve link durumlarını takip etmek için hesabınızla giriş yapmanız gerekir."
              : "Giriş sistemi şu anda yapılandırılamadı. Lütfen daha sonra tekrar deneyin veya destek ekibiyle iletişime geçin."}
          </p>
          <div className="panelim-actions">
            <Link className="panelim-button panelim-button--primary" href="/login">
              Giriş Yap
            </Link>
            <Link className="panelim-button panelim-button--muted" href="/register">
              Hesap Oluştur
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    return <UnauthenticatedPanelim isConfigured={auth.isConfigured} />;
  }

  const [profile, linkRequests, appOrigin, todayClicks] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserLinkRequests(),
    getAppOrigin(),
    getCurrentUserTotalClicksToday(),
  ]);
  const channelSummaryMap = await getCurrentUserDashboardChannelSummaries(
    linkRequests.map((request) => request.id),
  );
  const displayEmail = profile?.email ?? auth.email;
  const feedback = params.error
    ? { message: errorMessages[params.error], tone: "error" as const }
    : params.message
      ? { message: successMessages[params.message], tone: "success" as const }
      : null;

  return (
    <PanelimDashboard
      appOrigin={appOrigin}
      channelSummaries={Object.fromEntries(channelSummaryMap.entries())}
      displayName={getDashboardName(displayEmail, profile?.username)}
      feedback={feedback}
      initialCreateOpen={Boolean(params.error)}
      requests={linkRequests}
      todayClicks={todayClicks}
    />
  );
}
