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
- [ ] Backoff ve interpolation (slayt 32), UNK / kapalı-açık sözcük dağarcığı (slayt 33).
- [ ] PMI (slayt 34–39): pencere ±k birlikte geçiş sayımı, PMI tablosu.

## Ayrıştırma laboratuvarı (InClass 2, 3, 4; Lecture 3)

- [x] PCFG (InClass 2) ve CKY (InClass 3): sekme **Ayrıştırma** (`static/js/parse.js`, `g c`). InClass 2 cümlesi 2 ağaç verir ve ikisi de P = 3.527e-9 (eşit, kuralların çarpanları aynı); InClass 3 cümlesi gramerde yok (S yalnızca [0,7] kapsıyor, `time` bağlanamıyor).
- [ ] Bağımlılık: train/dev kümesi, çok sözcüklü belirteç (1-2) gösterimi, çevrimiçi graph-based / transition-based ayrıştırıcı demosu, Turkish IG (çekim grupları) gösterimi.
- [ ] Ayrıştırma: PCFG için kural olasılığını korpustan MLE ile öğrenme (slayt), top-down / shift-reduce adım adım gösterim.
- [x] Bağımlılık ağacı (InClass 4): sekme **Bağımlılık** (`static/js/deps.js`, `g k`, API `/api/ud`). Veri: `data/ud/tr_boun-ud-test.conllu` (UD Turkish-BOUN test, CC BY-SA 4.0).

## Önceki notlardan kalanlar

- [ ] Benzerlik: ortak taban karşılaştırması ve A↔B çevirme.
- [ ] Kenar kâğıdı bağlam sekmelerini görselle doğrula.
- [ ] Telefonda harita kontrollerinin düğümlerin üstüne binmesini gider.
