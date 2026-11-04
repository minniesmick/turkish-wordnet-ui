# Copilot görevleri: ortak kurallar (her adımdan önce oku)

Bu klasördeki numaralı dosyalar sırayla verilir. Her adım ayrı bir sohbette, **Agent modunda** yapılır. Bu dosya hepsi için geçerlidir. Adım dosyası ile çelişirse adım dosyası kazanır.

## Proje

`turkish-wordnet-ui`: MEF Üniversitesi COMP 451 (Doğal Dil İşleme, Dr. Seniz Demir, Güz 2026) için yerel çalışma uygulaması. Python 3 standart kütüphane sunucusu (`server.py`, port 8770) + vanilla ES modülü JS (`static/js/*.js`) + tek CSS (`static/css/app.css`) + tek HTML kabuğu (`static/index.html`). **Derleme adımı yok.** Ders sırasıyla ilerleniyor; her konu bir sekme ya da Ders sekmesinde bir bölüm olur. Önce `README.md`, `TODO.md`, `DESIGN.md`, `PRODUCT.md` oku.

## Değişmez kurallar

1. **Sunucu yalnızca yerel kalır** (`127.0.0.1` ve `::1`). `server.py`'nin bağlama adresine, CORS'a dokunma. Yeni uç nokta gerekirse yalnızca veri okuyan, yerel dosyadan çalışan bir `GET` ekle; adım dosyası izin vermedikçe `server.py`'ye dokunma.
2. **Yeni bağımlılık yok:** npm paketi, CDN, internetten veri / yazı tipi, makine öğrenmesi kütüphanesi (TensorFlow.js, ONNX, vb.) yok. Her şey saf JS (gerekirse Python standart kütüphanesi). Hesaplar **gerçek** olsun: sahte / önceden hesaplanmış sayı gösterme.
3. **Araç / Öğrenci kipi (dokunulmaz kural):** Araç kipinde yalnızca sonuç görünür. Slayt göndermeleri, formüller, "neden" açıklamaları, adım adım izler, alıştırmalar, sınavlar `.stu` sınıfıyla işaretlenir ve Araç kipinde CSS ile gizlenir (`body:not(.student) .stu{display:none!important}`). Tamamen öğretici sekmeler `STUDENT_VIEWS` (`core.js`) içindedir. **Her ekranı iki kipte de kontrol et.**
4. **Hesap ile arayüz ayrı:** saf hesap `static/js/<ad>.js` (DOM yok, Node'da test edilir), arayüz ayrı modül. Örnekler: `lm.js` ↔ `ngram.js`, `md.js` ↔ `disamb.js`, `fsm.js` ↔ `fsmquiz.js`. Her yeni hesap modülü için `scripts/test_<ad>.mjs` yaz (el hesabıyla doğrulanmış değerler, kenar durumlar). Testler `node scripts/test_x.mjs` ile çalışır ve hata varsa `process.exitCode = 1`.
5. **Mevcut testler yeşil kalır:** `test_turkish.mjs`, `test_fsm.mjs`, `test_lm.mjs`, `test_mle.mjs`, `test_parsers.mjs`, `test_md.mjs`, `test_zmap.mjs`. Her adımın sonunda hepsini çalıştır.
6. **Tasarım dili:** `DESIGN.md` ve `app.css` başındaki tokenlar (`--spot` yalnızca tıklanabilir / odaktaki öğede, kategoriler çizgi biçimiyle, 1px kenarlık, sert gölge yok). Mevcut sınıfları yeniden kullan (`.ng-h`, `.ng-tbl`, `.ng-ctl`, `.seg`, `.chip`, `.btn`, `.lesson`, `.gut` ...); yeni sınıfa ancak gerçekten gerekirse, önekli (örn. `.at-*`) ve `app.css`'in sonuna, yorum başlığıyla ekle. Açık ve koyu tema, 375 px mobil, klavye ve odak göstergesi bozulmasın. Renk tek başına bilgi taşımasın.
7. **Dürüstlük:** yöntemin sınırlarını ve veri boyutunu arayüzde ve `TODO.md` "Bilinen kısıtlar" bölümünde belirt. Doğruluk sayılarını ölçerek yaz; ölçmediğini "doğrulandı" diye yazma.
8. **Türkçe arayüz metni.** Commit mesajları ve belgeler Türkçe düz yazı; kod yorumları mevcut dosyadaki üsluba uysun (kısa, Türkçe).
9. **Hiçbir mevcut özelliği silme veya bozma.** Mevcut `id`, `data-*`, sınıf adlarını yeniden adlandırmadan önce `grep` ile tüm kullanımları bul. Bilinen tuzak: bağımlılık sekmesi `data-dv` kullanır, `data-view` değil (`#app[data-view]` ile çakışır).
10. **Git:** `main` üzerinde değil, adım için yeni yerel dalda çalış (`dl/<adım-adı>`). Mantıklı parçalara bölünmüş Türkçe commit'ler. **Push yok, merge yok.** Bitince bana özet ver. Ekran görüntülerini `docs/ui-review/` altına koy (git'e girmez, `.gitignore`'da).
11. **Zemberek isteğe bağlıdır** (`lib/zemberek-full.jar`, JDK). Yokken özellikler düşmeli ama çökmemeli.

## Nasıl doğrulayacaksın

- Sunucu: `python server.py` → `http://localhost:8770/?v=<görünüm>`. Tarayıcı aracın varsa (Simple Browser / Playwright) **gerçekten aç, tıkla, konsolu oku**. Aracın yoksa bunu söyle; **görmeden "oldu" deme.**
- ES modülleri önbelleğe alınır; değişiklik görünmüyorsa sert yenile.
- Kenar durumlarını dene: boş girdi, çok uzun girdi, Türkçe karakterler (İ/ı, ç ğ ö ş ü), 375 px, koyu tema.
- Yeni sekme eklerken `core.js`'te `VIEWS`, `VIEW_LABEL`, `VIEW_ICON` (yoksa `P`'ye ikon), `VIEW_KEY` (kısayol, çakışmasın), `index.html`'de `<section id="v-...">`, `main.js`'te `import`, `ui.js`'te `KEYS` metni, kabuktaki ders gruplaması (varsa) güncellenmeli. Bir önceki sekme eklenme biçimi için `git log -p -- static/js/disamb.js` ve `git log --oneline` bak.
- Slayt PDF'leri `C:\Users\alper\Downloads\` altında. Çoğu görsel ağırlıklı: metni `PyMuPDF` (`fitz`) ile çıkar, **görsel / şekil / formül sayfalarını PNG'ye çevirip gör** (görme yeteneğin yoksa metinle yetin ve eksik kalan şekilleri raporda listele). PDF'leri repoya kopyalama.

## Adımlar (sırayla; ben "devam" dedikçe)

| # | Dosya | İş |
|---|---|---|
| 1 | `01-lecture6-ders.md` | DL-1…DL-7 slaytlarından Ders sekmesine "Lecture 6" (bölümler + sorular) |
| 2 | `02-metin-temsili.md` | Metin temsili laboratuvarı: ön işleme, tokenization (BPE adım adım), DL-4 |
| 3 | (sonra) | Word embedding laboratuvarı: BOUN üzerinde küçük embedding, en yakın komşular, DL-3/4 |
| 4 | (sonra) | Self-attention laboratuvarı: Q·Kᵀ, softmax, ısı haritası, maskeleme, DL-6/7 |
| 5 | (sonra) | RNN açılımı laboratuvarı, DL-5 |
| 6 | (sonra) | Küçük sinir ağı eğitimi: ileri / geri yayılım, kayıp, karar sınırı, DL-1/2 |

Yalnızca ben istediğim adımı yap; sonrakilere geçme.
