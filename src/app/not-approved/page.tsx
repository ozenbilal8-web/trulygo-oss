import { NO_INDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Bağlantı Onaylanmadı",
  description:
    "Bu kısa link henüz onaylanmadı veya yayından kaldırıldı. TrulyGo bağlantıları admin onayı tamamlanmadan aktif olmaz.",
  robots: NO_INDEX_ROBOTS,
};

export default function NotApprovedPage() {
  return (
    <main className="auth-shell relative grid place-items-center overflow-hidden px-5 py-16 text-white">
      <section className="glass-panel relative z-10 max-w-[18.5rem] p-6 text-center sm:max-w-2xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-green-soft)]">
          TrulyGo bağlantı durumu
        </p>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
          Bu bağlantı henüz TrulyGo tarafından onaylanmadı veya yayından kaldırıldı.
        </h1>
        <p className="mt-6 text-base leading-7 text-white/70">
          Kısa linkler admin onayı tamamlanmadan aktif hale gelmez. Riskli görülen
          bağlantılar reddedilebilir veya askıya alınabilir.
        </p>
      </section>
    </main>
  );
}
