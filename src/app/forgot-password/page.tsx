import Link from "next/link";
import Image from "next/image";
import { requestPasswordResetAction } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

const errorMessages = {
  auth_not_configured:
    "Şu an şifre sıfırlama isteği gönderilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.",
  missing_email: "E-posta alanını doldurun.",
  reset_failed: "Şifre sıfırlama isteği şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
} as const;

const successMessages = {
  sent: "Şifre sıfırlama bağlantısı e-posta adresine gönderildiyse birkaç dakika içinde ulaşır. Gelen kutunda göremiyorsan spam/junk klasörünü de kontrol et.",
} as const;

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
    message?: keyof typeof successMessages;
  }>;
};

export const metadata = {
  title: "Şifremi Unuttum",
  description:
    "TrulyGo hesabının şifresini sıfırlamak için kayıtlı e-posta adresine güvenli bağlantı al.",
  robots: NO_INDEX_ROBOTS,
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;
  const message = params.message ? successMessages[params.message] : null;

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
            Hesap güvenliği
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Şifreni sıfırla
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            E-posta adresini yaz. Hesap kayıtlıysa, şifreni yenileyebileceğin güvenli
            bağlantıyı göndereceğiz.
          </p>

          {error ? (
            <div className="mt-5 rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f] shadow-[0_10px_24px_rgba(141,45,31,0.06)]">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-5 rounded-lg border border-[#80c99a]/55 bg-[var(--color-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[#0d6a3a] shadow-[0_10px_24px_rgba(18,140,74,0.08)]">
              {message}
            </div>
          ) : null}

          <form action={requestPasswordResetAction} className="mt-6 grid gap-4">
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
            <PendingSubmitButton
              className="btn btn-primary mt-2"
              pendingLabel="Gönderiliyor..."
            >
              Sıfırlama bağlantısı gönder
            </PendingSubmitButton>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
            Şifreni hatırladın mı?{" "}
            <Link href="/login" className="micro-link inline-flex font-bold text-[#9ee6b5]">
              Giriş yap
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
