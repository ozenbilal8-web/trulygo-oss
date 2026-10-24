import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, PUBLIC_ROBOTS, SITE_NAME, canonicalUrl, localizedAlternates } from "@/lib/seo";

export type SeoLandingPageId =
  | "linkVitrini"
  | "signalAnketOlusturucu"
  | "bitlyAlternatifi"
  | "utmLinkOlusturucu"
  | "qrKodOlusturucu"
  | "whatsappLinkOlusturucu"
  | "kampanyaLinkiOlusturma"
  | "kanalLinkiOlusturma"
  | "linkKisaltma";

export type TextCard = {
  title: string;
  description: string;
};

export type SeoLandingValue = {
  label: string;
  value: string;
};

export type SeoLandingDefinitionItem = {
  term: string;
  description?: string;
  details?: SeoLandingValue[];
};

type SeoLandingSectionBase = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
};

export type SeoLandingSection =
  | (SeoLandingSectionBase & {
      type: "prose";
      paragraphs: string[];
      bullets?: string[];
    })
  | (SeoLandingSectionBase & {
      type: "steps";
      items: TextCard[];
    })
  | (SeoLandingSectionBase & {
      type: "definition-list";
      items: SeoLandingDefinitionItem[];
    })
  | (SeoLandingSectionBase & {
      type: "example";
      input?: SeoLandingValue;
      changes?: SeoLandingValue[];
      output?: SeoLandingValue;
      notes?: string[];
    })
  | (SeoLandingSectionBase & {
      type: "scope";
      items: TextCard[];
    })
  | (SeoLandingSectionBase & {
      type: "comparison";
      items: TextCard[];
    })
  | (SeoLandingSectionBase & {
      type: "faq";
      items: TextCard[];
    });

type SeoLandingPageBase = {
  path: string;
  footerLabel: string;
  footerOrder: number | null;
  breadcrumbLabel?: string;
  eyebrow: string;
  title: string;
  description: string;
  metadataTitle: string;
  metadataDescription: string;
  chips: string[];
  related: SeoLandingPageId[];
  visual: {
    label: string;
    title: string;
    caption: string;
    rows: string[];
    statusLabel?: string | null;
    footerItems?: string[];
  };
  heroCta?: {
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
  };
  cta: {
    title: string;
    description: string;
    authHref: string;
    guestHref: string;
    authLabel: string;
    guestLabel: string;
    secondaryHref: string;
    secondaryLabel: string;
  };
};

type LegacySeoLandingPageContent = {
  sections?: undefined;
  purpose: TextCard;
  audience: string[];
  workflow: string[];
  scenarios: TextCard[];
  advantages: string[];
  faqs: TextCard[];
};

type FlexibleSeoLandingPageContent = {
  sections: SeoLandingSection[];
};

export type SeoLandingPageConfig = SeoLandingPageBase &
  (LegacySeoLandingPageContent | FlexibleSeoLandingPageContent);

export const seoLandingPages: Record<SeoLandingPageId, SeoLandingPageConfig> = {
  linkVitrini: {
    path: "/link-vitrini",
    footerLabel: "Link Vitrini",
    footerOrder: 10,
    related: [
      "signalAnketOlusturucu",
      "qrKodOlusturucu",
      "linkKisaltma",
      "whatsappLinkOlusturucu",
    ],
    eyebrow: "Bio link ve public profil",
    title: "Bağlantılarını Tek Bir Link Vitrini’nde Topla",
    description:
      "Sosyal medya, mesajlaşma, web sitesi ve desteklenen mağaza bağlantılarını yönetilebilir bir /v/[handle] profilinde bir araya getir.",
    metadataTitle: "Link Vitrini Oluşturma ve Bio Link Sayfası | TrulyGo",
    metadataDescription:
      "Sosyal medya, web sitesi, WhatsApp ve mağaza bağlantılarını tek /v/[handle] profilinde topla; tema, görsel, sıralama, sponsor etiketi ve QR paylaşımını Panelim’de yönet.",
    chips: ["/v/[handle] profili", "10 tema", "Sponsor etiketi", "QR paylaşımı"],
    sections: [
      {
        type: "prose",
        eyebrow: "Tek public adres",
        title: "Link Vitrini nedir?",
        paragraphs: [
          "Link Vitrini; sosyal medya, mesajlaşma, web sitesi ve desteklenen mağaza bağlantılarını tek bir /v/[handle] adresinde toplayan yönetilebilir public profildir. Profil oluşturma, düzenleme ve yayınlama işlemleri hesapla giriş yapılan Panelim alanında yapılır.",
          "/link-vitrini, özelliği anlatan ürün sayfasıdır. Kullanıcının gerçek profili ise yalnız yayınlandıktan sonra dışarıdan açılabilen /v/[handle] adresidir; vitrin içeriği Panelim’den daha sonra güncellenebilir.",
        ],
      },
      {
        type: "comparison",
        eyebrow: "İki farklı bağlantı modeli",
        title: "Link Vitrini ile kısa link arasındaki fark",
        items: [
          {
            title: "Link Vitrini",
            description:
              "Tek profilde birden fazla kullanıcı tanımlı hedef gösterir. Profil metni, görselleri, bağlantıları, sırası ve yayın durumu sonradan yönetilebilir.",
          },
          {
            title: "Onaylı ana kısa link",
            description:
              "Tek hedefe yönlendiren kısa slug kullanır ve onaylanan hedef URL sonradan değiştirilmez. Farklı hedef için yeni kısa link gerekir.",
          },
          {
            title: "Vitrindeki dış bağlantılar",
            description:
              "Kartların hedef URL’lerini kullanıcı girer. Bu kartlar ayrıca TrulyGo kısa yönlendirme linki değildir ve hedeflerinin TrulyGo tarafından onaylandığı anlamına gelmez.",
          },
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Profil kimliği ve görseller",
        title: "Profil yapısını Panelim’de yönet",
        items: [
          {
            term: "Handle, görünen ad ve bio",
            description:
              "Normalize edilen handle public adresi belirler; görünen ad ve en fazla 140 karakterlik bio profil kimliğini tamamlar.",
          },
          {
            term: "Avatar",
            description:
              "PNG, JPEG veya WebP avatar yüklenebilir. Sunucu ve editör dosya boyutunu en fazla 2 MB ile sınırlar.",
          },
          {
            term: "Banner",
            description:
              "PNG, JPEG veya WebP banner en fazla 5 MB olabilir; görsel, önizleme üzerinde sürüklenerek yatay ve dikey konumlandırılabilir.",
          },
          {
            term: "Tema ve yayın durumu",
            description:
              "Seçilen tema profil görünümünü belirler. Taslak içerik Panelim’de kalır; public erişim için profilin yayınlanması gerekir.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Kodda bulunan platformlar",
        title: "Desteklenen bağlantı türleri",
        items: [
          {
            title: "Sosyal medya",
            description:
              "Instagram, Facebook, X / Twitter, LinkedIn, YouTube, TikTok, Twitch ve Kick profilleri eklenebilir.",
          },
          {
            title: "Mesajlaşma ve topluluk",
            description:
              "WhatsApp, Telegram ve Discord bağlantıları sosyal platformlar alanında yönetilir.",
          },
          {
            title: "Web sitesi",
            description:
              "Website seçeneği geçerli bir HTTP veya HTTPS adresini profile eklemek için kullanılabilir.",
          },
          {
            title: "Desteklenen mağaza profilleri",
            description:
              "Hepsiburada, Trendyol, Amazon, n11, idefix, PttAVM, ÇiçekSepeti ve Pazarama mağaza adresleri desteklenir.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Kontrollü görünürlük",
        title: "Bağlantı yönetimi ve sıralama",
        items: [
          {
            title: "Aynı platforma birden fazla bağlantı ekle",
            description:
              "Bir platform altında birden fazla hesap veya mağaza URL’si tutulabilir ve her kayda özel bir görünen etiket verilebilir.",
          },
          {
            title: "Platform grubunu aktif veya pasif yönet",
            description:
              "Aktiflik seçimi platform grubuna uygulanır; aynı platformdaki bağlantılar bu görünürlük durumunu birlikte taşır.",
          },
          {
            title: "Gösterim sırasını belirle",
            description:
              "Her bağlantıya global bir gösterim sırası verilir. Public profilde yalnız aktif, geçerli HTTP/HTTPS hedefleri bu sıraya göre gösterilir.",
          },
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Tema ve önizleme",
        title: "Görsel özelleştirme seçenekleri",
        items: [
          {
            term: "10 tema",
            description:
              "Koyu Premium, Minimal Açık, Yeşil Glow, Cam Efekti ve Sade Siyah dâhil toplam 10 kaynak tema arasından seçim yapılabilir.",
          },
          {
            term: "Avatar ve banner konumu",
            description:
              "Profil görselleri tema ile birlikte düzenlenir; banner odağı sürükleme hareketiyle ayarlanır.",
          },
          {
            term: "Düzenle ve Önizleme",
            description:
              "Editör sekmeleri ve telefon önizlemesi, yayınlamadan önce profilin bağlantılarını ve görünümünü kontrol etmeyi sağlar.",
          },
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Bağlantı bazında vurgu",
        title: "Sponsor etiketi ve animasyon",
        items: [
          {
            term: "Reklam · Sponsorlu · İş Birliği",
            description:
              "Sponsor etiketi bağlantı bazında seçilir ve kartta görünür. Sponsorlu dış hedefler arama motorlarına sponsorlu ve kullanıcı içeriği olarak işaretlenir.",
          },
          {
            term: "Yumuşak Pulse · Hafif Sallanma",
            description:
              "Bağlantı bazında açılan görsel dikkat animasyonlarından iki seçenektir.",
          },
          {
            term: "Neon Çerçeve · Parıltı Geçişi · Glow Nefes",
            description:
              "Diğer animasyon seçenekleridir; animasyon kullanmak tıklama veya performans artışı garantisi vermez.",
          },
          {
            term: "Beyan sorumluluğu",
            description:
              "Görünür etiket teknik işaretlemeyi destekler ancak hukuki uyumluluğu otomatik sağlamaz; iş birliğinin doğru beyanından kullanıcı sorumludur.",
          },
        ],
      },
      {
        type: "prose",
        eyebrow: "Public erişim ve arama motorları",
        title: "Yayınlamak ile indexlenebilir olmak aynı şey değildir",
        paragraphs: [
          "Taslak veya yayınlanmamış profil /v/[handle] public sayfasında sunulmaz. Yayınlanan profil dışarıdan açılabilir; buna rağmen yayın durumu tek başına arama motoru indexlenebilirliği sağlamaz.",
          "TrulyGo’nun indexlenebilirlik değerlendirmesi, profilin gerçek ve yeterli public içerik taşımasını arar. Bu değerlendirmeyi geçmek de bir arama motorunun profili gerçekten indexleyeceğini veya sıralayacağını garanti etmez.",
        ],
        bullets: [
          "Geçerli ve normalize edilmiş 3–32 karakterlik bir handle gerekir.",
          "Otomatik “TrulyGo kullanıcısı” placeholder’ı yerine gerçek bir görünen ad gerekir.",
          "Bio veya en az bir aktif ve güvenli HTTP/HTTPS bağlantı gerekir.",
        ],
      },
      {
        type: "prose",
        eyebrow: "Doğrudan profil adresi",
        title: "Link Vitrini QR’ı nasıl çalışır?",
        paragraphs: [
          "Kaydedilmiş Link Vitrini için ortak QR bileşeniyle renk seçenekli PNG veya SVG çıktısı hazırlanabilir; yüklenen logo PNG’ye eklenir, SVG logosuz oluşturulur. QR içeriği doğrudan /v/[handle] adresidir; ek bir kısa redirect slug oluşturulmaz.",
          "Profilin QR üzerinden dışarıdan açılabilmesi için yayınlanmış olması gerekir. QR görseli tek başına analytics üretmez; Vitrin QR’ı kanal tıklama analizi veya fiziksel kamera taraması ölçümü sağlamaz.",
        ],
      },
      {
        type: "prose",
        eyebrow: "Public anket kartı",
        title: "Signal anketini Vitrin’de göster",
        paragraphs: [
          "Bir Link Vitrini’ne bağlı Signal anketi, yalnız published durumundayken ve “Link Vitrini’nde göster” seçeneği açıkken profilde kart olarak yer alabilir. Taslak ve kapalı anketler aktif oy kartı sorgusuna girmez.",
          "Kart /signal/[slug] public anket sayfasına gider ve tamamlanmış katılımcı sayısı sıfırdan büyükse bu sayıyı gösterebilir. Link Vitrini bulunmayan veya Vitrin’e bağlı olmayan anket otomatik olarak bir profile eklenmez.",
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "Link Vitrini hakkında sık sorulan sorular",
        items: [
          {
            title: "Link Vitrini nedir?",
            description:
              "Birden fazla sosyal, iletişim, web sitesi ve mağaza bağlantısını yönetilebilir tek /v/[handle] public profilinde toplar.",
          },
          {
            title: "/link-vitrini ile /v/[handle] arasındaki fark nedir?",
            description:
              "/link-vitrini ürün tanıtım sayfasıdır; /v/[handle] ise yayınlanmış kullanıcı profilinin gerçek public adresidir.",
          },
          {
            title: "Link Vitrini oluşturmak için hesap gerekir mi?",
            description:
              "Evet. Profil oluşturma, düzenleme, kaydetme ve yayınlama işlemleri Panelim’de oturum açılarak yapılır.",
          },
          {
            title: "Profil yayınlanmadan dışarıdan açılır mı?",
            description:
              "Hayır. Public profil sorgusu yalnız yayınlanmış Vitrin’i getirir; taslak veya yayınlanmamış profil public olarak sunulmaz.",
          },
          {
            title: "Bir platform için birden fazla bağlantı eklenebilir mi?",
            description:
              "Evet. Aynı platform altında birden fazla URL ve özel görünen etiket eklenebilir; aktiflik durumu platform grubu için birlikte yönetilir.",
          },
          {
            title: "Sponsorlu bağlantılar nasıl belirtilir?",
            description:
              "Bağlantı bazında Reklam, Sponsorlu veya İş Birliği etiketi seçilebilir; sponsorlu dış hedef ayrıca sponsorlu ve kullanıcı içeriği olarak işaretlenir.",
          },
          {
            title: "Linklere animasyon eklenebilir mi?",
            description:
              "Evet. Beş doğrulanmış animasyondan biri bağlantı bazında açılabilir; bu seçenek tıklama artışı garantisi vermez.",
          },
          {
            title: "Link Vitrini QR ile paylaşılabilir mi?",
            description:
              "Evet. Kaydedilmiş Vitrin için doğrudan /v/[handle] adresini taşıyan QR çıktısı hazırlanabilir; public açılış için profil yayınlanmalıdır.",
          },
          {
            title: "QR üzerinden gelen Vitrin ziyaretleri kanal analizi olarak ölçülür mü?",
            description:
              "Hayır. Vitrin QR’ı ek kanal kısa linki üretmez ve QR görseli tek başına analytics ya da fiziksel tarama verisi oluşturmaz.",
          },
          {
            title: "Yayınlanan her Vitrin Google’da indexlenir mi?",
            description:
              "Hayır. Yayının yanında geçerli handle, gerçek görünen ad ve yeterli public içerik koşulları değerlendirilir; arama motorunun indexlemesi yine garanti edilmez.",
          },
          {
            title: "Signal anketi Vitrin’de gösterilebilir mi?",
            description:
              "Evet; anket Vitrin’e bağlı, published durumda ve “Link Vitrini’nde göster” seçeneği açık olmalıdır.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili Link Vitrini",
      title: "example.invalid/v/marka",
      caption: "Yönetilebilir profil öğeleri ve kullanıcı tanımlı hedefler tek public adreste.",
      rows: [
        "Profil ve bio",
        "Sosyal ve mağaza bağlantıları",
        "Sponsor etiketi ve animasyon",
        "QR ile paylaşım",
      ],
      statusLabel: "Public profil",
      footerItems: ["Düzenle", "Önizle", "Yayınla"],
    },
    cta: {
      title: "Bağlantılarını yönetilebilir bir public profilde topla.",
      description:
        "Link Vitrini’ni Panelim’de oluştur; profilini, bağlantı sırasını, görünümü ve yayın durumunu tek yerden yönet.",
      authHref: "/dashboard/link-vitrini/new",
      guestHref: "/register",
      authLabel: "Link Vitrini oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/anket-olusturucu",
      secondaryLabel: "Signal anketlerini incele",
    },
  },
  signalAnketOlusturucu: {
    path: "/anket-olusturucu",
    footerLabel: "Anket Oluşturucu",
    footerOrder: 20,
    related: [
      "linkVitrini",
      "qrKodOlusturucu",
      "whatsappLinkOlusturucu",
      "kampanyaLinkiOlusturma",
    ],
    eyebrow: "TrulyGo Signal",
    title: "Cevaba Göre İlerleyen Bir Online Anket Oluştur",
    description:
      "Çok sorulu bir public anket hazırla; belirli cevaba bağlı tek seviyeli ek soruyu, sonuç görünürlüğünü ve yayın yaşam döngüsünü Panelim’de yönet.",
    metadataTitle: "Online Anket Oluşturucu ve Dallanan Sorular | TrulyGo",
    metadataDescription:
      "Çok sorulu online anket oluştur; seçilen cevaba bağlı ek soruları, sonuç görünürlüğünü, taslak-yayın-kapalı durumlarını ve Link Vitrini kartını TrulyGo Signal ile yönet.",
    chips: ["1–20 ana soru", "Tek seviyeli ek soru", "Public oy linki", "Sonuç görünürlüğü"],
    sections: [
      {
        type: "comparison",
        eyebrow: "Public tercih toplama",
        title: "TrulyGo Signal nedir, ne değildir?",
        items: [
          {
            title: "Çok sorulu public anket",
            description:
              "Anket oluşturma ve yönetme Panelim’de yapılır. Published durumundaki anket, katılımcının hesap açmasını istemeyen /signal/[slug] public bağlantısından oy kabul eder.",
          },
          {
            title: "Sınırlı dallanma modeli",
            description:
              "Her ana soruda en fazla bir tetikleyici cevaba bağlı tek ek soru bulunabilir; iç içe dallar veya genel amaçlı koşul motoru yoktur.",
          },
          {
            title: "Genel amaçlı form veya analiz ürünü değil",
            description:
              "Signal ödeme, sipariş, CRM, sınav, kimlik doğrulama veya bilimsel araştırma aracı değildir; satış, conversion ya da yapay zekâ analizi üretmez.",
          },
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Doğrulanan editör sınırları",
        title: "Anket yapısı ve mevcut sınırlar",
        items: [
          {
            term: "1–20 ana soru",
            description:
              "Bir ankette en az bir, en fazla yirmi ana soru bulunabilir.",
          },
          {
            term: "2–6 ana soru seçeneği",
            description:
              "Her ana soru en az iki, en fazla altı seçenek taşır.",
          },
          {
            term: "Bir isteğe bağlı ek soru",
            description:
              "Her ana soru, kendi seçeneklerinden yalnız birine bağlanan en fazla bir ek soru içerebilir.",
          },
          {
            term: "2–4 ek soru seçeneği",
            description:
              "Cevaba bağlı ek soru en az iki, en fazla dört seçenek taşır ve içinde ikinci bir dal bulunmaz.",
          },
        ],
      },
      {
        type: "example",
        eyebrow: "Tek seviyeli akış örneği",
        title: "Cevaba bağlı ek soru nasıl çalışır?",
        input: {
          label: "Ana soru",
          value: "Hangi içerik türünü daha çok görmek istersin?",
        },
        changes: [
          {
            label: "Seçenekler",
            value: "Oyun · Donanım · Teknoloji",
          },
          {
            label: "Tetikleyici",
            value: "Donanım",
          },
          {
            label: "Ek soru",
            value: "Hangi donanım kategorisi? — Ekran kartı · İşlemci · Monitör",
          },
        ],
        output: {
          label: "Katılımcı akışı",
          value: "Ek soru yalnız Donanım seçeneğini işaretleyen katılımcıya gösterilir.",
        },
        notes: [
          "Oyun veya Teknoloji cevabını veren katılımcı ek soruyu görmez.",
          "Bir ana soruda ikinci bir ek soru dalı, ek sorunun içinde de yeni bir dal oluşturulamaz.",
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Anket yaşam döngüsü",
        title: "Taslak, yayında ve kapalı yaşam döngüsü",
        items: [
          {
            term: "Taslak",
            description:
              "Panelim’de düzenlenebilir; public sorgu taslak anketi getirmez ve slug gerçek 404 sonucuna gider.",
          },
          {
            term: "Yayında",
            description:
              "/signal/[slug] bağlantısı soruları gösterir ve yeni oy kabul eder. İlk yayın zamanı tutulur; uygun anket Vitrin kartında gösterilebilir.",
          },
          {
            term: "Kapalı",
            description:
              "Public sayfa kapalı durumunu gösterir, soruları public sorguya göndermez ve yeni oy kabul etmez. Önceki sonuçlar sahibin panelinde korunur.",
          },
          {
            term: "Yeniden yayınlama",
            description:
              "Sahip sonuç ekranı taslak veya kapalı anketi yeniden published durumuna alabilir; bu kontrol Panelim’de kalır.",
          },
        ],
      },
      {
        type: "prose",
        eyebrow: "Katılımcı akışı",
        title: "Public oy verme bağlantısı",
        paragraphs: [
          "Published anket /signal/[slug] adresinden açılır ve katılımcının TrulyGo hesabıyla giriş yapmasını istemez. Katılımcı her görünür ana soruyu, tetikleyici cevabı seçtiyse ilgili ek soruyu da yanıtlayarak oyu tamamlar.",
          "Tekrar oyları azaltmak için anket bazlı tarayıcı çerezi, anketle sınırlandırılmış soft-dedup özeti ve hız limitleri birlikte kullanılır. Bunlar gerçek kimliği doğrulamaz; “her kişi kesinlikle yalnız bir kez oy verir” veya tam anonimlik garantisi vermez.",
        ],
        bullets: [
          "Eksik, geçersiz veya taslak slug gerçek 404 sonucu üretir.",
          "Kapalı anket public durum ekranını korur ancak yeni oy kabul etmez.",
          "Server, görünen ana ve tetiklenmiş ek soru cevaplarını kayıttan önce doğrular.",
        ],
      },
      {
        type: "comparison",
        eyebrow: "Ayar ve sonuç ekranları",
        title: "Sonuç görünürlüğü ve panel sonuçları",
        items: [
          {
            title: "Oy verenlere sonuçları göster",
            description:
              "showResultsToVoters açık olduğunda katılımcı, oyunu tamamladıktan sonra soru ve seçenek dağılımlarını görebilir.",
          },
          {
            title: "Sonuçları katılımcıya kapat",
            description:
              "Ayar kapalıysa katılımcı teşekkür mesajını görür; public ekranda sonuç dağılımı yerine sonuçların yalnız anket sahibine açık olduğu belirtilir.",
          },
          {
            title: "Sahip panelindeki toplu sonuçlar",
            description:
              "Panel toplam katılımcı, toplam ana + ek soru cevabı, ana soru tamamlanma oranı, seçenek oyları, yuvarlanmış yüzdeler ve ek soru dağılımlarını gösterir.",
          },
        ],
      },
      {
        type: "prose",
        eyebrow: "Profil içi dağıtım",
        title: "Signal anketini Link Vitrini’nde göster",
        paragraphs: [
          "Bir Signal anketi kullanıcının Link Vitrini kaydına bağlanabilir. Kart için anketin published durumda olması, aynı Vitrin’e bağlı olması ve “Link Vitrini’nde göster” seçeneğinin açık olması gerekir.",
          "Uygun kart /signal/[slug] oy sayfasına gider; tamamlanmış katılımcı sayısı sıfırdan büyükse kartta gösterilebilir. Taslak, kapalı, Vitrin’e bağlı olmayan veya göster seçeneği kapalı anket otomatik kart olmaz.",
        ],
      },
      {
        type: "scope",
        eyebrow: "Yorumlama ve sorumluluk",
        title: "Veri ve ölçüm sınırları",
        items: [
          {
            title: "Tercih dağılımı, bilimsel temsil değil",
            description:
              "Sonuçlar ankete katılanların seçimlerini toplar; örneklemin bilimsel olarak temsil edici veya istatistiksel açıdan güvenilir olduğunu garanti etmez.",
          },
          {
            title: "Kimlik ve dönüşüm çıkarımı yok",
            description:
              "Signal kişisel profil ya da demografi çıkarmaz; sonuçlar satış, gelir, lead, müşteri niyeti veya conversion kanıtı değildir.",
          },
          {
            title: "Hassas veri isteme",
            description:
              "Sağlık, ödeme, parola, kimlik ve benzeri hassas kişisel verileri soru veya seçenek metnine yazmamak gerekir.",
          },
          {
            title: "Otomatik uyumluluk garantisi yok",
            description:
              "Araç tam anonimlik veya KVKK uyumluluğu garantisi vermez; anket sahibi hazırladığı soruların içeriğinden sorumludur.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Uygun karar soruları",
        title: "Gerçekçi kullanım örnekleri",
        items: [
          {
            title: "Yayın saati veya konusu",
            description:
              "Topluluğa bir sonraki yayın zamanı, formatı veya içerik başlığı sorulabilir.",
          },
          {
            title: "Ürün ya da paket tercihi",
            description:
              "Sunulması düşünülen seçenekler arasında katılımcı tercihi toplanabilir; bu sonuç satış tahmini değildir.",
          },
          {
            title: "Etkinlik tarihi veya formatı",
            description:
              "Etkinlik planındaki birkaç alternatif public anket bağlantısıyla karşılaştırılabilir.",
          },
          {
            title: "İçerik ve topluluk geri bildirimi",
            description:
              "İçerik kategorisi veya topluluğun görmek istediği başlıklar çok sorulu akışla sorulabilir.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "TrulyGo Signal hakkında sık sorulan sorular",
        items: [
          {
            title: "TrulyGo Signal nedir?",
            description:
              "Çok sorulu, tek seviyeli cevaba bağlı ek soru içerebilen ve /signal/[slug] public bağlantısından paylaşılabilen anket alanıdır.",
          },
          {
            title: "Bu sayfada doğrudan anket oluşturulur mu?",
            description:
              "Hayır. /anket-olusturucu ürünü açıklar; gerçek oluşturma, düzenleme ve yayınlama işlemleri Panelim’de yapılır.",
          },
          {
            title: "Anket oluşturmak için hesap gerekir mi?",
            description:
              "Evet. Anket sahibi oluşturma, yönetme, yayınlama ve sonuç görüntüleme için hesapla giriş yapar.",
          },
          {
            title: "Katılımcı oy vermek için hesap açmalı mı?",
            description:
              "Hayır. Published public anket katılımcıdan TrulyGo oturumu istemeden oy akışını sunar.",
          },
          {
            title: "Bir ankette kaç soru ve seçenek kullanılabilir?",
            description:
              "Anket 1–20 ana soru içerebilir; ana soruda 2–6, isteğe bağlı ek soruda 2–4 seçenek bulunabilir.",
          },
          {
            title: "Cevaba bağlı ek soru nasıl çalışır?",
            description:
              "Ana sorudaki belirli bir seçenek tetikleyici olur; yalnız bu seçeneği işaretleyen katılımcı ilgili ek soruyu görür.",
          },
          {
            title: "Bir soruda birden fazla veya iç içe dal oluşturulabilir mi?",
            description:
              "Hayır. Her ana soruda en fazla bir ek soru vardır ve bu ek sorunun içinde ikinci bir dal bulunmaz.",
          },
          {
            title: "Taslak, yayında ve kapalı durumları ne anlama gelir?",
            description:
              "Taslak public açılmaz; yayında olan anket oy kabul eder; kapalı anket durum ekranını gösterir fakat yeni oy kabul etmez.",
          },
          {
            title: "Oy verenler sonuçları görebilir mi?",
            description:
              "Yalnız showResultsToVoters ayarı açıksa ve oy tamamlandıktan sonra dağılım gösterilir; ayar kapalıysa katılımcı teşekkür mesajını görür.",
          },
          {
            title: "Anket sahibi hangi sonuçları görebilir?",
            description:
              "Sahip paneli tamamlanan katılımcı sayısını, toplam cevapları, ana soru tamamlanma oranını ve soru, seçenek, ek soru dağılımlarını gösterir.",
          },
          {
            title: "Signal anketi Link Vitrini’nde gösterilebilir mi?",
            description:
              "Evet; anket bir Vitrin’e bağlı, published durumda ve göster seçeneği açık olmalıdır.",
          },
          {
            title: "Anket sonuçları bilimsel veya temsil edici midir?",
            description:
              "Hayır. Sonuçlar yalnız ankete katılanların tercih dağılımıdır; bilimsel temsil veya istatistiksel güven garantisi taşımaz.",
          },
          {
            title: "Hassas kişisel veri sorulmalı mı?",
            description:
              "Hayır. Sağlık, ödeme, parola, kimlik ve benzeri hassas bilgiler soru ya da seçenek metinlerinde istenmemelidir.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili Signal anketi",
      title: "example.invalid/signal/anket",
      caption: "Ana sorular, tek seviyeli ek soru ve sonuç görünürlüğü aynı public akışta.",
      rows: [
        "Ana sorular",
        "Cevaba bağlı ek soru",
        "Sonuç görünürlüğü",
        "Link Vitrini kartı",
      ],
      statusLabel: "Public anket",
      footerItems: ["Taslak", "Yayınla", "Sonuçlar"],
    },
    cta: {
      title: "Cevaba göre ilerleyen Signal anketini oluştur.",
      description:
        "Soruları, tek seviyeli ek soru akışını, sonuç görünürlüğünü ve yayın durumunu Panelim’de yönet.",
      authHref: "/dashboard/signal/new",
      guestHref: "/register",
      authLabel: "Anket oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/link-vitrini",
      secondaryLabel: "Link Vitrini’ni incele",
    },
  },
  bitlyAlternatifi: {
    path: "/bitly-alternatifi",
    footerLabel: "Bitly Alternatifi",
    footerOrder: 70,
    related: [
      "linkKisaltma",
      "utmLinkOlusturucu",
      "kanalLinkiOlusturma",
      "qrKodOlusturucu",
      "kampanyaLinkiOlusturma",
    ],
    eyebrow: "Karar rehberi",
    title: "Bitly’ye Alternatif Güvenli Kısa Link Yönetimi",
    description:
      "Bitly benzeri bir kısa link hizmeti ararken TrulyGo’nun onay, değiştirilemez hedef URL, UTM, kanal linkleri, QR ve tıklama analizi yaklaşımını kendi ihtiyacınla karşılaştır.",
    metadataTitle: "Bitly Alternatifi: Güvenli Kısa Link Yönetimi | TrulyGo",
    metadataDescription:
      "Onaylı ve değiştirilemez hedef URL yaklaşımı, UTM oluşturma, kanal linkleri, QR ve tıklama analiziyle TrulyGo’nun hangi kullanım senaryolarında alternatif olduğunu incele.",
    chips: ["Onay modeli", "Değiştirilemez hedef", "UTM ve kanallar", "QR paylaşımı"],
    sections: [
      {
        type: "prose",
        eyebrow: "Karar kriterleri",
        title: "Bir Bitly alternatifi seçerken neyi değerlendirmelisin?",
        paragraphs: [
          "Kısa link hizmetlerini yalnız bağlantının uzunluğuna göre karşılaştırmak yeterli değildir. Hedef URL’nin sonradan değişip değişememesi, linkin nasıl onaylandığı ve hangi ölçüm yüzeylerinin gerçekten mevcut olduğu da kararın parçasıdır.",
          "Bu sayfa Bitly’nin güncel ürün kapsamı hakkında iddia kurmaz. Karşılaştırma, yalnız TrulyGo kodunda ve mevcut arayüzünde doğrulanan özellikleri açıklar.",
        ],
        bullets: [
          "Hedef URL’nin değiştirilebilirliği ve link onay modeli",
          "UTM adlandırma ve kanal bazlı ayrı link ihtiyacı",
          "QR üretimi ve public Link Vitrini paylaşımı",
          "Tıklama analizinin kapsamı ve ölçmediği sonuçlar",
          "Ekip, entegrasyon, özel domain veya toplu taşıma gibi ayrıca doğrulanması gereken ihtiyaçlar",
        ],
      },
      {
        type: "definition-list",
        eyebrow: "TrulyGo yaklaşımı",
        title: "Doğrulanmış kısa link yönetim modeli",
        items: [
          {
            term: "Hesapla yönetilen talep",
            description:
              "Hedef URL, kısa slug ve isteğe bağlı kampanya adı Panelim’de bir link talebi olarak oluşturulur.",
          },
          {
            term: "Güvenlik ve onay",
            description:
              "Talep güvenlik kontrolleri ile onay akışından geçer; her talebin otomatik veya belirli bir sürede onaylanacağı garanti edilmez.",
          },
          {
            term: "Değiştirilemez hedef URL",
            description:
              "Onaylanan linkin hedef adresi kullanıcı tarafından sonradan değiştirilemez. Farklı hedef için yeni link talebi gerekir.",
          },
          {
            term: "Tıklama ve trafik analizi",
            description:
              "Onaylı kısa linklerde tıklama, zaman, kanal, cihaz, işletim sistemi ve yaklaşık konum kırılımları görülebilir.",
          },
        ],
      },
      {
        type: "prose",
        eyebrow: "Güvenlik tercihi",
        title: "Değiştirilemez hedef URL ne anlama gelir?",
        paragraphs: [
          "TrulyGo’da onaylanan bir kısa linkin hedef URL’si kullanıcı tarafından başka bir adrese çevrilemez. Dağıtılmış bağlantının hedefini değiştirmek yerine yeni hedef için yeni bir talep oluşturulur.",
          "Bu yaklaşım rakibe göre genel bir güvenlik üstünlüğü iddia etmez; farklı bir ürün ve güvenlik tercihidir.",
        ],
      },
      {
        type: "scope",
        eyebrow: "Doğrulanmış araçlar",
        title: "TrulyGo’da hangi bağlantı araçları bulunur?",
        items: [
          {
            title: "Public UTM oluşturucu",
            description:
              "Üyelik olmadan UTM parametreli hedef URL hazırlar; tek başına kısa link veya TrulyGo tıklama kaydı oluşturmaz.",
          },
          {
            title: "Kanal linkleri",
            description:
              "Onaylı ana linkten Instagram, WhatsApp, QR ve diğer dağıtım noktaları için ayrı kısa linkler üretilebilir.",
          },
          {
            title: "Markalı QR",
            description:
              "Onaylı linkin QR kanalı ve kaydedilmiş Link Vitrini adresi için renk ve logo seçenekli QR çıktıları alınabilir.",
          },
          {
            title: "Link Vitrini",
            description:
              "Birden fazla bağlantıyı public bir profil adresinde toplar; Signal anketleri ise ayrı bir ürün alanıdır.",
          },
        ],
      },
      {
        type: "comparison",
        eyebrow: "Uygun kullanım",
        title: "Hangi ihtiyaçlarda TrulyGo’yu değerlendirebilirsin?",
        items: [
          {
            title: "Onaylı kısa link akışı",
            description:
              "Linkin hedefini sonradan değiştirmek yerine yeni hedef için yeni link oluşturmayı tercih ediyorsan.",
          },
          {
            title: "Çok kanallı dağıtım",
            description:
              "Aynı hedefe giden Instagram, WhatsApp, e-posta veya QR trafiğini ayrı kısa linklerle ayırmak istiyorsan.",
          },
          {
            title: "UTM ve kısa link birlikteliği",
            description:
              "Hedef sitenin analytics sistemi için UTM kullanırken TrulyGo yönlendirme tıklamalarını da incelemek istiyorsan.",
          },
          {
            title: "Public profil ve QR",
            description:
              "Bağlantılarını Link Vitrini’nde toplamak veya desteklenen TrulyGo adreslerini QR ile paylaşmak istiyorsan.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Karşılaştırma sınırı",
        title: "Hangi beklentileri ayrıca doğrulamalısın?",
        description:
          "Bir özelliği koddan doğrulamadan var ya da yok saymak yerine, karar öncesinde güncel ürün kapsamını kontrol et.",
        items: [
          {
            title: "Belirli kurumsal ihtiyaçlar",
            description:
              "Özel domain, ekip yönetimi, dış entegrasyon veya toplu taşıma gibi belirli bir ihtiyacın varsa karar vermeden önce TrulyGo’nun güncel ürün kapsamını kontrol et.",
          },
          {
            title: "Toplu Bitly taşıması",
            description:
              "Mevcut üründe otomatik toplu Bitly içe aktarma akışı bulunmuyor; taşıma planında bağlantıların orijinal hedef URL’lerle TrulyGo’da yeniden oluşturulmasını hesaba kat.",
          },
          {
            title: "Rakip ve paket bilgileri",
            description:
              "Bu sayfa Bitly’nin güncel özellikleri, fiyatı, paketi, kotası veya limitleri hakkında karşılaştırma yapmaz.",
          },
          {
            title: "Ölçüm sınırı",
            description:
              "TrulyGo link tıklamalarını ve trafik kırılımlarını raporlar; satış, gelir, lead veya conversion sonucu ölçmez.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Geçiş kontrolü",
        title: "Karar vermeden önce bu sırayı izle",
        items: [
          {
            title: "İhtiyacını yaz",
            description:
              "Kısa link, UTM, kanal, QR, Link Vitrini ve analiz beklentilerini ayrı ayrı listele.",
          },
          {
            title: "Hedef modelini değerlendir",
            description:
              "Değiştirilemez hedef URL yaklaşımının dağıtım ve yönetişim sürecine uyup uymadığını kontrol et.",
          },
          {
            title: "Taşıma yöntemini planla",
            description:
              "Otomatik toplu içe aktarma varsaymadan mevcut linklerin orijinal hedef URL’lerle nasıl yeniden oluşturulacağını belirle.",
          },
          {
            title: "Güncel kapsamı kontrol et",
            description:
              "Ekip, özel domain veya entegrasyon gibi kritik gereksinimleri karar vermeden önce doğrula.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "Bitly alternatifi hakkında sık sorulan sorular",
        items: [
          {
            title: "TrulyGo Bitly yerine kullanılabilir mi?",
            description:
              "Onaylı kısa link, UTM, kanal linkleri, QR ve tıklama analizi ihtiyaçların mevcut TrulyGo kapsamıyla eşleşiyorsa alternatif olarak değerlendirilebilir.",
          },
          {
            title: "TrulyGo Bitly’nin tüm özelliklerini sunar mı?",
            description:
              "TrulyGo, Bitly’nin bütün özelliklerini birebir sunduğunu iddia etmez. Farklı bir onay ve değiştirilemez hedef URL yaklaşımına odaklanır.",
          },
          {
            title: "TrulyGo’nun temel farkı nedir?",
            description:
              "Link taleplerinin güvenlik ve onay akışından geçmesi ve onaylanan hedef URL’nin kullanıcı tarafından sonradan değiştirilememesidir.",
          },
          {
            title: "Hedef URL sonradan değiştirilebilir mi?",
            description:
              "Hayır. Onaylı kısa linkin hedefi değiştirilemez; farklı hedef için yeni link talebi oluşturulur.",
          },
          {
            title: "UTM ve kanal linkleri destekleniyor mu?",
            description:
              "Evet. Public UTM aracı URL üretir; onaylı ana linkten ayrı kanal kısa linkleri oluşturulabilir.",
          },
          {
            title: "QR kod oluşturulabilir mi?",
            description:
              "Evet. Onaylı linkin QR kanalı ve kaydedilmiş Link Vitrini adresi için QR çıktısı alınabilir.",
          },
          {
            title: "Özel domain veya entegrasyon ihtiyacında ne yapılmalı?",
            description:
              "Karar vermeden önce TrulyGo’nun güncel ürün kapsamını bu belirli gereksinim için ayrıca doğrulamalısın.",
          },
          {
            title: "Mevcut Bitly linkleri otomatik taşınır mı?",
            description:
              "Mevcut üründe otomatik toplu Bitly içe aktarma akışı bulunmuyor. Bağlantıların orijinal hedef URL’lerle TrulyGo’da yeniden oluşturulmasını planlamalısın.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili karar akışı",
      title: "İhtiyaç → doğrulanmış kapsam",
      caption: "Karar kriterlerini TrulyGo’nun mevcut ve doğrulanmış özellikleriyle eşleştir.",
      rows: ["Onay modelini incele", "Hedef URL kuralını değerlendir", "Kanal ve QR ihtiyacını yaz", "Güncel kapsamı doğrula"],
      statusLabel: "Karşılaştırma",
      footerItems: ["Onay", "Kanal", "QR"],
    },
    cta: {
      title: "TrulyGo’nun kısa link yaklaşımını kendi akışında değerlendir.",
      description:
        "Onaylı kısa link talebini oluşturmak ve mevcut yönetim araçlarını kullanmak için Panelim’e geç.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "TrulyGo’da kısa link oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/link-kisaltma",
      secondaryLabel: "Link kısaltma yaklaşımını incele",
    },
  },
  utmLinkOlusturucu: {
    path: "/utm-link-olusturucu",
    footerLabel: "UTM Link Oluşturucu",
    footerOrder: 40,
    related: [
      "kampanyaLinkiOlusturma",
      "kanalLinkiOlusturma",
      "linkKisaltma",
      "qrKodOlusturucu",
    ],
    eyebrow: "Ücretsiz public araç",
    title: "UTM Linkini Oluştur, Parametreleri Doğru Adlandır",
    description:
      "Kaynak, kanal ve kampanya parametrelerini doğru adlandır; üyelik olmadan UTM linkini oluştur, kopyala ve istersen TrulyGo ile kısaltıp takip et.",
    metadataTitle: "Ücretsiz UTM Link Oluşturucu ve Parametre Rehberi | TrulyGo",
    metadataDescription:
      "Kaynak, kanal ve kampanya parametrelerini doğru adlandır; üyelik olmadan UTM linkini oluştur, kopyala ve istersen TrulyGo ile kısaltıp takip et.",
    chips: [
      "Üyelik gerektirmez",
      "Tarayıcıda anında oluşturulur",
      "Veritabanına kaydedilmez",
      "UTM parametre rehberi",
    ],
    heroCta: {
      primaryHref: "#utm-link-olusturucu",
      primaryLabel: "UTM linki oluştur",
      secondaryHref: "/link-kisaltma",
      secondaryLabel: "Link kısaltmayı incele",
    },
    sections: [
      {
        type: "definition-list",
        eyebrow: "Parametre rehberi",
        title: "UTM parametreleri ne anlatır?",
        description:
          "Her alan farklı bir soruyu yanıtlar. Tutarlı değerler kullanmak, hedef sitenin analytics raporlarını daha okunur hâle getirir.",
        items: [
          {
            term: "utm_source",
            description:
              "Trafiğin geldiği kaynak. Örnek: instagram, youtube, newsletter.",
          },
          {
            term: "utm_medium",
            description:
              "Kanal veya dağıtım biçimi. Örnek: social, video, email, offline.",
          },
          {
            term: "utm_campaign",
            description:
              "Aynı kampanyaya ait linkleri bir arada tanımlayan tutarlı kampanya adı.",
          },
          {
            term: "utm_content",
            description:
              "Aynı kanal veya kampanya içindeki farklı buton, görsel veya yerleşimi ayırmak için isteğe bağlı alan.",
          },
          {
            term: "utm_term",
            description:
              "Anahtar kelime veya hedefleme bilgisini taşımak için isteğe bağlı alan.",
          },
        ],
      },
      {
        type: "prose",
        eyebrow: "Tutarlı veri",
        title: "UTM değerlerini nasıl adlandırmalısın?",
        paragraphs: [
          "UTM adları ekip içinde ortak bir kurala bağlandığında aynı kaynak ve kampanya farklı yazımlarla parçalanmaz. Bu öneriler analiz araçlarının zorunlu kıldığı kurallar değil, rapor tutarlılığını koruyan pratiklerdir.",
        ],
        bullets: [
          "Küçük harf kullan; instagram ve Instagram gibi iki ayrı değer oluşmasını önle.",
          "Boşluk yerine tire kullan; örneğin yaz-lansmani.",
          "Aynı kampanya adını bütün kanallarda tutarlı tut.",
          "Türkçe karakterlerin farklı analiz araçlarında farklılaşabileceğini hesaba kat.",
          "UTM alanlarına kişisel veri, e-posta, telefon veya başka hassas bilgiler yazma.",
        ],
      },
      {
        type: "example",
        eyebrow: "Gerçek URL örneği",
        title: "Normal query ve hash korunarak UTM değerlerini yenile",
        input: {
          label: "Girdi",
          value:
            "https://site.com/urun?ref=hero&UTM_SOURCE=youtube&utm_medium=video&utm_campaign=eski#detay",
        },
        changes: [
          { label: "utm_source", value: "instagram" },
          { label: "utm_medium", value: "social" },
          { label: "utm_campaign", value: "yaz-lansmani" },
          { label: "utm_content", value: "hikaye-buton" },
        ],
        output: {
          label: "Sonuç",
          value:
            "https://site.com/urun?ref=hero&utm_source=instagram&utm_medium=social&utm_campaign=yaz-lansmani&utm_content=hikaye-buton#detay",
        },
        notes: [
          "Büyük ve küçük harf UTM varyasyonları temizlenir.",
          "Eski aynı UTM alanları yeni değerlerle değiştirilir.",
          "ref=hero gibi UTM dışındaki query parametreleri korunur.",
          "#detay hash bölümü korunur.",
        ],
      },
      {
        type: "prose",
        eyebrow: "Overwrite davranışı",
        title: "URL’de mevcut UTM parametreleri varsa ne olur?",
        paragraphs: [
          "Public oluşturucu hedef URL’deki utm_source, utm_medium, utm_campaign, utm_content ve utm_term anahtarlarını büyük/küçük harfe duyarsız biçimde temizler. Ardından forma yazdığın değerleri yalnız lowercase standart anahtarlarla ekler.",
          "Boş bıraktığın isteğe bağlı utm_content veya utm_term alanı yeni URL’ye eklenmez. UTM dışındaki parametreler ile URL’nin hash bölümü aynı kalır.",
        ],
      },
      {
        type: "scope",
        eyebrow: "Ölçüm sınırı",
        title: "UTM ve kısa link hangi ölçümleri sağlamaz?",
        description:
          "Analiz aracının kurulumu ve dönüşüm ölçümü ayrı adımlardır.",
        items: [
          {
            title: "Analytics bağlantısı",
            description:
              "TrulyGo, hedef sitenin analytics sistemini otomatik bağlamaz.",
          },
          {
            title: "Dönüşüm sınırı",
            description:
              "UTM veya kısa link üretimi tek başına satış, gelir ya da conversion ölçümü sağlamaz.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "UTM linkleri hakkında sık sorulan sorular",
        items: [
          {
            title: "utm_source ile utm_medium arasındaki fark nedir?",
            description:
              "utm_source trafiğin geldiği belirli kaynağı, utm_medium ise dağıtım biçimini anlatır. Örneğin source=instagram ve medium=social birlikte kullanılabilir.",
          },
          {
            title: "utm_content ve utm_term ne zaman kullanılır?",
            description:
              "utm_content farklı buton, görsel veya yerleşimleri ayırmak; utm_term ise anahtar kelime ya da hedefleme bilgisini taşımak için isteğe bağlıdır.",
          },
          {
            title: "URL’de mevcut UTM parametreleri varsa ne olur?",
            description:
              "Mevcut UTM anahtarları case-insensitive temizlenir ve formdaki yeni değerler lowercase standart anahtarlarla yazılır. Normal query ve hash korunur.",
          },
          {
            title: "Oluşturduğum bağlantı veritabanına kaydedilir mi?",
            description:
              "Hayır. Public araç URL’yi tarayıcıda oluşturur. Kısaltma CTA’sına geçtiğinde draft en fazla iki saat sessionStorage içinde tutulur; kısa link talebi ise Panelim’de ayrı bir işlem olarak oluşturulur.",
          },
          {
            title: "UTM bağlantısını kısalttığımda parametreler kaybolur mu?",
            description:
              "UTM parametreleri hedef URL’nin parçası olarak kalır. Kanal linki oluşturursan source, medium, campaign ve content o kanalın değerleriyle bilinçli olarak değiştirilebilir.",
          },
          {
            title: "UTM linki oluşturmak tıklamaları TrulyGo’da otomatik ölçer mi?",
            description:
              "Hayır. Public araç yalnız URL üretir. TrulyGo tıklama analizi için bağlantıyı ayrıca TrulyGo ile kısaltıp onaylı kısa link üzerinden paylaşman gerekir.",
          },
        ],
      },
    ],
    visual: {
      label: "Public UTM aracı",
      title: "URL + standart UTM alanları",
      caption: "Parametreleri tarayıcıda oluştur, sonucu kopyala ve istersen TrulyGo ile kısalt.",
      rows: ["Hedef URL", "Kaynak ve kanal", "Kampanya adı", "Kopyalanabilir sonuç"],
      statusLabel: "Ücretsiz",
      footerItems: ["Oluştur", "Kopyala", "Kısalt"],
    },
    cta: {
      title: "UTM bağlantını oluşturduktan sonra kısalt ve takip et.",
      description:
        "Public araç üyelik istemez. Kısa link, QR ve tıklama analizi için TrulyGo hesabınla Panelim’e geçebilirsin.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "TrulyGo ile kısalt ve takip et",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/link-kisaltma",
      secondaryLabel: "Link kısaltmayı incele",
    },
  },
  qrKodOlusturucu: {
    path: "/qr-kod-olusturucu",
    footerLabel: "QR Kod Oluşturucu",
    footerOrder: 50,
    related: [
      "linkKisaltma",
      "kanalLinkiOlusturma",
      "utmLinkOlusturucu",
      "whatsappLinkOlusturucu",
      "linkVitrini",
    ],
    eyebrow: "Markalı QR paylaşımı",
    title: "Kısa Linkini Markalı Bir QR Koda Dönüştür",
    description:
      "Onaylı kısa linkin için QR kanal bağlantısı veya kaydedilmiş Link Vitrini adresin üzerinden renk ve logo seçenekli QR çıktısı hazırla; ölçümün fiziksel taramayı değil, link isteğini temel aldığını bil.",
    metadataTitle: "QR Kod Oluşturma ve Takip Edilebilir Kısa Link | TrulyGo",
    metadataDescription:
      "Onaylı kısa linkin veya desteklenen TrulyGo adresin için markalı QR kod oluştur; doğrulanan renk, logo ve indirme seçenekleriyle paylaş, QR kanalından gelen tıklamaları izle.",
    chips: ["10 hazır renk", "Logo yükleme", "PNG ve SVG", "QR kanal linki"],
    sections: [
      {
        type: "prose",
        eyebrow: "Desteklenen hedefler",
        title: "QR kod hangi TrulyGo adresine bağlanır?",
        paragraphs: [
          "Onaylı ana linkin detayında QR kanalı için ayrı bir kısa link oluşturabilir ve QR görselini bu bağlantıya yönlendirebilirsin. Bu link QR kanal kimliği ve UTM değerleriyle çalışır.",
          "Kaydedilmiş Link Vitrini için oluşturulan QR doğrudan /v/[handle] adresini taşır; ek bir kısa redirect slug üretmez. Profil yalnız vitrin yayınlandığında public olarak açılır ve bu QR için kanal tıklama analizi varmış gibi değerlendirilmemelidir.",
        ],
        bullets: [
          "Bu public landing serbest bir URL’den üyeliksiz QR üretmez.",
          "Kısa link QR akışı yalnız kullanıcıya ait onaylı ana link üzerinden açılır.",
          "QR görseli tek başına analytics verisi üretmez.",
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Özelleştirme",
        title: "Koddan doğrulanan QR seçenekleri",
        items: [
          {
            term: "Renk",
            description:
              "QR’ın koyu pikselleri için 10 hazır renk bulunur: siyah, koyu gri, lacivert, mavi, mor, bordo, koyu kırmızı, zümrüt, petrol ve kahverengi. Serbest HEX renk alanı yoktur; arka plan beyazdır.",
          },
          {
            term: "Logo",
            description:
              "PNG, JPG/JPEG veya WebP logo yüklenebilir. Dosya en fazla 1 MB olmalıdır ve logo QR’ın ortasına otomatik yerleştirilir.",
          },
          {
            term: "Logo çözünürlüğü",
            description:
              "Kare, şeffaf ve en az 512×512 px PNG önerilir. Bir kenar 512 px altındaysa yükleme engellenmez; baskıda bulanıklık uyarısı gösterilir.",
          },
          {
            term: "İndirme",
            description:
              "QR kod 1024×1024 PNG veya SVG olarak indirilebilir. Yüklenen logo PNG’ye eklenir; mevcut SVG çıktısı logosuz oluşturulur.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Oluşturma akışı",
        title: "QR kodu oluşturup indirme adımları",
        items: [
          {
            title: "Uygun hedefi hazırla",
            description:
              "Onaylı ana linkin detayında QR kanalını oluştur veya kaydedilmiş Link Vitrini adresini aç.",
          },
          {
            title: "Rengi seç",
            description:
              "On hazır koyu renk arasından baskı zeminiyle yeterli kontrast sağlayan seçeneği kullan.",
          },
          {
            title: "İstersen logo ekle",
            description:
              "Desteklenen format ve dosya sınırına uyan logoyu yükle; düşük çözünürlük uyarısını dikkate al.",
          },
          {
            title: "PNG veya SVG indir",
            description:
              "Logolu kullanım için PNG’yi, logosuz ölçeklenebilir çıktı için SVG’yi seç ve baskıdan önce test et.",
          },
        ],
      },
      {
        type: "comparison",
        eyebrow: "Bağlantı ilişkisi",
        title: "Kısa link, QR kanalı ve Link Vitrini QR’ı arasındaki fark",
        items: [
          {
            title: "Onaylı ana kısa link",
            description:
              "Kullanıcının temel TrulyGo linkidir. Hedef URL onay sonrasında kullanıcı tarafından değiştirilemez.",
          },
          {
            title: "QR kanal kısa linki",
            description:
              "Onaylı ana linkten türetilir; qr/offline UTM değerleri ve QR kanal kimliğiyle ayrı yönlendirme sağlar.",
          },
          {
            title: "Link Vitrini QR’ı",
            description:
              "Kaydedilmiş /v/[handle] adresini doğrudan içerir; ayrıca bir kısa yönlendirme linki oluşturmaz. Public erişim vitrin yayınlandığında açılır.",
          },
          {
            title: "QR görseli",
            description:
              "Yalnız hedef URL’yi kodlar. Tıklama kaydı, URL TrulyGo yönlendirme rotasında gerçekten açılırsa oluşabilir.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Ölçüm ayrımı",
        title: "Fiziksel tarama ile link tıklaması aynı veri değildir",
        items: [
          {
            title: "Kamera taraması",
            description:
              "TrulyGo telefon kamerasının QR’ı algılama hareketini doğrudan saymaz.",
          },
          {
            title: "HTTP yönlendirmesi",
            description:
              "QR kanalındaki TrulyGo kısa link açıldığında oluşan yönlendirme isteği kanal bilgisiyle tıklama olarak kaydedilebilir.",
          },
          {
            title: "Yüklenmeyen URL",
            description:
              "Kamera kodu algılasa bile kullanıcı URL’yi açmazsa veya istek TrulyGo’ya ulaşmazsa kayıt oluşmayabilir.",
          },
          {
            title: "Sonuç sınırı",
            description:
              "QR üzerinden gelen link tıklaması; mağaza ziyareti, satış, lead veya conversion sonucu anlamına gelmez.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Baskı kontrolü",
        title: "QR’ı yayınlamadan önce pratik kontrol listesi",
        items: [
          {
            title: "Kontrastı koru",
            description:
              "Koyu QR pikselleri ile açık zemin arasında yeterli görsel ayrım bırak.",
          },
          {
            title: "Boş alan bırak",
            description:
              "QR çevresindeki boşluğu metin, kenarlık veya başka görsellerle kapatma.",
          },
          {
            title: "Logoyu kontrol et",
            description:
              "Logonun kodu gereğinden fazla örtmediğini ve baskıda okunur kaldığını doğrula.",
          },
          {
            title: "Farklı telefonlarla dene",
            description:
              "Baskıdan önce QR’ı birden fazla cihaz ve kamera uygulamasıyla açmayı dene.",
          },
          {
            title: "Çok küçük basma",
            description:
              "Kullanım mesafesine göre okunabilir bir fiziksel boyut seç; bunu teknik garanti olarak değerlendirme.",
          },
          {
            title: "Bağlantıyı doğrula",
            description:
              "Kısa linkin onaylı ve çalışır durumda olduğunu, QR’ın doğru hedefi açtığını kontrol et.",
          },
        ],
      },
      {
        type: "comparison",
        eyebrow: "Kullanım örnekleri",
        title: "QR hangi paylaşım yüzeylerinde kullanılabilir?",
        items: [
          {
            title: "Mağaza ve afiş",
            description:
              "Onaylı QR kanal linkini fiziksel bir temas noktasından dijital hedefe geçiş için kullanabilirsin.",
          },
          {
            title: "Broşür ve etkinlik",
            description:
              "Dağıtılan materyaldeki QR’ı yayına almadan önce baskı kalitesi ve hedef URL ile birlikte test edebilirsin.",
          },
          {
            title: "Kartvizit",
            description:
              "Yayınlanmış Link Vitrini adresini QR ile paylaşarak public profilini açabilirsin.",
          },
          {
            title: "WhatsApp hedefi",
            description:
              "Onaylı ana linkin hedefi mevcut bir WhatsApp URL’siyse QR kanal kısa linki aynı hedefe yönlenebilir.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "QR kod oluşturma hakkında sık sorulan sorular",
        items: [
          {
            title: "TrulyGo’da hangi linkler için QR oluşturulabilir?",
            description:
              "Onaylı ana linkten türetilen QR kanal kısa linki ve kaydedilmiş Link Vitrini adresi için QR oluşturulur. Vitrin adresinin public açılması için profil yayınlanmış olmalıdır.",
          },
          {
            title: "QR kod renkli olabilir mi?",
            description:
              "Evet. Mevcut arayüzde koyu pikseller için 10 hazır renk bulunur; serbest özel renk alanı yoktur.",
          },
          {
            title: "QR kodun ortasına logo eklenebilir mi?",
            description:
              "Evet. PNG, JPG/JPEG veya WebP logo en fazla 1 MB olacak şekilde yüklenebilir ve PNG çıktısına eklenir.",
          },
          {
            title: "PNG ve SVG arasındaki fark nedir?",
            description:
              "PNG mevcut akışta 1024×1024 piksel üretilir ve logoyu içerebilir. SVG ölçeklenebilir vektör çıktıdır fakat mevcut indirmede logo içermez.",
          },
          {
            title: "QR taramaları mı yoksa link tıklamaları mı ölçülür?",
            description:
              "Fiziksel kamera taraması doğrudan ölçülmez. QR kanalındaki TrulyGo linkine ulaşan HTTP yönlendirme isteği tıklama olarak kaydedilebilir.",
          },
          {
            title: "QR kanalı ayrı takip edilebilir mi?",
            description:
              "Evet. Onaylı ana linkten oluşturulan QR kanal kısa linki qr/offline bilgileriyle diğer kanallardan ayrışır.",
          },
          {
            title: "QR kodun hedefi sonradan değişir mi?",
            description:
              "QR oluşturulduğu anda verilen URL’yi taşır. Onaylı kısa linkin hedefi değiştirilemez; farklı hedef için yeni link ve QR gerekir. Link Vitrini QR’ı aynı /v/[handle] adresini taşırken profil içeriği ve yayın durumu Vitrin yönetiminde değişebilir.",
          },
          {
            title: "Baskıdan önce nelere dikkat edilmelidir?",
            description:
              "Kontrastı, çevredeki boş alanı, logo boyutunu ve hedef URL’yi kontrol et; QR’ı farklı telefonlarla dene.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili QR akışı",
      title: "Link → özelleştir → indir",
      caption: "Desteklenen TrulyGo adresini QR’a bağla, görünümü düzenle ve baskıdan önce test et.",
      rows: ["Desteklenen hedefi seç", "Renk ve logoyu ayarla", "PNG veya SVG indir", "Test edip paylaş"],
      statusLabel: "QR",
      footerItems: ["Özelleştir", "İndir", "Paylaş"],
    },
    cta: {
      title: "QR kodunu desteklenen TrulyGo adresin için hazırla.",
      description:
        "Onaylı ana linkin QR kanalını oluşturmak veya Link Vitrini QR’ını indirmek için Panelim’e geç.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "QR kodunu Panelim’de oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kanal-linki-olusturma",
      secondaryLabel: "QR kanal takibini incele",
    },
  },
  whatsappLinkOlusturucu: {
    path: "/whatsapp-link-olusturucu",
    footerLabel: "WhatsApp Link Kısaltma",
    footerOrder: 60,
    related: [
      "linkKisaltma",
      "kanalLinkiOlusturma",
      "qrKodOlusturucu",
      "utmLinkOlusturucu",
      "kampanyaLinkiOlusturma",
    ],
    eyebrow: "Mevcut WhatsApp hedefi",
    title: "Hazır WhatsApp Linkini Kısalt ve Tıklamaları Takip Et",
    description:
      "Hesabınla hazır WhatsApp veya wa.me bağlantın için kısa link talebi oluştur. Onaylanan kısa linkin tıklamalarını kanal bazında izle. Telefon numarasından yeni wa.me bağlantısı üretilmez.",
    metadataTitle: "WhatsApp Link Kısaltma ve Tıklama Takibi | TrulyGo",
    metadataDescription:
      "Hazır WhatsApp veya wa.me bağlantın için kısa link talebi oluştur; onaylanan linkin tıklamalarını izle. Telefon numarasından wa.me bağlantısı üretilmez.",
    chips: ["Mevcut URL", "Onaylı kısa link", "Ayrı kanallar", "Tıklama sınırı"],
    sections: [
      {
        type: "comparison",
        eyebrow: "Kapsam",
        title: "TrulyGo WhatsApp bağlantısında ne yapar, ne yapmaz?",
        items: [
          {
            title: "Mevcut hedefi kısaltır",
            description:
              "Elindeki geçerli HTTP veya HTTPS WhatsApp hedef URL’sini Panelim’de kısa link talebine dönüştürür.",
          },
          {
            title: "wa.me bağlantısı üretmez",
            description:
              "TrulyGo telefon numarası ve hazır mesaj alan bir WhatsApp link üreticisi değildir; telefon numarasından wa.me URL’si oluşturmaz.",
          },
          {
            title: "Onay akışını uygular",
            description:
              "Kısa link oluşturma, güvenlik kontrolleri ve onay süreci hesapla Panelim içinde yürütülür.",
          },
          {
            title: "Sohbeti okuyamaz",
            description:
              "TrulyGo WhatsApp mesajlarına veya sohbet içeriğine erişmez; sohbetin açıldığını ya da mesajın gönderildiğini doğrulamaz.",
          },
        ],
      },
      {
        type: "prose",
        eyebrow: "Hedef URL",
        title: "Hangi WhatsApp bağlantısını kullanmalısın?",
        paragraphs: [
          "WhatsApp tarafından hazırlanmış ve tarayıcıda açılabilen mevcut HTTPS hedef bağlantını kullan. Örneğin elindeki wa.me adresi, genel hedef URL alanına olduğu gibi girilebilir.",
          "TrulyGo bağlantının içindeki telefon numarasını veya hazır mesajı üretmez ve düzenlemez; hedef URL’yi kısa linkin arkasında korur.",
        ],
        bullets: [
          "Public sayfada telefon numarası ya da mesaj formu yoktur.",
          "Kısa link talebi için TrulyGo hesabı gerekir.",
          "Hedef URL onaylandıktan sonra kullanıcı tarafından değiştirilemez.",
        ],
      },
      {
        type: "steps",
        eyebrow: "Kısaltma akışı",
        title: "Mevcut WhatsApp URL’sini kısa linke dönüştür",
        items: [
          {
            title: "Mevcut URL’yi hazırla",
            description:
              "WhatsApp hedef bağlantısının doğru hattı ve istediğin hazır mesajı açtığını kendi tarayıcında kontrol et.",
          },
          {
            title: "Kısa link talebi oluştur",
            description:
              "Panelim’de hedef URL’yi, istediğin kısa slug’ı ve gerekiyorsa kampanya adını gir.",
          },
          {
            title: "Onay sonucunu bekle",
            description:
              "Talep güvenlik ve onay akışından geçer. Onay süresi veya otomatik onay garantisi verilmez.",
          },
          {
            title: "Dağıtımı ayır",
            description:
              "Onaydan sonra Instagram, QR, WhatsApp veya özel dağıtım noktaları için ayrı kanal linkleri oluştur.",
          },
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Kavram ayrımı",
        title: "Hedef kanal ile dağıtım kanalı aynı şey değildir",
        items: [
          {
            term: "WhatsApp hedefi",
            description:
              "Kısa link açıldığında ulaşılan mevcut WhatsApp URL’sidir.",
          },
          {
            term: "Instagram dağıtımı",
            description:
              "Aynı WhatsApp hedefi Instagram bio’da paylaşılırsa dağıtım kanalı Instagram olarak ayrılabilir.",
          },
          {
            term: "QR dağıtımı",
            description:
              "Mağaza veya basılı materyaldeki QR aynı hedefe giderken QR/offline kanal linkini kullanabilir.",
          },
          {
            term: "WhatsApp dağıtımı",
            description:
              "Bağlantı doğrudan WhatsApp içinde paylaşılıyorsa WhatsApp preset’i dağıtım kanalını tanımlayabilir.",
          },
          {
            term: "Özel dağıtım",
            description:
              "Hazır preset dışında kalan bir temas noktası güvenli bir özel kanal slug’ı ile ayrıştırılabilir.",
          },
        ],
      },
      {
        type: "example",
        eyebrow: "Temsili örnek",
        title: "Tek WhatsApp hedefini farklı yerlerde paylaş",
        input: {
          label: "Mevcut hedef",
          value: "https://wa.me/905XXXXXXXXX?text=Merhaba",
        },
        changes: [
          { label: "Kısa slug", value: "whatsapp-destek" },
          { label: "Instagram", value: "ayrı kanal linki" },
          { label: "QR", value: "ayrı kanal linki" },
          { label: "Özel kanal", value: "güvenli kanal slug’ı" },
        ],
        output: {
          label: "Örnek ana kısa link",
          value: "https://example.invalid/whatsapp-destek",
        },
        notes: [
          "Telefon numarası maskelidir; gerçek kişi bilgisi kullanılmaz.",
          "Örnek yalnız anlatım amaçlıdır; slug müsaitliği ve onay sonucu garanti edilmez.",
          "Bütün kanal linkleri aynı WhatsApp hedefine yönlenebilir fakat tıklamalar kanal kimliğiyle ayrışır.",
        ],
      },
      {
        type: "scope",
        eyebrow: "Gizlilik",
        title: "Hazır mesaj URL’sinde hassas bilgi kullanma",
        items: [
          {
            title: "URL’de görünürlük",
            description:
              "Hazır mesaj metni URL’nin query bölümündedir; hedef URL’de ve paylaşım sırasında görülebilir.",
          },
          {
            title: "Tarayıcı ve loglar",
            description:
              "URL tarayıcı geçmişi, sunucu kayıtları veya paylaşım önizlemeleri gibi yüzeylerde yer alabilir.",
          },
          {
            title: "Hassas veri sınırı",
            description:
              "Hazır mesaja kişisel veri, ödeme bilgisi, parola veya başka hassas bilgiler yazma.",
          },
          {
            title: "Sohbet gizliliği",
            description:
              "TrulyGo WhatsApp sohbetine erişmez; kısa link, hazır mesajı gizli veya şifreli hâle getirmez.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Ölçüm sınırı",
        title: "Tıklama ile WhatsApp sonucu aynı şey değildir",
        items: [
          {
            title: "Ölçülebilen",
            description:
              "TrulyGo yönlendirme adresine gelen kısa link tıklaması ve dağıtım kanalı raporlanabilir.",
          },
          {
            title: "Doğrulanamayan",
            description:
              "Sohbetin gerçekten açılması veya hazır mesajın gönderilmesi TrulyGo tarafından kesin olarak doğrulanmaz.",
          },
          {
            title: "İş sonucu sınırı",
            description:
              "Mesaj, randevu, satış, lead veya conversion sonucu ölçülmez.",
          },
          {
            title: "Kimlik sınırı",
            description:
              "Panel isimlendirilmiş WhatsApp kullanıcısını veya sohbet katılımcısının gerçek kimliğini göstermez.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "WhatsApp hedef bağlantıları hakkında sık sorulan sorular",
        items: [
          {
            title: "TrulyGo telefon numarasından WhatsApp linki oluşturur mu?",
            description:
              "Hayır. TrulyGo telefon numarası ve mesaj alan bir wa.me üreticisi değildir; mevcut WhatsApp hedef URL’sini kısaltır.",
          },
          {
            title: "Hangi WhatsApp URL’sini kullanmalıyım?",
            description:
              "WhatsApp tarafından oluşturulmuş, tarayıcıda doğru hedefi açtığını doğruladığın mevcut HTTP veya HTTPS bağlantıyı kullanmalısın.",
          },
          {
            title: "Mevcut wa.me bağlantısı kısaltılabilir mi?",
            description:
              "Evet. Geçerli wa.me adresi genel hedef URL olarak Panelim’de kısa link talebine eklenebilir.",
          },
          {
            title: "Aynı WhatsApp hattı farklı kanallarda takip edilebilir mi?",
            description:
              "Evet. Aynı hedefe giden Instagram, QR, WhatsApp veya özel kanal linkleri ayrı dağıtım kimliğiyle raporlanabilir.",
          },
          {
            title: "QR kod WhatsApp linkine yönlendirebilir mi?",
            description:
              "Evet. Onaylı ana linkin hedefi mevcut bir WhatsApp URL’siyse QR kanal kısa linki aynı hedefe yönlenebilir.",
          },
          {
            title: "TrulyGo mesajları veya sohbetleri görebilir mi?",
            description:
              "Hayır. TrulyGo WhatsApp sohbet içeriğine erişmez; yalnız kendi kısa link yönlendirme isteğini kaydedebilir.",
          },
          {
            title: "Tıklama ile gönderilen mesaj aynı şey midir?",
            description:
              "Hayır. Kısa link tıklaması yönlendirme isteğidir; mesajın gönderildiğini veya sohbetin tamamlandığını kanıtlamaz.",
          },
          {
            title: "Hazır mesaj URL’sine hassas bilgi yazılmalı mı?",
            description:
              "Hayır. Query metni görünür olabileceği için kişisel veri, ödeme bilgisi, parola veya hassas bilgi kullanılmamalıdır.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili WhatsApp akışı",
      title: "Mevcut hedef → kısa link",
      caption: "Hazır WhatsApp URL’si kısaltılır; paylaşım noktaları ayrı kanal linkleriyle düzenlenir.",
      rows: ["Mevcut WhatsApp URL’si", "Kısa link talebi", "Onay süreci", "Ayrı dağıtım kanalları"],
      statusLabel: "Mevcut URL",
      footerItems: ["Hedef", "Kanal", "Tıklama"],
    },
    cta: {
      title: "Mevcut WhatsApp hedefini kısa ve yönetilebilir bir linke dönüştür.",
      description:
        "Hedef URL’yi doğrulayıp kısa link talebini oluşturmak ve dağıtım kanallarını ayırmak için Panelim’e geç.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "WhatsApp hedefini kısalt",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kanal-linki-olusturma",
      secondaryLabel: "Kanal linklerini incele",
    },
  },
  kampanyaLinkiOlusturma: {
    path: "/kampanya-linki-olusturma",
    footerLabel: "Kampanya Linkleri",
    footerOrder: 80,
    related: [
      "utmLinkOlusturucu",
      "linkKisaltma",
      "kanalLinkiOlusturma",
      "whatsappLinkOlusturucu",
      "qrKodOlusturucu",
    ],
    eyebrow: "Kampanya planı",
    title: "Kampanya Linkini Dağıtımdan Önce Doğru Planla",
    description:
      "Ana hedefi, kampanya adını, UTM isimlendirmesini ve dağıtım noktalarını aynı plan içinde düzenle; ardından kısa link ve kanal bağlantılarını oluştur.",
    metadataTitle: "Kampanya Linki Planlama ve UTM İsimlendirme | TrulyGo",
    metadataDescription:
      "Kampanya adını, hedef URL’yi ve dağıtım planını tutarlı kurgula; ardından onaylı kısa link, UTM ve kanal bağlantılarıyla yayına hazırla.",
    chips: ["Ana hedef", "Kampanya adı", "UTM planı", "Dağıtım noktaları"],
    sections: [
      {
        type: "prose",
        eyebrow: "Planın amacı",
        title: "Kampanya linki planı nedir?",
        paragraphs: [
          "Kampanya linki planı; ana hedef URL’yi, ana link kaydındaki kampanya adını, kullanılacak kısa slug’ı ve dağıtım noktalarını linkler paylaşılmadan önce tutarlı hâle getirir.",
          "TrulyGo’da ayrıca yönetilen bağımsız bir kampanya kaydı veya kampanya yönetim modülü bulunmaz. campaign_name, ana kısa link talebinde saklanan kampanya adıdır; planlama bu alanın, UTM değerlerinin ve dağıtım linklerinin birbiriyle uyumlu kullanılmasını anlatır.",
        ],
        bullets: [
          "Ana hedef URL ve kampanya adı birlikte belirlenir.",
          "Ana kısa slug ile utm_campaign için tutarlı bir isim seçilir.",
          "Instagram, WhatsApp, e-posta veya QR gibi dağıtım noktaları önceden listelenir.",
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Plan bileşenleri",
        title: "Kampanya adı ve hedef URL nasıl birlikte kurgulanır?",
        description:
          "Her alan aynı kampanyayı farklı bir aşamada tanımlar; birbiriyle uyumlu olmaları raporları okumayı kolaylaştırır.",
        items: [
          {
            term: "Ana hedef URL",
            description:
              "Ziyaretçinin ulaşacağı gerçek sayfadır. UTM parametreleri gerekiyorsa bu URL’ye eklenebilir.",
          },
          {
            term: "Kampanya adı",
            description:
              "Ana link kaydındaki campaign_name alanıdır. Kanal linkleri oluşturulurken utm_campaign değeri için kullanılabilir.",
          },
          {
            term: "Ana kısa slug",
            description:
              "Onaylanan temel kısa linkin okunabilir adres parçasıdır. Müsaitliği ve onay sonucu önceden garanti edilmez.",
          },
          {
            term: "Dağıtım planı",
            description:
              "Ana linkin hangi sosyal, mesajlaşma, e-posta veya fiziksel QR noktalarında kullanılacağını belirler.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "İsimlendirme",
        title: "Yayından önce isimlendirme kontrol listesi",
        description:
          "Aynı kampanyayı farklı araçlarda farklı adlarla yazmak yerine kısa ve tekrar kullanılabilir bir adlandırma standardı belirle.",
        items: [
          {
            title: "Tek bir kampanya adı seç",
            description:
              "Küçük harfli, açıklayıcı ve boşluksuz bir ad kullan; örneğin yaz-lansmani.",
          },
          {
            title: "Ana slug’ı sade tut",
            description:
              "Kısa link adresini paylaşımda anlaşılır olacak biçimde planla; slug müsaitliği ayrıca kontrol edilir.",
          },
          {
            title: "UTM adlarını eşleştir",
            description:
              "utm_campaign değerini kampanya adıyla tutarlı kullan; kaynak ve medium değerlerini dağıtım noktasına göre ayır.",
          },
          {
            title: "Dağıtım listesini çıkar",
            description:
              "Hangi noktalarda ana link, hangi noktalarda ayrı kanal linki veya QR kullanılacağını yayın öncesinde belirle.",
          },
        ],
      },
      {
        type: "example",
        eyebrow: "Örnek plan",
        title: "Yaz lansmanı için tutarlı bir kampanya planı",
        input: {
          label: "Ana hedef",
          value: "https://site.com/yaz-indirimi",
        },
        changes: [
          { label: "Kampanya adı", value: "yaz-lansmani" },
          { label: "Ana slug", value: "yaz-lansmani" },
          { label: "UTM", value: "utm_campaign=yaz-lansmani" },
          { label: "Dağıtım", value: "Instagram, WhatsApp, E-posta, QR" },
        ],
        output: {
          label: "Planlama sonucu",
          value: "Aynı kampanya adı, ana link ve bütün dağıtım noktalarında tutarlı kullanılır.",
        },
        notes: [
          "Bu örnek yalnız planlama mantığını gösterir; bir link, slug veya onay sonucu garanti etmez.",
          "Bütün kanallarda aynı kampanya adını kullanmak, raporlardaki utm_campaign değerlerini birlikte okumayı kolaylaştırır.",
        ],
      },
      {
        type: "comparison",
        eyebrow: "Kavramları ayır",
        title: "UTM linki, ana kısa link ve kanal linki aynı şey değildir",
        description:
          "Kampanya planı bu üç bağlantı türünün nasıl birlikte kullanılacağını belirler; her biri farklı bir görevi üstlenir.",
        items: [
          {
            title: "UTM linki",
            description:
              "Kaynak, medium, campaign, content ve term parametrelerinin hedef URL’ye eklenmiş hâlidir. Public UTM aracı kısa link üretmez.",
          },
          {
            title: "Ana kısa link",
            description:
              "Güvenlik ve onay akışından geçen temel TrulyGo bağlantısıdır. Yalnız onaylandıktan sonra yönlendirme yapar.",
          },
          {
            title: "Kanal linki",
            description:
              "Onaylı ana linkten Instagram, WhatsApp, e-posta veya QR gibi ayrı dağıtım noktaları için türetilir.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Yayına alma",
        title: "Kampanya planını bağlantılara dönüştür",
        description:
          "Planı tamamladıktan sonra UTM, ana link ve kanal bağlantılarını doğru sırayla hazırla.",
        items: [
          {
            title: "Hedefi ve kampanya adını belirle",
            description: "Ana hedef URL’yi ve campaign_name alanında kullanacağın adı netleştir.",
          },
          {
            title: "Gerekirse UTM’li URL’yi hazırla",
            description:
              "Public UTM aracıyla hedef URL’ye kampanya parametrelerini ekle; bu adım kısa link oluşturmaz.",
          },
          {
            title: "Ana kısa link talebini oluştur",
            description:
              "Hedefi, kısa slug’ı ve kampanya adını Panelim’de gir; talebin güvenlik ve onay akışına alınır.",
          },
          {
            title: "Onaydan sonra kanal linklerini oluştur",
            description:
              "Ana link approved durumuna geldikten sonra gerekli dağıtım noktaları için ayrı kanal linkleri ekle.",
          },
          {
            title: "Tıklama ve kanal dağılımlarını incele",
            description:
              "TrulyGo’nun kaydettiği kısa link tıklamalarını ve kanal kırılımlarını Panelim’den karşılaştır.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Ölçüm sınırı",
        title: "Kampanya adı tek başına sonuç üretmez",
        description:
          "Planlı isimlendirme ölçüm verisini düzenler; satış veya dönüşüm sonucunu kendi başına oluşturmaz.",
        items: [
          {
            title: "Hedef sitenin analytics sistemi",
            description:
              "UTM parametreleri, hedef sitede kullanılan analytics sistemi tarafından okunabilir.",
          },
          {
            title: "TrulyGo tıklama verisi",
            description:
              "Onaylı kısa linklere gelen yönlendirme istekleri ve kanal dağılımları TrulyGo’da raporlanabilir.",
          },
          {
            title: "Ölçülmeyen iş sonuçları",
            description:
              "Satış, gelir, lead veya conversion sonucu ölçülmez; kampanya adı tek başına veri üretmez.",
          },
          {
            title: "Kapsam dışındaki planlama",
            description:
              "Bütçe, reklam yönetimi, hedef kitle yönetimi ve medya planlama bu akışın parçası değildir.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "Kampanya linki planı hakkında sık sorulan sorular",
        items: [
          {
            title: "Kampanya linki nedir?",
            description:
              "Kampanya linki; belirli bir hedef, kampanya adı ve dağıtım planı için hazırlanan UTM’li veya kısa bağlantıdır. TrulyGo’da bağımsız bir kampanya modülü anlamına gelmez.",
          },
          {
            title: "campaign_name ile utm_campaign aynı şey midir?",
            description:
              "Hayır. campaign_name ana link kaydındaki kampanya adıdır; utm_campaign ise hedef URL’de taşınan UTM parametresidir. Tutarlı raporlama için aynı isimlendirme kökünü kullanabilirsin; kanal linkinde değer URL dostu biçime normalleştirilebilir.",
          },
          {
            title: "Kampanya için önce UTM mi, kısa link mi oluşturulmalı?",
            description:
              "UTM gerekiyorsa önce hedef URL’yi public UTM aracıyla hazırlayabilir, sonra bu hedef için Panelim’de ana kısa link talebi oluşturabilirsin.",
          },
          {
            title: "Aynı kampanya farklı kanallarda kullanılabilir mi?",
            description:
              "Evet. Aynı kampanya adı korunurken onaylı ana linkten farklı dağıtım noktaları için ayrı kanal linkleri oluşturulabilir.",
          },
          {
            title: "Kampanya sayfası ile kanal linki sayfasının farkı nedir?",
            description:
              "Bu sayfa hedef, adlandırma ve dağıtım planına odaklanır. Kanal sayfası ise onaylı ana linkten kanal bağlantılarının nasıl türetildiğini açıklar.",
          },
          {
            title: "Kampanya linki satış ölçer mi?",
            description:
              "Hayır. TrulyGo kısa link tıklamalarını raporlayabilir; satış, gelir, lead veya conversion sonucunu ölçmez.",
          },
          {
            title: "Bu sayfada doğrudan link oluşturulur mu?",
            description:
              "Hayır. Bu sayfa planlama yaklaşımını anlatır. Ana kısa link ve kanal bağlantıları hesapla giriş yaptıktan sonra Panelim’de oluşturulur.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili kampanya planı",
      title: "Hedef → UTM → dağıtım",
      caption: "Hedef, isimlendirme ve dağıtım noktaları yayından önce aynı planda buluşur.",
      rows: ["Ana hedef URL", "Kampanya adı", "UTM isimlendirmesi", "Dağıtım listesi"],
      statusLabel: "Planlama",
      footerItems: ["Hedef", "UTM", "Dağıtım"],
    },
    cta: {
      title: "Kampanya planını onaylı bağlantılara dönüştür.",
      description:
        "Hedef URL’yi, ana slug’ı ve kampanya adını belirledikten sonra kısa link talebini Panelim’de oluştur.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "Kampanya linkini Panelim’de oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kanal-linki-olusturma",
      secondaryLabel: "Kanal dağıtımını planla",
    },
  },
  kanalLinkiOlusturma: {
    path: "/kanal-linki-olusturma",
    footerLabel: "Kanal Linkleri",
    footerOrder: 90,
    breadcrumbLabel: "Kanal Linki Oluşturma",
    related: [
      "kampanyaLinkiOlusturma",
      "utmLinkOlusturucu",
      "whatsappLinkOlusturucu",
      "qrKodOlusturucu",
      "linkKisaltma",
    ],
    eyebrow: "Kanal bazlı dağıtım",
    title: "Aynı Hedef İçin Ayrı Kanal Linkleri Oluştur",
    description:
      "Onaylı ana linkin için Instagram, WhatsApp, YouTube, e-posta, QR ve diğer kanallara ayrı kısa linkler oluştur; kanal performansını karşılaştır.",
    metadataTitle: "Kanal Linki Oluşturma ve Kanal Bazlı Takip | TrulyGo",
    metadataDescription:
      "Onaylı ana linkin için Instagram, WhatsApp, YouTube, e-posta, QR ve diğer kanallara ayrı kısa linkler oluştur; kanal performansını karşılaştır.",
    chips: ["Onaylı ana link", "11 hazır kanal", "Özel kanal", "Kanal analizi"],
    sections: [
      {
        type: "comparison",
        eyebrow: "Doğru kavram",
        title: "Kanal linki ile kampanya planı arasındaki fark",
        description:
          "İki yaklaşım aynı akışın farklı aşamalarını anlatır; TrulyGo’da ayrıca yönetilen bağımsız bir kampanya entity’si yoktur.",
        items: [
          {
            title: "Kampanya planı",
            description:
              "Ana hedefi, ana link kaydındaki campaign_name değerini ve bağlantının hangi dağıtım noktalarında kullanılacağını tutarlı biçimde planlamaya odaklanır.",
          },
          {
            title: "Kanal linki",
            description:
              "Onaylı ana kısa linkten Instagram, WhatsApp, YouTube veya QR gibi ayrı dağıtım linkleri türetmeye ve tıklamaları kanal kimliğiyle ayırmaya odaklanır.",
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Ön koşul",
        title: "Önce ana kısa link onaylanır",
        description:
          "Kanal linki oluşturma ekranı, yalnız sana ait ve onaylanmış bir ana linkin detayında açılır.",
        items: [
          {
            title: "Ana link talebini oluştur",
            description:
              "Hedef URL, kısa slug ve varsa kampanya adını Panelim’de kaydet.",
          },
          {
            title: "Güvenlik ve onay akışını tamamla",
            description:
              "Ana link approved durumuna gelmeden kanal linki oluşturulamaz.",
          },
          {
            title: "Link detayından kanalları ekle",
            description:
              "Onaylanan ana linkin detayında hazır presetlerden birini veya özel kanal seçeneğini kullan.",
          },
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Hazır kanallar",
        title: "Preset kanal matrisi",
        description:
          "Her preset, ana slug için kısa bir suffix ve yönlendirmede kullanılacak standart kanal UTM değerlerini belirler.",
        items: [
          {
            term: "Instagram",
            details: [
              { label: "Suffix", value: "ig" },
              { label: "utm_source", value: "instagram" },
              { label: "utm_medium", value: "social" },
              { label: "utm_content", value: "instagram" },
            ],
          },
          {
            term: "WhatsApp",
            details: [
              { label: "Suffix", value: "wa" },
              { label: "utm_source", value: "whatsapp" },
              { label: "utm_medium", value: "messaging" },
              { label: "utm_content", value: "whatsapp" },
            ],
          },
          {
            term: "YouTube",
            details: [
              { label: "Suffix", value: "yt" },
              { label: "utm_source", value: "youtube" },
              { label: "utm_medium", value: "video" },
              { label: "utm_content", value: "youtube" },
            ],
          },
          {
            term: "E-posta",
            details: [
              { label: "Suffix", value: "email" },
              { label: "utm_source", value: "email" },
              { label: "utm_medium", value: "email" },
              { label: "utm_content", value: "email" },
            ],
          },
          {
            term: "QR",
            details: [
              { label: "Suffix", value: "qr" },
              { label: "utm_source", value: "qr" },
              { label: "utm_medium", value: "offline" },
              { label: "utm_content", value: "qr" },
            ],
          },
          {
            term: "Facebook",
            details: [
              { label: "Suffix", value: "fb" },
              { label: "utm_source", value: "facebook" },
              { label: "utm_medium", value: "social" },
              { label: "utm_content", value: "facebook" },
            ],
          },
          {
            term: "X",
            details: [
              { label: "Suffix", value: "x" },
              { label: "utm_source", value: "x" },
              { label: "utm_medium", value: "social" },
              { label: "utm_content", value: "x" },
            ],
          },
          {
            term: "LinkedIn",
            details: [
              { label: "Suffix", value: "li" },
              { label: "utm_source", value: "linkedin" },
              { label: "utm_medium", value: "social" },
              { label: "utm_content", value: "linkedin" },
            ],
          },
          {
            term: "TikTok",
            details: [
              { label: "Suffix", value: "tt" },
              { label: "utm_source", value: "tiktok" },
              { label: "utm_medium", value: "social" },
              { label: "utm_content", value: "tiktok" },
            ],
          },
          {
            term: "Telegram",
            details: [
              { label: "Suffix", value: "tg" },
              { label: "utm_source", value: "telegram" },
              { label: "utm_medium", value: "messaging" },
              { label: "utm_content", value: "telegram" },
            ],
          },
          {
            term: "SMS",
            details: [
              { label: "Suffix", value: "sms" },
              { label: "utm_source", value: "sms" },
              { label: "utm_medium", value: "messaging" },
              { label: "utm_content", value: "sms" },
            ],
          },
        ],
      },
      {
        type: "example",
        eyebrow: "Kanal slug örneği",
        title: "lansman ana linkinden Instagram kanalı türet",
        input: {
          label: "Ana hedef",
          value:
            "https://site.com/urun?ref=hero&UTM_SOURCE=youtube&utm_medium=video&utm_campaign=eski&utm_term=ayakkabi#detay",
        },
        changes: [
          { label: "Ana slug", value: "lansman" },
          { label: "Kampanya adı", value: "test" },
          { label: "Instagram kısa linki", value: "example.invalid/lansman-ig" },
        ],
        output: {
          label: "Yönlendirme hedefi",
          value:
            "https://site.com/urun?ref=hero&utm_source=instagram&utm_medium=social&utm_campaign=test&utm_content=instagram&utm_term=ayakkabi#detay",
        },
        notes: [
          "utm_source, utm_medium, utm_campaign ve utm_content kanal değerleriyle değiştirilir.",
          "Duplicate UTM anahtarları ve case varyasyonları temizlenir.",
          "Mevcut utm_term korunur.",
          "ref=hero query parametresi ve #detay hash bölümü korunur.",
          "Ana kısa linkin varsayılan yönlendirme davranışı değişmez.",
          "Kanal kimliği ve tıklama kaydı kanal linki için kullanılmaya devam eder.",
        ],
      },
      {
        type: "prose",
        eyebrow: "Yönlendirme sözleşmesi",
        title: "Kanal linklerinde eski UTM değerleri nasıl değiştirilir?",
        paragraphs: [
          "Overwrite yalnız kanal linki yönlendirmelerinde aktiftir. Hedef URL’de daha önce bulunan source, medium, campaign ve content değerleri kanal kaydındaki değerlerle değiştirilir; aynı anahtarın tekrarları ve büyük/küçük harf varyasyonları temizlenir.",
          "Hedef URL’deki ilk utm_term değeri korunur. UTM dışındaki query parametreleri ile hash aynı kalır. Ana kısa link ise mevcut varsayılan append davranışını sürdürür.",
        ],
        bullets: [
          "Kanal linkinin kısa slug’ı ve kanal kimliği değişmez.",
          "Tıklama kaydı kanal anahtarı ve etiketiyle ilişkilendirilmeye devam eder.",
          "Bu davranış bütün kısa linklere uygulanmaz; yalnız kanal yönlendirmesine özeldir.",
        ],
      },
      {
        type: "definition-list",
        eyebrow: "Esnek dağıtım",
        title: "Özel kanal oluşturma",
        description:
          "Hazır presetlerde bulunmayan bir dağıtım noktası için açıklayıcı bir kanal adı kullanabilirsin. Ad güvenli bir slug’a dönüştürülür.",
        items: [
          {
            term: "Özel kanal",
            details: [
              { label: "Suffix", value: "kanal slug’ı" },
              { label: "utm_source", value: "kanal slug’ı" },
              { label: "utm_medium", value: "custom" },
              { label: "utm_content", value: "kanal slug’ı" },
            ],
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Analytics kapsamı",
        title: "Kanal performansında hangi veriler görülebilir?",
        description:
          "TrulyGo tıklama ve trafik davranışını raporlar; satış veya kullanıcı kimliği takibi yapmaz.",
        items: [
          {
            title: "Tıklama özeti",
            description:
              "Toplam tıklama, bugünkü tıklama, son 7 gün ve son tıklamalar görülebilir.",
          },
          {
            title: "Zaman ve kanal eğilimi",
            description:
              "Günlük ve saatlik eğilimler ile kanal dağılımları karşılaştırılabilir.",
          },
          {
            title: "Teknik kırılımlar",
            description:
              "Cihaz, işletim sistemi ve yaklaşık konum dağılımları raporlanabilir; kesin konum veya kişi kimliği çıkarılmaz.",
          },
          {
            title: "Ölçülmeyen sonuçlar",
            description:
              "Satış, lead, revenue veya conversion ölçümü yoktur; gerçek zamanlı ve eksiksiz kayıt garantisi verilmez.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "Kanal linkleri hakkında sık sorulan sorular",
        items: [
          {
            title: "Kanal linki ile ana kısa link arasındaki fark nedir?",
            description:
              "Ana kısa link onaylanan temel bağlantıdır. Kanal linki bu ana linkten türetilir, ayrı bir kısa slug ve kanal UTM değerleri taşır.",
          },
          {
            title: "Kanal linkleri aynı hedefe gidebilir mi?",
            description:
              "Evet. Instagram, WhatsApp, QR ve diğer kanal linkleri aynı hedef URL’ye yönlenirken kanal kimliği ve UTM değerleriyle ayrışabilir.",
          },
          {
            title: "Kanal linki oluşturmak için ana linkin onaylanması gerekir mi?",
            description:
              "Evet. Kanal oluşturma işlemi yalnız sana ait ve approved durumundaki ana kısa linkin detayında kullanılabilir.",
          },
          {
            title: "Hangi kanallar hazır olarak destekleniyor?",
            description:
              "Instagram, WhatsApp, YouTube, e-posta, QR, Facebook, X, LinkedIn, TikTok, Telegram ve SMS hazır preset olarak bulunur.",
          },
          {
            title: "Mevcut UTM parametrelerine ne olur?",
            description:
              "Kanal yönlendirmesinde source, medium, campaign ve content kanal değerleriyle değiştirilir; duplicate/case varyasyonları temizlenir, mevcut utm_term ile normal query ve hash korunur.",
          },
          {
            title: "Özel kanal oluşturulabilir mi?",
            description:
              "Evet. Hazır presetle çakışmayan bir kanal adı güvenli slug’a dönüştürülür; source ve content bu slug, medium ise custom olur.",
          },
          {
            title: "Kanal linki satış veya dönüşüm ölçer mi?",
            description:
              "Hayır. TrulyGo kanal linki tıklamalarını ve trafik kırılımlarını raporlar; satış, gelir, lead veya conversion sonucu ölçmez.",
          },
        ],
      },
    ],
    visual: {
      label: "Kanal linki akışı",
      title: "lansman → lansman-ig",
      caption: "Onaylı ana linkten ayrı kısa slug ve kanal UTM değerleri türetilir.",
      rows: ["Onaylı ana link", "Kanal preset’i", "Ayrı kısa slug", "Kanal analizi"],
      statusLabel: "Panelim",
      footerItems: ["Ana link", "Kanal", "Analiz"],
    },
    cta: {
      title: "Onaylı ana linkin için kanal bağlantılarını hazırla.",
      description:
        "Ana linkini oluşturup onay sürecini tamamladıktan sonra kanal linklerini link detayından yönetebilirsin.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "Kanal linklerini Panelim’de oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/kampanya-linki-olusturma",
      secondaryLabel: "Kampanya planını hazırla",
    },
  },
  linkKisaltma: {
    path: "/link-kisaltma",
    footerLabel: "Link Kısaltma",
    footerOrder: 30,
    related: [
      "utmLinkOlusturucu",
      "kanalLinkiOlusturma",
      "kampanyaLinkiOlusturma",
      "qrKodOlusturucu",
      "whatsappLinkOlusturucu",
      "bitlyAlternatifi",
    ],
    eyebrow: "Güvenli kısa link",
    title: "Uzun Linkini Güvenli Bir Kısa Linke Dönüştür",
    description:
      "Uzun hedef URL’ni kısa ve paylaşılabilir hâle getir; güvenlik, onay ve değiştirilemez hedef yaklaşımını UTM, kanal linkleri ve tıklama analiziyle birlikte kullan.",
    metadataTitle: "Güvenli Link Kısaltma ve Tıklama Takibi | TrulyGo",
    metadataDescription:
      "Uzun bağlantını onaylı ve değiştirilemez hedef URL mantığıyla kısalt; UTM, kanal linkleri, QR ve tıklama analizini TrulyGo Panelim’de yönet.",
    chips: ["Onaylı hedef", "Kısa slug", "Kanal linkleri", "Tıklama analizi"],
    sections: [
      {
        type: "prose",
        eyebrow: "Temel yaklaşım",
        title: "Link kısaltma ne yapar?",
        paragraphs: [
          "Link kısaltma, uzun veya UTM parametreleri taşıyan bir hedef URL’yi daha sade bir paylaşım adresinin arkasında yönlendirir. TrulyGo bu işlemi güvenlik ve onay akışıyla birlikte ele alır.",
          "Kısa link oluşturmak için hesap gerekir ve işlem Panelim’de yapılır. Ana sayfadaki public UTM aracı yalnız UTM’li uzun URL üretir; anonim bir kısa link oluşturucu değildir.",
        ],
        bullets: [
          "Kullanıcı hedef URL’yi, istediği kısa slug’ı ve varsa kampanya adını girer.",
          "UTM parametreleri hedef URL’nin içinde korunabilir.",
          "Onaylanan link example.invalid/[slug] biçiminde çalışır.",
        ],
      },
      {
        type: "steps",
        eyebrow: "Onay akışı",
        title: "TrulyGo’da kısa link nasıl oluşturulur?",
        description:
          "Link talebi kaydedildikten sonra doğrudan yayın garantisi verilmez; güvenlik ve onay sonucu beklenir.",
        items: [
          {
            title: "Hedefi ve kısa slug’ı gir",
            description:
              "Panelim’de hedef URL’yi, zorunlu kısa slug’ı ve istersen campaign_name alanındaki kampanya adını kaydet. Hedef URL önceden hazırlanmış UTM parametrelerini taşıyabilir.",
          },
          {
            title: "Güvenlik ve onay sürecini bekle",
            description:
              "Talep pending durumunda başlar ve güvenlik kontrolleriyle onay akışından geçer. Onay süresi veya otomatik onay garanti edilmez.",
          },
          {
            title: "Onaylanan kısa linki paylaş",
            description:
              "Yalnız approved durumundaki link kısa slug üzerinden hedef URL’ye yönlendirir. Onaylanmayan bağlantı aktif kısa link gibi çalışmaz.",
          },
        ],
      },
      {
        type: "example",
        eyebrow: "Temsili örnek",
        title: "Uzun UTM’li hedeften kısa paylaşım adresine",
        input: {
          label: "Uzun hedef",
          value:
            "https://site.com/urun?utm_source=instagram&utm_medium=social&utm_campaign=yaz-lansmani",
        },
        output: {
          label: "Kısa link",
          value: "https://example.invalid/yaz-lansmani",
        },
        notes: [
          "Bu örnek yalnız çalışma mantığını anlatır; yaz-lansmani slug’ının müsaitliği veya link talebinin onaylanacağı garanti edilmez.",
          "Onaylanan kısa link yönlendirdiğinde UTM parametreleri hedef URL’de kalır.",
        ],
      },
      {
        type: "prose",
        eyebrow: "Hedef güvenliği",
        title: "Onaylanan hedef URL neden değiştirilemez?",
        paragraphs: [
          "TrulyGo’da onaylanan ana kısa linkin hedef URL’si kullanıcı tarafından sonradan değiştirilemez. Böylece daha önce paylaşılan aynı kısa adresin hesap sahibi tarafından farklı bir hedefe çevrilmesi önlenir.",
          "Başka bir hedefe yönlendirmek istediğinde yeni hedef URL ve yeni bir kısa link talebi oluşturman gerekir. Yeni talep de kendi güvenlik ve onay sürecinden geçer.",
        ],
      },
      {
        type: "comparison",
        eyebrow: "Bağlantı türleri",
        title: "UTM’li hedef, ana kısa link ve kanal linki nasıl ilişkilidir?",
        description:
          "Üç bağlantı türü aynı dağıtım planında birlikte kullanılabilir, ancak farklı aşamalarda farklı görevler üstlenir.",
        items: [
          {
            title: "UTM’li hedef URL",
            description:
              "Hedef sitenin analytics sistemi için kaynak, medium ve kampanya parametreleri taşır. Public UTM aracı bu uzun URL’yi hazırlar, kısaltmaz.",
          },
          {
            title: "Ana kısa link",
            description:
              "Onaylanan hedef URL’yi example.invalid/[slug] biçiminde paylaşılabilir hâle getirir. Hedefteki UTM parametreleri korunabilir.",
          },
          {
            title: "Kanal linki",
            description:
              "Yalnız onaylı ana linkten türetilir; Instagram, WhatsApp veya QR gibi dağıtım noktalarını ayrı kanal kimliği ve UTM değerleriyle ayırır.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Analytics kapsamı",
        title: "Kısa link tıklamalarında hangi veriler görülebilir?",
        description:
          "Panelim’de bağlantıya gelen yönlendirme isteklerinin zaman, kanal ve teknik dağılımlarını inceleyebilirsin.",
        items: [
          {
            title: "Tıklama özeti",
            description:
              "Toplam tıklama, bugünkü tıklama, son 7 gün ve son tıklamalar görüntülenebilir.",
          },
          {
            title: "Zaman eğilimleri",
            description: "Günlük ve saatlik tıklama eğilimleri karşılaştırılabilir.",
          },
          {
            title: "Kanal ve cihaz",
            description:
              "Kanal, cihaz ve işletim sistemi dağılımları raporlanabilir.",
          },
          {
            title: "Yaklaşık konum",
            description:
              "Yaklaşık konum dağılımı görülebilir; bu veri kesin konum veya kişi kimliği anlamına gelmez.",
          },
        ],
      },
      {
        type: "scope",
        eyebrow: "Kullanım sınırları",
        title: "Kısa link verisi hangi sonuçları göstermez?",
        description:
          "Tıklama analizi bağlantıya gelen yönlendirme isteğini gösterir; ziyaretçinin kimliğini veya sonrasındaki iş sonucunu kanıtlamaz.",
        items: [
          {
            title: "Satış ve dönüşüm",
            description:
              "TrulyGo satış, gelir, lead veya conversion sonucu ölçmez; tıklama ile satış aynı şey değildir.",
          },
          {
            title: "Kişi takibi",
            description:
              "Raporlar belirli bir kişinin kim olduğunu veya hedef sitede hangi işlemi tamamladığını göstermez.",
          },
          {
            title: "Onay garantisi",
            description:
              "Her talebin otomatik onaylanacağı veya belirli bir sürede sonuçlanacağı söylenemez.",
          },
          {
            title: "Hesapsız kısa link",
            description:
              "Ana kısa link oluşturma hesap ve Panelim gerektirir. Üyeliksiz public araç yalnız UTM’li URL hazırlar.",
          },
        ],
      },
      {
        type: "faq",
        eyebrow: "SSS",
        title: "Güvenli link kısaltma hakkında sık sorulan sorular",
        items: [
          {
            title: "Link kısaltma nedir?",
            description:
              "Uzun bir hedef URL’yi daha kısa bir paylaşım adresi üzerinden aynı hedefe yönlendirme işlemidir. TrulyGo’da link güvenlik ve onay akışından geçer.",
          },
          {
            title: "TrulyGo’da kısa link nasıl oluşturulur?",
            description:
              "Hesabınla Panelim’e girip hedef URL’yi, kısa slug’ı ve varsa kampanya adını kaydedersin. Talep onaylandıktan sonra kısa link çalışır.",
          },
          {
            title: "Hedef URL sonradan değiştirilebilir mi?",
            description:
              "Hayır. Onaylanan hedef URL kullanıcı tarafından değiştirilemez. Farklı bir hedef için yeni bir link talebi oluşturulur.",
          },
          {
            title: "Kısa link oluşturmak için hesap gerekir mi?",
            description:
              "Evet. Ana kısa link talebi Panelim’de hesapla oluşturulur. Public UTM aracı kısa link üretmez.",
          },
          {
            title: "UTM parametreleri kısa linkte kaybolur mu?",
            description:
              "Hayır. UTM parametreleri hedef URL’de bulunuyorsa ana kısa link bu hedefe yönlendirirken korunabilir.",
          },
          {
            title: "Kanal linki ile ana kısa link arasındaki fark nedir?",
            description:
              "Ana kısa link onaylanan temel bağlantıdır. Kanal linkleri yalnız bu onaylı ana linkten belirli dağıtım noktaları için türetilir.",
          },
          {
            title: "TrulyGo tıklama dışında satış ölçer mi?",
            description:
              "Hayır. TrulyGo kısa link tıklamalarını ve trafik kırılımlarını raporlar; satış, gelir, lead veya conversion ölçmez.",
          },
          {
            title: "Onaylanmayan link çalışır mı?",
            description:
              "Hayır. Yalnız approved durumundaki ana link yönlendirme yapar; her talebin onaylanacağı veya onay süresi garanti edilmez.",
          },
        ],
      },
    ],
    visual: {
      label: "Temsili kısa link akışı",
      title: "Uzun hedef → onaylı kısa link",
      caption: "Uzun hedef, güvenlik ve onay sürecinden sonra değiştirilemez hedefli kısa linke dönüşür.",
      rows: ["Hedef URL", "Güvenlik kontrolü", "Onay", "Tıklama analizi"],
      statusLabel: "Onaylı",
      footerItems: ["Hedef", "Kısa Link", "Analiz"],
    },
    cta: {
      title: "Uzun hedefin için güvenli kısa link talebi oluştur.",
      description:
        "Hedef URL’yi ve kısa slug’ı Panelim’de gir; güvenlik ve onay sürecinden sonra bağlantını paylaş.",
      authHref: "/dashboard",
      guestHref: "/register",
      authLabel: "Kısa link oluştur",
      guestLabel: "Hesap oluştur",
      secondaryHref: "/utm-link-olusturucu",
      secondaryLabel: "Ücretsiz UTM linki oluştur",
    },
  },
};

export const seoFooterLinks = Object.values(seoLandingPages)
  .filter((page) => page.footerOrder !== null)
  .sort((left, right) => (left.footerOrder ?? 0) - (right.footerOrder ?? 0))
  .map(({ footerLabel, path }) => ({ label: footerLabel, path }));

export const seoLandingSitemapEntries = Object.values(seoLandingPages).map(({ path }) => ({ path }));

export function createSeoLandingMetadata(pageId: SeoLandingPageId): Metadata {
  const page = seoLandingPages[pageId];
  const title = page.metadataTitle.includes(SITE_NAME)
    ? { absolute: page.metadataTitle }
    : page.metadataTitle;

  return {
    title,
    description: page.metadataDescription,
    robots: PUBLIC_ROBOTS,
    alternates: localizedAlternates(page.path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "tr_TR",
      url: canonicalUrl(page.path),
      title: page.metadataTitle,
      description: page.metadataDescription,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metadataTitle,
      description: page.metadataDescription,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function seoLandingBreadcrumbItems(page: SeoLandingPageConfig) {
  return [
    { name: "Ana Sayfa", path: "/" },
    { name: page.breadcrumbLabel ?? page.footerLabel, path: page.path },
  ] as const;
}

// BreadcrumbList JSON-LD and the visible breadcrumb share the same items.
// Visible FAQ content stays in the page without publishing FAQPage data.
export function seoLandingStructuredData(page: SeoLandingPageConfig) {
  const breadcrumbs = seoLandingBreadcrumbItems(page);

  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((breadcrumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: breadcrumb.name,
          item: canonicalUrl(breadcrumb.path),
        })),
    },
  ];
}
