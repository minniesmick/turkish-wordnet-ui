// Morfoloji: Lecture 2. Türkçe sözcüğü eklerine ayır (çözümle) ya da kökten ek ek sözcük üret. Öğrenci kipinde kural izi, kavram notları ve alıştırma da açılır.
import {$, $$, esc, api, registerView, MODE} from "./core.js";
import {SUF, GROUP_NAME, CURATED, generate, analyze, nextOptions, lexiconFromLemmas, stateName} from "./turkish.js";

const MS = {word:"okullarım", stem:"okul", pos:"N", ids:[], quiz:{kind:"uret", q:null, score:0, n:0, done:false}};
const KEY = "wn:morph";
let root = null, LEX = CURATED, lexNote = "";
const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)) || {}; for(const k of ["word", "stem", "pos", "ids"]) if(v[k] != null) MS[k] = v[k]; }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({word:MS.word, stem:MS.stem, pos:MS.pos, ids:MS.ids})); }catch(_){} };
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
  const list = analyze(w, LEX);
  out.innerHTML = analysisHTML(list, MS.word) + '<div id="mpBoun"></div>';
  try{
    const j = await api("/api/ud", {w:MS.word.trim()});
    $("#mpBoun", root).innerHTML = j.results.length
      ? `<h3 class="ng-h3">BOUN treebank'inde gerçek çözümlemeler <small>UD etiketleri</small></h3><div class="ck-scroll"><table class="ng-tbl"><tr><th>Lemma</th><th>UPOS</th><th>Özellikler</th><th>Sayı</th></tr>${j.results.map(r => `<tr><td><b>${esc(r.lemma)}</b></td><td>${esc(r.upos)}</td><td class="muted" style="font-size:.8rem">${esc(r.feats === "_" ? "" : r.feats.replace(/\|/g, " · "))}</td><td>${r.n}</td></tr>`).join("")}</table></div>`
      : `<p class="ck-meta">“${esc(MS.word)}” BOUN test kümesinde geçmiyor.</p>`;
  }catch(_){}
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
function renderGen(){ $("#mpGOut", root).innerHTML = genHTML(); save(); }

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
const pick = a => a[Math.floor(Math.random() * a.length)];
function makeQuestion(){
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
function quizHTML(){
  const Q = MS.quiz;
  if(!Q.q) Q.q = makeQuestion();
  const {stem, ids, g} = Q.q;
  const head = `<div class="row" style="margin-bottom:12px"><div class="seg"><button data-act="qk" data-k="uret" aria-pressed="${Q.kind === "uret"}">Eklerden sözcük yaz</button><button data-act="qk" data-k="coz" aria-pressed="${Q.kind === "coz"}">Sözcükten çözümleme seç</button></div><span class="muted" style="font-size:.9rem">${Q.score} / ${Q.n} doğru</span></div>`;
  let body;
  if(Q.kind === "uret"){
    body = `<p class="mp-q"><b>${esc(stem.w)}</b> <small class="muted">(${POSN[stem.pos]})</small> + ${ids.map(id => `<span class="tag">${esc(short(id))}</span>`).join(" + ")}</p>
      <div class="pair" style="grid-template-columns:1fr auto"><label class="field sm"><input id="mpQIn" type="text" autocomplete="off" spellcheck="false" placeholder="Yüzey biçimi" ${Q.done ? "disabled" : ""}></label><button class="btn pri sm" data-act="qcheck" ${Q.done ? "disabled" : ""}>Kontrol et</button></div>`;
  }else{
    if(!Q.opts){
      const set = new Set([g.lex]);
      for(let i = 0; i < 30 && set.size < 4; i++){ const o = makeQuestion(); if(o.stem.w === stem.w && o.g.lex !== g.lex) set.add(o.g.lex); }
      for(let i = 0; i < 30 && set.size < 4; i++){ const o = makeQuestion(); set.add(o.g.lex.replace(/^[^+]+/, stem.w)); }
      Q.opts = [...set].sort(() => Math.random() - .5);
    }
    body = `<p class="mp-q">Yüzey biçimi: <b class="mp-surf" style="font-size:1.6rem">${esc(g.surface)}</b> <small class="muted">(kök ${esc(stem.w)})</small></p>
      <div class="mp-opts">${Q.opts.map((o, i) => `<button class="mp-opt ${Q.done ? (o === g.lex ? "ok" : Q.pickd === o ? "bad" : "") : ""}" data-act="qopt" data-i="${i}" ${Q.done ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>`;
  }
  const res = Q.done ? `<p class="verdict" style="margin-top:12px">${Q.right ? "Doğru ✓" : "Yanlış ✗"} · cevap <b>${esc(g.surface)}</b> <span class="mp-lex" style="display:inline">${esc(g.lex)}</span></p>${traceHTML({stem, ids, segs:g.segs, trace:g.trace})}<button class="btn pri sm" data-act="qnext" style="margin-top:10px">Sonraki soru</button>` : "";
  return head + body + res;
}
function renderQuiz(){ $("#mpQuiz", root).innerHTML = quizHTML(); const i = $("#mpQIn", root); if(i && !MS.quiz.done) i.focus(); }

// ───────────────────────── kabuk
function mount(){
  if(root) return;
  load();
  root = $("#v-morph");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Morfoloji</h1>
    <p class="lesson-intro" style="margin:0">Türkçe bir sözcüğü eklerine ayır ya da bir kökten ek ek sözcük üret. Kural tabanlı küçük bir model: kök sözlüğü, ek sıralama kuralları ve ses değişimleri. Gerçek bir çözümleyici (Zemberek, Nuve) değil; kapsamı sınırlıdır.<span class="stu"> Lecture 2.</span></p>
    <h2 class="ng-h">1 · Çözümle <small id="mpLex"></small></h2>
    <div class="pair" style="grid-template-columns:1fr auto"><label class="field">${""}<input id="mpWord" type="text" autocomplete="off" spellcheck="false" placeholder="Bir Türkçe sözcük (örn. okullarım)"></label><button class="btn pri" id="mpGo" style="height:46px">Çözümle</button></div>
    <div class="chips" style="margin-top:12px">${["okullarım", "sevindiriyor", "evleri", "gezme", "kitabımdan", "geleceğim", "kapıyor", "güzelliği"].map(w => `<button class="chip" data-act="ex" data-w="${w}">${w}</button>`).join("")}</div>
    <div id="mpAOut" aria-live="polite"></div>
    <h2 class="ng-h">2 · Üret</h2>
    <div class="ng-ctl" style="margin-top:0"><label class="field sm" style="flex:1 1 220px">Kök<input id="mpStem" type="text" list="mpStems" autocomplete="off" spellcheck="false"></label><datalist id="mpStems">${CURATED.map(e => `<option value="${esc(e.w)}">`).join("")}</datalist>
      <div class="seg" id="mpPos"><button data-act="pos" data-p="N">isim / sıfat</button><button data-act="pos" data-p="V">fiil</button></div></div>
    <div id="mpGOut"></div>
    <div class="stu"><h2 class="ng-h">3 · Kurallar <small>motorun ses ve ek bilgisi</small></h2><div id="mpRules"></div>
    <h2 class="ng-h">4 · Kavramlar <small>slayt notları</small></h2><div id="mpNotes"></div>
    <h2 class="ng-h">5 · Alıştırma</h2><div id="mpQuiz"></div></div>
    <div style="height:56px"></div></div>`;
  const w = $("#mpWord", root), st = $("#mpStem", root);
  w.addEventListener("keydown", e => { if(e.key === "Enter") go(); });
  $("#mpGo", root).addEventListener("click", go);
  w.addEventListener("input", e => { MS.word = e.target.value; });
  st.addEventListener("input", e => { const v = lc(e.target.value); if(!v) return; const hit = CURATED.find(x => x.w === v); MS.stem = v; if(hit) MS.pos = hit.pos === "V" ? "V" : "N"; MS.ids = []; syncPos(); renderGen(); });
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if(!b) return;
    const d = b.dataset, Q = MS.quiz;
    switch(d.act){
      case "ex": MS.word = d.w; $("#mpWord", root).value = d.w; go(); break;
      case "add": MS.ids.push(d.id); renderGen(); break;
      case "del": MS.ids.splice(+d.i); renderGen(); break;
      case "undo": MS.ids.pop(); renderGen(); break;
      case "clear": MS.ids = []; renderGen(); break;
      case "pos": MS.pos = d.p; MS.ids = []; syncPos(); renderGen(); break;
      case "qk": Q.kind = d.k; Q.q = null; Q.opts = null; Q.done = false; renderQuiz(); break;
      case "qnext": Q.q = null; Q.opts = null; Q.done = false; renderQuiz(); break;
      case "qcheck": { const v = lc($("#mpQIn", root).value); if(!v) break; Q.done = true; Q.n++; Q.right = v === Q.q.g.surface; if(Q.right) Q.score++; renderQuiz(); break; }
      case "qopt": { Q.done = true; Q.n++; Q.pickd = Q.opts[+d.i]; Q.right = Q.pickd === Q.q.g.lex; if(Q.right) Q.score++; renderQuiz(); break; }
    }
  });
  root.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.id === "mpQIn") root.querySelector('[data-act="qcheck"]')?.click(); });
}
const go = () => { MS.word = $("#mpWord", root).value; runAnalyze(); };
function syncPos(){ $$("#mpPos button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.p === (MS.pos === "V" ? "V" : "N"))); $("#mpStem", root).value = MS.stem; }
function renderStudent(){ $("#mpRules", root).innerHTML = rulesHTML(); $("#mpNotes", root).innerHTML = notesHTML(); renderQuiz(); }

export const view = {
  apply(){},
  async enter(){
    mount();
    $("#mpWord", root).value = MS.word; syncPos(); renderGen(); runAnalyze();
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
