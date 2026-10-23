// Çerçeveler: FrameNet (İngilizce 1.7 + Türkçe) arama, ayrıntı, anotasyonlu örnekler.
import {$, $$, esc, tr, icon, state, F, FN_POS, FRAME_REL, api, urlSync, registerView, debounce} from "./core.js";
import {fxHtml, relBtn, openConcept} from "./ui.js";

const S = {res:[], total:0, facets:{}, ctl:null};
let root = null;

function mount(){
  if(root) return;
  root = $("#v-frames");
  root.innerHTML = `<div class="page">
    <h1 class="page-title">Bir durumu kim, neyle yaşar?</h1>
    <div class="row"><div class="seg" id="fLang"><button data-v="en">English FrameNet 1.7</button><button data-v="tr">Türkçe FrameNet</button></div></div>
    <div class="row" style="margin-top:16px"><label class="field" style="flex:1;min-width:240px">${icon("search")}<input id="fq" type="text" autocomplete="off" spellcheck="false"></label><select class="sel" id="fMode"><option value="contains">içerir</option><option value="exact">Tam eşleşme</option><option value="prefix">ile başlar</option><option value="suffix">ile biter</option></select></div>
    <div class="tabs-u" id="fField"></div>
    <div class="filters hidden" id="fPosRow"><div class="fbar"><span class="lbl" style="width:84px">Sözcük türü</span><div class="chips" id="fPos"></div></div></div>
    <div id="fOut"></div></div>`;
  $("#fLang", root).addEventListener("click", e => { const b = e.target.closest("button"); if(!b || b.dataset.v === F.lang) return; Object.assign(F, {lang:b.dataset.v, field:"name", lupos:""}); S.facets = {}; run(); });
  $("#fField", root).addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; Object.assign(F, {field:b.dataset.v, lupos:""}); S.facets = {}; run(); });
  const go = debounce(() => run(), 160);
  $("#fq", root).addEventListener("input", e => { F.q = e.target.value; go(); });
  $("#fMode", root).addEventListener("change", e => { F.mode = e.target.value; run(); });
  $("#fPos", root).addEventListener("click", e => { const c = e.target.closest("[data-lupos]"); if(!c) return; F.lupos = F.lupos === c.dataset.lupos ? "" : c.dataset.lupos; run(); });
  $("#fOut", root).addEventListener("click", onClick);
}
function ui(){
  $$("#fLang button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === F.lang));
  const fields = F.lang === "en" ? [["name", "Çerçeve adı"], ["lu", "Sözcük (LU)"], ["fe", "Eleman (FE)"], ["def", "Tanım"]] : [["name", "Çerçeve adı"], ["verb", "Fiil"], ["fe", "Eleman (FE)"]];
  if(!fields.some(x => x[0] === F.field)) F.field = "name";
  $("#fField", root).innerHTML = fields.map(([v, l]) => `<button data-v="${v}" aria-pressed="${F.field === v}">${l}</button>`).join("");
  $("#fq", root).value = F.q; $("#fMode", root).value = F.mode; $("#fMode", root).classList.toggle("hidden", F.field === "def");
  $("#fPosRow", root).classList.toggle("hidden", !(F.lang === "en" && F.field === "lu"));
  $("#fPos", root).innerHTML = Object.entries(S.facets).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<button class="chip" data-lupos="${k}" aria-pressed="${F.lupos === k}">${esc(FN_POS[k] || k)}<small>${n}</small></button>`).join("");
  $("#fq", root).placeholder = F.field === "lu" ? "Sözcük ara · örn. agree, agree.v" : F.field === "verb" ? "Türkçe fiil ara · örn. açmak" : "Çerçeve, sözcük ya da eleman ara…";
}
export async function run(more = false){
  mount(); ui(); urlSync(false);
  const out = $("#fOut", root);
  if(!F.q && !F.lupos){
    S.res = []; S.total = 0;
    const ex = F.lang === "en" ? [["Make_agreement_on_action", "name"], ["agree.v", "lu"], ["Commerce_buy", "name"], ["Motion", "name"], ["Obligation", "fe"], ["Cooking_creation", "name"]] : [["Motion", "name"], ["açmak", "verb"], ["Commerce_buy", "name"], ["Time", "fe"]];
    out.innerHTML = `<div class="guide-home"><h2>Örnek aramalar</h2><div class="big-chips" style="margin-top:12px">${ex.map(([w, f]) => `<button data-act="fn" data-lang="${F.lang}" data-field="${f}" data-q="${w}" data-mode="${f === "name" ? "exact" : "contains"}">${w}</button>`).join("")}</div>
      <p class="lesson-intro" style="margin-top:20px">${F.lang === "en" ? "Çerçeve bir durum ya da olay şemasıdır; çerçeve elemanları (FE) katılımcı rollerdir (Core = zorunlu), sözcük birimleri (LU) çerçeveyi çağrıştıran sözcüklerdir (agree.v). Bir sözcükten çerçevelere gidebilirsin." : "Türkçe FrameNet: 809 çerçeve; sözcük birimleri KeNet synset'leri. Tanım ve elemanlar İngilizce FrameNet ile eşleşir."}</p></div>`;
    return;
  }
  if(S.ctl) S.ctl.abort(); S.ctl = new AbortController();
  try{
    const j = await api("/api/fn", {lang:F.lang, q:F.q, field:F.field, mode:F.mode, lupos:F.lupos, fold:1, offset:more ? S.res.length : 0, limit:30}, S.ctl.signal);
    S.res = more ? S.res.concat(j.results) : j.results; S.total = j.total; S.facets = j.facets; ui(); render();
    if(F.open){ const k = S.res.findIndex(f => f.name === F.open); F.open = ""; if(k >= 0) openFrame(k); }
  }catch(e){ if(e.name !== "AbortError") out.innerHTML = '<div class="empty">Sunucuya ulaşılamadı.</div>'; }
}
function card(f, i){
  const trk = F.lang === "tr";
  const badge = trk ? (f.en ? '<span class="tag">EN eşleşmesi var</span>' : "") : (f.tr ? `<span class="tag">TR · ${f.ntr} LU</span>` : "");
  const meta = trk ? `${f.nfe} eleman · ${f.nlu} sözcük birimi` : `${f.nfe} eleman · ${f.nlu} sözcük birimi${f.npb ? ` · ${f.npb} PropBank` : ""}`;
  const core = trk ? f.fes.map(x => `<span class="feper">${esc(x)}</span>`).join(" ") : f.core.map(x => `<span class="fecore">${esc(x)}</span>`).join(" ");
  const m = f.m && f.m.length ? `<div style="margin-top:8px">${f.m.map(x => `<span class="lu m">${esc(x)}</span>`).join("")}</div>` : "";
  return `<article class="card-e" id="fr${i}" data-fi="${i}" data-name="${esc(f.name)}"><h3><button class="toggler" data-open="${i}" style="font:800 1.5rem var(--font-ui);letter-spacing:-.025em;color:var(--ink)">${esc(f.name)}</button>${badge}<small>${meta}</small></h3>
    ${f.d ? `<p class="def">${esc(f.d)}</p>` : ""}<div class="chips" style="margin-top:8px">${core}</div>${m}
    <div style="margin-top:10px"><button class="toggler" data-open="${i}" aria-expanded="false">Ayrıntı</button></div><div class="detail hidden" id="fd${i}"></div></article>`;
}
function render(){
  const rest = S.total - S.res.length;
  $("#fOut", root).innerHTML = `<div class="entry" style="margin-top:18px"><div class="entry-head" style="border-bottom-width:1px"><span class="lbl">${tr(S.total)} çerçeve</span></div></div>` + (S.res.length ? S.res.map(card).join("") : '<div class="empty">Sonuç bulunamadı.</div>') +
    (rest > 0 ? `<div class="more-row"><button class="btn" id="fMore">Daha fazla göster · ${tr(rest)} kaldı</button></div>` : "");
}
function luxHtml(lu, exs, fes){
  return `<h4 class="lbl" style="margin:14px 0 6px">${esc(lu)} · anotasyonlu örnekler <button class="toggler" data-act="fn" data-lang="en" data-field="lu" data-q="${esc(lu)}" data-mode="contains" style="margin-left:6px">bu sözcüğün çerçeveleri${icon("ext")}</button></h4>` +
    exs.map(e => `<div class="fx">${fxHtml(e.t, [{k:"t", s:e.tg[0], e:e.tg[1], n:""}, ...e.fe.map(f => ({k:"fex", s:f.s, e:f.e, n:f.n}))], fes)}</div>`).join("");
}
async function openFrame(i){
  const card = $("#fr" + i, root), box = $("#fd" + i, root), name = card.dataset.name, tg = card.querySelector("[aria-expanded]");
  if(!box.classList.contains("hidden")){ box.classList.add("hidden"); tg.setAttribute("aria-expanded", false); return; }
  tg.setAttribute("aria-expanded", true); box.classList.remove("hidden");
  if(box.dataset.loaded) return;
  box.innerHTML = '<div class="skeleton" style="height:80px"></div>';
  const d = await api("/api/frame", {name});
  let h = "";
  if(d.en){
    const en = d.en;
    h += `<p class="def">${esc(en.d)}</p>` + en.ex.map(e => `<div class="fx">${fxHtml(e.t, e.sp, en.fes)}</div>`).join("");
    h += `<h4 class="lbl" style="margin:18px 0 4px">Çerçeve elemanları</h4><table class="argtbl"><tr><th>Eleman</th><th>Tür</th><th>Tanım</th></tr>` +
      en.fes.map((f, k) => `<tr><td><span class="rl-a u${k % 5}">${esc(f.n)}</span>${f.ab && f.ab !== f.n ? `<br><span class="vt">${esc(f.ab)}</span>` : ""}</td><td><span class="${f.c === "Core" ? "fecore" : "feper"}">${esc(f.c.replace("Extra-Thematic", "Extra-Th."))}</span>${f.st ? `<br><span class="vt">${esc(f.st)}</span>` : ""}</td><td>${esc(f.d.slice(0, 260))}${f.d.length > 260 ? "…" : ""}</td></tr>`).join("") + "</table>";
    h += `<h4 class="lbl" style="margin:18px 0 6px">Sözcük birimleri (LU)</h4>` + Object.entries(en.lus).map(([p, l]) => `<div style="margin:4px 0"><span class="muted" style="font:italic .9rem var(--font-text);margin-right:6px">${esc(FN_POS[p] || p)}</span>${l.map(x => d.lux && d.lux[x] ? `<button class="lu m" data-lux="${esc(x)}" title="anotasyonlu örnekleri göster">${esc(x)}</button>` : `<button class="lu" data-act="fn" data-field="lu" data-q="${esc(x)}" data-mode="contains" data-lang="en">${esc(x)}</button>`).join("")}</div>`).join("") + '<div class="luxbox"></div>';
    const grp = {}; en.rels.forEach(r => (grp[`${r.t}:${r.as}`] = grp[`${r.t}:${r.as}`] || []).push(r.o));
    const rg = Object.entries(grp);
    if(rg.length) h += `<h4 class="lbl" style="margin:18px 0 6px">Çerçeve ilişkileri</h4>` + rg.map(([k, os]) => `<div class="relgrp"><div><h4>${esc(FRAME_REL[k] || k.replace(":", " · "))}<em>${os.length}</em></h4></div><div class="chips">${os.map(o => `<button class="frm" data-act="fn" data-name="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`).join("");
  }
  if(d.tr){
    h += `<h4 class="lbl" style="margin:18px 0 6px">Türkçe FrameNet · ${d.tr.nlu} sözcük birimi</h4><div class="chips">${d.tr.fes.map(x => `<span class="feper">${esc(x)}</span>`).join(" ")}</div>
      <div class="chips" style="margin-top:8px">${d.tr.lus.map(b => relBtn(b, "kenet")).join("")}${d.tr.nlu > d.tr.lus.length ? `<span class="muted">+${d.tr.nlu - d.tr.lus.length}</span>` : ""}</div>`;
  }
  if(d.pb.length) h += `<h4 class="lbl" style="margin:18px 0 6px">Bu çerçeveye bağlı PropBank roleset'leri</h4><div class="chips">${d.pb.map(r => `<button class="frm" data-act="pb" data-lang="en" data-field="id" data-q="${esc(r.id)}" title="${esc(r.name)}">${esc(r.id)}</button>`).join("")}</div>`;
  box.innerHTML = h || '<span class="muted">Ayrıntı yok.</span>'; box.dataset.loaded = "1";
  box._lux = d.lux || {}; box._fes = d.en ? d.en.fes : [];
}
function onClick(e){
  const o = e.target.closest("[data-open]"), lx = e.target.closest("[data-lux]"), op = e.target.closest("[data-oc]");
  if(lx){ const box = lx.closest(".detail"); box.querySelector(".luxbox").innerHTML = luxHtml(lx.dataset.lux, box._lux[lx.dataset.lux], box._fes); }
  else if(e.target.closest(".rel")){ const r = e.target.closest(".rel"); openConcept(r.dataset.open, r.dataset.ods); }
  else if(o) openFrame(+o.dataset.open);
  else if(e.target.id === "fMore") run(true);
}

export const view = {
  apply(p){
    if(p.lang) F.lang = p.lang;
    for(const k of ["field", "mode"]) if(p[k] !== undefined) F[k] = p[k];
    if(p.q !== undefined){ F.q = p.q; F.lupos = ""; S.facets = {}; }
    if(p.open !== undefined) F.open = p.open;
  },
  async enter(){ mount(); ui(); await run(); }
};
registerView("frames", view);
