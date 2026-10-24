import {
  guideLink,
  inlineCode,
  line,
  plain,
  strong,
  TRULYGO_GUIDE_PUBLISHER,
  type GuideArticle,
} from "./types";

export const trackingGuides = [
  {
    slug: "kanallara-gore-utm-link-olusturma",
    title: "YouTube, Instagram ve E-posta İçin Ayrı UTM Linkleri Nasıl Oluşturulur?",
    seoTitle: "Kanallara Göre UTM Link Oluşturma: YouTube, Instagram ve E-posta",
    description:
      "Aynı kampanya için YouTube, Instagram ve e-posta bağlantılarını tutarlı UTM değerleriyle ayırın; örnek URL’leri ve TrulyGo kanal linklerinin davranışını görün.",
    category: "utm-link-takibi",
    primaryIntent: "Aynı kampanya için kanala özel UTM bağlantıları hazırlamak",
    secondaryIntents: [
      "Kanal bazlı UTM isimlendirme planı kurmak",
      "YouTube, Instagram ve e-posta bağlantılarını karşılaştırmak",
    ],
    primaryQuery: "kanallara göre utm link oluşturma",
    secondaryQueries: [
      "instagram youtube e-posta utm linki",
      "aynı kampanya farklı kanallar utm",
      "kanal bazlı utm takibi",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM ve Link Takibi",
    },
    relatedArticles: [
      "utm-nedir",
      "utm-link-nasil-olusturulur",
      "utm-source-medium-campaign-nedir",
      "trulygo-link-istatistikleri",
    ],
    cta: {
      href: "/utm-link-olusturucu",
      label: "UTM bağlantılarını oluştur",
      title: "Kanal planınızı gerçek bağlantılara dönüştürün",
      description:
        "Üyeliksiz UTM aracında kaynak, medya ve kampanya değerlerini girin; her kanal için paylaşmaya hazır URL’nizi oluşturun.",
    },
    sections: [
      {
        id: "kisa-cevap",
        title: "Kampanya aynı, kanal alanları farklı olmalı",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Aynı kampanyayı YouTube, Instagram ve e-postada yayımlarken ",
              inlineCode("utm_campaign"),
              " değerini sabit tutun; ",
              inlineCode("utm_source"),
              ", ",
              inlineCode("utm_medium"),
              " ve gerekiyorsa ",
              inlineCode("utm_content"),
              " değerlerini kanala göre değiştirin. Böylece raporda tek kampanyanın toplamını korurken trafiğin hangi paylaşım yolundan geldiğini ayırabilirsiniz.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "UTM’nin bağlantıya hangi bilgiyi taşıdığını önce netleştirmek isterseniz ",
              guideLink("UTM parametreleri rehberine", "/rehberler/utm-nedir"),
              "; alanların görevlerini karşılaştırmak için de ",
              guideLink(
                "source, medium ve campaign açıklamasına",
                "/rehberler/utm-source-medium-campaign-nedir",
              ),
              " bakabilirsiniz.",
            ),
          },
          {
            type: "callout",
            tone: "tip",
            title: "Bağlantıları üretmeden önce sözlüğü yazın",
            content: plain(
              "Instagram için bazen instagram, bazen ig yazmak aynı kaynağı farklı satırlara böler. Kampanya ekibi önce kullanacağı değerleri kararlaştırmalı, sonra URL üretmelidir.",
            ),
          },
        ],
      },
      {
        id: "kanal-plani",
        title: "Tek kampanya için kanal planı nasıl kurulur?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Örnek senaryoda bir sonbahar ürün lansmanını üç kanalda duyurduğumuzu düşünelim. Kampanyanın adı bütün bağlantılarda aynı kalır. Kaynak, ziyaretçinin geldiği platformu; medya, bu platformdaki trafik türünü; içerik ise bağlantının yerleşimini anlatır.",
            ),
          },
          {
            type: "table",
            caption: "Sonbahar lansmanı için örnek UTM sözlüğü",
            headers: ["Kanal", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
            rows: [
              ["Instagram bio", "instagram", "social", "sonbahar-lansmani", "bio"],
              ["YouTube açıklaması", "youtube", "video", "sonbahar-lansmani", "aciklama"],
              ["E-posta butonu", "newsletter", "email", "sonbahar-lansmani", "bulten-butonu"],
            ],
          },
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_term"),
              " bu organik dağıtım örneğinde zorunlu değildir. Ücretli reklam anahtar kelimesi veya önceden tanımlanmış bir hedefleme ayrımı yoksa alanı boş bırakmak, sonradan anlamı belirsiz bir değer eklemekten daha temizdir.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "ASCII değerler bir tercih, ürün zorunluluğu değil",
            content: plain(
              "Örnekte ekipler arası paylaşımı kolaylaştırmak için küçük harfli ASCII değerler kullandık. TrulyGo UTM aracı Türkçe karakterleri de URL standardına göre kodlar; değerleri otomatik olarak küçük harfe çevirmez veya sluglaştırmaz.",
            ),
          },
        ],
      },
      {
        id: "ornek-baglantilar",
        title: "Üç kanalı gerçek URL’lere dönüştürme",
        blocks: [
          {
            type: "code",
            label: "Instagram bio",
            code: "https://ornek.com/sonbahar?utm_source=instagram&utm_medium=social&utm_campaign=sonbahar-lansmani&utm_content=bio",
          },
          {
            type: "code",
            label: "YouTube video açıklaması",
            code: "https://ornek.com/sonbahar?utm_source=youtube&utm_medium=video&utm_campaign=sonbahar-lansmani&utm_content=aciklama",
          },
          {
            type: "code",
            label: "E-posta bülteni butonu",
            code: "https://ornek.com/sonbahar?utm_source=newsletter&utm_medium=email&utm_campaign=sonbahar-lansmani&utm_content=bulten-butonu",
          },
          {
            type: "steps",
            items: [
              {
                title: "Tek hedef URL belirleyin",
                content: plain(
                  "Üç kanal da aynı açılış sayfasına gidiyorsa yolu ve hedefte kalması gereken ürün, dil veya kupon parametrelerini sabitleyin.",
                ),
              },
              {
                title: "Kampanya adını kilitleyin",
                content: line(
                  inlineCode("sonbahar-lansmani"),
                  " değerini kampanya yayındayken değiştirmeyin. Tarih veya ekip adı ekleyecekseniz bunu bağlantılar dağıtılmadan önce kararlaştırın.",
                ),
              },
              {
                title: "Yalnız kanal alanlarını değiştirin",
                content: plain(
                  "Source ve medium değerlerini platforma göre, content değerini ise bio, açıklama veya buton gibi gerçek yerleşime göre yazın.",
                ),
              },
              {
                title: "Son URL’yi test edin",
                content: plain(
                  "Bağlantıyı gizli bir dokümana kaydetmekle yetinmeyin. Tarayıcıda açın; hedef sayfanın, UTM dışı sorgu parametrelerinin ve varsa sayfa içi bölüm işaretinin korunduğunu kontrol edin.",
                ),
              },
            ],
          },
        ],
      },
      {
        id: "trulygo-ile-iki-yol",
        title: "TrulyGo’da herkese açık UTM aracı ile kanal linki aynı şey değildir",
        blocks: [
          {
            type: "paragraph",
            content: line(
              guideLink("Herkese açık UTM link oluşturucuda", "/utm-link-olusturucu"),
              " hedef URL, source, medium ve campaign alanları zorunludur; content ve term isteğe bağlıdır. Araç, desteklediği source, medium, campaign, content ve term anahtarlarını büyük/küçük harf ayrımı yapmadan kaldırır; formdaki yeni değerleri ekler. Diğer sorgu parametrelerini ve hash bölümünü korur. Bu işlem tarayıcıda URL üretir, tek başına bir kısa link veya kampanya kaydı oluşturmaz.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Onaylı bir TrulyGo kısa linkiniz varsa ",
              guideLink("kanal linkleri", "/kanal-linki-olusturma"),
              " aynı hedef için ayrı kısa adresler üretir. Instagram, YouTube ve e-posta hazır kanalları kayıtlı source, medium, campaign ve content değerlerini hedef URL’ye yönlendirme sırasında yazar. Hedefteki ilk ",
              inlineCode("utm_term"),
              " değeri ile UTM dışı sorgu ve hash korunur.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Ana kısa link varsayılan olarak UTM eklemez",
            content: line(
              "Ana kısa adres, kanal linki değildir. TrulyGo’nun iç analitiğinde ana link ",
              inlineCode("direct / main"),
              " olarak sınıflandırılabilir; bu sentetik değerler hedef URL’ye otomatik UTM olarak yazılmaz. ",
              guideLink("Kısa link ile UTM farkını", "/rehberler/kisa-link-nedir"),
              " bu ayrım üzerinden okuyabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "olcum-ve-kontrol",
        title: "Raporu yorumlarken kampanya planına geri dönün",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Hedef sitenin analitik sistemi UTM’leri okuyacak şekilde çalışıyorsa aynı campaign altında source ve medium kırılımlarını karşılaştırabilirsiniz. TrulyGo'nun herkese açık UTM aracı hedef analitiğine otomatik bağlanmaz; URL üzerindeki etiketleri üretir. Hedefte oturum, dönüşüm veya satış ölçümü ayrıca kurulmalıdır.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "TrulyGo kanal linkleri ise kendi kısa adreslerine gelen günlük tekilleştirilmiş tıklamaları kanal bazında karşılaştırmaya yarar. Bu sayı benzersiz kişi veya dönüşüm değildir. Alanların ve sınırlamaların tamamını ",
              guideLink(
                "TrulyGo link istatistikleri rehberinde",
                "/rehberler/trulygo-link-istatistikleri",
              ),
              " bulabilirsiniz.",
            ),
          },
          {
            type: "list",
            items: [
              plain("Kampanya adının üç URL’de de birebir aynı olduğunu kontrol edin."),
              plain("Source ile medium değerlerinin aynı kavramı tekrar etmediğinden emin olun."),
              plain("Bağlantı yerleşimini ayırmanız gerekmiyorsa content alanını gelişigüzel doldurmayın."),
              plain("Kanal kısa linkine sonradan UTM ekleyerek kayıtlı kanal değerini değiştirmeye çalışmayın."),
              plain("Tıklama verisini hedef sitedeki oturum ve dönüşüm verisiyle aynı metrik gibi sunmayın."),
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "kisa-link-nedir",
    title: "Kısa Link Nedir? UTM Linkinden Farkı Nedir?",
    seoTitle: "Kısa Link Nedir? Kısa URL ile UTM Linki Arasındaki Fark",
    description:
      "Kısa linkin nasıl yönlendirdiğini, UTM parametrelerinden neden farklı olduğunu ve TrulyGo’da ana link ile kanal linklerinin nasıl çalıştığını öğrenin.",
    category: "utm-link-takibi",
    primaryIntent: "Kısa link kavramını ve UTM linkinden farkını anlamak",
    secondaryIntents: [
      "Kısa URL ile UTM parametrelerinin görevlerini ayırmak",
      "TrulyGo kısa link onay ve yönlendirme akışını öğrenmek",
    ],
    primaryQuery: "kısa link nedir",
    secondaryQueries: ["kısa url nedir", "utm linki ile kısa link farkı", "link kısaltma nasıl çalışır"],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM ve Link Takibi",
    },
    relatedArticles: [
      "utm-nedir",
      "whatsapp-link-takibi",
      "kanallara-gore-utm-link-olusturma",
      "trulygo-link-istatistikleri",
    ],
    cta: {
      href: "/link-kisaltma",
      label: "Kısa link oluşturma akışını incele",
      title: "Kısa link talebinin nasıl oluşturulduğunu görün",
      description:
        "Hedef adres, kısa ad, güvenlik kontrolleri ve onay sürecini inceleyin; gerçek oluşturma işlemini hesabınızla Panelim’de tamamlayın.",
    },
    sections: [
      {
        id: "kisa-cevap",
        title: "Kısa link nedir?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Kısa link, uzun bir hedef URL yerine paylaşılabilen daha kısa bir adres ve bu adresi hedefe götüren yönlendirmedir. UTM linki ise trafiğin kaynağını veya kampanyasını tarif eden parametreler taşır. Biri adresi paylaşmayı ve yönlendirmeyi düzenler; diğeri ölçüm sistemlerine anlamlı etiketler iletir.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Bu nedenle bir bağlantı kısa olup UTM içermeyebilir; uzun olup UTM içerebilir veya hem kısa link yönlendirmesi hem de UTM’li hedef birlikte kullanılabilir. Temel UTM mantığı için ",
              guideLink("UTM nedir?", "/rehberler/utm-nedir"),
              " rehberi doğru başlangıç noktasıdır.",
            ),
          },
        ],
      },
      {
        id: "kisa-link-utm-farki",
        title: "Kısa link ve UTM hangi işi yapar?",
        blocks: [
          {
            type: "table",
            caption: "Kısa URL ile UTM’li URL’nin görev ayrımı",
            headers: ["Konu", "Kısa link", "UTM linki"],
            rows: [
              ["Temel görev", "Kısa adresten hedefe yönlendirmek", "Trafik kaynağına ilişkin etiket taşımak"],
              ["Hedefi kısaltır mı?", "Paylaşılan adresi kısaltır", "Hayır; URL çoğunlukla uzar"],
              ["Tek başına ölçüm yapar mı?", "Servis yönlendirme isteğini kaydedebilir", "Hayır; hedefteki analitik sistem etiketi okumalıdır"],
              ["UTM zorunlu mu?", "Hayır", "Tanımı gereği UTM parametreleri içerir"],
              ["Dönüşümü gösterir mi?", "Tek başına göstermez", "Tek başına göstermez"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "UTM’ye 'takip kodu' denmesi bazen kafa karıştırır. Parametre bağlantı üzerinde source, medium veya campaign gibi metinler taşır. Bu metinleri rapora dönüştüren şey, hedef sitedeki analitik kurulumudur. Kısa link servisi ise kendi yönlendirme noktasına gelen isteği ayrıca sayabilir.",
            ),
          },
        ],
      },
      {
        id: "trulygo-kisa-link-akisi",
        title: "TrulyGo kısa linki nasıl etkinleşir?",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Hesapla talep oluşturulur",
                content: line(
                  "Panelim’de hedef URL ve önerilen kısa ad girilir. ",
                  guideLink("Link kısaltma sayfası", "/link-kisaltma"),
                  " süreci anlatır; gerçek oluşturma alanı hesap içindeki Panelim’dir.",
                ),
              },
              {
                title: "Güvenlik ve onay süreci çalışır",
                content: plain(
                  "Yeni talep beklemede oluşturulur. Uygun kontroller tamamlandığında otomatik onaylanabilir; gerektiğinde manuel inceleme gerekir. Belirli bir onay süresi veya onay garantisi yoktur.",
                ),
              },
              {
                title: "Yalnız onaylı slug yönlendirir",
                content: plain(
                  "Bekleyen, reddedilen, askıya alınan ya da bulunamayan kısa ad hedefe gitmez. Aktif olmayan sayfaya yapılan istek tıklama olarak kaydedilmez.",
                ),
              },
              {
                title: "Sahibi detay ve kanalları yönetir",
                content: plain(
                  "Onaylı linkin detay ekranı ve raporları sahibine özeldir. Instagram, e-posta veya QR gibi kanal linkleri de yalnız link sahibi tarafından, ana link onaylandıktan sonra oluşturulabilir.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Ana kısa adres UTM’sizdir",
            content: plain(
              "TrulyGo ana kısa linki hedefe otomatik source, medium veya campaign eklemez. İç tıklama kaydındaki direct/main sınıflandırması, hedef URL’ye yazılan bir UTM etiketi değildir.",
            ),
          },
        ],
      },
      {
        id: "utm-ve-kisa-link-birlikte",
        title: "UTM ve kısa link ne zaman birlikte kullanılır?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Bir kampanya kaynağını hedef sitenin analitiğine taşımak ve aynı zamanda daha düzenli bir paylaşım adresi kullanmak istiyorsanız önce ",
              guideLink("UTM bağlantısını oluşturabilir", "/utm-link-olusturucu"),
              ", sonra bu URL’yi kısa link hedefi olarak verebilirsiniz. Bu durumda UTM hedef uzun URL’nin parçasıdır; ana kısa link tarafından sonradan üretilmiş değildir.",
            ),
          },
          {
            type: "code",
            label: "UTM’li hedef",
            code: "https://ornek.com/kampanya?utm_source=instagram&utm_medium=social&utm_campaign=urun-lansmani",
          },
          {
            type: "paragraph",
            content: plain(
              "Herkese açık UTM aracındaki kısaltma CTA’sına basıldığında üretilen URL, aynı tarayıcı oturumunda en fazla iki saat saklanan tek kullanımlık bir taslakla Panelim formuna taşınır. Form yalnızca önceden doldurulur; kısa adın girilmesi ve talebin kullanıcı tarafından gönderilmesi gerekir. Bu aktarımı cihazlar arası kalıcı kampanya kaydı gibi düşünmeyin.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Aynı hedefi birden çok dağıtım kanalında paylaşacaksanız diğer yol, onaylı ana linkten ",
              guideLink(
                "Instagram, YouTube, e-posta veya özel kanal linkleri oluşturmak",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              "tır. Kanal linki kendi kayıtlı UTM değerlerini yönlendirme sırasında hedefe uygular.",
            ),
          },
        ],
      },
      {
        id: "dogru-beklenti",
        title: "Kısa linkten beklenebilecek ve beklenemeyecek sonuçlar",
        blocks: [
          {
            type: "list",
            items: [
              line(strong("Beklenebilir: "), "Paylaşılması daha düzenli bir adres ve onaylı hedefe yönlendirme."),
              line(strong("Beklenebilir: "), "TrulyGo yönlendirme noktasındaki günlük tekilleştirilmiş tıklamaların link ve kanal bazında incelenmesi."),
              line(strong("Beklenmemeli: "), "Ana kısa linkin UTM’leri otomatik üretmesi veya hedefteki GA4 hesabına bağlanması."),
              line(strong("Beklenmemeli: "), "Her kaydın gerçek bir kişiye, oturuma, satışa veya dönüşüme eşit olması."),
              line(strong("Beklenmemeli: "), "Pasif ya da henüz onaylanmamış bir kısa adresin hedefe yönlendirmesi."),
            ],
          },
          {
            type: "paragraph",
            content: line(
              "KPI’ların nasıl üretildiğini ve hangi sınırlarla okunması gerektiğini ",
              guideLink(
                "TrulyGo link istatistikleri rehberinde",
                "/rehberler/trulygo-link-istatistikleri",
              ),
              " ayrıntılı biçimde görebilirsiniz.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "qr-kod-tiklama-takibi",
    title: "QR Kod Tıklamaları Nasıl Takip Edilir?",
    seoTitle: "QR Kod Tıklama Takibi Nasıl Yapılır? Ölçümün Gerçek Sınırları",
    description:
      "QR kodun kendisini değil, kodun açtığı takip edilebilir bağlantıyı ölçün. TrulyGo QR kanal akışını, görülen verileri ve ölçüm sınırlarını öğrenin.",
    category: "utm-link-takibi",
    primaryIntent: "QR kod üzerinden gelen bağlantı açılışlarını takip etmek",
    secondaryIntents: [
      "QR bağlantı açılışlarının nasıl ölçüldüğünü anlamak",
      "TrulyGo QR kanalının tasarım ve raporlama sınırlarını öğrenmek",
    ],
    primaryQuery: "qr kod tıklama takibi",
    secondaryQueries: ["qr kod takip etme", "qr kod analitik", "qr kod kaç kez okutuldu"],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM ve Link Takibi",
    },
    relatedArticles: [
      "kisa-link-nedir",
      "trulygo-link-istatistikleri",
      "kanallara-gore-utm-link-olusturma",
      "utm-nedir",
    ],
    cta: {
      href: "/qr-kod-olusturucu",
      label: "QR kanal akışını incele",
      title: "Takip edilebilir QR kanalını nasıl oluşturacağınızı görün",
      description:
        "Onaylı kısa linkin detayından QR kanalını oluşturma, tasarlama ve PNG ya da SVG olarak indirme adımlarını inceleyin.",
    },
    sections: [
      {
        id: "kisa-cevap",
        title: "QR kod tıklama takibi gerçekte nasıl çalışır?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "QR görseli tek başına kaç kez kameraya gösterildiğini ölçmez. Ölçülebilen olay, QR içine kodlanan takip edilebilir URL’nin tarayıcıda açılmasıdır. Kullanıcı QR’ı okutup TrulyGo kanal adresine ulaştığında yönlendirme isteği kaydedilebilir; kamera kodu görür ama bağlantı açılmazsa tıklama oluşmaz.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "“Tarama” yerine “bağlantı açılışı” deyin",
            content: plain(
              "Rapor dilinde QR taraması veya fiziksel okutma sayısı demek ölçümü olduğundan kesin gösterir. Daha doğru ifade, QR kanal linkine gelen günlük tekilleştirilmiş tıklama ya da bağlantı açılışıdır.",
            ),
          },
        ],
      },
      {
        id: "trulygo-qr-akisi",
        title: "TrulyGo’da takip edilebilir QR akışı",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Ana kısa link onaylanır",
                content: line(
                  "Önce hesap içinden kısa link talebi oluşturulur. Yalnız onaylı ana link için kanal ve QR üretilebilir. Kısa link sürecinin ayrıntıları ",
                  guideLink("kısa link rehberinde", "/rehberler/kisa-link-nedir"),
                  " yer alır.",
                ),
              },
              {
                title: "Link detayında QR kanalı oluşturulur",
                content: line(
                  "QR hazır kanalı ayrı bir kısa slug üretir ve ",
                  inlineCode("utm_source=qr"),
                  ", ",
                  inlineCode("utm_medium=offline"),
                  " değerlerini kullanır. Campaign ana linkin kampanya adından veya slug’ından, content ise ",
                  inlineCode("qr"),
                  " değerinden oluşur.",
                ),
              },
              {
                title: "QR görseli kanal URL’sini kodlar",
                content: plain(
                  "İndirilen görsel doğrudan uzun hedefi değil, QR kanalının kısa adresini taşır. Böylece açılış önce TrulyGo yönlendirmesine, ardından asıl hedefe gider.",
                ),
              },
              {
                title: "URL açılırsa olay kaydedilir",
                content: plain(
                  "Yönlendirme isteği geldiğinde QR kanal bilgisiyle tıklama kaydı denenir. Analitik kayıt başarısız olsa bile kullanıcı hedefe yönlendirilir; ölçüm yönlendirmeyi bloke etmez.",
                ),
              },
            ],
          },
          {
            type: "paragraph",
            content: line(
              guideLink("QR kod oluşturucu sayfası", "/qr-kod-olusturucu"),
              " bu hesap ve onay akışını anlatan bilgi sayfasıdır. Üyeliksiz olarak herhangi bir URL’yi yapıştırıp genel QR üreten herkese açık bir araç değildir.",
            ),
          },
        ],
      },
      {
        id: "gorulebilen-veriler",
        title: "QR kanalında hangi veriler görülebilir?",
        blocks: [
          {
            type: "table",
            caption: "Ölçülen sinyal ile yorum sınırı",
            headers: ["Alan", "Gösterilebilen bilgi", "Sınır"],
            rows: [
              ["Tıklama", "Günlük tekilleştirilmiş QR kanal açılışı", "Benzersiz kişi veya kamera taraması değildir"],
              ["Kanal", "QR kanal etiketi", "Aynı QR farklı basılı alanlarda kullanılırsa yerleşimleri ayırmaz"],
              ["Cihaz", "Cihaz sınıfı, işletim sistemi ve kayıtta tarayıcı", "User-agent türetimidir; eksik veya yanlış olabilir"],
              ["Konum", "Ülke, bölge, şehir ya da yaklaşık konum etiketi", "GPS değildir; altyapı başlıklarına bağlıdır"],
              ["Referrer", "İstekle gelen yönlendiren bilgi", "QR açılışlarında boş veya doğrudan olabilir"],
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Toplam, Bugün ve Son 7 Gün gibi sayılar ham istek toplamı değil, günlük tekilleştirme yaklaşımıyla oluşturulur. Aynı ziyaretçi başka gün veya başka kanal üzerinden yeniden sayılabilir. ",
              guideLink(
                "Link istatistiklerinin nasıl okunacağını",
                "/rehberler/trulygo-link-istatistikleri",
              ),
              " ayrıca inceleyin.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "QR tıklaması dönüşüm değildir",
            content: plain(
              "Bağlantının açılması, formun doldurulduğunu, sipariş verildiğini veya aynı kaydı bir insanın yaptığını kanıtlamaz. Dönüşüm ölçümü hedef sayfadaki ayrı analitik veya iş sistemiyle kurulmalıdır.",
            ),
          },
        ],
      },
      {
        id: "qr-tasarimi-ve-indirme",
        title: "QR görselini paylaşmadan önce kontrol edin",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "TrulyGo QR kartında renk seçilebilir. İsteğe bağlı logo PNG, JPEG veya WebP biçiminde ve en fazla 1 MB olabilir. PNG indirme 1024 × 1024 piksel üretilir ve logo uygulanabilir. SVG vektördür; yüklenen logo SVG çıktısına eklenmez.",
            ),
          },
          {
            type: "list",
            items: [
              plain("QR’ı yalnız editör önizlemesinde değil, indirilen gerçek dosyada test edin."),
              plain("Koyu ve açık modda yeterli kontrast bırakın; arka planla benzer renk seçmeyin."),
              plain("Logo kullanıyorsanız kodu kapatacak kadar büyük veya karmaşık bir görsel seçmeyin."),
              plain("Basılı materyalin gerçek boyutunda birkaç farklı telefonla bağlantıyı açın."),
              plain("QR’ı dağıtmadan önce hedefin ve kanal kısa linkinin onaylı ve aktif olduğunu doğrulayın."),
            ],
          },
        ],
      },
      {
        id: "kampanya-kurgusu",
        title: "Bir QR’ı birden çok yere basmanın ölçüm etkisi",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Aynı QR görselini mağaza afişinde, ürün kutusunda ve etkinlik standında kullanırsanız bütün açılışlar aynı QR kanalında toplanır. Rapor, fiziksel yerleşimi kendiliğinden ayıramaz. Yerleşim karşılaştırması önemliyse her yerleşim için ayrı onaylı link ve QR kanal kurgusu oluşturun; isimleri kampanya planında açıkça eşleyin.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "QR kanalı, diğer hazır kanal linkleriyle aynı trafik atfı mantığını kullanır: source, medium, campaign ve content kanal değerlerine göre yazılır; hedefteki ilk term ile UTM dışı sorgu ve hash korunur. Kanal planı için ",
              guideLink(
                "kanallara göre UTM link oluşturma rehberinden",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " yararlanabilirsiniz.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Link Vitrini QR’si farklı çalışır",
            content: plain(
              "Link Vitrini editöründeki QR doğrudan herkese açık /v/[handle] adresini kodlar. Ayrı qr/offline kanal kısa adresi üretmediği için Link Vitrini profil görüntülemesini QR kanalından gelmiş trafik gibi sunmayın.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "trulygo-link-istatistikleri",
    title: "TrulyGo’da Linkleriniz Hakkında Hangi Verileri Görebilirsiniz?",
    seoTitle: "TrulyGo Link İstatistikleri: Metrikler, Raporlar ve Sınırlar",
    description:
      "TrulyGo link detayındaki KPI’ları, günlük ve saatlik grafikleri, kanal-cihaz-konum özetlerini ve PDF, Excel, CSV raporlarını doğru yorumlayın.",
    category: "utm-link-takibi",
    primaryIntent: "TrulyGo link analitiğinde gösterilen gerçek verileri anlamak",
    secondaryIntents: [
      "Link KPI’larının hesaplanma sınırlarını öğrenmek",
      "Kanal, cihaz, konum ve rapor görünümlerini keşfetmek",
    ],
    primaryQuery: "TrulyGo link istatistikleri",
    secondaryQueries: ["link tıklama istatistikleri", "kısa link analizi", "kanal linki performansı"],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM ve Link Takibi",
    },
    relatedArticles: [
      "kisa-link-nedir",
      "qr-kod-tiklama-takibi",
      "kanallara-gore-utm-link-olusturma",
      "instagram-link-takibi",
    ],
    cta: {
      href: "/link-kisaltma",
      label: "Kısa link oluştur",
      title: "Takip edilebilir kısa link akışını inceleyin",
      description:
        "Kısa link, kanal ve tıklama analizi akışını ürün sayfasında inceleyin; hesabınız varsa oradan Panelim’e geçin.",
    },
    sections: [
      {
        id: "kisa-cevap",
        title: "TrulyGo link detayında ne görebilirsiniz?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Onaylı bir linkin sahibi; Toplam, Bugün, Son 7 Gün ve Son Tıklama özetlerini, 7/14/30 günlük eğilimi, seçilen günün saatlik dağılımını, kanal karşılaştırmasını, cihaz ve yaklaşık konum kırılımlarını görebilir. Son kayıtlar referrer ile işletim sistemi ve tarayıcı ayrıntısını da gösterebilir; raporlar PDF, XLSX veya CSV olarak dışa aktarılabilir.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Buradaki sayı kişi sayısı değildir",
            content: plain(
              "TrulyGo metrikleri günlük tekilleştirilmiş tıklama yaklaşımına dayanır. Bir kişiyi cihazlar ve günler boyunca kesin olarak tanıyan benzersiz ziyaretçi sistemi ya da dönüşüm analitiği olarak anlatılmamalıdır.",
            ),
          },
        ],
      },
      {
        id: "kpi-anlamlari",
        title: "Üst KPI’lar nasıl okunmalı?",
        blocks: [
          {
            type: "table",
            caption: "Link performans kartındaki dört ana gösterge",
            headers: ["Gösterge", "Ne anlatır?", "Nasıl yorumlanmamalı?"],
            rows: [
              ["Toplam", "Kaydedilen günlük tekilleştirilmiş tıklamaların toplamı", "Toplam benzersiz insan sayısı değildir"],
              ["Bugün", "İstanbul takvim günündeki günlük tekilleştirilmiş tıklamalar", "Anlık aktif kullanıcı sayısı değildir"],
              ["Son 7 Gün", "Bugün dahil son yedi günün günlük tekilleştirilmiş tıklamaları", "Yedi günlük dönüşüm veya satış değildir"],
              ["Son Tıklama", "Kaydedilen en yakın tıklamanın zamanı", "Her isteğin eksiksiz kaydedildiği garantisi değildir"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Tekilleştirme link, kanal, İstanbul günü ve ziyaretçi anahtarı kapsamında yapılır. Ziyaretçi anahtarı cookie’den türetilebilir; bu mümkün değilse IP ile user-agent bileşimi fallback olabilir. Anahtar üretilemezse olay kendi kimliğiyle sayılır. Aynı ziyaretçi ertesi gün veya başka bir kanal linkinden geldiğinde yeniden sayılabilir.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Ana link ve kanal linki ayrımını bilmeden kanal toplamlarını yorumlamak zordur. Ana kısa adresin hedefe otomatik UTM eklemediğini ",
              guideLink("kısa link rehberinde", "/rehberler/kisa-link-nedir"),
              "; ayrı kanal adreslerinin UTM davranışını ise ",
              guideLink(
                "kanallara göre UTM rehberinde",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " inceleyebilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "grafikler-ve-kirilimlar",
        title: "Grafikler ve kırılımlar hangi sorulara cevap verir?",
        blocks: [
          {
            type: "list",
            items: [
              line(strong("7/14/30 günlük eğilim: "), "Paylaşım sonrasında tıklamaların hangi günlerde yükselip azaldığını gösterir."),
              line(strong("Saatlik görünüm: "), "Seçilen günün tıklamalarını görüntüleyenin yerel saat dilimine göre dağıtır; günlük toplamın kullandığı İstanbul günüyle aynı kavram değildir."),
              line(strong("Kanal özeti: "), "Ana link ile Instagram, WhatsApp, QR veya özel kanal gibi ayrı kısa adreslerin katkısını karşılaştırır."),
              line(strong("Cihaz özeti: "), "Mobil, masaüstü, tablet, bot veya bilinmeyen gibi user-agent tabanlı sınıfları bir araya getirir."),
              line(strong("İşletim sistemi ve yaklaşık konum: "), "İstekten türetilen işletim sistemi ile ülke, bölge, şehir veya konum etiketini özetler."),
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Son tıklama tablosu en fazla 20 günlük tekilleştirilmiş kaydı; tarih-saat, kanal, kullanılan kısa adres, cihaz, yaklaşık konum ve referrer sütunlarıyla gösterir. Cihaz açıklamasında işletim sistemi ve tarayıcı görülebilir. Mevcut toplu “İşletim sistemi / Tarayıcı” kartı ise işletim sistemi özetinden beslenir; ayrı bir tarayıcı dağılımı sözü verilmemelidir.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Referrer boş olabilir",
            content: plain(
              "Mesajlaşma uygulaması, QR açılışı, gizlilik ayarı veya doğrudan giriş referrer bilgisini iletmeyebilir. Boş referrer, tıklamanın gerçekleşmediği anlamına gelmez; kaynağı kesin olarak kanıtlamadığı anlamına gelir.",
            ),
          },
        ],
      },
      {
        id: "rapor-disari-aktarma",
        title: "PDF, Excel ve CSV raporlarında ne seçebilirsiniz?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Link sahibi 7, 14 veya 30 günlük aralığı seçerek PDF raporu ya da veri çıktısı hazırlayabilir. PDF tarafında Yönetici Özeti ve Detaylı Rapor seçenekleri; veri tarafında XLSX veya CSV ile Standart, Detaylı ve Özel rapor seçenekleri bulunur. Günlük ve saatlik dağılım, kanallar, cihazlar, konumlar ve ham kayıtlar seçilebilir bölümlerdir.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Dışa aktarma endpoint’i de oturum ve sahiplik kontrolü yapar. Ham rapor satırları kullanıcı IP’si, e-posta, kimlik doğrulama verisi veya ham user-agent gibi iç alanları doğrudan dışarı vermez. Raporu yine de erişimi olan kişilerle sınırlı paylaşmak gerekir.",
            ),
          },
          {
            type: "callout",
            tone: "tip",
            title: "Rapor başlığını iş sorusuna göre seçin",
            content: plain(
              "Haftalık ekip toplantısı için Yönetici Özeti yeterli olabilir. Kanal veya gün bazında anomali araştırırken Detaylı XLSX/CSV daha kullanışlıdır. Daha fazla satır, otomatik olarak daha doğru karar anlamına gelmez.",
            ),
          },
        ],
      },
      {
        id: "sinirlar-ve-dogru-yorum",
        title: "Analitiğin sınırlarını rapor cümlesine yansıtın",
        blocks: [
          {
            type: "table",
            caption: "Riskli yorum ile güvenli rapor dili",
            headers: ["Riskli ifade", "Daha doğru ifade"],
            rows: [
              ["QR kodu 420 kişi taradı", "QR kanal linki 420 günlük tekilleştirilmiş tıklama aldı"],
              ["İstanbul’dan 80 kesin ziyaretçi geldi", "Yaklaşık konumu İstanbul olarak sınıflanan 80 günlük tekilleştirilmiş tıklama görüldü"],
              ["Instagram 30 satış getirdi", "Instagram kanal linki 30 günlük tekilleştirilmiş tıklama aldı; satış ayrıca doğrulanmalı"],
              ["Rapor bütün gerçek kullanıcıları kapsıyor", "Rapor yönlendirme noktasında kaydedilebilen istekleri kapsıyor"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Analitik kaydı yönlendirmeden sonra best-effort çalışır; başarısız kayıt kullanıcıyı hedefe gitmekten alıkoymaz. Botlar ve link önizlemeleri kayda girebilir. Cihaz ve konum tahminleri eksik ya da hatalı olabilir. Bu yüzden sayıları kesin kişi sayısı gibi değil, kanal ve dönemler arasındaki yönü karşılaştıran operasyonel sinyaller olarak kullanın.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "TrulyGo tıklama verisi source, medium, campaign, content ve term alanlarını backend’de taşısa da mevcut detay ekranı ayrı bir tam UTM kırılım paneli sunmaz. UTM’leri hedef sitenin analitiğinde nasıl kullanacağınızı öğrenmek için ",
              guideLink("UTM link oluşturma rehberine", "/rehberler/utm-link-nasil-olusturulur"),
              " geçebilirsiniz. Satış, form gönderimi veya diğer dönüşümler hedef sistemde ayrıca ölçülmelidir.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "QR özelindeki ayrımı da ",
              guideLink("QR kod tıklama takibi rehberinde", "/rehberler/qr-kod-tiklama-takibi"),
              " görebilirsiniz.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "utm-hatalari",
    title: "UTM Kullanırken Yapılan 10 Yaygın Hata",
    seoTitle: "UTM Kullanırken Yapılan 10 Hata ve Doğru Kampanya Düzeni",
    description:
      "Kampanya raporlarını bölen isimlendirme, parametre, kısa link ve ölçüm hatalarını gerçek örneklerle görün; yayın öncesi kontrol düzeni kurun.",
    category: "utm-link-takibi",
    primaryIntent: "UTM kampanyalarında yapılan uygulama ve yorumlama hatalarını önlemek",
    secondaryIntents: [
      "UTM isimlendirme ve URL hatalarını düzeltmek",
      "Kampanya tıklamalarını doğru yorumlamak",
    ],
    primaryQuery: "utm hataları",
    secondaryQueries: ["utm parametre hataları", "utm isimlendirme hataları", "kampanya linki hataları"],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM ve Link Takibi",
    },
    relatedArticles: [
      "utm-nedir",
      "utm-link-nasil-olusturulur",
      "utm-source-medium-campaign-nedir",
      "kanallara-gore-utm-link-olusturma",
    ],
    cta: {
      href: "/utm-link-olusturucu",
      label: "UTM bağlantısını kontrol ederek oluştur",
      title: "Eski UTM’leri temizleyen bir URL ile başlayın",
      description:
        "TrulyGo'nun herkese açık UTM aracı desteklediği beş UTM anahtarını değiştirir; diğer sorgu parametrelerini ve hash bölümünü koruyarak yeni bağlantıyı tarayıcıda üretir.",
    },
    sections: [
      {
        id: "kisa-cevap",
        title: "UTM hatalarının çoğu URL’den önce başlar",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Kırık bir soru işareti kolayca fark edilir; aynı kampanyanın instagram, Instagram ve ig olarak üçe bölünmesi aylar sonra raporda ortaya çıkar. Sağlam UTM kullanımı, parametreleri URL’ye eklemekten çok kaynak, medya, kampanya ve içerik değerleri için ortak bir sözlük kurma işidir.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Parametrelerin görevleri birbirine karışıyorsa önce ",
              guideLink(
                "utm_source, utm_medium ve utm_campaign rehberini",
                "/rehberler/utm-source-medium-campaign-nedir",
              ),
              " okuyun. Aşağıdaki on hata, gerçek kampanya yönetiminde raporu bölen veya gereğinden kesin yorum üreten durumlardır.",
            ),
          },
        ],
      },
      {
        id: "isimlendirme-hatalari",
        title: "1–5: İsimlendirme ve parametre düzeni hataları",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "1. Aynı kaynağı farklı yazmak",
                content: line(
                  inlineCode("instagram"),
                  ", ",
                  inlineCode("Instagram"),
                  " ve ",
                  inlineCode("ig"),
                  " aynı platformu anlatsa da raporda farklı değerler olabilir. TrulyGo'nun herkese açık aracı metni otomatik küçük harfe çevirmediği için yazım sözlüğünü ekip uygular.",
                ),
              },
              {
                title: "2. Source ve medium alanını aynı anlama getirmek",
                content: line(
                  inlineCode("utm_source=instagram&utm_medium=instagram"),
                  " platformu iki kez söyler. Source için instagram, medium için social gibi platform ile trafik türünü ayıran bir yapı daha açıklayıcıdır.",
                ),
              },
              {
                title: "3. Kampanya adını yayın sırasında değiştirmek",
                content: line(
                  inlineCode("sonbahar"),
                  " ile başlayan kampanyayı sonradan ",
                  inlineCode("sonbahar-indirimi"),
                  " olarak dağıtmak tek çalışmayı iki kampanya gibi gösterir. Adı ilk paylaşım öncesinde kilitleyin.",
                ),
              },
              {
                title: "4. Content ve term alanlarını sözlüksüz doldurmak",
                content: plain(
                  "Content gerçekten bio, alt-banner veya ilk-buton gibi yerleşimleri ayırmalı; term ise anlamlı bir anahtar kelime ya da hedefleme ayrımı varsa kullanılmalı. Boş bırakılabilecek alanlara rastgele değer yazmak gelecekte açıklanamayan kırılımlar üretir.",
                ),
              },
              {
                title: "5. Zaten etiketli URL’ye ikinci UTM setini eklemek",
                content: line(
                  "URL’de ",
                  inlineCode("utm_source=mail"),
                  " varken sona bir de ",
                  inlineCode("UTM_SOURCE=email"),
                  " eklemek hangi değerin okunacağına dair belirsizlik yaratır. Eski beş UTM anahtarını temizleyip tek set yazın.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "TrulyGo'nun herkese açık aracı yinelenen UTM riskini azaltır",
            content: line(
              guideLink("UTM link oluşturucu", "/utm-link-olusturucu"),
              " hedef URL’deki source, medium, campaign, content ve term anahtarlarını büyük/küçük harf ayrımı yapmadan kaldırır; formdaki dolu değerleri bir kez yazar. Normal sorgu parametrelerini ve hash’i korur.",
            ),
          },
        ],
      },
      {
        id: "dagitim-ve-yorum-hatalari",
        title: "6–10: Dağıtım, kısa link ve ölçüm hataları",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "6. URL’yi elle birleştirirken query ve hash sırasını bozmak",
                content: line(
                  "İlk sorgu parametresi ",
                  inlineCode("?"),
                  ", devamı ",
                  inlineCode("&"),
                  " ile eklenir; UTM’ler ",
                  inlineCode("#bolum"),
                  " işaretinden önce olmalıdır. İkinci bir soru işareti veya hash’ten sonra yazılan parametre hedef analitiğine ulaşmayabilir.",
                ),
              },
              {
                title: "7. Tek ana kısa linki her yerde paylaşıp kanal ayrımı beklemek",
                content: plain(
                  "TrulyGo ana kısa linki varsayılan olarak UTM eklemez. Instagram, YouTube, e-posta ve QR katkısını ayırmak istiyorsanız onaylı ana linkin ayrı kanal linklerini kullanın.",
                ),
              },
              {
                title: "8. Kanal kısa URL’sine UTM ekleyerek preset’i değiştirmeye çalışmak",
                content: plain(
                  "Kanal yönlendirmesi kayıtlı source, medium, campaign ve content değerlerini uygular; kanal URL’sine sonradan eklenen UTM’ler bunları geçersiz kılmaz. Hedefteki ilk term ile UTM dışı sorgu ve hash korunur.",
                ),
              },
              {
                title: "9. URL üretmeyi kayıt ve analiz kurulumu sanmak",
                content: plain(
                  "Herkese açık UTM aracında Oluştur veya Kopyala demek TrulyGo’da kısa link, kampanya kaydı ya da GA4 bağlantısı oluşturmaz. Kısaltma CTA’sı yalnız iki saatlik, tek kullanımlık bir tarayıcı taslağıyla Panelim formunu önceden doldurur; talebi kullanıcı gönderir.",
                ),
              },
              {
                title: "10. Tıklamayı kişi veya dönüşüm olarak raporlamak",
                content: plain(
                  "TrulyGo link verisi günlük tekilleştirilmiş tıklama sezgisidir. Aynı ziyaretçi farklı gün veya kanalda yeniden sayılabilir; botlar girebilir; yaklaşık konum yanılabilir. Tıklama satış, kayıt veya form gönderimi değildir.",
                ),
              },
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Ana link ile kanal linki arasındaki ayrıntılı fark için ",
              guideLink("kısa link nedir?", "/rehberler/kisa-link-nedir"),
              " ve ",
              guideLink(
                "kanallara göre UTM link oluşturma",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " rehberlerini birlikte okuyabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "yanlis-dogru-ornekler",
        title: "Yanlış ve daha sağlıklı kampanya URL’leri",
        blocks: [
          {
            type: "table",
            caption: "Yayın öncesi hızlı karşılaştırma",
            headers: ["Sorun", "Riskli örnek", "Daha sağlıklı örnek"],
            rows: [
              ["Source/medium tekrarı", "source=instagram, medium=instagram", "source=instagram, medium=social"],
              ["Kampanya parçalanması", "yaz, yaz2026, yaz-kampanyasi", "Bütün kanallarda yaz-kampanyasi"],
              ["Belirsiz content", "content=test1", "content=bio veya boş"],
              ["Yinelenen UTM", "utm_source=mail ve UTM_SOURCE=email", "Tek utm_source=email"],
              ["Kanal ayrımı yok", "Her kanalda yalnız ana kısa link", "Her kanal için kayıtlı kanal linki"],
            ],
          },
          {
            type: "code",
            label: "Tutarlı örnek",
            code: "https://ornek.com/lansman?urun=pro&utm_source=instagram&utm_medium=social&utm_campaign=sonbahar-lansmani&utm_content=bio#ozellikler",
          },
          {
            type: "paragraph",
            content: plain(
              "Bu URL’de ürün sorgusu ve sayfa içi bölüm işareti kampanya etiketlerinden ayrı kalır. Aynı kampanya YouTube’da paylaşılırken yalnız source, medium ve content değiştirilir; campaign sabit tutulur.",
            ),
          },
        ],
      },
      {
        id: "yayin-oncesi-kontrol",
        title: "Bağlantıyı dağıtmadan önce beş dakikalık kontrol",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              plain("Hedef URL’yi açın; sayfanın, normal sorgu parametrelerinin ve hash’in doğru kaldığını görün."),
              plain("Source, medium, campaign ve content değerlerini kampanya sözlüğünüzle birebir karşılaştırın."),
              plain("Aynı kampanyanın diğer kanal URL’leriyle campaign değerini karşılaştırın."),
              plain("URL’de aynı UTM anahtarının farklı harf biçimleriyle tekrar etmediğini kontrol edin."),
              plain("Kısa link kullanıyorsanız ana link mi, kanal linki mi dağıttığınızı doğrulayın."),
              plain("Onay bekleyen veya pasif kısa adresi basılı materyale ya da zamanlanmış gönderiye koymayın."),
              plain("Hedef analitiğinde test trafiğinin UTM alanlarını alıp almadığını ayrıca doğrulayın."),
              plain("Rapor şablonunda tıklama, kişi, oturum ve dönüşümü ayrı metrikler olarak adlandırın."),
            ],
          },
          {
            type: "paragraph",
            content: line(
              "URL’yi sıfırdan uygulamalı üretmek için ",
              guideLink("UTM link nasıl oluşturulur?", "/rehberler/utm-link-nasil-olusturulur"),
              " rehberini; temel kavramları yeniden kontrol etmek için ",
              guideLink("UTM nedir?", "/rehberler/utm-nedir"),
              " rehberini kullanabilirsiniz.",
            ),
          },
        ],
      },
    ],
  },
] satisfies GuideArticle[];
