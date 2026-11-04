# Adım 1: Ders sekmesine "Lecture 6 · Derin öğrenme" (DL-1 … DL-7)

Önce `docs/copilot/00-ortak-kurallar.md` dosyasını oku ve kurallarına uy. Bu adım **yalnızca içerik ekler**: yeni hesap modülü ya da sekme yok. Dal: `dl/lecture6-ders`.

## Kaynak

`C:\Users\alper\Downloads\DL-1.pdf … DL-7.pdf` (toplam 218 slayt, çoğu görsel ağırlıklı):

| PDF | Konu |
|---|---|
| DL-1 | Sinir ağı temelleri |
| DL-2 | Sinir ağı eğitimi |
| DL-3 | Embedding |
| DL-4 | Metin temsili: ön işleme, tokenization, word embedding |
| DL-5 | RNN |
| DL-6 | Transformer ve self-attention |
| DL-7 | Encoder / decoder modelleri |

1. Her PDF'in metnini `PyMuPDF` ile çıkar (`fitz`; `python -c` bu Windows kabuğunda sorunlu, betiği dosyaya yaz ve çalıştır; PDF'i repoya kopyalama, betiği repo dışına koy).
2. Metni az olan, şekil / formül / tablo içeren her slaytı **PNG'ye çevirip gör**. Şekilde anlatılan şeyi (mimari, hesap akışı, formül) dersin içine metinle aktar. Görme yeteneğin yoksa bunu raporda belirt ve hangi slayt numaralarının yalnızca metinle yazıldığını listele.
3. Slaytta olmayan bilgi **ekleme**. Emin olmadığın yeri uydurma; "slaytta açık değil" diye bırak ve raporda yaz.

## Yapılacaklar

1. **`static/js/lessons.js`**: `LECTURES` nesnesine `6` anahtarı ekle; mevcut `5` girdisinin yapısını **aynen** izle (`title`, `intro`, `sections:[{gut, h, p:[...], list?, chips?}]`, `quiz:[[soru, [seçenekler], doğru indeks, açıklama]]`). Dosya başındaki yorumu "Lecture 1, 2, 3, 5 ve 6" yap.
   - `title`: `"Lecture 6 · Derin öğrenme"`.
   - `intro`: serinin 3-4 cümlelik özeti (hangi konular, hangi sırayla, neden NLP'ye gerek).
   - Bölümler PDF sırasıyla; her bölüm tek bir fikri anlatsın, 2-5 kısa paragraf. `gut` değeri `"DL-4 · slayt 12-15"` gibi **kaynak PDF ve slayt aralığı** olsun. Anahtar terimleri `<b>…</b>` ile, formülleri düz metinle yaz (örn. `h = tanh(W·x + b)`; alt/üst simge için `<sub>`, `<sup>` kullanılabilir). HTML dışında biçim yok.
   - Toplam yaklaşık 25-35 bölüm (7 PDF × 3-5). Çok slayt tek bölümde birleşebilir.
   - `chips`: bu adımda **yalnızca var olan sekmelere** anlamlı bağlantılar (örn. embedding / PPMI ile ilgili bölümden `[["Korpus gezgini", {v:"corpus", name:"boun"}]]`, `[["N-gram: PMI", {v:"ngram", src:"boun"}]]`). Olmayan sekmeye bağlantı koyma; ileride eklenecek laboratuvarlar için bölümün sonuna düz metinle "ilerideki laboratuvar" notu **yazma**.
   - `quiz`: 40-50 çoktan seçmeli soru (DL-1…DL-7'ye dağıt, her PDF için en az 5). Doğru cevap slayttan **doğrulanabilir** olsun; çeldiriciler makul yanlışlar; açıklama 1-2 cümle ve slayta dayansın. Sorularda cevap indeksini rastgele dağıt (hep 0 olmasın). Aynı soruyu tekrar etme.
2. **`static/js/learn.js`**: ders seçici düğmeleri (`[1, 2, 3, 4, 5]`, `#lecSeg`) listesine `6` ekle. Lecture 6 yalnızca `renderLecture` içindeki genel yoldan (`LECTURES[lec]`) çalışmalı; başka değişiklik gerekmez. Seçici 375 px'te taşıyorsa satır kaydırma / yatay kaydırma ile çöz (`.seg` stilini bozmadan).
3. **Doğrulama betiği:** `scripts/test_lessons.mjs` yaz: `lessons.js`'i içe aktarıp her ders için şunları denetler: tüm bölümlerde `gut`, `h`, en az 1 paragraf; her sorunun 4 (ya da 3-5) seçeneği var, doğru indeks aralıkta, açıklama boş değil; aynı soru metni iki kez yok; `chips` içindeki `v` değerleri `core.js`'teki `VIEWS` içinde; Lecture 6'da en az 40 soru; PDF başına en az 5 soru (`gut` / soru etiketinden değil, sorulara `src` alanı eklemeden, açıklama metninde "DL-n" geçmesi şartıyla ya da soru sırası aralıklarıyla basit bir kontrol yeterli: nasıl yaptığını betikte yaz). Mevcut dersler (1, 2, 3, 5) için de çalışsın; **mevcut içeriği değiştirme**, bir şey bulursan raporla.
4. **README / TODO:** `README.md` ve `README.tr.md` içindeki "Ders" tarifini "Lecture 1, 2, 3, 5 ve 6" yap, soru sayısını güncelle (`TODO.md`'de de "Ders sekmesi" satırı). `TODO.md`'ye, bu adımda yapılmayan ve sonra yapılacak laboratuvarları (ortak kurallar tablosundaki 2-6) işaretsiz madde olarak ekle.

## Kabul ölçütleri

- [ ] `node scripts/test_lessons.mjs` ve mevcut yedi test betiği geçiyor.
- [ ] Tarayıcıda `?v=learn` → Lecture 6: bütün bölümler okunuyor, sorular tıklanınca doğru / yanlış gösteriyor, puan sayacı çalışıyor; Lecture 1-5 bozulmadı; konsolda hata yok.
- [ ] Araç kipinde Ders sekmesi hâlâ erişilemiyor (Öğrenci'ye geçiş davranışı aynı); koyu tema ve 375 px düzgün.
- [ ] `git diff main --stat`: yalnızca `lessons.js`, `learn.js`, `scripts/test_lessons.mjs`, `README.md`, `README.tr.md`, `TODO.md` (+ varsa `app.css` sonuna küçük seçici düzeltmesi).
- [ ] `server.py`, saf hesap modülleri ve PDF'ler repoya girmedi; push yok.

## Raporun

Bölüm ve soru sayıları (PDF başına), şekil nedeniyle yalnızca metinle yazılan slaytlar, "slaytta açık değil" diye bırakılan yerler, testlerin çıktısı, ekran görüntüsü yolları, karar bekleyen noktalar (en çok 3 satır).
