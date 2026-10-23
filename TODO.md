# Yapılacaklar

Haftalık InClass soruları ve slaytlar geldikçe uygulamaya taşınacak işler. Önce PDF doldurulur, uygulama işi buraya yazılır.

## N-gram dil modeli laboratuvarı (InClass 5, Güz 2026)

Kaynak: `InClass5.pdf` (PDF dolduruldu: `~/Downloads/InClass5_filled.pdf`).

- [ ] Yeni sekme ya da Ders sekmesinde bölüm: korpus kutusuna cümleler yapıştırılır, `<s>` ve `</s>` otomatik eklenir.
- [ ] Bigram sayım tablosu ve koşullu olasılık dağılımı: P(wᵢ | wᵢ₋₁) = count(wᵢ₋₁ wᵢ) / count(wᵢ₋₁), kesir ve ondalık gösterim.
- [ ] Bir sözcük seçince onun dağılımı vurgulanır (Harita'daki odaklama mantığıyla), satır toplamı 1 doğrulaması görünür.
- [ ] "the cat X" tipi soru: önceki sözcüğe göre en olası sonraki sözcük ve nedeni.
- [ ] Cümle olasılığı: P(w₁…wₙ) çarpımı adım adım, log olasılık, tanımsız (0) durum uyarısı.
- [ ] Sonraki haftalar için: unigram/trigram seçimi, add-one (Laplace) yumuşatma, perplexity.
- [ ] InClass 5 örnek korpusu hazır örnek olarak yüklenebilsin; sonuçlar PDF'deki tabloyla aynı çıkmalı (4/6, 2/6, 3/7, 2/7, 2/7, …).

## Önceki notlardan kalanlar

- [ ] Benzerlik: ortak taban karşılaştırması ve A↔B çevirme.
- [ ] Kenar kâğıdı bağlam sekmelerini görselle doğrula.
- [ ] Telefonda harita kontrollerinin düğümlerin üstüne binmesini gider.
