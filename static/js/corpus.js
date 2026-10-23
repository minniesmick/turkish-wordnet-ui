// Korpus gezgini: Lecture 5'in korpus kısmı. BOUN (Türkçe) ya da Brown (İngilizce) üzerinde sıklık listesi, Zipf grafiği, KWIC ve korpus istatistikleri.
import {$, $$, esc, tr as num, registerView, setView, MODE} from "./core.js";
import {CORPORA, loadCorpus, tokensOf} from "./corpusdata.js";

const CS = {name:"boun", n:5000, unit:"form", lower:true, punct:false, ngram:1, minf:1, q:"", kw:"", win:5, sort:"pos", upos:""};
const KEY = "wn:corpus";
let root = null, C = null, T = null, FREQ = null, busy = 0;

const load = () => { try{ Object.assign(CS, JSON.parse(localStorage.getItem(KEY)) || {}); }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(CS)); }catch(_){} };
const lowerOf = s => CS.name === "boun" ? s.toLocaleLowerCase("tr") : s.toLowerCase();
const cmp = s => (a, b) => a.localeCompare(b, CS.name === "boun" ? "tr" : "en");

// ───────────────────────── hesap
function ngrams(sents, g){
  const f = new Map();
  for(const s of sents) for(let i = 0; i + g <= s.length; i++){
    const k = g === 1 ? s[i] : s.slice(i, i + g).join(" ");
    f.set(k, (f.get(k) || 0) + 1);
  }
  return f;
}
async function recompute(){
  const my = ++busy;
  $("#cpState", root).textContent = "yükleniyor…";
  C = await loadCorpus(CS.name, CS.n);
  if(my !== busy) return;
  const opt = {lemma:CS.unit === "lemma" && CS.name === "boun", lower:CS.lower, punct:CS.punct};
  T = tokensOf(C, opt);                                                   // KWIC ve istatistikler için süzgeçsiz birim dizisi
  const filt = CS.ngram === 1 && CS.upos && CS.name === "boun" ? tokensOf(C, {...opt, upos:CS.upos}) : T;
  FREQ = {uni:ngrams(T, 1), list:ngrams(filt, CS.ngram)};
  $("#cpState", root).textContent = "";
  renderAll();
}
function stats(){
  const N = [...FREQ.uni.values()].reduce((a, b) => a + b, 0), V = FREQ.uni.size;
  const hapax = [...FREQ.uni.values()].filter(c => c === 1).length;
  return {S:T.length, N, V, ttr:V / N, hapax, avg:N / T.length};
}

// ───────────────────────── çıktı
function statsHTML(){
  const s = stats(), cell = (a, b) => `<div><b>${a}</b><span>${b}</span></div>`;
  const uposChips = CS.name === "boun" ? (() => {
    const u = new Map();
    for(const x of C.sents) for(const p of x.p) u.set(p, (u.get(p) || 0) + 1);
    return `<div class="chips" style="margin-top:10px"><span class="muted" style="font-size:.84rem;align-self:center">UPOS:</span>${[...u].sort((a, b) => b[1] - a[1]).map(([p, c]) => `<button class="chip" data-act="upos" data-p="${esc(p)}" aria-pressed="${CS.upos === p}">${esc(p)} <small>${num(c)}</small></button>`).join("")}</div>`;
  })() : "";
  return `<div class="ng-stats">${cell(num(s.S), "cümle")}${cell(num(s.N), "sözcük (token)")}${cell(num(s.V), "farklı sözcük (tür)")}${cell(s.ttr.toFixed(3), "type/token oranı")}${cell(num(s.hapax), `tek geçen (%${(100 * s.hapax / s.V).toFixed(0)} tür)`)}${cell(s.avg.toFixed(1), "cümle başına sözcük")}</div>${uposChips}`;
}
function metaHTML(){
  const rows = CS.name === "boun" ? (() => {
    const pre = new Map();
    for(const x of C.sents){ const p = x.id.split("_")[0]; pre.set(p, (pre.get(p) || 0) + 1); }
    return [["Ortam (modality)", "yazılı"], ["Dil", "Türkçe"], ["Boyut", `${num(C.total)} cümle (küçük)`], ["Kaynak etiketi", [...pre].sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p}_ (${c})`).join(", ")], ["Anotasyon", "lemma, UPOS, FEATS, bağımlılık ağacı (çok düzeyli)"], ["Kullanım", "bağımlılık ayrıştırıcı eğitimi ve değerlendirmesi (test kümesi)"]];
  })() : [["Ortam (modality)", "yazılı"], ["Dil", "İngilizce"], ["Boyut", `${num(C.total)} cümle; Brown Corpus 500 metin, ~1M sözcük, 15 tür (slayt 7)`], ["Kaynak", "SemCor: Brown Corpus'un anlam etiketli alt kümesi"], ["Anotasyon", "WordNet anlam etiketi (bu ekranda yalnızca düz metin)"], ["Kullanım", "anlam belirsizliği giderme, dil modeli"]];
  return `<div class="stu"><h3 class="ng-h3">Korpus özellikleri <small>slayt 3–4</small></h3><table class="ng-tbl">${rows.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</table></div>`;
}
function freqHTML(){
  const N = [...FREQ.list.values()].reduce((a, b) => a + b, 0);
  let rows = [...FREQ.list].filter(([w, c]) => c >= CS.minf && (!CS.q || w.includes(lowerOf(CS.q)))).sort((a, b) => b[1] - a[1] || cmp()(a[0], b[0]));
  const total = rows.length, top = rows.slice(0, 40), max = top[0]?.[1] || 1;
  return `<p class="ck-meta" style="margin:0 0 6px">${num(total)} ${CS.ngram === 1 ? "sözcük" : CS.ngram + "-gram"} türü${total > 40 ? ", ilk 40 gösteriliyor" : ""}. Satıra tıklayınca bağlamını (KWIC) görürsün.</p>
    <div class="ck-scroll"><table class="ng-tbl cp-tbl"><tr><th>#</th><th>${CS.ngram === 1 ? "Sözcük" : CS.ngram + "-gram"}</th><th>Sıklık</th><th>Milyonda</th><th class="ng-bar"></th></tr>
    ${top.map(([w, c], i) => `<tr data-act="kw" data-w="${esc(w)}"><td class="muted">${i + 1}</td><td><b>${esc(w)}</b></td><td>${num(c)}</td><td>${num(Math.round(c / N * 1e6))}</td><td class="ng-bar"><div class="meter"><i><b style="width:${c / max * 100}%"></b></i></div></td></tr>`).join("")}</table></div>`;
}
function zipfHTML(){
  const f = [...FREQ.list.values()].sort((a, b) => b - a), V = f.length;
  if(V < 3) return "";
  const pts = [];
  for(let r = 1; r <= V; r = Math.max(r + 1, Math.floor(r * 1.04))) pts.push([r, f[r - 1]]);
  pts.push([V, f[V - 1]]);
  const W = 460, H = 300, L = 46, B = 34, R = 12, Tp = 12, lx = Math.log10(V), ly = Math.log10(f[0]) || 1;
  const X = r => L + (Math.log10(r) / lx) * (W - L - R), Y = c => Tp + (1 - Math.log10(c) / ly) * (H - Tp - B);
  // en küçük kareler: log f = a + b log r
  const xs = pts.map(p => Math.log10(p[0])), ys = pts.map(p => Math.log10(p[1])), n = pts.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const ticksX = [], ticksY = [];
  for(let p = 0; 10 ** p <= V; p++) ticksX.push(10 ** p);
  for(let p = 0; 10 ** p <= f[0]; p++) ticksY.push(10 ** p);
  return `<div class="fig-box"><svg class="zipf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zipf grafiği">
    ${ticksX.map(t => `<line class="g" x1="${X(t)}" y1="${Tp}" x2="${X(t)}" y2="${H - B}"/><text x="${X(t)}" y="${H - B + 16}">${num(t)}</text>`).join("")}
    ${ticksY.map(t => `<line class="g" x1="${L}" y1="${Y(t)}" x2="${W - R}" y2="${Y(t)}"/><text x="${L - 6}" y="${Y(t) + 4}" style="text-anchor:end">${num(t)}</text>`).join("")}
    <line class="ref" x1="${X(1)}" y1="${Y(f[0])}" x2="${X(V)}" y2="${Y(Math.max(1, f[0] / V))}"/>
    ${pts.map(([r, c]) => `<circle cx="${X(r)}" cy="${Y(c)}" r="2.2"/>`).join("")}
    <text x="${(L + W - R) / 2}" y="${H - 4}">sıra (log)</text><text x="12" y="${(Tp + H - B) / 2}" transform="rotate(-90 12 ${(Tp + H - B) / 2})">sıklık (log)</text></svg>
    <p class="ck-meta" style="margin:4px 0">Log-log doğrusunun eğimi <b>${slope.toFixed(2)}</b>.<span class="stu"> Zipf yasası: sıklık ≈ C / sıra, yani eğim −1 civarı. Kesikli çizgi tam −1 eğimli referans; az sayıda çok sık sözcük, uzun bir nadir sözcük kuyruğu.</span></p><div class="fig-actions" style="margin:0"><button class="btn sm ghost" data-export="svg" data-name="zipf-${CS.name}">SVG</button><button class="btn sm ghost" data-export="png" data-name="zipf-${CS.name}">PNG</button></div></div>`;
}
function kwicHTML(){
  const kw = CS.kw.trim();
  if(!kw) return '<div class="empty" style="padding:22px 0">Bir sözcük yaz ya da sıklık listesinden bir satıra tıkla.</div>';
  const want = kw.split(/\s+/).map(x => CS.lower ? lowerOf(x) : x), m = want.length, lines = [];
  T.forEach((s, si) => {
    for(let i = 0; i + m <= s.length; i++){
      let ok = true;
      for(let j = 0; j < m; j++) if(s[i + j] !== want[j]){ ok = false; break; }
      if(ok) lines.push({si, left:s.slice(Math.max(0, i - CS.win), i), key:s.slice(i, i + m), right:s.slice(i + m, i + m + CS.win)});
    }
  });
  if(CS.sort === "right") lines.sort((a, b) => cmp()(a.right[0] || "", b.right[0] || "") || cmp()(a.right[1] || "", b.right[1] || ""));
  if(CS.sort === "left") lines.sort((a, b) => cmp()(a.left[a.left.length - 1] || "", b.left[b.left.length - 1] || ""));
  if(!lines.length) return `<div class="empty" style="padding:22px 0"><b>${esc(kw)}</b> bu korpusta geçmiyor.</div>`;
  return `<p class="ck-meta" style="margin:0 0 6px"><b>${num(lines.length)}</b> geçiş${lines.length > 60 ? ", ilk 60 gösteriliyor" : ""}.</p><div class="kwic">${lines.slice(0, 60).map(l => `<div><span class="l">${esc(l.left.join(" "))}</span><b>${esc(l.key.join(" "))}</b><span class="r">${esc(l.right.join(" "))}</span></div>`).join("")}</div>`;
}
function renderAll(){
  if(!C) return;
  $("#cpStats", root).innerHTML = statsHTML();
  $("#cpMeta", root).innerHTML = metaHTML();
  $("#cpFreq", root).innerHTML = freqHTML();
  $("#cpZipf", root).innerHTML = zipfHTML();
  renderKwic();
  syncControls();
  save();
}
const renderKwic = () => { if(C) $("#cpKwic", root).innerHTML = kwicHTML(); };
function syncControls(){
  const boun = CS.name === "boun";
  $$("[data-act='corp']", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.c === CS.name));
  $$("[data-act='unit']", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.u === CS.unit));
  $$("[data-act='gram']", root).forEach(b => b.setAttribute("aria-pressed", +b.dataset.g === CS.ngram));
  $$("[data-act='sort']", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.s === CS.sort));
  $("#cpBrown", root).classList.toggle("hidden", boun);
  $("#cpBounOnly", root).classList.toggle("hidden", !boun);
  $("#cpLower", root).checked = CS.lower; $("#cpPunct", root).checked = CS.punct;
  $("#cpSize", root).value = String(CS.n);
}

let loaded = false;
const ensure = () => { if(!loaded){ loaded = true; load(); } };   // apply() mount'tan önce çağrılabilir; kayıtlı durum onu ezmesin
function mount(){
  if(root) return;
  ensure();
  root = $("#v-corpus");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Korpus gezgini</h1>
    <p class="lesson-intro" style="margin:0">Gerçek metin üzerinde sözcük sıklıkları, Zipf dağılımı ve bağlam satırları (KWIC). Türkçe için BOUN treebank'i (lemma ve UPOS etiketli), İngilizce için Brown cümleleri.<span class="stu"> Lecture 5: korpus.</span></p>
    <h2 class="ng-h">1 · Korpus <small id="cpState"></small></h2>
    <div class="ng-ctl" style="margin-top:0"><div class="seg" role="group" aria-label="Korpus">${Object.entries(CORPORA).map(([k, c]) => `<button data-act="corp" data-c="${k}">${esc(c.label)}</button>`).join("")}</div>
      <label id="cpBrown" class="muted hidden" style="font-size:.88rem">Cümle sayısı <select id="cpSize" class="btn sm"><option value="1000">1.000</option><option value="5000">5.000</option><option value="20000">20.000</option><option value="0">tümü (35.795)</option></select></label>
      <button class="btn sm" data-act="ngram">Bu korpusta n-gram modeli kur →</button></div>
    <div id="cpStats"></div><div id="cpMeta"></div>
    <h2 class="ng-h">2 · Sıklık listesi</h2>
    <div class="ng-ctl" style="margin-top:0">
      <div class="seg" role="group" aria-label="Birim"><button data-act="gram" data-g="1">Sözcük</button><button data-act="gram" data-g="2">Bigram</button><button data-act="gram" data-g="3">Trigram</button></div>
      <span id="cpBounOnly"><div class="seg" role="group" aria-label="Biçim ya da lemma" style="display:inline-flex"><button data-act="unit" data-u="form">Biçim</button><button data-act="unit" data-u="lemma">Lemma</button></div> <label class="chk"><input type="checkbox" id="cpPunct"> noktalama dahil</label></span>
      <label class="chk"><input type="checkbox" id="cpLower"> küçük harf</label>
      <label class="muted" style="font-size:.88rem">en az <input id="cpMin" class="dp-num" type="number" min="1" value="1"> kez</label>
      <label class="field sm" style="flex:1 1 180px;min-width:150px"><input id="cpQ" type="text" placeholder="Süz (örn. ler)" autocomplete="off" spellcheck="false"></label></div>
    <div class="cp-two"><div id="cpFreq"></div><div id="cpZipf"></div></div>
    <h2 class="ng-h">3 · Bağlam <small>KWIC: anahtar sözcük ve çevresi</small></h2>
    <div class="ng-ctl" style="margin-top:0"><label class="field sm" style="flex:1 1 220px"><input id="cpKw" type="text" placeholder="Anahtar sözcük (birden çok sözcük de olur)" autocomplete="off" spellcheck="false"></label>
      <label class="muted" style="font-size:.88rem">pencere ±<input id="cpWin" class="dp-num" type="number" min="1" max="12" value="5"></label>
      <div class="seg" role="group" aria-label="Sıralama"><button data-act="sort" data-s="pos">Metin sırası</button><button data-act="sort" data-s="right">Sağa göre</button><button data-act="sort" data-s="left">Sola göre</button></div></div>
    <div id="cpKwic"></div>
    <p class="ck-meta stu">KWIC (keyword in context) dizini, bir sözcüğün hangi sözcüklerle birlikte geçtiğini gösterir; sağ ya da sol komşuya göre sıralamak kalıpları (kolokasyonları) ortaya çıkarır. Bu, n-gram sayımlarının ham hâlidir.</p>
    <div style="height:56px"></div></div>`;
  let t;
  const later = f => { clearTimeout(t); t = setTimeout(f, 200); };
  $("#cpQ", root).addEventListener("input", e => { CS.q = e.target.value; later(() => { if(C){ $("#cpFreq", root).innerHTML = freqHTML(); save(); } }); });
  $("#cpMin", root).addEventListener("input", e => { CS.minf = Math.max(1, +e.target.value || 1); later(() => { $("#cpFreq", root).innerHTML = freqHTML(); save(); }); });
  $("#cpKw", root).addEventListener("input", e => { CS.kw = e.target.value; later(() => { renderKwic(); save(); }); });
  $("#cpWin", root).addEventListener("input", e => { CS.win = Math.min(12, Math.max(1, +e.target.value || 5)); later(() => { renderKwic(); save(); }); });
  $("#cpSize", root).addEventListener("change", e => { CS.n = +e.target.value; recompute(); });
  $("#cpLower", root).addEventListener("change", e => { CS.lower = e.target.checked; recompute(); });
  $("#cpPunct", root).addEventListener("change", e => { CS.punct = e.target.checked; recompute(); });
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if(!b) return;
    const d = b.dataset;
    if(d.act === "corp"){ CS.name = d.c; CS.upos = ""; if(CS.name === "brown") CS.unit = "form"; recompute(); }
    else if(d.act === "unit"){ CS.unit = d.u; recompute(); }
    else if(d.act === "gram"){ CS.ngram = +d.g; if(CS.ngram > 1) CS.upos = ""; recompute(); }
    else if(d.act === "upos"){ CS.upos = CS.upos === d.p ? "" : d.p; CS.ngram = 1; recompute(); }
    else if(d.act === "sort"){ CS.sort = d.s; renderKwic(); syncControls(); save(); }
    else if(d.act === "kw"){ CS.kw = d.w; $("#cpKw", root).value = d.w; renderKwic(); save(); $("#cpKwic", root).scrollIntoView({behavior:"smooth", block:"center"}); }
    else if(d.act === "ngram") setView("ngram", {src:CS.name, limit:CS.n});
  });
}

export const view = {
  apply(p){ ensure(); if(p.name && CORPORA[p.name]){ CS.name = p.name; CS.upos = ""; if(p.name === "brown") CS.unit = "form"; } if(p.kw !== undefined) CS.kw = p.kw; },
  async enter(){
    mount();
    $("#cpQ", root).value = CS.q; $("#cpMin", root).value = CS.minf; $("#cpKw", root).value = CS.kw; $("#cpWin", root).value = CS.win;
    syncControls();
    await recompute();
  }
};
registerView("corpus", view);
