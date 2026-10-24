"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DashboardNavItem = {
  id: string;
  href: string;
  label: string;
};

function normalizePathname(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function getDashboardActiveId(pathname: string) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (pathname.startsWith("/dashboard/link-vitrini")) {
    return "link-vitrine";
  }

  if (pathname.startsWith("/dashboard/signal")) {
    return "signal";
  }

  if (pathname.startsWith("/dashboard")) {
    return "dashboard";
  }

  return null;
}

export function SiteHeaderDashboardNav({
  items,
  initialPathname,
}: {
  items: DashboardNavItem[];
  initialPathname: string;
}) {
  const livePathname = usePathname();
  const pathname = normalizePathname(livePathname ?? initialPathname);
  const activeId = getDashboardActiveId(pathname);

  return (
    <nav className="site-nav site-nav-dashboard" aria-label="Panel gezinmesi">
      {items.map((item) => (
        <Link
          aria-current={activeId === item.id ? "page" : undefined}
          className="site-nav-link"
          href={item.href}
          key={item.id}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
