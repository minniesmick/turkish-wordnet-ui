# Luna Advice — 21st.dev arayüz ve hareket yönü

**İnceleme tarihi:** 4 Kasım 2026  
**Ürün:** Turkish WordNet UI  
**Karar türü:** Araştırma ve öneri; bu belge bir uygulama planı/tercih kaydıdır, kod değişikliği değildir.

## Bu belgenin amacı

Bu dosya, 21st.dev araştırmasını ve projeye dönük arayüz önerilerini kalıcı karar günlüğü olarak tutar. Yeni araştırma veya V2 işi başladığında önce buradaki yön ve kısıtlar okunmalı; yeni kararlar en alttaki günlüğe tarih atılarak eklenmeli. 21st.dev örnekleri ilham ve desen kaynağıdır; lisans ve uyumluluk incelenmeden kodu kopyalanmamalıdır.

## Kısa karar

**V1’i hemen React’e taşımak gerekmiyor.** Görsel kaliteyi en az riskle artıracak ilk adım, mevcut Vanilla JS/SVG arayüzünde anlamlı hareketi ölçülü biçimde uygulamak. Hareket tasarımı gerçekten daha ileri bir orkestrasyon, bileşen sınırları ve durum koordinasyonu gerektirdiğinde V1’i koruyup ayrı bir V2 prototipi açmak mantıklı.

V2 için önerilen deneme yığını **React + TypeScript + Vite + Motion for React**; tasarım ilkesi ise V1’in “İki Renkli Sözlük” kimliğinin devamı. Yalnızca katalogda popüler diye Tailwind, shadcn/ui, D3 veya WebGL eklemeyelim. Her teknoloji, çözmesi gereken somut bir kullanım problemiyle gerekçelendirilmeli.

## Ürünün sabit tasarım yönü

Uygulama bir pazarlama sitesi değil; öğrenci ve hocanın sınıfta da kullandığı yerel NLP çalışma alanı. V1’de tanımlanmış olan bu yön korunmalı:

- Soğuk ince kâğıt, mavi-siyah mürekkep, tek ultramarin eylem/odak rengi.
- Kavram kategorileri renklerle değil çizgi biçimleriyle ayrılır.
- Schibsted Grotesk arayüz ve sözcük nesneleri; Spectral okuma; JetBrains Mono kod/ölçüm.
- Sınıfta projeksiyonda okunabilirlik; mobilde dokunma ve düşük güç tüketimi.
- Hareket; kavramsal ilişkiyi, kullanıcı eylemini veya durum değişimini açıklamalı. Dekoratif sürekli animasyon olmamalı.

## 21st.dev araştırmasından çıkanlar

21st.dev, çok sayıda üreticinin bileşen, şablon, tema ve hareket örneğini sunan bir **katalog/registry**. Kategori sayfalarında görünen adetler anlık katalog verisidir; sayfa alt başlıkları ile sonuç adetleri arasında tutarsızlıklar bulunabiliyor. Bu nedenle adetler pazar payı veya kalite sıralaması değil, yalnızca yaklaşık katalog kapsamı.

4 Kasım 2026’da kontrol edilen ilgili raflar: [Animated](https://21st.dev/community/components/s/animated), [Motion](https://21st.dev/community/components/s/motion), [Background](https://21st.dev/community/components/s/background), [Visualization](https://21st.dev/community/components/s/visualization), [Graph](https://21st.dev/community/components/s/graph), [Search](https://21st.dev/community/components/s/search), [Table](https://21st.dev/community/components/s/table), [Tooltip](https://21st.dev/community/components/s/tooltip), [Accordion](https://21st.dev/community/components/s/accordion), [Tabs](https://21st.dev/community/components/s/tabs), [Notification](https://21st.dev/community/components/s/notification), [Heatmap](https://21st.dev/community/components/s/heatmap) ve [Sidebar](https://21st.dev/community/components/s/sidebar).

Öne çıkan eğilimler:

1. **Motion:** çizilerek beliren grafikler, seçili sekme/araç için kayan gösterge, sıralı liste geçişleri, metin vurgusu ve küçük durum geri bildirimleri.
2. **Data UI:** filtrelenebilir/yoğun tablolar, ağaç ve bilgi grafiği, grafik üzerinde yakınlaştırma/pan ve açıklama balonları.
3. **Görsel şov:** shader/WebGL arka plan, aurora/gradient, parallax, 3D ve sürekli hareketli yüzeyler. Bunlar kataloğun görünür ve popüler türlerinden; bizim ürünün çalışma sahnesiyle çoğunlukla çelişiyor.
4. **Erişilebilir desenler:** bazı örnekler yerel `details/summary`, azaltılmış hareket ve klavye desteğini özellikle hedefliyor. Bu nitelikler, animasyonun gösterişinden daha değerli seçim ölçütü.

### İncelenen örnekler ve projeye uyumu

| 21st.dev örneği | Katalogda açıklanan özellik / lisans / bağımlılık | Bizim için anlamı |
|---|---|---|
| [Motion Line Graph](https://21st.dev/@motiondotdev/components/motion-line-graph) | Girişte çizilen SVG çizgisi ve hover delta’sı; MIT; `motion` paketi | Çizgi çizimi fikri iyi. Zipf yerine önce kavram haritasının ilişki yollarında anlamlı biçimde uyarlanabilir; Motion gereksinimi V2 prototipinde değerlendirilir. |
| [Knowledge Graph](https://21st.dev/@heygaia/components/knowledge-graph) | Pan/zoom, sürükleme, tooltip, SVG/PNG dışa aktarma; MIT; `d3` | Özellik kontrol listesi olarak yararlı. Mevcut WordNet grafiği yönlü ve ilişki tipli; genel force-layout ile değiştirmek bilgi mimarisini zayıflatabilir. |
| [Note Graph](https://21st.dev/@astralyxdev/components/note-graph) | Bağ sayısına göre düğüm boyutu ve yetim düğüm gösterimi; MIT | Düğüm yoğunluğu/ilişki ağı için fikir. WordNet düğüm boyutları anlam sayısı gibi gerçek metriklere bağlanmadıkça uygulanmamalı. |
| [Subtle Animated Tabs](https://21st.dev/@ibelick/components/animated-tabs) | Kayan sekme vurgusu; MIT; `framer-motion` | Geçişi görünür kılma fikri alınabilir; mevcut segmented kontrollerin her birine gösterişli bahar hareketi eklemek gerekli değil. |
| [Animated Toolbar](https://21st.dev/@uiable/components/toggle-group-animated-toolbar) | Hover/seçimde kayan gösterge; **no-license**; `framer-motion`, `lucide-react` ve yardımcı paketler | Görsel referans dışında kullanılmamalı: lisansı uygun değil/belirsiz, varsayılan dili ve yığını projeye uymuyor. |
| [Accessible Accordion](https://21st.dev/@a11ypros/components/a11y-accordion/rich-content) | Yerel `details/summary`, klavye odağı ve reduced motion; MIT | Uzun ders/laboratuvar bölümlerinde erişilebilir davranış örneği. V1 zaten yerel HTML desenine yakın. |
| [Dense Table](https://21st.dev/@originui/components/table/dense-table) | Yoğun shadcn tablo; MIT | Belirsizlik ve korpus tabloları için hiyerarşi/yoğunluk referansı; mevcut HTML tabloları doğrudan değiştirme gerekçesi değil. |
| [Tooltip with keyboard shortcut](https://21st.dev/@originui/components/tooltip/tooltip-with-kbd) | Başlık/kısayol içeren tooltip; MIT; Radix tooltip bağımlılığı | Teknik terim/kısayol açıklaması fikri. Kısa ipuçları için CSS/HTML yeterliyse yeni bağımlılık alınmamalı. |
| [shadcn Command](https://21st.dev/@shadcn/components/command) | Klavye odaklı komut menüsü; MIT; `cmdk`, Radix Dialog, Lucide | Var olan komut paletinde aranabilirlik ve ok tuşu davranışı için referans. Mevcut palet zaten çalışıyorsa yeniden yazma gerektirmez. |
| [Sonner](https://21st.dev/@shadcn/components/sonner) | React toast bileşeni; MIT; `sonner` paketi | Toast yığını ve geri bildirim örneği. V1’in toast altyapısını değiştirmektense süre, sıra ve erişilebilir duyuruyu denetlemek yeterli. |
| [Shader Dithering](https://21st.dev/@framecn/components/shader-dithering) | Hareketli dither/WebGL arka planı; MIT; shader/render paketleri | Akademik araçta arka planı ve metin kontrastını rekabete sokar; kullanmama önerisi. |
| [Dot Grid](https://21st.dev/@halaska-studio/components/dot-grid) | Dekoratif noktalı yüzey; MIT | Harita zaten nokta ızgarasına sahip. Yeni bir grid katmanı eklemek yerine mevcut dokuyu korumak. |
| [Activity Heatmap](https://21st.dev/@dhxwhy/components/activity-heatmap) | Günlük/haftalık çalışma ısı haritası; MIT; React/Tailwind ekosistemi | Öğrenme geçmişi özelliği için ilginç, ancak veri saklama ve ürün davranışı kararı gerektirir; bugünkü animasyon cilasının parçası değil. |

21st.dev’nin kendisi katalogdaki parçaların çoğunu **React/TypeScript + Tailwind/shadcn** biçiminde, kopyalanabilir kaynak olarak sunuyor. Bazı örnekler `framer-motion`, `motion`, D3, Radix, Lucide veya başka paketlere bağlı; bazı öğelerde lisans `unknown` ya da `no-license`. Dolayısıyla tasarım ve etkileşim fikrini inceleyip kendi tokenlarımızla yeniden uygulamak, kodu körlemesine indirmekten güvenli ve daha tutarlı.

## Önerilen hareket dili: “Mürekkebin çizdiği anlam”

Uygulamanın özgün görsel anı sürekli parlayan arka plan değil; bir sözcüğün **kavram, ilişki ve çözümleme izlerinin çizilerek açılması** olmalı. Hareket, veri görselleştirmesinin okunmasına yardım etmeli ve ilk sonuçtan sonra sessiz kalmalı.

### Birincil animasyon anı — Harita

1. Merkez kavram önce sabit/okunur durumda görünür; ilişkili çizgiler kısa bir stroke-reveal ile merkezin dışına doğru çizilir.
2. Birinci derece ilişkiler hemen; daha uzak dallar hafif, kısa bir sırayla belirir. Uzun bir ağın tüm düğümlerini teker teker oynatıp kullanıcıyı bekletmeyiz.
3. Bir düğüme hover **veya klavye odağı** geldiğinde aynı ilişki yolunun çizgi kalınlığı/tonu ve etiket netleşir; ilişki ailesi yine çizgi deseninden anlaşılır.
4. Düğüm seçimi mevcut detay paneline bağlanır. Animasyon pan, zoom, çift tıklama, seçim, URL durumu ve SVG/PNG dışa aktarmasını değiştirmez.
5. Büyük ağaçlarda performans düşüyorsa hareket otomatik olarak sadeleşir; animasyon hiçbir zaman veriyi saklamaz veya görünür olmayı geciktirmez.

### Eşlik eden anlamlı hareketler

- **Ayrıştırma:** CKY hücresinin/ayrıştırma ağacının adımları, kullanıcının “sonraki adım” eylemiyle eşleşir; bütün ağacı otomatik ve sürekli canlandırmayız.
- **Morfoloji/FSM:** ek zinciri ve durum yolu, kullanıcı üret/çözümle yaptığında aynı sırada belirir; dizi tamamlanınca durur.
- **Belirsizlik:** seçilen aday satır/özellik ayrıntısı kısa bir açılma ile gösterilir; doğruluk yeşil/kırmızının yanında ✓/✗ ve metinle de anlaşılır.
- **Arama/komut paleti:** panel açılışı ve sonuç kümesi değişimi kısa opaklık/konum geçişi; odak ve seçili satır kaybolmaz.
- **Sonuç ve işlem bildirimi:** SVG/PNG indirme, kopyalama ve alıştırma sonucu için 120–180 ms’lik küçük, konumsal olmayan durum geçişi; konfeti/sonsuz toast yığını yok.
- **Sekmeler ve kontroller:** seçili göstergenin bir panel içinde kısa yer değiştirmesi yeterli. Tüm sayfa geçişlerinde dramatik geçiş kullanmayız.

### Hareket bütçesi ve erişilebilirlik

- Eylem yanıtı: yaklaşık **120–180 ms**; panel/yerleşim geçişi: **180–260 ms**; grafik stroke çizimi: çoğunlukla **300–600 ms** ve yalnızca ilk anlamlı açılışta.
- Aynı anda tek baskın hareket. Sürekli salınım, parallax, mouse-follow, metin scramble, spring bounce ve zorunlu döngü yok.
- `prefers-reduced-motion: reduce`: konumsal/ölçek animasyonu kapat; seçili durum, sıralama, renk dışı işaret, odak ve tamamlanmış SVG çizgisi anında gösterilsin.
- Animasyon JS ile yönetilse bile son HTML/CSS durumu JS başarısızken de doğru ve görünür olsun; `opacity:0` ile içerik saklayıp animasyon başlamazsa boş panel bırakma.
- Klavye, dokunma ve ekran okuyucu erişimi hover davranışına eşit olmalı. Odak taşıma ancak kullanıcı eylemiyle yapılmalı.
- Hareket performans ölçütü: orta sınıf mobilde akıcı, düşük güç/arka plan sekmesinde otomatik sadeleşen; büyük veri animasyonunu kapatmak işlevi etkilemeyen yapı.

## V1’de hemen denenebilecekler

Bunlar framework değişikliği gerektirmeyen, geri alınabilir iyileştirmelerdir:

1. **Harita stroke-reveal prototipi:** var olan SVG kenar çizgilerinde ilk çizimde kısa `stroke-dasharray`/`stroke-dashoffset`; seçim/zoom ve `prefers-reduced-motion` ile test. İlk V2 görsel deneyi bunun etrafında kurulmalı.
2. **FSM adım takibi:** alıştırma adımını kullanıcı isteğiyle çiz; state satırı/kenarı mevcut model verisine bağlansın, yeni hesaplama kuralı yazılmasın.
3. **CKY öğretim adımı:** yalnızca “sonraki adım” tıklanınca hedef hücreyi/kenarı kısa süre vurgula; öğrenci olmayan moda yeni öğretici metin sızdırma.
4. **İnce sonuç geçişi:** yalnızca yeni sonuç bölgesine düşük mesafeli reveal; içerik, odak ve ekran okuyucu duyurusu animasyonun parçası olarak kaybolmasın.
5. **Hareket ayarı için tek merkez:** süre ve easing tokenı; reduced-motion’da `none`/anında görünür. Farklı sekmelere ayrı, çelişkili animasyon dili ekleme.

V1 animasyon prototipinde yeni paket eklemeyelim. CSS/SVG, IntersectionObserver ve `requestAnimationFrame` gerektiği yerde yeterli; kullanıcı tercihi olmadan WebGL canvas başlatmayalım.

## V2 ne zaman ve nasıl?

### V2’ye geçişi gerekçelendiren sinyaller

- Aynı etkileşim ve animasyon mantığı farklı görünümlerde tekrarlanmaya başladı, düzeltme tutarlılığı zorlaştı.
- Harita/ayrıştırma adım animasyonu, durumları DOM’a elle senkronize etmeyi kırılgan hale getiriyor.
- V1 prototipinin görsel/performans testleri anlamlı kazanım gösteriyor ve erişilebilirlik korunuyor.
- V1’de aynı tasarım hedeflerine makul miktarda Vanilla JS ile erişilemiyor.

### V2 prototipi için öneri

- Mevcut ürünü Git’te **V1 olarak sabitle**; kullanıcıya çalışan V1’i kaybettirecek yerinde/tek seferlik rewrite yapma.
- Ayrı `ui/v2-prototype` dalı veya ayrı V2 frontend dizini aç. İlk iş, “Harita + bir görünüm geçişi + bir öğretim adımı” dikey dilimini teslim etmek; 13 ekranı bir kerede taşımamak.
- React + TypeScript + Vite, yalnızca bu prototip için; Motion for React’i yalnızca test edilen sahnede kullan. **Motion ve Framer Motion adlandırması/kurulum yolu zaman içinde değişebilir; manifest ve güncel resmi dokümantasyon implementation gününde doğrulanmalı.**
- `server.py`’nin `127.0.0.1`/`::1` yerel bağlama kuralı değiştirilemez. Mevcut API sözleşmelerini kullan; V2’nin veri/hesaplama kopyasını yazma. Hangi statik çıktı yolunun mevcut sunucuyla uyacağı ayrı keşif/görev olarak doğrulanmalı.
- V1’in hesap/öğretim kodunu V2’ye nasıl paylaşacağımızı önce modül formatı ve testlerle doğrula; çalıştığı kanıtlanmadan yeniden düzenleme yapma. V2, doğru sonucu hesaplayarak değil sunarak fark yaratmalı.
- Tailwind/shadcn’i varsayılan olarak ekleme: marka tokenlarını ve bundle/derleme/yerel çalışma koşullarını iyileştirdiği somut deneyle kanıtlanırsa al.
- Prototip performans, reduced-motion, klavye, mobil ve Araç/Öğrenci kiplerinde V1’i geçerse taşıma planı hazırla; aksi halde animasyon fikrini V1’e geri port et ve V2’yi bırak.

### V2 kabul kapısı

- V1 aynı commit/tag ile açılabilir, V2 ayrı yoldan başlatılır; kullanıcı karşılaştırma yapabilir.
- İlk içerik/sonuç animasyon beklemeden anlamlı ve görünürdür.
- 13 görünümün tümündeki `.stu` ayrımı V2’de birebir korunur; Araç kipinde öğretici sızıntı testi vardır.
- `?v=`, `?mode=student`, `?theme=`, `localStorage` anahtarları, mevcut URL paylaşımı ve yerel API davranışı için uyumluluk tablosu tamamlanır.
- 375/768/1280/1920 genişliklerinde taşma yok; harita SVG/PNG dışa aktarımları ve uzun tablolar korunur.
- `prefers-reduced-motion`, klavye odağı, touch hedefi ve iki tema otomasyonla kontrol edilir.
- Bundle/startup ve büyük grafik render ölçümü, performans hedefi ve V1 karşılaştırması olmadan V2 “daha hızlı” kabul edilmez.

## Şimdilik önermediklerim

- Tüm arayüzü tek hamlede React’e çevirmek; V1’i kaybettirecek geniş kapsamlı rewrite.
- WordNet grafiğini genel force-directed D3 grafiğiyle değiştirmek: kavram yönü, kategori çizgileri ve mevcut deterministik yerleşim kaybolabilir.
- Aurora, neon/gradient, glassmorphism, shader/dither arka planı, 3D marquee, magnetic pointer, cursor-follow tooltip veya sürekli parallax.
- Her sayfa açılışında tüm tabloları stagger ile oynatmak; araştırma ve sınıf kullanımını yavaşlatır.
- Lisansı `unknown`/`no-license` olan 21st kodunu projeye taşımak.
- Aynı iş için hem yeni React kütüphanesi hem mevcut JS davranışını birlikte tutup iki doğruluk kaynağı oluşturmak.
- Kullanım geçmişi/veri modeli kararı olmadan heatmap/streak/achievement sistemi eklemek.

## Araştırma kaynakları

**Katalog ana kaynakları**

- [21st.dev — Community components](https://21st.dev/community/components)
- [21st.dev — Animated](https://21st.dev/community/components/s/animated)
- [21st.dev — Motion](https://21st.dev/community/components/s/motion)
- [21st.dev — Visualization](https://21st.dev/community/components/s/visualization)
- [21st.dev — Graph](https://21st.dev/community/components/s/graph)
- [21st.dev — Heatmap](https://21st.dev/community/components/s/heatmap)
- [21st.dev — Search](https://21st.dev/community/components/s/search)
- [21st.dev — Table](https://21st.dev/community/components/s/table)
- [21st.dev — Tabs](https://21st.dev/community/components/s/tabs)
- [21st.dev — Accordion](https://21st.dev/community/components/s/accordion)
- [21st.dev — Tooltip](https://21st.dev/community/components/s/tooltip)
- [21st.dev — Background](https://21st.dev/community/components/s/background)

**Bileşen sayfaları**

- [Motion Line Graph](https://21st.dev/@motiondotdev/components/motion-line-graph)
- [Knowledge Graph](https://21st.dev/@heygaia/components/knowledge-graph)
- [Note Graph](https://21st.dev/@astralyxdev/components/note-graph)
- [Animated Tabs — Motion Primitives](https://21st.dev/@ibelick/components/animated-tabs)
- [Accessible Accordion](https://21st.dev/@a11ypros/components/a11y-accordion/rich-content)
- [Dense Table — Origin UI](https://21st.dev/@originui/components/table/dense-table)
- [Tooltip with keyboard shortcut — Origin UI](https://21st.dev/@originui/components/tooltip/tooltip-with-kbd)
- [Command — shadcn](https://21st.dev/@shadcn/components/command)
- [Sonner — shadcn](https://21st.dev/@shadcn/components/sonner)
- [Shader Dithering](https://21st.dev/@framecn/components/shader-dithering)
- [Dot Grid](https://21st.dev/@halaska-studio/components/dot-grid)
- [Activity Heatmap](https://21st.dev/@dhxwhy/components/activity-heatmap)
- [Animated Toolbar — UIable](https://21st.dev/@uiable/components/toggle-group-animated-toolbar)

21st.dev listeleri ve component metadata’sı canlı değişir; V2 implementasyonundan hemen önce güncel lisans, bağımlılık ve API tekrar kontrol edilmelidir.

## Karar günlüğü

### 2026-11-04 — İlk öneri

- Kısa vade: V1’de CSS/SVG temelli, anlam taşıyan animasyonlar dene; motion tasarımını “Mürekkebin çizdiği anlam” olarak sınırla.
- İlk prototip adayı: Harita kenar çizgilerinin kısa, reduced-motion uyumlu ilk açılış çizimi.
- Orta vade: kullanıcıya karşılaştırılabilir V1’i tutarak ayrı dalda React/Vite/TypeScript + Motion dikey dilimi değerlendir.
- Karşı çıkılanlar: sırf katalog trendi olduğu için görsel sistem değişikliği, arka plan shader ve her şeyi baştan yazma.

### 2026-11-04 — Harita hareketi prototipi

- Tavsiye belgesi `main` üzerinde `9bac003` (`docs: 21st.dev hareket önerilerini kaydet`) commit’iyle kaydedildi. Prototip ayrı `ui/map-motion-prototype` dalında tutuluyor.
- `graph.js` ve `app.css` içinde kenarlar SVG maskesiyle 240 ms’de çizilerek açılıyor; bu yöntem ilişkilerin kesik/noktalı çizgi desenlerini değiştirmiyor. Düğüm girişi 220 ms, gecikme en çok 50 ms; azaltılmış hareket tercihi içeriği animasyonsuz ve tam görünür bırakıyor.
- Yerel tarayıcı kontrolü: köpek kavramında 30 ilişki kenarı; normal harekette animasyon tamamlanıyor, `prefers-reduced-motion: reduce` durumunda kenar ve düğüm animasyonu kapalı. 1280 px masaüstü görünümü görsel olarak incelendi; 375 px görünümünde belge genişliği 365 px ölçüldü ve yatay taşma görülmedi (mobil ekran görüntüsü alınmadı). Tarayıcı konsolunda yeni hata görülmedi.
- Yedi hesap testi ve `graph.js` sözdizimi denetimi geçti. Büyük/yoğun haritalarda kare hızı veya performans profili ölçülmedi; bu prototip henüz üretim genelinde animasyon kalitesi/performans onayı sayılmaz.
- İnceleme adresi: `http://127.0.0.1:8771/?v=graph&ds=kenet&g=TUR10-0386920&gds=kenet` (prototip sunucusu yerelde çalışıyor).
