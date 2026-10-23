// N-gram: Lecture 5 (Corpus & Language Models). Korpustan sayım, koşullu olasılık, cümle olasılığı, Laplace, perplexity. Tamamı tarayıcıda hesaplanır.
import {$, $$, esc, registerView} from "./core.js";

const BOS = "<s>", EOS = "</s>", SEP = "\u0001";
const PRESETS = {
  slayt: {label:"Slayt 24 · I am Sam", text:"I am Sam\nSam I am\nI fly", n:2, pred:"I", sent:"I am Sam", extra:["I am fly", "Sam fly"]},
  inclass5: {label:"InClass 5", text:"the dog barks\nthe cat laughs\nthe cat saw the dog\nthe\ncat the dog the\ncat cat cat", n:2, pred:"the cat", sent:"the cat laughs", extra:["the cat saw the dog", "the cat barks"]},
  tr: {label:"Türkçe örnek", text:"bu çocuk bugün okula gidecek\nbu çocuk yarın okula gidecek\no çocuk bugün eve gidecek\nbu kız bugün okula gitmedi", n:2, pred:"bu çocuk", sent:"bu çocuk bugün okula gidecek", extra:["bu çocuk yarın eve gidecek"]}
};
const NG = {text:PRESETS.slayt.text, n:2, lower:false, smooth:false, pred:PRESETS.slayt.pred, sent:PRESETS.slayt.sent, hist:"", preset:"slayt"};
const KEY = "wn:ngram";
let root = null, model = null;

const load = () => { try{ Object.assign(NG, JSON.parse(localStorage.getItem(KEY)) || {}); }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(NG)); }catch(_){} };

// ───────────────────────── metin → belirteç
const clean = s => s.replace(/<\/?s>/g, " ").replace(/[.,;:!?"“”()]+/g, " ").trim();
const words = s => { const t = clean(s); return t ? (NG.lower ? t.toLocaleLowerCase("tr") : t).split(/\s+/) : []; };
const sentences = text => text.split(/\n+|(?<=[.!?])\s+/).map(words).filter(w => w.length);

// ───────────────────────── model
function build(sents, n){
  const uni = new Map(), hists = new Map();
  let N = 0, grams = 0;
  for(const s of sents){
    for(const w of s){ uni.set(w, (uni.get(w) || 0) + 1); N++; }
    if(n < 2) continue;
    const p = [...Array(n - 1).fill(BOS), ...s, EOS];
    for(let i = n - 1; i < p.length; i++){
      const h = p.slice(i - n + 1, i).join(SEP), w = p[i];
      let e = hists.get(h); if(!e){ e = {total:0, next:new Map()}; hists.set(h, e); }
      e.total++; e.next.set(w, (e.next.get(w) || 0) + 1); grams++;
    }
  }
  const vocab = [...uni.keys()];                      // ilk geçiş sırası (slayttaki tablo sırası)
  const cols = n > 1 ? [...vocab, EOS] : vocab;       // tahmin edilebilen simgeler
  return {n, sents, uni, hists, N, vocab, cols, V:cols.length, grams, types:n > 1 ? [...hists.values()].reduce((a, e) => a + e.next.size, 0) : uni.size};
}
// P(w | geçmiş): pay/payda, kesir ve ondalık birlikte; payda 0 ise tanımsız
function prob(m, hist, w){
  let c, h;
  if(m.n === 1){ c = m.uni.get(w) || 0; h = m.N; }
  else{ const e = m.hists.get(hist.join(SEP)); c = e?.next.get(w) || 0; h = e?.total || 0; }
  const num = c + (NG.smooth ? 1 : 0), den = h + (NG.smooth ? m.V : 0);
  return {c, h, num, den, p:den ? num / den : 0, und:!den};
}
const pad = (m, toks) => { const t = toks.slice(-(m.n - 1)); return [...Array(m.n - 1 - t.length).fill(BOS), ...t]; };
const histLabel = key => key.split(SEP).map(esc).join(" ");

// ───────────────────────── biçim
const fr = r => `${r.num}/${r.den}`;
const dec = p => p === 0 ? "0" : p >= .001 ? (+p.toFixed(4)).toString() : p.toExponential(2);
const lg = p => p > 0 ? Math.log2(p) : -Infinity;
const lgs = v => v === -Infinity ? "−∞" : v.toFixed(3).replace("-", "−");
const T = s => `<span class="ng-t">${esc(s)}</span>`;
const meter = v => `<div class="meter"><i><b style="width:${Math.min(1, v) * 100}%"></b></i></div>`;
const sortNext = (m, hist, list) => list.map(w => ({w, ...prob(m, hist, w)})).sort((a, b) => b.p - a.p || b.c - a.c || a.w.localeCompare(b.w, "tr"));

function formula(m){
  const k = NG.smooth;
  if(m.n === 1) return k ? "P(w) = (C(w) + 1) / (N + V)" : "P(w) = C(w) / N";
  const h = m.n === 2 ? "wᵢ₋₁" : "wᵢ₋₂ wᵢ₋₁";
  return k ? `P(wᵢ | ${h}) = (C(${h} wᵢ) + 1) / (C(${h}) + V)` : `P(wᵢ | ${h}) = C(${h} wᵢ) / C(${h})`;
}

// ───────────────────────── bölüm 1: sayımlar
function distTable(m, key){
  const hist = key ? key.split(SEP) : [];
  let rows = sortNext(m, hist, m.cols);
  if(!NG.smooth) rows = rows.filter(r => r.c > 0);
  const total = rows.length && m.n > 1 ? rows[0].h : m.N, sum = rows.reduce((a, r) => a + r.p, 0);
  const shown = rows.slice(0, 30), rest = rows.length - shown.length;
  const head = m.n > 1 ? `<span class="ng-t">${histLabel(key)}</span> sözcüğünden sonra gelenler` : "Sözcük olasılıkları";
  const ok = Math.abs(sum - 1) < 1e-9;
  return `<table class="ng-tbl"><caption>${head} · ${m.n > 1 ? `C(<b>${histLabel(key)}</b>) = ${total}` : `N = ${total}`}${NG.smooth ? ` · V = ${m.V}` : ""}</caption>
    <tr><th>${m.n > 1 ? "Sonraki" : "Sözcük"}</th><th>Sayım</th><th>Kesir</th><th>Olasılık</th><th class="ng-bar"></th></tr>
    ${shown.map(r => `<tr><td>${T(r.w)}</td><td>${r.c}</td><td>${fr(r)}</td><td><b>${dec(r.p)}</b></td><td class="ng-bar">${meter(r.p)}</td></tr>`).join("")}
    ${rest > 0 ? `<tr><td colspan="5" class="muted">… ve ${rest} sözcük daha</td></tr>` : ""}
    <tr class="sum"><td>Toplam</td><td>${rows.reduce((a, r) => a + r.c, 0)}</td><td></td><td><b>${dec(sum)}</b></td><td class="ng-bar">${ok ? '<span class="ng-ok">Σ = 1 ✓</span>' : `<span class="ng-bad">Σ ≠ 1</span>`}</td></tr></table>`;
}
function matrix(m){
  const rows = [BOS, ...m.vocab].filter(h => m.hists.has(h));
  const sel = NG.hist;
  return `<div class="ng-scroll"><table class="ng-mx"><caption>Bigram tablosu · satır: önceki sözcük, sütun: sonraki sözcük${NG.smooth ? " · Laplace" : ""}</caption>
    <tr><th></th>${m.cols.map(c => `<th>${T(c)}</th>`).join("")}<th>Σ</th></tr>
    ${rows.map(h => {
      let sum = 0;
      const cells = m.cols.map(c => { const r = prob(m, [h], c); sum += r.p; return `<td class="${r.p ? "" : "z"}"><b>${fr(r)}</b><small>${dec(r.p)}</small></td>`; }).join("");
      return `<tr class="${h === sel ? "sel" : ""}" data-hist="${esc(h)}"><th>${T(h)}</th>${cells}<td class="sum">${dec(sum)}</td></tr>`;
    }).join("")}</table></div>`;
}
function tablesHTML(m){
  if(!m.sents.length) return '<div class="empty">Yukarıya en az bir cümle yaz.</div>';
  let h = `<p class="ng-formula">${esc(formula(m))}${NG.smooth ? " <small>· V = sözcük türü sayısı" + (m.n > 1 ? " + </s>" : "") + `, burada ${m.V}</small>` : ""}</p>`;
  if(m.n === 1) return h + distTable(m, "");
  if(!NG.hist || !m.hists.has(NG.hist)) NG.hist = [...m.hists.keys()].sort((a, b) => m.hists.get(b).total - m.hists.get(a).total)[0];
  if(m.n === 2 && m.cols.length <= 12) h += matrix(m);
  const keys = [...m.hists.keys()].sort((a, b) => m.hists.get(b).total - m.hists.get(a).total || a.localeCompare(b, "tr"));
  h += `<h3 class="ng-h3">Geçmiş seç <small>${m.n === 2 ? "tablodan satıra da tıklayabilirsin" : "yan yana " + (m.n - 1) + " sözcük"}</small></h3>
    <div class="chips">${keys.slice(0, 40).map(k => `<button class="chip" data-hist="${esc(k)}" aria-pressed="${k === NG.hist}">${histLabel(k)} <small>${m.hists.get(k).total}</small></button>`).join("")}${keys.length > 40 ? `<span class="muted">+${keys.length - 40}</span>` : ""}</div>`;
  return h + distTable(m, NG.hist);
}

// ───────────────────────── bölüm 2: sonraki sözcük
function predHTML(m){
  if(!m.sents.length) return "";
  const toks = words(NG.pred), hist = m.n > 1 ? pad(m, toks) : [];
  const ctx = m.n > 1 ? hist.map(esc).join(" ") : "";
  const rows = sortNext(m, hist, m.cols).filter(r => NG.smooth || r.c > 0).slice(0, 6);
  const line = `<p class="ng-pred">${ctx ? `<span class="ng-t">${ctx}</span> ` : ""}<span class="ng-blank">X</span></p>`;
  if(!rows.length) return line + `<div class="notice warn">Bu geçmiş korpusta hiç yok: C(${ctx}) = 0, olasılık 0/0 <b>tanımsız</b>. Laplace'ı aç: her sözcük 1/V olur.</div>`;
  const top = rows[0], ties = rows.filter(r => r.p === top.p);
  const why = m.n > 1 ? `C(${T(hist.concat(top.w).join(" "))}) = ${top.c}, C(${T(hist.join(" "))}) = ${top.h}, yani <b>${fr(top)} = ${dec(top.p)}</b>.` : `C(${T(top.w)}) = ${top.c}, N = ${top.h}, yani <b>${fr(top)} = ${dec(top.p)}</b>.`;
  const verdict = ties.length > 1 ? `Beraberlik: ${ties.map(r => T(r.w)).join(", ")} aynı olasılıkta (${fr(top)}). ${why}` : `En olası sonraki sözcük ${T(top.w)}. ${why}`;
  return `${line}<p class="verdict">${verdict}</p>
    <table class="ng-tbl"><tr><th>Aday</th><th>Sayım</th><th>Kesir</th><th>Olasılık</th><th class="ng-bar"></th></tr>
    ${rows.map(r => `<tr><td>${T(r.w)}</td><td>${r.c}</td><td>${fr(r)}</td><td><b>${dec(r.p)}</b></td><td class="ng-bar">${meter(r.p)}</td></tr>`).join("")}</table>`;
}

// ───────────────────────── bölüm 3: cümle olasılığı
function seqLogProb(m, toks){
  const p = m.n > 1 ? [...Array(m.n - 1).fill(BOS), ...toks, EOS] : toks, steps = [];
  for(let i = m.n > 1 ? m.n - 1 : 0; i < p.length; i++){
    const hist = m.n > 1 ? p.slice(i - m.n + 1, i) : [];
    steps.push({hist, w:p[i], ...prob(m, hist, p[i]), oov:!m.uni.has(p[i]) && p[i] !== EOS});
  }
  let prod = 1, ls = 0;
  for(const s of steps){ prod *= s.p; ls += lg(s.p); s.prod = prod; s.ls = ls; }
  return {steps, prod, ls, N:steps.length, ppl:Math.pow(2, -ls / steps.length)};
}
function sentHTML(m){
  if(!m.sents.length) return "";
  const toks = words(NG.sent);
  if(!toks.length) return '<div class="empty" style="padding:24px 0">Bir cümle yaz.</div>';
  const r = seqLogProb(m, toks), zero = r.steps.some(s => s.p === 0), oov = r.steps.filter(s => s.oov);
  const lab = s => m.n > 1 ? `P(${T(s.w)} | ${T(s.hist.join(" "))})` : `P(${T(s.w)})`;
  const warn = (zero ? `<div class="notice warn">Bir çarpan <b>0</b>: ${r.steps.filter(s => s.p === 0).map(s => lab(s)).join(", ")}. Çarpım 0, log 0 tanımsız (−∞), perplexity ∞. ${NG.smooth ? "" : "Çözüm: Laplace (add-one) yumuşatma."}</div>` : "")
    + (oov.length ? `<div class="notice">${oov.map(s => T(s.w)).join(", ")} korpusta yok (OOV). Gerçek sistemlerde <span class="ng-t">UNK</span> simgesine eşlenir.</div>` : "");
  const prodStr = r.steps.map(fr).join(" × ");
  return `<p class="verdict">P = ${r.steps.map(s => dec(s.p)).join(" × ")} = <b>${dec(r.prod)}</b></p>
    <p class="ng-formula">${m.n > 1 ? `${T(BOS)} (×${m.n - 1}) ve ${T(EOS)} otomatik eklenir` : "Unigram'da yalnızca sözcükler çarpılır"} · ${r.N} çarpan</p>${warn}
    <div class="ng-scroll"><table class="ng-tbl"><tr><th>#</th><th>Çarpan</th><th>Kesir</th><th>Değer</th><th>log₂</th><th>Birikmiş çarpım</th></tr>
    ${r.steps.map((s, i) => `<tr class="${s.p === 0 ? "bad" : ""}"><td>${i + 1}</td><td>${lab(s)}</td><td>${s.und ? "0/0" : fr(s)}</td><td><b>${dec(s.p)}</b></td><td>${lgs(lg(s.p))}</td><td>${dec(s.prod)}</td></tr>`).join("")}
    <tr class="sum"><td></td><td>Toplam</td><td></td><td><b>${dec(r.prod)}</b></td><td><b>${lgs(r.ls)}</b></td><td></td></tr></table></div>
    <p class="ng-formula">${esc(prodStr)}</p>
    <p class="verdict" style="margin-top:10px">Perplexity = ${isFinite(r.ls) ? `2<sup>${(-r.ls).toFixed(3)} / ${r.N}</sup> = ` : ""}<b>${isFinite(r.ppl) ? r.ppl.toFixed(3) : "∞"}</b> <small class="muted">(düşük = model cümleyi daha az “şaşırtıcı” buluyor)</small></p>`;
}

// ───────────────────────── kabuk
function statsHTML(m){
  if(!m.sents.length) return "";
  let ls = 0, n = 0;
  for(const s of m.sents){ const r = seqLogProb(m, s); ls += r.ls; n += r.N; }
  const ppl = Math.pow(2, -ls / n);
  const cell = (a, b) => `<div><b>${a}</b><span>${b}</span></div>`;
  return `<div class="ng-stats">${cell(m.sents.length, "cümle")}${cell(m.N, "sözcük (N)")}${cell(m.vocab.length, "sözcük türü")}${cell(m.V, "V (tahmin edilen simge)")}${cell(m.types, m.n === 1 ? "farklı unigram" : "farklı " + m.n + "-gram")}${cell(isFinite(ppl) ? ppl.toFixed(2) : "∞", "korpus perplexity")}</div>`;
}
function renderCorpus(){
  model = build(sentences(NG.text), NG.n);
  $("#ngStats", root).innerHTML = statsHTML(model);
  $("#ngTables", root).innerHTML = tablesHTML(model);
  $("#ngPredEx", root).innerHTML = ex("pred");
  $("#ngSentEx", root).innerHTML = ex("sent");
  renderPred(); renderSent();
  const p = PRESETS[NG.preset];
  $$("[data-n]", root).forEach(b => b.setAttribute("aria-pressed", +b.dataset.n === NG.n));
  $$("[data-sm]", root).forEach(b => b.setAttribute("aria-pressed", (b.dataset.sm === "1") === NG.smooth));
  $$("[data-preset]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.preset === NG.preset && NG.text === p?.text));
  $("#ngLower", root).checked = NG.lower;
  save();
}
const renderPred = () => { $("#ngPredOut", root).innerHTML = predHTML(model); save(); };
const renderSent = () => { $("#ngSentOut", root).innerHTML = sentHTML(model); save(); };
function ex(kind){
  const p = PRESETS[NG.preset], list = kind === "pred"
    ? [...model.sents.slice(0, 3).map(s => s.slice(0, Math.max(1, model.n - 1)).join(" ")), ...(p?.pred ? [p.pred] : [])]
    : [...model.sents.slice(0, 3).map(s => s.join(" ")), ...(p?.extra || [])];
  return [...new Set(list)].slice(0, 5).map(t => `<button class="chip" data-ex="${kind}" data-t="${esc(t)}">${esc(t)}</button>`).join("");
}

function mount(){
  if(root) return;
  load();
  root = $("#v-ngram");
  root.innerHTML = `<div class="page">
    <h1 class="page-title">N-gram dil modeli</h1>
    <p class="lesson-intro" style="margin:0">Bir korpustan sözcük dizilerinin olasılığını öğren: sayımlar, koşullu olasılık, cümle olasılığı, log, Laplace ve perplexity. Slayt 17–33, InClass 5.</p>
    <h2 class="ng-h">1 · Korpus</h2>
    <textarea class="ta" id="ngText" rows="5" spellcheck="false" aria-label="Korpus, her satır bir cümle"></textarea>
    <p class="ng-formula" style="margin:6px 0 0">Her satır bir cümle (nokta, soru ve ünlem de cümleyi böler). <span class="ng-t">&lt;s&gt;</span> ve <span class="ng-t">&lt;/s&gt;</span> otomatik eklenir; noktalama atılır.</p>
    <div class="ng-ctl">
      <div class="chips">${Object.entries(PRESETS).map(([k, p]) => `<button class="chip" data-preset="${k}">${esc(p.label)}</button>`).join("")}</div>
      <div class="seg" role="group" aria-label="N"><button data-n="1">Unigram</button><button data-n="2">Bigram</button><button data-n="3">Trigram</button></div>
      <div class="seg" role="group" aria-label="Yumuşatma"><button data-sm="0">Yumuşatma yok</button><button data-sm="1">Laplace +1</button></div>
      <label class="chk"><input type="checkbox" id="ngLower"> küçük harf</label>
    </div>
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
    <div style="height:56px"></div></div>`;
  const text = $("#ngText", root);
  let t;
  text.addEventListener("input", () => { NG.text = text.value; clearTimeout(t); t = setTimeout(renderCorpus, 160); });
  $("#ngPred", root).addEventListener("input", e => { NG.pred = e.target.value; renderPred(); });
  $("#ngSent", root).addEventListener("input", e => { NG.sent = e.target.value; renderSent(); });
  $("#ngLower", root).addEventListener("change", e => { NG.lower = e.target.checked; renderCorpus(); });
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-n],[data-sm],[data-preset],[data-hist],[data-ex]"); if(!b) return;
    const d = b.dataset;
    if(d.n){ NG.n = +d.n; NG.hist = ""; }
    else if(d.sm !== undefined) NG.smooth = d.sm === "1";
    else if(d.preset){ const p = PRESETS[d.preset]; Object.assign(NG, {preset:d.preset, text:p.text, n:p.n, pred:p.pred, sent:p.sent, hist:""}); sync(); }
    else if(d.hist !== undefined){ NG.hist = d.hist; }
    else if(d.ex){ NG[d.ex] = d.t; sync(); }
    renderCorpus();
  });
}
function sync(){ $("#ngText", root).value = NG.text; $("#ngPred", root).value = NG.pred; $("#ngSent", root).value = NG.sent; }

export const view = {
  apply(){},
  async enter(){ mount(); sync(); renderCorpus(); }
};
registerView("ngram", view);
