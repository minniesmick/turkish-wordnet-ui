// Belirsizlik giderme: Lecture 2 (slayt 31–32). Bir sözcüğün birden çok çözümlemesi varken bağlama uygun olanı seç.
// BOUN'un eğitim bölümünden taban çizgisi, karar listesi ve ortalama perceptron eğitilir; sınama bölümünde ve seçilen cümlede karşılaştırılır.
// Hesap md.js içinde (test: node scripts/test_md.mjs); burada yalnızca arayüz var.
import {$, $$, esc, registerView, setView, tr as num} from "./core.js";
import {loadCorpus} from "./corpusdata.js";
import {split, train, evaluate, analyze, topRules, sentTags, tagOf, uposOf, featsOf, lc, METHODS} from "./md.js";

const DM = {i:0, src:"test", text:"Gözleri yaşlı bir adam bana baktı.", gran:"tag", open:[], word:"bir"};
const KEY = "wn:disamb";
const NAME = {base:"Taban çizgisi", dl:"Karar listesi", ap:"Perceptron"};
let root = null, C = null, SP = null, M = null, R = null, WF = null, BAD = [], TA = null, POOL = null, failed = "";
const QZ = {cur:null, score:0, n:0};

const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)) || {}; for(const k of ["i", "src", "text", "gran", "word"]) if(v[k] != null) DM[k] = v[k]; }catch(_){} if(!["test", "own"].includes(DM.src)) DM.src = "test"; if(!["tag", "upos"].includes(DM.gran)) DM.gran = "tag"; };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({i:DM.i, src:DM.src, text:DM.text, gran:DM.gran, word:DM.word})); }catch(_){} };
let loaded = false;
const ensure = () => { if(!loaded){ loaded = true; load(); } };   // apply() mount'tan önce çağrılabilir; kayıtlı durum onu ezmesin

// ───────────────────────── biçim
const UPOS_TR = {NOUN:"isim", VERB:"fiil", PUNCT:"noktalama", ADJ:"sıfat", PROPN:"özel ad", DET:"belirleyici", ADV:"zarf", CCONJ:"bağlaç", PRON:"zamir", NUM:"sayı", ADP:"ilgeç", AUX:"yardımcı fiil", PART:"parçacık", SCONJ:"yan cümle bağlacı", INTJ:"ünlem"};
const GLOSS = {
  "Case=Nom":"yalın hâl", "Case=Acc":"belirtme (-i)", "Case=Dat":"yönelme (-e)", "Case=Loc":"bulunma (-de)", "Case=Abl":"ayrılma (-den)", "Case=Gen":"tamlayan (-in)", "Case=Ins":"araç (-le)", "Case=Equ":"eşitlik (-ce)",
  "Number=Sing":"tekil", "Number=Plur":"çoğul", "Person=1":"1. kişi", "Person=2":"2. kişi", "Person=3":"3. kişi",
  "Number[psor]=Sing":"iyelik tekil", "Number[psor]=Plur":"iyelik çoğul", "Person[psor]=1":"iyelik 1. kişi", "Person[psor]=2":"iyelik 2. kişi", "Person[psor]=3":"iyelik 3. kişi",
  "Tense=Pres":"şimdiki / geniş zaman", "Tense=Past":"geçmiş zaman", "Tense=Fut":"gelecek zaman", "Aspect=Perf":"bitmiş görünüş", "Aspect=Prog":"süregelen", "Aspect=Hab":"alışkanlık", "Aspect=Imp":"bitmemiş", "Aspect=Prosp":"yaklaşan",
  "Polarity=Pos":"olumlu", "Polarity=Neg":"olumsuz", "Voice=Pass":"edilgen", "Voice=Cau":"ettirgen", "Voice=CauPass":"ettirgen + edilgen",
  "Mood=Ind":"bildirme", "Mood=Imp":"emir", "Mood=Opt":"istek", "Mood=Nec":"gereklilik", "Mood=Cnd":"koşul", "Mood=Pot":"yeterlilik", "Mood=Gen":"geniş", "Mood=Des":"dilek",
  "VerbForm=Part":"sıfat-fiil", "VerbForm=Conv":"zarf-fiil", "VerbForm=Vnoun":"ad-fiil", "Evident=Fh":"görülen geçmiş", "Evident=Nfh":"duyulan geçmiş",
  "PronType=Ind":"belgisiz", "PronType=Dem":"işaret", "PronType=Prs":"kişi", "PronType=Int":"soru", "PronType=Neg":"olumsuz", "NumType=Card":"asıl sayı", "NumType=Ord":"sıra sayı"
};
const glossOf = tag => [UPOS_TR[uposOf(tag)] || uposOf(tag), ...(featsOf(tag) === "_" ? [] : featsOf(tag).split("|").map(f => GLOSS[f]).filter(Boolean))].join(" · ");
const tagHTML = t => `<span class="dm-tag"><b>${esc(uposOf(t))}</b>${featsOf(t) !== "_" ? `<small>${esc(featsOf(t).split("|").join(" · "))}</small>` : ""}</span>`;
const pct = (a, n) => n ? (100 * a / n).toFixed(1) : "–";
const meter = v => `<div class="meter"><i><b style="width:${Math.min(1, v) * 100}%"></b></i></div>`;
const FL = {w:"sözcük", pw:"önceki sözcük", nw:"sonraki sözcük", ps3:"önceki sözcüğün son 3 harfi", ns3:"sonraki sözcüğün son 3 harfi", ps2:"önceki sözcüğün son 2 harfi", ns2:"sonraki sözcüğün son 2 harfi",
  pt:"önceki çözümleme", "pt,w":"önceki çözümleme + sözcük", "pt,s3":"önceki çözümleme + son 3 harf", "pt2,pt":"önceki iki çözümleme", pu:"önceki sözcüğün türü", p3:"ilk 3 harf", cap:"büyük harfle başlıyor", digit:"rakam içeriyor", b:"sabit terim"};
function featText(f){
  const i = f.indexOf("=");
  if(i < 0) return FL[f] || f;
  const k = f.slice(0, i), m = k.match(/^s(\d)$/);
  return `${m ? `son ${m[1]} harf` : FL[k] || k}: <code>${esc(f.slice(i + 1))}</code>`;
}
const tokenize = t => t.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu) || [];

// ───────────────────────── model
async function build(){
  if(M || failed) return;
  try{
    C = await loadCorpus("boun");
    if(!C.sents.length || !C.sents[0].x) throw new Error("sunucu FEATS göndermiyor; server.py'yi yeniden başlat");
    await new Promise(r => setTimeout(r, 20));                                 // "eğitiliyor" yazısı çizilsin
    SP = split(C.sents);
    M = train(SP.train); R = evaluate(M, SP.test);
    WF = new Map();                                                            // BOUN'un tamamı: sözcük → etiket → {n, lemma}
    for(const s of C.sents) for(let i = 0; i < s.f.length; i++){
      if(s.p[i] === "PUNCT") continue;
      const w = lc(s.f[i]), t = tagOf(s.p[i], s.x[i]);
      let m = WF.get(w); if(!m){ m = new Map(); WF.set(w, m); }
      const e = m.get(t) || {n:0, lem:new Map()}; e.n++; e.lem.set(s.l[i], (e.lem.get(s.l[i]) || 0) + 1); m.set(t, e);
    }
    BAD = [...WF].map(([w, m]) => { const tot = [...m.values()].reduce((a, e) => a + e.n, 0), top = Math.max(...[...m.values()].map(e => e.n)); return {w, tot, wrong:tot - top, k:m.size}; })
      .filter(x => x.tot >= 6 && x.k > 1).sort((a, b) => b.wrong - a.wrong || b.tot - a.tot).slice(0, 14);
  }catch(e){ failed = String(e.message || e); }
}
const lemOf = e => [...e.lem].sort((a, b) => b[1] - a[1])[0][0];

// ───────────────────────── çıktı
function statsHTML(){
  const cell = (a, b) => `<div><b>${a}</b><span>${b}</span></div>`, a = R.all;
  const known = R.amb.n + R.one.n;
  return `<div class="ng-stats">${cell(num(SP.train.length), "eğitim cümlesi")}${cell(num(M.tokens), "eğitim sözcüğü")}${cell(num(M.lex.glob.size), "farklı çözümleme (UPOS + FEATS)")}${cell(num(SP.test.length), "sınama cümlesi")}${cell(num(a.n), "sınama sözcüğü (noktalamasız)")}${cell("%" + pct(R.unk.n, a.n), "eğitimde hiç görülmemiş")}${cell("%" + pct(R.amb.n, known), "bilinen sözcüklerin belirsiz olanı")}</div>`;
}
function accHTML(){
  const U = DM.gran === "upos" ? "U" : "";
  const rows = [["all", "Tüm sözcükler"], ["amb", "Belirsiz (bilinen, 2 ve üstü aday)"], ["one", "Tek adaylı (bilinen)"], ["unk", "Bilinmeyen sözcük (eğitimde yok)"]];
  return `<div class="ng-scroll"><table class="ng-tbl ng-cmp"><caption>Sınama kümesi doğruluğu (%), ${DM.gran === "upos" ? "yalnızca sözcük türü (UPOS)" : "tam çözümleme (UPOS + FEATS)"}. Noktalama sayılmaz.</caption>
    <thead><tr><th>Küme</th><th>Sözcük</th><th title="Doğru çözümlemenin aday kümesinde bulunma oranı: hiçbir yöntem bunu aşamaz">Tavan</th>${METHODS.map(m => `<th>${NAME[m]}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(([k, label]) => {
      const r = R[k], v = METHODS.map(m => 100 * r[m + U] / r.n), mx = Math.max(...v), mn = Math.min(...v);
      return `<tr><td>${label}</td><td>${num(r.n)}</td><td>${pct(r["ceil" + U], r.n)}</td>${v.map(x => `<td class="${r.n && x === mx && mx > mn ? "best" : ""}">${r.n ? x.toFixed(1) : "–"}</td>`).join("")}</tr>`;
    }).join("")}</tbody></table></div>
    <p class="ng-formula" style="margin:6px 0 0">Aday kümesi eğitim sözlüğünden gelir, gerçek bir çözümleyiciden değil: görülen sözcüğün eğitimdeki çözümlemeleri; görülmeyen sözcük için son harfleri aynı olan sözcüklerin çözümlemeleri. Tavan, doğru çözümlemenin bu kümede olduğu sözcüklerin oranıdır.</p>`;
}

const cur = () => {
  if(DM.src === "own") return {forms:tokenize(DM.text), gold:null, upos:null, id:""};
  const s = SP.test[Math.min(DM.i, SP.test.length - 1)];
  return {forms:s.f, gold:sentTags(s), upos:s.p, id:s.id};
};
function candHTML(t, k, gold){
  const tot = t.cands.reduce((a, c) => a + c.n, 0);
  const badges = tag => [tag === t.base ? "taban" : "", tag === t.dl.tag ? "karar listesi" : "", tag === t.ap.tag ? "perceptron" : "", tag === gold ? "doğru" : ""].filter(Boolean).map(b => `<span class="dm-b${b === "doğru" ? " g" : ""}">${b}</span>`).join("");
  const rows = t.cands.slice(0, 8).map(c => `<div class="dm-c"><div>${tagHTML(c.tag)} ${badges(c.tag)}${c.lemma ? ` <span class="muted">kök: ${esc(c.lemma)}</span>` : ""}<small class="stu muted" style="display:block">${esc(glossOf(c.tag))}</small></div>${meter(c.n / tot)}<span class="muted">${c.n}</span></div>`).join("");
  const more = t.cands.length > 8 ? `<p class="muted" style="margin:4px 0 0">+ ${t.cands.length - 8} aday daha</p>` : "";
  const why = [];
  if(t.cands.length > 1){
    if(t.dl.rule) why.push(`<p><b>Karar listesi:</b> ilk uyan kural “${featText(t.dl.rule.f)}” → ${esc(uposOf(t.dl.tag))}; güven ${t.dl.rule.score.toFixed(2)} (log oran; ${t.dl.rule.p} kez doğru, ${t.dl.rule.n} kez yanlış).</p>`);
    else why.push(`<p><b>Karar listesi:</b> uyan kural yok, en sık çözümlemeye düştü.</p>`);
    if(t.ap.why.length) why.push(`<p><b>Perceptron:</b> seçilen çözümlemeyi ikinci adaya göre öne çıkaran özellikler (ağırlık farkı): ${t.ap.why.map(([f, x]) => `${featText(f)} <b>${x > 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}</b>`).join("; ")}.</p>`);
  }
  return `<tr class="dm-det"><td colspan="${k}"><div class="dm-cand">${rows}${more}</div>${t.known ? "" : `<p class="muted" style="margin:6px 0 0">Bu sözcük eğitimde yok: adaylar, son harfleri aynı olan sözcüklerin çözümlemelerinden çıkarıldı.</p>`}<div class="stu dm-why">${why.join("")}</div></td></tr>`;
}
function sentHTML(){
  const S = cur();
  if(!S.forms.length) return `<p class="muted">Bir cümle yaz.</p>`;
  const res = analyze(M, S.forms), cols = S.gold ? 7 : 6;
  const score = {base:0, dl:0, ap:0}; let n = 0;
  const cell = (t, tag, ref, i) => {
    const mk = S.gold && S.upos[i] !== "PUNCT" ? (tag === S.gold[i] ? " ok" : " no") : "";
    return `<td class="dm-pick${mk}"><div class="dm-cin">${mk ? `<span class="dm-mk">${mk === " ok" ? "✓" : "✗"}</span>` : ""}${ref !== undefined && tag === ref ? `<span class="muted">aynı</span>` : tagHTML(tag)}</div></td>`;
  };
  const body = res.map((t, i) => {
    if(S.gold && S.upos[i] !== "PUNCT"){ n++; for(const m of METHODS) if((m === "base" ? t.base : t[m].tag) === S.gold[i]) score[m]++; }
    const open = DM.open.includes(i);
    return `<tr class="dm-row${open ? " sel" : ""}" data-row="${i}"><td class="muted">${i + 1}</td><td><b>${esc(t.w)}</b></td><td>${t.cands.length > 1 ? `<b>${t.cands.length}</b>` : t.cands.length}${t.known ? "" : ` <small class="muted">yeni</small>`}</td>
      ${cell(t, t.base, undefined, i)}${cell(t, t.dl.tag, t.base, i)}${cell(t, t.ap.tag, t.base, i)}${S.gold ? `<td>${tagHTML(S.gold[i])}</td>` : ""}</tr>${open ? candHTML(t, cols, S.gold?.[i]) : ""}`;
  }).join("");
  const head = `<p class="dm-score">${S.gold ? `Taban çizgisi <b>${score.base}/${n}</b> · Karar listesi <b>${score.dl}/${n}</b> · Perceptron <b>${score.ap}/${n}</b>` : `${res.filter(t => t.cands.length > 1).length} sözcük belirsiz`}</p>`;
  return `${head}<div class="ng-scroll"><table class="ng-tbl dm-tbl"><thead><tr><th>#</th><th>Sözcük</th><th>Aday</th><th>${NAME.base}</th><th>${NAME.dl}</th><th>${NAME.ap}</th>${S.gold ? "<th>Doğru</th>" : ""}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="ng-formula" style="margin:6px 0 0">Satıra tıklayınca adaylar ve sayıları açılır.${S.gold ? " “aynı” = taban çizgisiyle aynı seçim; ✓ / ✗ doğru çözümlemeyle karşılaştırır." : " Eğitimde görülmemiş sözcükte aday kümesi güvenilir değildir."}</p>`;
}
function sentCtlHTML(){
  const n = SP.test.length;
  return DM.src === "test"
    ? `<div class="ng-ctl"><button class="btn sm" data-nav="-1" aria-label="Önceki cümle">${"←"}</button><span class="muted" style="font-size:.9rem">sınama cümlesi <b>${DM.i + 1}</b> / ${n}</span><button class="btn sm" data-nav="1" aria-label="Sonraki cümle">→</button><button class="btn sm" data-nav="rand">Rastgele</button><span class="muted" style="font-size:.84rem">${esc(cur().id)}</span></div>
       <p class="ng-pred" style="font-size:1.1rem">${esc(cur().forms.join(" "))}</p>`
    : `<label class="field sm" style="margin-top:12px">Cümle<input id="dmText" type="text" autocomplete="off" spellcheck="false" value="${esc(DM.text)}" placeholder="örn. Gözleri yaşlı bir adam bana baktı."></label>`;
}
function wordHTML(){
  const w = lc(DM.word.trim()), m = w && WF.get(w);
  if(!w) return "";
  if(!m) return `<p class="muted">“${esc(w)}” BOUN'da yok.</p>`;
  const list = [...m].sort((a, b) => b[1].n - a[1].n), tot = list.reduce((a, [, e]) => a + e.n, 0);
  return `<div class="ng-scroll"><table class="ng-tbl"><caption><b>${esc(w)}</b>: BOUN'da ${tot} kez, ${list.length} farklı çözümleme</caption><thead><tr><th>Çözümleme</th><th>Kök</th><th>Sayı</th><th></th></tr></thead><tbody>
    ${list.map(([t, e]) => `<tr><td>${tagHTML(t)}<small class="stu muted" style="display:block">${esc(glossOf(t))}</small></td><td>${esc(lemOf(e))}</td><td>${e.n}</td><td class="ng-bar">${meter(e.n / tot)}</td></tr>`).join("")}</tbody></table></div>`;
}
function rulesHTML(){
  const seen = new Set(), rules = topRules(M.dl, 120).filter(r => { const k = `${r.t}|${r.p}|${r.n}`; return seen.has(k) ? false : (seen.add(k), true); }).slice(0, 14);   // aynı kanıta dayanan kopya kuralları ele
  return `<p class="muted" style="margin:0 0 8px">Her kural “özellik → çözümleme” biçimindedir; kurallar güvenilirliğe (log olabilirlik oranı) göre sıralanır, sözcüğe uyan ilk kural karar verir. Bu liste eğitimden çıkan en güvenilir ${rules.length} kuraldır (aynı kanıta dayanan kopyalar çıkarıldı).</p>
    <div class="ng-scroll"><table class="ng-tbl"><thead><tr><th>#</th><th>Özellik</th><th>Çözümleme</th><th>Güven</th><th>Doğru / yanlış</th></tr></thead><tbody>
    ${rules.map((r, i) => `<tr><td class="muted">${i + 1}</td><td>${featText(r.f)}</td><td>${tagHTML(r.t)}</td><td>${r.score.toFixed(2)}</td><td>${r.p} / ${r.n}</td></tr>`).join("")}</tbody></table></div>`;
}
const METH = `<p><b>Sorun.</b> Bir yüzey biçimin birden çok çözümlemesi olabilir (slayt 31: “Of course, we need to solve it”). Çözümleyici hepsini listeler; bağlama bakıp doğru olanı seçmek <b>morfolojik belirsizlik gidermedir</b>.</p>
  <p><b>Taban çizgisi.</b> Her sözcük için eğitimde en sık görülen çözümleme. Bağlama hiç bakmaz.</p>
  <p><b>Karar listesi</b> (Yüret ve Türe, slayt 32). Eğitimden “özellik → çözümleme” kuralları öğrenilir ve güvenilirliğe göre sıralanır; sözcüğe uyan ilk kural karar verir. Özellikler: sözcüğün kendisi, son harfleri, önceki ve sonraki sözcük, önceki sözcüğün çözümlemesi.</p>
  <p><b>Ortalama perceptron</b> (Sak, Güngör, Saraçlar, slayt 32). Her aday, özelliklerin ağırlık toplamıyla puanlanır. Yanlış seçimde doğru çözümlemenin özellik ağırlıkları artırılır, seçilenin azaltılır; sonda tüm adımların ağırlık ortalaması alınır (aşırı uymayı azaltır). Morfoloji sekmesindeki “Cümlede çözümle” Zemberek'in <code>PerceptronAmbiguityResolver</code> sınıfını kullanır; buradaki model onun küçük bir benzeridir.</p>
  <p><b>Sinir ağı</b> yöntemi (slayt 32'de üçüncü yöntem) bu sayfada yok.</p>`;

// ───────────────────────── sınav
function pool(){
  if(POOL) return POOL;
  TA = SP.test.map(s => analyze(M, s.f));
  POOL = [];
  SP.test.forEach((s, si) => { const g = sentTags(s); TA[si].forEach((t, i) => { if(s.p[i] !== "PUNCT" && t.known && t.cands.length > 1 && t.cands.some(c => c.tag === g[i])) POOL.push([si, i]); }); });
  return POOL;
}
function quizNew(){
  const P = pool(), [si, i] = P[Math.floor(Math.random() * P.length)], t = TA[si][i], g = sentTags(SP.test[si])[i];
  const opts = t.cands.slice(0, 6).map(c => c.tag);
  if(!opts.includes(g)) opts[opts.length - 1] = g;
  for(let k = opts.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [opts[k], opts[j]] = [opts[j], opts[k]]; }
  QZ.cur = {si, i, g, opts, ans:null};
}
function quizHTML(){
  if(!QZ.cur) quizNew();
  const q = QZ.cur, s = SP.test[q.si], t = TA[q.si][q.i], done = q.ans != null;
  const sent = s.f.map((w, k) => k === q.i ? `<mark class="dm-w">${esc(w)}</mark>` : esc(w)).join(" ");
  const opts = q.opts.map((o, k) => {
    const c = t.cands.find(x => x.tag === o);
    return `<button class="opt${done ? (o === q.g ? " ok" : k === q.ans ? " no" : "") : ""}" data-qa="${k}" ${done ? "disabled" : ""}>${tagHTML(o)}<small>${esc(glossOf(o))}${done && c ? ` · eğitimde ${c.n} kez` : ""}</small></button>`;
  }).join("");
  const mk = ok => ok ? "✓" : "✗";
  return `<p class="ng-pred" style="font-size:1.15rem">${sent}</p><p style="margin:6px 0">Bu cümlede <b>${esc(s.f[q.i])}</b> sözcüğünün çözümlemesi hangisi?</p>${opts}
    ${done ? `<p class="dm-score">${q.ans === q.opts.indexOf(q.g) ? "Doğru." : "Yanlış."} Yöntemler: taban çizgisi ${mk(t.base === q.g)} · karar listesi ${mk(t.dl.tag === q.g)} · perceptron ${mk(t.ap.tag === q.g)}</p><button class="btn pri sm" data-q="next">Sonraki</button>` : ""}
    <p class="muted" style="margin:10px 0 0;font-size:.88rem">${QZ.n ? `${QZ.score} / ${QZ.n} doğru` : "Seçeneklerin altında Türkçe açıklama var; sözcüğün cümledeki işlevine bak."}</p>`;
}

function renderAll(){
  if(failed){ $("#dmState", root).textContent = ""; $("#dmBody", root).classList.remove("hidden"); $("#dmBody", root).innerHTML = `<div class="empty"><b>Yüklenemedi.</b><br>${esc(failed)}</div>`; return; }
  $("#dmState", root).textContent = "";
  $("#dmBody", root).classList.remove("hidden");
  DM.i = Math.max(0, Math.min(DM.i, SP.test.length - 1));
  $("#dmMeth", root).innerHTML = METH;
  $("#dmStats", root).innerHTML = statsHTML();
  $("#dmAcc", root).innerHTML = accHTML();
  $$("#dmGran button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.gran === DM.gran));
  $$("#dmSrc button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.src === DM.src));
  $("#dmCtl", root).innerHTML = sentCtlHTML();
  $("#dmSent", root).innerHTML = sentHTML();
  $("#dmBad", root).innerHTML = BAD.map(x => `<button class="chip" data-bad="${esc(x.w)}" aria-pressed="${lc(DM.word.trim()) === x.w}">${esc(x.w)} <small>${x.k} çözümleme · ${x.wrong}/${x.tot}</small></button>`).join("");
  $("#dmWordOut", root).innerHTML = wordHTML();
  $("#dmRules", root).innerHTML = rulesHTML();
  $("#dmQuiz", root).innerHTML = quizHTML();
  save();
}
const renderSent = () => { $("#dmSent", root).innerHTML = sentHTML(); save(); };

function mount(){
  if(root) return;
  ensure();
  root = $("#v-disamb");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Morfolojik belirsizlik giderme</h1>
    <p class="lesson-intro" style="margin:0">Bir sözcüğün birden çok çözümlemesi olabilir; cümledeki bağlama bakarak doğrusunu seç. Çözümleme burada UD etiketidir (sözcük türü + çekim özellikleri). BOUN'un eğitim bölümünden üç yöntem eğitilir, sınama bölümünde ve istediğin cümlede karşılaştırılır.<span class="stu"> Lecture 2, slayt 31–32.</span></p>
    <div class="ng-expl stu" id="dmMeth"></div>
    <h2 class="ng-h">1 · Doğruluk <small id="dmState">eğitiliyor…</small></h2>
    <div id="dmBody" class="hidden">
      <div id="dmStats"></div>
      <div class="ng-ctl"><div class="seg" id="dmGran" role="group" aria-label="Ölçüt"><button data-gran="tag">Tam çözümleme</button><button data-gran="upos">Yalnızca sözcük türü</button></div></div>
      <div id="dmAcc" aria-live="polite"></div>
      <h2 class="ng-h">2 · Cümlede belirsizlik giderme</h2>
      <div class="ng-ctl" style="margin-bottom:0"><div class="seg" id="dmSrc" role="group" aria-label="Cümle kaynağı"><button data-src="test">BOUN sınama cümlesi</button><button data-src="own">Kendi cümlem</button></div></div>
      <div id="dmCtl"></div>
      <div id="dmSent" aria-live="polite"></div>
      <h2 class="ng-h">3 · En belirsiz sözcükler <small>taban çizgisinin en çok yanıldığı, BOUN'un tamamı</small></h2>
      <div class="chips" id="dmBad"></div>
      <label class="field sm" style="margin-top:12px">Sözcük<input id="dmWord" type="text" autocomplete="off" spellcheck="false" placeholder="örn. bir"></label>
      <div id="dmWordOut"></div>
      <div class="stu"><h2 class="ng-h">4 · Karar listesinin kuralları</h2><div id="dmRules"></div></div>
      <div class="stu"><h2 class="ng-h">5 · Kendini sına <small>bağlama bakarak çözümlemeyi seç</small></h2><div id="dmQuiz"></div></div>
    </div>
    <div style="height:56px"></div></div>`;
  let t;
  root.addEventListener("input", e => {
    if(e.target.id === "dmText"){ DM.text = e.target.value; DM.open = []; clearTimeout(t); t = setTimeout(renderSent, 200); }
    else if(e.target.id === "dmWord"){ DM.word = e.target.value; clearTimeout(t); t = setTimeout(() => { $("#dmWordOut", root).innerHTML = wordHTML(); $$("#dmBad .chip", root).forEach(c => c.setAttribute("aria-pressed", c.dataset.bad === lc(DM.word.trim()))); save(); }, 200); }
  });
  root.addEventListener("click", e => {
    if(!M) return;
    const g = e.target.closest("[data-go]"); if(g){ e.preventDefault(); setView(g.dataset.go); return; }
    const d = e.target.closest("[data-gran],[data-src],[data-nav],[data-row],[data-bad],[data-qa],[data-q]"); if(!d) return;
    const D = d.dataset;
    if(D.gran){ DM.gran = D.gran; renderAll(); }
    else if(D.src){ DM.src = D.src; DM.open = []; renderAll(); }
    else if(D.nav){ const n = SP.test.length; DM.i = D.nav === "rand" ? Math.floor(Math.random() * n) : (DM.i + +D.nav + n) % n; DM.open = []; $("#dmCtl", root).innerHTML = sentCtlHTML(); renderSent(); }
    else if(D.row !== undefined){ const i = +D.row, k = DM.open.indexOf(i); if(k < 0) DM.open.push(i); else DM.open.splice(k, 1); renderSent(); }
    else if(D.bad){ DM.word = D.bad; $("#dmWord", root).value = D.bad; renderAll(); }
    else if(D.qa !== undefined && QZ.cur && QZ.cur.ans == null){ const k = +D.qa; QZ.cur.ans = k; QZ.n++; if(QZ.cur.opts[k] === QZ.cur.g) QZ.score++; $("#dmQuiz", root).innerHTML = quizHTML(); }
    else if(D.q === "next"){ quizNew(); $("#dmQuiz", root).innerHTML = quizHTML(); }
  });
}

export const view = {
  apply(p){
    ensure();
    if(p.sent){ DM.src = "own"; DM.text = p.sent; DM.open = []; }
    if(p.word) DM.word = p.word;
  },
  async enter(){
    mount();
    $("#dmWord", root).value = DM.word;
    await build();
    renderAll();
  }
};
registerView("disamb", view);
