# Adım 2: "Metin temsili" laboratuvarı (ön işleme + tokenization, DL-4)

Önce `docs/copilot/00-ortak-kurallar.md` dosyasını oku ve kurallarına uy. Dal: `dl/metin-temsili` (adım 1'in dalı `dl/lecture6-ders` incelenip `main`'e alındıktan sonra `main`'den aç; `git branch --show-current` ile kontrol et, emin değilsen dur ve sor).

## Kaynak ve kapsam

`C:\Users\alper\Downloads\DL-4.pdf` (Part 1 ön işleme, Part 2 tokenization, Part 3 word embedding). **Bu adım yalnızca Part 1 ve Part 2**; embedding sonraki adımdır. Lecture 6 Ders içeriğinde (`lessons.js`) DL-4 bölümlerini oku ve slaytlarla (PNG'ye çevirerek) karşılaştır: **laboratuvar yalnızca slaytlarda anlatılan yöntemleri uygular.** Slaytta olmayan yöntem ekleme; hangi yöntemlerin eklendiğini raporda slayt numarasıyla yaz. Slaytta BPE / WordPiece / Unigram gibi alt-sözcük yöntemlerinden hangisi varsa onu yap, yoksa yapma.

## Yapılacaklar

### A. Saf hesap: `static/js/tok.js` (DOM yok, Node'da test edilir)

Slaytlarda geçen ön işleme adımlarını (örn. küçük harfe çevirme, noktalama, sayı, stop-word, stemming / lemmatization ...) **slayttaki adlarla** uygula. Türkçe'ye özgü olanlar:
- küçük harf: `toLocaleLowerCase("tr")` (İ/ı doğru);
- lemmatization için BOUN sözlüğü (`/api/ud?lex=1` ve `/api/corpus?name=boun` zaten var; hesap modülü yalnızca veri alır, ağ çağrısı yapmaz) ya da Zemberek **yok**, bunu bağımlılık yapma.

Tokenization yöntemleri (slayttakilere göre): sözcük tabanlı (boşluk / düzenli ifade), karakter tabanlı, alt-sözcük (slaytta hangisi varsa; BPE ise):
- `trainBPE(corpusTokens, numMerges)` → `{merges:[[a,b]...], vocab, steps:[{pair, count, vocabSnapshot...}]}`: **her birleştirme adımı kaydedilsin** (en sık çift, sayısı, birleşmeden önce / sonra sözcük bölünmeleri). Eşitlikte deterministik sıra (sayı azalan, sonra sözlük sırası).
- `encodeBPE(word, merges)` ve `decode`.
- Sözcük sonu işareti (örn. `</w>` ya da `▁`) slayttaki gösterime uysun.
- `stats(tokens)`: toplam token, tür sayısı, ortalama token / sözcük, OOV / UNK oranı (eğitim sözlüğüne göre).

### B. Test: `scripts/test_tok.mjs`
- Slayttaki (ya da literatürdeki klasik `low lower newest widest` tarzı) örneğin birleştirme adımlarını **elle hesaplayıp** beklenen değerlerle karşılaştır. Slayttaki örnek varsa onu kullan.
- Kenar durumlar: boş metin, tek karakter, aynı çift eşitliği, Türkçe karakterler (İ/ı, ç ğ ö ş ü), çok uzun sözcük, `numMerges` = 0 ve > olası.
- Kodlama→çözme gidiş-dönüşü özdeşlik vermeli (rastgele 200 sözcükle).

### C. Arayüz: yeni sekme "Metin temsili" (`static/js/textrep.js`)
- Kimlikler: `tok` (görünüm), etiket `Metin temsili`, kısayol `g x`, ikon mevcut `P` listesinden uygun biri ya da yeni sade bir SVG yolu. Kabuktaki ders gruplamasında **"Lecture 6 · Derin öğrenme"** başlığı altına koy (yoksa oluştur; komut paleti, `?` penceresi ve kenar çubuğu aynı sırada).
- Bölümler: (1) **Metin ve ön işleme:** metin kutusu + BOUN örnek cümleleri / kendi metnin; adımlar açılıp kapanır, her adımın çıktısı sözcük / token düzeyinde fark gösterilerek (neyin değiştiği vurgulu, renk tek başına değil). (2) **Tokenization karşılaştırması:** aynı metin için sözcük / karakter / alt-sözcük çıktıları yan yana; istatistik şeridi (token, tür, ort. token/sözcük, UNK). Türkçe eklemeliliğini gösteren örnekler (kısa hazır düğmeler). (3) **BPE eğitimi:** korpus kaynağı (kendi metnin / BOUN ilk N cümle), birleştirme sayısı, adım kaydırıcısı; her adımda en sık çift, sayı, güncel sözlük ve sözcüklerin bölünmesi; "tümünü çalıştır". (4) **Kodla:** eğitilmiş birleştirmelerle yazdığın sözcüğü / cümleyi kodla ve parçaları göster; görülmemiş sözcük deneyi.
- **Araç / Öğrenci:** sonuçlar, istatistikler ve kodlama Araç'ta görünür. Slayt göndermeleri, yöntemin açıklaması, formüller, "neden bu çift seçildi" gerekçesi, kendini sına alıştırması `.stu`. Öğrenci kipinde "Kendin yap": BPE'nin ilk 3 birleştirmesini kendin tahmin et, kontrol et (mevcut `fill-in` kalıplarına bak: `parse.js` `PS.fill`, `ngram.js` `NQ`).
- Durum `localStorage` anahtarı `wn:textrep`; `apply(p)` kalıbı (`?v=tok`, Ders düğmeleri `{v:"tok", ...}` için) mevcut sekmelerdeki gibi.
- Büyük korpusta ana iş parçacığını kilitleme: BPE'yi kademeli çalıştır (sınır koy: örn. en çok 20 000 sözcük, en çok 500 birleştirme; sınırı arayüzde göster) ve "hesaplanıyor" durumu göster.
- Dışa aktarma: birleştirme tablosunu Markdown olarak kopyalama (`data-copy` kalıbı, `ngram.js` / `parse.js` örneği).

### D. Ders bağlantıları
`lessons.js` içinde Lecture 6'daki DL-4 ile ilgili bölümlerin `chips` listesine yeni sekmeyi açan düğmeler ekle (`{v:"tok", ...}`); **içeriği ve soruları değiştirme**.

### E. Belgeler
- `README.md`, `README.tr.md`: yeni sekmenin kısa tarifi (mevcut satır biçimiyle), test sayısı.
- `TODO.md`: "Bilinen kısıtlar"a bu laboratuvarın sınırları (örn. Türkçe için ön işleme basit, BPE küçük korpusta eğitilir, sözcük içi biçimbirim sınırlarıyla karşılaştırması yapılmadı), ölçtüğün sayılarla.
- `DESIGN.md`'ye yeni bileşen gerekiyorsa kısa not.

## Kabul ölçütleri

- [ ] `node scripts/test_tok.mjs` ve diğer bütün test betikleri geçiyor.
- [ ] Tarayıcıda `?v=tok`: dört bölüm çalışıyor; BPE adımları elle hesapla uyuşuyor; konsolda hata yok; iki kip, iki tema, 375 px; Araç kipinde `.stu` yok.
- [ ] Boş metin, çok uzun metin, Türkçe karakterler, BOUN kaynağı denendi ve raporlandı.
- [ ] Hiçbir hesap sonucu sabit yazılmış değil; sayılar hesaptan geliyor.
- [ ] `git diff main --stat`: `tok.js`, `textrep.js`, `test_tok.mjs`, `core.js`, `index.html`, `main.js`, `ui.js`, `app.css` (sonuna), `lessons.js` (yalnızca `chips`), README'ler, TODO; `server.py` ve diğer hesap modülleri yok.
- [ ] Push yok.

## Raporun

Slayttan uygulanan yöntemler (slayt numaralarıyla), slaytta olup yapılmayanlar ve nedeni, test çıktıları, ölçülen sayılar, ekran görüntüsü yolları, karar bekleyenler (en çok 3 satır).
