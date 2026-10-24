import {
  TRULYGO_GUIDE_PUBLISHER,
  guideLink,
  inlineCode,
  line,
  plain,
  strong,
  type GuideArticle,
} from "./types";

export const utmBasicsGuides = [
  {
    slug: "utm-nedir",
    title: "UTM Nedir? UTM Parametreleri Nasıl Kullanılır?",
    seoTitle: "UTM Nedir? UTM Parametreleri Nasıl Kullanılır?",
    description:
      "UTM parametrelerinin neyi anlattığını, bağlantıya nasıl eklendiğini ve kampanya trafiğini doğru yorumlamak için nasıl adlandırılması gerektiğini örneklerle öğrenin.",
    category: "utm-link-takibi",
    primaryIntent: "UTM kavramını ve temel kullanım mantığını öğrenmek",
    secondaryIntents: [
      "TrulyGo oluşturucusundaki beş UTM alanının görevlerini ayırt etmek",
      "UTM'nin neyi ölçüp neyi ölçmediğini anlamak",
      "Tutarlı bir kampanya adlandırma düzeni kurmak",
    ],
    primaryQuery: "utm nedir",
    secondaryQueries: [
      "utm parametresi nedir",
      "utm ne işe yarar",
      "utm nasıl kullanılır",
      "utm link nedir",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM ve Link Takibi",
    },
    relatedArticles: [
      "utm-link-nasil-olusturulur",
      "utm-source-medium-campaign-nedir",
      "instagram-link-takibi",
      "utm-hatalari",
    ],
    cta: {
      href: "/utm-link-olusturucu",
      label: "UTM bağlantısı oluştur",
      title: "Kampanya bağlantınızı hazırlayın",
      description:
        "Hedef adresinizi, kaynağı, kanalı ve kampanya adını girerek UTM bağlantınızı tarayıcınızda oluşturun.",
    },
    sections: [
      {
        id: "utm-nedir-kisa-cevap",
        title: "UTM nedir?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              strong("Kısa cevap: "),
              "UTM, bir bağlantıya eklenen ve ziyaretin hangi kaynak, kanal veya kampanyayla ilişkilendirileceğini anlatan parametrelerdir. Bağlantının götürdüğü sayfayı değiştirmez; hedef sitedeki analytics sistemine trafik hakkında etiket taşır.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Bir UTM bağlantısına tıklanması, tek başına satış, form gönderimi veya başka bir dönüşüm gerçekleştiğini kanıtlamaz. UTM yalnızca ziyareti sınıflandırmaya yardım eder; sonucu görmek için hedef sitede uygun analytics ve dönüşüm ölçümü kurulmuş olmalıdır.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "UTM bir ölçüm aracı değil, ölçüme taşınan etikettir",
            content: plain(
              "Parametreleri bağlantıya eklemek veri üretmeye başlamaz. Veriyi, ziyaretçinin açtığı hedef sitedeki analytics sistemi okur. TrulyGo kısa link kullanıldığında ise yönlendirme tıklaması ayrıca TrulyGo tarafında kaydedilebilir; bu iki veri kaynağının kapsamı aynı değildir.",
            ),
          },
        ],
      },
      {
        id: "utm-parametreleri",
        title: "UTM parametreleri hangi soruları yanıtlar?",
        blocks: [
          {
            type: "table",
            caption: "TrulyGo oluşturucusunun yönettiği beş temel UTM alanı",
            headers: ["Parametre", "Yanıtladığı soru", "Örnek değer"],
            rows: [
              ["utm_source", "Ziyaret hangi kaynaktan geldi?", "instagram"],
              ["utm_medium", "Hangi pazarlama kanalı kullanıldı?", "social"],
              ["utm_campaign", "Hangi kampanya kapsamında paylaşıldı?", "yaz_indirimi"],
              ["utm_content", "Hangi içerik veya bağlantı varyantıydı?", "profil_butonu"],
              ["utm_term", "Hangi ücretli arama terimiyle ilişkiliydi?", "kosu_ayakkabisi"],
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "Bu beş alan bütün UTM sözlüğü değildir",
            content: line(
              "Google Analytics; bunların yanında utm_id, utm_source_platform, utm_creative_format ve utm_marketing_tactic gibi ek manuel kampanya parametreleri de tanır. TrulyGo'nun herkese açık oluşturucusu şu anda source, medium, campaign, content ve term alanlarını üretir. ",
              guideLink(
                "Güncel parametre listesini Google Analytics yardımında inceleyin.",
                "https://support.google.com/analytics/answer/10917952?hl=tr",
              ),
            ),
          },
          {
            type: "paragraph",
            content: line(
              "İlk üç alan çoğu kampanya planının omurgasıdır. Parametrelerin ayrıntılı kullanımını ",
              guideLink(
                "utm_source, utm_medium ve utm_campaign rehberinde",
                "/rehberler/utm-source-medium-campaign-nedir",
              ),
              " ayrı ayrı inceleyebilirsiniz.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Büyük ve küçük harfi karıştırmayın",
            content: line(
              inlineCode("Instagram"),
              ", ",
              inlineCode("instagram"),
              " ve ",
              inlineCode("INSTAGRAM"),
              " analytics raporlarında ayrı değerler olarak görülebilir. Ekip içinde tek bir yazım düzeni seçin ve kampanya boyunca onu koruyun.",
            ),
          },
        ],
      },
      {
        id: "utm-url-okuma",
        title: "Bir UTM bağlantısı nasıl okunur?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Bir e-ticaret markasının yaz indirimi sayfasını haftalık e-posta bültenindeki üst butonda paylaştığını düşünelim. Hedef adres ve kampanya etiketleri tek URL içinde şöyle görünür:",
            ),
          },
          {
            type: "code",
            label: "E-posta bülteni bağlantısı örneği",
            code: "https://ornek.com/yaz-kampanyasi?utm_source=newsletter&utm_medium=email&utm_campaign=yaz_indirimi&utm_content=ust_buton",
          },
          {
            type: "list",
            items: [
              line(inlineCode("https://ornek.com/yaz-kampanyasi"), " gerçek hedef sayfadır."),
              line(inlineCode("utm_source=newsletter"), " ziyaretin kaynağını bülten olarak etiketler."),
              line(inlineCode("utm_medium=email"), " dağıtım kanalını e-posta olarak sınıflandırır."),
              line(inlineCode("utm_campaign=yaz_indirimi"), " ziyareti yaz indirimi kampanyasıyla ilişkilendirir."),
              line(inlineCode("utm_content=ust_buton"), " aynı kampanyadaki bağlantı yerleşimini ayırt eder."),
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Soru işareti hedef adres ile ilk parametreyi ayırır; sonraki parametreler & işaretiyle birbirine bağlanır. Bu karakterleri elle yerleştirmek yerine bir URL oluşturucu kullanmak yazım ve kodlama hatası riskini azaltır.",
            ),
          },
        ],
      },
      {
        id: "utm-ne-zaman-kullanilir",
        title: "UTM ne zaman kullanılmalı?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "UTM, aynı hedef sayfaya farklı dağıtım noktalarından trafik gönderdiğinizde değerlidir. Hangi paylaşımın ziyaret getirdiğini anlamak istiyorsanız her anlamlı kanal veya içerik varyantına tutarlı bir etiket seti verin.",
            ),
          },
          {
            type: "list",
            items: [
              plain("Instagram, YouTube ve e-posta bülteninden aynı kampanya sayfasına giden bağlantıları ayırmak"),
              plain("Bir e-postadaki üst buton ile alt metin bağlantısını karşılaştırmak"),
              plain("Farklı iş ortakları veya içerik üreticileri için kaynak adlarını düzenli tutmak"),
              plain("Bir kampanyanın organik sosyal paylaşımı ile ücretli reklamını farklı medium değerleriyle sınıflandırmak"),
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Aynı kampanyayı birden fazla yerde paylaşacaksanız ",
              guideLink(
                "kanallara göre UTM linki oluşturma rehberindeki",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " örnek planı kullanabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "utm-adlandirma-duzeni",
        title: "İyi bir UTM adlandırma düzeni kurun",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Önce sözlüğü belirleyin",
                content: plain(
                  "Kaynaklar için instagram, youtube ve newsletter; medium için social, video ve email gibi ekipçe anlaşılmış değerler seçin.",
                ),
              },
              {
                title: "Tek bir ayırıcı kullanın",
                content: line(
                  "Boşluk yerine örneğin alt çizgi kullanın: ",
                  inlineCode("yaz_indirimi"),
                  ". Aynı projede tire, boşluk ve alt çizgiyi rastgele karıştırmayın.",
                ),
              },
              {
                title: "Büyük-küçük harfi sabitleyin",
                content: plain(
                  "Tüm değerleri küçük harfle yazmak, aynı kaynağın raporda birkaç satıra bölünmesini önleyen pratik bir ekip kuralıdır.",
                ),
              },
              {
                title: "Anlamı koruyun",
                content: line(
                  inlineCode("utm_source=instagram"),
                  " ve ",
                  inlineCode("utm_medium=social"),
                  " gibi her alanın farklı soruya yanıt verdiği değerler kullanın.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Kampanya başlamadan önce bir örnek satır hazırlayın",
            content: plain(
              "Kaynak, medium, campaign ve gerekiyorsa content sütunlarını içeren küçük bir kanal planı, ekipteki herkesin aynı değerleri kullanmasını kolaylaştırır. Sonradan rapor temizlemekten daha az zaman alır.",
            ),
          },
        ],
      },
      {
        id: "utm-trulygo-akisi",
        title: "UTM bağlantısını oluşturduktan sonra ne olur?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "TrulyGo'nun herkese açık UTM oluşturucusunda hedef adres, source, medium ve campaign alanları zorunludur; content ve term isteğe bağlıdır. Araç tarayıcıda çalışır ve UTM bağlantısını oluşturmak için hesap istemez. Adım adım kullanım için ",
              guideLink(
                "UTM link nasıl oluşturulur rehberine",
                "/rehberler/utm-link-nasil-olusturulur",
              ),
              " geçebilirsiniz.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "Oluşturduğunuz uzun UTM bağlantısını doğrudan paylaşabilir veya TrulyGo ile kısaltma akışına taşıyabilirsiniz. Kısaltma seçeneğine bastığınızda taslak aynı sekmede en fazla iki saat tutulur ve bir kez Panelim formuna aktarılır. Form doldurulur; link talebi sizin yerinize otomatik gönderilmez.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Yayından önce sık görülen isimlendirme ve ölçüm sorunlarını ",
              guideLink("UTM kullanırken yapılan hatalar", "/rehberler/utm-hatalari"),
              " listesiyle kontrol edin.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "utm-link-nasil-olusturulur",
    title: "UTM Link Nasıl Oluşturulur? Adım Adım Rehber",
    seoTitle: "UTM Link Nasıl Oluşturulur? Adım Adım Uygulama",
    description:
      "Hedef URL, kaynak, kanal ve kampanya alanlarını doğru doldurarak tutarlı bir UTM bağlantısını adım adım oluşturun ve paylaşmadan önce kontrol edin.",
    category: "utm-link-takibi",
    primaryIntent: "Uygulamalı olarak UTM bağlantısı oluşturmak",
    secondaryIntents: [
      "Zorunlu ve isteğe bağlı UTM alanlarını doğru doldurmak",
      "Oluşturulan kampanya bağlantısını paylaşmadan önce doğrulamak",
      "UTM bağlantısını kısa link akışına güvenle taşımak",
    ],
    primaryQuery: "utm link oluşturma",
    secondaryQueries: [
      "utm link nasıl oluşturulur",
      "utm oluşturucu",
      "utm bağlantısı hazırlama",
      "ücretsiz utm link oluşturma",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "Uygulamalı UTM",
    },
    relatedArticles: [
      "utm-nedir",
      "utm-source-medium-campaign-nedir",
      "kanallara-gore-utm-link-olusturma",
      "utm-hatalari",
    ],
    cta: {
      href: "/utm-link-olusturucu",
      label: "UTM linkini oluştur",
      title: "Örneğinizi kendi kampanyanıza uyarlayın",
      description:
        "Zorunlu alanları doldurun, oluşan bağlantıyı kontrol edin ve üyelik olmadan kopyalayın.",
    },
    sections: [
      {
        id: "utm-link-olusturma-kisa-cevap",
        title: "UTM link nasıl oluşturulur?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Önce gerçek hedef URL'yi belirleyin; ardından ziyaretin kaynağını, pazarlama kanalını ve kampanya adını utm_source, utm_medium ve utm_campaign alanlarına yazın. İhtiyaç varsa içerik varyantı için utm_content, ücretli arama terimi için utm_term ekleyin.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "UTM'nin temel mantığına yabancıysanız önce ",
              guideLink("UTM nedir?", "/rehberler/utm-nedir"),
              " rehberini okuyun. Buradaki adımlar, hangi alanın ne anlama geldiğini bildiğiniz bir kampanya bağlantısını üretmeye odaklanır.",
            ),
          },
        ],
      },
      {
        id: "kampanya-plani",
        title: "Bağlantıyı açmadan önce dört kararı verin",
        blocks: [
          {
            type: "table",
            caption: "Yaz indirimi için örnek UTM planı",
            headers: ["Karar", "Seçilen değer", "Gerekçe"],
            rows: [
              ["Hedef", "https://ornek.com/yaz-kampanyasi", "Kullanıcının ulaşacağı gerçek sayfa"],
              ["Kaynak", "instagram", "Trafiğin geldiği platform"],
              ["Medium", "social", "Organik sosyal dağıtım sınıfı"],
              ["Kampanya", "yaz_indirimi", "Tüm kanallarda ortak kampanya adı"],
              ["İçerik", "profil_baglantisi", "Instagram içindeki yerleşim"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Kampanya adını bağlantıyı üretirken düşünmek yerine dağıtım başlamadan önce belirleyin. Aynı çalışma için bir ekip üyesi yaz_indirimi, diğeri yaz-kampanyasi yazarsa tek kampanya raporda parçalanabilir.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Kaynak ve medium aynı alan değildir",
            content: line(
              inlineCode("utm_source=instagram"),
              " platformu, ",
              inlineCode("utm_medium=social"),
              " kanal sınıfını anlatır. Her iki alana da instagram yazmak bağlantıyı bozmaz; fakat kanallar arası raporlamayı gereksiz yere zorlaştırır.",
            ),
          },
        ],
      },
      {
        id: "trulygo-utm-olusturucu-adimlari",
        title: "TrulyGo UTM oluşturucusunu adım adım kullanın",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Hedef adresi girin",
                content: plain(
                  "Kullanıcının açmasını istediğiniz tam http veya https adresini yazın. Yanlış sayfaya giden kusursuz etiketlenmiş bir link yine yanlış linktir.",
                ),
              },
              {
                title: "Kaynağı yazın",
                content: line(
                  "Source alanına platform veya gönderen kaynağı girin; bu örnekte ",
                  inlineCode("instagram"),
                  ".",
                ),
              },
              {
                title: "Kanalı sınıflandırın",
                content: line(
                  "Medium alanında ekip standardınızı kullanın; organik sosyal paylaşım için bu planda ",
                  inlineCode("social"),
                  " seçildi.",
                ),
              },
              {
                title: "Kampanya adını ekleyin",
                content: line(
                  "Campaign alanına bütün kanallarda korunacak ",
                  inlineCode("yaz_indirimi"),
                  " değerini yazın.",
                ),
              },
              {
                title: "Gerekirse content veya term ekleyin",
                content: plain(
                  "Aynı kanaldaki yerleşimleri ayırmak için content kullanın. Term alanını anlamlı bir ücretli arama terimi yoksa boş bırakabilirsiniz.",
                ),
              },
              {
                title: "Oluşturun ve kontrol edin",
                content: plain(
                  "Bağlantıyı üretin; hedef alan adını ve eklenen parametreleri önizlemede kontrol ettikten sonra kopyalayın.",
                ),
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "Herkese açık araç üyelik istemez ve tarayıcıda çalışır",
            content: plain(
              "Source, medium ve campaign zorunlu; content ve term isteğe bağlıdır. UTM bağlantısını oluşturmak veritabanına bir kısa link kaydı eklemez ve analytics verisi üretmez.",
            ),
          },
        ],
      },
      {
        id: "olusan-utm-linki",
        title: "Ortaya çıkan bağlantıyı satır satır kontrol edin",
        blocks: [
          {
            type: "code",
            label: "Oluşturulan bağlantı",
            code: "https://ornek.com/yaz-kampanyasi?utm_source=instagram&utm_medium=social&utm_campaign=yaz_indirimi&utm_content=profil_baglantisi",
          },
          {
            type: "list",
            items: [
              plain("Alan adı ve sayfa yolu doğru mu?"),
              line("Zorunlu üç alan boş olmadan ", inlineCode("utm_source"), ", ", inlineCode("utm_medium"), " ve ", inlineCode("utm_campaign"), " olarak görünüyor mu?"),
              plain("Değerler ekip standardındaki küçük harf ve ayırıcı düzenine uyuyor mu?"),
              plain("URL'de zaten bulunan normal sorgu parametreleri ve sayfa içi #anchor korunuyor mu?"),
              plain("Bağlantı gizli bilgi, kişisel veri veya URL'de görünmesini istemediğiniz bir ifade içeriyor mu?"),
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "TrulyGo oluşturucusu mevcut utm_source, utm_medium, utm_campaign, utm_content ve utm_term anahtarlarını temizler; formdaki dolu değerleri yazar. Diğer sorgu parametrelerini ve hash bölümünü korur. Yine de sonucu tarayıcıda açıp gerçek hedefin çalıştığını doğrulamak yayıncının kontrolüdür.",
            ),
          },
        ],
      },
      {
        id: "utm-linki-kisaltma",
        title: "Uzun UTM bağlantısını kısaltmak isterseniz",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "UTM bağlantısı çalışmak için kısa olmak zorunda değildir. Daha okunur bir paylaşım adresi veya TrulyGo yönlendirme tıklama analitiği istiyorsanız oluşturulan URL'yi kısa link talebi akışına taşıyabilirsiniz.",
            ),
          },
          {
            type: "paragraph",
            content: plain(
              "“TrulyGo ile kısalt” CTA'sına bastığınızda üretilen taslak yalnız aynı tarayıcı sekmesinde, en fazla iki saat ve tek kullanım hakkıyla saklanır. Giriş veya kayıt sonrasında Panelim formu bu taslakla doldurulur. Sistem formu otomatik göndermez; hedefi, kampanya adını ve kısa adı kontrol edip talebi siz gönderirsiniz.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Kısa link ile UTM'nin görevlerini karıştırmamak için ",
              guideLink("kısa link ve UTM farkı", "/rehberler/kisa-link-nedir"),
              " rehberine bakabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "yayin-sonrasi-olcum",
        title: "Yayın sonrası hangi veriye bakmalısınız?",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "UTM'li hedef sayfa açıldığında parametreleri hedef sitedeki analytics sistemi okuyabilir. TrulyGo bu sistemi sizin yerinize kurmaz veya GA4 hesabınıza otomatik bağlamaz. TrulyGo kısa linki kullanıldıysa yönlendirme tıklamalarını kendi link ekranınızda ayrıca inceleyebilirsiniz.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Tıklama dönüşüm değildir",
            content: plain(
              "Bir kişi bağlantıyı açmış olabilir fakat sayfayı tamamlamadan ayrılabilir. Satın alma, form gönderimi veya mesaj gibi sonuçları tıklama sayısından çıkarmayın; bu olayları hedef sistemde ayrıca ölçün.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              "Bir kampanyaya daha fazla kanal eklemeden önce ",
              guideLink(
                "kanallara göre ayrı UTM linkleri oluşturma",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " örneğini; yayına çıkmadan önce de ",
              guideLink("yaygın UTM hatalarını", "/rehberler/utm-hatalari"),
              " inceleyin.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "utm-source-medium-campaign-nedir",
    title: "utm_source, utm_medium ve utm_campaign Nedir?",
    seoTitle: "utm_source, utm_medium ve utm_campaign Nedir?",
    description:
      "UTM source, medium ve campaign alanlarının farkını; Instagram, e-posta ve YouTube için tutarlı değer örnekleriyle netleştirin.",
    category: "utm-link-takibi",
    primaryIntent: "Temel UTM parametrelerinin farkını teknik olarak anlamak",
    secondaryIntents: [
      "Source, medium ve campaign için uygun değerler seçmek",
      "Kaynak ile pazarlama kanalı sınıfını birbirine karıştırmamak",
      "Content ve term alanlarının ne zaman gerekli olduğunu belirlemek",
    ],
    primaryQuery: "utm source medium campaign nedir",
    secondaryQueries: [
      "utm_source nedir",
      "utm_medium nedir",
      "utm_campaign nedir",
      "utm source medium farkı",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "UTM Parametreleri",
    },
    relatedArticles: [
      "utm-nedir",
      "utm-link-nasil-olusturulur",
      "kanallara-gore-utm-link-olusturma",
      "utm-hatalari",
    ],
    cta: {
      href: "/utm-link-olusturucu",
      label: "Parametrelerle UTM linki oluştur",
      title: "Source, medium ve campaign değerlerinizi deneyin",
      description:
        "Üç zorunlu alanı tutarlı değerlerle doldurun ve oluşan bağlantıyı paylaşmadan önce kontrol edin.",
    },
    sections: [
      {
        id: "source-medium-campaign-kisa-cevap",
        title: "source, medium ve campaign arasındaki fark nedir?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_source"),
              " trafiği gönderen kaynağı, ",
              inlineCode("utm_medium"),
              " kullanılan pazarlama kanalının türünü, ",
              inlineCode("utm_campaign"),
              " ise bağlantının bağlı olduğu kampanyayı belirtir. Üçü birlikte “ziyaret nereden, hangi yöntemle ve hangi çalışma kapsamında geldi?” sorusunu yanıtlar.",
            ),
          },
          {
            type: "code",
            label: "Üç temel parametre",
            code: "?utm_source=instagram&utm_medium=social&utm_campaign=yaz_indirimi",
          },
          {
            type: "paragraph",
            content: line(
              "Bu parametrelerin bağlantının tamamındaki yerini görmek için ",
              guideLink("UTM nedir?", "/rehberler/utm-nedir"),
              " rehberindeki URL çözümlemesine bakabilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "utm-source",
        title: "utm_source: Trafiği gönderen kaynak",
        blocks: [
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_source"),
              " ziyaretçinin bağlantıyla karşılaştığı platformu, yayıncıyı veya gönderen sistemi adlandırır. Instagram, youtube, newsletter veya bir iş ortağının sabit adı source olabilir.",
            ),
          },
          {
            type: "table",
            caption: "Farklı dağıtımlar için source örnekleri",
            headers: ["Dağıtım noktası", "Önerilen source", "Kaçınılacak belirsiz değer"],
            rows: [
              ["Instagram hesabı", "instagram", "social"],
              ["YouTube kanalı", "youtube", "video"],
              ["E-posta bülteni", "newsletter", "email"],
              ["İş ortağı Ada Medya", "ada_medya", "partner1"],
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Source değerini zaman içinde tanınabilir tutun",
            content: plain(
              "partner1 gibi sıra numaraları birkaç ay sonra anlamını kaybedebilir. Raporu açan kişinin kaynağı ek tablo olmadan anlayabileceği kısa ve kalıcı bir ad seçin.",
            ),
          },
        ],
      },
      {
        id: "utm-medium",
        title: "utm_medium: Pazarlama kanalının türü",
        blocks: [
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_medium"),
              " kaynağın adını tekrar etmek yerine dağıtım yöntemini sınıflandırır. Instagram ve LinkedIn farklı source değerleri olabilir; ikisi de organik sosyal paylaşım ise ortak medium değeri olarak social kullanılabilir.",
            ),
          },
          {
            type: "list",
            items: [
              line(inlineCode("social"), ": organik sosyal medya dağıtımı için ekip standardı olabilir."),
              line(inlineCode("paid_social"), ": ücretli sosyal reklamları organikten ayırabilir."),
              line(inlineCode("email"), ": bülten ve izinli e-posta kampanyaları için kullanılabilir."),
              line(inlineCode("partner"), ": iş ortağı dağıtımlarını tek kanal sınıfında toplamak için kullanılabilir."),
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Bunlar tek evrensel sözlük değildir. Kullandığınız analytics sisteminin kanal sınıflandırmasını ve ekibinizin mevcut adlarını kontrol edin; sonra seçtiğiniz standardı kampanya boyunca değiştirmeyin.",
            ),
          },
        ],
      },
      {
        id: "utm-campaign",
        title: "utm_campaign: Ortak kampanya adı",
        blocks: [
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_campaign"),
              " farklı kaynak ve medium değerleriyle dağıtılan bağlantıları aynı pazarlama çalışması altında birleştirir. Instagram, YouTube ve e-posta bağlantılarında campaign aynı kaldığında kampanyayı bütün olarak değerlendirmek kolaylaşır.",
            ),
          },
          {
            type: "code",
            label: "Kanallar arasında korunan kampanya adı",
            code: "instagram / social / yaz_indirimi\nyoutube / video / yaz_indirimi\nnewsletter / email / yaz_indirimi",
          },
          {
            type: "list",
            items: [
              plain("Kısa fakat anlaşılır bir ad seçin."),
              plain("Yılı veya tarihi yalnızca raporda gerçekten ayrım sağlaması gerekiyorsa ekleyin."),
              plain("Ekip içinde aynı kampanya için eş anlamlı birkaç ad üretmeyin."),
              line(inlineCode("Yaz_Indirimi"), " ile ", inlineCode("yaz_indirimi"), " değerlerinin ayrı raporlanabileceğini hesaba katın."),
            ],
          },
        ],
      },
      {
        id: "content-term",
        title: "utm_content ve utm_term ne zaman eklenir?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_content"),
              " aynı source, medium ve campaign içindeki bağlantı varyantlarını ayırır. Bir e-postadaki üst buton ve metin bağlantısı ya da Instagram'daki profil bağlantısı ile başka bir yerleşim bu alanla ayrıştırılabilir.",
            ),
          },
          {
            type: "paragraph",
            content: line(
              inlineCode("utm_term"),
              " çoğunlukla ücretli arama anahtar kelimesi veya benzer bir terim boyutu için ayrılır. Böyle bir ihtiyaç yoksa sırf alanı doldurmak için campaign adını tekrar etmeyin; boş bırakın.",
            ),
          },
          {
            type: "table",
            caption: "Aynı kampanyadaki içerik varyantları",
            headers: ["Yerleşim", "utm_content", "Diğer üç alan"],
            rows: [
              ["Instagram profil bağlantısı", "profil_baglantisi", "instagram / social / yaz_indirimi"],
              ["E-posta üst butonu", "ust_buton", "newsletter / email / yaz_indirimi"],
              ["E-posta metin bağlantısı", "metin_baglantisi", "newsletter / email / yaz_indirimi"],
            ],
          },
        ],
      },
      {
        id: "parametre-plani",
        title: "Üç alanı birlikte planlayın",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Kampanya adını sabitleyin",
                content: line("Bütün kanallar için ortak ", inlineCode("yaz_indirimi"), " değerini belirleyin."),
              },
              {
                title: "Kaynak listesini çıkarın",
                content: plain("instagram, youtube ve newsletter gibi gerçek gönderenleri ayrı source satırlarına yazın."),
              },
              {
                title: "Medium sözlüğüyle eşleştirin",
                content: plain("Her source'u social, video veya email gibi önceden kabul edilmiş bir kanal türüne bağlayın."),
              },
              {
                title: "Gerekli varyantları adlandırın",
                content: plain("Yalnız gerçekten karşılaştıracağınız yerleşimlerde content ekleyin; gereksiz ayrıntıyla raporu parçalamayın."),
              },
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Planı gerçek URL'lere dönüştürmek için ",
              guideLink("adım adım UTM link oluşturma", "/rehberler/utm-link-nasil-olusturulur"),
              " rehberini; tek kampanyanın kanal varyantları için ",
              guideLink(
                "kanallara göre UTM oluşturma örneğini",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " kullanın.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Tutarlı etiket, doğru sonuç garantisi değildir",
            content: plain(
              "UTM değerleri trafiği sınıflandırır. Çerez izni, yönlendirme koşulları ve hedef analytics yapılandırması raporu etkileyebilir; tıklama da dönüşüm gerçekleştiği anlamına gelmez.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "instagram-link-takibi",
    title: "Instagram Linklerini Nasıl Takip Edebilirsiniz?",
    seoTitle: "Instagram Link Takibi Nasıl Yapılır? UTM Örneği",
    description:
      "Instagram'daki farklı bağlantı yerleşimlerini UTM değerleriyle ayırın, TrulyGo ile paylaşım akışını düzenleyin ve tıklama verisini sınırlarıyla yorumlayın.",
    category: "utm-link-takibi",
    primaryIntent: "Instagram üzerinden paylaşılan bağlantıları kaynak ve yerleşime göre takip etmek",
    secondaryIntents: [
      "Instagram bağlantı yerleşimlerini UTM content değeriyle ayırmak",
      "Organik ve ücretli Instagram dağıtımı için tutarlı bir UTM planı kurmak",
      "Instagram bağlantı tıklamalarını sınırlarıyla yorumlamak",
    ],
    primaryQuery: "instagram link takibi",
    secondaryQueries: [
      "instagram link tıklama",
      "instagram utm link",
      "instagram bio link takip",
      "instagram trafik ölçme",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "Instagram ve UTM",
    },
    relatedArticles: [
      "utm-nedir",
      "utm-link-nasil-olusturulur",
      "instagram-bio-birden-fazla-link",
      "trulygo-link-istatistikleri",
    ],
    cta: {
      href: "/utm-link-olusturucu",
      label: "Instagram için UTM linki oluştur",
      title: "Instagram dağıtımınızı etiketleyin",
      description:
        "Kaynak, kanal, kampanya ve yerleşim değerlerini girerek paylaşacağınız bağlantıyı tarayıcınızda hazırlayın.",
    },
    sections: [
      {
        id: "instagram-link-takibi-kisa-cevap",
        title: "Instagram link takibi nasıl yapılır?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Instagram'da paylaşacağınız hedef URL'ye utm_source=instagram ve ekibinizin seçtiği bir medium değeri ekleyin. Kampanyayı utm_campaign ile, bağlantının yerleşimini gerekiyorsa utm_content ile ayırın; ardından hedef analytics sistemi ve kullanıyorsanız TrulyGo kısa link verisini kendi kapsamlarında değerlendirin.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Instagram'da birden fazla profil bağlantısı bulunabilir",
            content: plain(
              "Instagram'ın yerel profil bağlantısı seçenekleri vardır ve platform özellikleri zamanla değişebilir. Takip planını “Instagram yalnız tek linke izin verir” varsayımı üzerine kurmayın; hesabınızda bugün görünen bağlantı alanlarını kontrol edin ve her anlamlı yerleşimi açıkça adlandırın.",
            ),
          },
        ],
      },
      {
        id: "instagram-hedef-ve-yerlesim",
        title: "Önce hedefi ve yerleşimi ayırın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Hedef, kullanıcının ulaşacağı sayfadır; yerleşim ise bağlantının Instagram içinde nerede sunulduğunu anlatır. Aynı ürün sayfasını farklı yerleşimlerde paylaşırken campaign sabit kalabilir, content değeri değişebilir.",
            ),
          },
          {
            type: "table",
            caption: "Instagram yerleşimleri için örnek UTM planı",
            headers: ["Yerleşim", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
            rows: [
              ["Profil bağlantısı", "instagram", "social", "yaz_indirimi", "profil_baglantisi"],
              ["Hikâye bağlantısı", "instagram", "social", "yaz_indirimi", "hikaye_urun"],
              ["Reklam bağlantısı", "instagram", "paid_social", "yaz_indirimi", "reklam_video_a"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "Organik paylaşım ile ücretli reklamı medium düzeyinde ayırmak, platform aynı olsa bile dağıtım yöntemlerini karşılaştırmayı kolaylaştırır. Kullandığınız analytics sisteminin kanal sözlüğü farklıysa bu örnek değerleri kendi standardınıza uyarlayın.",
            ),
          },
        ],
      },
      {
        id: "instagram-utm-ornegi",
        title: "Instagram profil bağlantısı için gerçekçi bir örnek",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "Bir kahve markasının yaz paketi sayfasını Instagram profilindeki bağlantı alanlarından birinde paylaştığını varsayalım. Kampanya adı bütün kanallarda yaz_indirimi, bu özel yerleşim profil_baglantisi olsun.",
            ),
          },
          {
            type: "code",
            label: "Instagram profil UTM bağlantısı",
            code: "https://ornek.com/yaz-paketi?utm_source=instagram&utm_medium=social&utm_campaign=yaz_indirimi&utm_content=profil_baglantisi",
          },
          {
            type: "paragraph",
            content: line(
              "Bu URL'yi elle yazmak yerine ",
              guideLink("UTM link oluşturma adımlarını", "/rehberler/utm-link-nasil-olusturulur"),
              " izleyebilirsiniz. Source, medium ve campaign alanlarının neden farklı değerler taşıdığını ",
              guideLink(
                "UTM parametreleri rehberi",
                "/rehberler/utm-source-medium-campaign-nedir",
              ),
              " açıklar.",
            ),
          },
        ],
      },
      {
        id: "instagram-trulygo-akisi",
        title: "TrulyGo ile paylaşım akışını nasıl kurarsınız?",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "UTM bağlantısını hazırlayın",
                content: plain(
                  "Herkese açık UTM aracında hedef URL'yi, source alanına instagram değerini, seçtiğiniz medium'u ve kampanya adını girin. Araç üyelik istemeden tarayıcıda sonucu üretir.",
                ),
              },
              {
                title: "Doğrudan paylaşın veya kısaltın",
                content: plain(
                  "Uzun URL'yi kullanabilir ya da TrulyGo kısa link talebine taşıyabilirsiniz. Kısaltma taslağı aynı sekmede en fazla iki saat, tek kullanım için saklanır.",
                ),
              },
              {
                title: "Talebi kontrol ederek gönderin",
                content: plain(
                  "Giriş sonrasında Panelim formu taslakla doldurulur; otomatik gönderilmez. Hedef, kampanya adı ve kısa adı siz doğrularsınız.",
                ),
              },
              {
                title: "Yerleşimleri ayrı tutun",
                content: plain(
                  "Aynı onaylı ana linki farklı dağıtım noktalarında ayırmak için mevcut kanal linki akışını kullanabilir veya UTM content planınızı koruyabilirsiniz.",
                ),
              },
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Instagram profilinizde birkaç hedefi tek düzenli sayfada sunmak istiyorsanız ",
              guideLink(
                "Instagram bio'ya birden fazla link ekleme rehberini",
                "/rehberler/instagram-bio-birden-fazla-link",
              ),
              " inceleyin. Link Vitrini farklı bir kullanım problemidir; UTM'nin yerine geçmez.",
            ),
          },
        ],
      },
      {
        id: "instagram-veri-okuma",
        title: "Instagram bağlantı verisini doğru yorumlayın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "UTM değerlerini hedef sitedeki analytics sistemi okuyabilir. TrulyGo kısa linki kullanıyorsanız TrulyGo yönlendirme tıklamalarını da görebilirsiniz. İki sistem farklı olayları, farklı teknik koşullarda saydığı için rakamların bire bir aynı olması beklenmemelidir.",
            ),
          },
          {
            type: "list",
            items: [
              plain("UTM, ziyaretin nasıl etiketlendiğini gösterir; Instagram hesabındaki kişi kimliğini vermez."),
              plain("Kısa link tıklaması hedef sayfanın tamamen yüklendiğini garanti etmez."),
              plain("Tıklama; satın alma, kayıt veya form gönderimi anlamına gelmez."),
              plain("Referrer bilgisi tarayıcı, uygulama ve yönlendirme koşullarına göre eksik kalabilir; kampanya ayrımında yalnız referrer'a güvenmeyin."),
            ],
          },
          {
            type: "paragraph",
            content: line(
              "TrulyGo ekranında mevcut veri kapsamını ",
              guideLink(
                "TrulyGo link istatistikleri rehberinde",
                "/rehberler/trulygo-link-istatistikleri",
              ),
              " ayrıntılı görebilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "instagram-yayin-kontrolu",
        title: "Paylaşmadan önce kısa kontrol listesi",
        blocks: [
          {
            type: "list",
            items: [
              plain("Bağlantıyı Instagram dışında bir tarayıcıda açarak hedefi doğrulayın."),
              plain("Source değerini tüm bağlantılarda küçük harfli instagram olarak koruyun."),
              plain("Organik ve ücretli dağıtımı medium veya içerik planınızda ayırın."),
              plain("Her profil bağlantısına neyi temsil ettiğini anlayacağınız bir content değeri verin."),
              plain("UTM değerlerine kullanıcı adı, telefon, e-posta veya başka kişisel veri yazmayın."),
              plain("Tıklama hedefini kampanya sonucu gibi raporlamayın; dönüşümü hedef sistemde ayrıca ölçün."),
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Önce tek bir örneği uçtan uca deneyin",
            content: plain(
              "Bütün profil ve kampanya bağlantılarını yayınlamadan önce bir test URL'sini açın, doğru sayfaya gittiğini ve hedef analytics sisteminde beklediğiniz etiketlerle göründüğünü kontrol edin.",
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "whatsapp-link-takibi",
    title: "WhatsApp'tan Gelen Tıklamalar Nasıl Ölçülür?",
    seoTitle: "WhatsApp Link Tıklamaları Nasıl Takip Edilir?",
    description:
      "Mevcut WhatsApp hedef bağlantınızı TrulyGo kısa ve kanal linkleriyle paylaşın; tıklama, mesaj ve dönüşüm arasındaki farkı doğru yorumlayın.",
    category: "utm-link-takibi",
    primaryIntent: "WhatsApp hedefli bağlantıların dağıtım tıklamalarını ölçmek",
    secondaryIntents: [
      "WhatsApp hedefi ile bağlantının paylaşıldığı kanalı ayırt etmek",
      "Mevcut WhatsApp URL'sini kısa ve kanal linki akışına almak",
      "Tıklama, gönderilen mesaj ve dönüşüm arasındaki farkı anlamak",
    ],
    primaryQuery: "whatsapp link takip",
    secondaryQueries: [
      "whatsapp link tıklama",
      "whatsapp tıklama ölçme",
      "whatsapp bağlantı takibi",
      "whatsapp kampanya linki",
    ],
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    status: "published",
    publisher: TRULYGO_GUIDE_PUBLISHER,
    hero: {
      eyebrow: "WhatsApp ve Link Takibi",
    },
    relatedArticles: [
      "instagram-link-takibi",
      "kanallara-gore-utm-link-olusturma",
      "kisa-link-nedir",
      "trulygo-link-istatistikleri",
    ],
    cta: {
      href: "/whatsapp-link-olusturucu",
      label: "WhatsApp hedefini kısalt",
      title: "Mevcut WhatsApp bağlantınızı paylaşılabilir hale getirin",
      description:
        "Hazır wa.me veya api.whatsapp.com hedefinizi TrulyGo kısa link ve kanal takibi akışında nasıl kullanacağınızı görün.",
    },
    sections: [
      {
        id: "whatsapp-link-takibi-kisa-cevap",
        title: "WhatsApp tıklamaları nasıl ölçülür?",
        blocks: [
          {
            type: "paragraph",
            content: line(
              "Elinizdeki WhatsApp hedef URL'sini TrulyGo kısa link talebinde değiştirilemez hedef olarak kullanın. Farklı paylaşım yüzeyleri için kanal linkleri oluşturduğunuzda hangi kısa bağlantının kaç yönlendirme tıklaması aldığını karşılaştırabilirsiniz.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Tıklama, mesaj gönderildiğini göstermez",
            content: plain(
              "Bir kullanıcı WhatsApp hedefini açtıktan sonra sohbeti kapatabilir, mesajı düzenleyebilir veya hiç göndermeyebilir. TrulyGo yönlendirme tıklamasını kaydedebilir; mesajın gönderildiğini, teslim edildiğini, okunduğunu veya satışa dönüştüğünü doğrulamaz.",
            ),
          },
        ],
      },
      {
        id: "whatsapp-hedef-ve-dagitim",
        title: "WhatsApp hedefi ile dağıtım kanalını karıştırmayın",
        blocks: [
          {
            type: "paragraph",
            content: plain(
              "WhatsApp hedefi, tıklanınca sohbet ekranını açan mevcut wa.me veya api.whatsapp.com adresidir. Dağıtım kanalı ise bu bağlantıyı nerede sunduğunuzdur: web sitesi butonu, Instagram profili, e-posta veya QR gibi.",
            ),
          },
          {
            type: "code",
            label: "Temsili WhatsApp hedefi",
            code: "https://wa.me/905551112233?text=Merhaba%2C%20yaz%20paketi%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.",
          },
          {
            type: "paragraph",
            content: plain(
              "TrulyGo telefon numarasından wa.me adresi üretmez; mevcut hedef URL'nizi kısaltma ve dağıtım kanallarını ayırma akışına alır. Numara biçimini ve hazır mesajın WhatsApp tarafından kabul edildiğini hedefi doğrudan açarak kontrol edin.",
            ),
          },
          {
            type: "callout",
            tone: "note",
            title: "Hazır mesaj URL içinde görünür",
            content: plain(
              "URL'ye yazılan metin tarayıcı geçmişinde, paylaşım kaydında veya teknik loglarda görünebilir. Sağlık, kimlik, ödeme veya müşteri sırrı gibi hassas bilgileri hazır mesaj parametresine koymayın.",
            ),
          },
        ],
      },
      {
        id: "whatsapp-trulygo-adimlari",
        title: "TrulyGo ile WhatsApp hedefini takip akışına alın",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Mevcut hedefi test edin",
                content: plain(
                  "wa.me veya api.whatsapp.com adresini ayrı bir tarayıcıda açın; doğru numara ve hazır mesajla sohbet ekranına ulaştığını doğrulayın.",
                ),
              },
              {
                title: "Kısa link talebi oluşturun",
                content: plain(
                  "Hedef URL'yi Panelim formuna girin, anlaşılır bir kısa ad seçin ve değiştirilemez hedef bilgisini kontrol ederek talebi gönderin.",
                ),
              },
              {
                title: "Onay sonucunu bekleyin",
                content: plain(
                  "TrulyGo kısa linkleri mevcut güvenlik ve onay akışından geçmeden aktif yönlendirme yapmaz. Onaylanan hedef sonradan sessizce başka bir adrese çevrilmez.",
                ),
              },
              {
                title: "Dağıtım noktalarını ayırın",
                content: plain(
                  "Onaylı ana link için web sitesi, Instagram, e-posta veya QR gibi gerçekten kullandığınız yüzeylere ayrı kanal linkleri oluşturun.",
                ),
              },
              {
                title: "Tıklamaları karşılaştırın",
                content: plain(
                  "Link detayında toplam ve kanal tıklamalarını inceleyin; mesaj veya satış sonucu hakkında tıklama verisinin söylemediği bir çıkarım yapmayın.",
                ),
              },
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Ana kısa link, UTM ve kanal linki arasındaki farkı ",
              guideLink("kısa link nedir?", "/rehberler/kisa-link-nedir"),
              " rehberinde; çok kanallı planı ise ",
              guideLink(
                "kanallara göre UTM linki oluşturma rehberinde",
                "/rehberler/kanallara-gore-utm-link-olusturma",
              ),
              " görebilirsiniz.",
            ),
          },
        ],
      },
      {
        id: "whatsapp-kanal-plani",
        title: "Aynı WhatsApp hedefini paylaşım yüzeylerine göre ayırın",
        blocks: [
          {
            type: "table",
            caption: "Tek WhatsApp hedefi için örnek dağıtım planı",
            headers: ["Paylaşım yüzeyi", "Kanal etiketi", "Ölçülen olay"],
            rows: [
              ["Web sitesi iletişim butonu", "Web sitesi", "Kısa link yönlendirme tıklaması"],
              ["Instagram profil bağlantısı", "Instagram", "Kısa link yönlendirme tıklaması"],
              ["E-posta kampanyası", "E-posta", "Kısa link yönlendirme tıklaması"],
              ["Basılı QR", "QR", "QR hedef kısa linkine ulaşan HTTP tıklaması"],
            ],
          },
          {
            type: "paragraph",
            content: plain(
              "QR satırındaki sayı fiziksel kamera taramalarının eksiksiz sayısı değildir. QR görselinin açtığı kısa adrese bir HTTP isteği ulaştığında yönlendirme tıklaması kaydedilebilir; kameranın kodu görmesi fakat URL'yi açmaması ölçülmez.",
            ),
          },
          {
            type: "callout",
            tone: "tip",
            title: "Kanal adını yüzeye göre verin",
            content: plain(
              "Hedef zaten WhatsApp olduğu için her kanala WhatsApp demek dağıtım farkını gizler. Kanal etiketi bağlantının nereye gittiğini değil, nerede paylaşıldığını anlatmalıdır.",
            ),
          },
        ],
      },
      {
        id: "whatsapp-veri-sinirlari",
        title: "Tıklama verisi neyi söyler, neyi söylemez?",
        blocks: [
          {
            type: "table",
            caption: "WhatsApp hedefli kısa link ölçüm sınırları",
            headers: ["Yorum", "Tıklama verisinden çıkarılabilir mi?", "Neden"],
            rows: [
              ["Kısa linke yönlendirme isteği geldi", "Evet", "TrulyGo kısa link olayıdır"],
              ["Belirli kanal linki daha çok tıklandı", "Evet", "Kanal tıklamaları karşılaştırılabilir"],
              ["WhatsApp sohbet ekranı başarıyla açıldı", "Kesin değil", "Yönlendirme sonrası uygulama davranışı ayrı aşamadır"],
              ["Kullanıcı mesaj gönderdi", "Hayır", "TrulyGo sohbet içeriğini veya gönderim olayını görmez"],
              ["Mesaj satışa dönüştü", "Hayır", "İş sonucu ayrı sistemde ölçülmelidir"],
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Cihaz, yaklaşık konum, kanal veya referrer gibi mevcut alanların teknik sınırlarını ",
              guideLink(
                "TrulyGo link istatistikleri rehberinde",
                "/rehberler/trulygo-link-istatistikleri",
              ),
              " inceleyin. Yaklaşık veya eksik olabilecek alanları kişi kimliği gibi yorumlamayın.",
            ),
          },
          {
            type: "callout",
            tone: "warning",
            title: "Tıklama sayısını müşteri sayısı diye sunmayın",
            content: plain(
              "Aynı kişi bir bağlantıyı birden fazla kez açabilir; bazı istekler de teknik nedenlerle kayda girmeyebilir. Tıklama, benzersiz kişi veya tamamlanmış görüşme değildir.",
            ),
          },
        ],
      },
      {
        id: "whatsapp-yayin-kontrolu",
        title: "Yayınlamadan önce kontrol edin",
        blocks: [
          {
            type: "list",
            items: [
              plain("Mevcut WhatsApp hedefini telefon ve masaüstünde test edin."),
              plain("Hazır mesajda hassas veya kişisel veri bulunmadığını doğrulayın."),
              plain("Ana kısa linkin onaylı ve aktif olduğunu kontrol edin."),
              plain("Dağıtım yüzeyleri için birbirinden anlaşılır kanal adları kullanın."),
              plain("QR kullanıyorsanız baskıdan önce gerçek cihazlarla açılış testi yapın."),
              plain("Raporlamada tıklama, mesaj ve dönüşümü üç ayrı olay olarak adlandırın."),
            ],
          },
          {
            type: "paragraph",
            content: line(
              "Instagram'dan WhatsApp hedefi paylaşacaksanız yerleşim ve ölçüm planını ",
              guideLink("Instagram link takibi rehberiyle", "/rehberler/instagram-link-takibi"),
              " birlikte değerlendirin.",
            ),
          },
        ],
      },
    ],
  },
] satisfies GuideArticle[];
