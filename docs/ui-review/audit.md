# Aşama 2 — teknik arayüz denetimi

**Tarih:** 2026-11-03

**Hedef:** yerel web uygulaması, `static/`

**Araçlar:** Impeccable detector 0.1.18 (URL taraması), tarayıcı DOM/ölçüm incelemesi, kaynak kod taraması.
**Sınır:** sunucuya, API'ye ve saf hesap modüllerine dokunulmadı. 375 px desktop-emulated ölçümdür; fiziksel telefon/touch gesture testi değildir.

## Sağlık puanı

| # | Boyut | Puan / 4 | Ana bulgu |
|---|---|---:|---|
| 1 | Erişilebilirlik | 2 | Koyu arama yer tutucusu 3,9:1; küçük işlevsel metinler; 39 px sekmeler ve azaltılmış harekette anlamlı geçişlerin tümü korunmuyor. |
| 2 | Performans | 3 | Vanilla uygulama ve yerel fontlar hafif; ilk açılışta görünüm modülleri ile veri modülleri statik olarak yükleniyor. Bu taramada ölçülmüş bir performans regresyonu yok. |
| 3 | Tema | 3 | Açık/koyu token sistemi ve sistem tercihi var; koyu temadaki yer tutucu kontrastı kusurlu, bazı durum renkleri/özel yüzeyler ayrıca kontrol edilmeli. |
| 4 | Duyarlı tasarım | 2 | 390 px’te gövde taşması görülmedi; 375 px üst çubuk denetimleri sıkışıyor, bazı hedefler 40 px’in altında ve sunum kabuğu hover’a bağlı. |
| 5 | Uygulama bütünlüğü | 3 | Sözlük/öğrenme dili ürüne özgü ve tokenlarla tutarlı; gezinme düz, bazı öğrenme yüzeyleri yoğun, iki detector istisnasının gerekçesi eskimiş. |
| **Toplam** |  | **13/20 — Kabul edilebilir** | Erişilebilirlik ve küçük ekran sorunları önce çözülmeli. |

## Uygulama bütünlüğü: geçer

Arayüz, ayrı bir ürüne kolayca uyarlanabilecek genel panel değil: sözlük maddesi, kavram haritası, ilişki çizgileri, yerel veri ve Araç/Öğrenci kipleri gerçek işleve bağlı. `app.css` değişkenleri hem açık hem koyu yüzeyleri tanımlıyor; görsel hiyerarşi ultramarin ve çizgi biçimleriyle sınırlı. Statik taramada sistemik bir renk/gradient veya kart yığını sapması görülmedi. Bu olumlu kararları koruyarak navigasyon ve hiyerarşi sorunlarını düzeltmek uygun.

## Yönetici özeti

- **Toplam bulgu:** 8 (P0: 0 · P1: 3 · P2: 4 · P3: 1).
- **P1 öncelikleri:** koyu temada AA altı yer tutucu kontrastı; mobil üst çubukta denetimlerin sıkışması; sunum modunda kabuk denetimlerinin hover olmadan gizlenmesi.
- **P2 öncelikleri:** küçük işlevsel etiketler; 40 px hedef standardının altında kalan denetimler; reduced-motion kuralının geri bildirimi neredeyse yok etmesi; eş düzeyli gezinme ve yoğun N-gram kontrolleri.
- **Önerilen sıra:** kabuk/gezinti ve mobil yerleşim → erişilebilirlik/tema → görünüm yoğunluğu ve mobil tablolar → tipografi ve etkileşim ayrıntıları → yeniden tarama ve polish.

## Öncelikli bulgular

### [P1] Koyu temada arama yer tutucusu kontrastı yetersiz

- **Konum:** `static/css/app.css` tema tokenları ve arama alanı stili (`#sq::placeholder`); DOM `static/js/search.js`.
- **Kategori:** Erişilebilirlik / Tema.
- **Kanıt:** Impeccable URL taraması koyu yüzeyde `#757575` / `#101626` için **3,9:1** ölçtü; açık temada 4,56–4,61:1. Ölçülen koyu oran normal metin için WCAG 2.2 SC 1.4.3 AA 4.5:1 eşiğinin altında.
- **Etki:** Yer tutucu, arama alanının beklenen girdisini düşük görüş koşullarında okumayı zorlaştırır.
- **Düzeltme:** Yer tutucu rengini tema tokenına bağla; koyu temada hesapla ve en az 4.5:1 ölçerek doğrula. Yer tutucu etiket yerine geçmesin.
- **Komut:** `$impeccable colorize`, ardından `$impeccable audit`.

### [P1] Mobil üst çubuk denetimleri aynı satırda sıkışıyor

- **Konum:** `static/index.html` topbar; `static/css/app.css` 441–490.
- **Kategori:** Duyarlı tasarım / Erişilebilirlik.
- **Kanıt:** 375 px baseline Araç/Öğrenci ekranlarında segment kesilmesi gözlemlendi. CSS'te sözlük dili, kip ve tema hâlâ üst çubukta; küçük ekranda arama düğmesi yalnızca simgeye dönüşüyor.
- **Etki:** Dil/kip değişimi önemli durum geçişleridir; dar ekranda kontrolün kesilmesi işlev erişimini engelleyebilir.
- **Düzeltme:** Üst çubuğu iki anlamlı satıra yeniden kur; bütün kip ve dil seçeneklerini görünür/tıklanabilir tut. 320/375/768 px ve uzun Türkçe etiketlerle kontrol et.
- **Komut:** `$impeccable adapt`.

### [P1] Sunum kipindeki kabuk fare hover'ına bağımlı

- **Konum:** `static/css/app.css` 432–434; sunum düğmesi `static/js/ui.js`.
- **Kategori:** Duyarlı tasarım / Erişilebilirlik.
- **Kanıt:** `body.present .rail, .topbar` için `opacity:0` ve `pointer-events:none`; yalnızca `:hover` ile geri geliyor.
- **Etki:** Dokunma, klavye ve projeksiyonda sunum denetimleri bulunamaz; çıkış yolu güvenilir biçimde görünmez.
- **Düzeltme:** Sunum kipinde denetimleri görünür tutan sakin bir durum veya her zaman görünür, klavyeyle erişilebilir çıkış düğmesi ekle; hover davranışını tek erişim yolu olmaktan çıkar.
- **Komut:** `$impeccable layout`.

### [P2] İşlevsel etiketler 11 px altına düşüyor

- **Konum:** `static/css/app.css` `.rail-sec h2`, `.kbd`; `static/index.html` palet kısayolu.
- **Kategori:** Erişilebilirlik / Tipografi.
- **Kanıt:** Detector açık temada masaüstünde ve koyu temada mobilde “İz” ile `⌘K` etiketlerini **10,8 px** ölçtü. Bu, skill'in işlevsel UI metni için 11 px kalite tabanının altında; WCAG tek başına mutlak px tabanı tanımlamaz.
- **Etki:** Küçük ve ikincil görünen ama yönlendirme/kısayol bilgisini taşıyan metinler projeksiyonda ve dar ekranda okunması güç öğelerdir.
- **Düzeltme:** Metinleri en az 11 px'e çıkar; önemli metin anlamını rengi/ikonla tek başına taşıma.
- **Komut:** `$impeccable typeset`.

### [P2] Etkileşim alanları 40 px dokunma hedefine ulaşmıyor

- **Konum:** `.iconbtn` (36 px), `.btn.sm` (30 px), `.tab` (39,4 px); `static/css/app.css`.
- **Kategori:** Duyarlı tasarım / Erişilebilirlik.
- **Kanıt:** Kaynak ölçüleri küçük kontrol sınıflarını 40 px altına koyuyor. İncelenen 390×844 örneğinde hedefler 24×24 px altında değildi; bazıları 26–38 px yüksekliğindeydi. Bu nedenle WCAG 2.2 SC 2.5.8’in varsayılan 24 px eşiğini doğrudan ihlal ettiği iddia edilmiyor; proje hedefi olan 40 px'i karşılamıyor.
- **Etki:** Parmakla doğru hedefi seçmek zorlaşır; yoğun tablo ve araç çubuklarında yanlış dokunma riski artar.
- **Düzeltme:** Dokunma bağlamında görünür simgeyi büyüt veya çevresinde yeterli hit-area oluştur; etkileşimli hedefleri 40 px'e yaklaştır, küçüğü korunan istisnaları belgeleyip aralıkla denetle.
- **Komut:** `$impeccable adapt`.

### [P2] Reduced-motion kuralı faydalı geçişleri da yok ediyor

- **Konum:** `static/css/app.css` 469; `@media (prefers-reduced-motion:reduce)`.
- **Kategori:** Erişilebilirlik.
- **Kanıt:** Tüm animasyon ve geçişleri `.01ms!important` değerine indiriyor; alternatif hiyerarşi/odak geri bildirimi tanımlı değil.
- **Etki:** Hareket azaltma tercihi korunurken etkin sekme, açılır panel ve yüklenme durumu gibi anlamlı değişikliklerin geçiş bilgisi de kaybolabilir. Bu tek başına WCAG ihlali olduğu iddiası değil; tercihe saygı ve kullanılabilirlik eksikliği.
- **Düzeltme:** Süs hareketlerini kaldır; durum değişimini renk/çizgi/odak gibi durağan işaretlerle koru. Reduced-motion ve normal modu ayrı test et.
- **Komut:** `$impeccable animate`.

### [P2] Eş düzeyli gezinme ve yoğun laboratuvarlar ilk adımı zorlaştırıyor

- **Konum:** `static/js/core.js:95–99`, `static/js/ui.js:70–71`, `static/js/ngram.js:326–362`.
- **Kategori:** Uygulama bütünlüğü / Layout.
- **Kanıt:** 13 görünüm tek dizi; N-gram kontrol ve çıktı bölümlerini tek uzun akışta gösteriyor.
- **Etki:** Ders sırasını bilmeyen kullanıcı doğru aracı bulmak ve ilk eylemi seçmek için gereksiz seçenekleri tarar.
- **Düzeltme:** Görünüm gezinmesini ders akışına göre gruplandır; N-gram ve uzun laboratuvarlarda gelişmiş parametreleri anlamlı `details` gruplarında göster, özelliği kaldırma.
- **Komut:** `$impeccable distill`, `$impeccable clarify`.

### [P3] Detector istisnalarının açıklamaları kullanıcı kararı değil

- **Konum:** `.impeccable/config.json`.
- **Kategori:** Uygulama bütünlüğü.
- **Kanıt:** `.kbd` alt çizgisi ve yüzen katman gölgesi istisnaları “Claude kararı, kullanıcı onayı yok” gerekçesiyle saklanmış.
- **Etki:** Tasarım kararının nedeni yerine kararın kaynağı yazıyor; sonraki bakımcıya niyet aktarılmıyor.
- **Düzeltme:** Görsel dil gerekçesiyle yeniden belgele. Klavye kapağındaki 2 px alt çizgiyi ve menü/kâğıt yüzeyinin border + yumuşak ofsetli gölgesini koru; bunlar bu yüzeyde anlamlı ama tekrar değerlendirmeye açık.
- **Komut:** `$impeccable polish`.

## Sistemik desenler

1. **İçerik yoğunluğu** birden fazla NLP laboratuvarında görülüyor; tek tek alanları küçültmek yerine sekme içi gezinme ve aşamalı açıklama gerekir.
2. **Küçük hedef ve mikro metin** tek bir renge indirgenemez; ölçek, hit-area ve projeksiyon koşulu birlikte ele alınmalı.
3. **Modlar** (Araç/Öğrenci, sunum) görünürlük ve kontrol erişimini değiştiriyor; her mod için aynı işlev, durum ve odak denetimi gereklidir.
4. **Renk tokenları** genel olarak tutarlı; kalan koyu yüzey sorunları özel durum tokenlarını da iki temada ölçmeyi gerektiriyor.

## Olumlu bulgular

- Uygulama vanilla ES modülü ve yerel fontlarla çalışıyor; çerçeve/CDN bağımlılığı görünmüyor.
- `:focus-visible`, `aria-pressed`, `aria-live`, semantik `button`/`label`, landmark ve SVG'de `aria-hidden` desenleri mevcut.
- Açık/koyu tema tokenları var; `.stu` içeriği Araç kipinde CSS ile gizleniyor ve Öğrenci kipinde açılıyor.
- 390×844 Benzerlik sayfası taramasında yatay belge taşması görülmedi; bu tek bir görünüm için kanıttır, tüm sekmeler için genellenemez.
- Tablo/diyagramlar kendi kaydırma alanlarıyla sunulabiliyor; SVG indirme yolu biçim modülünde ayrık tutulmuş.

## Ölçüm sınırları

- Impeccable detector açık/varsayılan masaüstünde 4 bulgu, koyu mobil 375×812'de 3 küçük-metin bulgusu verdi; açık masaüstü ve koyu mobil taramalarında bu denemelerde düşük-kontrast bulgusu çıkmadı. Koyu yer tutucu için 3,9:1 kanıtı önceki koyu tema taramasından geliyor.
- Viewport emülasyonu düzen ölçer; fiziksel touch, ekran okuyucu, 200% zoom ve tüm 13 görünüm × iki kip × tema × boyut matrisi bu audit taramasında baştan sona yeniden yürütülmedi. Aşama 0 baseline görüntüleri bu matrisi kapsıyor.
- İlk yük byte/süre, uzun tablo render süresi ve cihaz CPU'su ölçülmedi; bu yüzden performans puanı 4 değil ve optimize adımı yalnızca ölçülebilir güvenli kazançlarla yapılmalı.
- Üç detector istisnası arasından `.kbd` ve yüzen yüzeyler için niyet gerekçesi doğrulandı; `.impeccable/config.json` içindeki başka ignore kayıtları da Aşama 6'da yeniden değerlendirilecek.

## Birleşik yapılacaklar listesi

1. **P1 · Kabukta mobil reflow + mod erişimi:** 320–768 px üst çubuk; kip/dil/tema denetimleri; sunum kipinden dokunma/klavye ile çıkış.
2. **P1 · Kontrast ve hareket:** koyu yer tutucu ≥4,5:1; reduced-motion'da durağan durum göstergeleri.
3. **P2 · Gezinti mimarisi:** Sözcük anlamı / Lecture 2 / Lecture 3 / Lecture 5 / Ders başlıkları; kenar geçmişi ve çalışma listesi yalnızca anlamlı WordNet görünümlerinde.
4. **P2 · Görünüm hiyerarşisi:** N-gram parametreleri için açıklamalı aşamalı gösterim; Morfoloji/Ders için bölüm içi gezinme; Belirsizlik/Ayrıştırma/Bağımlılık/Korpus için sonuç yoğunluğu ve tablo kaydırma işaretleri.
5. **P2 · Dokunma ve tipografi:** 40 px hedefe yaklaşma, 11 px işlevsel metin tabanı, uzun Türkçe sözcük ve 200% zoom testi.
6. **P3 · Token/anti-pattern belgeleme:** eski detector istisna gerekçelerini yenile; tekrar eden ortak yüzeyleri CSS bileşeni/token olarak adlandır.
7. **Son doğrulama:** iki temada, iki kipte, 375/768/1280/1920 px'te sayfa taşması ve `.stu` görünürlüğü; detector tekrar; SVG/PNG indirme; yedi test.
