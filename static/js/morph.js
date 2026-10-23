// Morfoloji: Lecture 2. Türkçe sözcüğü eklerine ayır (çözümle) ya da kökten ek ek sözcük üret. Öğrenci kipinde kural izi, kavram notları ve alıştırma da açılır.
import {$, $$, esc, api, registerView, MODE} from "./core.js";
import {trace, stepStates, STATE_NAME, sampleLines} from "./fsm.js";
import {mountFsmQuiz} from "./fsmquiz.js";
import {SUF, GROUP_NAME, CURATED, generate, analyze, nextOptions, lexiconFromLemmas, stateName} from "./turkish.js";

const MS = {word:"okullarım", stem:"okul", pos:"N", ids:[], engine:"zem", zpos:"Noun", zids:[], sent:"Ben dün akşam kitabı okudum.", quiz:{kind:"uret", q:null, score:0, n:0, done:false}};
const KEY = "wn:morph";
let root = null, LEX = CURATED, zem = null, fsmq = null;   // zem: null bilinmiyor, false yok, true var
const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)) || {}; for(const k of ["word", "stem", "pos", "ids", "engine", "sent", "zpos", "zids"]) if(v[k] != null) MS[k] = v[k]; }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({word:MS.word, stem:MS.stem, pos:MS.pos, ids:MS.ids, engine:MS.engine, sent:MS.sent, zpos:MS.zpos, zids:MS.zids})); }catch(_){} };
const lc = s => s.toLocaleLowerCase("tr").trim();
const POSN = {N:"isim", A:"sıfat", V:"fiil"};
const short = id => (SUF[id]?.name || id).replace(/ \(.*\)$/, "");
const stemOf = (w, pos) => {
  const hit = LEX.find(e => e.w === w && (!pos || e.pos === pos || (pos === "N" && e.pos === "A"))) || CURATED.find(e => e.w === w);
  if(hit) return hit;
  const e = {w, pos:pos === "V" ? "V" : "N"};
  if(e.pos === "N" && [...w].filter(c => "aeıioöuü".includes(c)).length >= 2 && "pçk".includes(w[w.length - 1])) e.soft = 1;
  return e;
};

// ───────────────────────── çözümleme
function segsHTML(a){
  const names = ["kök", ...a.ids.map(short)];
  return `<div class="mp-segs">${a.segs.map((s, i) => `<span class="mp-seg ${i ? "" : "root"}"><b>${esc(s.text)}</b><small>${esc(names[i])}</small></span>`).join('<i>+</i>')}</div>`;
}
function traceHTML(a){
  const path = []; let st = a.stem.pos === "V" ? "V" : "N"; path.push(stateName(st));
  for(const id of a.ids){ st = SUF[id].to; path.push(`${short(id)} <small>(${SUF[id].cat})</small> → ${stateName(st)}`); }
  return `<div class="stu mp-trace"><h4>Kural izi <small>morfofonemik</small></h4>
    <ol>${a.trace.map(t => `<li><b>${esc(t.id === "STEM" ? t.out : "+" + (t.tmpl || ""))}</b>${t.id === "STEM" ? "" : ` → <span class="ng-t">${esc(t.out)}</span>`}${t.notes.length ? `<span class="muted"> · ${t.notes.map(esc).join(" · ")}</span>` : ""}</li>`).join("")}</ol>
    <h4>Morfotaktik yol <small>ek sırası</small></h4><p class="mp-path">${path.join(" → ")}</p></div>`;
}
function analysisHTML(list, word){
  if(!list.length) return `<div class="empty" style="padding:26px 0"><b>${esc(word)}</b> bu küçük modelde çözümlenemedi.<br><span style="font-size:.92rem">Kök sözlükte olmayabilir, ek bu modelde olmayabilir (örn. zarf-fiil, birleşik zaman) ya da sözcük yazım hatalı olabilir.</span></div>`;
  return (list.length > 1 ? `<p class="verdict"><b>${list.length}</b> farklı çözümleme: sözcük <b>belirsiz</b> <small class="stu muted">(morfolojik belirsizlik, slayt 10; bağlama bakıp seçmek “morfolojik belirsizlik giderme”)</small></p>` : "")
    + list.map((a, i) => `<article class="mp-card"><div class="mp-lex">${esc(a.lex)}</div>${segsHTML(a)}
      <p class="mp-meta"><span class="tag">${esc(a.surface)}</span> kök: <b>${esc(a.stem.w)}</b> (${POSN[a.stem.pos]}) · ${a.ids.length ? a.ids.map(id => `<span class="tag ${SUF[id].cat === "yapım" ? "mp-deriv" : ""}">${esc(short(id))}${`<span class="stu"> · ${SUF[id].cat}</span>`}</span>`).join(" ") : "çıplak kök"}</p>${traceHTML(a)}</article>`).join("");
}
async function runAnalyze(){
  const w = lc(MS.word); save();
  const out = $("#mpAOut", root);
  if(!w){ out.innerHTML = ""; return; }
  if(zem && MS.engine === "zem"){
    out.innerHTML = '<div class="skeleton" style="height:90px;margin-top:14px"></div>';
    try{ out.innerHTML = zAnalysisHTML(await zemWord(MS.word.trim()), MS.word) + '<div id="mpBoun"></div>'; }
    catch(_){ out.innerHTML = '<div id="mpBoun"></div>'; }
  }else{
    out.innerHTML = analysisHTML(analyze(w, LEX), MS.word) + '<div id="mpBoun"></div>';
  }
  try{
    const j = await api("/api/ud", {w:MS.word.trim()});
    $("#mpBoun", root).innerHTML = j.results.length
      ? `<h3 class="ng-h3">BOUN treebank'inde gerçek çözümlemeler <small>UD etiketleri</small></h3><div class="ck-scroll"><table class="ng-tbl"><tr><th>Lemma</th><th>UPOS</th><th>Özellikler</th><th>Sayı</th></tr>${j.results.map(r => `<tr><td><b>${esc(r.lemma)}</b></td><td>${esc(r.upos)}</td><td class="muted" style="font-size:.8rem">${esc(r.feats === "_" ? "" : r.feats.replace(/\|/g, " · "))}</td><td>${r.n}</td></tr>`).join("")}</table></div>`
      : `<p class="ck-meta">“${esc(MS.word)}” BOUN test kümesinde geçmiyor.</p>`;
  }catch(_){}
}


// ───────────────────────── Zemberek çözümlemesi
const GLOSS = {
  Noun:"isim", Verb:"fiil", Adj:"sıfat", Adv:"zarf", Pron:"zamir", Det:"belirteç", Conj:"bağlaç", Postp:"edat", Num:"sayı", Ques:"soru", Interj:"ünlem", Punc:"noktalama", Dup:"ikileme",
  A1sg:"1. tekil kişi", A2sg:"2. tekil kişi", A3sg:"3. tekil kişi", A1pl:"1. çoğul kişi", A2pl:"2. çoğul kişi", A3pl:"çoğul / 3. çoğul kişi",
  Pnon:"iyelik yok", P1sg:"benim", P2sg:"senin", P3sg:"onun", P1pl:"bizim", P2pl:"sizin", P3pl:"onların",
  Nom:"yalın hâl", Acc:"belirtme hâli", Dat:"yönelme hâli", Loc:"bulunma hâli", Abl:"ayrılma hâli", Gen:"tamlayan hâli", Ins:"araç hâli", Equ:"eşitlik hâli",
  Pos:"olumlu", Neg:"olumsuz", Aor:"geniş zaman", Prog1:"şimdiki zaman (-Iyor)", Prog2:"şimdiki zaman (-mAktA)", Past:"görülen geçmiş", Narr:"öğrenilen geçmiş", Fut:"gelecek zaman",
  Cond:"şart", Imp:"emir", Opt:"istek", Neces:"gereklilik", Pres:"şimdiki (ek-fiil)", Cop:"ek-fiil (-DIr)", Inf1:"mastar -mAk", Inf2:"eylemlik -mA", Inf3:"-Iş",
  Caus:"ettirgen", Pass:"edilgen", Reflex:"dönüşlü", Recip:"işteş", Able:"yeterlilik", PastPart:"-DIk sıfat-fiil", PresPart:"-An sıfat-fiil", FutPart:"-AcAk sıfat-fiil",
  AorPart:"-Ar sıfat-fiil", NarrPart:"-mIş sıfat-fiil", Ness:"-lIk (soyut isim)", With:"-lI (... olan)", Without:"-sIz (... olmayan)", Agt:"-CI (yapan)", Dim:"küçültme", Become:"-lAş (olmak)",
  Acquire:"-lAn (edinmek)", Zero:"sıfır dönüşüm", Prop:"özel ad", Abbrev:"kısaltma", When:"-Ince", While:"-ken", AfterDoing:"-Ip", ByDoingSo:"-ArAk", WithoutHavingDoneSo:"-mAdAn",
  Ly:"-cA (zarf)", Hastily:"-Iver", Stay:"-Akal", Almost:"-Ayaz", Start:"-Akoy"
};
const gl = id => GLOSS[id] || "";
function zSegs(a){
  const ms = a.morphemes.filter(m => m.surface);
  return `<div class="mp-segs">${ms.map((m, i) => `<span class="mp-seg ${i ? "" : "root"}"><b>${esc(m.surface)}</b><small>${esc(i ? (gl(m.id) || m.name) : "kök")}</small></span>`).join('<i>+</i>') || `<span class="mp-seg root"><b>${esc(a.stem)}</b><small>kök</small></span>`}</div>`;
}
function zTags(a){
  return `<div class="mp-tags">${a.morphemes.map(m => `<span class="tag ${m.deriv ? "mp-deriv" : ""}" title="${esc(m.name)}">${esc(m.id)}${m.surface ? `<i>:${esc(m.surface)}</i>` : ""}</span>`).join("")}</div>`;
}
// Sample.pdf biçiminde Oflazer FSM yolu
function fsmBlock(a){
  const t = trace(a.oflazer);
  const lines = sampleLines(t);
  const names = stepStates(t).map(x => `${x} ${STATE_NAME[x] || ""}`.trim());
  const text = lines.join("\n");
  return `<h4>Oflazer FSM yolu <small>Nouns / Verbs1 / Verbs2 şekilleri</small></h4>
    <pre class="mp-fsm">${esc(text)}${t.ok ? "" : `\n✗ ${esc(t.reason)}`}</pre>
    <p class="muted" style="font-size:.82rem;margin:4px 0 0">${esc(names.join(" → "))}${t.steps.some(s => s.assumed) ? " · (varsayım) ile işaretli kenar şekilde yok" : ""}</p>
    <button class="btn sm ghost" data-copy="${esc(text)}">Yolu kopyala</button>`;
}
function zStudent(a){
  const ids = [...new Set(a.morphemes.map(m => m.id))].filter(id => gl(id));
  return `<div class="stu mp-trace"><h4>Biçimler <small>Zemberek</small></h4>
    <p class="mp-fmt"><b>Uzun</b> <span class="mp-lex" style="display:inline;font-size:.88rem">${esc(a.long)}</span></p>
    <p class="mp-fmt"><b>Sözlük maddesi</b> ${esc(a.lemma)} · ${esc(a.pos)} · kök ${esc(a.stem)} + ek ${esc(a.ending || "∅")}</p>
    ${fsmBlock(a)}
    <h4>Etiketler</h4><div class="chips">${ids.map(id => `<span class="chip" style="cursor:default"><b>${esc(id)}</b> <small>${esc(gl(id))}</small></span>`).join("")}</div>
    <p class="muted" style="font-size:.84rem;margin:8px 0 0">^DB türetme sınırı: sözcüğün türü ya da anlamı değişir (yapım eki). Sıfır morfemler (A3sg, Pnon, Nom) yüzeyde görünmez.</p></div>`;
}
function zAnalysisHTML(j, word){
  const list = j.analyses || [];
  if(!list.length) return `<div class="empty" style="padding:26px 0"><b>${esc(word)}</b> için çözümleme yok.</div>`;
  const unknown = list.every(a => a.unknown);
  return (unknown ? `<div class="notice warn"><b>${esc(word)}</b> Zemberek sözlüğünde yok; tahmin edilen çözümleme gösteriliyor.</div>` : "")
    + (list.length > 1 ? `<p class="verdict"><b>${list.length}</b> farklı çözümleme: sözcük <b>belirsiz</b> <small class="stu muted">(morfolojik belirsizlik, slayt 10; cümle bağlamında seçmek için aşağıdaki “Cümlede çözümle”)</small></p>` : "")
    + list.map(a => `<article class="mp-card"><div class="mp-lex">${esc(a.oflazer)}</div>${zSegs(a)}${zTags(a)}<p class="mp-meta">sözlük maddesi: <b>${esc(a.lemma)}</b> (${esc(a.pos)})</p>${zStudent(a)}</article>`).join("");
}
const zemWord = w => api("/api/zemberek", {w});

function sentHTML(j){
  const words = j.words || [];
  if(!words.length) return "";
  return `<div class="ck-scroll"><table class="ng-tbl"><tr><th>Sözcük</th><th>Seçilen çözümleme</th><th>Aday</th></tr>${words.map(w => {
    const amb = w.all.length > 1;
    return `<tr><td><b>${esc(w.input)}</b></td><td><span class="mp-lex" style="font-size:.9rem">${esc(w.best.oflazer)}</span>${amb ? `<details class="mp-alts"><summary>diğer ${w.all.length - 1} aday</summary>${w.all.filter(a => a.oflazer !== w.best.oflazer).map(a => `<div class="mp-lex" style="font-size:.84rem;font-weight:500;color:var(--ink-2)">${esc(a.oflazer)}</div>`).join("")}</details>` : ""}</td><td>${amb ? `<span class="tag mp-deriv">${w.all.length}</span>` : '<span class="tag">1</span>'}</td></tr>`;
  }).join("")}</table></div>
  <p class="ck-meta stu">Birden fazla adayı olan sözcükler belirsizdir. Zemberek her sözcük için bağlamdaki en olası çözümlemeyi ortalamalı perceptron ile seçer (slayt 32; Sak, Güngör ve Saraçlar).</p>`;
}
async function runSent(){
  const t = MS.sent.trim(); save();
  const out = $("#mpSOut", root);
  if(!t){ out.innerHTML = ""; return; }
  out.innerHTML = '<div class="skeleton" style="height:90px"></div>';
  try{ out.innerHTML = sentHTML(await api("/api/zemberek", {s:t})); }catch(_){ out.innerHTML = ""; }
}

// ───────────────────────── Zemberek ile üretim (WordGenerator)
const usingZ = () => zem === true && MS.engine === "zem";
// Zemberek ek kimliklerini gruplara ayırır (arayüzdeki seçenekler)
const ZG = {};
for(const [g, ids] of Object.entries({
  num:["A3pl"], poss:["P1sg", "P2sg", "P3sg", "P1pl", "P2pl", "P3pl"], case:["Gen", "Acc", "Dat", "Loc", "Abl", "Ins", "Equ", "Rel"],
  deriv:["Dim", "Ness", "With", "Without", "Agt", "Become", "Acquire", "Inf1", "Inf2", "Inf3", "PastPart", "PresPart", "FutPart", "AorPart", "NarrPart", "AfterDoing", "ByDoingSo", "When", "While", "Ly"],
  voice:["Caus", "Pass", "Reflex", "Recip", "Able"], neg:["Neg"], tam:["Aor", "Prog1", "Prog2", "Past", "Narr", "Fut", "Cond", "Imp", "Opt", "Neces", "Desr", "Cop"], pers:["A1sg", "A2sg", "A1pl", "A2pl"]
})) for(const id of ids) ZG[id] = g;
let zgenSeq = 0;
const zOpts = (lemma, pos, ids) => api("/api/zemberek", {o:lemma, pos, ids:ids.join(",")});
const uniqRes = list => { const seen = new Set(); return list.filter(r => { const k = r.surface + "|" + r.analysis.oflazer; if(seen.has(k)) return false; seen.add(k); return true; }); };
const pieceOf = (res, id) => res?.analysis.morphemes.find(m => m.id === id)?.surface || "";
async function loadItems(){
  const sel = $("#mpItem", root);
  if(!usingZ()){ sel.classList.add("hidden"); return; }
  try{
    const j = await api("/api/zemberek", {i:MS.stem});
    const items = j.items || [];
    sel.innerHTML = items.map(x => `<option value="${esc(x.pos)}">${esc(x.lemma)} · ${esc(x.pos)}</option>`).join("");
    sel.classList.toggle("hidden", items.length < 2);
    if(items.length && !items.some(x => x.pos === MS.zpos)){ MS.zpos = items[0].pos; MS.zids = []; }
    sel.value = MS.zpos;
  }catch(_){}
}
async function renderGenZ(){
  const my = ++zgenSeq, out = $("#mpGOut", root);
  out.innerHTML = '<div class="skeleton" style="height:110px"></div>';
  let j;
  try{ j = await zOpts(MS.stem, MS.zpos, MS.zids); }catch(_){ return; }
  if(my !== zgenSeq) return;
  if(j.error){ out.innerHTML = `<div class="notice warn"><b>${esc(MS.stem)}</b> Zemberek sözlüğünde yok. Fiilleri kök olarak yaz (gel, oku); sözlük maddesi mastarla kayıtlıdır.</div>`; return; }
  const base = uniqRes(j.base || []);
  if(!base.length && MS.zids.length){ MS.zids = []; return renderGenZ(); }
  MS.zpos = j.item.pos;
  const groups = {};
  for(const o of j.options) (groups[ZG[o.id] || "deriv"] = groups[ZG[o.id] || "deriv"] || []).push(o);
  const first = base[0];
  const chain = `<span class="mp-ch root">${esc(MS.stem)}</span>` + MS.zids.map((id, i) => `<button class="mp-ch" data-act="del" data-i="${i}" title="Kaldır">+${esc(pieceOf(first, id) || "∅")}<small>${esc(gl(id) || id)} ×</small></button>`).join("");
  const pal = Object.entries(groups).map(([grp, os]) => `<div class="mp-grp"><h4>${esc(GROUP_NAME[grp] || grp)}</h4><div class="chips">${os.map(o => `<button class="chip" data-act="add" data-id="${esc(o.id)}" title="${esc([...new Set(o.results.map(r => r.surface))].join(" / "))}">+${esc(pieceOf(o.results[0], o.id) || "∅")} <small>${esc(gl(o.id) || o.id)}</small></button>`).join("")}</div></div>`).join("") || '<p class="ck-meta">Bu durumdan sonra ek gelemez.</p>';
  out.innerHTML = `<div class="mp-chain">${chain}</div>
    <div class="row" style="margin:10px 0"><button class="btn sm" data-act="undo" ${MS.zids.length ? "" : "disabled"}>Son eki geri al</button><button class="btn sm ghost" data-act="clear" ${MS.zids.length ? "" : "disabled"}>Sıfırla</button></div>
    ${base.slice(0, 3).map(r => `<article class="mp-card"><div class="mp-surf">${esc(r.surface)}</div><div class="mp-lex">${esc(r.analysis.oflazer)}</div>${zSegs(r.analysis)}${zTags(r.analysis)}${zStudent(r.analysis)}</article>`).join("") || '<div class="empty">Zemberek bu zincir için sözcük üretmedi.</div>'}
    <h3 class="ng-h3">Eklenebilecek ekler <small>Zemberek'in bu zincirden sonra geçerli saydıkları</small></h3>${pal}`;
  save();
}
// ───────────────────────── üretim
function genHTML(){
  const stem = stemOf(MS.stem, MS.pos), g = generate(stem, MS.ids);
  if(!g.ok){ MS.ids = []; return genHTML(); }
  const opts = nextOptions(stem, MS.ids), groups = {};
  for(const id of opts) (groups[SUF[id].grp] = groups[SUF[id].grp] || []).push(id);
  const chain = `<span class="mp-ch root">${esc(stem.w)}</span>` + MS.ids.map((id, i) => `<button class="mp-ch" data-act="del" data-i="${i}" title="Kaldır">+${esc(g.segs[i + 1].text)}<small>${esc(short(id))} ×</small></button>`).join("");
  const pal = Object.entries(groups).map(([grp, ids]) => `<div class="mp-grp"><h4>${esc(GROUP_NAME[grp] || grp)}</h4><div class="chips">${ids.map(id => { const r = generate(stem, [...MS.ids, id]); return `<button class="chip" data-act="add" data-id="${id}" title="${esc(SUF[id].name)}">+${esc(r.segs[r.segs.length - 1].text || "∅")} <small>${esc(short(id))}</small></button>`; }).join("")}</div></div>`).join("") || '<p class="ck-meta">Bu durumdan sonra ek gelemez.</p>';
  const a = {stem, ids:MS.ids, segs:g.segs, trace:g.trace};
  return `<div class="mp-chain">${chain}</div>
    <div class="row" style="margin:10px 0"><button class="btn sm" data-act="undo" ${MS.ids.length ? "" : "disabled"}>Son eki geri al</button><button class="btn sm ghost" data-act="clear" ${MS.ids.length ? "" : "disabled"}>Sıfırla</button></div>
    <article class="mp-card"><div class="mp-surf">${esc(g.surface)}</div><div class="mp-lex">${esc(g.lex)}</div>${segsHTML(a)}${traceHTML(a)}</article>
    <h3 class="ng-h3">Eklenebilecek ekler <small>yalnızca bu durumdan sonra geçerli olanlar</small></h3>${pal}`;
}
function renderGen(){ if(usingZ()){ renderGenZ(); return; } zgenSeq++; $("#mpGOut", root).innerHTML = genHTML(); save(); }

// ───────────────────────── öğrenci: kurallar ve notlar
const TEST_N = ["ev", "okul", "göz", "kapı", "masa", "ütü"].map(w => ({w, pos:"N"})), TEST_V = ["gel", "yap", "gör", "oku", "bak", "ara"].map(w => ({w, pos:"V"}));
function rulesHTML(){
  const rows = Object.keys(SUF).map(id => {
    const S = SUF[id], stems = S.from.includes("N") ? TEST_N : TEST_V, vars = new Set();
    const pre = S.from.includes("T") && !S.from.includes("V") ? [S.par === "k" ? "PROG" : "PAST"] : [];
    for(const s of stems){ const r = generate(s, [...pre, id]); if(r.ok){ const seg = r.segs[r.segs.length - 1].text; if(seg) vars.add(seg); } }
    return `<tr><td><span class="ng-t">${typeof S.t === "function" ? "Ar / Hr / r" : esc(S.t)}</span></td><td>${esc(S.name)}</td><td><span class="tag">${S.cat}</span></td><td>${[...vars].map(v => `<b>-${esc(v)}</b>`).join(" · ") || '<span class="muted">—</span>'}</td></tr>`;
  }).join("");
  const ex = [["masa", ["P1sg"], "masam", "kural 7: H, ünlüyle biten kökten sonra düşer"], ["kapa", ["PROG"], "kapıyor", "kural 8: -Iyor öncesi kök sonundaki a/e düşer"], ["ayak", ["GEN"], "ayağın", "kural 16: k → ğ"], ["renk", ["ACC"], "rengi", "kural 17: nk → ng"]];
  return `<div class="mp-rule-grid">
    <div><h4>Arkifonemler (iki düzeyli morfoloji)</h4><table class="ng-tbl"><tr><th>Simge</th><th>Anlamı</th><th>Gerçekleşme</th></tr>
      <tr><td><b>A</b></td><td>iki yönlü ünlü</td><td>a (kalın: a ı o u), e (ince: e i ö ü)</td></tr>
      <tr><td><b>H</b></td><td>dört yönlü ünlü</td><td>ı, i, u, ü (son ünlüye göre)</td></tr>
      <tr><td><b>D</b></td><td>d / t</td><td>sert ünsüzden (ç f h k p s ş t) sonra t, yoksa d</td></tr>
      <tr><td><b>C</b></td><td>c / ç</td><td>sert ünsüzden sonra ç, yoksa c</td></tr>
      <tr><td><b>(y) (n) (s)</b></td><td>tampon ünsüz</td><td>yalnızca ünlüyle biten gövdeden sonra gelir</td></tr>
      <tr><td><b>(H) (A)</b></td><td>koşullu ünlü</td><td>yalnızca ünsüzle biten gövdeden sonra gelir</td></tr></table>
    <h4 style="margin-top:18px">Slayt 25'teki kurallar, motorda</h4>
    <table class="ng-tbl"><tr><th>Sözcüksel</th><th>Yüzey</th><th>Kural</th></tr>${ex.map(([s, ids, exp, why]) => { const g = generate(stemOf(s, ids[0] === "PROG" ? "V" : "N"), ids); return `<tr><td><span class="ng-t">${esc(s)}+${esc(SUF[ids[0]].t)}</span></td><td><b>${esc(g.surface)}</b></td><td class="muted">${esc(why)}</td></tr>`; }).join("")}</table></div>
    <div><h4>Ekler ve alomorfları <small>motor test köklerinde ürettiği biçimler</small></h4><div class="ck-scroll" style="max-height:520px;overflow-y:auto"><table class="ng-tbl"><tr><th>Şablon</th><th>Ek</th><th>Tür</th><th>Alomorflar</th></tr>${rows}</table></div></div></div>`;
}
const NOTES = [
  ["Morfem, kök, ek", "Morfem: anlamı olan en küçük bölünmez birim. Kök: sözcüğün çekirdeği; ek: anlam ya da dilbilgisel işlev katan birim. Türkçede ekler yalnızca sonektir (önek, içek, çevreleyen ek yok).", ["okullarım", "kitapçılık"]],
  ["Çekim, yapım, birleştirme", "Çekim (inflection): sözcüğün anlamı ve türü değişmez (gel+di). Yapım (derivation): anlam ya da tür değişir (anahtar+cı, güzel+lik). Birleştirme (compounding): iki kök birleşir (açık+göz, bath+room). Eklerin yanındaki etiketler bu ayrımı gösterir.", ["güzellik", "sevindiriyor"]],
  ["Alomorf", "Aynı morfemin farklı gerçekleşmeleri: -lar / -ler çoğul eki, -ı -i -u -ü -yı -yi -yu -yü belirtme hâli eki. Aşağıdaki “Kurallar” tablosu bunları motorun ürettiğine göre listeler.", ["evler", "okullar", "masayı"]],
  ["Eklemeli dil", "Türkçe eklemeli (agglutinative) bir dil: bir kök çok sayıda ek alabilir, ekler birbiri ardına dizilir ve her biri tek bir işlev taşır. Bir sözcük ortalama 3 morfem içerir; yüksek sıklıklı sözcükler çoğu zaman tek morfemlidir.", ["sevindirilemeyecek", "okullarımızdan"]],
  ["Yüzey ve sözcüksel biçim", "Yüzey biçimi metinde gördüğün biçim (okulum). Sözcüksel biçim morfemlerin listesi: okul+Noun+A3sg+P1sg+Nom. Çözümleme (analysis) yüzeyden sözcükseline, üretim (generation) sözcükselden yüzeye gider; bu sekme ikisini de yapar.", ["okulum", "sevindiriyor"]],
  ["Sözlük + morfotaktik + morfofonemik", "Çözümleme için üç parça gerekir: kök sözlüğü (lexicon), eklerin sıralanma kuralları (morfotaktik; kütüphane-si-ne olur, kütüphane-ne-si olmaz) ve ses değişimi kuralları (morfofonemik; ağaç+a → ağaca). Motordaki durum makinesi morfotaktiğin, şablon çözümü morfofonemiğin yerini tutar.", ["kütüphanesine", "ağaca"]],
  ["Belirsizlik", "Bir yüzey biçiminin birden çok çözümlemesi olabilir (gez+me: “yürüme!” ya da “bir yürüyüş”; evleri: evleri / onların evi / onun evleri). Bağlama bakarak doğru çözümlemeyi seçmeye morfolojik belirsizlik giderme denir (perceptron, karar listeleri, sinir ağı).", ["gezme", "evleri"]]
];
function notesHTML(){
  return `<div class="mp-notes">${NOTES.map(([h, p, ex]) => `<section class="lesson"><div class="gut">slayt notu</div><div><h3>${esc(h)}</h3><p>${esc(p)}</p><div class="chips">${ex.map(w => `<button class="chip" data-act="ex" data-w="${esc(w)}">Çözümle · ${esc(w)}</button>`).join("")}</div></div></section>`).join("")}</div>`;
}

// ───────────────────────── öğrenci: alıştırma
// Soru nesnesi: {src, stemText, posText, tagNames, surfaces, lex, valid:Set, analysis?, small?, opts?}
// "Geçerli" çözümlemeler gerçek çözümleyiciden gelir; çözümleme sorusunda tek seçenek geçerlidir, cevap sayılan çözümleme birden çok olabilir.
const pick = a => a[Math.floor(Math.random() * a.length)];
let quizSeq = 0;
function makeSmall(){
  for(let tries = 0; tries < 40; tries++){
    const stem = pick(CURATED.filter(e => !e.dey)), ids = [];
    const add = (grp, p = 1) => { if(Math.random() > p) return; const o = nextOptions(stem, ids).filter(id => SUF[id].grp === grp); if(o.length) ids.push(pick(o)); };
    if(stem.pos === "V"){ add("voice", .3); add("neg", .35); add("tam", 1); add("pers", .75); }
    else{ add("num", .5); add("poss", .5); add("case", .8); }
    if(ids.length < 2) continue;
    const g = generate(stem, ids);
    if(g.ok) return {stem, ids, g};
  }
  const stem = CURATED[0], ids = ["PLU", "ABL"]; return {stem, ids, g:generate(stem, ids)};
}
function smallQuestion(kind){
  const q = makeSmall(), {stem, ids, g} = q, valid = new Set(analyze(g.surface, CURATED).map(a => a.lex)); valid.add(g.lex);
  const o = {src:"s", stemText:stem.w, posText:POSN[stem.pos], tagNames:ids.map(short), surfaces:[g.surface], lex:g.lex, valid, small:q};
  if(kind === "coz"){
    const set = new Set([g.lex]);
    for(let i = 0; i < 60 && set.size < 4; i++){ const x = makeSmall(); const lx = x.stem.w === stem.w ? x.g.lex : x.g.lex.replace(/^[^+]+/, stem.w); if(!valid.has(lx)) set.add(lx); }
    o.opts = [...set].sort(() => Math.random() - .5);
  }
  return o;
}
async function zemQuestion(kind){
  for(let tries = 0; tries < 10; tries++){
    const e = pick(CURATED.filter(x => !x.dey && x.pos !== "A")), pos = e.pos === "V" ? "Verb" : "Noun";
    const walk = async () => {
      const ids = [], trail = []; let cur = await zOpts(e.w, pos, ids);
      const add = async (gs, p = 1) => { if(Math.random() > p) return; const c = (cur.options || []).filter(o => gs.includes(ZG[o.id])); if(!c.length) return; trail.push(c); ids.push(pick(c).id); cur = await zOpts(e.w, pos, ids); };
      if(pos === "Verb"){ await add(["voice"], .3); await add(["neg"], .35); await add(["tam"], 1); await add(["pers"], .75); }
      else{ await add(["num"], .5); await add(["poss"], .5); await add(["case"], .8); }
      return {ids, trail, base:uniqRes(cur.base || [])};
    };
    const w = await walk();
    if(w.ids.length < 2 || !w.base.length) continue;
    const surfaces = [...new Set(w.base.map(r => r.surface))];
    const an = (await api("/api/zemberek", {w:surfaces[0]})).analyses || [], valid = new Set(an.map(x => x.oflazer));
    const lex = w.base[0].analysis.oflazer; valid.add(lex);
    const o = {src:"z", stemText:e.w, posText:pos === "Verb" ? "fiil" : "isim", tagNames:w.ids.map(id => gl(id) || id), surfaces, lex, valid, analysis:w.base[0].analysis};
    if(kind === "coz"){
      // çeldiriciler: zincirin son iki adımında Zemberek'in geçerli saydığı öteki ekler (ek çağrı gerekmez)
      const pool = [...new Set(w.trail.slice(-2).flat().map(x => x.results[0]?.analysis.oflazer).filter(x => x && !valid.has(x)))].sort(() => Math.random() - .5);
      if(pool.length < 3) continue;
      const set = new Set([lex, ...pool.slice(0, 3)]);
      o.opts = [...set].sort(() => Math.random() - .5);
    }
    return o;
  }
  return smallQuestion(kind);
}
async function newQuestion(){
  const Q = MS.quiz, my = ++quizSeq;
  $("#mpQuiz", root).innerHTML = '<div class="skeleton" style="height:120px"></div>';
  const q = usingZ() ? await zemQuestion(Q.kind) : smallQuestion(Q.kind);
  if(my !== quizSeq) return;
  Q.q = q; Q.done = false; Q.pickd = null; renderQuiz();
}
function quizHTML(){
  const Q = MS.quiz, q = Q.q;
  const head = `<div class="row" style="margin-bottom:12px"><div class="seg"><button data-act="qk" data-k="uret" aria-pressed="${Q.kind === "uret"}">Eklerden sözcük yaz</button><button data-act="qk" data-k="coz" aria-pressed="${Q.kind === "coz"}">Sözcükten çözümleme seç</button></div><span class="muted" style="font-size:.9rem">${Q.score} / ${Q.n} doğru · ${q.src === "z" ? "cevap anahtarı: Zemberek" : "cevap anahtarı: küçük model"}</span></div>`;
  let body;
  if(Q.kind === "uret"){
    body = `<p class="mp-q"><b>${esc(q.stemText)}</b> <small class="muted">(${q.posText})</small> + ${q.tagNames.map(t => `<span class="tag">${esc(t)}</span>`).join(" + ")}</p>
      <div class="pair" style="grid-template-columns:1fr auto"><label class="field sm"><input id="mpQIn" type="text" autocomplete="off" spellcheck="false" placeholder="Yüzey biçimi" ${Q.done ? "disabled" : ""}></label><button class="btn pri sm" data-act="qcheck" ${Q.done ? "disabled" : ""}>Kontrol et</button></div>`;
  }else{
    body = `<p class="mp-q">Yüzey biçimi: <b class="mp-surf" style="font-size:1.6rem">${esc(q.surfaces[0])}</b> <small class="muted">(kök ${esc(q.stemText)})</small></p>
      <div class="mp-opts">${q.opts.map((o, i) => `<button class="mp-opt ${Q.done ? (q.valid.has(o) ? "ok" : Q.pickd === o ? "bad" : "") : ""}" data-act="qopt" data-i="${i}" ${Q.done ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>`;
  }
  const others = [...q.valid].filter(x => x !== q.lex);
  const res = Q.done ? `<p class="verdict" style="margin-top:12px">${Q.right ? "Doğru ✓" : "Yanlış ✗"} · cevap <b>${esc(q.surfaces.join(" / "))}</b> <span class="mp-lex" style="display:inline">${esc(q.lex)}</span></p>${others.length ? `<p class="ck-meta">Bu yüzeyin başka geçerli çözümlemeleri de var: ${others.map(x => `<span class="mp-lex" style="display:inline;font-size:.84rem">${esc(x)}</span>`).join(", ")}.</p>` : ""}${q.analysis ? `<div class="mp-card">${zSegs(q.analysis)}${zStudent(q.analysis)}</div>` : q.small ? traceHTML({stem:q.small.stem, ids:q.small.ids, segs:q.small.g.segs, trace:q.small.g.trace}) : ""}<button class="btn pri sm" data-act="qnext" style="margin-top:10px">Sonraki soru</button>` : "";
  return head + body + res;
}
function renderQuiz(){
  const Q = MS.quiz;
  if(!Q.q || (Q.kind === "coz" && !Q.q.opts)){ newQuestion(); return; }
  $("#mpQuiz", root).innerHTML = quizHTML();
  const i = $("#mpQIn", root); if(i && !Q.done) i.focus();
}

// ───────────────────────── kabuk
let loaded = false;
const ensure = () => { if(!loaded){ loaded = true; load(); } };   // apply() mount'tan önce çağrılabilir; kayıtlı durum onu ezmesin
function mount(){
  if(root) return;
  ensure();
  root = $("#v-morph");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Morfoloji</h1>
    <p class="lesson-intro" style="margin:0">Türkçe bir sözcüğü eklerine ayır ya da bir kökten ek ek sözcük üret. Kural tabanlı küçük bir model: kök sözlüğü, ek sıralama kuralları ve ses değişimleri. Gerçek bir çözümleyici (Zemberek, Nuve) değil; kapsamı sınırlıdır.<span class="stu"> Lecture 2.</span></p>
    <h2 class="ng-h">1 · Çözümle <small id="mpLex"></small></h2>
    <div class="ng-ctl hidden" id="mpEng" style="margin:0 0 12px"><div class="seg" role="group" aria-label="Çözümleyici"><button data-act="eng" data-e="zem">Zemberek</button><button data-act="eng" data-e="small">Küçük kural modeli</button></div><span class="muted" id="mpEngNote" style="font-size:.86rem"></span></div>
    <div class="pair" style="grid-template-columns:1fr auto"><label class="field">${""}<input id="mpWord" type="text" autocomplete="off" spellcheck="false" placeholder="Bir Türkçe sözcük (örn. okullarım)"></label><button class="btn pri" id="mpGo" style="height:46px">Çözümle</button></div>
    <div class="chips" style="margin-top:12px">${["okullarım", "sevindiriyor", "evleri", "gezme", "kitabımdan", "geleceğim", "kapıyor", "güzelliği"].map(w => `<button class="chip" data-act="ex" data-w="${w}">${w}</button>`).join("")}</div>
    <div id="mpAOut" aria-live="polite"></div>
    <div id="mpSent" class="hidden"><h2 class="ng-h">2 · Cümlede çözümle <small>morfolojik belirsizlik giderme</small></h2>
      <div class="pair" style="grid-template-columns:1fr auto"><label class="field sm"><input id="mpSin" type="text" autocomplete="off" spellcheck="false" placeholder="Bir Türkçe cümle"></label><button class="btn pri sm" id="mpSgo">Çözümle</button></div>
      <div class="chips" style="margin-top:10px">${["Ben dün akşam kitabı okudum.", "Gözleri yaşlı bir adam bana baktı.", "Yarın okula gidecek miyiz?"].map(t => `<button class="chip" data-act="sex" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <div id="mpSOut" aria-live="polite" style="margin-top:12px"></div></div>
    <h2 class="ng-h">3 · Üret <small id="mpGenNote">kök + ekler → sözcük</small></h2>
    <div class="ng-ctl" style="margin-top:0"><label class="field sm" style="flex:1 1 220px">Kök<input id="mpStem" type="text" list="mpStems" autocomplete="off" spellcheck="false"></label><datalist id="mpStems">${CURATED.map(e => `<option value="${esc(e.w)}">`).join("")}</datalist>
      <div class="seg" id="mpPos"><button data-act="pos" data-p="N">isim / sıfat</button><button data-act="pos" data-p="V">fiil</button></div><select id="mpItem" class="btn sm hidden" aria-label="Sözlük maddesi"></select></div>
    <div id="mpGOut"></div>
    <div class="stu"><h2 class="ng-h">4 · Kurallar <small>motorun ses ve ek bilgisi</small></h2><div id="mpRules"></div>
    <h2 class="ng-h">5 · Kavramlar <small>slayt notları</small></h2><div id="mpNotes"></div>
    <h2 class="ng-h">6 · Alıştırma</h2><div id="mpQuiz"></div>
    <h2 class="ng-h">7 · FSM yolunu kendin yaz <small>Sample.pdf</small></h2><div id="mpFsmq"></div></div>
    <div style="height:56px"></div></div>`;
  fsmq = mountFsmQuiz($("#mpFsmq", root));
  const w = $("#mpWord", root), st = $("#mpStem", root);
  w.addEventListener("keydown", e => { if(e.key === "Enter") go(); });
  $("#mpGo", root).addEventListener("click", go);
  $("#mpItem", root).addEventListener("change", e => { MS.zpos = e.target.value; MS.zids = []; renderGen(); });
  w.addEventListener("input", e => { MS.word = e.target.value; });
  $("#mpSgo", root).addEventListener("click", () => { MS.sent = $("#mpSin", root).value; runSent(); });
  $("#mpSin", root).addEventListener("keydown", e => { if(e.key === "Enter"){ MS.sent = e.target.value; runSent(); } });
  st.addEventListener("input", e => { const v = lc(e.target.value); if(!v) return; const hit = CURATED.find(x => x.w === v); MS.stem = v; if(hit) MS.pos = hit.pos === "V" ? "V" : "N"; MS.ids = []; MS.zids = []; MS.zpos = hit ? (hit.pos === "V" ? "Verb" : "Noun") : MS.zpos; syncPos(); renderGen(); loadItems(); });
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if(!b) return;
    const d = b.dataset, Q = MS.quiz;
    switch(d.act){
      case "eng": MS.engine = d.e; syncEng(); runAnalyze(); loadItems(); renderGen(); MS.quiz.q = null; if(MODE.student) renderQuiz(); break;
      case "sex": MS.sent = d.t; $("#mpSin", root).value = d.t; runSent(); break;
      case "ex": MS.word = d.w; $("#mpWord", root).value = d.w; go(); break;
      case "add": (usingZ() ? MS.zids : MS.ids).push(d.id); renderGen(); break;
      case "del": (usingZ() ? MS.zids : MS.ids).splice(+d.i); renderGen(); break;
      case "undo": (usingZ() ? MS.zids : MS.ids).pop(); renderGen(); break;
      case "clear": if(usingZ()) MS.zids = []; else MS.ids = []; renderGen(); break;
      case "pos": MS.pos = d.p; MS.ids = []; syncPos(); renderGen(); break;
      case "qk": Q.kind = d.k; Q.q = null; renderQuiz(); break;
      case "qnext": Q.q = null; renderQuiz(); break;
      case "qcheck": { const v = lc($("#mpQIn", root).value); if(!v) break; Q.done = true; Q.n++; Q.right = Q.q.surfaces.includes(v); if(Q.right) Q.score++; renderQuiz(); break; }
      case "qopt": { Q.done = true; Q.n++; Q.pickd = Q.q.opts[+d.i]; Q.right = Q.q.valid.has(Q.pickd); if(Q.right) Q.score++; renderQuiz(); break; }
    }
  });
  root.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.id === "mpQIn") root.querySelector('[data-act="qcheck"]')?.click(); });
}
const go = () => { MS.word = $("#mpWord", root).value; runAnalyze(); };
function syncEng(){
  const on = zem === true;
  $("#mpEng", root).classList.toggle("hidden", zem === null);
  $$("#mpEng [data-e]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.e === (on ? MS.engine : "small")));
  $$("#mpEng [data-e='zem']", root).forEach(b => b.disabled = !on);
  $("#mpEngNote", root).textContent = on ? "Zemberek: açık kaynak (Apache 2.0) gerçek çözümleyici." : "Zemberek bulunamadı (lib/zemberek-full.jar ve JDK gerekir); küçük kural modeli kullanılıyor.";
  $("#mpSent", root).classList.toggle("hidden", !on);
  const z = usingZ();
  $("#mpPos", root).classList.toggle("hidden", z);
  $("#mpGenNote", root).textContent = z ? "Zemberek WordGenerator ile" : "küçük kural modeliyle";
}
function syncPos(){ $$("#mpPos button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.p === (MS.pos === "V" ? "V" : "N"))); $("#mpStem", root).value = MS.stem; }
function renderStudent(){ $("#mpRules", root).innerHTML = rulesHTML(); $("#mpNotes", root).innerHTML = notesHTML(); renderQuiz(); fsmq.render(); }

export const view = {
  apply(p){ ensure(); if(p.word) MS.word = p.word; if(p.sent) MS.sent = p.sent; },
  async enter(){
    mount();
    $("#mpWord", root).value = MS.word; $("#mpSin", root).value = MS.sent; syncPos(); renderGen(); syncEng();
    if(zem === null){
      try{ const j = await api("/api/zemberek", {}); zem = !!j.available; }catch(_){ zem = false; }
      syncEng(); loadItems(); renderGen();
    }
    runAnalyze(); if(zem) runSent();
    if(MODE.student) renderStudent();
    if(LEX === CURATED){
      try{
        const j = await api("/api/ud", {lex:1});
        LEX = lexiconFromLemmas(j.lemmas.map(r => [r[0], r[1]]));
        $("#mpLex", root).textContent = `${LEX.length} kök (BOUN + elle)`;
        runAnalyze();
      }catch(_){}
    }else $("#mpLex", root).textContent = `${LEX.length} kök (BOUN + elle)`;
  }
};
registerView("morph", view);
