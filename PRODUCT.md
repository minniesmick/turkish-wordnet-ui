# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Alper, MEF Üniversitesi Veri Bilimi öğrencisi; COMP 451 (Doğal Dil İşlemeye Giriş, Dr. Seniz Demir, Güz 2026) dersini çalışırken ve in-class ödevlerini yaparken kullanıyor. Aynı arayüz derste hocaya ve sınıf arkadaşlarına gösteriliyor. İkincil kitle: aynı dersi alan öğrenciler (paylaşım istenirse). Arayüz dili Türkçe; veri Türkçe ve İngilizce.

## Product Purpose
Türkçe (KeNet) ve İngilizce (Princeton WordNet 3.1) sözcüksel anlam kaynaklarını, PropBank / TRopBank, VerbNet ve FrameNet ile birlikte tek yerde aratıp gezdirmek ve Lecture 4 (Semantics) slaytlarındaki kavramları canlı örneklerle çalıştırmak. Başarı: bir sözcükten anlamlarına, kavram hiyerarşisine, rollere ve çerçevelere en az dağılmayla geçebilmek; ders sırasında bir kavramı hocaya canlı gösterebilmek.

## Positioning
Normalde ayrı sitelerde duran kaynaklar (Türkçe WordNet, İngilizce WordNet, PropBank, VerbNet, FrameNet) burada Türkçe ↔ İngilizce bağlantılarıyla ve aynı kavram üzerinden birbirine bağlı. Slayt numaralarına eşlenmiş ders sekmesi, Lesk / Naive Bayes ile anlam seçimi, yol ve bilgi içeriği tabanlı benzerlik ve kural tabanlı Türkçe rol etiketleme aynı veride çalışıyor.

## Operating Context
Yerel çalışıyor: Python standart kütüphaneli sunucu (`server.py`, port 8770), tek sayfalık statik arayüz (`static/index.html`). Veri `data/` altında (~117 MB): Starlang `TurkishWordNet`, `TurkishPropBank`, `TurkishFrameNet`; PropBank 3.4, FrameNet 1.7, VerbNet 3.3, SemCor, SENSEVAL-2 (NLTK veri deposu ve resmî depolar). Ders sırasında projeksiyonda ve laptopta, açık ve koyu temada kullanılıyor. Arama durumu URL'de tutulur; derste bağlantı ile aynı ekrana dönülebilmeli.

## Capabilities and Constraints
- Sekmeler: Ara (KeNet / PWN 3.1 / 1998), Benzerlik (path, Wu-Palmer, Resnik, Lin, Jiang-Conrath), Anlam seçimi (Lesk, Naive Bayes), Roller (PropBank, TRopBank, VerbNet, cümle etiketleme, rol sınavı), Çerçeveler (FrameNet İngilizce / Türkçe), Ders (slayt eşlemeli anlatım ve quiz).
- Terimler: synset, lemma, sense, hypernym / hyponym, meronym / holonym, LU, FE, roleset, ARG0–ARG4, durum eki (acc, dat, abl, loc, ins, gen).
- Kısıt: sunucu tarafı hesap yok; kullanıcıya özel kayıtlar (favoriler, geçmiş, notlar) tarayıcıda tutulur. Türkçe arayüz metni korunur. Mevcut API uç noktaları ve URL parametreleri çalışmaya devam etmeli.
- Kapsam dışı (veri yok): FOL, CCG, söylem semantiği (slayt 37–45).
- Kural tabanlı Türkçe rol etiketleme öneridir; durum eki tahmini elle düzeltilebilir. Lesk doğruluğu sınırlıdır ve arayüzde böyle sunulur.

## Evidence on Hand
Gerçek veri: KeNet 78.327 synset, PWN 3.1 117.791 synset, TRopBank 17.526 fiil çerçevesi, PropBank 3.4 11.198 roleset, FrameNet 1.7 1.221 çerçeve, VerbNet 594 sınıf, SemCor 224.149 anlam etiketi, SENSEVAL-2 interest 2.368 örnek. Lecture4.pdf slaytları ders eşlemesinin kaynağı. Müşteri, kullanıcı sayısı ya da başarı oranı iddiası uydurulmaz.

## Product Principles
1. Kavram merkezde: her ekran bir kavramdan başlar ve ona bağlı her şeye (anlam, hiyerarşi, rol, çerçeve, çeviri) bir tık uzaklıktadır.
2. Gösterirken ikna eden, çalışırken sessiz: ders anında etkileyici, günlük kullanımda sakin ve hızlı.
3. Veri dürüstlüğü: yöntemlerin sınırları (Lesk, kural tabanlı etiketleme) saklanmaz, doğruluk sayıları gerçek hesaplardan gelir.
4. Bağlam kaybolmaz: bir tıklama sonraki adımı açar ama nereden gelindiği, geri dönüş ve URL durumu korunur.

## Accessibility & Inclusion
Türkçe karakterler (İ/ı, ç ğ ö ş ü) doğru işlenir (Türkçe yerelli büyük/küçük harf). Açık ve koyu tema, klavyeyle tam gezinme, yeterli kontrast; projeksiyonda okunabilir yazı boyutu.
