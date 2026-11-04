# Google AI Studio görevi: derin öğrenme laboratuvarlarını ekle (4 adım)

> Bu prompt, `turkish-wordnet-ui` deposunun **bir kopyası** üzerinde çalışan bir AI Studio oturumu içindir. Sohbete şunları yükle: bu dosya, ders PDF'leri `DL-1 … DL-7` (ve mümkünse `DL-3`, `DL-4`, `DL-5`, `DL-6`, `DL-7`'nin PNG sayfaları), ve kopyadaki proje dosyaları. Her adım ayrı bir mesajda yapılır; ben "devam" demeden sonrakine geçme.

## 0. Rol ve hedef

Sen bu projenin deneyimli bir JavaScript geliştiricisisin. Projeye, MEF Üniversitesi COMP 451 (Doğal Dil İşleme, Dr. Seniz Demir, Güz 2026) dersinin **derin öğrenme** bölümü için dört etkileşimli laboratuvar (yeni sekme) ekleyeceksin: **Embedding**, **Attention**, **RNN**, **Sinir ağı eğitimi**. Her laboratuvar slaytlardaki kavramı **gerçek hesapla**, tarayıcıda, kütüphanesiz gösterir. Hedef: öğrenci bir kavramı hem sonuç olarak hem (Öğrenci kipinde) adım adım görsün ve kendini sınasın.

## 1. Proje (kısa)

Yerel, bağımlılıksız bir çalışma uygulaması: Python 3 standart kütüphane sunucusu (`server.py`, port 8770) + vanilla ES modülü JS (`static/js/*.js`) + tek CSS (`static/css/app.css`) + tek HTML kabuğu (`static/index.html`). **Derleme adımı, paket yöneticisi, framework yok.** Her konu bir sekme; sekmeler ders sırasıyla eklenmiş. Önce oku: `README.md`, `TODO.md`, `DESIGN.md`, `PRODUCT.md`, `static/js/core.js`, `static/js/ui.js`, `static/index.html`.

**Bu işin en iyi örneği, en son eklenen "Metin temsili" sekmesidir:** `static/js/tok.js` (saf hesap), `static/js/textrep.js` (arayüz), `scripts/test_tok.mjs` (test), ve onu kabuğa bağlayan değişiklikler (`git show 4d56994`). Yeni sekmeleri **aynı kalıpla** ekle. Diğer örnekler: `lm.js` ↔ `ngram.js`, `md.js` ↔ `disamb.js`, `fsm.js` ↔ `fsmquiz.js`.

## 2. Değişmez kurallar

1. **Sunucu yalnızca yerel kalır** (`127.0.0.1` ve `::1`). `server.py`'ye, bağlama adresine, CORS'a dokunma. Yeni sunucu uç noktası **ekleme**; bütün hesap tarayıcıda.
2. **Yeni bağımlılık yok:** npm, CDN, TensorFlow.js, ONNX, internetten veri ya da yazı tipi yok. Saf JS. Hesaplar **gerçek** olmalı: sabit yazılmış / önceden hesaplanmış sonuç gösterme.
3. **Araç / Öğrenci kipi (dokunulmaz):** Araç kipinde yalnızca sonuç görünür. Slayt göndermeleri, formüller, "neden" açıklamaları, adım adım izler, alıştırmalar ve sınavlar `.stu` sınıfıyla işaretlenir (`body:not(.student) .stu{display:none!important}`). Her ekranı iki kipte de kontrol et; Araç kipinde `.stu` sızıntısı hatadır.
4. **Hesap ve arayüz ayrı dosyalar:** saf hesap `static/js/<ad>.js` (DOM yok, `import` yalnızca başka saf modüllerden), arayüz ayrı modül. Her hesap modülü için `scripts/test_<ad>.mjs` yaz: el hesabıyla doğrulanmış değerler, sayısal gradyan denetimi, kenar durumlar, tohumlu (seeded) rastgelelik ile **deterministik** sonuç. Testler `node scripts/test_x.mjs` ile çalışır, hata varsa `process.exitCode = 1`. **Rastgelelik için `Math.random` kullanma; tohumlu üreteç (örn. mulberry32, `md.js`'te var) kullan** ki sonuçlar tekrarlanabilsin.
5. **Mevcut hiçbir şeyi bozma:** `test_turkish`, `test_fsm`, `test_lm`, `test_mle`, `test_parsers`, `test_md`, `test_zmap`, `test_lessons`, `test_tok` geçmeye devam etmeli. Mevcut `id`, `data-*`, sınıf adlarını yeniden adlandırmadan önce tüm kullanımları ara (örn. bağımlılık sekmesi `data-dv` kullanır, `data-view` değil).
6. **Tasarım dili:** `DESIGN.md` ve `app.css` başındaki tokenlar. Tek leke rengi `--spot` yalnızca tıklanabilir / odaktaki öğede; kategoriler çizgi biçimiyle ayrılır; 1px kenarlık, sert gölge yok; yazı tipleri `static/fonts/` içinde (internetten yükleme yok). Mevcut sınıfları yeniden kullan (`.ng-h`, `.ng-tbl`, `.ng-ctl`, `.seg`, `.chip`, `.btn`, `.lesson`, `.fig-box`, `.ng-scroll`). Yeni sınıf gerekirse önekli ve `app.css`'in sonuna, yorum başlığıyla ekle. Açık / koyu tema, 375 px mobil (sayfada yatay kaydırma yok, tablolar `.ng-scroll` içinde), klavye ve görünür odak, dokunma hedefi ≥ 40 px mobilde, `prefers-reduced-motion`'a saygı. **Renk tek başına bilgi taşımasın** (ısı haritası hücrelerinde sayı da yaz).
7. **Dürüstlük:** yöntemin sınırlarını (küçük veri, rastgele ya da elle ağırlık, eğitilmemiş model) arayüzde ve `TODO.md` "Bilinen kısıtlar" bölümünde söyle. Ölçmediğin sayıyı "doğrulandı" diye yazma. Slaytta olmayan yöntemi ekleme; eklersen nedenini ve slayt numarasını yaz.
8. **Türkçe** arayüz metni (doğru Türkçe büyük / küçük harf: `toLocaleLowerCase("tr")`, İ/ı), Türkçe düz yazı belgeler, kısa Türkçe kod yorumları.
9. **Büyük hesaplar ana iş parçacığını kilitlemesin:** eğitim döngülerini kareler / parçalar hâlinde çalıştır (`requestAnimationFrame` ya da küçük `setTimeout` dilimleri), sınır koy ve arayüzde göster, "durdur" düğmesi ver.
10. **Çıktı biçimi:** her dosyayı **tam içerikle** ver; `...` ile kısaltma, "geri kalanı aynı" yazma. Var olan dosyayı değiştirirken yalnızca değişen bölümleri ver ama hangi dosyanın hangi yeri olduğunu açıkça yaz (önce / sonra). Çalıştırma imkânın yoksa testleri **çalıştırdım** deme; "çalıştırılmadı, şu komutla çalıştır" yaz ve beklenen çıktıyı belirt.

## 3. Yeni sekme ekleme kontrol listesi (her adımda)

- `static/js/core.js`: `VIEWS` (sıra: derin öğrenme sekmeleri `textrep` / "Metin temsili"nden sonra), `VIEW_LABEL`, `VIEW_ICON` (yoksa `P` nesnesine sade bir SVG yolu: `viewBox 0 0 24 24`, çizgi stili mevcutlarla aynı), `VIEW_KEY` (kısayol harfi, **çakışmasın**; kullanılanlar: s h b w r f m z c k o n d x).
- `static/index.html`: `<section id="v-…" class="hidden"></section>`.
- `static/js/main.js`: `import "./….js";`.
- `static/js/ui.js`: `KEYS` metnindeki sekme / kısayol listesi; kabuktaki ders gruplaması **"Lecture 6 · Derin öğrenme"** başlığı altında (komut paleti, `?` penceresi, kenar çubuğu aynı sırada).
- Görünüm modülü: `registerView("…", view)`, `view.apply(p)` (Ders düğmeleri `{v:"…"}` ile açabilsin), `enter()`, durum `localStorage` anahtarı `wn:<ad>` (try/catch ile).
- `static/js/lessons.js`: Lecture 6'daki ilgili bölümlerin `chips` listesine yeni sekmeyi açan düğmeler (yalnızca `chips`; içeriği ve soruları değiştirme).
- `README.md`, `README.tr.md`: sekmenin kısa tarifi (mevcut satır biçimiyle) ve test sayısı. `TODO.md`: "Bilinen kısıtlar"a sınırlar. `DESIGN.md`'ye yeni bileşen varsa kısa not.

## 4. Ortak arayüz kalıbı (dört laboratuvar için)

- Sayfa başlığı + 1-2 cümlelik giriş (Öğrenci'de slayt göndermesi `.stu`).
- Numaralı bölümler (`.ng-h`): önce **denetimler** (girdi, hiperparametre), sonra **sonuç** (tablo / SVG), sonra (`.stu`) **adım adım açıklama** ve **"Kendin yap"** alıştırması (mevcut kalıplar: `parse.js` `PS.fill`, `ngram.js` `NQ`, `fsmquiz.js`).
- SVG çizimler `.fig-box` içinde ve `exportfig.js` ile SVG / PNG indirilebilir olsun (`exportfig.js`'in nasıl çalıştığına bak; yeni SVG sınıfı için oraya **yalnızca** seçici ekle).
- Sayısal çıktıyı Markdown olarak kopyalama (`data-copy` kalıbı).
- Yükleme / boş / hata durumları; çok büyük girdiye sınır.

---

## ADIM 1: Embedding laboratuvarı (DL-3, DL-4 Part 3)

**Dosyalar:** `static/js/emb.js` (hesap), `static/js/embedding.js` (arayüz), `scripts/test_emb.mjs`. Sekme: `emb`, etiket **"Embedding"**, kısayol `g e`.

**Kaynak:** `DL-3.pdf` ve `DL-4.pdf` Part 3. Önce slaytları oku; **slaytlarda hangi yöntemler anlatılıyorsa onları uygula** (örn. one-hot, co-occurrence, Word2Vec skip-gram / CBOW, negatif örnekleme, GloVe, fastText ...). Slaytta olmayanı ekleme.

**Hesap (`emb.js`):**
- Korpus: `corpusdata.js`'in döndürdüğü BOUN cümleleri (`loadCorpus("boun")`; hesap modülü yalnızca token dizileri alır, ağ çağrısı yapmaz) ya da kullanıcı metni. Küçük harf (`tr`), noktalamasız.
- Slayttaki yöntem (örn. skip-gram + negatif örnekleme) saf JS ile: `Float32Array`/dizi tabanlı, gömme boyutu (örn. 16-64), pencere, negatif örnek sayısı, öğrenme oranı, devir, **tohum**. Eğitim kademeli (olay döngüsünü kilitleme), kayıp eğrisi kaydı.
- `cosine`, `nearest(word, k)`, `analogy(a, b, c)` (a − b + c), 2 boyuta indirgeme (PCA: kovaryans + güç yöntemi, deterministik).
- Karşılaştırma için mevcut `lm.js`'teki PPMI + kosinüs (`pmiBuild`, `similar`) **içe aktarılabilir ama değiştirilmez**.

**Test:** sayısal gradyan denetimi (analitik gradyan ile sonlu fark, göreli hata < 1e-4), aynı tohumla aynı vektör, kosinüsün özellikleri (simetri, kendisiyle 1, [-1,1]), eğitimden sonra küçük el yapımı korpusta (örn. `kedi/köpek` aynı bağlamlarda, `araba` farklı) benzer sözcüklerin daha yakın olması, PCA'nın deterministik ve yönden bağımsız yorumlanması, boş / tek sözcük / aşırı büyük sözlük sınırı.

**Arayüz:** (1) Korpus + hiperparametre denetimi, "Eğit / Durdur", kayıp eğrisi (SVG) ve ilerleme. (2) **En yakın komşular:** sözcük yaz → kosinüs tablosu; yanında aynı sözcük için PPMI komşuları (aynı korpus) iki sütun hâlinde. (3) **Analoji:** a − b + c. (4) **2B harita:** PCA saçılım SVG'si, sözcüğe tıkla / seç, etiket çakışması yönetimi (en sık N sözcük). (5) `.stu`: yöntemin açıklaması ve formülü (kayıp, gradyan güncellemesi), "Kendin hesapla": tek bir (merkez, bağlam, negatif) örneği için skoru ve kaybı elle hesapla, kontrol et. **Sınırlar** (BOUN küçük, vektörler gürültülü, analoji genelde başarısız) arayüzde yazılı olsun.

**Kabul:** `test_emb.mjs` + mevcut testler geçiyor; BOUN ile eğitim makul sürede bitiyor (sınırı göster); iki kip / iki tema / 375 px; konsolda hata yok; kontrol listesi (bölüm 3) tamam.

---

## ADIM 2: Attention laboratuvarı (DL-6, DL-7)

**Dosyalar:** `static/js/attn.js`, `static/js/attention.js`, `scripts/test_attn.mjs`. Sekme: `attn`, etiket **"Attention"**, kısayol `g a`.

**Kaynak:** `DL-6.pdf` (Transformers, Self-Attention), `DL-7.pdf` (encoder, decoder, encoder-decoder). Slayttaki notasyonu (Q, K, V, d_k, W^Q …) aynen kullan.

**Hesap (`attn.js`):**
- `softmax` (sayısal kararlı), `scaledDotProductAttention(Q, K, V, {mask})` → `{scores, weights, output}` (ara matrisleri döndür).
- Çok başlıklı dikkat (slaytta varsa): başlıklara bölme / birleştirme, `W^O`.
- Maskeleme: `causalMask(n)` (decoder), dolgu maskesi; maskeli konumlar softmax'tan **önce** −∞.
- Konumsal kodlama (slaytta varsa): sinüs / kosinüs.
- Girdi: sözcük vektörleri. Kaynak seçenekleri: **elle** (küçük matrisleri sen yaz), **rastgele (tohumlu)** ağırlıklarla, ya da Embedding sekmesinde eğitilmiş vektörlerin varsa onlar (yoksa bu seçeneği gizle; sekmeler arası durum paylaşımı için `localStorage` anahtarı ya da dışa aktarılan JSON, kırılgan bir bağımlılık kurma).
- **Dürüstlük:** ağırlıklar eğitilmediği için (rastgele / elle) çıkan dikkat örüntüleri **anlamlı değildir**; arayüz bunu açıkça söylesin. Gerçek bir transformer eğitmiyoruz.

**Test:** 2-3 tokenlık **elle hesaplanmış** örnek (Q, K, V küçük tam sayılar; skor, ölçekleme, softmax, çıktı değerleri tablo hâlinde); her satırın toplamı 1; maskeli konum ağırlığı tam 0; softmax'ın büyük değerlerde taşmaması; tek token; `d_k` ölçeklemesinin etkisi (ölçeksiz / ölçekli softmax doygunluğu); çok başlıklı birleştirmenin boyutu; konumsal kodlamanın bilinen değerleri.

**Arayüz:** (1) Cümle (Türkçe karakterler, token sınırı) ve ağırlık kaynağı. (2) **Dikkat ısı haritası** (n×n, hücrede sayı da yazılı; satır = sorgu, sütun = anahtar), satıra tıklayınca o sorgunun ağırlıklı toplamının nasıl oluştuğu. (3) **Ara matrisler** `.stu` altında adım adım: `QKᵀ → /√d_k → mask → softmax → ·V` (her adımın matrisi ve formülü). (4) **Encoder / decoder farkı:** maske anahtarı (çift yönlü ↔ nedensel) ve etkisi yan yana. (5) `.stu` "Kendin hesapla": küçük bir örnekte bir dikkat ağırlığı satırını elle hesapla, kontrol et. Isı haritası SVG'si dışa aktarılabilir.

**Kabul:** `test_attn.mjs` + mevcut testler; iki kip / iki tema / 375 px; sayılar tabloyla uyumlu; kontrol listesi.

---

## ADIM 3: RNN laboratuvarı (DL-5)

**Dosyalar:** `static/js/rnn.js`, `static/js/rnnlab.js`, `scripts/test_rnn.mjs`. Sekme: `rnn`, etiket **"RNN"**, kısayol `g y`.

**Kaynak:** `DL-5.pdf` (Introduction, Architecture). Slaytta LSTM / GRU varsa onları da yap; yoksa ekleme.

**Hesap (`rnn.js`):**
- Basit RNN hücresi: `h_t = tanh(W_xh·x_t + W_hh·h_{t−1} + b)`, çıktı katmanı + softmax (slayttaki biçimle). Zamanda açılım (unrolled) kaydı: her adımın `x_t, h_t, y_t`.
- Karakter ya da sözcük düzeyinde küçük bir dil modeli görevi (örn. Türkçe karakter dizisi tahmini): **eğitim** için zamanda geri yayılım (BPTT), gradyan kırpma, tohumlu başlangıç; kademeli eğitim.
- **Gradyanın kaybolması / patlaması** gösterimi: her zaman adımında `‖∂L/∂h_t‖` normu (gerçek hesap), uzun dizide azalışı görünür.
- Slaytta varsa LSTM / GRU kapıları: kapı değerlerini zamana göre göster.

**Test:** tek adım için elle hesaplanmış `h_t`; **sayısal gradyan denetimi** (BPTT ↔ sonlu fark, birkaç ağırlık için, göreli hata < 1e-4); aynı tohumla aynı sonuç; küçük bir deseni (örn. `abababab`) yeterli devirde öğrenip kaybın düşmesi; gradyan kırpmanın normu sınırlaması; boş / tek karakter dizisi.

**Arayüz:** (1) **Açılım diyagramı** (SVG): giriş, gizli durum vektörlerinin sayısal / renk + sayı gösterimi, çıkış, adım kaydırıcısı. (2) **Eğitim:** korpus (kendi metnin ya da BOUN'dan kısa bir parça; sınır göster), hiperparametre, kayıp eğrisi, "üret" (örnekleme, tohumlu), Durdur. (3) **Gradyan normları** grafiği: kaybolma etkisi, dizi uzunluğu kaydırıcısı. (4) `.stu`: formüller, BPTT'nin adım adım gösterimi ve "Kendin hesapla" (tek adımlık `h_t`). **Sınırlar:** küçük model, kısa eğitim, üretilen metin anlamsız olabilir.

**Kabul:** `test_rnn.mjs` + mevcut testler; makul sürede eğitim; iki kip / iki tema / 375 px; kontrol listesi.

---

## ADIM 4: Sinir ağı eğitimi laboratuvarı (DL-1, DL-2)

**Dosyalar:** `static/js/nn.js`, `static/js/nnlab.js`, `scripts/test_nn.mjs`. Sekme: `nn`, etiket **"Sinir ağı"**, kısayol `g i`. Sekme sırası: derin öğrenme grubunda **ilk** olmalı (DL-1/2 serinin başı); `VIEWS` sırasını buna göre düzenle (Sinir ağı → Metin temsili → Embedding → RNN → Attention).

**Kaynak:** `DL-1.pdf` (NN Basics), `DL-2.pdf` (NN Training). Slayttaki aktivasyonları, kayıp fonksiyonlarını ve en iyileyicileri (SGD, momentum, Adam ... hangisi varsa) uygula.

**Hesap (`nn.js`):**
- Çok katmanlı algılayıcı: katman boyutları, aktivasyon (ReLU / tanh / sigmoid / softmax; slayttaki), ileri yayılım, **geri yayılım** (zincir kuralı), kayıp (MSE / çapraz entropi), L2, `batch`, öğrenme oranı, en iyileyici, tohum.
- 2B oyuncak veri kümeleri (tohumlu üretim): XOR, daireler, iki ay, spiral, doğrusal ayrılabilir; gürültü ayarı.
- Karar sınırı için ızgara tahmini; kayıp ve doğruluk geçmişi.
- Adım adım mod: tek örnek için ileri ve geri yayılımın her ara değeri (`z`, `a`, `δ`, gradyanlar).

**Test:** **sayısal gradyan denetimi** (her aktivasyon + kayıp kombinasyonu, göreli hata < 1e-4); XOR'un tohumlu ve yeterli adımla çözülmesi (doğruluk = 1); tek nöron + sigmoid + çapraz entropi için elle hesaplanmış bir güncelleme; softmax'ın taşmaması; aynı tohumla aynı sonuç; boş veri / tek sınıf / sıfır öğrenme oranı.

**Arayüz:** (1) Veri kümesi seçici ve ağ mimarisi (katman ekle / çıkar, nöron sayısı, aktivasyon). (2) **Eğitim:** Başlat / Durdur / Adım, öğrenme oranı, en iyileyici; **karar sınırı** (SVG ya da `<canvas>`; canvas ise dışa aktarma yolunu düşün; renk yanında doku / işaret kullan) ve **kayıp eğrisi** canlı güncellenir. (3) **Ağırlık görünümü:** katmanlar arası bağlantılar (kalınlık + işaret + sayı). (4) `.stu`: tek örnekte ileri / geri yayılım tablosu, formüller (kayıp, gradyan, güncelleme), "Kendin hesapla": küçük bir ağda bir gradyanı elle hesapla, kontrol et. **Sınırlar:** oyuncak veri, küçük ağ; gerçek NLP görevi değil.

**Kabul:** `test_nn.mjs` + mevcut testler; eğitim arayüzü donmuyor; iki kip / iki tema / 375 px; kontrol listesi.

---

## 5. Her adımın sonunda raporun

Kısa ve gerçek: eklenen / değişen dosyalar (tam liste), slayttan uygulanan yöntemler (slayt numaralarıyla) ve **slaytta olup yapılmayanlar**, çalıştırabildiğin testler ve çıktıları (çalıştıramadıklarını açıkça yaz), ölçülen sayılar (eğitim süresi, doğruluk, gradyan hatası), bilinen sınırlar, karar bekleyen noktalar (en çok 3 satır). **Görmediğin ya da çalıştırmadığın şeyi "doğrulandı" diye yazma.**
