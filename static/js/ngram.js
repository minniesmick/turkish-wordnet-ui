// N-gram laboratuvarı (Lecture 5): korpustan sayım, olasılık, Laplace / backoff / interpolation, UNK, cümle olasılığı, perplexity, rastgele üretim, PMI.
// Hesap lm.js içinde; burada yalnızca arayüz var. Korpus: elle yazılan metin, BOUN (Türkçe) ya da Brown (İngilizce).
import {$, $$, esc, registerView, setView, tr as num} from "./core.js";
import {BOS, EOS, SEP, buildModel, mapWord, padHist, prob, support, sample, seqProb, perplexity, defaultLam, pmiBuild, topPairs, collocates, similar} from "./lm.js";
import {loadCorpus, tokensOf, CORPORA} from "./corpusdata.js";

const PRESETS = {
  slayt: {stu:true, label:"Slayt 24 · I am Sam", text:"I am Sam\nSam I am\nI fly", n:2, pred:"I", sent:"I am Sam", extra:["I am fly", "Sam fly"]},
  inclass5: {stu:true, label:"InClass 5", text:"the dog barks\nthe cat laughs\nthe cat saw the dog\nthe\ncat the dog the\ncat cat cat", n:2, pred:"the cat", sent:"the cat laughs", extra:["the cat saw the dog", "the cat barks"]},
  tr: {label:"Türkçe örnek", text:"bu çocuk bugün okula gidecek\nbu çocuk yarın okula gidecek\no çocuk bugün eve gidecek\nbu kız bugün okula gitmedi", n:2, pred:"bu çocuk", sent:"bu çocuk bugün okula gidecek", extra:["bu çocuk yarın eve gidecek"]}
};
const NG = {src:"text", limit:5000, text:PRESETS.slayt.text, n:2, lower:false, smooth:"none", unk:0, alpha:.4, lam:{}, pred:PRESETS.slayt.pred, sent:PRESETS.slayt.sent, hist:"", preset:"slayt", pk:2, pmin:3, pw:""};
const KEY = "wn:ngram";
const SM = {none:"Yok", laplace:"Laplace +1", backoff:"Backoff", interp:"Interpolation"};
let root = null, S = [], M = null, token = 0;
const cache = new Map();
const memo = (k, f) => { if(!cache.has(k)){ if(cache.size > 30) cache.delete(cache.keys().next().value); cache.set(k, f()); } return cache.get(k); };

const load = () => {
  try{ Object.assign(NG, JSON.parse(localStorage.getItem(KEY)) || {}); }catch(_){}
  if(NG.smooth === true) NG.smooth = "laplace";
  if(!SM[NG.smooth]) NG.smooth = "none";
  if(!["text", "boun", "brown"].includes(NG.src)) NG.src = "text";
  if(!NG.lam || typeof NG.lam !== "object") NG.lam = {};
};
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(NG)); }catch(_){} };
const lamFor = n => (NG.lam?.[n]?.length === n) ? NG.lam[n] : defaultLam(n);
const cfg = () => ({smooth:NG.smooth, alpha:NG.alpha, lam:lamFor(NG.n)});

// ───────────────────────── korpus → cümleler
const clean = s => s.replace(/<\/?s>/g, " ").replace(/[.,;:!?"“”()]+/g, " ").trim();
const words = s => { const t = clean(s); return t ? (NG.lower ? t.toLocaleLowerCase("tr") : t).split(/\s+/) : []; };
const textSents = text => text.split(/\n+|(?<=[.!?])\s+/).map(words).filter(w => w.length);
async function getSents(){
  if(NG.src === "text") return textSents(NG.text);
  const c = await loadCorpus(NG.src, NG.limit);
  return tokensOf(c, {lower:NG.lower, punct:false}).filter(s => s.length);
}
const srcKey = () => NG.src === "text" ? `t|${NG.lower}|${NG.text}` : `${NG.src}|${NG.limit}|${NG.lower}`;

// ───────────────────────── biçim
const dec = p => p === 0 ? "0" : p >= .001 ? (+p.toFixed(4)).toString() : p.toExponential(2);
const lg = p => p > 0 ? Math.log2(p) : -Infinity;
const lgs = v => v === -Infinity ? "−∞" : v.toFixed(3).replace("-", "−");
const T = s => `<span class="ng-t">${esc(s)}</span>`;
const meter = v => `<div class="meter"><i><b style="width:${Math.min(1, v) * 100}%"></b></i></div>`;
const ppl = v => !isFinite(v) ? "∞" : v >= 1000 ? String(Math.round(v)) : v.toFixed(2);
const fr = r => NG.smooth === "interp" ? "karışım" : `${r.num}/${r.den}`;
const histLabel = key => key.split(SEP).map(esc).join(" ");
const howMode = () => NG.smooth === "backoff" || NG.smooth === "interp";

function formula(m){
  const n = m.n, h = n === 2 ? "wᵢ₋₁" : "wᵢ₋₂ wᵢ₋₁";
  if(NG.smooth === "interp") return n === 1 ? "P(w) = C(w) / N" : `P̂(wᵢ | …) = ${Array.from({length:n}, (_, k) => `λ${k + 1}·P${k + 1}`).join(" + ")}   (Σλ = 1; bağlamı görülmeyen düzey atlanır)`;
  if(NG.smooth === "backoff") return n === 1 ? "P(w) = C(w) / N" : `S(wᵢ | ${h}) = C(${h} wᵢ)/C(${h}) varsa; yoksa α · S(wᵢ | daha kısa bağlam)   (α = ${NG.alpha})`;
  if(n === 1) return NG.smooth === "laplace" ? "P(w) = (C(w) + 1) / (N + V)" : "P(w) = C(w) / N";
  return NG.smooth === "laplace" ? `P(wᵢ | ${h}) = (C(${h} wᵢ) + 1) / (C(${h}) + V)` : `P(wᵢ | ${h}) = C(${h} wᵢ) / C(${h})`;
}
function explainHTML(){
  const E = {
    none:"Yumuşatma yok: görülmeyen n-gram'ın olasılığı 0; bir çarpan 0 olunca cümlenin tüm olasılığı 0 olur.",
    laplace:"Laplace (add-one): her sayıma 1 eklenir, payda V kadar büyür; görülmeyen n-gram'a küçük ama sıfır olmayan pay düşer. Büyük sözlükte olasılığın çoğunu görülmeyenlere kaydırır.",
    backoff:"Backoff: trigram varsa onu kullan, yoksa bigram'a, o da yoksa unigram'a düş (slayt 32). Düşülen her adımda α ile çarpılır (stupid backoff); sonuç puandır, olasılık dağılımı olarak normalize değildir.",
    interp:"Interpolation: trigram, bigram ve unigram olasılıkları her zaman λ ağırlıklarıyla karıştırılır (slayt 32). Ağırlıkların toplamı 1'dir; bağlamı hiç görülmemiş düzey karışımdan çıkarılır, kalan ağırlıklar yeniden normalize edilir."
  };
  const u = NG.unk ? `UNK: eğitimde sayımı ≤ ${NG.unk} olan ${num(M?.unkTypes || 0)} sözcük türü <UNK> simgesine çevrildi; sorgu metnindeki bilinmeyen sözcük de <UNK> sayılır (açık sözlük, slayt 33). Böylece bilinmeyen sözcük bile sıfır olmayan olasılık alır.` : "UNK kapalı: kapalı sözlük varsayımı (tüm sözcükler eğitimde görülmüş). Sözlüğün dışındaki bir sözcük, backoff ve interpolation'da bile olasılık 0 verir.";
  return `<p>${esc(E[NG.smooth])}</p><p>${esc(u)}</p>`;
}

// ───────────────────────── istatistikler
function statsHTML(){
  const cell = (a, b) => `<div><b>${a}</b><span>${b}</span></div>`;
  const grams = [...M.orders[M.n].values()].reduce((a, e) => a + e.next.size, 0);
  const p = M.N > 250000 ? null : perplexity(M, S, cfg());
  return `<div class="ng-stats">${cell(num(M.S), "cümle")}${cell(num(M.N), "sözcük (N)")}${cell(num(M.vocab.size), "sözcük türü")}${cell(num(M.V), "V (tahmin edilen simge)")}${cell(num(grams), M.n === 1 ? "farklı unigram" : "farklı " + M.n + "-gram")}${M.unk ? cell(num(M.unkTypes), "&lt;UNK&gt;'a çevrilen tür") : ""}${cell(p ? ppl(p.ppl) : "—", "eğitim perplexity")}</div>`;
}

// ───────────────────────── sayımlar ve olasılıklar
function distTable(key){
  const hist = key ? key.split(SEP) : [], cf = cfg(), ent = M.orders[M.n].get(M.n === 1 ? "" : key);
  const rows = support(M, hist, cf).map(w => ({w, ...prob(M, hist, w, cf)})).sort((a, b) => b.p - a.p || b.c - a.c || a.w.localeCompare(b.w, "tr"));
  const shown = rows.slice(0, 30), rest = rows.length - shown.length, sum = rows.reduce((a, r) => a + r.p, 0);
  const total = ent?.total || 0, complete = cf.smooth === "none" || (cf.smooth === "laplace" && M.V <= 400);
  const head = M.n > 1 ? `${T(key.split(SEP).join(" "))} bağlamından sonra gelenler · C = ${num(total)}` : `Sözcük olasılıkları · N = ${num(total)}`;
  const how = howMode();
  return `<table class="ng-tbl"><caption>${head}${cf.smooth === "laplace" ? ` · V = ${num(M.V)}` : ""}</caption>
    <tr><th>${M.n > 1 ? "Sonraki" : "Sözcük"}</th><th>Sayım</th><th>${how ? "Kaynak" : "Kesir"}</th><th>Olasılık</th><th class="ng-bar"></th></tr>
    ${shown.map(r => `<tr><td>${T(r.w)}</td><td>${r.c}</td><td>${how ? `<small class="muted">${esc(r.how)}</small>` : fr(r)}</td><td><b>${dec(r.p)}</b></td><td class="ng-bar">${meter(r.p)}</td></tr>`).join("")}
    ${rest > 0 ? `<tr><td colspan="5" class="muted">… ve ${num(rest)} sözcük daha</td></tr>` : ""}
    <tr class="sum"><td>Toplam${complete ? "" : " (gösterilen)"}</td><td>${rows.reduce((a, r) => a + r.c, 0)}</td><td></td><td><b>${dec(sum)}</b></td><td class="ng-bar">${complete ? (Math.abs(sum - 1) < 1e-9 ? '<span class="ng-ok stu">Σ = 1 ✓</span>' : '<span class="ng-bad stu">Σ ≠ 1</span>') : '<small class="muted stu">tablo yalnızca bağlamda görülenleri içerir</small>'}</td></tr></table>`;
}
function matrix(){
  const cf = cfg(), rows = [BOS, ...M.words].filter(h => M.orders[2].has(h)), how = howMode();
  return `<div class="ng-scroll"><table class="ng-mx"><caption>Bigram tablosu · satır: önceki sözcük, sütun: sonraki sözcük${cf.smooth !== "none" ? " · " + SM[cf.smooth] : ""}</caption>
    <tr><th></th>${M.cols.map(c => `<th>${T(c)}</th>`).join("")}<th>Σ</th></tr>
    ${rows.map(h => { let sum = 0; const cells = M.cols.map(c => { const r = prob(M, [h], c, cf); sum += r.p; return `<td class="${r.p ? "" : "z"}"><b>${how ? dec(r.p) : fr(r)}</b>${how ? "" : `<small>${dec(r.p)}</small>`}</td>`; }).join("");
      return `<tr class="${h === NG.hist ? "sel" : ""}" data-hist="${esc(h)}"><th>${T(h)}</th>${cells}<td class="sum">${dec(sum)}</td></tr>`; }).join("")}</table></div>`;
}
function tablesHTML(){
  if(!M.S) return '<div class="empty">Korpus boş: en az bir cümle gerekli.</div>';
  let h = `<p class="ng-formula stu">${esc(formula(M))}${NG.smooth === "laplace" ? ` <small>· V = sözcük türü sayısı${M.n > 1 ? " + &lt;/s&gt;" : ""}, burada ${num(M.V)}</small>` : ""}</p>`;
  if(M.n === 1) return h + distTable("");
  const keys = [...M.orders[M.n]].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0], "tr")).map(x => x[0]);
  const start = Array(M.n - 1).fill(BOS).join(SEP);
  if(!NG.hist || !M.orders[M.n].has(NG.hist)) NG.hist = M.orders[M.n].has(start) ? start : keys[0];
  const mx = M.n === 2 && M.cols.length <= 12;
  if(mx) h += matrix();
  h += `<h3 class="ng-h3">Geçmiş seç <small class="stu">${mx ? "tablodan satıra da tıklayabilirsin" : "yan yana " + (M.n - 1) + " sözcük"}</small></h3>
    <div class="chips">${keys.slice(0, 40).map(k => `<button class="chip" data-hist="${esc(k)}" aria-pressed="${k === NG.hist}">${histLabel(k)} <small>${num(M.orders[M.n].get(k).total)}</small></button>`).join("")}${keys.length > 40 ? `<span class="muted">+${num(keys.length - 40)}</span>` : ""}</div>`;
  return h + distTable(NG.hist);
}

// ───────────────────────── sonraki sözcük
function predHTML(){
  if(!M.S) return "";
  const toks = words(NG.pred).map(w => mapWord(M, w)), hist = padHist(M, toks), cf = cfg();
  const ctx = M.n > 1 ? hist.map(esc).join(" ") : "";
  const rows = support(M, hist, cf).map(w => ({w, ...prob(M, hist, w, cf)})).filter(r => r.p > 0).sort((a, b) => b.p - a.p || b.c - a.c).slice(0, 6);
  const line = `<p class="ng-pred">${ctx ? `<span class="ng-t">${ctx}</span> ` : ""}<span class="ng-blank">X</span></p>`;
  if(!rows.length) return line + `<div class="notice warn">Bu geçmiş korpusta hiç yok: olasılık <b>tanımsız</b> (0/0). Laplace, backoff ya da interpolation seç: bu yöntemler bilinmeyen bağlamda daha kısa bağlama düşer.</div>`;
  const top = rows[0], ties = rows.filter(r => r.p === top.p), how = howMode();
  const val = how ? dec(top.p) : `${fr(top)} = ${dec(top.p)}`;
  const why = how ? `Neden: ${esc(top.how)}.` : (M.n > 1 ? `Neden: C(${T(hist.concat(top.w).join(" "))}) = ${top.c}, C(${T(hist.join(" "))}) = ${top.h}.` : `Neden: C(${T(top.w)}) = ${top.c}, N = ${top.h}.`);
  const verdict = (ties.length > 1 ? `Beraberlik: ${ties.map(r => T(r.w)).join(", ")} aynı olasılıkta (<b>${val}</b>).` : `En olası sonraki sözcük ${T(top.w)} (<b>${val}</b>).`) + ` <span class="stu">${why}</span>`;
  return `${line}<p class="verdict">${verdict}</p>
    <table class="ng-tbl"><tr><th>Aday</th><th>Sayım</th><th>${how ? "Kaynak" : "Kesir"}</th><th>Olasılık</th><th class="ng-bar"></th></tr>
    ${rows.map(r => `<tr><td>${T(r.w)}</td><td>${r.c}</td><td>${how ? `<small class="muted">${esc(r.how)}</small>` : fr(r)}</td><td><b>${dec(r.p)}</b></td><td class="ng-bar">${meter(r.p)}</td></tr>`).join("")}</table>`;
}

// ───────────────────────── cümle olasılığı
function sentHTML(){
  if(!M.S) return "";
  const raw = words(NG.sent);
  if(!raw.length) return '<div class="empty" style="padding:24px 0">Bir cümle yaz.</div>';
  const cf = cfg(), r = seqProb(M, raw, cf), zero = r.steps.some(s => s.p === 0), oov = raw.filter(w => !M.known.has(w));
  const how = howMode();
  const lab = s => M.n > 1 ? `P(${T(s.w)} | ${T(s.hist.join(" "))})` : `P(${T(s.w)})`;
  const warn = (zero ? `<div class="notice warn">Bir çarpan <b>0</b>: ${r.steps.filter(s => s.p === 0).map(lab).join(", ")}. Çarpım 0, log 0 tanımsız (−∞), perplexity ∞. ${cf.smooth === "none" ? `<span class="stu">Çözüm: Laplace, backoff ya da interpolation${M.unk ? "" : "; bilinmeyen sözcükler için UNK"}.</span>` : ""}</div>` : "")
    + (oov.length ? `<div class="notice">${oov.map(T).join(", ")} korpusta yok (OOV). ${M.unk ? `<span class="ng-t">&lt;UNK&gt;</span> olarak değerlendirildi.` : `<span class="stu">UNK eşiğini açarsan bilinmeyen sözcük <span class="ng-t">&lt;UNK&gt;</span> sayılır.</span>`}</div>` : "");
  const fracs = r.steps.map(s => s.p > 0 && !how ? `${s.num}/${s.den}` : dec(s.p)).join(" × ");
  return `<p class="verdict">P = ${r.steps.map(s => dec(s.p)).join(" × ")} = <b>${dec(r.prod)}</b></p>
    <p class="ng-formula stu">${M.n > 1 ? `${T(BOS)} (×${M.n - 1}) ve ${T(EOS)} otomatik eklenir` : "Unigram'da yalnızca sözcükler çarpılır"} · ${r.N} çarpan</p>${warn}
    <div class="ng-scroll"><table class="ng-tbl"><tr><th>#</th><th>Çarpan</th><th>${how ? "Kaynak" : "Kesir"}</th><th>Değer</th><th>log₂</th><th>Birikmiş çarpım</th></tr>
    ${r.steps.map((s, i) => `<tr class="${s.p === 0 ? "bad" : ""}"><td>${i + 1}</td><td>${lab(s)}</td><td>${how ? `<small class="muted">${esc(s.how)}</small>` : s.und ? "0/0" : fr(s)}</td><td><b>${dec(s.p)}</b></td><td>${lgs(lg(s.p))}</td><td>${dec(s.prod)}</td></tr>`).join("")}
    <tr class="sum"><td></td><td>Toplam</td><td></td><td><b>${dec(r.prod)}</b></td><td><b>${lgs(r.ls)}</b></td><td></td></tr></table></div>
    <p class="ng-formula stu">${esc(fracs)}</p>
    <p class="verdict" style="margin-top:10px">Perplexity = ${isFinite(r.ls) ? `2<sup>${(-r.ls).toFixed(3)} / ${r.N}</sup> = ` : ""}<b>${isFinite(r.ppl) ? r.ppl.toFixed(3) : "∞"}</b> <small class="muted stu">(düşük = model cümleyi daha az “şaşırtıcı” buluyor${cf.smooth === "backoff" ? "; backoff puanları normalize değil, perplexity yaklaşık" : ""})</small></p>`;
}

// ───────────────────────── rastgele üretim (slayt 28–29)
function genHTML(){
  if(!M.S) return "";
  const out = [];
  for(const n of [1, 2, 3]){
    const gm = memo(`g|${srcKey()}|${n}|${NG.unk}`, () => buildModel(S, n, {unk:NG.unk, eos:true}));
    const c = {smooth:NG.smooth, alpha:NG.alpha, lam:defaultLam(n)}, list = [];
    for(let i = 0; i < 4; i++) list.push(sample(gm, c, 28).join(" "));
    out.push(`<div class="gen-col"><h4>${["Unigram", "Bigram", "Trigram"][n - 1]}</h4>${list.map(t => `<p>${t ? esc(t) : '<span class="muted">(boş)</span>'}</p>`).join("")}</div>`);
  }
  return `<div class="gen-grid">${out.join("")}</div>
    <p class="ck-meta stu">Her cümle modelin olasılık dağılımından örneklenir: başlangıç simgesinden başlanır, her adımda sonraki sözcük çekilir, <span class="ng-t">&lt;/s&gt;</span> gelince biter. Unigram sözcükleri bağlamsız dizer; n büyüdükçe cümle daha tutarlı olur ama korpusu kopyalamaya başlar (seyrek tablo). Yumuşatma seçersen görülmeyen geçişler de çekilebilir.</p>`;
}

// ───────────────────────── eğitim / test karşılaştırması
function cmpHTML(){
  if(S.length < 10) return '<p class="ck-meta">Karşılaştırma için en az 10 cümle gerekli.</p>';
  const train = S.filter((_, i) => i % 5 !== 0), test = S.filter((_, i) => i % 5 === 0);
  const rows = [1, 2, 3].map(n => {
    const m = memo(`c|${srcKey()}|${n}|${NG.unk}`, () => buildModel(train, n, {unk:NG.unk}));
    return {n, v:Object.keys(SM).map(sm => memo(`p|${srcKey()}|${n}|${NG.unk}|${sm}|${NG.alpha}`, () => perplexity(m, test, {smooth:sm, alpha:NG.alpha, lam:defaultLam(n)}).ppl))};
  });
  const fin = rows.flatMap(r => r.v).filter(isFinite), best = fin.length ? Math.min(...fin) : null;
  return `<p class="ck-meta">Cümlelerin %80'i eğitim, %20'si test (her 5. cümle). Test perplexity: düşük = model görmediği metni daha iyi tahmin ediyor. UNK eşiği: <b>${NG.unk ? "≤ " + NG.unk : "kapalı"}</b>.</p>
    <div class="ng-scroll"><table class="ng-tbl ng-cmp"><tr><th>Model</th>${Object.values(SM).map(x => `<th lang="en">${x}</th>`).join("")}</tr>
    ${rows.map(r => `<tr><td><b>${["Unigram", "Bigram", "Trigram"][r.n - 1]}</b></td>${r.v.map(v => `<td class="${v === best ? "best" : ""}">${ppl(v)}${v === best ? " ★" : ""}</td>`).join("")}</tr>`).join("")}</table></div>
    <p class="ck-meta stu">∞ görürsen test cümlesinde modelin hiç görmediği bir n-gram (ya da sözcük) var: olasılık 0. Yumuşatma n-gram'ı kurtarır; bilinmeyen <em>sözcük</em> için UNK gerekir. Backoff puanları normalize olmadığından perplexity'si yaklaşıktır (stupid backoff). Perplexity eğitim kümesinde değil test kümesinde ölçülür; yoksa ezber ödüllendirilir.</p>`;
}

// ───────────────────────── PMI (slayt 34–39)
function pmiHTML(){
  if(!S.length) return "";
  let tok = 0;
  const sents = []; for(const s of S){ if(tok > 150000) break; sents.push(s); tok += s.length; }
  const pm = memo(`pmi|${srcKey()}|${NG.pk}`, () => pmiBuild(sents, NG.pk));
  const top = topPairs(pm, NG.pmin, 20), q = NG.pw.trim() && (NG.lower ? NG.pw.trim().toLocaleLowerCase("tr") : NG.pw.trim());
  let h = `<div class="ng-ctl" style="margin-top:0"><label class="muted" style="font-size:.88rem">pencere ±<input id="pmK" class="dp-num" type="number" min="1" max="10" value="${NG.pk}"></label>
    <label class="muted" style="font-size:.88rem">en az <input id="pmM" class="dp-num" type="number" min="1" value="${NG.pmin}"> kez birlikte</label>
    <label class="field sm" style="flex:1 1 200px"><input id="pmW" type="text" placeholder="Sözcük sorgula (örn. ${NG.src === "boun" ? "okul" : "president"})" autocomplete="off" spellcheck="false" value="${esc(NG.pw)}"></label></div>
    <p class="ng-formula stu">PMI(x, y) = log₂ P(x, y) / (P(x) · P(y)); burada P(x, y), x ve y'nin ±${NG.pk} sözcüklük pencerede birlikte görülme olasılığı. Varsayım: anlamca benzer sözcükler benzer bağlamlarda geçer (slayt 34).</p>`;
  h += `<div class="cp-two"><div><h3 class="ng-h3">En yüksek PMI'lı çiftler</h3>${top.length ? `<table class="ng-tbl"><tr><th>x</th><th>y</th><th>Birlikte</th><th>PMI</th></tr>${top.map(p => `<tr><td><b>${esc(p.a)}</b></td><td><b>${esc(p.b)}</b></td><td>${p.c}</td><td>${p.pmi.toFixed(2)}</td></tr>`).join("")}</table>` : '<p class="ck-meta">Bu eşikte çift yok: “en az” değerini düşür.</p>'}
    <p class="ck-meta stu">PMI nadir çiftleri şişirir (iki sözcük de çok seyrek ve bir kez yan yana gelmişse PMI çok yüksek çıkar); bu yüzden “en az kez birlikte” süzgeci kullanılır.</p></div>`;
  if(q){
    const col = collocates(pm, q, NG.pmin, 12), sim = similar(pm, q, 8, 10);
    h += `<div><h3 class="ng-h3">“${esc(q)}” için</h3>${col.length ? `<p class="ck-meta" style="margin:0 0 4px">Birlikte geçenler (PMI)</p><div class="chips">${col.map(c => `<span class="chip" style="cursor:default">${esc(c.b)} <small>${c.pmi.toFixed(1)} · ${c.c}</small></span>`).join("")}</div>` : `<p class="ck-meta">“${esc(q)}” bu pencerede yeterince geçmiyor.</p>`}
      ${sim.length ? `<p class="ck-meta" style="margin:12px 0 4px">Benzer bağlamlı sözcükler (kosinüs)</p><div class="chips">${sim.map(c => `<span class="chip" style="cursor:default">${esc(c.w)} <small>${c.cos.toFixed(2)}</small></span>`).join("")}</div><p class="ck-meta stu">Her sözcük, bağlam sözcükleriyle PPMI değerlerinden oluşan bir vektörle temsil edilir (slayt 35); iki vektörün kosinüsü ne kadar yüksekse sözcükler o kadar benzer bağlamlarda geçiyor.</p>` : ""}</div>`;
  }
  return h + "</div>";
}

// ───────────────────────── kendin hesapla (öğrenci kipi)
const NQ = {kind:"p", q:null, key:"", score:0, n:0, done:false, right:null};
const pickOf = a => a[Math.floor(Math.random() * a.length)];
const parseVal = str => {
  const t = String(str).trim().replace(",", ".").replace(/\s+/g, "");
  if(!t) return NaN;
  const m = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if(m) return +m[2] ? +m[1] / +m[2] : NaN;
  return /^-?\d*\.?\d+$/.test(t) ? +t : NaN;
};
const closeTo = (v, p) => isFinite(v) && Math.abs(v - p) < 5e-4 + 1e-9;
function nqKey(){ return `${srcKey()}|${NG.n}|${NG.smooth}|${NG.unk}`; }
function makeNQ(){
  const ents = [...M.orders[M.n]].filter(([, e]) => e.total >= 2);
  if(!ents.length) return null;
  const [key, e] = pickOf(ents), hist = M.n === 1 ? [] : key.split(SEP), cf = cfg();
  if(NQ.kind === "p"){
    const seen = [...e.next.keys()], w = Math.random() < .7 ? pickOf(seen) : pickOf(M.cols);
    return {hist, w, key, r:prob(M, hist, w, cf)};
  }
  const words = M.cols.length <= 12 ? M.cols : [...e.next].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  return {hist, key, rows:words.map(w => ({w, r:prob(M, hist, w, cf)})), all:M.cols.length <= 12};
}
function nqHTML(){
  if(!M?.S) return "";
  if(NG.smooth !== "none" && NG.smooth !== "laplace") return '<div class="notice">Elle hesaplamak için yumuşatmayı <b>Yok</b> ya da <b>Laplace +1</b> seç: backoff ve interpolation karışık ağırlıklar kullandığı için kesirle yazılmaz.</div>';
  if(NQ.key !== nqKey()){ NQ.key = nqKey(); NQ.q = null; NQ.done = false; }
  if(!NQ.q) NQ.q = makeNQ();
  const q = NQ.q;
  const head = `<div class="row" style="margin-bottom:12px"><div class="seg"><button data-nq="kind" data-k="p" aria-pressed="${NQ.kind === "p"}">Tek olasılık</button><button data-nq="kind" data-k="row" aria-pressed="${NQ.kind === "row"}">Tablo satırı</button></div><button class="btn sm" data-nq="new">Yeni soru</button><span class="muted" style="font-size:.9rem">${NQ.score} / ${NQ.n} doğru</span></div>`;
  if(!q) return head + '<p class="ck-meta">Bu korpusta soru üretmek için en az iki kez görülen bir bağlam gerekir.</p>';
  const hl = M.n > 1 ? q.hist.join(" ") : "";
  const lap = NG.smooth === "laplace";
  const note = `<p class="ck-meta">Kesir (örn. <span class="ng-t">2/3</span>) ya da ondalık (<span class="ng-t">0.667</span>) yazabilirsin; ${lap ? `Laplace: <span class="ng-t">(C + 1) / (C(bağlam) + V)</span>, V = ${M.V}` : "yumuşatma yok: <span class=\"ng-t\">C(bağlam sözcük) / C(bağlam)</span>"}. Ondalıkta ±0.0005 kabul edilir.</p>`;
  if(NQ.kind === "p"){
    const r = q.r;
    const body = `<p class="mp-q">${M.n > 1 ? `P( ${T(q.w)} | ${T(hl)} ) = ?` : `P( ${T(q.w)} ) = ?`}</p>
      <div class="pair" style="grid-template-columns:1fr auto"><label class="field sm"><input id="nqIn" type="text" autocomplete="off" spellcheck="false" placeholder="örn. 2/3" ${NQ.done ? "disabled" : ""}></label><button class="btn pri sm" data-nq="check" ${NQ.done ? "disabled" : ""}>Kontrol et</button></div>${note}`;
    const res = NQ.done ? `<p class="verdict" style="margin-top:10px">${NQ.right ? "Doğru ✓" : "Yanlış ✗"} · <b>${r.num}/${r.den} = ${dec(r.p)}</b></p><p class="ck-meta">${M.n > 1 ? `C(${T(q.hist.concat(q.w).join(" "))}) = ${r.c}, C(${T(hl)}) = ${r.h}` : `C(${T(q.w)}) = ${r.c}, N = ${r.h}`}${lap ? `, +1 ve V = ${M.V}` : ""}.</p>` : "";
    return head + body + res;
  }
  const rows = q.rows.map((x, i) => `<tr><td>${T(x.w)}</td><td><input class="nq-cell ${NQ.done ? (closeTo(parseVal(NQ.vals?.[i] ?? ""), x.r.p) ? "ok" : "bad") : ""}" data-i="${i}" type="text" autocomplete="off" spellcheck="false" value="${esc(NQ.vals?.[i] ?? "")}" ${NQ.done ? "disabled" : ""}></td>${NQ.done ? `<td class="muted">${x.r.num}/${x.r.den} = ${dec(x.r.p)}</td>` : ""}</tr>`).join("");
  const sumRow = NQ.done ? `<p class="verdict" style="margin-top:10px">${NQ.right ? "Hepsi doğru ✓" : "Bazıları yanlış ✗"} · toplam ${dec(q.rows.reduce((a, x) => a + x.r.p, 0))}${q.all ? " (tüm sözlük: 1 olmalı)" : " (yalnızca gösterilen sözcükler)"}</p>` : "";
  return head + `<p class="mp-q">${M.n > 1 ? `${T(hl)} bağlamından sonra gelen her sözcük için P(· | ${T(hl)}) yaz:` : "Her sözcük için P(w) yaz:"}</p>
    <table class="ng-tbl nq-tbl"><tr><th>Sonraki</th><th>Olasılık</th>${NQ.done ? "<th>Doğru</th>" : ""}</tr>${rows}</table>
    ${NQ.done ? "" : '<button class="btn pri sm" data-nq="check" style="margin-top:10px">Kontrol et</button>'}${note}${sumRow}`;
}
function renderNQ(){ const el = $("#ngQuiz", root); if(el) el.innerHTML = nqHTML(); }
function nqAct(a, d){
  if(a === "kind"){ NQ.kind = d.k; NQ.q = null; NQ.done = false; NQ.vals = []; }
  else if(a === "new"){ NQ.q = null; NQ.done = false; NQ.vals = []; }
  else if(a === "check" && NQ.q){
    if(NQ.kind === "p"){ const v = parseVal($("#nqIn", root).value); if(!isFinite(v)) return; NQ.right = closeTo(v, NQ.q.r.p); }
    else{ NQ.vals = $$(".nq-cell", root).map(i => i.value); NQ.right = NQ.q.rows.every((x, i) => closeTo(parseVal(NQ.vals[i]), x.r.p)); }
    NQ.done = true; NQ.n++; if(NQ.right) NQ.score++;
  }
  renderNQ();
}

// ───────────────────────── kabuk
function syncControls(){
  const p = PRESETS[NG.preset];
  $$("[data-n]", root).forEach(b => b.setAttribute("aria-pressed", +b.dataset.n === NG.n));
  $$("[data-sm]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.sm === NG.smooth));
  $$("[data-src]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.src === NG.src));
  $$("[data-preset]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.preset === NG.preset && NG.text === p?.text));
  $("#ngLower", root).checked = NG.lower;
  $("#ngUnk", root).value = String(NG.unk);
  $("#ngSize", root).value = String(NG.limit);
  $("#ngTextBox", root).classList.toggle("hidden", NG.src !== "text");
  $("#ngBrown", root).classList.toggle("hidden", NG.src !== "brown");
  $("#ngAlpha", root).classList.toggle("hidden", NG.smooth !== "backoff");
  const li = $("#ngLam", root), showLam = NG.smooth === "interp" && NG.n >= 2;
  li.classList.toggle("hidden", !showLam);
  if(showLam) li.innerHTML = `<span class="muted" style="font-size:.88rem">λ (birimden ${NG.n}-gram'a):</span>` + lamFor(NG.n).map((v, i) => `<input class="dp-num" data-lam="${i}" type="number" step="0.05" min="0" max="1" value="${v}" aria-label="λ${i + 1}">`).join("") + `<small class="muted stu">toplam 1'e normalize edilir</small>`;
  $("#ngAlphaIn", root).value = NG.alpha;
}
function renderAll(){
  if(!M) return;
  syncControls();
  $("#ngExplain", root).innerHTML = explainHTML();
  $("#ngStats", root).innerHTML = statsHTML();
  $("#ngTables", root).innerHTML = tablesHTML();
  $("#ngPredEx", root).innerHTML = ex("pred");
  $("#ngSentEx", root).innerHTML = ex("sent");
  renderPred(); renderSent(); renderMore();
  save();
}
const renderPred = () => { if(M){ $("#ngPredOut", root).innerHTML = predHTML(); save(); } };
const renderSent = () => { if(M){ $("#ngSentOut", root).innerHTML = sentHTML(); save(); } };
function renderMore(){
  $("#ngGen", root).innerHTML = genHTML();
  $("#ngCmp", root).innerHTML = cmpHTML();
  $("#ngPmi", root).innerHTML = pmiHTML();
  renderNQ();
}
function renderTablesOnly(){ if(!M) return; $("#ngTables", root).innerHTML = tablesHTML(); renderPred(); renderSent(); $("#ngStats", root).innerHTML = statsHTML(); save(); }
function ex(kind){
  const p = NG.src === "text" ? PRESETS[NG.preset] : null;
  const list = kind === "pred"
    ? [...S.slice(0, 3).map(s => s.slice(0, Math.max(1, M.n - 1)).join(" ")), ...(p?.pred ? [p.pred] : [])]
    : [...S.slice(0, 3).map(s => s.slice(0, 12).join(" ")), ...(p?.extra || [])];
  return [...new Set(list)].filter(Boolean).slice(0, 5).map(t => `<button class="chip" data-ex="${kind}" data-t="${esc(t)}">${esc(t)}</button>`).join("");
}
async function refresh(){
  const my = ++token;
  if(NG.src !== "text") $("#ngState", root).textContent = "yükleniyor…";
  try{ S = await getSents(); }catch(_){ S = []; }
  if(my !== token) return;
  $("#ngState", root).textContent = "";
  M = memo(`m|${srcKey()}|${NG.n}|${NG.unk}`, () => buildModel(S, NG.n, {unk:NG.unk}));
  renderAll();
}
const sync = () => { $("#ngText", root).value = NG.text; $("#ngPred", root).value = NG.pred; $("#ngSent", root).value = NG.sent; };
function keep(id){ const el = $("#" + id, root); if(el){ el.focus(); const v = el.value; el.value = ""; el.value = v; } }

function mount(){
  if(root) return;
  load();
  root = $("#v-ngram");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">N-gram dil modeli</h1>
    <p class="lesson-intro" style="margin:0">Bir korpustan sözcük dizilerinin olasılığını hesapla: sayımlar, koşullu olasılık, yumuşatma (Laplace, backoff, interpolation), bilinmeyen sözcük (UNK), cümle olasılığı, perplexity, rastgele cümle üretimi ve PMI.<span class="stu"> Slayt 17–39, InClass 5.</span></p>
    <h2 class="ng-h">1 · Korpus <small id="ngState"></small></h2>
    <div class="ng-ctl" style="margin-top:0"><div class="seg" role="group" aria-label="Korpus kaynağı"><button data-src="text">Kendi metnim</button><button data-src="boun">${esc(CORPORA.boun.label)}</button><button data-src="brown">${esc(CORPORA.brown.label)}</button></div>
      <label id="ngBrown" class="muted hidden" style="font-size:.88rem">Cümle sayısı <select id="ngSize" class="btn sm"><option value="1000">1.000</option><option value="5000">5.000</option><option value="20000">20.000</option><option value="0">tümü</option></select></label>
      <a class="muted" href="#" data-go="corpus" style="font-size:.86rem">Korpus gezgininde incele →</a></div>
    <div id="ngTextBox"><textarea class="ta" id="ngText" rows="5" spellcheck="false" aria-label="Korpus, her satır bir cümle"></textarea>
    <p class="ng-formula" style="margin:6px 0 0">Her satır bir cümle (nokta, soru ve ünlem de cümleyi böler). <span class="ng-t">&lt;s&gt;</span> ve <span class="ng-t">&lt;/s&gt;</span> otomatik eklenir; noktalama atılır.</p>
    <div class="chips" style="margin-top:10px">${Object.entries(PRESETS).map(([k, p]) => `<button class="chip${p.stu ? " stu" : ""}" data-preset="${k}">${esc(p.label)}</button>`).join("")}</div></div>
    <div class="ng-ctl">
      <div class="seg" role="group" aria-label="N"><button data-n="1">Unigram</button><button data-n="2">Bigram</button><button data-n="3">Trigram</button></div>
      <div class="seg" role="group" aria-label="Yumuşatma">${Object.entries(SM).map(([k, v]) => `<button data-sm="${k}">${esc(v)}</button>`).join("")}</div>
      <label class="muted" style="font-size:.88rem">UNK eşiği <select id="ngUnk" class="btn sm"><option value="0">kapalı</option><option value="1">sayım ≤ 1</option><option value="2">sayım ≤ 2</option><option value="5">sayım ≤ 5</option></select></label>
      <label class="chk"><input type="checkbox" id="ngLower"> küçük harf</label>
      <label id="ngAlpha" class="muted hidden" style="font-size:.88rem">α <input id="ngAlphaIn" class="dp-num" type="number" step="0.05" min="0" max="1" value="0.4"></label>
      <span id="ngLam" class="hidden" style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap"></span></div>
    <div class="ng-expl stu" id="ngExplain"></div>
    <div id="ngStats"></div>
    <h2 class="ng-h">2 · Sayımlar ve olasılıklar</h2>
    <div id="ngTables" aria-live="polite"></div>
    <h2 class="ng-h">3 · Sonraki sözcük <small>“the cat X” tipi soru</small></h2>
    <label class="field sm">Geçmiş<input id="ngPred" type="text" autocomplete="off" spellcheck="false" placeholder="örn. the cat"></label>
    <div class="chips" id="ngPredEx" style="margin-top:10px"></div>
    <div id="ngPredOut" aria-live="polite"></div>
    <h2 class="ng-h">4 · Cümle olasılığı ve perplexity</h2>
    <label class="field sm">Cümle<input id="ngSent" type="text" autocomplete="off" spellcheck="false" placeholder="örn. I am Sam"></label>
    <div class="chips" id="ngSentEx" style="margin-top:10px"></div>
    <div id="ngSentOut" aria-live="polite"></div>
    <h2 class="ng-h">5 · Rastgele cümle üretimi <small><button class="btn sm" id="ngRegen">Yeniden üret</button></small></h2>
    <div id="ngGen"></div>
    <h2 class="ng-h">6 · Yumuşatma karşılaştırması <small>test perplexity</small></h2>
    <div id="ngCmp"></div>
    <h2 class="ng-h">7 · PMI <small>birlikte geçiş</small></h2>
    <div id="ngPmi"></div>
    <div class="stu"><h2 class="ng-h">8 · Kendin hesapla <small>önce sen, sonra kontrol</small></h2><div id="ngQuiz"></div></div>
    <div style="height:56px"></div></div>`;
  const text = $("#ngText", root);
  let t;
  const later = f => { clearTimeout(t); t = setTimeout(f, 220); };
  text.addEventListener("input", () => { NG.text = text.value; later(refresh); });
  $("#ngPred", root).addEventListener("input", e => { NG.pred = e.target.value; renderPred(); });
  $("#ngSent", root).addEventListener("input", e => { NG.sent = e.target.value; renderSent(); });
  $("#ngLower", root).addEventListener("change", e => { NG.lower = e.target.checked; refresh(); });
  $("#ngUnk", root).addEventListener("change", e => { NG.unk = +e.target.value; refresh(); });
  $("#ngSize", root).addEventListener("change", e => { NG.limit = +e.target.value; refresh(); });
  $("#ngAlphaIn", root).addEventListener("input", e => { NG.alpha = Math.min(1, Math.max(0, +e.target.value)); later(() => { renderAll(); }); });
  $("#ngRegen", root).addEventListener("click", () => { $("#ngGen", root).innerHTML = genHTML(); });
  root.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.id === "nqIn") root.querySelector('[data-nq="check"]')?.click(); });
  root.addEventListener("input", e => {
    const d = e.target;
    if(d.dataset.lam !== undefined){ const l = lamFor(NG.n).slice(); l[+d.dataset.lam] = Math.max(0, +d.value || 0); NG.lam[NG.n] = l; later(() => { renderTablesOnly(); $("#ngCmp", root).innerHTML = cmpHTML(); }); }
    else if(d.id === "pmK"){ NG.pk = Math.min(10, Math.max(1, +d.value || 2)); later(() => { $("#ngPmi", root).innerHTML = pmiHTML(); keep("pmK"); save(); }); }
    else if(d.id === "pmM"){ NG.pmin = Math.max(1, +d.value || 1); later(() => { $("#ngPmi", root).innerHTML = pmiHTML(); keep("pmM"); save(); }); }
    else if(d.id === "pmW"){ NG.pw = d.value; later(() => { $("#ngPmi", root).innerHTML = pmiHTML(); keep("pmW"); save(); }); }
  });
  root.addEventListener("click", e => {
    const go = e.target.closest("[data-go]"); if(go){ e.preventDefault(); setView(go.dataset.go); return; }
    const nq = e.target.closest("[data-nq]"); if(nq){ nqAct(nq.dataset.nq, nq.dataset); return; }
    const b = e.target.closest("[data-n],[data-sm],[data-src],[data-preset],[data-hist],[data-ex]"); if(!b) return;
    const d = b.dataset;
    if(d.n){ NG.n = +d.n; NG.hist = ""; }
    else if(d.sm){ NG.smooth = d.sm; }
    else if(d.src){ NG.src = d.src; NG.hist = ""; if(d.src !== "text") NG.lower = true; }
    else if(d.preset){ const p = PRESETS[d.preset]; Object.assign(NG, {src:"text", preset:d.preset, text:p.text, n:p.n, pred:p.pred, sent:p.sent, hist:""}); sync(); }
    else if(d.hist !== undefined){ NG.hist = d.hist; renderTablesOnly(); return; }
    else if(d.ex){ NG[d.ex] = d.t; sync(); renderPred(); renderSent(); return; }
    refresh();
  });
}

export const view = {
  apply(p){ if(p.src){ NG.src = p.src; NG.hist = ""; if(p.limit != null) NG.limit = p.limit; } },
  async enter(){ mount(); sync(); await refresh(); }
};
registerView("ngram", view);
