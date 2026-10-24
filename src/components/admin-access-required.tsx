import { PageHeading } from "@/components/page-heading";
import type { AdminAccess } from "@/lib/admin-authorization";

function getDescription(access: AdminAccess) {
  if (!access.isConfigured) {
    return "Supabase Auth ortam değişkenleri henüz ayarlı değil. Admin rol kontrolü için önce lokal Supabase yapılandırmasını tamamlayın.";
  }

  if (!access.isAuthenticated) {
    return "Admin panelini görüntülemek için admin rolüne sahip bir hesapla giriş yapmanız gerekir.";
  }

  if (!access.hasProfile) {
    return "Profil kaydı okunamadı. Supabase migration uygulandıktan sonra admin rol kontrolü bu profil kaydı üzerinden yapılır.";
  }

  return `Mevcut rolünüz: ${access.profileRole}. Admin rolü client tarafından değiştirilemez; SQL/admin operasyonuyla atanmalıdır.`;
}

export function AdminAccessRequired({ access }: { access: AdminAccess }) {
  return (
    <main className="app-shell">
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <PageHeading
          eyebrow="Admin paneli"
          title="Bu alan admin yetkisi gerektirir."
          description={getDescription(access)}
        />
      </section>
    </main>
  );
}
