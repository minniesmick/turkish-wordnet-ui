# Yapılacaklar

Haftalık InClass soruları ve slaytlar geldikçe uygulamaya taşınacak işler. Önce PDF doldurulur, uygulama işi buraya yazılır.

## N-gram dil modeli laboratuvarı (InClass 5, Güz 2026)

Kaynak: `InClass5.pdf` (PDF dolduruldu: `~/Downloads/InClass5_filled.pdf`). Sekme: **N-gram** (`static/js/ngram.js`, `g n`). Slayt 24 korpusu doğrulandı (2/3, 1/3, 1/2, Laplace 3/8).

- [x] Korpus kutusu, `<s>` ve `</s>` otomatik, unigram / bigram / trigram.
- [x] Sayım tablosu, koşullu olasılık (kesir + ondalık), satır toplamı = 1 doğrulaması, bigram matrisi.
- [x] Geçmiş seçince dağılımı gösterme.
- [x] "the cat X" tipi soru: en olası sonraki sözcük ve nedeni.
- [x] Cümle olasılığı adım adım, log₂, 0 çarpan uyarısı, OOV uyarısı, perplexity.
- [x] Laplace (add-one) yumuşatma.
- [x] InClass 5 korpusu hazır örnek (`PRESETS.inclass5`); 4/6, 2/6, 3/7, 2/7, 2/7 PDF'deki tabloyla doğrulandı, "the cat X" cevabı X = cat (2/6).
- [x] Backoff ve interpolation (slayt 32), UNK / açık sözcük dağarcığı (slayt 33): `static/js/lm.js` (test: `node scripts/test_lm.mjs`).
- [x] PMI (slayt 34–39): pencere ±k, en yüksek çiftler, kolokasyonlar, PPMI kosinüs benzerliği. Rastgele cümle üretimi (slayt 28–29) ve eğitim/test perplexity karşılaştırması da var.
- [x] Korpus gezgini (`static/js/corpus.js`, `g o`): BOUN ve Brown, sıklık, Zipf, KWIC; `/api/corpus` (gzip).
- [ ] N-gram: Katz / Kneser-Ney (normalize edilmiş backoff), λ'ları held-out veriden öğrenme (deleted interpolation), SemCor dışı İngilizce korpus.

## Dışa aktarma

- [x] Ağaç, bağımlılık şeması ve Zipf için SVG / PNG indirme (`static/js/exportfig.js`); CKY tablosu ve n-gram tablosu Markdown kopyalama; CoNLL-U kopyalama.
- [ ] CKY tablosu ve n-gram matrisi için PNG; yazı tiplerini SVG'ye göm (şu an indirilen dosyada sistem yazı tipi kullanılır).

## Kullanım kipi ve morfoloji (Lecture 2)

- [x] Araç / Öğrenci kipi (`MODE`, `.stu`, `STUDENT_VIEWS` in `core.js`); öğretici öğeler Araç kipinde gizli.
- [x] Morfoloji sekmesi (`static/js/morph.js`, `turkish.js`, `g m`); motor denetimi: `node scripts/test_turkish.mjs`.
- [x] Zemberek köprüsü (`scripts/ZemberekBridge.java`, `/api/zemberek`, `lib/zemberek-full.jar` git'te yok) + cümle belirsizlik giderme + Oflazer FSM yolu (`static/js/fsm.js`, test `node scripts/test_fsm.mjs`; Sample.pdf yolları birebir tutuyor).
- [ ] FSM: Prog2, Neg+Aor (111), bileşik zamanlar (132/133), ^DB sonrası türemiş sıfatlar şekilde kodlanmadı; 101→104 (Caus) şekilde yok, varsayım olarak işaretli.
- [x] Zemberek WordGenerator ile üretim (`G`/`O` komutları, `/api/zemberek?g=&o=&i=`); alıştırma cevap anahtarı Zemberek'ten, çözümleme sorusunda geçerli çözümleme tek seçeneğe indirildi (belirsiz yüzey sorunu giderildi).
- [ ] Morfoloji kapsamı (küçük motor, yalnızca yedek): sıfat-fiil -DHk, zarf-fiil -ArAk/-Ip, ki, ek-fiil (-DHr, -(y)Hm), birleşik zaman; sıklıkla yanlış çözümlenen ilk 100 BOUN sözcüğünü incele.
- [ ] Morfolojik belirsizlik giderme (slayt 31–32): BOUN etiketlerinden en olası çözümlemeyi seç.
- [x] "Kendin doldur, kontrol et": CKY tablosu (Ayrıştırma, hücre hücre kontrol, ipucu) ve n-gram (tek olasılık, tablo satırı).
- [ ] Öğrenci kipi: Ders sekmesini Lecture 1, 2, 3 ve 5 için genişlet; kendin-doldur'u bağımlılık ağacına (kenar ekleme) ve Morfoloji FSM yoluna da taşı.

## Ayrıştırma laboratuvarı (InClass 2, 3, 4; Lecture 3)

- [x] PCFG (InClass 2) ve CKY (InClass 3): sekme **Ayrıştırma** (`static/js/parse.js`, `g c`). InClass 2 cümlesi 2 ağaç verir ve ikisi de P = 3.527e-9 (eşit, kuralların çarpanları aynı); InClass 3 cümlesi gramerde yok (S yalnızca [0,7] kapsıyor, `time` bağlanamıyor).
- [ ] Bağımlılık: train/dev kümesi, çok sözcüklü belirteç (1-2) gösterimi, çevrimiçi graph-based / transition-based ayrıştırıcı demosu, Turkish IG (çekim grupları) gösterimi.
- [ ] Ayrıştırma: PCFG için kural olasılığını korpustan MLE ile öğrenme (slayt), top-down / shift-reduce adım adım gösterim.
- [x] Bağımlılık ağacı (InClass 4): sekme **Bağımlılık** (`static/js/deps.js`, `g k`, API `/api/ud`). Veri: `data/ud/tr_boun-ud-test.conllu` (UD Turkish-BOUN test, CC BY-SA 4.0).

## Önceki notlardan kalanlar

- [ ] Benzerlik: ortak taban karşılaştırması ve A↔B çevirme.
- [ ] Kenar kâğıdı bağlam sekmelerini görselle doğrula.
- [ ] Telefonda harita kontrollerinin düğümlerin üstüne binmesini gider.
