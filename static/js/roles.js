// Roller: PropBank / TRopBank / VerbNet sözlüğü, Türkçe cümle etiketleme ve rol sınavı.
import {$, $$, esc, tr, sub, POS, FUNC, CASEL, icon, state, R, api, urlSync, setView, registerView, debounce} from "./core.js";
import {argsTable, argCls, roleName, paintTokens, openConcept} from "./ui.js";

const S = {res:[], total:0, facets:{}, ctl:null, srl:null, sel:0};
const SL_EX = ["Ahmet kapıyı açtı.", "Çocuk topu arkadaşına attı.", "Ali İstanbul'a otobüsle gitti.", "Öğretmen öğrencilere kitabı verdi.", "Babam kadına yaklaştı."];
const PQ = {qs:[], i:0, score:0};
const EXAMPLES = {en:["agree","break","fall","give","say","take","run"], tr:["açmak","vermek","gitmek","kırmak","yazmak","almak","bakmak"], vn:["agree","break","give","hit","run"]};
const FIELDS = {
  en:[["lemma","Fiil (lemma)"],["name","Roleset adı"],["role","Rol tanımı"],["fn","FrameNet çerçevesi"],["vn","VerbNet sınıfı"],["id","Roleset ID"]],
  tr:[["verb","Fiil"],["role","Rol tanımı"],["def","Synset tanımı"],["id","Synset ID"]],
  vn:[["member","Fiil (üye)"],["class","Sınıf ID"],["role","Tematik rol"],["pred","Anlam yüklemi"],["pb","PropBank roleset"],["frame","Sözdizimi kalıbı"]]
};
const KIND = {en:"roleset", tr:"çerçeve", vn:"sınıf"};
let root = null;

function mount(){
  if(root) return;
  root = $("#v-roles");
  root.innerHTML = `<div class="page">
    <h1 class="page-title">Fiil kimin neyle ne yaptığını söyler</h1>
    <div class="row"><div class="seg" id="rSub"><button data-v="dict">Çerçeve sözlüğü</button><button data-v="label">Cümle etiketle · TR</button><button data-v="quiz">Rol sınavı · EN</button></div>
      <div class="seg" id="rLang"><button data-v="en">English PropBank</button><button data-v="tr">Türkçe PropBank</button><button data-v="vn">VerbNet 3.3</button></div></div>

    <div id="rDict">
      <div class="row" style="margin-top:18px"><label class="field" style="flex:1;min-width:240px">${icon("search")}<input id="pbq" type="text" autocomplete="off" spellcheck="false"></label>
        <select class="sel" id="pbField"></select><select class="sel" id="pbMode"><option value="exact">Tam eşleşme</option><option value="prefix">ile başlar</option><option value="suffix">ile biter</option><option value="contains">içerir</option></select></div>
      <div class="filters" id="pbFilters"><div class="fbar" id="pbFnRow"><label class="chk"><input type="checkbox" id="pbFn"> Sadece FrameNet bağlantısı olanlar</label></div>
        <div class="fbar" id="pbFuncRow"><span class="lbl" style="width:64px">İşlev</span><div class="chips" id="pbFunc"></div></div>
        <div class="fbar hidden" id="pbCaseRow"><span class="lbl" style="width:64px">Durum eki</span><div class="chips" id="pbCase"></div></div></div>
      <div id="pbOut"></div></div>

    <div id="rLabel" class="hidden">
      <p class="lesson-intro" style="margin:16px 0 0">Yüklemi bulur, TRopBank çerçevelerinden aday anlamlar çıkarır ve durum eklerine bakarak ARG0, ARG1'i yerleştirir. Kural tabanlı bir öneridir; durum eki tahmini yanlışsa açılır listeden düzelt.</p>
      <div class="row" style="margin-top:16px"><label class="field" style="flex:1">${icon("search")}<input id="slText" type="text" placeholder="Bir Türkçe cümle yaz…" autocomplete="off" spellcheck="false"></label><button class="btn pri" id="slGo" style="height:46px">Etiketle</button></div>
      <div class="chips" id="slEx" style="margin-top:12px"></div><div id="slOut"></div></div>

    <div id="rQuiz" class="hidden"><p class="lesson-intro" style="margin:16px 0 14px">PropBank'in altın anotasyonlu örnek cümlelerinden: işaretli öbek hangi argüman rolünü taşıyor?</p><button class="btn pri" id="pqGo">Başlat · 5 soru</button><div id="pqOut"></div></div>
  </div>`;
  $("#rSub", root).addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; R.sub = b.dataset.v; view.enter(); urlSync(true); });
  $("#rLang", root).addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b || b.dataset.v === R.lang) return;
    Object.assign(R, {lang:b.dataset.v, field:FIELDS[b.dataset.v][0][0], func:"", cs:"", mode:"exact"}); S.facets = {}; runDict();
  });
  const go = debounce(() => runDict(), 160);
  $("#pbq", root).addEventListener("input", e => { R.q = e.target.value; go(); });
  $("#pbField", root).addEventListener("change", e => { R.field = e.target.value; runDict(); });
  $("#pbMode", root).addEventListener("change", e => { R.mode = e.target.value; runDict(); });
  $("#pbFn", root).addEventListener("change", e => { R.fn = e.target.checked; runDict(); });
  $("#pbFunc", root).addEventListener("click", e => { const c = e.target.closest("[data-func]"); if(!c) return; R.func = R.func === c.dataset.func ? "" : c.dataset.func; runDict(); });
  $("#pbCase", root).addEventListener("click", e => { const c = e.target.closest("[data-cs]"); if(!c) return; R.cs = R.cs === c.dataset.cs ? "" : c.dataset.cs; runDict(); });
  $("#pbOut", root).addEventListener("click", onDictClick);
  $("#slGo", root).addEventListener("click", () => runSrl());
  $("#slText", root).addEventListener("keydown", e => { if(e.key === "Enter") runSrl(); });
  $("#slEx", root).addEventListener("click", e => { const c = e.target.closest("[data-si]"); if(!c) return; $("#slText", root).value = SL_EX[+c.dataset.si]; R.pred = -1; R.cases = {}; runSrl(); });
  $("#slOut", root).addEventListener("click", e => {
    const p = e.target.closest("[data-pred]"), c = e.target.closest("[data-cand]");
    if(p){ R.pred = +p.dataset.pred; runSrl(true); }
    else if(c && !e.target.closest("select")){ S.sel = +c.dataset.cand; renderSrl(); }
  });
  $("#slOut", root).addEventListener("change", e => { const s = e.target.closest("select[data-case]"); if(!s) return; R.cases = R.cases || {}; R.cases[s.dataset.case] = s.value; runSrl(true); });
  $("#pqGo", root).addEventListener("click", pqStart);
  $("#pqOut", root).addEventListener("click", e => { const o = e.target.closest(".opt"); if(o) pqAnswer(+o.dataset.k); else if(e.target.id === "pqNext"){ PQ.i++; pqShow(); } });
}

function ui(){
  $$("#rSub button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === R.sub));
  $$("#rLang button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === R.lang));
  $("#rLang", root).classList.toggle("hidden", R.sub !== "dict");
  $("#rDict", root).classList.toggle("hidden", R.sub !== "dict"); $("#rLabel", root).classList.toggle("hidden", R.sub !== "label"); $("#rQuiz", root).classList.toggle("hidden", R.sub !== "quiz");
  const fields = FIELDS[R.lang]; if(!fields.some(x => x[0] === R.field)) R.field = fields[0][0];
  $("#pbField", root).innerHTML = fields.map(([v, l]) => `<option value="${v}">${l}</option>`).join(""); $("#pbField", root).value = R.field;
  $("#pbq", root).value = R.q; $("#pbMode", root).value = R.mode; $("#pbFn", root).checked = R.fn;
  $("#pbMode", root).classList.toggle("hidden", R.lang === "vn" ? ["pred", "frame"].includes(R.field) : ["role", "def"].includes(R.field));
  $("#pbFnRow", root).classList.toggle("hidden", R.lang !== "en"); $("#pbFuncRow", root).classList.toggle("hidden", R.lang === "vn"); $("#pbCaseRow", root).classList.toggle("hidden", R.lang !== "tr");
  $("#pbq", root).placeholder = R.lang === "en" ? "Fiil, rol ya da çerçeve ara · örn. agree, break" : R.lang === "tr" ? "Fiil ara · örn. açmak, vermek" : "Fiil, sınıf ya da rol ara · örn. break, agree";
  const fc = R.lang === "en" ? S.facets : (S.facets.f || {}), cc = R.lang === "tr" ? (S.facets.c || {}) : {};
  $("#pbFunc", root).innerHTML = (Object.keys(fc).length ? Object.entries(fc).sort((a, b) => b[1] - a[1]) : ["pag", "ppt", "gol", "dir", "loc", "src", "com", "tmp"].map(k => [k, null])).map(([k, n]) => `<button class="chip" data-func="${k}" aria-pressed="${R.func === k}" title="${esc(FUNC[k] || "")}">${k}${n != null ? `<small>${n}</small>` : ""}</button>`).join("");
  $("#pbCase", root).innerHTML = ["nom", "acc", "dat", "abl", "loc", "ins", "gen"].map(k => `<button class="chip" data-cs="${k}" aria-pressed="${R.cs === k}">${CASEL[k]}${cc[k] ? `<small>${cc[k]}</small>` : ""}</button>`).join("");
}

// ───────── sözlük
const pbParams = (extra = {}) => ({lang:R.lang, q:R.q, field:R.field, mode:R.mode, func:R.func, case:R.cs, fn:R.fn ? 1 : 0, fold:1, ...extra});
export async function runDict(more = false){
  mount(); ui(); urlSync(false);
  const out = $("#pbOut", root);
  if(!R.q && !R.func && !R.cs && !R.fn){
    S.res = []; S.total = 0;
    out.innerHTML = `<div class="guide-home"><h2>Örnek fiiller</h2><div class="big-chips" style="margin-top:12px">${EXAMPLES[R.lang].map(w => `<button data-act="pb" data-lang="${R.lang}" data-field="${({en:"lemma", tr:"verb", vn:"member"})[R.lang]}" data-q="${w}">${w}</button>`).join("")}</div>
      <p class="lesson-intro" style="margin-top:20px">${R.lang === "vn" ? "VerbNet fiilleri sınıflara ayırır; her sınıfın tematik rolleri, üyeleri, sözdizimi çerçeveleri ve anlam yüklemleri var. Turuncu çerçeveli üyeler PropBank rolesetine bağlı." : R.lang === "en" ? "Her roleset bir fiil anlamıdır; ARG0–ARG5 argümanları fiile özgü, işlev etiketleri (pag, ppt…) genel rol türleridir. FrameNet ve VerbNet bağlantıları kartta." : "Her fiil synset'inin argümanları anlamsal işlevi ve Türkçe durum ekleriyle birlikte. Durum eki ve işleve göre süzüp sözdizimi–anlam eşleşmesini incele."}</p></div>`;
    return;
  }
  if(S.ctl) S.ctl.abort(); S.ctl = new AbortController();
  try{
    const j = await api(R.lang === "vn" ? "/api/vn" : "/api/pb", pbParams({offset: more ? S.res.length : 0, limit: 30}), S.ctl.signal);
    S.res = more ? S.res.concat(j.results) : j.results; S.total = j.total; S.facets = j.facets;
    ui(); renderDict();
  }catch(e){ if(e.name !== "AbortError") out.innerHTML = '<div class="empty">Sunucuya ulaşılamadı.</div>'; }
}
function enCard(r, i){
  const fn = r.fn.slice(0, 6).map(f => `<button class="frm" data-act="fn" data-name="${esc(f)}" title="FrameNet çerçevesi">${esc(f)}</button>`).join(" ") + (r.fn.length > 6 ? `<span class="muted"> +${r.fn.length - 6}</span>` : "");
  const vn = r.vn.slice(0, 4).map(v => `<button class="tag" data-act="vn" data-field="class" data-q="${esc(v)}" title="VerbNet sınıfını aç">VN ${esc(v)}</button>`).join(" ");
  return `<article class="card-e"><h3>${esc(r.id)}<small>${esc(r.name)}${r.al.length && r.al[0] !== r.lemma ? " · " + esc(r.al.join(", ")) : ""}</small></h3>
    ${argsTable(r.roles.map(x => ({n:x.n, f:x.f, d:x.d, vt:x.vt})), false)}
    <div class="row" style="margin-top:12px">${fn ? `<span class="lbl">FrameNet</span>${fn}` : ""}${vn}${r.nex ? `<button class="toggler" data-ex="${esc(r.id)}" data-i="${i}" aria-expanded="false" style="margin-left:auto">Örnekler · ${r.nex}</button>` : ""}</div>
    <div class="detail hidden" id="pbd${i}"></div></article>`;
}
function trCard(s){
  const head = s.lits.slice(0, 4).map(l => esc(l.w) + sub(l.s)).join(", ");
  return `<article class="card-e"><h3>${head}<small>${esc((POS[s.pos] || s.pos).toLocaleLowerCase("tr"))} · ${esc(s.id)}</small></h3><p class="def">${esc(s.def)}</p>${s.ex.length ? `<p class="ex">${esc(s.ex[0].t)}</p>` : ""}
    ${argsTable(s.args, true)}<div class="row" style="margin-top:12px"><button class="btn sm" data-open="${esc(s.id)}" data-ods="kenet">Kavram kâğıdı</button><button class="btn sm ghost" data-act="graph" data-id="${esc(s.id)}" data-ds="kenet">${icon("graph")}Harita</button>${(s.fr || []).map(n => `<button class="frm" data-act="fn" data-name="${esc(n)}">${esc(n)}</button>`).join(" ")}</div></article>`;
}
const synStr = syn => syn.map(([t, v]) => (t === "VERB" ? "V" : t) + (v && t !== "VERB" ? "." + v : "")).join(" ");
function vnCard(c, i){
  const roles = c.roles.map(r => `<span class="tag" title="${esc(r.sel || "seçim kısıtı yok")}">${esc(r.t)}${r.sel ? ` [${esc(r.sel)}]` : ""}</span>`).join(" ");
  const mem = c.members.map(m => m.g ? `<button class="lu m" data-act="pb" data-lang="en" data-field="id" data-q="${esc(m.g)}" title="PropBank: ${esc(m.g)}">${esc(m.n)}</button>` : `<button class="lu" data-act="vn" data-field="member" data-q="${esc(m.n)}">${esc(m.n)}</button>`).join("");
  const kids = c.children.map(k => `<button class="tag" data-act="vn" data-field="class" data-q="${esc(k)}">${esc(k)}</button>`).join(" ");
  const frames = c.frames.map(f => `<div class="fx" ${f.inherited ? 'style="opacity:.75"' : ""}><b>${esc(synString(f.syn) || f.p)}</b> <span class="muted" style="font:italic .9rem var(--font-text)">${esc(f.s || f.p)}${f.inherited ? " · üst sınıftan" : ""}</span>${f.ex.length ? `<br><span class="ex" style="margin:0">${esc(f.ex[0])}</span>` : ""}${f.sem.length ? `<br><code class="muted" style="font:500 .8rem var(--font-mono)">${f.sem.map(esc).join(" · ")}</code>` : ""}</div>`).join("");
  return `<article class="card-e"><h3>${esc(c.id)}${c.parent ? `<small><button class="toggler" data-act="vn" data-field="class" data-q="${esc(c.parent)}">${icon("arrowup")}${esc(c.parent)}</button></small>` : ""}</h3>
    <div style="margin:10px 0 6px"><span class="lbl">Tematik roller</span>${c.roles_inherited ? ' <span class="muted" style="font-size:.8rem">(üst sınıftan)</span>' : ""}<div class="chips" style="margin-top:6px">${roles || '<span class="muted">—</span>'}</div></div>
    <div><span class="lbl">Üyeler · ${c.nm}</span> <span class="muted" style="font-size:.8rem">· çerçeveli: PropBank bağlantısı var</span><div style="margin-top:4px">${mem}${c.nm > c.members.length ? `<span class="muted"> +${c.nm - c.members.length}</span>` : ""}</div></div>
    ${kids ? `<div style="margin-top:8px"><span class="lbl">Alt sınıflar</span> ${kids}</div>` : ""}
    <div style="margin-top:10px"><button class="toggler" data-vnf="${i}" aria-expanded="false">Çerçeveler · ${c.frames.length}</button></div><div class="detail hidden" id="vnf${i}">${frames || '<span class="muted">Çerçeve yok.</span>'}</div></article>`;
}
const synString = synStr;
function renderDict(){
  const rest = S.total - S.res.length;
  $("#pbOut", root).innerHTML = `<div class="entry" style="margin-top:18px"><div class="entry-head" style="border-bottom-width:1px"><span class="lbl">${tr(S.total)} ${KIND[R.lang]}</span></div></div>` +
    (S.res.length ? S.res.map((x, i) => R.lang === "en" ? enCard(x, i) : R.lang === "vn" ? vnCard(x, i) : trCard(x)).join("") : '<div class="empty">Sonuç bulunamadı.</div>') +
    (rest > 0 ? `<div class="more-row"><button class="btn" id="pbMore">Daha fazla göster · ${tr(rest)} kaldı</button></div>` : "");
}
async function openExamples(rid, i, btn){
  const box = $("#pbd" + i, root);
  if(!box.classList.contains("hidden")){ box.classList.add("hidden"); btn.setAttribute("aria-expanded", false); return; }
  btn.setAttribute("aria-expanded", true); box.classList.remove("hidden");
  if(box.dataset.loaded) return;
  const d = await api("/api/roleset", {id:rid});
  const roles = Object.fromEntries(d.roles.filter(x => /^\d$/.test(x.n)).map(x => ["ARG" + x.n, x.d]));
  box.innerHTML = d.ex.map(e => {
    const toks = e.text.split(" "), spans = e.args.map(a => ({s:a.s, e:a.e, t:a.t, title:(roles[a.t] || a.t)}));
    return `<div class="sent">${paintTokens(toks, e.rel, spans)}</div>${e.name ? `<div class="up" style="margin:-4px 0 6px">${esc(e.name)}</div>` : ""}`;
  }).join("") || '<span class="muted">Örnek yok.</span>';
  box.dataset.loaded = "1";
}
function onDictClick(e){
  const t = e.target, ex = t.closest("[data-ex]"), vf = t.closest("[data-vnf]"), op = t.closest("[data-open]");
  if(vf){ const b = $("#vnf" + vf.dataset.vnf, root); b.classList.toggle("hidden"); vf.setAttribute("aria-expanded", !b.classList.contains("hidden")); }
  else if(ex) openExamples(ex.dataset.ex, ex.dataset.i, ex);
  else if(op) openConcept(op.dataset.open, op.dataset.ods);
  else if(t.id === "pbMore") runDict(true);
}

// ───────── cümle etiketleme
async function runSrl(keep = false){
  R.text = $("#slText", root).value.trim(); if(!keep){ R.pred = -1; R.cases = {}; } urlSync(false);
  const out = $("#slOut", root);
  if(!R.text){ out.innerHTML = ""; return; }
  out.innerHTML = '<div class="skeleton" style="height:100px;margin-top:26px"></div>';
  S.srl = await api("/api/srl", {text:R.text, pred:R.pred, cases:Object.entries(R.cases || {}).map(([k, v]) => k + ":" + v).join(";")});
  S.sel = 0; renderSrl();
}
function renderSrl(){
  const j = S.srl, out = $("#slOut", root), toks = j.tokens, opts = ["nom", "acc", "dat", "abl", "loc", "ins", "gen"];
  let h = `<div class="tokrow">${toks.map((t, k) => `<div class="tkc ${k === j.pred ? "pred" : ""}"><button data-pred="${k}" title="Yüklem olarak seç">${esc(t.w)}</button><small>${k === j.pred ? "yüklem" : t.noun ? "isim" : "&nbsp;"}</small>
    <select data-case="${k}" title="Durum eki tahmini (düzeltilebilir)">${opts.map(c => `<option value="${c}" ${t.case === c ? "selected" : ""}>${CASEL[c]}</option>`).join("")}<option value="none" ${!t.case ? "selected" : ""}>—</option></select></div>`).join("")}</div>`;
  if(j.pred == null){ out.innerHTML = h + '<div class="empty">Cümlede TRopBank çerçevesi olan bir fiil bulunamadı.<br><span style="font-size:.92rem">Yüklemi elle seçmek için bir sözcüğe tıkla.</span></div>'; return; }
  const c = j.candidates[S.sel] || j.candidates[0];
  const spans = Object.entries(c.assign).map(([n, k]) => ({s:k, e:k, t:n, title:(c.args.find(a => a.n === n) || {}).d || n}));
  h += `<div class="entry-head" style="border-bottom-width:1px;margin-top:8px"><span class="lbl">Yüklem <b style="color:var(--ink)">${esc(toks[j.pred].w)}</b> → ${esc(j.lemma)} · ${j.candidates.length} aday çerçeve</span><span class="muted" style="font-size:.82rem">kural tabanlı öneri</span></div><div class="sent">${paintTokens(toks.map(t => t.w), [j.pred], spans)}</div>`;
  h += j.candidates.map((cd, k) => `<div class="cand ${k === S.sel ? "best" : ""}" data-cand="${k}" style="cursor:pointer"><div class="sense-line"><span class="pos-l">fiil</span><span class="syn">${cd.lits.slice(0, 4).map(l => `<button>${esc(l.w)}${sub(l.s)}</button>`).join("<i>·</i>")}</span>${k === S.sel ? '<span class="badge">seçili çerçeve</span>' : ""}</div>
    <p class="def">${esc(cd.def)}</p>${cd.ex.length ? `<p class="ex">${esc(cd.ex[0].t)}</p>` : ""}${argsTable(cd.args, true, cd.assign, toks)}${cd.score ? `<div class="prob"><span>bağlamla örtüşme (Lesk) ${cd.score.toFixed(2)}</span></div>` : ""}</div>`).join("");
  out.innerHTML = h;
}

// ───────── rol sınavı
async function pqStart(){
  const j = await api("/api/pbquiz", {n:5});
  Object.assign(PQ, {qs:j.questions, i:0, score:0}); pqShow();
}
function pqShow(){
  const box = $("#pqOut", root), q = PQ.qs[PQ.i];
  if(!q){ box.innerHTML = `<p class="verdict" style="margin-top:30px">Bitti: <b>${PQ.score} / ${PQ.qs.length}</b></p>`; return; }
  box.innerHTML = `<p class="up" style="margin:22px 0 0">Soru ${PQ.i + 1} / ${PQ.qs.length} · puan ${PQ.score} · roleset <b>${esc(q.id)}</b> · ${esc(q.name)}</p>
    <div class="sent" id="pqSent">${paintTokens(q.toks, q.rel, [{s:q.span[0], e:q.span[1], t:"?", cls:"uq", label:"?"}])}</div>
    <div class="q">Vurgulanan öbek hangi rolü taşıyor?</div>
    ${q.options.map((o, k) => `<button class="opt" data-k="${k}"><b>${o}</b><small>${esc((q.roles.find(r => r.n === o) || {}).d || "")}</small></button>`).join("")}`;
}
function pqAnswer(k){
  const q = PQ.qs[PQ.i];
  $$("#pqOut .opt", root).forEach((b, i) => { b.disabled = true; if(i === q.answer) b.classList.add("ok"); else if(i === k) b.classList.add("no"); });
  if(k === q.answer) PQ.score++;
  const sp = [{s:q.span[0], e:q.span[1], t:q.options[q.answer], title:q.options[q.answer]}, ...q.others.map(o => ({s:o.s, e:o.e, t:o.t}))];
  $("#pqSent", root).innerHTML = paintTokens(q.toks, q.rel, sp);
  $("#pqOut", root).insertAdjacentHTML("beforeend", `<button class="btn pri" id="pqNext" style="margin-top:10px">${PQ.i + 1 < PQ.qs.length ? "Sonraki" : "Sonucu gör"}</button>`);
}

export const view = {
  apply(p){
    if(p.sub) R.sub = p.sub;
    if(p.lang) R.lang = p.lang;
    for(const k of ["field", "mode"]) if(p[k] !== undefined) R[k] = p[k];
    if(p.q !== undefined){ R.q = p.q; R.func = ""; R.cs = ""; R.fn = false; S.facets = {}; }
    if(p.text !== undefined){ R.text = p.text; R.pred = -1; R.cases = {}; }
  },
  async enter(){
    mount(); ui();
    if(R.sub === "dict") await runDict();
    else if(R.sub === "label"){ $("#slText", root).value = R.text; $("#slEx", root).innerHTML = SL_EX.map((t, i) => `<button class="chip" data-si="${i}">${esc(t)}</button>`).join(""); urlSync(false); await runSrl(true); }
    else urlSync(false);
  }
};
registerView("roles", view);
