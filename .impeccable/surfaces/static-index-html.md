---
version: 1
slug: "static-index-html"
primary_target: "static/index.html"
related_targets: []
---

# Surface brief: tüm uygulama (Operate)

Scope: tek sayfalık sözlük çalışma alanı; sekmeler Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler, Ders.
Visitor mode: Operate (ders sırasında canlı gösterim önceliği: sunum etkisi, ikincil: günlük çalışma akışı).
Audience/job: NLP öğrencisi, bir sözcükten anlamlara, kavram hiyerarşisine, rollere ve çerçevelere geçmek; derste hocaya göstermek.
Constraints: Türkçe arayüz; mevcut API ve URL durumu çalışır kalır; kayıtlar (favori, geçmiş, not) tarayıcıda; kaynak tek leke renk (ultramarin).
Unresolved: yok.

## Direction contract

THESIS: Her kavram bir sözlük maddesi. Baskı sözlüğünün iki renkli sayfa dili (iri başlık, kutulu anlam numaraları, kıl çizgi) modern bir SaaS çalışma alanına çevrilir. Kart yığını ve renk karmaşasını reddeder.
OWN-WORLD: Soğuk ince kâğıt (#f5f7fb), mavi-siyah mürekkep (#0d1220), tek leke renk ultramarin (#2b3bd6) yalnızca tıklanabilir ve odaktaki şey için; kıl çizgiler, parmak indeksi dikey rayı, kutulu numaralar, italik tür etiketleri. Kategori ayrımı renkle değil çizgi biçimiyle (düz, kesik, noktalı, çift). Koyu tema: mavi-siyah kâğıt, açık mürekkep. Yüzeyler: sayfa, kenar kâğıdı (sheet), palet.
STORY: Ziyaretçi bir sözcük yazar, madde sayfasını görür, bir anlama tıklayınca diğerleri sönükleşir ve sağ kenar kâğıdı o kavramın bağlarını açar; haritada kavramdan kavrama yürür, nereden geldiğini iz gösterir. Derste ⌘K ile hızla gider, P ile sunum moduna geçer.
FIRST VIEWPORT: Solda ince dikey parmak indeksi (sekmeler, iz); üstte ⌘K arama çubuğu ve dil/tema kontrolleri; ortada madde sayfası: iri başlık (56–72px), kutulu numaralı anlamlar, Türkçe | İngilizce orta dikişte; sağda kenar kâğıdı mini bağ haritasıyla. Birincil eylem arama alanı ve ⌘K.
FORM: Baskı sözlüğü sayfası (aday 5/7), seed 674f3842. Yükseltmeler: Laban'dan aynalı orta dikiş (TR | EN), pozlama kaydından kenara kayan kâğıtlar (bağlam yığını), botanik folyodan ortak tabanda hizalı karşılaştırma, kasetten A/B yüzü çevirme.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
