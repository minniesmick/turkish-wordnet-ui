// Ders sekmesi içeriği: Lecture 1, 2, 3, 5 ve 6 (Lecture 4'ün canlı örnekli dersi learn.js içinde).
// Kaynak: dersin slaytları (Dr. Seniz Demir, COMP 451). Düğmeler [etiket, {v: sekme, ...}] biçimindedir ve ilgili aracı hazır örnekle açar.
// Sorular: [soru, [seçenekler], doğru indeks, açıklama]

export const LECTURES = {
  1: {
    title:"Lecture 1 · NLP'ye giriş",
    intro:"Doğal dil işleme nedir, neden zor, hangi düzeylerde çalışır. Uygulamadaki sekmeler bu düzeylerin her birine karşılık gelir.",
    sections:[
      {gut:"ders 1", h:"NLP nedir?", p:["Doğal dil işleme (NLP), bilgisayar bilimi, yapay zekâ ve insan dillerinin kesiştiği alandır: bilgisayarlarla insan (doğal) dilleri arasındaki etkileşimi inceler ve dilleri işlemek için hesaplamalı teknik ve modeller önerir. Hesaplamalı dilbilim (Computational Linguistics) olarak da anılır. “Neuro-linguistic programming” ile ilgisi yoktur.",
        "Yakın alanlar: yapay zekâ (yaklaşım ve yöntemler), makine/derin öğrenme (öğrenme ve programlama teknikleri), dilbilim (çekirdek), biçimsel diller ve otomatlar teorisi, psikodilbilim ve bilişsel bilim. Günlük örnekler: Google Arama ve Çeviri, Siri, Word otomatik düzeltme, Alexa, video oyunları, ChatGPT."], chips:[["Bir sözcüğü çözümle", {v:"morph", word:"okullarım"}], ["Bir cümleyi ayrıştır", {v:"parse", preset:"pp"}]]},
      {gut:"ders 1", h:"Neden gerekli, neden zor?", p:["Metin her yerde (e-posta, blog, makale, banka belgesi, doktor raporu, sözleşme), çevrim içi bilgi her gün büyüyor, çok dilli iletişim ve diyalog sistemleri (sohbet botu, dijital asistan) yaygınlaşıyor; insan olarak daha hızlı okuyup arayamıyoruz.",
        "Zorluklar: dil sözcüklerin, kuralların ve istisnaların birleşimidir; sistemli ama kavraması karmaşıktır; sürekli değişir ve yeni sözcük, istisna doğar; <b>belirsizlik her düzeyde</b> vardır (örn. <i>yakın</i> sözcüğünün anlamını cümleden anlamak); dilin kültürel bir bakışı vardır. Türkçe serbest sözcük sıralı bir dildir."], chips:[["yakın: anlamlar (KeNet)", {act:"search", ds:"kenet", q:"yakın"}], ["gezme: belirsiz çözümleme", {v:"morph", word:"gezme"}]]},
      {gut:"ders 1", h:"Konuşan ve dinleyen", p:["NLP, konuşan ile dinleyen arasındaki iletişimi modeller. <b>Konuşan</b> tarafta: niyet (ne zaman ne aktarılacak), üretim (bilgiyi sözcük dizisine çevirme), sentez (konuşma ya da metin kipini seçme). <b>Dinleyen</b> tarafta: algılama (girdiyi sözcük dizisine çevirme), anlama (içeriği işleme), içselleştirme (içerikle ne yapılacağına karar verme).",
        "Girdi yazılı metin, konuşma, görüntü ya da algılayıcı verisi olabilir."]},
      {gut:"ders 1–2", h:"Dilin düzeyleri", p:["Her dilde birçok yapı düzeyi vardır; insanlar bunların hepsini akıcı biçimde kullanır, bilgisayar için belirsizlik büyük sorundur. Düzeyler ve bu uygulamadaki karşılıkları:"],
        list:["<b>Fonoloji</b>: sözcükler ile onları gerçekleştiren sesler arasındaki ilişki (bu uygulamada yok).", "<b>Morfoloji</b>: sözcüklerin yapısı; Morfoloji sekmesi.", "<b>Sözdizimi</b>: sözcüklerden dilbilgisel cümleler kurulması ve sözcüklerin cümledeki rolleri; Ayrıştırma ve Bağımlılık sekmeleri.", "<b>Anlambilim</b>: sözcük ve cümle anlamı; Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler.", "<b>Söylem</b>: diğer cümlelerin bir cümlenin yorumuna etkisi.", "<b>Edimbilim (pragmatik)</b>: cümlelerin farklı durumlarda kullanımı.", "<b>Dünya bilgisi</b>: dili anlamak için gereken dış bilgi."],
        chips:[["Morfoloji", {v:"morph"}], ["Sözdizimi: CKY", {v:"parse"}], ["Anlambilim: WordNet", {act:"search", ds:"en", q:"bank"}]]},
      {gut:"ders 1", h:"NLP görevleri", p:["Alan geniştir ve etrafımızda: bilgi çıkarımı, bilgi erişimi, adlandırılmış varlık tanıma, duygu analizi, anlam belirsizliği giderme, sözcük ayırma (tokenization), kök bulma (stemming), sözcük türü etiketleme (POS tagging), sorgu genişletme, ayrıştırma (parsing), konu sınıflandırma, morfolojik çözümleme, makine çevirisi, özetleme, tümce eşdeğerleme, dil üretimi, soru-cevap, gönderim çözümleme, metin sadeleştirme, diyalog sistemleri, görüntü altyazılama."],
        chips:[["Anlam belirsizliği giderme", {act:"wsd", ds:"en", wi:"0"}], ["Morfolojik çözümleme", {v:"morph", word:"geleceğim"}], ["Ayrıştırma", {v:"parse"}]]}
    ],
    quiz:[
      ["Bir sözcüğün iç yapısını (kök, ekler) inceleyen dil düzeyi hangisidir?", ["Fonoloji", "Morfoloji", "Sözdizimi", "Edimbilim"], 1, "Morfoloji sözcüklerin oluşumunu inceler."],
      ["Bir cümlenin yorumunun diğer cümlelerden nasıl etkilendiğini hangi düzey inceler?", ["Söylem", "Edimbilim", "Morfoloji", "Fonoloji"], 0, "Söylem (discourse): diğer cümlelerin bir cümlenin yorumuna etkisi. Edimbilim ise cümlelerin farklı durumlarda kullanımıdır."],
      ["Aşağıdakilerden hangisi “doğal dil işleme”yi zorlaştıran nedenlerden biri DEĞİLDİR?", ["Belirsizlik her düzeyde vardır", "Dil sürekli değişir ve evrilir", "Dilin kuralları hiç istisna içermez ve sabittir", "Dilin kültürel bir bakış açısı vardır"], 2, "Dil kural, istisna ve değişimle doludur; “istisnasız ve sabit” demek yanlış."],
      ["Dinleyen tarafta modellenen adımlar sırasıyla hangileridir?", ["Niyet, üretim, sentez", "Algılama, anlama, içselleştirme", "Anlama, algılama, üretim", "Sentez, niyet, algılama"], 1, "Konuşan: niyet, üretim, sentez. Dinleyen: algılama, anlama, içselleştirme."],
      ["NLP hakkında hangisi doğrudur?", ["Neuro-linguistic programming ile aynı şeydir", "Hesaplamalı dilbilim olarak da anılır", "Yalnızca yazılı metinle çalışır", "Sadece makine çevirisini kapsar"], 1, "NLP, Computational Linguistics olarak da anılır; girdi metin, konuşma, görüntü ya da algılayıcı verisi olabilir."],
      ["Aşağıdakilerden hangisi bir NLP görevi değildir?", ["Adlandırılmış varlık tanıma", "Sözcük türü etiketleme", "Duygu analizi", "Ağ trafiğini yönlendirme"], 3, "Ağ trafiği yönlendirme dil işleme görevi değildir."]
    ]
  },

  2: {
    title:"Lecture 2 · Morfoloji",
    intro:"Sözcüklerin iç yapısı ve oluşumu. Morfoloji sekmesinde çözümle, üret, Zemberek ve Oflazer FSM yolu, Belirsizlik sekmesinde belirsizlik giderme bu derse karşılık gelir.",
    sections:[
      {gut:"ders 2", h:"Morfem, kök, ek", p:["<b>Morfem</b>: anlamlı en küçük bölünmez birim. <b>Kök (stem)</b>: sözcüğün çekirdeği. <b>Ek (affix)</b>: sözcüğe anlam ya da dilbilgisel işlev katan birim. Morfolojinin görevi, sözcüklerin iç yapısını ve oluşumunu çözümlemek ya da üretmektir; amaç, kodlanmış bilgiyi diğer işleme katmanlarına (uyum denetimi, ayrıştırma, makine çevirisi) taşımaktır.",
        "Ek türleri: <b>önek</b> (un+seen), <b>sonek</b> (build+s), <b>içek</b> (cup+s+ful), <b>çevreleyen ek</b> (Almanca ge+lieb+t). Türkçede ekler sonektir."], chips:[["okullarım'ı ayır", {v:"morph", word:"okullarım"}], ["kitapçılık", {v:"morph", word:"kitapçılık"}]]},
      {gut:"ders 2", h:"Çekim, yapım, birleştirme", p:["<b>Çekim (inflection)</b>: kökün anlamı ve sınıfı değişmez (gel → gel+di, pencil → pencil+s). <b>Yapım (derivation)</b>: anlam ve sınıf değişir (anahtar → anahtar+cı, compute → compute+r). <b>Birleştirme (compounding)</b>: iki kök bir araya gelir (açık+göz, bath+room). Morfoloji sekmesinde her ekin yanında çekim ya da yapım etiketi görünür."], chips:[["güzelliği (yapım+çekim)", {v:"morph", word:"güzelliği"}], ["sevindiriyor", {v:"morph", word:"sevindiriyor"}]]},
      {gut:"ders 2", h:"Alomorf ve Türkçe ses kuralları", p:["<b>Alomorflar</b>: aynı morfemin farklı gerçekleşmeleri; -lar/-ler çoğul eki, belirtme hâli için +yı, +yi, +yu, +yü, +ı, +i, +u, +ü. Gerçekleşmeyi <b>ünlü uyumu</b> (a/e, ı/i/u/ü), <b>ünsüz yumuşaması</b> (ağaç → ağaca, kitap → kitabı), ünlü/ünsüz düşmesi ve tampon ünsüzler (araba+ya) belirler; bu kurallar iki düzeyli morfolojide arkifonemlerle (A, H, D, C) yazılır.", "Slayt 25'teki kurallar: H, ünlüyle biten kökten sonra düşer (masa+Hm → masam); -Iyor öncesinde kök sonundaki a/e düşer (kapa+Hyor → kapıyor); k → ğ (ayak+nHn → ayağın); nk → ng (renk+yH → rengi)."], chips:[["masam", {v:"morph", word:"masam"}], ["kapıyor", {v:"morph", word:"kapıyor"}], ["ayağın", {v:"morph", word:"ayağın"}], ["rengi", {v:"morph", word:"rengi"}]]},
      {gut:"ders 2", h:"Eklemeli dil ve istatistikler", p:["Türkçe <b>eklemeli (agglutinative)</b> bir dildir: tek kökten çok sayıda sözcük türer, ekler tek tek eklenir. Ortalama bir sözcükte kökle birlikte 3 morfem vardır, ama sık geçen sözcükler çoğunlukla tek morfemlidir. Bir sözcüğün ortalama 2 morfolojik yorumu vardır (gez+me: “yürüme!” ya da “bir yürüyüş”), yine de sözcüklerin %65'inin tek yorumu vardır."], chips:[["gezme", {v:"morph", word:"gezme"}], ["evleri (3 yorum)", {v:"morph", word:"evleri"}]]},
      {gut:"ders 2", h:"Yüzey biçimi ve sözcüksel biçim", p:["<b>Yüzey biçimi</b>: sözcüğün metinde göründüğü hâl (okulum, sevindiriyor). <b>Sözcüksel biçim</b>: morfemlerin listesi (okul+Noun+A3sg+P1sg+Nom; sevin+Verb+Caus+Pos+Prog1+A3sg). <b>Çözümleme (analysis/parsing)</b> yüzeyden sözcükseline, <b>üretim (generation/synthesis)</b> sözcükselden yüzeye gider."], chips:[["çözümle: okulum", {v:"morph", word:"okulum"}], ["üret", {v:"morph"}]]},
      {gut:"ders 2", h:"Çözümleme için üç bileşen", p:["Türkçe için tüm sözcük biçimlerini listelemek olanaksız; bu yüzden üç parça gerekir: <b>sözlük (lexicon)</b>: kökler ve bilgileri; <b>morfotaktik</b>: ek sırası kuralları (kütüphane-si-ne olur, kütüphane-ne-si olmaz); <b>morfofonemik</b>: ek eklenirken ses değişimleri (ağaç-ta/ağaç-a → ağaca).",
        "Bunlar sonlu durum makineleri/dönüştürücüleriyle (FSM/FST) gerçeklenir; iki düzeyli morfoloji yüzey ve sözcüksel biçimi eşler (Oflazer, 1993; Türkçe için 22 kural). Açık kaynak çözümleyiciler: Zemberek, Nuve. Oflazer'in isim ve fiil durum makineleri sekmede “FSM yolu” olarak görünür."], chips:[["FSM yolu: küçükler", {v:"morph", word:"küçükler"}], ["FSM yolu: uyuyordur", {v:"morph", word:"uyuyordur"}], ["FSM yolu: uyumaktadır", {v:"morph", word:"uyumaktadır"}]]},
      {gut:"ders 2", h:"Morfolojik belirsizlik giderme", p:["Bir yüzey biçimin birden çok çözümlemesi olabilir; bunları bağlama bakarak seçmek <b>morfolojik belirsizlik gidermedir</b>. Türkçe için yöntemler: ortalamalı perceptron (Sak, Güngör, Saraçlar), karar listeleri (Yüret ve Türe) ve sinir ağları.",
        "<b>Taban çizgisi</b> sözcüğün eğitimde en sık görülen çözümlemesini seçer, bağlama bakmaz. <b>Karar listesi</b> “özellik → çözümleme” kurallarını güvenilirliğe göre sıralar; uyan ilk kural karar verir. <b>Ortalama perceptron</b> adayları özellik ağırlıklarıyla puanlar; yanlış seçimde doğrunun ağırlığını artırır, seçilenin azaltır ve sonda ağırlıkların ortalamasını alır. Belirsizlik sekmesi üçünü BOUN'la eğitir ve cümle içinde karşılaştırır; Zemberek'in “Cümlede çözümle” özelliği de perceptron kullanır."], chips:[["Belirsizlik sekmesi", {v:"disamb"}], ["Gözleri yaşlı bir adam…", {v:"disamb", sent:"Gözleri yaşlı bir adam bana baktı."}], ["Cümlede çözümle (Zemberek)", {v:"morph", word:"gözleri", sent:"Gözleri yaşlı bir adam bana baktı."}]]}
    ],
    quiz:[
      ["gel+di (gel → geldi) hangi morfolojik oluşumdur?", ["Çekim", "Yapım", "Birleştirme", "Önekleme"], 0, "Çekimde kökün anlamı ve sınıfı değişmez."],
      ["anahtar → anahtarcı hangi oluşumdur?", ["Çekim", "Yapım", "Birleştirme", "Alomorf"], 1, "Yapımda anlam ve sınıf değişir (isim → meslek ismi)."],
      ["açıkgöz (açık+göz) hangi oluşumdur?", ["Çekim", "Yapım", "Birleştirme", "Önekleme"], 2, "İki kök birleşiyor: birleştirme (compounding)."],
      ["“kütüphane-si-ne” geçerli, “kütüphane-ne-si” geçersiz. Bu hangi bileşenin bilgisidir?", ["Sözlük", "Morfotaktik", "Morfofonemik", "Belirsizlik giderme"], 1, "Eklerin sıralanma kuralları morfotaktiktir."],
      ["ağaç+a → ağaca (ç → c) hangi bileşenin bilgisidir?", ["Sözlük", "Morfotaktik", "Morfofonemik", "Çekim"], 2, "Ek eklenirken ses değişimi morfofonemiktir."],
      ["-lar ve -ler için doğru terim hangisidir?", ["Alomorf", "Kök", "Çevreleyen ek", "Yapım eki"], 0, "Aynı morfemin (çoğul) farklı gerçekleşmeleri alomorftur."],
      ["Morfolojik çözümleme (analysis) hangi yöndedir?", ["Sözcükselden yüzeye", "Yüzeyden sözcükseline", "Cümleden sözcüğe", "Sözlükten ekler"], 1, "Çözümleme yüzeyden sözcükseline, üretim sözcükselden yüzeye gider."],
      ["Türkçe bir sözcükte kökle birlikte ortalama kaç morfem bulunur?", ["1", "2", "3", "5"], 2, "Ortalama 3 morfem; ama sık sözcüklerin çoğu tek morfemlidir."],
      ["gez+me neden belirsizdir?", ["Kök sözlükte yok", "Olumsuz emir ya da eylemlik (isim) olabilir", "Ek sırası geçersiz", "Ünlü uyumu bozuk"], 1, "gez+me: “yürüme!” (olumsuz emir) ya da “bir yürüyüş” (eylemlik)."],
      ["okul+Noun+A3sg+P1sg+Nom sözcüksel biçimi hangi yüzey biçimine karşılık gelir?", ["okullar", "okulum", "okula", "okulu"], 1, "P1sg: 1. tekil iyelik: okulum."],
      ["Slayt 32'ye göre hangisi Türkçe için bir morfolojik belirsizlik giderme yöntemidir?", ["Ortalama perceptron", "CKY ayrıştırma", "Backoff", "PMI"], 0, "Slaytta ortalama perceptron, karar listeleri ve sinir ağı sayılır."],
      ["Belirsizlik gidermede “taban çizgisi” neyi seçer?", ["Sonraki sözcüğe uyan çözümlemeyi", "Sözcüğün eğitimde en sık görülen çözümlemesini", "Rastgele bir çözümlemeyi", "En uzun çözümlemeyi"], 1, "Taban çizgisi bağlama bakmaz; en sık çözümlemeyi seçer."],
      ["Karar listesinde bir sözcüğe birden çok kural uyarsa hangisi karar verir?", ["Listedeki son kural", "Güven sırasına göre ilk uyan kural", "Hepsinin oyu", "Rastgele biri"], 1, "Kurallar güvenilirliğe göre sıralanır; ilk uyan kural kazanır."],
      ["Ortalama perceptronda son ağırlıklar yerine ağırlıkların ortalaması neden kullanılır?", ["Eğitim hızlansın", "Aşırı uyma azalsın", "Daha çok özellik kullanılsın", "Adaylar sıralansın"], 1, "Son örneğe fazla uyan ağırlıkların etkisi ortalamayla yumuşar."]
    ]
  },

  3: {
    title:"Lecture 3 · Sözdizimi ve ayrıştırma",
    intro:"Cümle yapısı: bağlamdan bağımsız gramerler, olasılıklı gramerler, ayrıştırma algoritmaları ve bağımlılık ağaçları. Ayrıştırma ve Bağımlılık sekmeleri bu derse karşılık gelir.",
    sections:[
      {gut:"ders 3-1", h:"Sözdizimi ve gösterimleri", p:["<b>Sözdizimi</b>: sözcüklerden cümle ve öbek kurma kalıplarını inceler; sözcüklerin cümlenin bileşenlerini, bileşenlerin de cümleyi nasıl oluşturduğunu anlatır; morfoloji ile anlambilim arasındadır. Bir cümlenin dilbilgisel (well-formed) olup olmadığını açıklar; dilbilgisel bir cümle anlamlı olmak zorunda değildir.",
        "Sözdizimsel yapıyı tahmin etmeye <b>ayrıştırma (parsing)</b> denir. İki gösterim: <b>sözdizim ağacı</b> (bağlamdan bağımsız gramer, CFG) ve <b>bağımlılık ağacı</b> (dependency grammar)."], chips:[["Sözdizim ağacı", {v:"parse", preset:"pp"}], ["Bağımlılık ağacı", {v:"deps"}]]},
      {gut:"ders 3-1", h:"Bağlamdan bağımsız gramer (CFG)", p:["CFG dört parçalı bir yapıdır: <b>terminaller</b> (sözcükler ya da sözcük türleri), <b>terminal olmayanlar</b> (S, NP, VP, PP, Noun, Verb…), <b>kurallar</b> A → x (x sıfır ya da daha çok terminal/terminal olmayan dizisi) ve bir <b>başlangıç simgesi</b>. Dil özyinelemelidir (kural kendi sağ tarafında geçebilir). Sözdizimi belirsizdir: aynı cümle birden çok ağaca sahip olabilir (kids saw birds with binoculars: gözlük kimde?)."], chips:[["belirsiz cümle (PP bağlanması)", {v:"parse", preset:"pp"}], ["InClass 3 grameri", {v:"parse", preset:"inclass3"}]]},
      {gut:"ders 3-1", h:"Olasılıklı CFG (PCFG)", p:["PCFG, her kurala bir olasılık atar; bir ağacın olasılığı kullandığı kuralların olasılıklarının çarpımıdır; en olası ağaç seçilir. Aynı sol tarafa sahip kuralların olasılıkları toplamı 1'dir. Kural olasılıkları ağaç bankasından <b>en çok olabilirlik (MLE)</b> ile bulunur: P(A → β) = C(A → β) / C(A)."], chips:[["InClass 2 PCFG", {v:"parse", preset:"inclass2"}]]},
      {gut:"ders 3-1", h:"Ayrıştırma yöntemleri", p:["Amaç: en doğru (ya da herhangi/tüm) ağacı aramak. Yöntemler: <b>üstten alta</b> (başlangıç simgesinden cümleyi türet; derinlik öncelikli; sol özyinelemeli dilde A → A x sonsuz döngüye girer), <b>alttan üste</b> (sözcüklerden ağaca; shift-reduce), <b>CKY</b> (cümlenin dilde olup olmadığını dinamik programlamayla, tüm alt aralıklar için tablo doldurarak söyler) ve <b>Earley</b>. Öğrenci kipinde sekmedeki “Ayrıştırma yöntemleri” bölümü ilk ikisini adım adım gösterir; CKY tablosunu kendin doldurabilirsin."], chips:[["CKY tablosunu doldur", {v:"parse", preset:"inclass3"}]]},
      {gut:"ders 3-2", h:"Bağımlılık ağacı", p:["Bağımlılık ağacı, öbek türleri (NP, VP) olmadan sözcükler arasındaki yönlü kenarlardan oluşur; her kenar bir baş–bağımlı ilişkisidir ve etiket taşır (özne, nesne, belirteç…). Bir sözcük başka bir sözcüğün tümleci ya da niteleyicisiyse ona bağlıdır; baş, bağımlılarının (tümleçlerinin) sayısını belirler.",
        "Özellikler: <b>tek kök</b>, <b>bağlı</b> (her düğüm başka bir düğüme bağlı), <b>tek başlı</b> (kök hariç her düğümün tam bir gelen kenarı), <b>döngüsüz</b>. <b>Projektif</b>: her alt ağaç, cümlede ardışık bir aralığı kaplar (kenarlar kesişmez).", "Serbest sözcük sıralı dillerde (Türkçe) bağımlılık ağacı sözdizim ağacından daha anlamlıdır: SNPVP ile SVP NP sıralarının bağımlılık ağaçları hemen hemen aynıdır."], chips:[["BOUN cümlesi", {v:"deps"}]]},
      {gut:"ders 3-2", h:"Bağımlılık ayrıştırma ve Türkçe", p:["Yöntemler: dinamik programlama, <b>çizge tabanlı</b> (tam bağlı çizge, kenar puanları, en büyük kapsayan ağaç; MST) ve <b>geçiş tabanlı</b> (shift-reduce benzeri). Türkçede sözcükler çekim grupları (IG) içerir; sözcüğün son IG'si onun bağımlı olarak rolünü belirler. Ağaç bankası: UD Turkish-BOUN (universaldependencies.org); farklı bankalar farklı etiket kümeleri kullanabilir."], chips:[["BOUN: ağaç özellikleri", {v:"deps"}]]}
    ],
    quiz:[
      ["Bir CFG hangi dört parçadan oluşur?", ["Terminaller, terminal olmayanlar, kurallar, başlangıç simgesi", "Kökler, ekler, kurallar, sözlük", "Sözcükler, anlamlar, ilişkiler, rol", "Düğümler, kenarlar, kök, etiket"], 0, "CFG: terminal kümesi, terminal olmayan kümesi, A → x biçiminde kurallar ve başlangıç simgesi."],
      ["CKY ayrıştırması öncelikle neyi söyler?", ["Cümlenin kaç sözcük içerdiğini", "Cümlenin gramerin dilinde olup olmadığını", "Sözcüklerin anlamını", "En kısa yolu"], 1, "CKY: girdi cümle dilde mi, değil mi? Tablo üst hücresinde başlangıç simgesi varsa evet."],
      ["Sol özyinelemeli bir grameri (A → A x) derinlik öncelikli üstten alta ayrıştırırken ne olur?", ["Tek adımda biter", "Sonsuz döngüye girebilir", "Her zaman en olası ağacı bulur", "Alttan üste çalışır"], 1, "A, kendi sol tarafında yeniden genişletilir; budama olmazsa döngü hiç bitmez."],
      ["PCFG'de kural olasılığı en çok olabilirlikle nasıl bulunur?", ["C(A → β) / C(A)", "C(A) / C(A → β)", "C(A → β) · C(A)", "1 / kural sayısı"], 0, "Kuralın kullanım sayısı / sol tarafın toplam kullanım sayısı."],
      ["Bir bağımlılık ağacında kaç kök bulunur?", ["0", "Tam bir", "Sözcük sayısı kadar", "Yaprak sayısı kadar"], 1, "Tek kök, bağlı, tek başlı ve döngüsüz olması beklenir."],
      ["Aşağıdakilerden hangisi bağımlılık ağacının özelliği DEĞİLDİR?", ["Tek kök", "Döngüsüz", "Her düğümün (kök hariç) birden çok başı olabilir", "Bağlı"], 2, "Tek başlılık: kök hariç her düğümün tam bir gelen kenarı vardır."],
      ["Serbest sözcük sıralı bir dil için hangi gösterim daha anlamlıdır?", ["Bağımlılık ağacı", "Yalnızca sözdizim ağacı", "Hiçbiri", "Sözlük"], 0, "Bağımlılık ağacı sözcük sırasına daha az bağlıdır."],
      ["Shift-reduce ayrıştırma hangi yönde çalışır?", ["Üstten alta", "Alttan üste (sözcüklerden ağaca)", "Ortadan dışa", "Rastgele"], 1, "Sözcükler yığına konur (shift), kuralların sağ tarafı sol tarafla değiştirilir (reduce)."],
      ["Projektif bağımlılık ağacında…", ["Kenarlar kesişmez", "Her sözcüğün iki başı vardır", "Kök yoktur", "Döngü vardır"], 0, "Her alt ağaç ardışık bir aralığı kaplar; kesişen kenar yoktur."]
    ]
  },

  5: {
    title:"Lecture 5 · Korpus ve dil modelleri",
    intro:"Gerçek metinden olasılık öğrenmek: korpuslar, n-gram modelleri, yumuşatma ve PMI. Korpus ve N-gram sekmeleri bu derse karşılık gelir.",
    sections:[
      {gut:"ders 5", h:"Korpus", p:["<b>Korpus</b> (çoğul: corpora), dilin gerçek kullanımından örnekler içerir; dili modellemek için kullanılır, işlemeye ampirik kanıt sağlar. Belirli bir amaç için toplanır, anotasyon yapılır ve saklanır; metin, json, xml gibi biçimlerde, çoğu zaman özel biçimlerde bulunur; her alan/problem/dil için mevcut olmayabilir.",
        "<b>Veri</b>: girdi koleksiyonu. <b>Meta veri</b>: veri hakkında yan bilgi (yazar, dönem, kaynak). <b>Anotasyon</b>: veriye eklenen bilgi, çoğu zaman insanlarca elle yapılan etiket/ilişkiler. Özellikler: ortam (yazılı, konuşma, işaret dili, çokkipli), alan/kaynak, yazar/konuşan, dil (bir, iki, çok; paralel, karşılaştırılabilir), boyut, anotasyon düzeyi. Kullanım: NLP uygulamaları için eğitim/geliştirme/test kümeleri, sistem değerlendirme, kalıp keşfi, istatistiksel örnekleme."], chips:[["BOUN korpusu", {v:"corpus", name:"boun"}], ["Brown korpusu", {v:"corpus", name:"brown"}]]},
      {gut:"ders 5", h:"Örnek korpuslar", p:["İngilizce: <b>Brown Corpus</b> (500 metin, 1M sözcük, 15 tür, POS etiketli), Wall Street Journal, tweet veri kümeleri, Gigaword (~26 GB), Flickr 8k (görüntü altyazıları), Penn Treebank, Europarl, Wikipedia. Türkçe: Türkçe Ulusal Derlemi (TNC), paraphrase korpusu, Türkçe ağaç bankaları (BOUN, ...), TS Corpus, özetleme veri kümesi."], chips:[["BOUN: sıklık listesi", {v:"corpus", name:"boun"}]]},
      {gut:"ders 5", h:"Dil modeli", p:["<b>Dil modeli</b>, hangi sözcüklerin bir konuşan tarafından üretilmesinin daha olası olduğunu, ya da bir sözcük dizisinin dile ait olma olasılığını verir. Kullanım: makine çevirisi (P(dün çocuğu gördüm) > P(gördüm dün çocuğu)), yazım düzeltme (P(dün geldim ki) > P(dün geldm ki)), konuşma tanıma, dil tanıma, telefonda metin tamamlama.",
        "Hedef: bir cümleye olasılık atamak. Olasılıklar bir korpustan kestirilir; gerçek olasılık değil, iyi yaklaşımlar hedeflenir. Zincir kuralı: P(x1…xn) = P(x1)P(x2|x1)…P(xn|x1…xn-1). Tüm geçmişi saymak veri seyrekliği yaratır; çözüm, varsayımı basitleştirip geçmişi sınırlamaktır (<b>n-gram</b>)."], chips:[["N-gram modeli", {v:"ngram"}]]},
      {gut:"ders 5", h:"Bigram olasılığı ve slayt 24", p:["Bigram: P(wᵢ | wᵢ₋₁) = C(wᵢ₋₁ wᵢ) / C(wᵢ₋₁). Slayt 24'teki üç cümlelik korpus: <i>&lt;s&gt; I am Sam &lt;/s&gt;, &lt;s&gt; Sam I am &lt;/s&gt;, &lt;s&gt; I fly &lt;/s&gt;</i>. Unigram: P(I) = 3/8, P(am) = 2/8; bigram: P(I|&lt;s&gt;) = 2/3, P(Sam|&lt;s&gt;) = 1/3, P(am|I) = 2/3, P(fly|I) = 1/3. n büyüdükçe model daha doğru ama kestirimler zayıf ve tablolar seyrek olur; çoğunlukla n = 3 kullanılır."], chips:[["Slayt 24 korpusu", {v:"ngram", preset:"slayt"}], ["InClass 5", {v:"ngram", preset:"inclass5"}]]},
      {gut:"ders 5", h:"Log uzayı, yumuşatma, bilinmeyen sözcük", p:["<b>Log uzayında</b> çalışmak alt taşmayı önler ve çarpmayı toplamaya çevirir: log(P1·P2·P3) = log P1 + log P2 + log P3. Olasılığı sıfır bigram için <b>Laplace (add-one)</b>: her sayıma 1 eklenir, payda V kadar artar: (C(wᵢ₋₁ wᵢ) + 1) / (C(wᵢ₋₁) + V).",
        "<b>Backoff</b>: üçlü varsa onu kullan, yoksa ikiliye, yoksa tekliye düş. <b>Interpolation</b>: üçlü, ikili ve tekli olasılıkları her zaman ağırlıklarla karıştır. <b>Kapalı sözlük</b>: tüm sözcükler önceden bilinir; <b>açık sözlük</b>: bilinmeyen sözcükler (OOV) <i>UNK</i> simgesine çevrilir; yalnızca eşiğin üstündeki n-gramlar tutulur."], chips:[["Laplace", {v:"ngram", preset:"slayt", smooth:"laplace"}], ["Interpolation", {v:"ngram", preset:"inclass5", smooth:"interp"}], ["Brown: UNK ile karşılaştırma", {v:"ngram", src:"brown", smooth:"interp", unk:"1"}]]},
      {gut:"ders 5", h:"PMI", p:["PMI (pointwise mutual information) birlikte gelen sözcükleri bulur: iki sözcüğün birlikte görülme olasılığının, bağımsız olsalardı beklenen olasılığa oranının logaritması. Varsayım: anlamca benzer sözcükler benzer bağlamlarda geçer. Tüm belge yerine küçük bağlamlar (paragraf ya da ±k sözcüklük pencere) kullanılır; her sözcük, bağlam sözcüklerinin sayı vektörüyle temsil edilir."], chips:[["N-gram: PMI bölümü", {v:"ngram", src:"brown", smooth:"none"}]]}
    ],
    quiz:[
      ["Korpusun “meta verisi” nedir?", ["Veriye eklenen etiketler", "Veri hakkında yan bilgi (yazar, dönem, kaynak)", "Ham metnin kendisi", "Bir dil modeli"], 1, "Meta veri: depolanan veri hakkındaki yan bilgi. Anotasyon ise veriye eklenen (çoğu zaman elle) etiketlerdir."],
      ["Bigram olasılığı P(wᵢ | wᵢ₋₁) nasıl hesaplanır?", ["C(wᵢ₋₁ wᵢ) / C(wᵢ₋₁)", "C(wᵢ) / C(wᵢ₋₁)", "C(wᵢ₋₁) / C(wᵢ₋₁ wᵢ)", "C(wᵢ) / N"], 0, "MLE: ikilinin sayısı / ilk sözcüğün sayısı."],
      ["Slayt 24 korpusunda (I am Sam / Sam I am / I fly) P(I | <s>) kaçtır?", ["1/3", "2/3", "3/8", "1/2"], 1, "Üç cümlenin ikisi I ile başlıyor: 2/3."],
      ["Aynı korpusta Laplace ile P(I | <s>) kaçtır? (V = 5: I, am, Sam, fly, </s>)", ["2/3", "3/8", "3/5", "2/8"], 1, "(2 + 1) / (3 + 5) = 3/8."],
      ["Olasılıklarla log uzayında çalışmanın temel nedeni nedir?", ["Sonucu büyütmek", "Alt taşmayı önlemek ve çarpmayı toplamaya çevirmek", "Sıfır olasılığı gidermek", "Sözlüğü küçültmek"], 1, "Çok küçük olasılıkların çarpımı sıfıra taşar; log toplamı ise güvenlidir."],
      ["Backoff ve interpolation arasındaki fark nedir?", ["Fark yoktur", "Backoff, yüksek sıralı sayım yoksa daha kısa bağlama düşer; interpolation her zaman tüm düzeyleri ağırlıkla karıştırır", "Interpolation sayımları siler", "Backoff yalnızca unigram kullanır"], 1, "Backoff: gerektiğinde düşer; interpolation: her zaman karıştırır."],
      ["UNK simgesi ne işe yarar?", ["Cümle sonunu işaretler", "Bilinmeyen/nadir sözcüklere de olasılık verebilmeyi sağlar (açık sözlük)", "Noktalamayı siler", "Sözlüğü büyütür"], 1, "Eşiğin altındaki sözcükler UNK olur; bilinmeyen sözcük de UNK sayılır."],
      ["PMI neyi ölçer?", ["Bir sözcüğün sıklığını", "İki sözcüğün birlikte geçmesinin, bağımsız olsalardı beklenenden ne kadar farklı olduğunu", "Cümle uzunluğunu", "Sözcüğün uzunluğunu"], 1, "PMI(x,y) = log P(x,y) / (P(x) P(y))."],
      ["n-gram'da n büyüdükçe genel olarak ne olur?", ["Model daha doğru ama kestirimler zayıf ve tablolar seyrek olur", "Tablo küçülür", "Model daha az doğru olur", "Sayımlar artar"], 0, "Slayt: büyük n daha doğru model, ama zayıf/seyrek sayımlar."]
    ]
  },

  6: {
    title:"Lecture 6 · Derin öğrenme",
    intro:"Bu ders, sinir ağlarının katmanlı yapısından başlayıp eğitimde kayıp, gradyan ve geri yayılımı ele alır; ardından sözcükleri vektörlerle temsil etmeyi ve sıralı veriler için RNN'leri inceler. Son bölümde self-attention ve Transformer mimarisi, BERT, GPT ve T5 gibi encoder, decoder ve encoder-decoder modellerine bağlanır. Sıra, metni modele hazırlamaktan bağlamı temsil edip görev çıktısı üretmeye doğrudur.",
    sections:[
      {gut:"DL-1 · slayt 4–13", h:"Sinir ağı: girdiden dönüşümlere", p:[
        "<b>Sinir ağları</b>, veride doğrusal olmayan örüntüleri bulmak için birbirine bağlı düğümlerden oluşan model aileleridir. Girdi, ara dönüşümlerden geçirilir; böylece model yalnızca ham girdiye uygulanan lojistik regresyonla sınırlı kalmaz.",
        "Slaytta lojistik regresyon, gizli katmanı olmayan özel bir sinir ağı olarak gösterilir. <b>Nöron</b>, <b>katman</b> ve <b>aktivasyon işlevi</b> terimleri bu katmanlı hesaplamanın parçalarını adlandırır."
      ]},
      {gut:"DL-1 · slayt 14–20", h:"İleri yayılım ve ağ tasarımı", p:[
        "<b>İleri yayılım</b> girdiyi katman katman taşır. Bir katmandaki etkinleşme, önceki katmanın çıktısının ağırlıklarla birleştirilip bias eklenmesi ve aktivasyon işlevinden geçirilmesiyle elde edilir: a = g(W·x + b).",
        "Ağ tasarımında seçilenler arasında gizli katmanların sayısı, katman başına nöron sayısı ve aktivasyon işlevleri vardır. Slayttaki GPA ve deneyim örneği, bu ağırlık ve bias'larla lojistik regresyon çıktısı üretir."
      ]},
      {gut:"DL-1 · slayt 21", h:"Sınıflandırma çıktısı", p:[
        "<b>İkili sınıflandırmada</b> tek çıktı birimi iki sınıf sonucunu temsil eder. <b>Çok sınıflı sınıflandırmada</b> her sınıf için bir çıktı birimi kullanılır; slaytta çıktı vektörünün boyutu sınıf sayısına eşit gösterilir.",
        "Bu ayrım, ağın hangi çıktıyı üretmesi gerektiğini belirler: tek bir 0/1 sonucu ya da sınıflar üzerinde bir çıktı vektörü."
      ]},
      {gut:"DL-1 · slayt 22–29", h:"Aktivasyon işlevleri", p:[
        "<b>Sigmoid</b> girdiyi 0 ile 1 arasına taşır; slaytta ikili karar ve çıktı katmanı örneklerinde kullanılır. <b>tanh</b> −1 ile 1 arasında değer verir; <b>ReLU</b> negatif girdiyi 0 yapıp pozitif girdiyi olduğu gibi geçirir.",
        "<b>Softmax</b> bir değer vektörünü toplamı 1 olan olasılıklara dönüştürür. Slaytlar bu işlevleri grafik ve örneklerle ayırır; kullanım örnekleri arasında ikili ve çok sınıflı çıktılar bulunur."
      ]},

      {gut:"DL-2 · slayt 4–6", h:"Kayıp ve maliyet işlevi", p:[
        "Eğitim, ağırlık ve bias değerlerini tahmin hatasını küçültecek biçimde bulmayı hedefler. <b>Kayıp işlevi</b> tek bir tahminin hatasını niceler; <b>maliyet işlevi</b> eğitim örnekleri üzerindeki hatayı toplulaştırır.",
        "Slayt, lojistik regresyon için karesel hatanın ideal olmadığını ve model kendinden emin biçimde yanlış olduğunda <b>çapraz entropinin</b> daha büyük ceza verdiğini vurgular."
      ]},
      {gut:"DL-2 · slayt 7–10", h:"Gradyanla maliyeti azaltma", p:[
        "Bir işlevin türevi, parametrede küçük bir değişikliğin işlev değerini hangi yönde değiştirdiğini gösterir. Birden çok parametrede <b>gradyan</b>, her parametreye göre türevleri birlikte taşır.",
        "Maliyeti küçültmek için parametreler gradyanın gösterdiği yöne göre güncellenir; slayttaki çizimler güncellemelerin minimuma yaklaşmasını ve çok değişkenli durumu gösterir."
      ]},
      {gut:"DL-2 · slayt 11–27", h:"Ağırlık, bias ve geri yayılım", p:[
        "<b>Ağırlıklar</b> bağlantıların etkisini, <b>bias</b> ise nöronun toplama adımındaki ek terimi belirler. <b>Geri yayılım</b>, zincir kuralını kullanarak kaybın ağdaki ağırlık ve bias'lara göre gradyanını hesaplar.",
        "Hesap, çıktıdaki hatadan başlayıp önceki katmanlara doğru ilerler; ardından bu gradyanlar parametreleri güncellemek için kullanılır. Slaytlarda ağırlık ve bias türevleri ayrı izlenir; tüm eğitim örneklerinin katkısı maliyet gradyanında ortalanır."
      ]},
      {gut:"DL-2 · slayt 28–34", h:"Örnek güncelleme ve optimizer'lar", p:[
        "Slayttaki iki girdili örnekte önce gizli ve çıktı katmanlarının değerleri hesaplanır; sonra çıktı hatası ve gizli birimlerin hataları bulunarak ağırlıklar öğrenme oranıyla güncellenir.",
        "<b>Optimizer</b>, geri yayılımda hesaplanan gradyanların ağırlık ve bias güncellemelerine nasıl dönüştürüleceğini belirler. Slayt SGD, Momentum, RMSProp, Adam ve AdamW adlarını karşılaştırır; Adam için hareketli gradyan ortalaması, RMSProp için kareli gradyanların üstel ortalaması gösterilir."
      ]},

      {gut:"DL-3 · slayt 4–8", h:"Metin girdisini vektörleştirme", p:[
        "Sinir ağına sözcük vermek için metinsel simgeler sayısal gösterime çevrilir. <b>Sözlük</b>, farklı sözcükleri kapsar; <b>one-hot</b> gösterimde her sözcük için sözlük boyutunda, tek bir konumu 1 olan bir vektör kullanılır.",
        "Bu gösterimde farklı sözcük vektörleri ortogonaldir; slaytta, sözcüklerin anlam benzerliğini one-hot uzaklığından çıkaramayacağımız gösterilir. Sözlük büyüdükçe vektör boyutu da büyür."
      ]},
      {gut:"DL-3 · slayt 9–17", h:"Yoğun sözcük vektörleri ve bağlam", p:[
        "<b>Word embedding</b>, her sözcüğü daha küçük boyutlu yoğun bir vektörle temsil eder. Slayttaki amaç, benzer bağlamlarda görülen sözcüklerin vektörlerini de birbirine yakın öğrenmektir.",
        "<b>Dağılımsal anlambilim</b> fikri “sözcük, birlikte göründüğü sözcüklerden anlaşılır” biçiminde verilir. Bağlam, merkez sözcüğün çevresindeki sabit boyutlu pencereyle alınabilir; yakınlık için kosinüs benzerliği gösterilir."
      ], chips:[["BOUN korpusu", {v:"corpus", name:"boun"}], ["N-gram: PMI", {v:"ngram", src:"boun", smooth:"none"}]]},
      {gut:"DL-3 · slayt 18–24", h:"Word2Vec: CBOW ve Skip-Gram", p:[
        "<b>Word2Vec</b>, büyük bir metin korpusundan sözcük vektörleri öğrenme çerçevesi olarak tanıtılır. <b>CBOW</b>, çevre sözcüklerin vektörlerinden merkez sözcüğü tahmin eder; slayttaki örnek pencere merkezdeki “banking” sözcüğünü çevresinden tahmin eder.",
        "<b>Skip-Gram</b> yönü tersine çevirir: merkez sözcükten çevresindeki sözcükleri tahmin eder. Slaytta bu tahminin skorları softmax ile olasılığa dönüştürülür ve gerçek bağlam sözcüğünün olasılığını artıran bir amaçla öğrenme anlatılır."
      ]},
      {gut:"DL-3 · slayt 25–27", h:"Vektör benzerliği ve ağ girdisi", p:[
        "Vektörlerin kosinüs benzerliği ve sözcük analojileri, öğrenilmiş uzaydaki yakınlıkları incelemek için gösterilir. Slayttaki benzetme örneği `man : woman :: king : ?` biçimindedir.",
        "Sözcük embedding'leri sinir ağına one-hot girdiden sonra bir temsil katmanı olarak bağlanabilir. Bu bölüm, vektör temsillerini sonraki dizisel ve Transformer modellerine girdi olacak biçimde konumlandırır."
      ]},

      {gut:"DL-4 · slayt 4–11", h:"Ön işleme hattı", p:[
        "Slayttaki metin temsili hattı <b>standardize et → tokenize et → indeksle → kodla</b> adımlarını izler. Örnek standardizasyon işlemleri büyük/küçük harf, noktalama ve aksanları ele alma; bazı durumlarda stop word çıkarma ve stemming'dir.",
        "İndeksleme her farklı token'a bir tamsayı verir; kodlama bu indeksi vektöre çevirir. One-hot kodlama, token'ın sözlükteki indeksine karşılık gelen tek konumu 1 yapar."
      ], chips:[["Ön işlemeyi dene", {v:"tok", text:"İstanbul'da NLP çalışmak güzel! İstanbul'da."}]]},
      {gut:"DL-4 · slayt 13–16, 23–26", h:"Tokenization ve sözlük dışı sözcükler", p:[
        "<b>Tokenization</b>, metni daha küçük birimlere ayırır. Slaytlar sözcük, karakter ve alt-sözcük düzeylerini karşılaştırır; yöntem seçimi token sayısı, sözlük boyutu ve bilinmeyen sözcük sorununu etkiler.",
        "Sözcük düzeyinde daha önce görülmemiş bir sözcüğe indeks verilemeyebilir; eğitimde seyrek sözcükleri <b>&lt;UNK&gt;</b> ile değiştirmek bir çözümdür. Karakter düzeyi sözlüğü küçültür ve bilinmeyen sözcük sorununu azaltır, fakat dizileri uzatır."
      ], chips:[["Sözcük / karakter karşılaştır", {v:"tok", text:"Öğrencilerimizin kitaplarını bugün sınıfta yeniden okuyacağız."}]]},
      {gut:"DL-4 · slayt 17–22", h:"Alt-sözcük: BPE ve WordPiece", p:[
        "<b>Byte Pair Encoding (BPE)</b> örneğinde önce eğitim verisindeki karakterlerden başlangıç sözlüğü kurulur. Ardışık sembol çiftleri sayılır; en sık çift birleştirilip yeni sembol eklenir ve veri yeni sözlükle tekrar temsil edilir.",
        "Bu birleştirme seçilen sayıda adım boyunca yinelenir. <b>WordPiece</b> de alt-sözcük birleştirir, ancak slaytta BPE'den farklı olarak dil modeli olasılığını artıran birleştirmeyi seçtiği belirtilir."
      ], chips:[["Slayt örneğinde BPE'yi çalıştır", {v:"tok", preset:"bpe"}]]},
      {gut:"DL-4 · slayt 28–32", h:"Statik ve bağlamsal embedding", p:[
        "<b>Statik embedding</b> her sözcüğe tek, sabit bir vektör verir; aynı sözcüğün farklı cümlelerdeki gösterimi değişmez. Slayt, bunun hesaplama açısından daha hafif olmasına karşın bir sözcüğün farklı anlamlarını sınırlı yakaladığını belirtir.",
        "<b>Bağlamsal embedding</b> gösterimi cümlenin bağlamına göre üretir; aynı biçimli sözcük farklı cümlelerde farklı vektör alabilir. BERT örneğinde cümle önce alt-sözcük token'larına ayrılır, sonra Transformer bağlamı işler."
      ]},

      {gut:"DL-5 · slayt 4–8", h:"Sıralı veri ve RNN fikri", p:[
        "Konuşma tanıma, makine çevirisi, dil modelleme, adlandırılmış varlık tanıma ve duygu sınıflandırma slaytta <b>dizi verisi</b> örnekleri olarak yer alır. Girdi ve çıktı dizilerinin uzunluğu görevler arasında farklı olabilir.",
        "<b>RNN</b> aynı işlemi dizinin her adımında uygular; her çıktı, o adıma kadarki önceki hesaplamalardan etkilenir. Bu nedenle önceki bilgiyi bir “bellek” gibi taşıyabilir; sabit boylu ileri beslemeli ağ ise adımları bağımsız işler."
      ]},
      {gut:"DL-5 · slayt 10–15", h:"RNN mimarisi ve hücresi", p:[
        "RNN açılımında her zaman adımında bir girdi <b>x<sub>t</sub></b>, gizli durum <b>h<sub>t</sub></b> ve görev çıktısı <b>y<sub>t</sub></b> bulunabilir. Hücre önceki gizli durumu yeni girdiyle birleştirerek günceller: h<sub>t</sub> = tanh(W·[x<sub>t</sub>, h<sub>t−1</sub>]).",
        "Slaytlar tek-girdiden tek-çıktıya, tekten çoğa, çoktan teke ve çoktan çoğa eşlemeleri ayırır. Dizi uzunluğu sabit değilse örnekleri hizalamak için PAD sözcükleri eklenebilir."
      ]},
      {gut:"DL-5 · slayt 16–27", h:"LSTM, GRU ve RNN türleri", p:[
        "<b>LSTM</b>, uzun ve kısa süreli bağımlılıkları ele almak üzere hücre durumu ve kapılar kullanır. Unutma kapısı eski bellekten neyin çıkarılacağını, giriş kapısı yeni bilgiden neyin ekleneceğini, çıkış kapısı ise neyin dışarı verileceğini denetler.",
        "<b>GRU</b> güncelleme ve sıfırlama kapılarıyla gizli durumu birleştirir. Slayt ayrıca katmanları üst üste koyan derin/stacked RNN'yi ve diziyi iki yönde işleyen BiRNN'yi gösterir; Vanilla RNN, LSTM ve GRU yaygın türler olarak sıralanır."
      ]},
      {gut:"DL-5 · slayt 28–30", "h":"RNN ile sequence-to-sequence", p:[
        "Slayttaki RNN örneği her girdi sözcüğünü sırayla işler ve her adımda bir çıktı dağılımı üretir. <b>Sequence-to-sequence (Seq2Seq)</b> düzeninde encoder girdi dizisini işler, decoder ise temsil üzerinden çıktı dizisini adım adım üretir.",
        "Örnek diyagramda farklı uzunluktaki giriş ve çeviri dizileri eşlenir. Bu mimari, giriş ve çıktı uzunluklarının birbirine eşit olmasını gerektirmeyen görevleri gösterir."
      ]},

      {gut:"DL-6 · slayt 4–11", h:"Transformer: sıralı hesaplamadan dikkat katmanlarına", p:[
        "Slaytlar Transformer'ı uzun dizilerde girdinin farklı bölümlerine dikkat verebilen bir mimari olarak RNN ile karşılaştırır. RNN adımları sırayla hesaplarken Transformer'da bir katmanın girdileri üzerindeki attention hesapları paralel yapılabilir; bellek gereksinimi dizi uzunluğuyla birlikte büyür.",
        "Encoder tarafında <b>self-attention</b> ve feed-forward katmanları; decoder tarafında bunlara ek olarak <b>encoder-decoder attention</b> bulunur. Encoder çıktıları decoder'a bağlanır."
      ]},
      {gut:"DL-6 · slayt 13–16", h:"Self-attention: Query, Key ve Value", p:[
        "<b>Self-attention</b>, dizideki her öğenin diğer öğelere bakarak temsilini güncellemesini sağlar. Her girdi temsili <b>Query (Q)</b>, <b>Key (K)</b> ve <b>Value (V)</b> vektörleriyle kullanılır: sorgu ne arandığını, anahtar ne bulunduğunu, değer ise alınacak bilgiyi temsil eder.",
        "Q·K benzerlik skorları anahtar boyutunun kareköküne bölünür, <b>softmax</b> ile ağırlıklara çevrilir ve Value vektörleri bu ağırlıklarla birleştirilir. Slayttaki iki sözcüklü örnekte 112 ve 96 skorları 8'e bölünür; 0.88 ve 0.12 ağırlıkları elde edilir."
      ]},
      {gut:"DL-6 · slayt 17–21", h:"Matris hesabı ve multi-head attention", p:[
        "Self-attention hesabı matrislerle topluca yapılabilir: girdi temsilleri Q, K ve V matrislerine dönüştürülür; ölçeklenmiş QK<sup>T</sup> skorlarına softmax uygulanıp V ile çarpılır.",
        "<b>Multi-head attention</b>, hesabı farklı öğrenilmiş dönüşümlerle birden çok attention head'de yürütür. Slayttaki akış head çıktılarını birleştirir ve öğrenilen bir ağırlık matrisiyle projekte eder."
      ]},
      {gut:"DL-6 · slayt 22–30", h:"Konumsal bilgi, residual ve decoder", p:[
        "Self-attention tek başına girdilerin sırasını bilmez. <b>Positional encoding</b>, sözcük embedding'lerine konum sinyali ekleyerek sıra bilgisini katmana taşır.",
        "Encoder bloğunda self-attention ve feed-forward alt katmanlarının çevresinde <b>residual bağlantılar</b> ile Add &amp; Normalize adımları gösterilir. Decoder, önceki çıktılardan sıradaki token'ı üretir; doğrusal katman ve softmax sözlük üzerindeki dağılımı verir."
      ]},

      {gut:"DL-7 · slayt 4–13", h:"Encoder modelleri ve BERT ön eğitimi", p:[
        "Slaytlar Transformer katman türlerini encoder (BERT), decoder (GPT) ve encoder-decoder (T5) olarak ayırır. <b>ELMo</b>, iki ayrı yönde eğitilen dil modellerinden elde edilen önceden eğitilmiş gösterimleri örnekler; <b>BERT</b> çift yönlü bağlamdan gösterim öğrenir.",
        "BERT ön eğitimi iki hedefle anlatılır: <b>Masked Language Modeling (MLM)</b> seçilen token'ları tahmin eder; <b>Next Sentence Prediction (NSP)</b> iki segmentin ardışık olup olmadığını sınıflandırır. Slaytta token'ların %15'inin seçildiği, seçilenlerin %80'inin [MASK], %10'unun rastgele sözcük ve %10'unun değişmeden bırakıldığı belirtilir."
      ]},
      {gut:"DL-7 · slayt 14–21", h:"BERT'i görevler için uyarlama", p:[
        "BERT bir kez ön eğitilip farklı görevler için ince ayar görebilir. Cümle çifti görevlerinde [CLS] gösteriminin üzerine sınıflandırıcı eklenir; iki cümle [SEP] ile ayrılır.",
        "Tek cümle sınıflandırması, soru-cevapta başlangıç/bitiş konumlarını bulma ve token düzeyinde etiketleme slaytta farklı çıktı başlıklarıyla gösterilir. Adlandırılmış varlık tanıma, token düzeyindeki görevlere örnektir."
      ]},
      {gut:"DL-7 · slayt 23–32", h:"Decoder modeli: GPT ve üretim", p:[
        "<b>GPT</b>, bir dizinin sonraki token'ını tahmin ederek otoregresif olasılık modeli kurar: P(t<sub>1</sub>,…,t<sub>n</sub>) = P(t<sub>1</sub>) ∏ P(t<sub>i</sub> | t<sub>1</sub>,…,t<sub>i−1</sub>). Üretilen token öneke eklenir ve aynı işlem yinelenir.",
        "<b>Greedy decoding</b> her adımda en olası token'ı seçer; <b>beam search</b> en iyi k diziyi tutar; <b>top-k sampling</b> en olası k token arasından örnekler ve sıcaklık dağılımı ayarlar. Slayt, tam en olası diziyi bulmanın üstel arama uzayında zor olduğunu ve bu yöntemlerin yaklaşık arama kullandığını belirtir."
      ]},
      {gut:"DL-7 · slayt 34–36", h:"Encoder-decoder: T5 ve metinden metne", p:[
        "<b>T5</b>, encoder-decoder mimarisini metin girdisinden metin çıktısı üretmek için kullanır. Slayttaki örnekler çeviri, özetleme ve sınıflandırma gibi görevleri göreve özgü bir önekle metin biçiminde ifade eder.",
        "Model, denetimsiz ve denetimli görevlerin karışımı üzerinde ön eğitilip sonraki görevlere ince ayarlanır; slayt bunu <b>transfer learning</b> olarak vurgular. Son slayt modellerin evrimini bir ağaçta gösterir; ağaçtaki ayrıntılar bu derste daha fazla açıklanmıyor."
      ]}
    ],
    quiz:[
      ["Slaytta sinir ağları hangi tür örüntüleri bulmak üzere tasarlanmış model aileleri olarak tanımlanır?", ["Yalnızca doğrusal örüntüler", "Doğrusal olmayan örüntüler", "Yalnızca sözcük sıklıkları", "Sadece sıralama hataları"], 1, "Sinir ağları veride doğrusal olmayan örüntüleri bulmayı hedefleyen mimariler olarak tanıtılır (DL-1, slayt 4)."],
      ["Lojistik regresyon, sinir ağı olarak nasıl gösterilir?", ["Gizli katmanı olmayan özel bir sinir ağı", "Yalnızca üç gizli katmanı olan ağ", "Geri yayılımsız RNN", "Bir embedding sözlüğü"], 0, "Slayt 13, lojistik regresyonu gizli katmanı olmayan özel bir sinir ağı olarak gösterir (DL-1, slayt 13)."],
      ["Bir katmanda ağırlıklı girdi ve bias'tan sonra hangi işlem gösterilir?", ["Sadece tokenization", "Aktivasyon işlevi", "Korpus indeksleme", "Beam search"], 1, "İleri yayılımda katman hesabı aktivasyon işlevinden geçirilir (DL-1, slayt 14)."],
      ["İkili sınıflandırma için slaytta hangi çıktı düzeni verilir?", ["Sınıf başına bir gizil katman", "Tek çıktı birimi", "Her token için iki decoder", "Sözlük boyutunda bir girdi"], 1, "İkili sınıflandırma bir çıktı birimiyle; çok sınıflı durum K çıktı birimiyle gösterilir (DL-1, slayt 21)."],
      ["Softmax'ın slaytta anlatılan işlevi nedir?", ["Bir vektörü toplamı 1 olan olasılıklara çevirmek", "Negatif girdileri sıfırlamak", "Diziyi ters çevirmek", "Ağırlıkları sabitlemek"], 0, "Softmax, girdi vektörünü toplamı 1 olan olasılıklara dönüştürür (DL-1, slayt 25)."],
      ["Slayttaki ReLU tanımı hangisidir?", ["Çıktıyı her zaman 0 ile 1 arasına sıkıştırır", "Negatif girdiyi 0 yapar, pozitif girdiyi değiştirmez", "Girdileri olasılığa böler", "Her girdinin işaretini ters çevirir"], 1, "ReLU negatif girdiyi 0'a eşler, pozitif girdiyi olduğu gibi bırakır (DL-1, slayt 24)."],

      ["Eğitimde ağırlık ve bias'lar için hedef nedir?", ["Maliyet işlevini küçülten değerleri bulmak", "Sözlük boyutunu büyütmek", "Token sırasını değiştirmek", "Her girdiyi aynı yapmak"], 0, "Eğitim, maliyet işlevini küçülten ağırlık ve bias değerlerini arar (DL-2, slayt 4)."],
      ["Slayta göre lojistik regresyonda karesel hata için hangi ifade kullanılır?", ["Her durumda en iyi kayıp", "İdeal olmayan bir kayıp", "Bir optimizer", "Bir tokenization türü"], 1, "Slayt, karesel hatanın lojistik regresyon için ideal olmadığını ve çapraz entropinin kendinden emin yanlış tahminleri cezalandırdığını söyler (DL-2, slayt 5–6)."],
      ["Bir işlevin türevi, slayttaki açıklamaya göre neyi anlatır?", ["Parametre sayısını", "Küçük bir parametre değişiminde işlevin nasıl değiştiğini", "Sözlükteki OOV oranını", "Ağın katman türünü"], 1, "Türev, parametrede küçük bir artışın işlev değerinde oluşturduğu değişimi gösterir (DL-2, slayt 7)."],
      ["Backpropagation gradyanları hangi ilkeyle hesaplar?", ["Zincir kuralı", "En uzun önek", "Kosinüs uzaklığı", "Sözlük sıralaması"], 0, "Geri yayılım, kaybın ağırlıklara göre gradyanını zincir kuralıyla hesaplar (DL-2, slayt 17)."],
      ["Geri yayılım ağırlık güncellemesinde slaytta hangi üç terim çarpılır?", ["Öğrenme oranı, birim hata terimi ve girdinin/önceki çıktının değeri", "Sözlük boyutu, katman sayısı ve token uzunluğu", "Q, K ve softmax", "Korpus boyutu, pencere ve PMI"], 0, "Örnek güncelleme Δwᵢⱼ = η·δⱼ·Oᵢ biçimindedir (DL-2, slayt 28–31)."],
      ["Slaytta optimizer'ın görevi nasıl açıklanır?", ["Kayıp gradyanlarına göre ağırlık ve bias'ların güncellenmesini belirlemek", "Token'ları cümleye çevirmek", "Girdi sözlüğünü sıralamak", "Hangi etiketin doğru olduğunu seçmek"], 0, "Optimizer, hesaplanan gradyanlarla ağırlık ve bias'ların nasıl güncelleneceğini belirler (DL-2, slayt 32)."],

      ["One-hot gösterimde sözcük vektörünün boyutu neye eşittir?", ["Cümle sayısına", "Sözlükteki sözcük sayısına", "Gizli katmandaki bias sayısına", "Bağlam penceresinin yönüne"], 1, "Slaytta one-hot vektör boyutunun sözlük boyutuna eşit olduğu belirtilir (DL-3, slayt 5–6)."],
      ["Slaytta iki farklı one-hot vektör için hangi sorun vurgulanır?", ["Aralarındaki uzaklık anlam benzerliğini yansıtmaz", "Her zaman aynı sözcüğü gösterirler", "Sözlükte indeks taşımazlar", "RNN tarafından kullanılamazlar"], 0, "Farklı one-hot vektörleri ortogonaldir; uzaklıkları sözcüklerin anlamına bağlı değildir (DL-3, slayt 8)."],
      ["Yoğun word embedding'ler için slayttaki hedef hangisidir?", ["Sık benzer bağlamlarda görülen sözcükleri vektör uzayında yakınlaştırmak", "Her sözcüğü tek bir karaktere çevirmek", "Sözcük sırasını kaldırmak", "Kayıp işlevini optimizer'a dönüştürmek"], 0, "Slayt 9, benzer bağlamlarda görülen sözcüklerin vektörlerinin yakın olmasını hedefler (DL-3, slayt 9)."],
      ["CBOW modeli hangi tahmini yapar?", ["Merkez sözcükten bağlamı", "Bağlam sözcüklerinden merkez sözcüğü", "Cümle etiketinden sözlüğü", "Bir sonraki cümleden önceki token'ı"], 1, "CBOW, çevre sözcüklerden merkez sözcüğü tahmin eder (DL-3, slayt 18–23)."],
      ["Skip-Gram'ın CBOW'a göre yönü nasıldır?", ["Merkez sözcükten çevre sözcükleri tahmin eder", "Karakterlerden sözlük indeksini çıkarır", "Çevreden tek bir cümle etiketi üretir", "Sadece cümle çiftlerini sınıflandırır"], 0, "Skip-Gram, merkez sözcükten çevre sözcükleri tahmin eder (DL-3, slayt 24)."],
      ["Kosinüs benzerliği vektörler arasında neyi karşılaştırır?", ["Yalnızca bileşen sayısını", "Vektörlerin yönünü", "Sözlük indekslerinin sırasını", "Korpus cümlelerinin uzunluğunu"], 1, "Slayt, sözcük gösterimleri için kosinüs benzerliğini kullanır (DL-3, slayt 7)."],

      ["Slayttaki metin ön işleme hattının sırası hangisidir?", ["İndeksle → standardize et → kodla → tokenize et", "Standardize et → tokenize et → indeksle → kodla", "Kodla → tahmin et → tokenize et → standardize et", "Tokenize et → decoder → embedding → indeksle"], 1, "Hattın adımları standardize etme, tokenization, indeksleme ve kodlamadır (DL-4, slayt 4–11)."],
      ["Tokenization ne yapar?", ["Metni daha küçük token birimlerine ayırır", "Ağırlıkları gradyanla günceller", "Her sözcüğü bağlamdan bağımsız yorumlar", "Encoder çıktısını sınıflandırır"], 0, "Tokenization, metni sözcük veya alt-sözcük gibi daha küçük sembol birimlerine böler (DL-4, slayt 13)."],
      ["Sözlükte olmayan bir sözcük için slaytta verilen sözcük-düzeyi çözüm nedir?", ["Onu önceden özel bir bilinmeyen token'a eşlemek", "Sözcüğü her cümlede silmek", "Bir yeni attention head eklemek", "Onu tüm karakterlere çevirmek"], 0, "Slayt, eğitimde seyrek sözcükleri özel <UNK> token'ıyla değiştirip testte de kullanmayı önerir (DL-4, slayt 13)."],
      ["Slayttaki BPE adımında hangi sembol çifti birleştirilir?", ["En seyrek çift", "En sık görülen ardışık çift", "Sözlüğün ilk ve son token'ı", "Rastgele seçilen tek karakter"], 1, "BPE örneğinde en sık görülen karakter/alt-sözcük çifti birleştirilir ve süreç yinelenir (DL-4, slayt 17–21)."],
      ["WordPiece, BPE'den hangi seçim ölçütüyle ayrılır?", ["En uzun cümleyi seçer", "Dil modeli olasılığını en çok artıran birleşimi seçer", "Yalnızca tek harfleri kullanır", "Yalnızca noktalama işaretlerini birleştirir"], 1, "Slayt, WordPiece'in olasılık artışına göre birleştirme seçtiğini belirtir (DL-4, slayt 22)."],
      ["Bağlamsal embedding'lerde aynı sözcük için hangi durum mümkündür?", ["Her zaman aynı vektör kullanılır", "Farklı cümle bağlamlarında farklı vektör üretilir", "Sözcük indeksi bulunmaz", "Sadece karakter sayısı değişir"], 1, "Slaytta dinamik/bağlamsal gösterimin aynı sözcük için cümle bağlamına göre değişebildiği anlatılır (DL-4, slayt 28–30)."],

      ["RNN'in sıralı veriye yönelik temel fikri nedir?", ["Her adımda aynı işi yapıp önceki hesaplamaların bilgisini kullanmak", "Tüm girdileri birbirinden bağımsız işlemek", "Sadece son token'ı one-hot yapmak", "Her cümleyi aynı uzunluğa indirmek"], 0, "RNN her dizi öğesinde aynı görevi yineler; çıktı önceki hesaplamalara bağlıdır (DL-5, slayt 7)."],
      ["RNN adımındaki girdi genellikle hangi simgeyle gösterilir?", ["xₜ", "Wᴼ", "V", "CLS"], 0, "Slayt, her zaman adımındaki girdiyi xₜ ile gösterir (DL-5, slayt 8)."],
      ["Vanilla RNN hücresinin gizli durumu neye dayanır?", ["Yalnızca gelecekteki çıktı etiketine", "Mevcut girdiye ve önceki gizli duruma", "Sadece sözlük boyutuna", "Yalnızca bias'a"], 1, "Hücre hₜ'yi xₜ ve hₜ₋₁ kullanarak hesaplar (DL-5, slayt 15)."],
      ["LSTM unutma kapısının rolü nedir?", ["Bellekten hangi bilginin atılacağını denetlemek", "Sözlüğe yeni bir indeks eklemek", "Çıktı dizisini tokenize etmek", "Decoder'ı tamamen kaldırmak"], 0, "Unutma kapısı bellekteki hangi bilginin atılacağını kontrol eder (DL-5, slayt 18)."],
      ["BiRNN nasıl bilgi işler?", ["Diziyi yalnızca soldan sağa", "Diziyi ileri ve geri yönlerde", "Sadece tek bir merkez token'ı", "Decoder çıktısını rastgele sırada"], 1, "BiRNN diyagramları diziyi ileri ve geri yönlerde işleyen iki akışı gösterir (DL-5, slayt 25–26)."],
      ["Seq2Seq mimarisinde encoder ve decoder'ın iş bölümü nedir?", ["Encoder girdi dizisini işler, decoder çıktı dizisini üretir", "Encoder token seçer, decoder sözlüğü oluşturur", "İkisi de sadece maliyet hesaplar", "Encoder çıktı olasılığı, decoder girdi padding'i üretir"], 0, "Slayt, encoder'ın girdiyi işlediği ve decoder'ın çıktı dizisini ürettiği düzeni gösterir (DL-5, slayt 29–30)."],

      ["Slaytta Transformer'ın RNN'e göre belirtilen bir avantajı nedir?", ["Dizideki sonraki durumları yalnızca önceki adım bitince hesaplaması", "Attention hesaplarını girdiler üzerinde paralel yapabilmesi", "Daha az bellek kullanması her durumda", "Sıra bilgisini kendiliğinden taşıması"], 1, "Transformer attention hesaplarının paralelleştirilebildiği belirtilir; slayt ayrıca bellek maliyetinin büyüdüğünü de not eder (DL-6, slayt 5)."],
      ["Self-attention'da Query, Key ve Value hangi karşılıklarla açıklanır?", ["Ne arıyoruz, neye sahibiz, ne elde ediyoruz", "Girdi, kayıp, optimizer", "Sözlük, indeks, karakter", "Encoder, decoder, sınıf etiketi"], 0, "Slayt Q/K/V'yi aranan, elde olan ve elde edilen bilgi olarak açıklar (DL-6, slayt 14)."],
      ["Self-attention skorları softmax öncesinde slayttaki örnekte neye bölünür?", ["Dizi uzunluğuna", "Anahtar boyutunun kareköküne", "Sözlük boyutuna", "Head sayısının karesine"], 1, "Scaled dot-product attention, QKᵀ skorlarını √dₖ ile ölçekler (DL-6, slayt 15)."],
      ["Birden çok attention head'in çıktıları sonrasında ne yapılır?", ["Birleştirilip öğrenilmiş bir ağırlık matrisiyle dönüştürülür", "Tamamen atılır", "Sözlükte alfabetik sıralanır", "Sadece bir tanesi korunur"], 0, "Multi-head akışında head çıktıları birleştirilip Wᴼ ile projekte edilir (DL-6, slayt 19–21)."],
      ["Transformer'da positional encoding neden eklenir?", ["Self-attention katmanı girdi sırasını tek başına bilmediği için", "Softmax'ın toplamını 1 yapmak için", "RNN hücresini eğitmek için", "Bilinmeyen token'ı kaldırmak için"], 0, "Slayt, attention'ın sırayı kendiliğinden dikkate almadığını ve konumsal sinyal eklendiğini gösterir (DL-6, slayt 13, 22–23)."],
      ["Decoder'ın çıktı katmanında sıradaki token dağılımı nasıl üretilir?", ["Doğrusal katman ve softmax ile", "Sadece BPE birleştirmesiyle", "PMI ve kosinüsle", "Unutma kapısıyla"], 0, "Decoder çıktısı doğrusal katman ve softmax üzerinden sözlük olasılıklarına çevrilir (DL-6, slayt 27–29)."],

      ["Slaytlarda BERT hangi bağlam türünden gösterim öğrenir?", ["Yalnızca soldan sağa", "Çift yönlü bağlam", "Sadece sonraki cümle", "Karakter başına sabit sözlük"], 1, "BERT bölümü, hem sol hem sağ bağlamın sözcük anlamını anlamada önemli olduğunu vurgular (DL-7, slayt 6)."],
      ["BERT'in MLM hedefi neyi yapar?", ["Maskelenmiş token'ı tahmin eder", "Bir sonraki cümlenin uzunluğunu seçer", "Sadece decoder beam'ini sıralar", "Ağırlıkların normunu hesaplar"], 0, "Masked Language Modeling, maskelenen sözcükleri girdinin kalanından tahmin eder (DL-7, slayt 7–9)."],
      ["Slaytta seçilen maskeli token'ların yüzde kaçı [MASK] ile değiştirilir?", ["%10", "%15", "%80", "%100"], 2, "Seçilen token'ların %80'i [MASK], %10'u rastgele sözcük, %10'u değişmeden bırakılır (DL-7, slayt 9)."],
      ["BERT'in cümle çifti sınıflandırma düzeninde iki segmenti hangi özel token ayırır?", ["[CLS]", "[MASK]", "[SEP]", "[PAD]"], 2, "Cümle çiftinde segmentleri ayırmak için [SEP] kullanılır (DL-7, slayt 18)."],
      ["GPT slaytında otoregresif üretim nasıl ilerler?", ["Her adımda öneke koşullu sonraki token tahmin edilir ve öneke eklenir", "Önce tüm çıktılar paralel üretilir", "Yalnızca cümlenin sınıfı seçilir", "Girdi önce ters çevrilip atılır"], 0, "GPT her adımda önceki token'lara koşullu sonraki token'ı seçip diziyi uzatır (DL-7, slayt 25–28)."],
      ["T5'in slaytlarda öne çıkan görev yaklaşımı nedir?", ["Görevleri metinden metne biçiminde ifade etmek", "Yalnızca sabit boyutlu sınıf kimliği üretmek", "Girdi token'larını tamamen kaldırmak", "Yalnızca tek yönlü embedding kullanmak"], 0, "T5 görev önekleriyle çeviri, özetleme ve sınıflandırma gibi görevleri metin biçiminde ele alır (DL-7, slayt 34–35)."]
    ]
  }
};
