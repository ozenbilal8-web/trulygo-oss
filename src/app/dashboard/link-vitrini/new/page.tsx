import { redirect } from "next/navigation";
import { LinkVitrineEditor } from "../link-vitrini-editor";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAuthStatus } from "@/lib/auth/session";
import {
  createLinkVitrineDraft,
  getCurrentUserLinkVitrine,
  getCurrentUserLinkVitrineProfileViewCount,
} from "@/lib/link-vitrines";
import { getCurrentUserLinkVitrineCollaborationSettingsData } from "@/lib/link-vitrine-collaboration-data";
import { getAppOrigin } from "@/lib/origin";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

const errorMessages = {
  auth_not_configured:
    "Supabase Auth ortam değişkenleri ayarlı değil. Link Vitrini için önce Supabase bağlantısını yapılandırın.",
  invalid_display_name: "Görünen ad 2-40 karakter arasında olmalı.",
  invalid_handle: "Vitrin URL'i 3-32 karakter olmalı; küçük harf, rakam ve tire kullan.",
  invalid_bio: "Kısa açıklama en fazla 140 karakter olabilir.",
  invalid_theme: "Geçerli bir tema seç.",
  missing_platform_url: "Aktif yaptığın platformlar için URL girmelisin.",
  invalid_platform_url: "Platform URL alanlarından biri izin verilen domain ile eşleşmiyor.",
  invalid_platform_label: "Görünen ad en fazla 48 karakter olabilir.",
  invalid_platform_config: "Sosyal platform bilgileri kaydedilemedi. Sayfayı yenileyip tekrar deneyin.",
  invalid_collaboration_settings:
    "İş birliği ayarları geçersiz. E-posta adresini kontrol edip tekrar deneyin.",
  collaboration_save_failed:
    "İş birliği ayarları kaydedilemedi; profil işlemi tamamlanmadı. Lütfen tekrar deneyin.",
  invalid_display_order: "Aktif bağlantılar için Gösterim Sırası zorunlu. Lütfen 1 veya daha büyük bir sayı girin.",
  duplicate_display_order:
    "Bu gösterim sırası başka bir bağlantı tarafından kullanılıyor. Lütfen farklı bir sıra girin.",
  avatar_invalid_type: "Profil fotoğrafı PNG, JPG veya WEBP formatında olmalı.",
  avatar_too_large: "Profil fotoğrafı en fazla 2 MB olabilir.",
  avatar_upload_failed: "Profil fotoğrafı yüklenemedi. Tekrar deneyin.",
  banner_invalid_type: "Sadece JPG, PNG veya WEBP yükleyebilirsin.",
  banner_too_large: "Banner görseli en fazla 5 MB olabilir.",
  banner_upload_failed: "Banner görseli yüklenemedi. Tekrar deneyin.",
  handle_unavailable: "Bu vitrin URL'i başka bir kullanıcı tarafından kullanılıyor.",
  save_failed: "Link Vitrini kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
  not_found: "Link Vitrini bulunamadı.",
  rate_limited: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
  vitrine_already_exists: "Bu kullanıcı için zaten bir Link Vitrini var.",
} as const;

const successMessages = {
  saved: "Link Vitrini kaydedildi.",
  published: "Link Vitrini yayına alındı.",
} as const;

type LinkVitrineNewPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
    message?: keyof typeof successMessages;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Link Vitrini Oluştur",
  description: "Panelim içinden TrulyGo Link Vitrini oluştur veya düzenle.",
  robots: NO_INDEX_ROBOTS,
};

function getDefaultName(email?: string | null, username?: string | null) {
  return username || email?.split("@")[0] || "TrulyGo Kullanıcısı";
}

export default async function NewLinkVitrinePage({ searchParams }: LinkVitrineNewPageProps) {
  const auth = await getAuthStatus();

  if (!auth.isAuthenticated) {
    redirect("/login");
  }

  const [profile, appOrigin, params, existingVitrine] = await Promise.all([
    getCurrentProfile(),
    getAppOrigin(),
    searchParams,
    getCurrentUserLinkVitrine(),
  ]);

  const displayName = getDefaultName(profile?.email ?? auth.email, profile?.username);
  const initialVitrine =
    existingVitrine ??
    createLinkVitrineDraft({
      displayName,
      handle: profile?.username ?? auth.email?.split("@")[0] ?? displayName,
    });
  const initialProfileViewCount = existingVitrine
    ? await getCurrentUserLinkVitrineProfileViewCount()
    : null;
  const defaultCollaborationEmail = auth.email ?? profile?.email ?? "";
  const collaborationSettings =
    await getCurrentUserLinkVitrineCollaborationSettingsData({
      fallbackEmail: defaultCollaborationEmail,
      vitrineId: existingVitrine?.id ?? null,
    });

  const feedback = params.error
    ? { message: errorMessages[params.error], tone: "error" as const }
    : params.message
      ? { message: successMessages[params.message], tone: "success" as const }
      : null;

  return (
    <LinkVitrineEditor
      appOrigin={appOrigin}
      feedback={feedback}
      defaultCollaborationEmail={defaultCollaborationEmail}
      initialCollaborationSettings={collaborationSettings}
      initialProfileViewCount={initialProfileViewCount}
      initialVitrine={initialVitrine}
      mode={existingVitrine ? "edit" : "new"}
    />
  );
}
