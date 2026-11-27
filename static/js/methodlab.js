// Proje 1 · Metot sekmesi: COMP 451 Project#1 (İngilizce tweet duygu analizi) yönteminin ve gerçek sonuçlarının anlatımı.
// Veri: /proj1/data.json (comp451-project1/export_app_data.py üretir). Öğretici anlatım .stu ile işaretli (Öğrenci kipinde görünür).
import {$, esc, registerView} from "./core.js";

const NAMES = {model1_char:"Model 1 · karakter", model2_bpe:"Model 2 · BPE", model3_distilbert:"Model 3 · DistilBERT"};
const STYLE = {model1_char:{c:"var(--rule-2)", d:"6 4"}, model2_bpe:{c:"var(--ok)", d:""}, model3_distilbert:{c:"var(--spot)", d:""}};
const CLS = ["negative", "neutral", "positive"];
const f3 = x => Number.isFinite(x) ? x.toFixed(3) : "–";
const M = {model:"model3_distilbert", ex:0};
let root = null, D = null;

// BERT sınıflandırıcısının parametre sayısı (BertForSequenceClassification, 3 sınıf).
export function paramCount({V, P, d, L, I, labels = 3}){
  const emb = (V + P + 2) * d + 2 * d, attn = 4 * (d * d + d) + 2 * d, ffn = d * I + I + I * d + d + 2 * d;
  const layer = attn + ffn, pooler = d * d + d, head = d * labels + labels;
  return {emb, layer, layers:L * layer, pooler, head, total:emb + L * layer + pooler + head};
}

const mdl = k => D.models.find(m => m.key === k);
const bar = (v, color) => `<div class="mt-track"><i style="width:${(v * 100).toFixed(1)}%;background:${color}"></i></div>`;

function resultsHTML(){
  const val = (x, key) => key === "accuracy" || key === "macro_f1" || key === "weighted_f1" ? x[key] : x.per_class[key].f1;
  const base = D.baseline?.variants[D.baseline.chosen].metrics;
  const line = (name, v, color) => `<div class="mt-row"><span>${name}</span>${bar(v, color)}<b>${f3(v)}</b></div>`;
  const rows = (key, title) => `<div class="mt-grp"><h4>${title}</h4>${D.models.map(m => line(NAMES[m.key], val(m.metrics, key), STYLE[m.key].c)).join("")}${base ? line("Taban · Word2Vec", val(base, key), "var(--ink-3)") : ""}</div>`;
  const best = [...D.models].sort((a, b) => b.metrics.macro_f1 - a.metrics.macro_f1);
  return `<div class="mt-two"><div>${rows("accuracy", "Accuracy")}${rows("macro_f1", "Macro-F1")}${rows("weighted_f1", "Weighted-F1")}</div>
    <div>${CLS.map(c => rows(c, `F1 · ${c} (n=${D.models[0].metrics.per_class[c].support})`)).join("")}</div></div>
    <p class="verdict" style="font-size:1.05rem">En yüksek macro-F1: <b>${NAMES[best[0].key]}</b> (${f3(best[0].metrics.macro_f1)}), ${NAMES[best[1].key]} ile fark ${f3(best[0].metrics.macro_f1 - best[1].metrics.macro_f1)}.
    <small class="muted">250 örnekte bir tweet ≈ 0,4 accuracy puanı eder; bu kadar küçük fark gürültü sınırındadır, kazanan ilan edilmez.</small></p>`;
}

function dataHTML(){
  const s = D.data, a = s.dataset1_train_pool, t = s.dataset2_test, tr = Math.round(a.size * .85);
  const step = (n, h, p) => `<li><b>${n}</b><span>${h}</span><small>${p}</small></li>`;
  return `<ol class="mt-flow">${step(s.pooled_examples.toLocaleString("tr"), "TweetEval-sentiment, tüm bölümler", "train + validation + test tek havuzda")}
    ${step("−" + s.duplicates_removed, "birebir aynı metinler atılır", "eğitim ile test arasında sızıntı olmasın")}
    ${step(t.size, "Dataset2 (test)", `sınıf oranları korunarak ayrılır: ${CLS.map(c => `${c} ${t.labels[c]}`).join(", ")}`)}
    ${step(a.size.toLocaleString("tr"), "Dataset1 (eğitim havuzu)", `%85 eğitim (${tr.toLocaleString("tr")}), %15 doğrulama (${(a.size - tr).toLocaleString("tr")}), yine sınıf oranlı`)}</ol>
    <p class="ck-meta">Neden TweetEval? Model 3'ün hazır ağırlığı film yorumlarıyla (SST-2) eğitilmiş. Test için SST/Rotten Tomatoes kullansaydık model testi daha önce görmüş olabilirdi; tweetler bu sızıntıyı önler.</p>
    <div class="stu"><p>Test kümesi <b>hiçbir şekilde</b> eğitime, tokenizer öğrenmeye ya da checkpoint seçimine girmez. Tokenizer'lar (karakter, BPE) yalnızca eğitim bölümünden öğrenilir; en iyi epoch'u doğrulama macro-F1 seçer. Aksi halde test puanı iyimser olurdu.</p></div>`;
}

function tokHTML(){
  const e = D.examples[M.ex];
  const row = k => {
    const t = e.tokens[k], n = t.length;
    return `<div class="mt-tokrow"><div class="mt-th"><b>${NAMES[k]}</b><span class="num">${n} simge</span></div><div class="mt-toks">${t.map((x, i) => `<span class="mt-tk c${i % 2}${x.ws ? " ws" : ""}${x.sp ? " sp" : ""}" style="--k:${STYLE[k].c}">${esc(x.t.replace(/ /g, "·"))}</span>`).join("")}</div></div>`;
  };
  return `<div class="chips">${D.examples.map((x, i) => `<button class="chip" data-ex="${i}" aria-pressed="${M.ex === i}" title="${esc(x.text)}">${esc(x.text.length > 44 ? x.text.slice(0, 42) + "…" : x.text)}</button>`).join("")}</div>
    ${Object.keys(NAMES).map(row).join("")}
    <p class="ck-meta">Karakter: her harf bir simge (sözlük ${mdl("model1_char").config.vocab_size}), diziler uzun. BPE: sık parçalar birleştirilmiş (sözlük ${mdl("model2_bpe").config.vocab_size.toLocaleString("tr")}). WordPiece: sözcük içi devam parçaları ## ile işaretlenir. Köşeli parantezli simgeler özel simgelerdir.</p>
    <div class="stu"><p>Dizi uzunluğu önemli: self-attention maliyeti diziyle <b>karesel</b> artar (n² çift). Karakter modelinde 4 katı uzun diziyle ≈ 16 kat daha çok çift hesaplanır, üstelik model sözcükleri harflerden kendisi kurmak zorundadır. BPE sözcük düzeyine yakın birimler verir; ama nadir sözcükler parçalanır. Bu sözlüğün BPE eğitimini tek tek adımlarla görmek için <b>Metin temsili</b> sekmesine bak.</p></div>`;
}

function archHTML(){
  const c = mdl("model2_bpe").config, c1 = mdl("model1_char").config;
  const step = (h, p) => `<li><span>${h}</span><small>${p}</small></li>`;
  return `<ol class="mt-stack">${step("metin", "ham tweet")}${step("tokenizer", "[CLS] t₁ … tₙ [SEP]")}${step("gömme", `token gömmesi + konum gömmesi (d = ${c.hidden_size})`)}
    ${step(`${c.num_hidden_layers} × transformer bloğu`, `${c.num_attention_heads} başlı self-attention → FFN (${c.intermediate_size}); her ikisinde artık bağlantı + LayerNorm`)}
    ${step("[CLS] vektörü", "dizinin özeti olarak alınır")}${step("pooler + doğrusal katman", "3 çıkış: negative / neutral / positive")}</ol>
    <p class="ck-meta">Model 1 ve 2 aynı mimari: ${c.num_hidden_layers} katman, ${c.hidden_size} boyut, ${c.num_attention_heads} başlık. Yalnızca tokenizer (ve buna bağlı sözlük/dizi uzunluğu) farklı: ${c1.vocab_size} ve ${c.vocab_size.toLocaleString("tr")} sözlük, azami uzunluk ${c1.max_position_embeddings} ve ${c.max_position_embeddings}.</p>
    <div class="stu"><h3>Parametre sayısı hesabı</h3><p>Tüm ağırlıklar rastgele başlar. Parametreler: gömmeler <code>(V + P + 2)·d + 2d</code>, her blok <code>4(d² + d) + 2d + 2(d·I) + I + d + 2d</code>, pooler <code>d² + d</code>, başlık <code>3d + 3</code>. Değerleri değiştir:</p>
    <div class="ng-ctl">${[["V", "sözlük", c.vocab_size], ["P", "konum", c.max_position_embeddings], ["d", "boyut", c.hidden_size], ["L", "katman", c.num_hidden_layers], ["I", "FFN", c.intermediate_size]].map(([k, l, v]) => `<label class="muted">${l} (${k}) <input class="dp-num mt-p" data-p="${k}" type="number" min="1" value="${v}" style="width:84px"></label>`).join("")}
    <button class="btn sm ghost" data-preset="model1_char">Model 1</button><button class="btn sm ghost" data-preset="model2_bpe">Model 2</button></div><div id="mtParam"></div></div>`;
}
function paramHTML(){
  const g = k => +$(`.mt-p[data-p="${k}"]`, root).value || 1, p = paramCount({V:g("V"), P:g("P"), d:g("d"), L:g("L"), I:g("I")});
  const hit = D.models.filter(m => m.config.vocab_size && paramCount({V:m.config.vocab_size, P:m.config.max_position_embeddings, d:m.config.hidden_size, L:m.config.num_hidden_layers, I:m.config.intermediate_size}).total === m.parameters).map(m => NAMES[m.key]);
  $("#mtParam", root).innerHTML = `<table class="ng-tbl"><tr><th>Bölüm</th><th>Parametre</th></tr><tr><td>Gömmeler</td><td>${p.emb.toLocaleString("tr")}</td></tr><tr><td>${g("L")} transformer bloğu (blok başına ${p.layer.toLocaleString("tr")})</td><td>${p.layers.toLocaleString("tr")}</td></tr><tr><td>Pooler</td><td>${p.pooler.toLocaleString("tr")}</td></tr><tr><td>Sınıflandırma başlığı</td><td>${p.head.toLocaleString("tr")}</td></tr><tr><th>Toplam</th><th>${p.total.toLocaleString("tr")}</th></tr></table>
    <p class="ck-meta">Eğitim günlüğündeki gerçek sayılarla birebir tutar: ${hit.join(", ") || "bu ayarlar iki modelden hiçbirine karşılık gelmiyor"}.</p>`;
}

function trainHTML(){
  const m1 = mdl("model1_char"), m2 = mdl("model2_bpe"), m3 = mdl("model3_distilbert");
  const W = 620, H = 220, L = 44, R = 12, T = 12, B = 28;
  const chart = (series, xMax, y0, y1, ticks, label) => {
    const X = x => L + (x - 1) / Math.max(1, xMax - 1) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    const grid = Array.from({length:ticks + 1}, (_, i) => { const v = y0 + (y1 - y0) * i / ticks; return `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".12"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="currentColor">${v.toFixed(2)}</text>`; }).join("");
    const xs = Array.from({length:xMax}, (_, i) => i + 1).filter(x => x === 1 || x % 2 === 0).map(x => `<text x="${X(x)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="currentColor">${x}</text>`).join("");
    const lines = series.map(s => `<polyline points="${s.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="${s.c}" stroke-width="2.2" ${s.d ? `stroke-dasharray="${s.d}"` : ""}/>` + (s.best ? `<circle cx="${X(s.best[0])}" cy="${Y(s.best[1])}" r="4.5" fill="${s.c}" stroke="var(--page)" stroke-width="2"/>` : "") + `<text x="${X(s.pts.at(-1)[0]) - 4}" y="${Y(s.pts.at(-1)[1]) - 8}" text-anchor="end" font-size="11" font-weight="600" fill="${s.c}">${s.name}</text>`).join("");
    return `<svg class="zipf mt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${grid}${xs}${lines}</svg>`;
  };
  const f1s = [m1, m2, m3].map(m => { const h = m.history, b = h.reduce((a, e) => e.val_macro_f1 > a.val_macro_f1 ? e : a, h[0]); return {name:NAMES[m.key].split(" · ")[0], c:STYLE[m.key].c, d:STYLE[m.key].d, pts:h.map(e => [e.epoch, e.val_macro_f1]), best:[b.epoch, b.val_macro_f1]}; });
  const mlm = [m1, m2].map(m => ({name:NAMES[m.key].split(" · ")[0], c:STYLE[m.key].c, d:STYLE[m.key].d, pts:m.mlm_history.map(e => [e.epoch, e.mlm_loss])}));
  const ys = mlm.flatMap(s => s.pts.map(p => p[1]));
  return `<div class="mt-two"><div><h4>Doğrulama macro-F1 (nokta: kaydedilen epoch)</h4><div class="fig-box">${chart(f1s, Math.max(...[m1, m2, m3].map(m => m.history.length)), .3, .8, 5, "Doğrulama macro-F1, epoch'a göre")}</div></div>
    <div><h4>Maskeli dil modeli kaybı (sıfırdan ön eğitim)</h4><div class="fig-box">${chart(mlm, Math.max(m1.mlm_history.length, m2.mlm_history.length), Math.floor(Math.min(...ys) * 2) / 2, Math.ceil(Math.max(...ys) * 2) / 2, 4, "MLM kaybı, epoch'a göre")}</div></div></div>
    <p class="ck-meta">Model 2 ${m2.epochs_run}. epoch'ta erken durduruldu (4 epoch iyileşme yok). Model 3 yalnızca ${m3.epochs_run} epoch eğitildi; hazır ağırlıklarla başladığı için ilk epoch'ta zaten yüksek. MLM kayıpları farklı sözlüklere ait, şekilleri karşılaştır, değerleri değil.</p>
    <div class="stu"><h3>Eğitim tarifi</h3><ul class="mt-ul"><li><b>MLM ön eğitim (${m2.mlm_epochs} epoch):</b> her dizide simgelerin %15'i seçilir; çoğu <code>[MASK]</code> olur, bir kısmı rastgele simgeyle değişir ya da aynen kalır. Model gizli simgeyi bağlamdan tahmin eder; böylece dili ve tweet üslubunu öğrenir.</li>
    <li><b>Sınıflandırma:</b> gövde MLM ağırlıklarıyla başlar, sınıflandırma başlığı rastgele; çıktı [CLS] vektöründen alınır, kayıp cross-entropy.</li>
    <li><b>Optimizasyon:</b> AdamW, lr ${m2.lr} (MLM) ve ${m2.lr / 2} (sınıflandırma), ağırlık sönümü 0,01; ilk %6 adımda lr doğrusal yükselir (warm-up), sonra sıfıra doğrusal iner; gradyan kırpma 1,0; bf16 karma duyarlılık; batch ${m2.batch_size}.</li>
    <li><b>Erken durdurma:</b> doğrulama macro-F1 4 epoch iyileşmezse durur; en iyi epoch kaydedilir. Accuracy yerine macro-F1, çünkü sınıflar dengesiz (neutral ≈ %46).</li></ul></div>`;
}

function ftHTML(){
  const m = mdl("model3_distilbert");
  return `<p class="ck-meta"><code>distilbert-base-uncased-finetuned-sst-2-english</code> (${(m.parameters / 1e6).toFixed(1)} M parametre) alınır; film yorumlarında negatif/pozitif için eğitilmiş. Sınıflandırma başlığı <b>3 çıkışlı</b> olarak yeniden başlatılır (<code>ignore_mismatched_sizes=True</code>), sonra tüm ağ Dataset1 ile ${m.epochs_run} epoch, lr ${m.lr}, ince ayar yapılır.</p>
    <div class="stu"><p><b>Neden küçük lr (2e-5)?</b> Ağırlıklar zaten iyi bir noktada; büyük adım, öğrenilmiş dil bilgisini bozar (catastrophic forgetting). <b>Neden neutral zor?</b> SST-2'de neutral sınıfı yok; model kutupluluğa (olumlu/olumsuz) alışık, nötr tweetleri ince ayarla öğrenmesi gerekir. Sonuçlarda Model 3 pozitifte güçlü, negatifte zayıf çıkıyor.</p></div>`;
}

function evalHTML(){
  const m = mdl(M.model), cm = m.metrics.confusion_matrix.matrix, mx = Math.max(...cm.flat());
  const seg = Object.keys(NAMES).map(k => `<button class="chip" data-model="${k}" aria-pressed="${M.model === k}">${NAMES[k]}</button>`).join("");
  const pc = m.metrics.per_class;
  // uygulamanın Değerlendirme sekmesiyle aynı yön: satır = sistem çıktısı, sütun = altın etiket
  const T = (i, j) => cm[j][i];
  return `<div class="chips">${seg}</div><div class="mt-two"><div class="ck-scroll"><table class="ng-tbl"><caption>Karışıklık matrisi (satır: sistem çıktısı, sütun: altın etiket)</caption><tr><th></th>${CLS.map(c => `<th lang="en">${c}</th>`).join("")}</tr>
    ${CLS.map((r, i) => `<tr><th lang="en">${r}</th>${CLS.map((_, j) => `<td class="${i === j ? "ev-diag" : ""}" style="${i === j ? "" : `background:color-mix(in srgb,var(--bad) ${Math.round(T(i, j) / mx * 40)}%,transparent)`}">${T(i, j)}</td>`).join("")}</tr>`).join("")}</table></div>
    <div class="ck-scroll"><table class="ng-tbl"><caption>Sınıf başına</caption><tr><th>Sınıf</th><th>Precision</th><th>Recall</th><th>F1</th><th>Destek</th></tr>${CLS.map(c => `<tr><td>${c}</td><td>${f3(pc[c].precision)}</td><td>${f3(pc[c].recall)}</td><td>${f3(pc[c].f1)}</td><td>${pc[c].support}</td></tr>`).join("")}
    <tr><th>macro</th><th>${f3(m.metrics.macro_precision)}</th><th>${f3(m.metrics.macro_recall)}</th><th>${f3(m.metrics.macro_f1)}</th><th>${CLS.reduce((a, c) => a + pc[c].support, 0)}</th></tr></table></div></div>
    <pre class="ck-code">from transformers import pipeline
clf = pipeline("text-classification", model=model, tokenizer=tokenizer, device=0)
out = clf(texts, batch_size=32, truncation=True, max_length=max_len, top_k=None)   # üç sınıfın olasılıkları
# her örnek için en yüksek olasılıklı etiket + tüm skorlar json'a yazılır; ölçütler sklearn ile</pre>
    <div class="stu"><p><b>Macro-F1</b> her sınıfın F1'inin <i>düz ortalamasıdır</i>: F1<sub>c</sub> = 2·P<sub>c</sub>·R<sub>c</sub> / (P<sub>c</sub> + R<sub>c</sub>). Küçük sınıflar da eşit ağırlık alır; <b>weighted-F1</b> ise sınıf büyüklüğüyle ağırlıklar. Burada neutral %46 olduğu için accuracy, yalnızca neutral diyen aptal bir modele bile ≈ 0,46 verirdi; bu yüzden macro-F1 raporlanır. Satır/sütun yönü: uygulamanın Değerlendirme sekmesindeki gibi, satır sistem çıktısı, sütun altın etiket (sklearn'de bu matrisin devriği çıkar).</p></div>`;
}

function takeHTML(){
  const [m1, m2, m3] = ["model1_char", "model2_bpe", "model3_distilbert"].map(mdl);
  const g = (a, b) => ((a.metrics.macro_f1 - b.metrics.macro_f1) * 100).toFixed(0);
  return `<ul class="mt-ul"><li><b>Tokenizer, sıfırdan eğitimde belirleyici:</b> aynı mimari ve veriyle BPE, karakterden ${g(m2, m1)} macro-F1 puanı önde.</li>
    <li><b>Küçük BPE modeli (${(m2.parameters / 1e6).toFixed(1)} M) hazır ${(m3.parameters / 1e6).toFixed(0)} M'lik modele yetişti</b> (${f3(m2.metrics.macro_f1)} ve ${f3(m3.metrics.macro_f1)}); fark gürültü sınırında.</li>
    <li><b>Sınırlar:</b> tek tohum, tek bölme, 250 örneklik test; hiperparametreler model başına ayarlanmadı. Neutral üç modelde de en zor sınıf.</li></ul>
    <p class="ck-meta">Çalıştırma: <code>bash run.sh</code> veri hazırlığı, iki eğitim, ince ayar, üç pipeline ve özeti sırayla yürütür; tüm yollar göreli. Proje klasörü: <code>comp451-project1</code>.</p>`;
}

function baseHTML(){
  const b = D.baseline;
  if(!b) return `<p class="ck-meta">Taban çizgisi verisi yok. <code>python tools/word2vec_baseline.py</code>, ardından <code>tools/export_app_data.py</code>.</p>`;
  const chosen = b.variants[b.chosen].metrics, sg = b.variants.skipgram, cb = b.variants.cbow;
  const nb = w => (b.neighbours[w] || []).slice(0, 5).map(([n, s]) => `${esc(n)} <span class="num muted">${s.toFixed(2)}</span>`).join(", ");
  const c = b.context;
  return `<p class="ck-meta">Ödevin üç modeline ek, statik vektörlü bir karşılaştırma: Word2Vec vektörleri yalnızca eğitim bölümünden öğrenilir, tweet vektörü kelime vektörlerinin ortalamasıdır, üstünde küçük bir ağ sınıflandırır. Doğrulama macro-F1: Skip-gram ${f3(sg.val_macro_f1)}, CBOW ${f3(cb.val_macro_f1)}; seçilen ${b.chosen === "cbow" ? "CBOW" : "Skip-gram"}. Testte macro-F1 <b>${f3(chosen.macro_f1)}</b>.</p>
    <table class="ng-tbl"><caption>En yakın komşular (kosinüs)</caption><tr><th>Sözcük</th><th>Komşular</th></tr>${["good", "bad"].map(w => `<tr><td lang="en">${w}</td><td lang="en">${nb(w)}</td></tr>`).join("")}</table>
    <h3>Aynı sözcük, iki cümle: "${esc(c.word)}"</h3><ul class="mt-ul">${c.sentences.map(s => `<li lang="en">${esc(s)}</li>`).join("")}</ul>
    <table class="ng-tbl"><caption>İki cümledeki "${esc(c.word)}" vektörlerinin kosinüsü</caption><tr><th>Temsil</th><th>Kosinüs</th></tr><tr><td>Word2Vec (statik)</td><td class="num">${c.word2vec.toFixed(2)}</td></tr>${Object.entries(c.transformers).map(([k, v]) => `<tr><td>${NAMES[k]} (bağlamsal)</td><td class="num">${v.toFixed(2)}</td></tr>`).join("")}</table>
    <div class="stu"><p>Statik gömmede her sözcüğün tek vektörü vardır, bu yüzden kosinüs 1 çıkar (DL-4: statik ve dinamik gömme). Transformer'da vektör cümleye bağlıdır. Sayıları modeller arasında karşılaştırma: her modelin uzayı farklı. <b>good</b> ile <b>bad</b> yakın çıkar, çünkü zıt anlamlılar aynı bağlamlarda geçer; ortalama almak sözcük sırasını da siler.</p></div>`;
}

const SEC = [["1 · Veri", dataHTML], ["2 · Sonuçlar", resultsHTML], ["3 · Üç tokenizer", tokHTML], ["4 · Sıfırdan transformer (Model 1 ve 2)", archHTML], ["5 · Eğitim eğrileri", trainHTML],
  ["6 · Hazır modelin ince ayarı (Model 3)", ftHTML], ["7 · Pipeline ve değerlendirme", evalHTML], ["8 · Çıkarımlar", takeHTML], ["9 · Ek: statik vektör taban çizgisi", baseHTML]];

function paint(){
  if(!D) return;
  root.querySelector("#mtBody").innerHTML = SEC.map(([h, f], i) => `<h2 class="ng-h">${h}</h2><div id="mt${i}">${f()}</div>`).join("");
  if($(".mt-p", root)) paramHTML();
}
async function mount(){
  root = $("#v-method"); if(!root) return;
  root.innerHTML = `<div class="page wide"><h1 class="page-title">Proje 1 <small>metot</small></h1>
    <p class="lesson-intro" style="margin:0">İngilizce tweet duygu analizi: aynı veride üç transformer, üç tokenizer. İkisi sıfırdan eğitildi (karakter ve BPE), biri hazır DistilBERT'ten ince ayarlandı; üçü de Hugging Face pipeline ile aynı 250 tweet'te sınandı. Sayıların hepsi gerçek koşudan gelir.</p>
    <div id="mtBody"><p class="muted">Yükleniyor…</p></div><div style="height:56px"></div></div>`;
  try{ const r = await fetch("/proj1/data.json"); if(!r.ok) throw new Error(r.status); D = await r.json(); paint(); }
  catch(e){ $("#mtBody", root).innerHTML = `<div class="notice warn">Proje verisi yüklenemedi (/proj1/data.json). <code>python export_app_data.py</code> ile üretilir.</div>`; }
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-ex],[data-model],[data-preset]"); if(!b) return;
    if(b.dataset.ex !== undefined){ M.ex = +b.dataset.ex; $("#mt2", root).innerHTML = tokHTML(); }
    else if(b.dataset.model){ M.model = b.dataset.model; $("#mt6", root).innerHTML = evalHTML(); }
    else if(b.dataset.preset){ const c = mdl(b.dataset.preset).config; for(const [k, v] of [["V", c.vocab_size], ["P", c.max_position_embeddings], ["d", c.hidden_size], ["L", c.num_hidden_layers], ["I", c.intermediate_size]]) $(`.mt-p[data-p="${k}"]`, root).value = v; paramHTML(); }
  });
  root.addEventListener("input", e => { if(e.target.classList.contains("mt-p")) paramHTML(); });
}
registerView("method", {apply(){}, enter(){ if(!root) mount(); }});
mount();
