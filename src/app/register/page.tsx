import Link from "next/link";
import Image from "next/image";
import { signUpAction } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { RegisterConsent } from "@/components/register-consent";
import { RegisterPasswordFields } from "@/components/register-password-fields";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

const errorMessages = {
  auth_not_configured:
    "Şu an hesap oluşturulamıyor. Lütfen birkaç dakika sonra tekrar deneyin.",
  missing_fields: "E-posta ve şifre alanlarını doldurun.",
  password_too_short: "Şifre en az 8 karakter olmalıdır.",
  password_mismatch: "Şifreler eşleşmiyor.",
  password_weak:
    "Şifre yeterince güçlü değil. Lütfen daha uzun ve içinde harf, rakam ve sembol bulunan bir şifre dene.",
  consent_required: "Devam etmek için onay vermeniz gerekiyor.",
  invalid_email: "Lütfen geçerli bir e-posta adresi gir.",
  register_failed: "Hesap oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
} as const;

type RegisterPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
    message?: "check_email";
  }>;
};

export const metadata = {
  title: "Hesap Oluştur",
  description:
    "Link Vitrini, anketler ve kısa link taleplerini TrulyGo’da tek panelden yönetmek için ücretsiz hesap oluştur.",
  robots: NO_INDEX_ROBOTS,
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;
  const showCheckEmail = params.message === "check_email";

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
            Yeni bir hesap oluştur.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Hesabınla Link Vitrini oluştur, anketlerini yönet ve kısa link
            taleplerini tek panelden takip et.
          </p>

          {error ? (
            <div className="mt-5 rounded-lg border border-[#e47d6b]/45 bg-[#fff0ed] px-4 py-3 text-sm font-medium leading-6 text-[#8d2d1f] shadow-[0_10px_24px_rgba(141,45,31,0.06)]">
              {error}
            </div>
          ) : null}

          {showCheckEmail ? (
            <div className="mt-5 rounded-lg border border-[#80c99a]/55 bg-[var(--color-green-soft)] px-4 py-3 text-sm font-medium leading-6 text-[#0d6a3a] shadow-[0_10px_24px_rgba(18,140,74,0.08)]">
              <p className="font-semibold">İsteğini aldık.</p>
              <p className="mt-1">
                Hesabın oluşturulduysa doğrulama bağlantısını e-postana
                gönderdik. Gelen kutunu ve spam klasörünü kontrol etmeyi
                unutma.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#0d6a3a]/80">
                Bu e-posta ile daha önce hesap oluşturduysan
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href="/login"
                  className="micro-link inline-flex font-bold text-[#0d6a3a]"
                >
                  Giriş yap
                </Link>
                <Link
                  href="/forgot-password"
                  className="micro-link inline-flex font-bold text-[#0d6a3a]"
                >
                  Şifremi sıfırla
                </Link>
              </div>
            </div>
          ) : null}

          <form action={signUpAction} className="mt-6 grid gap-4">
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
            <RegisterPasswordFields />
            <div className="auth-banner">
              Kısa link talepleri otomatik kontroller ve gerektiğinde manuel
              incelemeyle değerlendirilir. Onaylanan kısa linkler yayına alınır.
            </div>
            <RegisterConsent />
            <PendingSubmitButton
              className="btn btn-primary mt-2"
              pendingLabel="Oluşturuluyor..."
            >
              Hesap Oluştur
            </PendingSubmitButton>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
            Zaten bir hesabın var mı?{" "}
            <Link href="/login" className="micro-link inline-flex font-bold text-[#9ee6b5]">
              Giriş yap
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
