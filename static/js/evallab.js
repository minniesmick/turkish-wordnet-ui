// Değerlendirme laboratuvarı: karışıklık matrisi, TP / FP / FN / TN, precision, recall, F1, accuracy, macro / weighted F1 ve Cohen'in kappası.
// Geçmiş vize sorularının (2021, 2022, 2025) hazır örnekleri vardır; hesaplar evalm.js'te. Arayüz modülü.
import {$, $$, esc, registerView} from "./core.js";
import {transpose, totals, perClass, accuracy, averages, macroWeighted, kappa, fromPairs, PRESETS, IAA, randomMatrix} from "./evalm.js";

const KEY = "wn:eval";
const S = {preset:"sentiment2022", rows:"sys", labels:PRESETS.sentiment2022.labels.slice(), cm:PRESETS.sentiment2022.cm.map(r => r.slice()), pairs:"", mode:"matrix", cls:2, mw:"0.46, 20\n0.48, 10\n0.13, 10", iaa:"ab2021", prac:null};
let root = null, saveT = 0;

const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)); if(v && Array.isArray(v.cm) && Array.isArray(v.labels) && v.cm.length === v.labels.length && v.cm.length >= 2) Object.assign(S, {preset:v.preset, rows:v.rows === "gold" ? "gold" : "sys", labels:v.labels, cm:v.cm.map(r => r.map(x => Math.max(0, +x || 0))), pairs:String(v.pairs || ""), mode:v.mode === "pairs" ? "pairs" : "matrix", cls:v.cls | 0, mw:String(v.mw || S.mw), iaa:v.iaa}); }catch(_){} };
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try{ localStorage.setItem(KEY, JSON.stringify({preset:S.preset, rows:S.rows, labels:S.labels, cm:S.cm, pairs:S.pairs, mode:S.mode, cls:S.cls, mw:S.mw, iaa:S.iaa})); }catch(_){} }, 150); };

const f4 = x => Number.isFinite(x) ? String(+x.toFixed(4)) : "–";
const frac = (a, b) => b ? `${a}/${b}` : "0/0";
// çekirdek hep "satır = sistem" ister; ekranda satır = altın seçildiyse devrik alınır
const sys = () => S.rows === "sys" ? S.cm : transpose(S.cm);
const clampCls = () => { S.cls = Math.max(0, Math.min(S.cls, S.labels.length - 1)); };

function fromPreset(id){
  const p = PRESETS[id]; if(!p) return;
  S.preset = id; S.rows = "sys"; S.labels = p.labels.slice(); S.cm = p.cm.map(r => r.slice()); S.mode = p.pairs ? "pairs" : "matrix"; S.pairs = p.pairs || ""; S.cls = Math.min(2, S.labels.length - 1);
}
function applyPairs(){
  const r = fromPairs(S.pairs);
  if(r.labels.length >= 2){ S.labels = r.labels; S.cm = r.cm; S.rows = "sys"; }
  return r;
}

// ───────────────────────── bölüm 1: veri
function dataHTML(){
  const n = S.labels.length, rowsGold = S.rows === "gold";
  const chips = Object.entries(PRESETS).map(([k, p]) => `<button class="chip" data-pre="${k}" aria-pressed="${S.preset === k}">${esc(p.title)}</button>`).join("");
  const head = `<tr><th></th>${S.labels.map((l, j) => `<th><input class="ev-lab" data-lab="${j}" value="${esc(l)}" aria-label="Sütun etiketi ${j + 1}"></th>`).join("")}</tr>`;
  const body = S.cm.map((r, i) => `<tr><th><input class="ev-lab" data-lab="${i}" value="${esc(S.labels[i])}" aria-label="Satır etiketi ${i + 1}"></th>${r.map((v, j) => `<td class="${i === j ? "ev-diag" : ""}"><input class="dp-num ev-cell" type="number" min="0" data-r="${i}" data-c="${j}" value="${v}" aria-label="${esc(S.labels[i])} satırı, ${esc(S.labels[j])} sütunu"></td>`).join("")}</tr>`).join("");
  return `<div class="chips">${chips}</div>
    <div class="ng-ctl"><div class="seg" role="group" aria-label="Veri girişi"><button data-mode="matrix" aria-pressed="${S.mode === "matrix"}">Karışıklık matrisi</button><button data-mode="pairs" aria-pressed="${S.mode === "pairs"}">Liste (altın, sistem)</button></div>
      <div class="seg" role="group" aria-label="Satırlar neyi gösteriyor"><button data-rows="sys" aria-pressed="${!rowsGold}" title="2021 ve 2022 kâğıtlarındaki gibi">Satır = sistem çıktısı</button><button data-rows="gold" aria-pressed="${rowsGold}" title="2025 kâğıdındaki gibi">Satır = altın veri</button></div>
      <button class="btn sm ghost" data-add="1" ${n >= 8 ? "disabled" : ""}>Sınıf ekle</button><button class="btn sm ghost" data-add="-1" ${n <= 2 ? "disabled" : ""}>Sınıf çıkar</button></div>
    ${S.mode === "pairs" ? `<textarea class="ta" id="evPairs" rows="8" spellcheck="false" aria-label="Altın ve sistem çiftleri" style="font:500 .85rem/1.5 var(--font-mono)">${esc(S.pairs)}</textarea><p class="ck-meta">Her satır bir örnek: <code>altın, sistem</code>. Matris buradan kurulur (satır = sistem çıktısı).</p>` :
      `<div class="ck-scroll" role="region" tabindex="0" aria-label="Karışıklık matrisi"><table class="ng-tbl ev-mx"><caption>${rowsGold ? "Satırlar: altın veri, sütunlar: sistem çıktısı" : "Satırlar: sistem çıktısı, sütunlar: altın veri"}</caption>${head}${body}</table></div>`}
    ${S.preset && PRESETS[S.preset] ? `<p class="ck-meta stu">${esc(PRESETS[S.preset].note)}</p>` : ""}`;
}

// ───────────────────────── bölüm 2: sonuçlar
function resultsHTML(){
  const cm = sys(), t = totals(cm), pc = perClass(cm), av = averages(cm), acc = accuracy(cm);
  const rows = pc.map(c => `<tr class="${c.i === S.cls ? "now" : ""}"><td><button class="chip" data-cls="${c.i}" aria-pressed="${c.i === S.cls}">${esc(S.labels[c.i])}</button></td><td>${c.support}</td><td>${c.TP}</td><td>${c.FP}</td><td>${c.FN}</td><td>${c.TN}</td>
    <td>${frac(c.TP, c.TP + c.FP)} = <b>${f4(c.precision)}</b></td><td>${frac(c.TP, c.TP + c.FN)} = <b>${f4(c.recall)}</b></td><td><b>${f4(c.f1)}</b></td></tr>`).join("");
  const avg = (k, label) => `<tr class="sum"><td colspan="6">${label}</td><td>${f4(av[k].precision)}</td><td>${f4(av[k].recall)}</td><td><b>${f4(av[k].f1)}</b></td></tr>`;
  return `<div class="ck-scroll" role="region" tabindex="0" aria-label="Sınıf başına ölçütler"><table class="ng-tbl"><tr><th>Sınıf</th><th title="Altın veride bu sınıftan kaç örnek var">Destek</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th><th>Precision</th><th>Recall</th><th>F1</th></tr>${rows}
    ${avg("macro", "Macro ortalama (sınıfların düz ortalaması)")}${avg("weighted", "Weighted ortalama (destekle ağırlıklı)")}${avg("micro", "Micro (tüm TP, FP, FN birlikte)")}</table></div>
    <p class="verdict" style="font-size:1.1rem">Accuracy = ${t.diag} / ${t.N} = <b>${f4(acc)}</b></p>`;
}
function stepsHTML(){
  clampCls();
  const cm = sys(), pc = perClass(cm), c = pc[S.cls], t = totals(cm), name = S.labels[S.cls];
  const p = c.precision, r = c.recall;
  return `<p class="ck-meta">Sınıf: <b>${esc(name)}</b> (yukarıdaki tablodan başka bir sınıf seçebilirsin)</p>
    <ul class="ev-steps">
    <li><b>TP</b> = köşegen = ${c.TP}</li>
    <li><b>FP</b> = sistemin “${esc(name)}” dediği ama altın verisi başka olanlar = satır toplamı − TP = ${c.predicted} − ${c.TP} = ${c.FP}</li>
    <li><b>FN</b> = altın verisi “${esc(name)}” olup sistemin kaçırdığı = sütun toplamı − TP = ${c.support} − ${c.TP} = ${c.FN}</li>
    <li><b>TN</b> = N − TP − FP − FN = ${t.N} − ${c.TP} − ${c.FP} − ${c.FN} = ${c.TN}</li>
    <li><b>Precision</b> = TP / (TP + FP) = ${c.TP} / (${c.TP} + ${c.FP}) = ${frac(c.TP, c.TP + c.FP)} = ${f4(p)}</li>
    <li><b>Recall</b> = TP / (TP + FN) = ${c.TP} / (${c.TP} + ${c.FN}) = ${frac(c.TP, c.TP + c.FN)} = ${f4(r)}</li>
    <li><b>F1</b> = 2 · P · R / (P + R) = 2 · ${f4(p)} · ${f4(r)} / (${f4(p)} + ${f4(r)}) = ${f4(c.f1)}${p && r ? ` <small class="muted">(= 2TP / (2TP + FP + FN) = ${2 * c.TP} / ${2 * c.TP + c.FP + c.FN})</small>` : ""}</li>
    <li><b>Accuracy</b> = köşegen toplamı / N = ${t.diag} / ${t.N} = ${f4(accuracy(cm))}</li></ul>`;
}

// ───────────────────────── bölüm 3: macro ve weighted F1 (sınıf başına F1 ve örnek sayısı verilmişken)
function parseMW(text){
  return text.split(/\n/).map(l => l.trim()).filter(l => l && l[0] !== "#").map(l => { const p = l.split(/[,\t;]/).map(x => parseFloat(x.replace(",", "."))); return {f1:p[0], n:p[1]}; }).filter(r => Number.isFinite(r.f1) && Number.isFinite(r.n) && r.n >= 0);
}
function mwHTML(){
  const rows = parseMW(S.mw);
  const box = `<textarea class="ta" id="evMW" rows="4" spellcheck="false" aria-label="F1 ve örnek sayısı" style="font:500 .85rem/1.5 var(--font-mono);max-width:260px">${esc(S.mw)}</textarea><p class="ck-meta">Her satır bir sınıf: <code>F1, örnek sayısı</code> (2025 vizesi 4B).</p>`;
  if(rows.length < 1 || rows.every(r => r.n === 0)) return box + '<div class="empty">En az bir satır gir.</div>';
  const m = macroWeighted(rows);
  return box + `<p class="verdict" style="font-size:1.05rem">Macro F1 = (${rows.map(r => r.f1).join(" + ")}) / ${rows.length} = <b>${f4(m.macro)}</b></p>
    <p class="verdict" style="font-size:1.05rem">Weighted F1 = ${rows.map((r, i) => `${f4(m.weights[i])} · ${r.f1}`).join(" + ")} = <b>${f4(m.weighted)}</b></p>
    <p class="ck-meta stu">Ağırlık wᵢ = sınıfın örnek sayısı / toplam örnek sayısı (burada N = ${m.N}). Macro her sınıfa eşit söz hakkı verir, weighted büyük sınıfı öne çıkarır.</p>`;
}

// ───────────────────────── bölüm 4: Cohen'in kappası (inter-annotator agreement)
function kappaHTML(){
  const K = IAA[S.iaa], cm = K && S.iaa !== "cur" ? K.cm : sys(), labels = K && S.iaa !== "cur" ? K.labels : S.labels;
  const k = kappa(cm), n = cm.length;
  const chips = Object.entries(IAA).map(([id, v]) => `<button class="chip" data-iaa="${id}" aria-pressed="${S.iaa === id}">${esc(v.title)}</button>`).join("") + `<button class="chip" data-iaa="cur" aria-pressed="${S.iaa === "cur"}">Yukarıdaki matris</button>`;
  const tab = `<div class="ck-scroll" role="region" tabindex="0" aria-label="Anotatör uyum tablosu"><table class="ng-tbl"><caption>Satır: 1. anotatör, sütun: 2. anotatör</caption><tr><th></th>${labels.map(l => `<th>${esc(l)}</th>`).join("")}</tr>${cm.map((r, i) => `<tr><th>${esc(labels[i])}</th>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</table></div>`;
  return `<div class="chips">${chips}</div>${tab}
    <ul class="ev-steps"><li>Gözlenen uyum Pₒ = köşegen / N = ${k.diag} / ${k.N} = <b>${f4(k.po)}</b></li>
    <li>Şansa bağlı uyum Pₑ = Σ (satır payı · sütun payı) = ${k.parts.map((p, i) => `${f4(p.a)} · ${f4(p.b)}`).join(" + ")} = <b>${f4(k.pe)}</b></li>
    <li>κ = (Pₒ − Pₑ) / (1 − Pₑ) = (${f4(k.po)} − ${f4(k.pe)}) / (1 − ${f4(k.pe)}) = <b>${f4(k.kappa)}</b></li></ul>
    ${K && S.iaa !== "cur" ? `<p class="ck-meta stu">${esc(K.note)}</p>` : ""}`;
}

// ───────────────────────── bölüm 5: alıştırma
const QS = [["precision", "Precision"], ["recall", "Recall"], ["f1", "F1"], ["acc", "Accuracy"]];
function newPrac(){
  const seed = (Date.now() & 0xffff) + 1, n = 3, cm = randomMatrix(n, seed, 16), pc = perClass(cm), cls = seed % n, q = QS[(seed >> 3) % 3 + (seed % 7 === 0 ? 1 : 0)][0];
  const ans = q === "acc" ? accuracy(cm) : pc[cls][q];
  S.prac = {cm, cls, q, ans, got:null, ok:null};
}
function parseAns(s){
  s = String(s).trim().replace(",", ".");
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if(m) return +m[2] ? +m[1] / +m[2] : NaN;
  return /^-?\d*\.?\d+$/.test(s) ? +s : NaN;
}
function pracHTML(){
  if(!S.prac) newPrac();
  const P = S.prac, lab = ["A", "B", "C"], name = QS.find(x => x[0] === P.q)[1];
  const tbl = `<div class="ck-scroll"><table class="ng-tbl"><caption>Satır: sistem çıktısı, sütun: altın veri</caption><tr><th></th>${lab.map(l => `<th>${l}</th>`).join("")}</tr>${P.cm.map((r, i) => `<tr><th>${lab[i]}</th>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</table></div>`;
  return `${tbl}<p class="mp-q">${P.q === "acc" ? "Accuracy kaçtır?" : `Sınıf <b>${lab[P.cls]}</b> için ${name} kaçtır?`} <small class="muted">kesir (12/36) ya da ondalık; ±0.005 kabul</small></p>
    <div class="ng-ctl"><input id="evAns" class="dp-num" style="width:110px" type="text" inputmode="decimal" aria-label="Cevap" value="${esc(P.got ?? "")}" ${P.ok != null ? "disabled" : ""}><button class="btn sm" data-prac="check" ${P.ok != null ? "disabled" : ""}>Kontrol et</button><button class="btn sm ghost" data-prac="new">Yeni soru</button></div>
    ${P.ok != null ? `<p class="verdict" style="font-size:1.05rem">${P.ok ? "Doğru ✓" : "Yanlış ✗"} Cevap: <b>${f4(P.ans)}</b></p>` : ""}`;
}

// ───────────────────────── çizim ve olaylar
function renderAll(){
  clampCls();
  $("#evData", root).innerHTML = dataHTML();
  renderResults();
}
function renderResults(){
  $("#evRes", root).innerHTML = resultsHTML();
  $("#evStep", root).innerHTML = stepsHTML();
  $("#evMWOut", root).innerHTML = mwHTML();
  $("#evKappa", root).innerHTML = kappaHTML();
}
function mount(){
  root = $("#v-eval"); if(!root) return;
  load();
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Değerlendirme</h1>
    <p class="lesson-intro" style="margin:0">Bir sınıflandırıcının çıktısını altın veriyle karşılaştır: karışıklık matrisi, precision, recall, F1, accuracy, macro / weighted ortalama ve anotatörler arası uyum (kappa).<span class="stu"> Hazır örnekler geçmiş vize sorularıdır (2021, 2022, 2025); sayılar cevap kâğıdıyla aynı çıkar.</span></p>
    <h2 class="ng-h">1 · Veri</h2><div id="evData"></div>
    <h2 class="ng-h">2 · Sonuçlar</h2><div id="evRes"></div>
    <h3 class="ng-h3 stu">Adım adım</h3><div class="stu" id="evStep"></div>
    <h2 class="ng-h">3 · Macro ve weighted F1</h2><div id="evMWOut"></div>
    <h2 class="ng-h">4 · Anotatörler arası uyum <small>Cohen'in kappası</small></h2><div id="evKappa"></div>
    <h2 class="ng-h stu">5 · Alıştırma</h2><div class="stu" id="evPrac"></div>
    <div style="height:56px"></div></div>`;
  renderAll(); $("#evPrac", root).innerHTML = pracHTML();
  root.addEventListener("input", e => {
    const t = e.target;
    if(t.classList.contains("ev-cell")){ S.cm[+t.dataset.r][+t.dataset.c] = Math.max(0, parseInt(t.value, 10) || 0); S.preset = ""; save(); renderResults(); }
    else if(t.dataset.lab !== undefined){ S.labels[+t.dataset.lab] = t.value || `s${+t.dataset.lab + 1}`; S.preset = ""; save(); $$(`[data-lab="${t.dataset.lab}"]`, root).forEach(x => { if(x !== t) x.value = t.value; }); renderResults(); }
    else if(t.id === "evPairs"){ S.pairs = t.value; S.preset = ""; applyPairs(); save(); renderResults(); }
    else if(t.id === "evMW"){ S.mw = t.value; save(); $("#evMWOut", root).innerHTML = mwHTML(); const a = $("#evMW", root); a.focus(); a.setSelectionRange(a.value.length, a.value.length); }
  });
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-pre],[data-mode],[data-rows],[data-add],[data-cls],[data-iaa],[data-prac]"); if(!b) return;
    const d = b.dataset;
    if(d.pre){ fromPreset(d.pre); if(S.mode === "pairs") applyPairs(); renderAll(); }
    else if(d.mode){ S.mode = d.mode; if(S.mode === "pairs"){ if(!S.pairs.trim()) S.pairs = "# altın, sistem\n"; applyPairs(); } renderAll(); }
    else if(d.rows){ if(d.rows !== S.rows){ S.cm = transpose(S.cm); S.rows = d.rows; } renderAll(); }
    else if(d.add){
      const k = +d.add;
      if(k > 0 && S.labels.length < 8){ S.labels.push("s" + (S.labels.length + 1)); S.cm.forEach(r => r.push(0)); S.cm.push(Array(S.labels.length).fill(0)); }
      else if(k < 0 && S.labels.length > 2){ S.labels.pop(); S.cm.pop(); S.cm.forEach(r => r.pop()); }
      S.preset = ""; renderAll();
    }else if(d.cls !== undefined){ S.cls = +d.cls; renderResults(); }
    else if(d.iaa){ S.iaa = d.iaa; $("#evKappa", root).innerHTML = kappaHTML(); }
    else if(d.prac === "new"){ newPrac(); $("#evPrac", root).innerHTML = pracHTML(); }
    else if(d.prac === "check"){ const v = parseAns($("#evAns", root).value); S.prac.got = $("#evAns", root).value; S.prac.ok = Number.isFinite(v) && Math.abs(v - S.prac.ans) <= 0.005; $("#evPrac", root).innerHTML = pracHTML(); }
    save();
  });
  root.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.id === "evAns") root.querySelector('[data-prac="check"]')?.click(); });
}
const view = {apply(){}, enter(){ if(!root) mount(); }};
registerView("eval", view);
mount();
