import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAccessRequired } from "@/components/admin-access-required";
import { AdminSectionNav } from "@/components/admin-section-nav";
import { PageHeading } from "@/components/page-heading";
import { getAdminAccess } from "@/lib/admin-authorization";
import { formatAdminDateTime } from "@/lib/admin-date";
import {
  adminUserStatusLabels,
  adminUserStatusTones,
  normalizeAdminUsersPage,
} from "@/lib/admin-users";
import { getAdminUsersPage } from "@/lib/admin-users-server";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

type AdminUsersPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export const metadata = {
  title: "Admin Kullanıcıları",
  description: "TrulyGo admin panelinde kullanıcı hesaplarını ve link özetlerini görüntüle.",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const access = await getAdminAccess();

  if (!access.isAdmin) {
    return <AdminAccessRequired access={access} />;
  }

  const params = await searchParams;
  const requestedPage = normalizeAdminUsersPage(params.page);
  const result = await getAdminUsersPage(requestedPage);

  if (result.ok && result.page > result.totalPages) {
    redirect(`/admin/users?page=${result.totalPages}`);
  }

  return (
    <main className="app-shell">
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading
          eyebrow="Admin paneli"
          title="Kullanıcı hesaplarını güvenli bir operasyon görünümünde izle."
          description="Auth bilgileri yalnız server-side admin doğrulamasından sonra alınır; son giriş, son aktivite anlamına gelmez."
        />

        <AdminSectionNav active="users" />

        {!result.ok ? (
          <section className="admin-console mt-10 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[var(--color-navy)]">
              Kullanıcı bilgileri yüklenemedi.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              Auth veya kullanıcı özet servisi şu anda yanıt vermiyor. Credential ayrıntıları güvenlik nedeniyle gösterilmedi.
            </p>
          </section>
        ) : (
          <>
            {result.overviewUnavailable ? (
              <div className="mt-6 max-w-3xl rounded-lg border border-[#e6c46b]/45 bg-[#fff8e7] px-4 py-3 text-sm font-medium leading-6 text-[#7a5a10]">
                Link sayısı ve Link Vitrini bilgileri yüklenemedi. Auth hesap bilgileri gösterilmeye devam ediyor.
              </div>
            ) : null}

            <section className="admin-console mt-10 p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-green)]">
                    Hesap görünümü
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--color-navy)]">
                    Kullanıcılar
                  </h2>
                </div>
                <p className="status-pill border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-muted)]">
                  {result.total.toLocaleString("tr-TR")} hesap
                </p>
              </div>

              {result.users.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {result.users.map((user) => {
                    const emailLabel = user.email ?? "E-posta bulunamadı";

                    return (
                      <article className="admin-request-card p-4" key={user.id}>
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p
                              className="break-all text-base font-bold text-[var(--color-navy)]"
                              title={user.email ?? undefined}
                            >
                              {emailLabel}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              Auth hesabı
                            </p>
                          </div>
                          <span className={`status-pill ${adminUserStatusTones[user.status]}`}>
                            {adminUserStatusLabels[user.status]}
                          </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm text-[var(--color-muted)] sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="font-bold text-[var(--color-navy)]">Kayıt tarihi</dt>
                            <dd>
                              {formatAdminDateTime(user.createdAt, "Tarih bilinmiyor")}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-bold text-[var(--color-navy)]">Son giriş</dt>
                            <dd>
                              {formatAdminDateTime(
                                user.lastSignInAt,
                                user.lastSignInAt ? "Tarih bilinmiyor" : "Henüz giriş yapmadı",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-bold text-[var(--color-navy)]">
                              Oluşturulan link sayısı
                            </dt>
                            <dd>
                              {user.linkCount === null
                                ? "Yüklenemedi"
                                : user.linkCount.toLocaleString("tr-TR")}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-bold text-[var(--color-navy)]">Link Vitrini</dt>
                            <dd>
                              {user.hasLinkVitrine === null
                                ? "Yüklenemedi"
                                : user.hasLinkVitrine
                                  ? "Vitrin var"
                                  : "Vitrin yok"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-page)] px-4 py-5 text-sm leading-6 text-[var(--color-muted)]">
                  Bu sayfada kullanıcı bulunmuyor.
                </p>
              )}

              <nav
                aria-label="Kullanıcı sayfaları"
                className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-[var(--color-muted)]">
                  Sayfa {result.page} / {result.totalPages} · Sayfa başına {result.pageSize}
                </p>
                <div className="flex gap-2">
                  {result.hasPreviousPage ? (
                    <Link
                      className="btn btn-ghost btn-sm"
                      href={`/admin/users?page=${result.page - 1}`}
                    >
                      Önceki
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="btn btn-ghost btn-sm">
                      Önceki
                    </span>
                  )}
                  {result.hasNextPage ? (
                    <Link
                      className="btn btn-ghost btn-sm"
                      href={`/admin/users?page=${result.page + 1}`}
                    >
                      Sonraki
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="btn btn-ghost btn-sm">
                      Sonraki
                    </span>
                  )}
                </div>
              </nav>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
