// Ayrıştırma: Lecture 3 (CFG, PCFG, CKY). Gramer yaz, cümle ver; CKY tablosunu, ayrıştırma ağaçlarını ve olasılıkları gör. Tamamı tarayıcıda.
import {$, $$, esc, registerView, MODE, toast} from "./core.js";
import {parseTrees, learn, toGrammar} from "./mle.js";

const PRESETS = {
  inclass2: {stu:true, label:"InClass 2 · PCFG", sent:"Alice said the scientist that believed the student proved the experiment", ex:["Alice said the student proved the experiment"], grammar:
`S -> NP VP [0.6] | S Conj S [0.15] | Adv S [0.25]
NP -> Det N [0.25] | Det Adj N [0.15] | NP RC [0.20] | ProperN [0.20] | NP PP [0.20]
VP -> V NP [0.4] | V S [0.35] | V [0.2] | Adv VP [0.05]
RC -> Rel VP [1.0]
V -> said [0.3] | believed [0.4] | proved [0.3]
N -> scientist [0.4] | student [0.3] | experiment [0.3]
Det -> the [0.6] | a [0.4]
Adj -> young [0.6] | curious [0.4]
Adv -> quietly [0.5] | sincerely [0.5]
Conj -> and [0.6] | but [0.4]
ProperN -> Alice [1.0]
Rel -> that [1.0]`},
  inclass3: {stu:true, label:"InClass 3 · CKY", sent:"the open position may require quick response time", ex:["the quick response may help", "open time"], grammar:
`S -> NP VP | VP NP
NP -> D NP | N | ADJ NP | ADJ N
VP -> V NP | V N | N V | V ADV | AUX VP | AUX V
N -> quick | position | open | time | response
V -> help | position | open | time | require
D -> the | a | some
ADJ -> good | quick | open
ADV -> fast | quick
AUX -> may | can`},
  pp: {label:"Örnek · PP bağlanması", sent:"kids saw birds with binoculars", ex:["kids saw birds with fish"], grammar:
`S -> NP VP
NP -> N | NP PP
VP -> V NP | VP PP
PP -> P NP
N -> kids | birds | binoculars | fish
V -> saw
P -> with`}
};
const PS = {grammar:PRESETS.inclass2.grammar, sent:PRESETS.inclass2.sent, start:"", preset:"inclass2", sel:"", all:false, fill:false, ans:{}, chk:false, show:false, hints:0, fk:"", mle:"(S (NP (Det the) (N dog)) (VP (V barks)))\n(S (NP (Det the) (N cat)) (VP (V saw) (NP (Det the) (N dog))))\n(S (NP (Det a) (N dog)) (VP (V saw) (NP (Det a) (N cat))))"};
const KEY = "wn:parse";
let root = null, run = null;

const load = () => { try{ Object.assign(PS, JSON.parse(localStorage.getItem(KEY)) || {}); }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(PS)); }catch(_){} };
const isHidden = s => s[0] === "@";

// ───────────────────────── gramer
function parseGrammar(text){
  const rules = [], errors = [];
  text.split("\n").forEach((raw, ln) => {
    const line = raw.replace(/#.*$/, "").trim();
    if(!line) return;
    const m = line.match(/^(\S+)\s*(?:->|→|=>)\s*(.*)$/);
    if(!m){ errors.push(`Satır ${ln + 1}: “${line.slice(0, 40)}” kural değil (A -> B C biçimi).`); return; }
    for(const alt of m[2].split("|")){
      const toks = alt.trim().split(/\s+/).filter(Boolean);
      let p = null;
      const pm = toks.length && toks[toks.length - 1].match(/^[\[(]\s*([0-9]*\.?[0-9]+(?:[eE][-+]?\d+)?)\s*[\])]$/);
      if(pm){ p = +pm[1]; toks.pop(); }
      if(!toks.length){ errors.push(`Satır ${ln + 1}: boş sağ taraf.`); continue; }
      rules.push({lhs:m[1], rhs:toks, p});
    }
  });
  return {rules, errors};
}
// kuralları CKY için tekli (unary), ikili ve sözcük kurallarına indirger; uzun kurallara gizli (@) simge ekler
function compile(rules){
  const nts = new Set(rules.map(r => r.lhs)), lex = [], un = [], bin = [], hid = new Set(), warns = [];
  rules.forEach((r, id) => {
    const p = r.p ?? 1;
    if(r.rhs.length === 1){
      const s = r.rhs[0];
      if(nts.has(s)) un.push({lhs:r.lhs, a:s, p, id}); else lex.push({lhs:r.lhs, w:s.toLowerCase(), p, id});
      return;
    }
    const syms = r.rhs.map(s => {
      if(nts.has(s)) return s;
      warns.push(`${r.lhs} → ${r.rhs.join(" ")} içinde “${s}” sözcük (terminal) sayıldı: sol tarafta tanımlı değil.`);
      const h = "@" + s.toLowerCase();
      if(!hid.has(h)){ hid.add(h); lex.push({lhs:h, w:s.toLowerCase(), p:1, id:-1}); }
      return h;
    });
    let cur = r.lhs, pp = p;
    for(let i = 0; i < syms.length - 2; i++){ const h = `@${id}.${i}`; bin.push({lhs:cur, a:syms[i], b:h, p:pp, id}); cur = h; pp = 1; }
    bin.push({lhs:cur, a:syms[syms.length - 2], b:syms[syms.length - 1], p:pp, id});
  });
  return {nts, lex, un, bin, warns:[...new Set(warns)]};
}
const ruleText = r => `${r.lhs} → ${r.rhs.join(" ")}`;
const fmtP = p => p === 0 ? "0" : p >= .001 ? (+p.toFixed(4)).toString() : p.toExponential(3);

// ───────────────────────── CKY
function cky(g, toks){
  const n = toks.length, chart = Array.from({length:n + 1}, () => Array(n + 1).fill(null));
  for(let len = 1; len <= n; len++) for(let i = 0; i + len <= n; i++){
    const j = i + len, cell = new Map();
    const add = (s, d) => { if(!cell.has(s)) cell.set(s, []); cell.get(s).push(d); };
    if(len === 1){ for(const r of g.lex) if(r.w === toks[i].toLowerCase()) add(r.lhs, {r, kind:"lex"}); }
    else for(let k = i + 1; k < j; k++){
      const L = chart[i][k], R = chart[k][j];
      for(const r of g.bin) if(L.has(r.a) && R.has(r.b)) add(r.lhs, {r, kind:"bin", k});
    }
    const done = new Set();                            // tekli kurallar: kapanış, her kural bir kez
    for(let ch = true; ch;){
      ch = false;
      for(const r of g.un) if(!done.has(r) && cell.has(r.a)){ done.add(r); add(r.lhs, {r, kind:"un"}); ch = true; }
    }
    chart[i][j] = cell;
  }
  return chart;
}
// sayım, iç (toplam) olasılık ve en iyi (Viterbi) olasılık; tekli kural döngüleri atlanır
function evaluator(chart){
  const memo = new Map(), path = new Set();
  const f = (i, j, s) => {
    const key = `${i},${j},${s}`;
    if(memo.has(key)) return memo.get(key);
    if(path.has(key)) return {cnt:0, ins:0, best:0};
    path.add(key);
    let cnt = 0, ins = 0, best = 0;
    for(const d of chart[i][j].get(s) || []){
      const p = d.r.p; let c = 1, v = p, b = p;
      if(d.kind === "un"){ const x = f(i, j, d.r.a); c = x.cnt; v = p * x.ins; b = p * x.best; }
      else if(d.kind === "bin"){ const x = f(i, d.k, d.r.a), y = f(d.k, j, d.r.b); c = x.cnt * y.cnt; v = p * x.ins * y.ins; b = p * x.best * y.best; }
      cnt += c; ins += v; best = Math.max(best, b);
    }
    path.delete(key);
    const res = {cnt, ins, best}; memo.set(key, res); return res;
  };
  return f;
}
// ağaçlar: her düğümde olasılığa göre en iyi CAP alt ağaç tutulur (üst k ağaç bunların çarpımlarındandır)
const CAP = 60;
function trees(chart, toks, i, j, s, g, memo = new Map(), path = new Set()){
  const key = `${i},${j},${s}`;
  if(memo.has(key)) return memo.get(key);
  if(path.has(key)) return [];
  path.add(key);
  const out = [];
  for(const d of chart[i][j].get(s) || []){
    const r = d.r;
    if(d.kind === "lex") out.push({sym:s, p:r.p, rule:r.id, kids:[{leaf:true, word:toks[i]}], tp:r.p});
    else if(d.kind === "un") for(const c of trees(chart, toks, i, j, r.a, g, memo, path)) out.push({sym:s, p:r.p, rule:r.id, kids:[c], tp:r.p * c.tp});
    else for(const l of trees(chart, toks, i, d.k, r.a, g, memo, path)) for(const rr of trees(chart, toks, d.k, j, r.b, g, memo, path))
      out.push({sym:s, p:r.p, rule:r.id, kids:[l, rr], tp:r.p * l.tp * rr.tp});
  }
  path.delete(key);
  out.sort((a, b) => b.tp - a.tp);
  const res = out.slice(0, CAP); memo.set(key, res); return res;
}
// gizli (@) düğümleri üst düğümün çocuklarına kat
function flat(n){
  if(n.leaf) return n;
  n.kids = n.kids.map(flat).flatMap(k => isHidden(k.sym || "") ? k.kids : [k]);
  return n;
}
const bracket = n => n.leaf ? n.word : `[${n.sym} ${n.kids.map(bracket).join(" ")}]`;
function used(n, acc = []){ if(!n.leaf){ if(n.rule >= 0) acc.push(n); n.kids.forEach(k => used(k, acc)); } return acc; }

// ───────────────────────── ağaç çizimi (SVG)
function treeSVG(root){
  const H = 46, W = 86;
  let leaf = 0, maxD = 0;
  (function walk(n, d){
    n.d = d;
    if(n.leaf){ n.x = leaf++; return; }
    maxD = Math.max(maxD, d);
    n.kids.forEach(k => walk(k, d + 1));
    n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
  })(root, 0);
  const px = n => 28 + n.x * W, py = n => 22 + (n.leaf ? maxD + 1 : n.d) * H;
  let lines = "", labels = "";
  (function draw(n){
    if(n.leaf){ labels += `<text class="pt-w" x="${px(n)}" y="${py(n) + 5}">${esc(n.word)}</text>`; return; }
    for(const k of n.kids){ lines += `<line x1="${px(n)}" y1="${py(n) + 6}" x2="${px(k)}" y2="${py(k) - (k.leaf ? 12 : 12)}" class="${k.leaf && k.d > n.d + 1 ? "dash" : ""}"/>`; draw(k); }
    labels += `<text class="pt-n" x="${px(n)}" y="${py(n)}">${esc(n.sym)}</text>`;
  })(root);
  const w = 96 + (leaf - 1) * W, h = 22 + (maxD + 1) * H + 22;
  return `<svg class="pt" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Ayrıştırma ağacı">${lines}${labels}</svg>`;
}

// ───────────────────────── çalıştırma
function compute(){
  const {rules, errors} = parseGrammar(PS.grammar);
  const g = compile(rules);
  const lhs = [...new Set(rules.map(r => r.lhs))];
  if(!lhs.includes(PS.start)) PS.start = lhs[0] || "";
  const hasProb = rules.length > 0 && rules.every(r => r.p != null);
  const sums = new Map();
  for(const r of rules) sums.set(r.lhs, (sums.get(r.lhs) || 0) + (r.p ?? 0));
  const toks = PS.sent.replace(/[.,;:!?"“”()]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const out = {rules, errors, g, lhs, hasProb, sums, toks, chart:null, f:null, top:null, trees:[], oov:[]};
  if(!rules.length || !toks.length) return out;
  const known = new Set(g.lex.map(r => r.w));
  out.oov = toks.filter(t => !known.has(t.toLowerCase()));
  out.chart = cky(g, toks);
  out.f = evaluator(out.chart);
  const n = toks.length;
  out.top = out.chart[0][n].has(PS.start) ? out.f(0, n, PS.start) : null;
  if(out.top) out.trees = trees(out.chart, toks, 0, n, PS.start, g).map(t => flat(t));
  return out;
}

// ───────────────────────── çıktı
function grammarInfo(r){
  let h = "";
  if(r.errors.length) h += `<div class="notice warn">${r.errors.map(esc).join("<br>")}</div>`;
  if(r.g.warns.length) h += `<div class="notice">${r.g.warns.map(esc).join("<br>")}</div>`;
  if(r.rules.length){
    const mixed = r.rules.some(x => x.p != null) && !r.hasProb;
    h += `<p class="ck-meta">${r.rules.length} kural · ${r.lhs.length} sol taraf simgesi · ${r.hasProb ? "<b>PCFG</b> (olasılıklı)" : "<b>CFG</b> (olasılıksız)"}${mixed ? ' · <b>bazı kurallarda olasılık yok, CFG sayıldı</b>' : ""}</p>`;
    if(r.hasProb) h += `<div class="chips stu">${r.lhs.map(s => { const v = r.sums.get(s), ok = Math.abs(v - 1) < 5e-4; return `<span class="chip" title="${esc(s)} kurallarının olasılık toplamı 1 olmalı">${esc(s)} <small>Σ ${+v.toFixed(4)}${ok ? " ✓" : " ✗"}</small></span>`; }).join("")}</div>`;
  }
  return h;
}
// ───────────────────────── kendin doldur (öğrenci kipi)
const cellKey = (i, j) => `${i},${j}`;
const typedSet = k => new Set((PS.ans[k] || "").split(/[\s,;|]+/).filter(x => x && x !== "·" && x !== "∅"));
const trueSet = (r, i, j) => new Set([...r.chart[i][j].keys()].filter(x => !isHidden(x)));
const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
function fillStats(r){
  const n = r.toks.length; let tot = 0, ok = 0;
  for(let len = 1; len <= n; len++) for(let i = 0; i + len <= n; i++){
    const got = typedSet(cellKey(i, i + len)), want = trueSet(r, i, i + len);
    if(!got.size && !want.size) continue;                       // boş kalması gereken ve boş bırakılan hücreler puana girmez
    tot++; if(sameSet(got, want)) ok++;
  }
  return {tot, ok};
}
function toolbar(r){
  if(!r.chart) return "";
  if(!PS.fill) return `<div class="stu ck-tool"><button class="btn sm" data-fa="toggle">Tabloyu kendin doldur</button><span class="muted" style="font-size:.86rem">Önce kendin dene, sonra kontrol et.</span></div>`;
  const st = PS.chk ? fillStats(r) : null;
  return `<div class="stu ck-tool"><button class="btn sm ghost" data-fa="toggle">← Doldurmayı bırak</button><button class="btn pri sm" data-fa="check">Kontrol et</button><button class="btn sm" data-fa="hint">İpucu: bir hücreyi doldur${PS.hints ? ` (${PS.hints})` : ""}</button><button class="btn sm" data-fa="reveal">${PS.show ? "Tekrar dene" : "Doğru tabloyu göster"}</button><button class="btn sm ghost" data-fa="reset">Temizle</button>
    ${st ? `<span class="verdict" style="margin:0 0 0 6px;font-size:1.05rem"><b>${st.ok} / ${st.tot}</b> dolu hücre doğru${st.ok === st.tot ? " ✓" : ""}</span>` : ""}</div>
    <p class="ck-meta stu" style="margin:6px 0 0">Her hücreye o aralığı üretebilen simgeleri boşlukla yaz (örn. <span class="ng-t">NP VP</span>); üretilemiyorsa boş bırak. Alt satır sözcüklerin türü, üst satırlar giderek uzun aralıklar.</p>`;
}
function fillHTML(r){
  const n = r.toks.length;
  let rows = "";
  for(let len = n; len >= 1; len--){
    let tds = "";
    for(let i = 0; i + len <= n; i++){
      const j = i + len, k = cellKey(i, j), want = trueSet(r, i, j), got = typedSet(k);
      let cls = "", note = "";
      if(PS.chk){
        const ok = sameSet(got, want); cls = ok ? "ok" : "bad";
        if(!ok){ const miss = [...want].filter(x => !got.has(x)).length, extra = [...got].filter(x => !want.has(x)).length; note = `<em>${miss ? `eksik ${miss}` : ""}${miss && extra ? " · " : ""}${extra ? `fazla ${extra}` : ""}</em>`; }
      }
      tds += `<td class="fill ${cls}"><small>${k}</small><input data-fc="${k}" value="${esc(PS.ans[k] || "")}" autocomplete="off" spellcheck="false" aria-label="Hücre ${k}">${note}</td>`;
    }
    rows += `<tr>${tds}</tr>`;
  }
  const words = `<tr class="ck-w">${r.toks.map((t, i) => `<th><small>${i}</small>${esc(t)}<small>${i + 1}</small></th>`).join("")}</tr>`;
  return `${toolbar(r)}<div class="ck-scroll"><table class="ck">${rows}${words}</table></div>`;
}
function hintCell(r){
  const n = r.toks.length;
  for(let len = 1; len <= n; len++) for(let i = 0; i + len <= n; i++){
    const j = i + len, k = cellKey(i, j), want = trueSet(r, i, j);
    if(!sameSet(typedSet(k), want)){ PS.ans[k] = [...want].join(" "); PS.hints++; return k; }
  }
  return null;
}
// ───────────────────────── ağaçlardan olasılık öğren (MLE)
const fmtFrac = r => `${r.c}/${r.total}`;
function mleHTML(){
  let trees;
  try{ trees = parseTrees(PS.mle); }catch(e){ return `<div class="notice warn">${esc(e.message)}</div>`; }
  if(!trees.length) return '<p class="ck-meta">Parantezli ağaçları yaz (her ağaç bir satır olabilir).</p>';
  const L = learn(trees), order = [...new Set(L.rules.map(r => r.lhs))];
  const rows = L.rules.slice().sort((a, b) => order.indexOf(a.lhs) - order.indexOf(b.lhs) || b.c - a.c);
  const g = toGrammar(L);
  return `<p class="ng-formula stu">P(A → β) = C(A → β) / C(A): bir kuralın kaç kez kullanıldığı, sol tarafın toplam kaç kez türetildiğine bölünür.</p>
    <div class="ck-scroll"><table class="ng-tbl"><tr><th>Kural</th><th>C(kural)</th><th>C(sol)</th><th>Kesir</th><th>P</th></tr>
    ${rows.map(r => `<tr><td>${esc(r.lhs)} → ${esc(r.rhs.join(" "))}</td><td>${r.c}</td><td>${r.total}</td><td>${fmtFrac(r)}</td><td><b>${+r.p.toFixed(4)}</b></td></tr>`).join("")}</table></div>
    <h3 class="ng-h3">Ağaç olasılıkları <small>kural olasılıklarının çarpımı</small></h3>
    <div class="chips">${trees.map((t, i) => `<span class="chip" style="cursor:default">Ağaç ${i + 1} <small>${L.probs[i] >= .001 ? +L.probs[i].toFixed(5) : L.probs[i].toExponential(3)}</small></span>`).join("")}</div>
    <h3 class="ng-h3">Gramer metni</h3><pre class="mp-fsm">${esc(g)}</pre>
    <div class="row"><button class="btn pri sm" data-mle="use">Bu gramerle ayrıştır</button><button class="btn sm ghost" data-copy="${esc(g)}">Gramer metnini kopyala</button></div>`;
}
const leaves = n => typeof n === "string" ? [n] : n.kids.flatMap(leaves);

// CKY tablosu: satır = aralık uzunluğu, sütun = başlangıç sözcüğü
function chartMarkdown(r){
  const n = r.toks.length, head = `| uzunluk | ${r.toks.map((t, i) => `${i} ${t}`).join(" | ")} |`;
  const lines = [head, `|${" --- |".repeat(n + 1)}`];
  for(let len = n; len >= 1; len--){
    const cells = [];
    for(let i = 0; i < n; i++) cells.push(i + len <= n ? [...r.chart[i][i + len].keys()].filter(s => !isHidden(s)).join(", ") : "");
    lines.push(`| ${len} | ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}
function chartHTML(r){
  if(!r.chart) return '<div class="empty" style="padding:30px 0">Gramer ve cümle yaz.</div>';
  if(!MODE.student) PS.fill = false;
  if(PS.fill && !PS.show) return fillHTML(r);
  const n = r.toks.length, sel = PS.sel || `0,${n}`;
  const [si, sj] = sel.split(",").map(Number);
  let rows = "";
  for(let len = n; len >= 1; len--){
    let tds = "";
    for(let i = 0; i + len <= n; i++){
      const j = i + len, syms = [...r.chart[i][j].keys()].filter(s => !isHidden(s));
      tds += `<td data-cell="${i},${j}" class="${syms.length ? "" : "e"} ${i === si && j === sj ? "sel" : ""} ${syms.includes(PS.start) && len === n ? "top" : ""}"><small>${i},${j}</small>${syms.length ? syms.map(s => `<span class="ck-s ${s === PS.start ? "st" : ""}">${esc(s)}</span>`).join("") : "·"}</td>`;
    }
    rows += `<tr>${tds}</tr>`;
  }
  const words = `<tr class="ck-w">${r.toks.map((t, i) => `<th><small>${i}</small>${esc(t)}<small>${i + 1}</small></th>`).join("")}</tr>`;
  return `${toolbar(r)}<div class="ck-tool"><button class="btn sm ghost" data-copy="${esc(chartMarkdown(r))}">Tabloyu Markdown olarak kopyala</button></div><div class="ck-scroll"><table class="ck">${rows}${words}</table></div><div class="stu">${detail(r, si, sj)}</div>`;
}
function detail(r, i, j){
  const cell = r.chart[i]?.[j]; if(!cell) return "";
  const span = r.toks.slice(i, j).join(" ");
  const syms = [...cell.keys()].filter(s => !isHidden(s));
  if(!syms.length) return `<p class="ck-meta">Hücre [${i},${j}] “${esc(span)}” boş: bu aralığı üreten kural yok.</p>`;
  const part = (s, a, b) => isHidden(s) ? `<span class="muted">…[${a},${b}]</span>` : `<button class="rel" data-cell="${a},${b}">${esc(s)}<sub>${a},${b}</sub></button>`;
  const rowsH = syms.map(s => {
    const ds = cell.get(s), v = r.f(i, j, s);
    return ds.map((d, idx) => {
      const o = r.rules[d.r.id], rt = o ? ruleText(o) : `${d.r.lhs} → ${d.r.w}`;
      const parts = d.kind === "lex" ? `<i>${esc(r.toks[i])}</i>` : d.kind === "un" ? part(d.r.a, i, j) : `${part(d.r.a, i, d.k)} + ${part(d.r.b, d.k, j)}`;
      return `<tr>${idx ? "<td></td>" : `<td rowspan="${ds.length}"><span class="ck-s ${s === PS.start ? "st" : ""}">${esc(s)}</span></td>`}<td>${esc(rt)}${r.hasProb ? ` <small class="muted">[${d.r.p}]</small>` : ""}</td><td>${parts}</td>${idx ? "" : `<td rowspan="${ds.length}">${v.cnt}</td>${r.hasProb ? `<td rowspan="${ds.length}">${fmtP(v.best)}</td>` : ""}`}</tr>`;
    }).join("");
  }).join("");
  return `<h3 class="ng-h3">Hücre [${i},${j}] “${esc(span)}” <small>nasıl dolduğu</small></h3>
    <div class="ck-scroll"><table class="ng-tbl"><tr><th>Simge</th><th>Kural</th><th>Parçalar</th><th>Ağaç</th>${r.hasProb ? "<th>En iyi P</th>" : ""}</tr>${rowsH}</table></div>`;
}
function treesHTML(r){
  if(!r.chart) return "";
  const n = r.toks.length;
  if(r.oov.length) return `<div class="notice warn"><b>${r.oov.map(esc).join(", ")}</b> gramerde sözcük olarak yok; bu yüzden cümle ayrıştırılamaz.</div>`;
  if(!r.top){
    let a = null;                                      // başlangıç simgesinin kapsadığı en geniş aralık
    for(let len = n - 1; len >= 1 && !a; len--) for(let i = 0; i + len <= n && !a; i++) if(r.chart[i][i + len].has(PS.start)) a = [i, i + len];
    return `<p class="verdict">Cümle bu gramerde <b>yok</b>: üst hücre [0,${n}] içinde başlangıç simgesi <span class="ck-s st">${esc(PS.start)}</span> çıkmadı.</p>`
      + (a ? `<p class="ck-meta stu"><span class="ck-s st">${esc(PS.start)}</span> en geniş <button class="rel" data-cell="${a[0]},${a[1]}">[${a[0]},${a[1]}] “${esc(r.toks.slice(a[0], a[1]).join(" "))}”</button> aralığını kapsıyor; kalan sözcükler gramerle bağlanamıyor.</p>` : "");
  }
  const best = r.top.best, total = r.top.ins, list = r.trees, show = PS.all ? list.slice(0, 30) : list.slice(0, 3);
  let h = `<p class="verdict">Cümle gramerde <b>var</b> ✓ · <b>${r.top.cnt}</b> farklı ayrıştırma${r.hasProb ? ` · en olası P = <b>${fmtP(best)}</b> · toplam P(cümle) = <b>${fmtP(total)}</b>` : ""}</p>`;
  if(r.top.cnt > 1) h += `<p class="ck-meta stu">${r.hasProb ? "Birden fazla ağaç var: cümle belirsiz (ambiguous). PCFG bunlardan olasılığı en yüksek olanı seçer." : "Birden fazla ağaç var: cümle belirsiz (ambiguous)."}</p>`;
  h += show.map((t, k) => {
    const rl = used(t);
    return `<article class="pt-card fig-box"><header><b>Ağaç ${k + 1}</b>${r.hasProb ? ` <span class="tag">P = ${fmtP(t.tp)}</span> <span class="tag">toplamın %${(100 * t.tp / total).toFixed(1)}'i</span>${k === 0 ? ' <span class="tag pt-best">en olası</span>' : ""}` : ""}<span class="fig-actions"><button class="btn sm ghost" data-copy="${esc(bracket(t))}">[ ] kopyala</button><button class="btn sm ghost" data-export="svg" data-name="agac-${k + 1}">SVG</button><button class="btn sm ghost" data-export="png" data-name="agac-${k + 1}">PNG</button></span></header>
      <div class="ck-scroll">${treeSVG(t)}</div>
      <details><summary>${r.hasProb ? "Kurallar ve olasılık çarpımı" : "Kullanılan kurallar"}</summary>
      <p class="ng-formula" style="margin:8px 0 4px">${r.hasProb ? rl.map(x => fmtP(x.p)).join(" × ") + " = " + fmtP(t.tp) : ""}</p>
      <div class="ck-scroll"><table class="ng-tbl"><tr><th>Kural</th>${r.hasProb ? "<th>P</th>" : ""}</tr>${rl.map(x => { const o = r.rules[x.rule]; return `<tr><td>${esc(o ? ruleText({lhs:x.sym, rhs:x.kids.map(c => c.leaf ? c.word : c.sym)}) : x.sym)}</td>${r.hasProb ? `<td>${x.p}</td>` : ""}</tr>`; }).join("")}</table></div></details></article>`;
  }).join("");
  if(list.length > 3) h += `<button class="btn sm" id="pt-more">${PS.all ? "Yalnızca ilk 3 ağaç" : `Tüm ağaçları göster (${Math.min(30, list.length)})`}</button>`;
  return h;
}

function renderAll(){
  const r = run = compute();
  $("#pgInfo", root).innerHTML = grammarInfo(r);
  const sel = $("#pgStart", root);
  sel.innerHTML = r.lhs.map(s => `<option ${s === PS.start ? "selected" : ""}>${esc(s)}</option>`).join("");
  $("#pgEx", root).innerHTML = [PS.sent, ...(PRESETS[PS.preset]?.ex || [])].map(t => `<button class="chip" data-sent="${esc(t)}">${esc(t)}</button>`).join("");
  $$("[data-preset]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.preset === PS.preset && PS.grammar === PRESETS[b.dataset.preset].grammar));
  const fk = PS.grammar + "|" + PS.sent + "|" + PS.start;
  if(fk !== PS.fk){ PS.fk = fk; PS.ans = {}; PS.chk = false; PS.show = false; PS.hints = 0; }
  $("#pgChart", root).innerHTML = chartHTML(r);
  $("#pgTrees", root).innerHTML = treesHTML(r);
  $("#pgMleOut", root).innerHTML = mleHTML();
  save();
}

function mount(){
  if(root) return;
  load();
  root = $("#v-parse");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">CFG, PCFG ve CKY</h1>
    <p class="lesson-intro" style="margin:0">Bir gramer ve bir cümle ver: CKY tablosu hücre hücre dolar, ayrıştırma ağaçları çizilir; kurallara olasılık yazarsan (PCFG) en olası ağaç seçilir. <span class="stu">Lecture 3, InClass 2 ve 3.</span></p>
    <h2 class="ng-h">1 · Gramer</h2>
    <textarea class="ta" id="pgGrammar" rows="10" spellcheck="false" style="font:500 .92rem/1.55 var(--font-mono)" aria-label="Gramer kuralları"></textarea>
    <p class="ng-formula" style="margin:6px 0 0">Her satır <span class="ng-t">A -&gt; B C | D</span> (ok olarak → da olur). Kuralın sonuna <span class="ng-t">[0.6]</span> yazarsan PCFG olur. Sol tarafta olmayan simgeler sözcüktür.</p>
    <div class="ng-ctl"><div class="chips">${Object.entries(PRESETS).map(([k, p]) => `<button class="chip${p.stu ? " stu" : ""}" data-preset="${k}">${esc(p.label)}</button>`).join("")}</div>
      <label class="muted" style="font-size:.88rem">Başlangıç simgesi <select id="pgStart" class="btn sm"></select></label></div>
    <div id="pgInfo"></div>
    <h2 class="ng-h">2 · Cümle</h2>
    <label class="field sm">Cümle<input id="pgSent" type="text" autocomplete="off" spellcheck="false"></label>
    <div class="chips" id="pgEx" style="margin-top:10px"></div>
    <h2 class="ng-h">3 · CKY tablosu <small class="stu">satır: aralık uzunluğu, alt satır: sözcükler (hücre <i>i,j</i> = i. ile j. sözcük arası)</small></h2>
    <div id="pgChart" aria-live="polite"></div>
    <h2 class="ng-h">4 · Ayrıştırma ağaçları</h2>
    <div id="pgTrees" aria-live="polite"></div>
    <h2 class="ng-h">5 · Ağaçlardan olasılık öğren <small>MLE</small></h2>
    <p class="ng-formula" style="margin:0 0 8px">Parantezli ağaçları yaz; kural olasılıkları sayımlardan hesaplanır, çıkan grameri yukarıdaki ayrıştırıcıda kullanabilirsin.</p>
    <textarea class="ta" id="pgMle" rows="5" spellcheck="false" style="font:500 .88rem/1.55 var(--font-mono)" aria-label="Parantezli ağaçlar"></textarea>
    <div id="pgMleOut" style="margin-top:12px"></div>
    <div style="height:56px"></div></div>`;
  let t;
  $("#pgGrammar", root).addEventListener("input", e => { PS.grammar = e.target.value; PS.sel = ""; clearTimeout(t); t = setTimeout(renderAll, 200); });
  $("#pgSent", root).addEventListener("input", e => { PS.sent = e.target.value; PS.sel = ""; clearTimeout(t); t = setTimeout(renderAll, 150); });
  $("#pgStart", root).addEventListener("change", e => { PS.start = e.target.value; renderAll(); });
  $("#pgMle", root).addEventListener("input", e => { PS.mle = e.target.value; clearTimeout(t); t = setTimeout(() => { $("#pgMleOut", root).innerHTML = mleHTML(); save(); }, 200); });
  root.addEventListener("input", e => { const k = e.target.dataset?.fc; if(k){ PS.ans[k] = e.target.value; PS.chk = false; save(); } });
  root.addEventListener("click", e => {
    const ml = e.target.closest("[data-mle]");
    if(ml){
      try{
        const trees = parseTrees(PS.mle), L = learn(trees);
        Object.assign(PS, {grammar:toGrammar(L), start:trees[0].label, preset:"", sent:leaves(trees[0]).join(" "), sel:""});
        sync(); renderAll(); toast("Gramer yukarıya aktarıldı");
        $("#pgGrammar", root).scrollIntoView({behavior:"smooth", block:"center"});
      }catch(_){}
      return;
    }
    const fa = e.target.closest("[data-fa]");
    if(fa){
      const a = fa.dataset.fa;
      if(a === "toggle"){ PS.fill = !PS.fill; PS.show = false; PS.chk = false; }
      else if(a === "check") PS.chk = true;
      else if(a === "hint"){ hintCell(run); PS.chk = false; }
      else if(a === "reveal") PS.show = !PS.show;
      else if(a === "reset"){ PS.ans = {}; PS.chk = false; PS.hints = 0; PS.show = false; }
      $("#pgChart", root).innerHTML = chartHTML(run); save(); return;
    }
    const c = e.target.closest("[data-cell],[data-preset],[data-sent],#pt-more"); if(!c) return;
    if(c.dataset.cell){ PS.sel = c.dataset.cell; $("#pgChart", root).innerHTML = chartHTML(run); save(); return; }
    if(c.dataset.preset){ const p = PRESETS[c.dataset.preset]; Object.assign(PS, {preset:c.dataset.preset, grammar:p.grammar, sent:p.sent, start:"", sel:"", all:false}); sync(); }
    else if(c.dataset.sent !== undefined){ PS.sent = c.dataset.sent; PS.sel = ""; sync(); }
    else if(c.id === "pt-more") PS.all = !PS.all;
    renderAll();
  });
}
function sync(){ $("#pgGrammar", root).value = PS.grammar; $("#pgSent", root).value = PS.sent; $("#pgMle", root).value = PS.mle; }

export const view = {
  apply(){},
  async enter(){ mount(); sync(); renderAll(); }
};
registerView("parse", view);
