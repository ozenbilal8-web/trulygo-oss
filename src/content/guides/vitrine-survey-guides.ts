import {
  TRULYGO_GUIDE_PUBLISHER,
  guideLink,
  inlineCode,
  line,
  plain,
  strong,
  type GuideArticle,
} from "./types";

export const vitrineSurveyGuides = [
  {
    slug: "link-vitrini-nedir",
    title: "Link Vitrini Nedir? Tüm Bağlantılarınızı Tek Sayfada Toplayın",
    seoTitle: "Link Vitrini Nedir? Bağlantılarınızı Tek Sayfada Toplayın",
    description:
      "Link Vitrini'nin ne işe yaradığını, iyi bir bağlantı sayfasının nasıl planlandığını ve TrulyGo ile nasıl yayınlandığını öğrenin.",
    category: "link-vitrini",
    primaryIntent: "Link Vitrini kavramını öğrenmek ve markalı bir bağlantı sayfası kurmak",
    secondaryIntents: [
      "Bağlantıları tek sayfada toplamanın hangi durumlarda yararlı olduğunu anlamak",
      "TrulyGo Link Vitrini'nin yayınlama, QR ve ölçüm sınırlarını öğrenmek",
      "Kendi bağlantı sayfasını planlayıp oluşturmaya başlamak",
    ],
    primaryQuery: "link vitrini nedir",
    secondaryQueries: [
      "bio link sayfası nedir",
      "tüm linkleri tek sayfada toplama",
      "sosyal medya link sayfası",
      "link vitrini oluşturma",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "Link Vitrini Rehberi",
    },
    relatedArticles: [
      "instagram-bio-birden-fazla-link",
      "trulygo-anket-olusturma",
      "online-anket-nasil-hazirlanir",
    ],
    cta: {
      href: "/link-vitrini",
      label: "Link Vitrini'ni incele",
      title: "Bağlantılarını düzenli bir sayfada bir araya getir",
      description:
        "Profil, sıralama, görünüm ve yayın akışını ürün sayfasında incele; ardından hesabınla oluşturmaya geç.",
    },
    sections: [
      {
        id: "link-vitrini-ne-ise-yarar",
        title: "Link Vitrini ne işe yarar?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Link Vitrini; web siteniz, sosyal hesaplarınız, mağazalarınız ve öne çıkarmak istediğiniz sayfalar için ",
              strong("tek bir düzenli giriş noktası"),
              " oluşturur. İnsanlara uzun bir bağlantı listesi göndermek yerine, güncel tuttuğunuz tek bir Vitrin adresini paylaşabilirsiniz.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Bu yaklaşım özellikle farklı kanallarda içerik üretenler, birden fazla mağazada satış yapanlar, portföyünü paylaşanlar ve dönemsel olarak önceliği değişen bağlantıları olan ekipler için kullanışlıdır. Amaç yalnızca daha çok bağlantı göstermek değil; ziyaretçinin önce neyi görmesi gerektiğine karar vermektir.",
            ),
          },
          {
            type: "list",
            items: [
              plain("Sosyal profillerde kısa ve hatırlanabilir tek bir hedef paylaşmak"),
              plain("Kampanya, mağaza, iletişim ve içerik bağlantılarını önem sırasına koymak"),
              plain("Farklı platformlardaki hesapları aynı görsel kimlik altında toplamak"),
              plain("Güncellenecek bağlantıları, daha önce paylaşılan ana adresi değiştirmeden yönetmek"),
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "Tek bağlantı zorunluluğu olduğu için değil, daha iyi bir yolculuk için",
            content: line(
              "Instagram bugün profil alanında birden fazla yerel bağlantıyı destekler. Link Vitrini bu desteğin yokluğuna dayanan bir hile değildir; daha fazla düzen, marka görünümü ve kanallar arası ortak bir sayfa isteyenler için ayrı bir tercihtir. Ayrıntılı karşılaştırma için ",
              guideLink(
                "Instagram bio'ya birden fazla link ekleme rehberine",
                "/rehberler/instagram-bio-birden-fazla-link",
              ),
              " geçebilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "iyi-bir-vitrin-nasil-planlanir",
        title: "İyi bir bağlantı sayfası nasıl planlanır?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Bağlantıları eklemeden önce ziyaretçinin sayfaya hangi bağlamda geleceğini düşünün. Bir Instagram takipçisi, fiziksel bir etkinlikte QR kodu tarayan kişi veya mağazanızı arayan müşteri aynı niyetle gelmeyebilir. Yine de herkesin karşısına çıkan ilk birkaç öğe, en önemli işi kolaylaştırmalıdır.",
            ),
          },
          {
            type: "steps",
            items: [
              {
                title: "Birincil amacı seçin",
                content: plain(
                  "Satın alma, iletişim, yeni içeriği izleme veya portföy inceleme gibi tek bir ana eylemi belirleyin.",
                ),
              },
              {
                title: "Bağlantıları önem sırasına koyun",
                content: plain(
                  "En çok öğeyi değil, ziyaretçinin karar vermesini kolaylaştıran en anlamlı sırayı hedefleyin.",
                ),
              },
              {
                title: "Etiketleri anlaşılır yazın",
                content: plain(
                  "“Buraya tıkla” yerine “Yeni koleksiyonu incele” veya “WhatsApp'tan ulaş” gibi sonucu anlatan ifadeler kullanın.",
                ),
              },
              {
                title: "Yayın öncesi kontrol edin",
                content: plain(
                  "Telefon görünümünde metinleri, bağlantı hedeflerini ve ilk ekranda hangi öğelerin göründüğünü tek tek sınayın.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Az ama amaçlı bağlantı",
            content: plain(
              "Bir sayfaya eklenebiliyor olması her bağlantının eklenmesi gerektiği anlamına gelmez. Eski kampanyaları pasife almak ve en önemli hedefi yukarı taşımak, yeni bir bağlantı eklemek kadar değerlidir.",
            ),
          },
        ],
      },
      {
        id: "trulygo-link-vitrini-ozellikleri",
        title: "TrulyGo Link Vitrini ile neleri düzenleyebilirsiniz?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "TrulyGo Link Vitrini; 20 desteklenen sosyal medya, iletişim, video, web sitesi ve pazaryeri platformunu ortak bir profil üzerinde toplar. Aynı platform için birden fazla URL ekleyebilir, öğeleri genel sıralamada yeniden düzenleyebilir ve bir platform grubunu gerektiğinde topluca aktif veya pasif hâle getirebilirsiniz.",
            ),
          },
          {
            type: "table",
            caption: "Vitrinde yönetilebilen başlıca öğeler",
            headers: ["Alan", "Ne sağlar?"],
            rows: [
              ["Profil", "Görünen ad, kısa biyografi, avatar ve banner"],
              ["Görünüm", "10 tema arasından seçim"],
              ["Bağlantılar", "Platform, özel etiket, aktiflik ve genel sıralama"],
              ["Ticari içerik", "Reklam, Sponsorlu veya İş Birliği etiketi"],
              ["Vurgu", "Beş isteğe bağlı bağlantı animasyonu"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Sponsor veya iş birliği niteliği taşıyan bir öğeyi uygun etiketle göstermek, ziyaretçiye bağlam verir. Animasyon ise yalnızca gerçekten öne çıkarılması gereken bir bağlantıda kullanılmalıdır; aynı anda çok sayıda hareketli öğe, hiyerarşiyi güçlendirmek yerine zayıflatabilir.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Görsel dosya sınırları",
            content: plain(
              "Avatar en fazla 2 MB, banner en fazla 5 MB olabilir. Bu alanlar JPEG, PNG veya WebP dosyalarını kabul eder. Görseli yüklemeden önce mobil kırpmayı ve okunabilirliği kontrol edin.",
            ),
          },
        ],
      },
      {
        id: "taslaktan-yayina",
        title: "Taslak hazırlamadan yayınlamaya kadar temel akış",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Profil temelini tamamlayın",
                content: plain(
                  "Görünen adınızı, kısa biyografinizi, benzersiz handle'ınızı ve kullanacağınız temayı belirleyin.",
                ),
              },
              {
                title: "Bağlantıları ekleyin",
                content: plain(
                  "Platformları seçin; gerekiyorsa aynı platforma birden fazla URL ekleyin ve ziyaretçiye ne bulacağını anlatan etiketler yazın.",
                ),
              },
              {
                title: "Sıralama ve aktifliği düzenleyin",
                content: plain(
                  "Önemli bağlantıları yukarı taşıyın, şu anda kullanılmaması gereken grupları pasife alın.",
                ),
              },
              {
                title: "Taslağı kaydedin ve önizleyin",
                content: plain(
                  "Yayınlamadan önce hedef URL'leri ve sayfanın farklı ekranlardaki akışını kontrol edin.",
                ),
              },
              {
                title: "Yayınlayın",
                content: line(
                  "Yayımlanan sayfa ",
                  inlineCode("/v/[handle]"),
                  " adresinden açılır. Daha sonra içerik ve sıralama üzerinde güncelleme yapabilirsiniz.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "Yayınlamak, arama sonucu garantisi değildir",
            content: plain(
              "Bir Vitrinin herkese açık olması ile arama motorlarında dizine alınması aynı şey değildir. TrulyGo, profil niteliğini karşılamayan sayfaları indekslemeye açmayabilir; Google'ın bir sayfayı taraması veya sonuçlarda göstermesi de garanti edilemez.",
            ),
          },
        ],
      },
      {
        id: "qr-olcum-ve-signal",
        title: "QR paylaşımı, ölçüm sınırı ve Signal entegrasyonu",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Kaydedilmiş Vitrininiz için doğrudan ",
              inlineCode("/v/[handle]"),
              " adresini açan QR kodu oluşturabilirsiniz. QR kartında renk seçebilir; PNG veya SVG indirebilirsiniz. En fazla 1 MB boyutundaki PNG, JPEG ya da WebP logo yalnızca PNG çıktısına işlenir; SVG çıktısı logosuzdur. QR hedefinin açılması için Vitrinin yayımlanmış olması gerekir.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Panelde gösterilen ölçüm, yaklaşık 30 dakikalık pencereye göre yumuşak biçimde tekilleştirilen toplam profil görüntülenmesidir. Bu sayı kesin kişi sayısı değildir. Mevcut Link Vitrini, bağlantı başına tıklama, QR tarama kaynağı, cihaz, konum veya dönüşüm analitiği sunmaz; bu nedenle içerik performansını anlatırken yalnızca gerçekten görünen metriği kullanın.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Yayımlanmış bir Signal anketini ayrıca Vitrinde kart olarak gösterebilirsiniz. Böylece ziyaretçi profil bağlamından ankete geçer. Önce iyi bir anketin nasıl tasarlanacağını öğrenmek için ",
              guideLink(
                "online anket hazırlama rehberini",
                "/rehberler/online-anket-nasil-hazirlanir",
              ),
              ", ardından ürün adımlarını görmek için ",
              guideLink(
                "TrulyGo ile anket oluşturma rehberini",
                "/rehberler/trulygo-anket-olusturma",
              ),
              " okuyabilirsiniz.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "instagram-bio-birden-fazla-link",
    title: "Instagram Bio'ya Birden Fazla Link Nasıl Eklenir?",
    seoTitle: "Instagram Bio'ya Birden Fazla Link Nasıl Eklenir?",
    description:
      "Instagram'ın yerleşik çoklu bağlantı seçeneğini ve Link Vitrini yaklaşımını karşılaştırın; bio bağlantılarınızı amaçlı biçimde düzenleyin.",
    category: "link-vitrini",
    primaryIntent: "Instagram profilinde birden fazla bağlantı paylaşmak",
    secondaryIntents: [
      "Instagram'ın yerleşik çoklu bağlantı seçeneğini kullanmayı öğrenmek",
      "Yerleşik bağlantılar ile Link Vitrini yaklaşımını karşılaştırmak",
      "Instagram trafiği için düzenli bir bio bağlantı sayfası hazırlamak",
    ],
    primaryQuery: "instagram bio birden fazla link ekleme",
    secondaryQueries: [
      "instagram biyografiye çoklu link",
      "instagram bio link sayfası",
      "instagram link ekleme",
      "instagram tüm linkleri tek yerde toplama",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "Instagram ve Link Vitrini",
    },
    relatedArticles: [
      "link-vitrini-nedir",
      "instagram-link-takibi",
      "utm-nedir",
    ],
    cta: {
      href: "/link-vitrini",
      label: "Link Vitrini'ni incele",
      title: "Bio ziyaretçilerine düzenli bir sonraki adım sun",
      description:
        "Bağlantılarını önceliklendirme ve tek bir Vitrin adresinde sunma akışını hesap açmadan önce incele.",
    },
    sections: [
      {
        id: "instagram-coklu-link-destegi",
        title: "Instagram bio'da birden fazla link kullanılabilir mi?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              strong("Evet."),
              " Instagram profil düzenleme alanında birden fazla bağlantıyı yerleşik olarak eklemeyi destekler. Bu nedenle “Instagram yalnızca tek linke izin verir” önermesi güncel ve doğru bir başlangıç değildir.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Asıl karar, bağlantıları Instagram içinde ayrı ayrı göstermek mi yoksa tek bir markalı sayfada düzenlemek mi istediğinizdir. Birkaç sabit hedef için yerleşik liste yeterli olabilir. Farklı platformlar, mağazalar, kampanyalar veya dönemsel öncelikler arasında daha güçlü bir hiyerarşi kurmanız gerekiyorsa Link Vitrini daha uygun olabilir.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Arayüz adları değişebilir",
            content: plain(
              "Instagram uygulamasındaki menü isimleri ve sıralama adımları sürüme, işletim sistemine veya hesaba göre değişebilir. Genel yol profil düzenleme ekranındaki bağlantılar bölümüdür; kendi uygulamanızda görünen güncel seçenekleri esas alın.",
            ),
          },
        ],
      },
      {
        id: "instagram-yerlesik-link-ekleme",
        title: "Instagram'ın yerleşik bağlantı alanını kullanma",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Profilinizi düzenleyin",
                content: plain(
                  "Instagram profilinizden profil düzenleme ekranını açın ve bağlantılar bölümünü bulun.",
                ),
              },
              {
                title: "Hedef URL'yi ekleyin",
                content: plain(
                  "Bağlantıyı eksiksiz yazın; mümkünse başlıkta ziyaretçinin karşılaşacağı sayfayı açıkça anlatın.",
                ),
              },
              {
                title: "Diğer bağlantıları ekleyin ve sıralayın",
                content: plain(
                  "En önemli hedefi ilk sıraya alın. Menüde sıralama desteği görünüyorsa bağlantıları güncel önceliğinize göre düzenleyin.",
                ),
              },
              {
                title: "Profilden test edin",
                content: plain(
                  "Kendi profilinizi ziyaretçi gibi açın; her bağlantının doğru sayfaya gittiğini ve başlıkların anlaşılır olduğunu doğrulayın.",
                ),
              },
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Bağlantı listesi kısa kaldığı sürece bu yöntem hızlı ve doğrudandır. Ancak her yeni hedefte liste uzuyor, görsel bağlam eksik kalıyor veya aynı bağlantı düzenini başka kanallarda da kullanmak istiyorsanız ortak bir Vitrin sayfası yönetimi kolaylaştırabilir.",
            ),
          },
        ],
      },
      {
        id: "yerlesik-link-ve-vitrin-karsilastirmasi",
        title: "Yerleşik bağlantılar mı, Link Vitrini mi?",
        blocks: [
          {
            type: "table",
            caption: "İhtiyaca göre iki yaklaşım",
            headers: ["İhtiyaç", "Daha doğal başlangıç"],
            rows: [
              ["Birkaç sabit URL'yi hızla göstermek", "Instagram'ın yerleşik bağlantı alanı"],
              ["Aynı sayfayı Instagram dışında da paylaşmak", "Link Vitrini"],
              ["Profil, biyografi, banner ve tema ile marka görünümü kurmak", "Link Vitrini"],
              ["Farklı platform ve mağaza bağlantılarını birlikte sıralamak", "Link Vitrini"],
              ["Instagram'dan çıkmadan basit bir liste sunmak", "Instagram'ın yerleşik bağlantı alanı"],
            ],
          },
          {
            type: "paragraph",
            content: line(
              "TrulyGo Link Vitrini'nin yapısını, yayın akışını ve gerçek ölçüm sınırlarını ayrıntılı görmek için ",
              guideLink("Link Vitrini nedir?", "/rehberler/link-vitrini-nedir"),
              " rehberini okuyun. İki yöntem birbirini dışlamak zorunda değildir; örneğin Instagram'da Vitrin adresini öne çıkarırken önemli bir kampanya bağlantısını ayrıca yerel listede tutabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "instagram-icin-vitrin-kurma",
        title: "Instagram trafiği için Link Vitrini hazırlama",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Instagram'dan gelen kişi çoğunlukla telefonda ve hızlı karar verir. Bu nedenle Vitrinin üst bölümünde kim olduğunuz, ne sunduğunuz ve en önemli eylem açıkça anlaşılmalıdır. TrulyGo'da görünen ad, kısa biyografi, avatar, banner ve 10 temadan biriyle bu bağlamı oluşturabilirsiniz.",
            ),
          },
          {
            type: "steps",
            items: [
              {
                title: "Ana hedefi ilk sıraya koyun",
                content: plain(
                  "Yeni video, mağaza, randevu veya iletişim hedeflerinden hangisi güncel önceliğinizse onu ilk ekrana taşıyın.",
                ),
              },
              {
                title: "Etiketleri sonuç odaklı yazın",
                content: plain(
                  "Platform adını tekrarlamak yerine “Portföyü incele” veya “Yeni videoyu izle” gibi bir sonraki adımı açıklayın.",
                ),
              },
              {
                title: "Gereksiz öğeleri pasife alın",
                content: plain(
                  "Biten kampanyaları silmek zorunda değilsiniz; görünmemesi gereken platform grubunu pasife alabilirsiniz.",
                ),
              },
              {
                title: "Yayınlayıp gerçek cihazda deneyin",
                content: plain(
                  "Vitrini yayınladıktan sonra Instagram bio alanından açın, yüklenme akışını ve tüm hedefleri telefonunuzda test edin.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Ticari bağlantıları açıkça işaretleyin",
            content: plain(
              "TrulyGo'daki Reklam, Sponsorlu ve İş Birliği etiketleri ziyaretçiye bağlam sunar. Etiketi, ilişkinin niteliğine ve tabi olduğunuz açıklama yükümlülüklerine uygun biçimde kullanın.",
            ),
          },
        ],
      },
      {
        id: "paylasim-ve-olcum",
        title: "Bio bağlantısını yayınladıktan sonra neyi kontrol etmelisiniz?",
        blocks: [
          {
            type: "list",
            items: [
              plain("Instagram profilinizdeki Vitrin adresinin doğru yazıldığını"),
              plain("Vitrinin yayımlanmış olduğunu ve gizli/pasif öğelerin görünmediğini"),
              plain("İlk sıradaki bağlantının güncel kampanya veya içerikle eşleştiğini"),
              plain("Hedef sayfaların mobilde açıldığını ve güven veren bir alan adına gittiğini"),
              plain("Sponsorlu veya iş birliği bağlantılarında gereken açıklamaların bulunduğunu"),
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "TrulyGo Link Vitrini panelindeki sayı, yaklaşık 30 dakikalık pencereye göre yumuşak biçimde tekilleştirilmiş toplam profil görüntülenmesidir. Bu, kesin kişi sayısı veya bağlantı bazında tıklama raporu değildir. Link Vitrini şu anda bağlantı başına tıklama, cihaz, konum, QR kaynağı ya da dönüşüm analitiği sunmaz.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Bir Instagram kampanyasının kaynak ve içerik varyasyonlarını bağlantı düzeyinde ayırmak istiyorsanız, Vitrin görüntülenme sayısını bağlantı takibi gibi yorumlamak yerine ",
              guideLink("Instagram link takibi rehberine", "/rehberler/instagram-link-takibi"),
              " geçerek UTM planınızı ayrıca kurun.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "online-anket-nasil-hazirlanir",
    title: "Online Anket Nasıl Hazırlanır? Adım Adım Rehber",
    seoTitle: "Online Anket Nasıl Hazırlanır? Adım Adım Rehber",
    description:
      "Amacı belirlemekten tarafsız sorular yazmaya, pilot denemeden sonuçları doğru yorumlamaya kadar iyi bir online anket hazırlayın.",
    category: "anket",
    primaryIntent: "Doğru sorularla güvenilir ve uygulanabilir bir online anket hazırlamak",
    secondaryIntents: [
      "Tarafsız ve anlaşılır anket soruları yazmayı öğrenmek",
      "Anket akışını, pilot denemeyi ve dağıtımı planlamak",
      "Toplu sonuçları örneklem sınırlarıyla yorumlamak",
    ],
    primaryQuery: "online anket nasıl hazırlanır",
    secondaryQueries: [
      "anket sorusu nasıl yazılır",
      "online anket hazırlama",
      "anket oluşturma adımları",
      "iyi anket örnekleri",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "Online Anket Rehberi",
    },
    relatedArticles: [
      "trulygo-anket-olusturma",
      "link-vitrini-nedir",
    ],
    cta: {
      href: "/anket-olusturucu",
      label: "Online anket oluştur",
      title: "Sorularını Signal ile düzenlemeye hazırlan",
      description:
        "Signal'in soru yapısını, koşullu akışını ve yayın sınırlarını ürün sayfasında incele; ardından oluşturmaya geç.",
    },
    sections: [
      {
        id: "karardan-baslayin",
        title: "1. Önce anketi değil, vereceğiniz kararı tanımlayın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "İyi bir anket, “İnsanlara ne sorabiliriz?” diye değil, “Bu cevaplarla hangi kararı vereceğiz?” diye başlar. Amaç belirsizse soru sayısı hızla artar; katılımcı yorulur ve sonuçlar eyleme dönüşmez.",
            ),
          },
          {
            type: "steps",
            items: [
              {
                title: "Kararı tek cümleyle yazın",
                content: plain(
                  "Örneğin “Bir sonraki etkinliğin saatini seçeceğiz” veya “En çok ihtiyaç duyulan içerik başlığını belirleyeceğiz.”",
                ),
              },
              {
                title: "Kimden yanıt istediğinizi tanımlayın",
                content: plain(
                  "Mevcut müşteriler, etkinlik katılımcıları veya belirli bir topluluk gibi hedef grubu açıkça sınırlandırın.",
                ),
              },
              {
                title: "Hangi bilgiyi gerçekten kullanacağınızı seçin",
                content: plain(
                  "Kararı etkilemeyecek merak sorularını çıkarın. Her soru, tanımladığınız amaca hizmet etsin.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Başarı ölçütü",
            content: plain(
              "Anket bitince hangi seçeneğin neyi değiştireceğini önceden yazabiliyorsanız, amacınız büyük olasılıkla yeterince nettir.",
            ),
          },
        ],
      },
      {
        id: "tarafsiz-soru-yazma",
        title: "2. Kısa, tarafsız ve tek konulu sorular yazın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Katılımcı, sizin neyi duymak istediğinizi tahmin etmek zorunda kalmamalıdır. Yönlendirici sıfatlar, iki ayrı konuyu tek soruya sıkıştırmak ve belirsiz zaman ifadeleri cevapların yorumunu zorlaştırır.",
            ),
          },
          {
            type: "table",
            caption: "Soruyu daha ölçülebilir hâle getirme örnekleri",
            headers: ["Kaçının", "Daha açık alternatif"],
            rows: [
              [
                "Harika yeni tasarımımızı beğendiniz mi?",
                "Yeni tasarım için değerlendirmeniz nedir?",
              ],
              [
                "İçeriklerimizi ve destek hizmetimizi nasıl buluyorsunuz?",
                "İçerik ve destek hizmeti için iki ayrı soru sorun.",
              ],
              [
                "Bizi sık sık kullanıyor musunuz?",
                "Son 30 günde kaç kez kullandınız?",
              ],
            ],
          },
          {
            type: "list",
            items: [
              plain("Katılımcının anlayacağı gündelik kelimeler kullanın."),
              plain("Her soruda tek bir karar veya deneyim sorun."),
              plain("Seçeneklerin birbirini mümkün olduğunca dışlamasını sağlayın."),
              plain("Tarih ya da sıklık soruyorsanız net bir dönem belirtin."),
              plain("Gerekli olmayan kişisel veya hassas bilgileri istemeyin."),
            ],
          },
        ],
      },
      {
        id: "akis-ve-kosullu-soru",
        title: "3. Soru akışını katılımcının bağlamına göre kurun",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Kolay ve genel sorularla başlayın, daha ayrıntılı değerlendirmeleri sonra sorun. Bir sorunun yalnızca belirli cevabı veren kişiler için anlamlı olduğu durumlarda koşullu takip sorusu kullanmak, ilgisiz bir soruyu herkese göstermekten daha temizdir.",
            ),
          },
          {
            type: "code",
            label: "Basit koşullu akış örneği",
            code: "Ana soru: Son etkinliğimize katıldınız mı?\n- Evet  → Takip: Hangi oturumu en yararlı buldunuz?\n- Hayır → Sonraki ana soruya geç",
          },
          {
            type: "paragraph",
            content: plain(
              "Koşullu akışı yalnızca gerçekten gerekli olduğunda kullanın. Çok katmanlı dallar, özellikle kısa mobil anketlerde katılımcının nerede olduğunu anlamasını zorlaştırabilir. TrulyGo Signal'de her ana soruya en fazla bir, iç içe geçmeyen koşullu takip sorusu eklenebilir.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Signal'in soru yapısı",
            content: line(
              "Signal, 1–20 tek seçimli ana soru; her ana soruda 2–6 seçenek ve isteğe bağlı takip sorusunda 2–4 seçenek destekler. Ürüne özgü adımlar için ",
              guideLink(
                "TrulyGo ile online anket oluşturma rehberine",
                "/rehberler/trulygo-anket-olusturma",
              ),
              " bakabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "pilot-yayin-ve-dagitim",
        title: "4. Küçük bir pilot yapın, sonra doğru kanalda paylaşın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Anketi geniş kitleye göndermeden önce hedef gruba benzeyen birkaç kişiyle deneyin. Onlardan yalnızca cevap vermelerini değil, anlaşılmayan ifadeleri, eksik seçenekleri ve akışta takıldıkları yerleri de söylemelerini isteyin.",
            ),
          },
          {
            type: "list",
            ordered: true,
            items: [
              plain("Soruların aynı biçimde anlaşılıp anlaşılmadığını kontrol edin."),
              plain("Seçeneklerde katılımcıyı zorunlu ve yanlış bir tercihe iten boşluklar arayın."),
              plain("Anketi telefonda tamamlayın ve gereksiz uzunluğu azaltın."),
              plain("Yanıtların ne amaçla kullanılacağını gerekli ölçüde açıklayın."),
              plain("Paylaşım metninde hedef kitleyi ve kapanış zamanını belirtin."),
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Paylaşım kanalı, örnekleminizi belirler. Yalnızca en sadık takipçilerinize gönderilen bir anket, tüm müşterileri temsil etmeyebilir. Daha fazla cevap almak bu yanlılığı otomatik olarak ortadan kaldırmaz.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Gizlilik ve beklenti yönetimi",
            content: plain(
              "Kimlik doğrulaması olmayan bir ankette “her kişi yalnızca bir kez oy verir” garantisi vermeyin. Gerekmedikçe kişisel veri toplamayın; hassas veya düzenlemeye tabi bir araştırmada kendi hukuki ve etik gerekliliklerinizi ayrıca değerlendirin.",
            ),
          },
        ],
      },
      {
        id: "sonuclari-yorumlama",
        title: "5. Sonuçları sayının ötesinde, sınırlarıyla yorumlayın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Sonuç ekranındaki yüzdeler, ankete cevap veren kişilerin dağılımını gösterir. Bu dağılımı karar verirken kullanabilirsiniz; ancak katılımcıların nasıl seçildiği, hangi kanalda davet edildiği ve kimlerin yarıda bıraktığı yorumun sınırlarını belirler.",
            ),
          },
          {
            type: "steps",
            items: [
              {
                title: "Katılımı kontrol edin",
                content: plain(
                  "Kaç kişinin tamamladığını ve toplam cevap sayısını birlikte değerlendirin.",
                ),
              },
              {
                title: "Dağılıma bakın",
                content: plain(
                  "Yalnızca kazanan seçeneği değil, yakın sonuçları ve küçük grupları da görün.",
                ),
              },
              {
                title: "Koşullu sonuçları doğru tabanla okuyun",
                content: plain(
                  "Takip sorusunu yalnızca tetikleyici cevabı verenlerin gördüğünü unutmayın.",
                ),
              },
              {
                title: "Kararı ve belirsizliği birlikte kaydedin",
                content: plain(
                  "Hangi sonucu neden kullandığınızı ve örneklemin hangi grupları temsil etmeyebileceğini not edin.",
                ),
              },
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Anketi sosyal profilinizden düzenli bir geçişle sunmak istiyorsanız, yayımlanmış Signal anketini Link Vitrininde kart olarak gösterebilirsiniz. Bunun için ",
              guideLink("Link Vitrini rehberindeki", "/rehberler/link-vitrini-nedir"),
              " yayın ve ölçüm sınırlarını da inceleyin.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "trulygo-anket-olusturma",
    title: "TrulyGo ile Online Anket Nasıl Oluşturulur?",
    seoTitle: "TrulyGo ile Online Anket Nasıl Oluşturulur?",
    description:
      "TrulyGo Signal'de tek seçimli sorular ekleyin, koşullu akışı ayarlayın, anketi yayınlayın ve toplu sonuçları doğru okuyun.",
    category: "anket",
    primaryIntent: "TrulyGo Signal ile adım adım online anket oluşturmak",
    secondaryIntents: [
      "Signal'in soru, seçenek ve koşullu takip sınırlarını öğrenmek",
      "Anketi taslaktan yayına alıp doğrudan bağlantıyla paylaşmak",
      "Toplu Signal sonuçlarını doğru biçimde değerlendirmek",
    ],
    primaryQuery: "TrulyGo anket oluşturma",
    secondaryQueries: [
      "Signal anket oluşturma",
      "TrulyGo online anket",
      "koşullu anket sorusu oluşturma",
      "online anket yayınlama",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "Signal Ürün Rehberi",
    },
    relatedArticles: [
      "online-anket-nasil-hazirlanir",
      "link-vitrini-nedir",
    ],
    cta: {
      href: "/dashboard/signal/new",
      label: "Signal anketi oluştur",
      title: "İlk soruyu taslağa ekleyerek başla",
      description:
        "Tek seçimli sorularını ekle, paylaşım ayarlarını kontrol et ve hazır olduğunda anketini yayınla.",
    },
    sections: [
      {
        id: "baslamadan-once",
        title: "Başlamadan önce: Signal hangi anketler için uygundur?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "TrulyGo Signal; kısa ve anlaşılır tek seçimli sorularla topluluk tercihi, etkinlik geri bildirimi, içerik seçimi veya basit ürün görüşü toplamak için tasarlanmıştır. Katılımcının seçeneklerden birini seçtiği yapı uygunsa hızlı bir akış kurabilirsiniz.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Önce araştırma amacınızı, hedef grubunuzu ve kullanacağınız kararı belirleyin. Soru yazımı ve örneklem hataları için ",
              guideLink(
                "online anket nasıl hazırlanır?",
                "/rehberler/online-anket-nasil-hazirlanir",
              ),
              " rehberini okumak, üründeki alanları doldurmadan önce daha sağlam bir çerçeve kurmanızı sağlar.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Desteklenen soru türünü doğru seçin",
            content: plain(
              "Signal şu anda serbest metin, çoklu seçim, matris, dosya yükleme, puanlama testi veya iç içe geçmiş gelişmiş dallanma sunmaz. Sorunuz tek seçimli seçeneklerle cevaplanamıyorsa bu akış uygun olmayabilir.",
            ),
          },
        ],
      },
      {
        id: "anket-temelini-olusturma",
        title: "1. Anket başlığını, açıklamasını ve adresini hazırlayın",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Hesabınızla oluşturma ekranını açın",
                content: line(
                  inlineCode("/dashboard/signal/new"),
                  " adresi anket sahibi için oluşturma ekranıdır. Anket oluşturmak ve yönetmek hesap gerektirir.",
                ),
              },
              {
                title: "Kısa ve ayırt edici bir başlık yazın",
                content: plain(
                  "Başlık en fazla 100 karakterdir. Katılımcının ne hakkında cevap vereceğini ilk bakışta anlamasını sağlayın.",
                ),
              },
              {
                title: "Gerekli bağlamı açıklayın",
                content: plain(
                  "En fazla 240 karakterlik açıklamada amaç, hedef kitle veya kapanış bağlamı gibi katılımcının ihtiyaç duyacağı bilgiyi verin.",
                ),
              },
              {
                title: "Paylaşım adresini belirleyin",
                content: line(
                  "Geçerli slug, yayımlandığında ",
                  inlineCode("/signal/[slug]"),
                  " biçimindeki paylaşım adresinin parçası olur.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "Taslak herkese açık değildir",
            content: plain(
              "Yeni anketi önce taslak olarak kaydedebilir ve soruları kontrol edebilirsiniz. Taslak anket herkese açık sayfada açılmaz ve yanıt kabul etmez.",
            ),
          },
        ],
      },
      {
        id: "sorular-ve-kosullu-akis",
        title: "2. Ana soruları ve isteğe bağlı takip sorusunu ekleyin",
        blocks: [
          {
            type: "table",
            caption: "Signal soru sınırları",
            headers: ["Öğe", "Desteklenen sınır"],
            rows: [
              ["Ana soru", "Anket başına 1–20"],
              ["Ana soru seçenekleri", "Her soruda 2–6"],
              ["Ana soru metni", "En fazla 240 karakter"],
              ["Seçenek metni", "En fazla 120 karakter"],
              ["Koşullu takip", "Her ana soruya en fazla bir, iç içe geçmez"],
              ["Takip seçenekleri", "2–4"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Ana soruda katılımcının yalnızca bir seçenek seçebileceğini hesaba katın. Seçenekleri birbirinden ayırın ve mümkünse herkesin kendine en yakın cevabı bulabileceği bir kapsam oluşturun.",
            ),
          },
          {
            type: "steps",
            items: [
              {
                title: "Ana soruyu ekleyin",
                content: plain(
                  "Soruyu tek bir konuya odaklayın ve 2–6 açık seçenek yazın.",
                ),
              },
              {
                title: "Gerekliyse tetikleyici cevabı seçin",
                content: plain(
                  "Takip sorusunun yalnızca hangi ana cevap seçildiğinde görüneceğini belirleyin.",
                ),
              },
              {
                title: "Tek takip sorusunu hazırlayın",
                content: plain(
                  "Takip sorusuna 2–4 seçenek ekleyin. Bu soru başka bir koşullu soru başlatmaz.",
                ),
              },
              {
                title: "Akışı katılımcı gibi okuyun",
                content: plain(
                  "Her ana sorunun cevaplanabildiğini ve takip sorusunun yalnızca ilgili durumda anlamlı olduğunu kontrol edin.",
                ),
              },
            ],
          },
        ],
      },
      {
        id: "durumlar-ve-paylasim-ayarlari",
        title: "3. Taslak, yayımlanmış ve kapalı durumlarını yönetin",
        blocks: [
          {
            type: "table",
            caption: "Anket durumlarının katılımcıya etkisi",
            headers: ["Durum", "Davranış"],
            rows: [
              ["Taslak", "Herkese açık sayfa açılmaz; anket üzerinde çalışmaya devam edilir."],
              ["Yayımlanmış", "Paylaşım adresi açılır ve geçerli yanıt kabul edilir."],
              ["Kapalı", "Sayfa anketin kullanılamadığını gösterir; yeni oy kabul edilmez."],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Sonuçları katılımcılara gösterme seçeneğini açarsanız dağılımlar ancak kişi oyunu tamamladıktan sonra görünür. Bu seçenek kapalıysa katılımcı teşekkür durumunu görür; ayrıntılı sonuç yönetimi anket sahibinde kalır.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Yayımlanmış anketi Link Vitrininde gösterme seçeneği de bulunur. Uygun anketler Vitrinde kart olarak listelenir; güncel akış en yeni en fazla üç kartı gösterir. Vitrin henüz yoksa önce Link Vitrini oluşturmanız gerekir.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Profil, yayınlama ve Vitrin ölçümü hakkında ayrıntı için ",
              guideLink("Link Vitrini nedir?", "/rehberler/link-vitrini-nedir"),
              " rehberine geçebilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "yayinlama-ve-yanitlama",
        title: "4. Anketi yayınlayın ve doğrudan bağlantıyla paylaşın",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Anket yayımlandığında ",
              inlineCode("/signal/[slug]"),
              " adresi üzerinden açılır. Katılımcının yanıt vermek için TrulyGo hesabına ihtiyacı yoktur. Görünen ana soruların tamamı, koşullu soru tetiklendiyse o soru da cevaplanmalıdır.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Signal, aynı tarayıcıdan tekrarlanan oyları azaltmak için anket kapsamlı çerez/token hash'i, veri tabanı kısıtı ve hız sınırları kullanır. Bu koruma yumuşaktır: çerez silme, farklı tarayıcı veya kimlik doğrulanmaması nedeniyle kişi başına kesin tek oy garantisi vermez.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Paylaşım ve keşfedilme sınırı",
            content: plain(
              "Herkese açık anket sayfaları bilerek noindex işareti taşır ve sitemap'e eklenmez. Bu nedenle anketi Google'dan bulunacak bir içerik sayfası gibi değil, doğrudan bağlantıyla ulaştırılan bir katılım sayfası gibi planlayın. Mevcut Signal akışında ankete özel QR üretimi bulunmaz.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Anonimlik iddiasını dikkatli kurun",
            content: plain(
              "Signal yanıt kaydında ham IP, user-agent veya çerez değeri tutmaz; anket kapsamlı bir token hash'i kullanır. Bununla birlikte sistem kimlik doğrulamadığı ve hız sınırlaması sırasında IP işleyebildiği için “tam anonim” veya yasal uyum garantisi vermek doğru değildir.",
            ),
          },
        ],
      },
      {
        id: "sonuclari-okuma",
        title: "5. Toplu sonuçları okuyun ve anketi kapatın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Anket sahibi sonuç ekranında tamamlayan katılımcı sayısını, toplam cevap sayısını, tamamlanma oranını ve her seçenek için oy/yüzde dağılımını görür. Koşullu takip sorularının sonuçları da toplu olarak gösterilir.",
            ),
          },
          {
            type: "list",
            items: [
              plain("Katılımcı sayısını dağılımlarla birlikte değerlendirin."),
              plain("Takip sorusu sonuçlarını yalnızca ilgili ana cevabı seçenlerin alt grubu üzerinden okuyun."),
              plain("Örneklemin nereden geldiğini ve kimi temsil etmeyebileceğini not edin."),
              plain("Yanıt dönemi bittiğinde anketi kapatın; gerekirse daha sonra yeniden yayımlayın."),
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "Güncel ürün sınırı",
            content: plain(
              "Signal şu anda CSV dışa aktarma, gerçek zamanlı analiz garantisi, yapay zekâ yorumları veya bilimsel temsil raporu sunmaz. Sonuç ekranındaki toplu metrikleri, topladığınız örneklemin sınırları içinde yorumlayın.",
            ),
          },
        ],
      },
    ],
  },
] satisfies GuideArticle[];
