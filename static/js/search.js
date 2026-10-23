// Ara: sözlük madde sayfası. Anlama tıklayınca odak (diğerleri söner) + kenar kâğıdı açılır.
import {$, $$, esc, tr, lower, hl, sub, w1, other, debounce, POS, DSNAME, icon, state, api, searchParams, urlSync, store, itemOf, toast, setView, registerView} from "./core.js";
import {openConcept, closeSheet, sheetState} from "./ui.js";

const S = {results:[], total:0, facets:{}, lexf:{}, ms:0, ctl:null, filters:false, random:false, mapAfter:false, scrolled:false};
const POS_ORDER = {n:0, v:1, a:2, s:2, b:3, r:4, p:5, c:6, i:7};
const EX = {kenet:["yüz","çıkmak","kalem","el","açmak","kara","göz","at","ağız"], en:["bank","bat","interest","run","dog","spring"], "1998":["kalem","yüz","göz"]};
let root = null;

function mount(){
  if(root) return;
  root = $("#v-search");
  root.innerHTML = `<div class="page">
    <div class="runhead"><span class="gw" id="gwL"></span><span class="mid" id="gwMid"></span><span class="gw" id="gwR"></span></div>
    <div class="row nowrap-sm" style="margin-top:18px">
      <label class="field" style="flex:1">${icon("search")}<input id="sq" type="text" placeholder="Sözcük, tanım ya da kimlik yaz…" autocomplete="off" spellcheck="false" aria-label="Sözlükte ara"><button class="iconbtn hidden" id="sClear" aria-label="Temizle" style="height:28px;min-width:28px">${icon("x")}</button></label>
      <button class="btn" id="sRandom" title="Rastgele örnekler">${icon("dice")}<span class="hide-sm">Rastgele</span></button>
      <button class="btn" id="sFilt" aria-expanded="false">${icon("filter")}<span>Süzgeçler</span><span class="chip" id="sFiltN" style="padding:0 7px;display:none"></span></button>
    </div>
    <div class="tabs-u" id="sField"><button data-v="word">Kelime</button><button data-v="def">Tanım</button><button data-v="example">Örnek</button><button data-v="id">ID</button><span style="margin-left:auto"><select class="sel" id="sMode" aria-label="Eşleşme türü"><option value="exact">Tam eşleşme</option><option value="prefix">ile başlar</option><option value="suffix">ile biter</option><option value="contains">içerir</option><option value="token">ifade içinde sözcük</option></select></span></div>
    <div class="filters hidden" id="sFilters">
      <div class="fbar"><span class="lbl" style="width:64px">Tür</span><div class="chips" id="sPos"></div></div>
      <div class="fbar"><span class="lbl" style="width:64px">Anlam</span>
        <select class="sel" id="sSense" aria-label="Anlam numarası"><option value="">Tümü</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6+">6 ve üstü</option></select>
        <select class="sel hidden" id="sLex" aria-label="Kategori"></select>
        <label class="chk"><input type="checkbox" id="sEx"> Sadece örnek cümlesi olanlar</label>
        <label class="chk"><input type="checkbox" id="sFold"> ç ğ ı ö ş ü farkını yok say</label>
      </div>
    </div>
    <div id="sOut" aria-live="polite"></div>
  </div>`;
  const inp = $("#sq", root);
  const go = debounce(() => { run(); }, 150);
  inp.addEventListener("input", e => { state.q = e.target.value; state.focus = ""; S.random = false; syncControls(); go(); });
  $("#sClear", root).addEventListener("click", () => { state.q = ""; inp.value = ""; inp.focus(); S.random = false; syncControls(); run(); });
  $("#sRandom", root).addEventListener("click", randomCards);
  $("#sFilt", root).addEventListener("click", () => { S.filters = !S.filters; syncControls(); });
  $("#sField", root).addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if(!b) return; state.field = b.dataset.v; state.focus = ""; syncControls(); run(); });
  $("#sMode", root).addEventListener("change", e => { state.mode = e.target.value; run(); });
  $("#sSense", root).addEventListener("change", e => { state.sense = e.target.value; run(); });
  $("#sLex", root).addEventListener("change", e => { state.lex = e.target.value; run(); });
  $("#sEx", root).addEventListener("change", e => { state.example = e.target.checked; run(); });
  $("#sFold", root).addEventListener("change", e => { state.fold = e.target.checked; run(); });
  $("#sPos", root).addEventListener("click", e => { const c = e.target.closest("[data-pos]"); if(!c) return; state.pos.has(c.dataset.pos) ? state.pos.delete(c.dataset.pos) : state.pos.add(c.dataset.pos); run(); });
  $("#sOut", root).addEventListener("click", onOut);
}

function activeFilters(){ return state.pos.size + (state.sense ? 1 : 0) + (state.lex ? 1 : 0) + (state.example ? 1 : 0) + (state.fold ? 1 : 0); }
function syncControls(){
  if(!root) return;
  const inp = $("#sq", root); if(inp.value !== state.q) inp.value = state.q;
  $("#sClear", root).classList.toggle("hidden", !state.q);
  $$("#sField button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === state.field));
  $("#sMode", root).value = state.mode; $("#sMode", root).classList.toggle("hidden", state.field !== "word");
  $("#sSense", root).value = state.sense; $("#sEx", root).checked = state.example; $("#sFold", root).checked = state.fold;
  const en = state.ds === "en", ls = $("#sLex", root);
  ls.classList.toggle("hidden", !en);
  if(en){
    ls.innerHTML = '<option value="">Kategori: tümü</option>' + Object.entries(S.lexf).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<option value="${k}">${k} (${n})</option>`).join("") + (state.lex && !(state.lex in S.lexf) ? `<option value="${esc(state.lex)}">${esc(state.lex)}</option>` : "");
    ls.value = state.lex;
  }
  $("#sPos", root).innerHTML = Object.entries(POS).filter(([k]) => k !== "s").map(([k, v]) => `<button class="chip" data-pos="${k}" aria-pressed="${state.pos.has(k)}">${v}${S.facets[k] != null ? `<small>${tr(S.facets[k])}</small>` : ""}</button>`).join("");
  const n = activeFilters(), fb = $("#sFiltN", root);
  fb.style.display = n ? "" : "none"; fb.textContent = n;
  $("#sFilters", root).classList.toggle("hidden", !S.filters);
  $("#sFilt", root).setAttribute("aria-expanded", S.filters);
  $("#gwMid", root).textContent = DSNAME[state.ds] || "";
}

const isEmpty = () => !state.q && !state.sense && !state.pos.size && !state.example && !state.lex;

export async function run(more = false){
  mount(); syncControls(); urlSync(false);
  const out = $("#sOut", root);
  if(isEmpty() && !S.random){ S.results = []; S.total = 0; S.facets = {}; home(); return; }
  if(S.ctl) S.ctl.abort(); S.ctl = new AbortController();
  if(!S.results.length && !more) out.innerHTML = skeleton();
  try{
    const j = await api("/api/search", searchParams({offset: more ? S.results.length : 0, limit: 30}), S.ctl.signal);
    S.results = more ? S.results.concat(j.results) : j.results; S.total = j.total; S.facets = j.facets; S.lexf = j.lexf || {}; S.ms = j.ms; S.random = false;
  }catch(e){ if(e.name !== "AbortError") out.innerHTML = '<div class="empty">Sunucuya ulaşılamadı.</div>'; return; }
  syncControls(); render();
  if(S.mapAfter && S.results[0]){ S.mapAfter = false; setView("graph", {id:S.results[0].id, ds:state.ds}); }
}
const skeleton = () => `<div class="entry"><div class="skeleton" style="height:64px;width:38%"></div>${[0, 1, 2].map(() => '<div class="skeleton" style="height:70px;margin-top:18px"></div>').join("")}</div>`;

async function randomCards(){
  const j = await api("/api/random", {ds:state.ds, n:10});
  S.results = j.results; S.total = j.results.length; S.random = true; state.q = ""; state.focus = ""; S.facets = {};
  syncControls(); render(); urlSync(false);
}

function home(){
  const ex = EX[state.ds] || EX.kenet, hist = store.hist().slice(0, 5), favs = store.favs().slice(0, 4);
  $("#gwL", root).textContent = ""; $("#gwR", root).textContent = "";
  $("#sOut", root).innerHTML = `<div class="guide-home">
    <h2>${state.ds === "en" ? "Bir sözcükle başla" : "Bir sözcükle başla"}</h2>
    <p class="lesson-intro" style="margin:6px 0 16px">${state.ds === "en" ? "Çok anlamlı bir sözcük en iyi örnek:" : "Çok anlamlı bir sözcük en iyi örnek:"}</p>
    <div class="big-chips">${ex.map(w => `<button data-go="${esc(w)}">${esc(w)}</button>`).join("")}</div>
    <ul class="guide-list">
      <li><span class="k">Odak</span><span>Bir anlama tıkla: diğer anlamlar sönükleşir, sağda kâğıt açılır ve o kavramın üst yolu, alt kavramları, ilişkileri ile karşıt dildeki karşılığı görünür.</span></li>
      <li><span class="k">Harita</span><span>Kâğıttaki <b>Haritada aç</b> ile kavram, hiyerarşisi ve bağlarıyla bir ağaç olarak açılır; bir düğüme tıklayınca nasıl bağlı olduğu ve ne kadar yakın olduğu görünür.</span></li>
      <li><span class="k">Komut paleti</span><span><span class="kbd">⌘K</span> ile her yerden sözcük, çerçeve, roleset ve bölümlere atla.</span></li>
      <li><span class="k">Aynalı dikiş</span><span>Her anlamın sağ sütunu Türkçe ↔ İngilizce karşılığıdır; tıklayınca öbür dile geçersin.</span></li>
    </ul>
    ${hist.length ? `<h3 class="lbl" style="margin:26px 0 6px">Son bakılanlar</h3><div class="big-chips">${hist.map(x => `<button data-open="${esc(x.id)}" data-ods="${x.ds}">${esc(x.w)}</button>`).join("")}</div>` : ""}
    ${favs.length ? `<h3 class="lbl" style="margin:22px 0 6px">Çalışma listemden</h3><div class="big-chips">${favs.map(x => `<button data-open="${esc(x.id)}" data-ods="${x.ds}">${esc(x.w)}</button>`).join("")}</div>` : ""}
  </div>`;
}

// ───────── madde çizimi
function group(results){
  if(state.field !== "word" || S.random) return [{head:null, items:results.map(s => ({s, l:s.lits.find(x => x.m) || s.lits[0]}))}];
  const m = new Map();
  for(const s of results){
    const l = s.lits.find(x => x.m) || s.lits[0], key = lower(l.w);
    if(!m.has(key)) m.set(key, {head:l.w, items:[]});
    m.get(key).items.push({s, l});
  }
  for(const g of m.values()) g.items.sort((a, b) => (POS_ORDER[a.s.pos] ?? 9) - (POS_ORDER[b.s.pos] ?? 9) || (a.l.s || 99) - (b.l.s || 99));
  return [...m.values()];
}

function senseRow({s, l}, i, flat){
  const syn = s.lits.map(x => `<button data-w="${esc(x.w)}" class="${x.m ? "hit" : ""}" title="Bu sözcüğü ara${x.c ? " · SemCor etiket sayısı: " + x.c : ""}">${x.m ? hl(x.w, [x.m]) : esc(x.w)}${sub(x.s)}</button>`).join("<i>·</i>");
  const num = l.s > 0 ? l.s : i + 1;
  const xds = other(state.ds), xlab = state.ds === "kenet" ? "EN" : "TR";
  const seam = s.x.length ? s.x.map(c => `<button class="xw" data-open="${esc(c.id)}" data-ods="${xds}" title="${esc(c.id)}"><span class="lg">${xlab}</span>${esc(c.w.join(", "))}</button>`).join("") + (s.xn > s.x.length ? `<span class="xw more">+${s.xn - s.x.length} karşılık</span>` : "") : (state.ds === "1998" ? "" : '<span class="none">karşılık yok</span>');
  const fav = store.isFav(s.id);
  const srl = (s.pb ? `<button class="srlbtn" data-act="pb" data-lang="tr" data-field="id" data-q="${esc(s.id)}" title="TRopBank: bu fiilin argüman rolleri">ROLLER</button>` : "") + (s.fr || []).map(n => `<button class="frm" data-act="fn" data-name="${esc(n)}" title="Türkçe FrameNet çerçevesi">${esc(n)}</button>`).join("");
  const exs = s.ex.map((e, k) => `<p class="ex" ${k ? 'data-more="1"' : ""}>${hl(e.t, e.m)}</p>`);
  return `<li class="sense ${state.focus === s.id ? "is-focus" : ""}" data-id="${esc(s.id)}" data-i="${i}">
    <button class="hit-area" data-focus="${esc(s.id)}" aria-label="Bu anlamı odakla: ${esc(w1(s))}"></button>
    <span class="num" aria-hidden="true">${num}</span>
    <div class="sense-main">
      <div class="sense-line">${flat ? `<b style="font:800 1.25rem var(--font-ui);letter-spacing:-.02em">${esc(l.w)}</b>` : ""}<span class="pos-l">${esc((POS[s.pos] || s.pos).toLocaleLowerCase("tr"))}</span>${s.lx ? `<span class="lex-l">${esc(s.lx)}</span>` : ""}<span class="syn">${s.lits.length > 1 || flat ? syn : ""}</span></div>
      <p class="def">${hl(s.def, s.dm)}</p>
      ${s.h && s.h.length ? `<div class="up">${icon("arrowup")}${esc(s.h.join(" / "))}</div>` : ""}${s.vf && s.vf.length ? `<div class="up">kalıp: ${s.vf.map(esc).join(" · ")}</div>` : ""}
      ${exs[0] || ""}<div class="expand-body">${exs.slice(1).join("")}</div>
      <div class="sense-acts">${srl}<button class="btn sm ghost" data-act="graph" data-id="${esc(s.id)}" data-ds="${state.ds}" title="Haritada aç (m)">${icon("graph")}Harita</button><button class="iconbtn" data-fav="${esc(s.id)}" aria-pressed="${fav}" aria-label="Favori" title="Favori (f)" style="height:30px">${icon("star")}</button></div>
    </div>
    <div class="seam">${seam}</div>
  </li>`;
}
function render(){
  const out = $("#sOut", root), groups = group(S.results), rest = S.total - S.results.length;
  const heads = groups.filter(g => g.head).map(g => g.head);
  $("#gwL", root).textContent = heads[0] ? lower(heads[0]) : ""; $("#gwR", root).textContent = heads.length > 1 ? lower(heads[heads.length - 1]) : "";
  if(!S.results.length){ out.innerHTML = '<div class="empty">Sonuç bulunamadı.<br><span style="font-size:.92rem">Eşleşme türünü “içerir” yap ya da <b>ç ğ ı ö ş ü</b> farkını yok say.</span></div>'; return; }
  const flat = groups.length === 1 && !groups[0].head;
  out.innerHTML = (S.random ? '<p class="lesson-intro" style="margin-top:28px">Rastgele örnekler</p>' : "") + groups.map((g, gi) => {
    const counts = {}; g.items.forEach(x => counts[x.s.pos] = (counts[x.s.pos] || 0) + 1);
    const meta = `${g.items.length} anlam${Object.keys(counts).length > 0 && g.head ? ` · ${Object.entries(counts).map(([k, n]) => `${n} ${(POS[k] || k).toLocaleLowerCase("tr")}`).join(", ")}` : ""}`;
    return `<article class="entry">${g.head ? `<div class="entry-head"><h2 class="headword">${esc(g.head)}</h2><div class="entry-meta">${meta}</div></div>` : `<div class="entry-head" style="border-bottom-width:1px"><span class="lbl">${tr(S.total)} sonuç · ${S.ms} ms</span></div>`}
      <div class="seam-head"><span>Anlamlar</span><span>${state.ds === "kenet" ? "İngilizce karşılık" : state.ds === "en" ? "Türkçe karşılık" : ""}</span></div>
      <ol class="senses ${state.focus ? "has-focus" : ""}">${g.items.map((x, i) => senseRow(x, i, flat)).join("")}</ol></article>`;
  }).join("") + (rest > 0 ? `<div class="more-row"><button class="btn" id="sMore">Daha fazla göster · ${tr(rest)} kaldı</button></div>` : "");
  if(state.focus){ markFocus(state.focus, !S.scrolled); S.scrolled = true; }
}

// ───────── odak
function markFocus(id, scroll = true){
  $$(".senses", root).forEach(o => o.classList.toggle("has-focus", !!id));
  let el = null;
  $$(".sense", root).forEach(li => { const on = li.dataset.id === id; li.classList.toggle("is-focus", on); if(on) el = li; });
  if(el && scroll) el.scrollIntoView({block:"nearest", behavior:"smooth"});
}
export function focusSense(id, open = true){
  state.focus = id; markFocus(id);
  if(open && id) openConcept(id, state.ds);
  urlSync(false);
}
export function unfocus(){
  if(!state.focus) return false;
  state.focus = ""; markFocus("");
  return true;
}
function onOut(e){
  const t = e.target;
  const fo = t.closest("[data-focus]"), w = t.closest(".syn [data-w]"), op = t.closest("[data-open]"), go = t.closest("[data-go]"), fav = t.closest("[data-fav]");
  if(fav){
    const s = S.results.find(x => x.id === fav.dataset.fav);
    if(s){ const on = store.toggleFav(itemOf(state.ds, s)); fav.setAttribute("aria-pressed", on); toast(on ? "Çalışma listesine eklendi" : "Listeden çıkarıldı"); }
  }
  else if(w){ state.q = w.dataset.w; state.field = "word"; state.mode = "exact"; state.focus = ""; $("#sq", root).value = state.q; run(); scrollTo({top:0}); }
  else if(op){ openConcept(op.dataset.open, op.dataset.ods); }
  else if(go){ state.q = go.dataset.go; state.field = "word"; state.mode = "exact"; $("#sq", root).value = state.q; run(); }
  else if(t.id === "sMore" || t.closest("#sMore")) run(true);
  else if(fo){ if(state.focus === fo.dataset.focus){ closeSheet(); unfocus(); } else focusSense(fo.dataset.focus, true); }
}

// ───────── görünüm arayüzü
export const view = {
  apply(p){
    if(p.ds) state.ds = p.ds;
    if(p.reset){ state.sense = ""; state.example = false; state.lex = ""; state.pos.clear(); state.focus = ""; S.random = false; S.facets = {}; S.lexf = {}; }
    for(const k of ["q", "field", "mode"]) if(p[k] !== undefined) state[k] = p[k];
    if(p.map) S.mapAfter = true;
  },
  async enter(){ mount(); syncControls(); await run(); },
  async dsChange(){ state.sense = ""; state.example = false; state.lex = ""; state.pos.clear(); state.focus = ""; S.facets = {}; S.lexf = {}; closeSheet(); await run(); },
  escape(){ if(state.focus){ closeSheet(); unfocus(); return true; } return false; },
  onSheetClose(){ if(state.focus){ state.focus = ""; markFocus(""); } },
  onConcept(d){ if(state.v === "search" && state.focus !== d.self.id){ const has = S.results.some(x => x.id === d.self.id); if(has){ state.focus = d.self.id; markFocus(d.self.id); } } },
  key(e){
    if(!["j", "k", "Enter", "m", "f"].includes(e.key)) return;
    const rows = $$(".sense", root); if(!rows.length) return;
    const cur = rows.findIndex(r => r.dataset.id === state.focus);
    if(e.key === "j" || e.key === "k"){
      e.preventDefault();
      const next = e.key === "j" ? Math.min(rows.length - 1, cur + 1) : Math.max(0, cur < 0 ? 0 : cur - 1);
      focusSense(rows[next].dataset.id, true);
    }else if(e.key === "m" && cur >= 0){ setView("graph", {id:state.focus, ds:state.ds}); }
    else if(e.key === "f" && cur >= 0){ const s = S.results.find(x => x.id === state.focus); if(s){ const on = store.toggleFav(itemOf(state.ds, s)); toast(on ? "Çalışma listesine eklendi" : "Listeden çıkarıldı"); const b = $(`[data-fav="${CSS.escape(s.id)}"]`, root); b?.setAttribute("aria-pressed", on); } }
    else if(e.key === "Enter" && cur >= 0) openConcept(state.focus, state.ds);
  },
  resize(){}
};
registerView("search", view);
