import Link from "next/link";
import Image from "next/image";
import { signInAction } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

const errorMessages = {
  auth_not_configured:
    "Şu an giriş yapılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.",
  missing_fields: "E-posta ve şifre alanlarını doldurun.",
  login_failed: "Giriş yapılamadı. Bilgileri kontrol edip tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
  invalid_link:
    "Doğrulama bağlantısı geçersiz ya da süresi dolmuş olabilir.",
} as const;

type LoginPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
  }>;
};

export const metadata = {
  title: "Giriş Yap",
  description:
    "TrulyGo hesabınla giriş yap, link taleplerini ve kanal performansını görüntüle.",
  robots: NO_INDEX_ROBOTS,
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;

  return (
    <main className="auth-shell relative overflow-hidden">
      <section className="relative z-10 mx-auto w-full max-w-xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="auth-card w-[calc(100vw-2rem)] overflow-hidden p-5 sm:w-full sm:p-8">
          <div className="auth-brand">
            <Image
              src="/brand/trulygo-mark.svg"
              alt=""
              width={32}
              height={24}
              unoptimized
            />
            <b>TrulyGo</b>
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#9ee6b5]">
            TrulyGo hesabı
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Hesabına giriş yap.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Linklerini, taleplerini ve kanal analizlerini görmek için giriş yap.
          </p>

          {error ? (
            <div className="mt-5 rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f] shadow-[0_10px_24px_rgba(141,45,31,0.06)]">
              <p>{error}</p>
              {params.error === "invalid_link" ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link
                    href="/forgot-password"
                    className="micro-link inline-flex font-bold text-[#8d2d1f]"
                  >
                    Şifremi sıfırla
                  </Link>
                  <Link
                    href="/register"
                    className="micro-link inline-flex font-bold text-[#8d2d1f]"
                  >
                    Yeni hesap oluştur
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <form action={signInAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-white/85">
              E-posta
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-field"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/85">
              Şifre
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-field"
              />
            </label>
            <Link href="/forgot-password" className="micro-link -mt-1 inline-flex w-fit text-sm font-bold text-[#9ee6b5]">
              Şifremi unuttum
            </Link>
            <PendingSubmitButton
              className="btn btn-primary mt-2"
              pendingLabel="Giriş yapılıyor..."
            >
              Giriş Yap
            </PendingSubmitButton>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
            Henüz hesabın yok mu?{" "}
            <Link href="/register" className="micro-link inline-flex font-bold text-[#9ee6b5]">
              Hesap oluştur
            </Link>
          </p>
          <p className="legal-footer-link">
            <Link href="/terms">Kullanım Şartları</Link>{" ve "}
            <Link href="/privacy">KVKK Aydınlatma Metni</Link>
            {"'ni incelemek için tıklayın."}
          </p>
        </div>
      </section>
    </main>
  );
}
