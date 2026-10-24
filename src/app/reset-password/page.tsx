import Link from "next/link";
import Image from "next/image";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

export const metadata = {
  title: "Şifreyi Sıfırla",
  description:
    "E-posta ile aldığın güvenli bağlantı üzerinden TrulyGo hesabının yeni şifresini belirle.",
  robots: NO_INDEX_ROBOTS,
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const linkError = Boolean(
    params.error || params.error_code || params.error_description,
  );

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
            Yeni şifre belirle
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Yeni şifren en az 8 karakter olmalı. Güncelleme tamamlanınca paneline
            yönlendirileceksin.
          </p>

          <ResetPasswordForm linkError={linkError} />

          <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
            Zaten giriş yapabiliyor musun?{" "}
            <Link href="/login" className="micro-link inline-flex font-bold text-[#9ee6b5]">
              Giriş yap
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
