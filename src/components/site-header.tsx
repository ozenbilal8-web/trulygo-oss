import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { signOutAction } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SiteHeaderCollaborationNotifications } from "@/components/site-header-collaboration-notifications";
import {
  SiteHeaderDashboardNav,
  type DashboardNavItem,
} from "@/components/site-header-dashboard-nav";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAuthStatus } from "@/lib/auth/session";
import { getCurrentUserLinkVitrineCollaborationNotifications } from "@/lib/link-vitrine-collaboration-data";

const publicNavigation = [
  { href: "/#nasil-calisir", label: "Nasıl çalışır?" },
  { href: "/#guvenlik", label: "Güvenlik" },
  { href: "/#contact", label: "Başla" },
];

type DashboardNavConfig = DashboardNavItem & { adminOnly?: boolean };

const dashboardNavigation: DashboardNavConfig[] = [
  { id: "dashboard", href: "/dashboard", label: "Panelim" },
  { id: "link-vitrine", href: "/dashboard/link-vitrini/new", label: "Link Vitrini" },
  { id: "signal", href: "/dashboard/signal", label: "Anketlerim" },
  { id: "admin", href: "/admin", label: "Admin", adminOnly: true },
];

function getInitials(email?: string | null, username?: string | null) {
  const source = username || email || "TG";
  return source
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizePathname(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

async function getSiteHeaderCollaborationNotifications() {
  try {
    return await getCurrentUserLinkVitrineCollaborationNotifications();
  } catch {
    return {
      ok: false as const,
      error: "unavailable" as const,
      hasVitrine: false,
    };
  }
}

export async function SiteHeader() {
  const requestHeaders = await headers();
  const pathname = normalizePathname(requestHeaders.get("x-trulygo-pathname"));
  const auth = await getAuthStatus();
  const authenticatedData = auth.isAuthenticated
    ? await Promise.all([
        getCurrentProfile(),
        getSiteHeaderCollaborationNotifications(),
      ])
    : null;
  const profile = authenticatedData?.[0] ?? null;
  const initialNotifications = authenticatedData?.[1] ?? null;
  const isAdmin = profile?.role === "admin";
  const dashboardNavItems: DashboardNavItem[] = dashboardNavigation
    .filter((item) => !item.adminOnly || isAdmin)
    .map(({ id, href, label }) => ({ id, href, label }));
  const displayName = profile?.username || profile?.email?.split("@")[0] || auth.email?.split("@")[0] || "TrulyGo";
  const displayEmail = profile?.email || auth.email;
  const initials = getInitials(displayEmail, profile?.username);

  return (
    <header className="site-header-shell">
      <div className="site-header-frame">
        <Link
          href="/"
          className="site-brand micro-link"
          aria-label="TrulyGo ana sayfa"
        >
          <span className="site-brand-mark">
            <Image
              src="/brand/trulygo-mark.svg"
              alt="TrulyGo"
              width={20}
              height={20}
              className="h-[18px] w-auto object-contain"
              priority
              unoptimized
            />
          </span>
          <span className="hidden tracking-normal text-white min-[420px]:inline">
            Truly<span className="text-[var(--color-green-bright)]">Go</span>
          </span>
        </Link>

        {auth.isAuthenticated ? (
          <SiteHeaderDashboardNav
            items={dashboardNavItems}
            initialPathname={pathname}
          />
        ) : (
          <nav className="site-nav" aria-label="Ana gezinme">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-nav-link"
                aria-current={pathname === "/" && item.href === "/#nasil-calisir" ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="site-header-actions">
          {auth.isAuthenticated ? (
            <div className="site-user-strip">
              {initialNotifications ? (
                <SiteHeaderCollaborationNotifications
                  initialResult={initialNotifications}
                />
              ) : null}
              <span className="site-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="site-user-meta">
                <strong>{displayName}</strong>
                {displayEmail ? <span>{displayEmail}</span> : null}
              </span>
              <form action={signOutAction}>
                <PendingSubmitButton
                  className="btn btn-ghost btn-sm whitespace-nowrap"
                  pendingLabel="Çıkılıyor..."
                >
                  Çıkış
                </PendingSubmitButton>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="btn btn-ghost whitespace-nowrap"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="btn btn-primary whitespace-nowrap"
              >
                Hesap Oluştur
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
