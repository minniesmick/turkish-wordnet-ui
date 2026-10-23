// Kabuk: gezinti rayı, üst çubuk, kenar kâğıdı (bağlam), komut paleti, kısayollar + ortak çizim yardımcıları.
import {$, $$, esc, tr, lower, hl, sub, w1, other, debounce, POS, DSNAME, REL, REL_ORDER, relLabel, REL_FAMILY, FAMILY, FUNC, CASEL, icon,
  VIEWS, STUDENT_VIEWS, MODE, setMode, VIEW_LABEL, VIEW_ICON, VIEW_KEY, DS_VIEWS, state, G, store, itemOf, on, api, toast, copyText, views, setView, urlSync, act, setShellSync, buildURL} from "./core.js";

// ───────────────────────── ortak çizim yardımcıları
export const relBtn = (b, ds, extra = "") => `<button class="rel" data-open="${esc(b.id)}" data-ods="${ds}" title="${esc(b.d || "")}">${b.lits.map(l => esc(l.w) + sub(l.s)).join(", ")}${b.more ? ` <sub>+${b.more}</sub>` : ""}</button>${extra}`;
export const argCls = n => /^ARGM/i.test(n) ? "um" : /^ARG(\d)/i.test(n) ? "u" + Math.min(4, +RegExp.$1) : "um";
export const roleName = x => /^\d$/.test(x.n) ? "ARG" + x.n : "ARGM";

export function argsTable(args, trk, assign, toks){
  const inv = assign || {};
  return `<table class="argtbl"><tr><th>Rol</th><th>İşlev</th><th>Açıklama</th>${trk ? "<th>Durum eki</th>" : ""}${assign ? "<th>Cümlede</th>" : ""}</tr>` + args.map(a => {
    const lab = trk ? a.n : roleName(a);
    return `<tr><td><span class="rl-a ${argCls(lab)}">${esc(lab)}</span></td><td><span class="tag">${esc(a.f)}</span> <span class="vt">${esc(FUNC[a.f] || "")}</span></td>
      <td>${esc(a.d)}${a.vt && a.vt.length ? `<br><span class="vt">VerbNet: ${esc(a.vt.join(", "))}</span>` : ""}</td>
      ${trk ? `<td>${(a.c || []).map(c => `<span class="tag">${esc(CASEL[c] || c)}</span>`).join(" ") || '<span class="vt">—</span>'}</td>` : ""}
      ${assign ? `<td>${lab in inv ? `<b>${esc(toks[inv[lab]].w)}</b>` : '<span class="vt">—</span>'}</td>` : ""}</tr>`;
  }).join("") + "</table>";
}
export function paintTokens(toks, rel, spans){
  const relSet = new Set(rel || []), start = {};
  (spans || []).slice().sort((a, b) => a.s - b.s).forEach(sp => { if(!(sp.s in start)) start[sp.s] = sp; });
  const tk = i => relSet.has(i) ? `<span class="rl-p">${esc(toks[i])}</span>` : esc(toks[i]);
  let out = "", i = 0;
  while(i < toks.length){
    const sp = start[i];
    if(sp){
      const e = Math.min(sp.e, toks.length - 1);
      out += `<span class="rl-a ${sp.cls || argCls(sp.t)}" title="${esc(sp.title || sp.t)}">${Array.from({length: e - i + 1}, (_, k) => tk(i + k)).join(" ")}<sub>${esc(sp.label ?? sp.t)}</sub></span> `;
      i = e + 1;
    }else{ out += tk(i) + " "; i++; }
  }
  return out;
}
export function fxHtml(t, sps, fes){
  const cuts = [...new Set([0, t.length, ...sps.flatMap(s => [s.s, s.e])])].sort((a, b) => a - b);
  let out = "";
  for(let k = 0; k < cuts.length - 1; k++){
    const a = cuts[k], b = cuts[k + 1]; if(a === b) continue;
    const cov = sps.filter(s => s.s <= a && s.e >= b), seg = esc(t.slice(a, b));
    const isT = cov.some(s => s.k === "t"), fx = cov.find(s => s.k === "fex");
    if(fx){
      const idx = fes.findIndex(f => f.ab === fx.n || f.n === fx.n);
      out += `<span class="f u${idx < 0 ? 4 : idx % 5} ${isT ? "t" : ""}" title="${esc(fx.n)}">${seg}${sps.some(s => s.k === "fex" && s.s === a && s.n === fx.n) ? `<sub>${esc(fx.n)}</sub>` : ""}</span>`;
    }else out += isT ? `<span class="t">${seg}</span>` : seg;
  }
  return out;
}
export const famLine = type => `<span class="ln ${FAMILY[REL_FAMILY[type] || "deriv"].cls}"></span>`;

// ───────────────────────── tema ve sunum
export function setTheme(t){
  const r = document.documentElement;
  if(t) r.dataset.theme = t; else delete r.dataset.theme;
  store.setPref("theme", t || null);
  syncShell();
}
const isDark = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")) === "dark";
export const toggleTheme = () => setTheme(isDark() ? "light" : "dark");
export function togglePresent(force){
  const on = force ?? !document.body.classList.contains("present");
  document.body.classList.toggle("present", on);
  $("#presentBtn").setAttribute("aria-pressed", on);
  $(".present-hint")?.remove();
  if(on) document.body.insertAdjacentHTML("beforeend", '<div class="present-hint">Sunum modu · çıkmak için P veya Esc</div>');
  views[state.v]?.resize?.();
}

// ───────────────────────── kabuk
export function mountShell(){
  $("#tabs").innerHTML = VIEWS.map(v => `<button class="tab${STUDENT_VIEWS.has(v) ? " stu" : ""}" data-view="${v}">${icon(VIEW_ICON[v])}<span>${VIEW_LABEL[v]}</span><span class="kb">g ${VIEW_KEY[v]}</span></button>`).join("");
  $("#menuBtn").innerHTML = icon("menu");
  $("#omni").insertAdjacentHTML("afterbegin", icon("search"));
  $("#linkBtn").innerHTML = icon("link");
  $("#presentBtn").innerHTML = icon("present");
  $("#palIcon").innerHTML = icon("search");
  $("#keysClose").innerHTML = icon("x");
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if(b){ $("#app").classList.remove("rail-open"); setView(b.dataset.view); } });
  $("#dsSeg").addEventListener("click", e => {
    const b = e.target.closest("[data-ds]"); if(!b || b.dataset.ds === state.ds) return;
    state.ds = b.dataset.ds; syncShell();
    (views[state.v].dsChange || views[state.v].enter)?.call(views[state.v]); urlSync(true);
  });
  $("#modeSeg").addEventListener("click", e => {
    const b = e.target.closest("[data-mode]"); if(!b) return;
    const st = b.dataset.mode === "student"; if(st === MODE.student) return;
    setMode(st);
    if(!st && STUDENT_VIEWS.has(state.v)) setView("search"); else { syncShell(); views[state.v]?.enter?.(); }
  });
  $("#menuBtn").addEventListener("click", () => $("#app").classList.toggle("rail-open"));
  $("#omni").addEventListener("click", openPalette);
  $("#themeBtn").addEventListener("click", toggleTheme);
  $("#railTheme").addEventListener("click", toggleTheme);
  $("#railKeys").addEventListener("click", openShortcuts);
  $("#presentBtn").addEventListener("click", () => togglePresent());
  $("#linkBtn").addEventListener("click", () => copyText(location.origin + buildURL(), "Bağlantı kopyalandı"));
  $("#favBtn").addEventListener("click", openFavs);
  $("#trail").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if(b) openConcept(b.dataset.open, b.dataset.ods); });
  $("#keysClose").addEventListener("click", () => $("#shortcuts").close());
  $("#shortcuts").addEventListener("click", e => { if(e.target.id === "shortcuts") e.target.close(); });
  $("#palette").addEventListener("click", e => { if(e.target.id === "palette") closePalette(); });
  on("store", syncShell);
  on("viewchange", () => { if(state.c || sheet.mode){ state.c = ""; state.cds = ""; sheet.mode = null; sheet.cur = null; } });
  setShellSync(syncShell);
  fetch("/api/stats").then(r => r.ok ? r.json() : null).then(j => { if(j) $("#railStats").textContent = `${tr(j.kenet.synsets + j.en.synsets)} synset`; }).catch(() => {});
}
export function syncShell(){
  $$("#tabs .tab").forEach(b => { if(b.dataset.view === state.v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  for(const v of VIEWS) $("#v-" + v).classList.toggle("hidden", v !== state.v);
  const dsOn = DS_VIEWS.includes(state.v);
  $("#dsSeg").classList.toggle("hidden", !dsOn);
  $("#ds1998").classList.toggle("hidden", state.v !== "search");
  $$("#dsSeg [data-ds]").forEach(b => b.setAttribute("aria-pressed", b.dataset.ds === state.ds));
  $$("#modeSeg [data-mode]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.mode === "student") === MODE.student));
  const dark = isDark();
  $("#themeBtn").innerHTML = icon(dark ? "sun" : "moon");
  $("#railTheme").innerHTML = icon(dark ? "sun" : "moon");
  const h = store.hist().slice(0, 9);
  $("#trail").innerHTML = h.length ? h.map(x => `<li><button data-open="${esc(x.id)}" data-ods="${x.ds}" title="${esc(x.def)}"><span>${esc(x.w)}</span><em>${esc((POS[x.pos] || x.pos || "").toLocaleLowerCase("tr"))}</em></button></li>`).join("") : '<li class="empty" style="padding:0;text-align:left">Henüz bir kavrama bakmadın.</li>';
  $("#favLbl").innerHTML = `${icon("star")}<span>Çalışma listem</span><span class="iconbtn n" style="height:auto;min-width:0;padding:0">${store.favs().length || ""}</span>`;
  $("#app").dataset.view = state.v;
  $("#app").classList.toggle("sheet-open", !!sheet.mode);
  $("#sheet").setAttribute("aria-hidden", !sheet.mode);
}

// ───────────────────────── kenar kâğıdı
const sheet = {mode:null, stack:[], cur:null};
const sheetEl = () => $("#sheet");
export function closeSheet(){
  state.c = ""; state.cds = ""; sheet.mode = null; sheet.cur = null;
  $("#app").classList.remove("sheet-open"); sheetEl().setAttribute("aria-hidden", "true");
  urlSync(false); views[state.v]?.onSheetClose?.(); views[state.v]?.resize?.();
}
export const sheetOpenId = () => state.c;
export const currentConcept = () => sheet.cur;

const topBtns = (extra = "") => `<div class="sheet-top"><button class="iconbtn" data-sh="close" aria-label="Kâğıdı kapat" title="Kapat (Esc)">${icon("x")}</button><span class="spacer"></span>${extra}</div>`;

export async function openConcept(id, ds, {fromGraph = false} = {}){
  if(!id) return;
  sheet.mode = "concept"; state.c = id; state.cds = ds || state.ds;
  $("#app").classList.add("sheet-open"); sheetEl().setAttribute("aria-hidden", "false");
  const first = !sheet.cur || sheet.cur.self?.id !== id;
  if(first) sheetEl().innerHTML = `<div class="sheet-head">${topBtns()}<div class="skeleton" style="height:34px;width:60%"></div></div><div class="sheet-body"><div class="skeleton" style="height:18px;margin:18px 0 10px"></div><div class="skeleton" style="height:18px;width:80%"></div><div class="skeleton" style="height:90px;margin-top:22px"></div></div>`;
  let d;
  try{ d = await api("/api/synset", {ds:state.cds, id}); }catch(_){ return; }
  if(state.c !== id) return;           // yarış: kullanıcı başka kavrama geçmiş
  if(d.error){ sheetEl().innerHTML = `<div class="sheet-head">${topBtns()}</div><div class="sheet-body"><div class="empty">Bu kavram bulunamadı.</div></div>`; return; }
  const top = sheet.stack[sheet.stack.length - 1];
  if(!top || top.id !== id){
    const cut = sheet.stack.findIndex(x => x.id === id);
    if(cut >= 0) sheet.stack = sheet.stack.slice(0, cut); else if(sheet.stack.length >= 6) sheet.stack.shift();
    sheet.stack.push({id, ds:state.cds, w:w1(d.self)});
  }
  sheet.cur = d;
  store.addHist(itemOf(state.cds, d.self));
  renderConcept(d);
  urlSync(false); views[state.v]?.resize?.();
  views[state.v]?.onConcept?.(d);
}

function renderConcept(d){
  const s = d.self, ds = d.ds, fav = store.isFav(s.id), head = s.lits[0];
  const spines = sheet.stack.slice(0, -1).map((x, i) => `<button data-pop="${i}" title="${esc(x.w)}">${esc(x.w)}</button>`).join("");
  const rels = (d.rels || []).slice().sort((a, b) => REL_ORDER.indexOf(a.type) - REL_ORDER.indexOf(b.type));
  const cur = esc(head.w);
  const paths = (d.paths || []).map((pth, k) => `<div class="pathline">${d.paths.length > 1 ? `<span class="lbl" style="margin-right:6px">yol ${k + 1}</span>` : ""}${pth.map(p => `<button data-open="${esc(p.id)}" data-ods="${ds}" title="${esc(p.d)}">${esc(p.lits.map(l => l.w).join(" / "))}</button><i>›</i>`).join("")}<span class="cur">${cur}</span></div>`).join("");
  const kids = rels.find(r => r.type === "HYPONYM");
  const body = [];
  body.push(`<div class="ss"><h3>Tanım</h3><p class="def">${esc(s.def)}</p>${s.ex.map(e => `<p class="ex">${esc(e.t)}</p>`).join("")}${s.vf && s.vf.length ? `<div class="up">kalıp: ${s.vf.map(esc).join(" · ")}</div>` : ""}${s.lits.length > 1 ? `<div class="syn" style="margin-top:10px">${s.lits.map(l => `<button data-act="search" data-ds="${ds}" data-q="${esc(l.w)}">${esc(l.w)}${sub(l.s)}</button>`).join("<i>·</i>")}</div>` : ""}</div>`);
  body.push(miniMap(d));
  if(paths) body.push(`<div class="ss"><h3>Hiyerarşi <em>${(d.paths || []).length} yol</em></h3>${paths}${kids ? `<div class="up">${tr(kids.n)} alt kavram · <button class="toggler" data-act="graph" data-id="${esc(s.id)}" data-ds="${ds}">haritada gör</button></div>` : ""}</div>`);
  if(rels.length) body.push(`<div class="ss"><h3>İlişkiler <em>${tr(rels.reduce((a, r) => a + r.n, 0))}</em></h3>${rels.map(g => `<div class="relgrp"><div>${famLine(g.type)}<h4>${esc(relLabel(g.type, d.pos))}<em>${g.n}</em></h4></div><div class="chips">${g.items.map(b => relBtn(b, ds)).join("")}${g.n > g.items.length ? `<span class="muted" style="font-size:.8rem;align-self:center">+${g.n - g.items.length}</span>` : ""}</div></div>`).join("")}</div>`);
  if(d.cross && d.cross.length) body.push(`<div class="ss"><h3>${d.cross_ds === "en" ? "İngilizce karşılık" : "Türkçe karşılıklar"} <em>${d.cross.length}</em></h3>${d.cross.map(b => `<div style="padding:5px 0">${relBtn(b, d.cross_ds)}<p class="def" style="font-size:.95rem;margin:3px 0 0;color:var(--ink-2)">${esc(b.d)}</p></div>`).join("")}</div>`);
  if(d.srl){
    if(d.srl.args) body.push(`<div class="ss"><h3>Anlamsal roller <em>TRopBank</em></h3>${argsTable(d.srl.args, true)}<div style="margin-top:10px"><button class="toggler" data-act="pb" data-lang="tr" data-field="id" data-q="${esc(s.id)}">rol sözlüğünde aç</button></div></div>`);
    if(d.srl.frames.length) body.push(`<div class="ss"><h3>FrameNet çerçeveleri <em>${d.srl.frames.length}</em></h3><div class="chips">${d.srl.frames.map(n => `<button class="frm" data-act="fn" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div></div>`);
  }
  body.push(`<div class="ss"><h3>Notum</h3><textarea class="note-box" id="noteBox" placeholder="Bu kavram için kısa bir not… (tarayıcıda saklanır)">${esc(store.note(s.id))}</textarea></div>`);
  body.push(`<div class="ss"><h3>Kimlik</h3><div class="row"><button class="tag" data-copy="${esc(s.id)}" title="Kimliği kopyala">${esc(s.id)}</button>${s.wiki ? `<a href="${esc(s.wiki)}" target="_blank" rel="noopener" class="tag" style="color:var(--spot)">Vikipedi${icon("ext")}</a>` : ""}${s.lx ? `<span class="tag">${esc(s.lx)}</span>` : ""}</div></div>`);
  sheetEl().innerHTML = `<div class="sheet-head">
      ${topBtns(`<button class="iconbtn" data-sh="fav" aria-pressed="${fav}" aria-label="Çalışma listesine ekle" title="Favori (F)">${icon("star")}</button><button class="iconbtn" data-sh="link" aria-label="Bağlantıyı kopyala" title="Bağlantıyı kopyala">${icon("link")}</button>`)}
      ${spines ? `<div class="stack" aria-label="Önceki kavramlar">${spines}</div>` : ""}
      <div class="sheet-title"><h2>${esc(head.w)}${sub(head.s)}</h2><span class="pos-l">${esc((POS[s.pos] || s.pos).toLocaleLowerCase("tr"))}</span><span class="muted" style="font-size:.8rem">${esc(DSNAME[ds] || ds)}</span></div>
      <div class="row"><button class="btn pri sm" data-act="graph" data-id="${esc(s.id)}" data-ds="${ds}">${icon("graph")}Haritada aç</button><button class="btn sm" data-act="relate" data-ds="${ds}" data-a="${esc(head.w)}" data-b="">${icon("scale")}Karşılaştır</button><button class="btn sm ghost" data-act="search" data-ds="${ds}" data-q="${esc(head.w)}" aria-label="Sözcüğü ara" title="Sözcüğü ara">${icon("search")}<span class="hide-sm">Sözcüğü ara</span></button></div>
    </div><div class="sheet-body">${body.join("")}</div>`;
  const nb = $("#noteBox"); if(nb) nb.addEventListener("input", debounce(() => store.setNote(s.id, nb.value), 300));
}

// kenar kâğıdındaki küçük yakın çevre haritası: bir üst, üç alt, karşıt dildeki karşılık
function miniMap(d){
  const par = (d.paths || [])[0]?.slice(-1)[0];
  const kids = (d.rels || []).filter(r => r.type === "HYPONYM" || r.type === "INSTANCE_HYPONYM").flatMap(r => r.items).slice(0, 3);
  const x = (d.cross || [])[0];
  if(!par && !kids.length && !x) return "";
  const cut = (b, n = 15) => { const t = b.lits[0].w; return esc(t.length > n ? t.slice(0, n - 1) + "…" : t); };
  const box = (b, cx, cy, w, ds, cls = "") => `<g class="n ${cls}" data-open="${esc(b.id)}" data-ods="${ds}"><title>${esc(b.d || "")}</title><rect x="${cx - w / 2}" y="${cy - 15}" width="${w}" height="30" rx="5"/><text x="${cx}" y="${cy + 4}" text-anchor="middle">${cut(b)}</text></g>`;
  const s = d.self, W = 360, H = kids.length ? 172 : 118, kx = kids.length === 3 ? [62, 180, 298] : kids.length === 2 ? [110, 250] : [180];
  let svg = "";
  if(par) svg += `<path d="M180 37V73"/>`;
  kids.forEach((k, i) => { svg += `<path d="M180 103V128H${kx[i]}V139"/>`; });
  if(x) svg += `<path class="xl" d="M240 88H250"/>`;
  if(par) svg += box(par, 180, 22, 124, d.ds);
  svg += `<g class="n c"><rect x="120" y="73" width="120" height="30" rx="5"/><text x="180" y="92" text-anchor="middle">${cut(s, 14)}</text></g>`;
  kids.forEach((k, i) => { svg += box(k, kx[i], 154, 108, d.ds); });
  if(x) svg += box(x, 306, 88, 108, d.cross_ds, "x");
  return `<div class="ss"><h3>Yakın çevre <em>${par ? "1 üst" : ""}${kids.length ? ` · ${kids.length} alt` : ""}${x ? " · karşılık" : ""}</em></h3><svg class="mm" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kavramın yakın çevresi">${svg}</svg><div style="margin-top:6px"><button class="toggler" data-act="graph" data-id="${esc(s.id)}" data-ds="${d.ds}">haritada aç</button></div></div>`;
}

function openFavs(){
  sheet.mode = "favs"; state.c = "";
  $("#app").classList.add("sheet-open"); sheetEl().setAttribute("aria-hidden", "false");
  const f = store.favs(), notes = store.notes();
  sheetEl().innerHTML = `<div class="sheet-head">${topBtns(`<button class="btn sm" data-sh="export">${icon("copy")}Markdown olarak kopyala</button>`)}<div class="sheet-title"><h2>Çalışma listem</h2><span class="muted">${f.length} kavram</span></div></div>
    <div class="sheet-body">${f.length ? f.map(x => `<div class="ss"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><button class="rel" data-open="${esc(x.id)}" data-ods="${x.ds}" style="font-weight:700;font-size:1rem">${esc(x.w)}</button><span class="muted" style="font-size:.78rem">${esc(DSNAME[x.ds] || x.ds)}</span></div><p class="def" style="font-size:.98rem;margin:6px 0 0">${esc(x.def)}</p>${notes[x.id] ? `<p class="ex" style="margin-top:6px">${esc(notes[x.id])}</p>` : ""}<div class="row" style="margin-top:8px"><button class="btn sm" data-act="graph" data-id="${esc(x.id)}" data-ds="${x.ds}">${icon("graph")}Harita</button><button class="btn sm ghost" data-unfav="${esc(x.id)}">Çıkar</button></div></div>`).join("") : '<div class="empty">Henüz favori yok.<br><span style="font-size:.9rem">Bir kavramın kâğıdındaki yıldız düğmesiyle ekle.</span></div>'}</div>`;
  syncShell();
}
export { openFavs };

// genel amaçlı kenar kâğıdı (çerçeve vb.)
export function openSheetRaw({title, sub: sb = "", body = ""}){
  sheet.mode = "raw"; state.c = ""; sheet.cur = null;
  $("#app").classList.add("sheet-open"); sheetEl().setAttribute("aria-hidden", "false");
  sheetEl().innerHTML = `<div class="sheet-head">${topBtns()}<div class="sheet-title"><h2>${esc(title)}</h2><span class="muted" style="font-size:.85rem">${esc(sb)}</span></div></div><div class="sheet-body">${body}</div>`;
  views[state.v]?.resize?.();
}

export function initSheet(){
  sheetEl().addEventListener("click", e => {
    const t = e.target;
    const sh = t.closest("[data-sh]"), op = t.closest("[data-open]"), pop = t.closest("[data-pop]"), cp = t.closest("[data-copy]"), uf = t.closest("[data-unfav]");
    if(sh){
      if(sh.dataset.sh === "close") closeSheet();
      else if(sh.dataset.sh === "fav" && sheet.cur){ const on = store.toggleFav(itemOf(state.cds, sheet.cur.self)); sh.setAttribute("aria-pressed", on); toast(on ? "Çalışma listesine eklendi" : "Listeden çıkarıldı"); }
      else if(sh.dataset.sh === "link") copyText(location.origin + buildURL(), "Bağlantı kopyalandı");
      else if(sh.dataset.sh === "export") copyText(store.exportMd(), "Markdown kopyalandı");
    }else if(op) openConcept(op.dataset.open, op.dataset.ods);
    else if(pop){ const x = sheet.stack[+pop.dataset.pop]; if(x) openConcept(x.id, x.ds); }
    else if(cp) copyText(cp.dataset.copy, "Kimlik kopyalandı");
    else if(uf){ store.toggleFav({id:uf.dataset.unfav}); openFavs(); }
  });
}

// ───────────────────────── komut paleti
const pal = {items:[], sel:0, ctl:null};
export function openPalette(prefill = ""){
  const d = $("#palette"); if(!d.open) d.showModal();
  const inp = $("#palInput"); inp.value = prefill; inp.focus(); inp.select(); buildPalette("");
  if(prefill) buildPalette(prefill);
}
export const closePalette = () => $("#palette").close();
const cmds = () => [
  ...VIEWS.filter(v => MODE.student || !STUDENT_VIEWS.has(v)).map(v => ({k:"cmd", label:`${VIEW_LABEL[v]} bölümüne git`, key:"g " + VIEW_KEY[v], run:() => setView(v), icon:VIEW_ICON[v]})),
  {k:"cmd", label:"Rastgele bir kavram aç", run:async () => { const j = await api("/api/random", {ds:state.ds === "1998" ? "kenet" : state.ds, n:1}); if(j.results[0]) openConcept(j.results[0].id, state.ds === "1998" ? "kenet" : state.ds); }, icon:"dice"},
  {k:"cmd", label:"Çalışma listemi aç", key:"F", run:openFavs, icon:"star"},
  {k:"cmd", label:"Temayı değiştir", key:"T", run:toggleTheme, icon:isDark() ? "sun" : "moon"},
  {k:"cmd", label:"Sunum modunu aç / kapat", key:"P", run:() => togglePresent(), icon:"present"},
  {k:"cmd", label:"Klavye kısayollarını göster", key:"?", run:openShortcuts, icon:"cmd"}
];
function buildPalette(q){
  const list = $("#palList"); pal.items = [];
  const add = (grp, it) => pal.items.push({...it, grp});
  const qq = q.trim();
  if(!qq){
    store.hist().slice(0, 5).forEach(x => add("Son bakılanlar", {label:x.w, sub:(POS[x.pos] || x.pos || "").toLocaleLowerCase("tr"), lg:x.ds === "en" ? "EN" : "TR", run:() => openConcept(x.id, x.ds), icon:"clock"}));
    store.favs().slice(0, 4).forEach(x => add("Favoriler", {label:x.w, sub:x.def.slice(0, 46), lg:x.ds === "en" ? "EN" : "TR", run:() => openConcept(x.id, x.ds), icon:"star"}));
    cmds().forEach(c => add("Komutlar", c));
    return renderPalette();
  }
  const ql = lower(qq);
  cmds().filter(c => lower(c.label).includes(ql)).slice(0, 3).forEach(c => add("Komutlar", c));
  renderPalette();
  if(pal.ctl) pal.ctl.abort(); pal.ctl = new AbortController();
  api("/api/suggest", {q:qq}, pal.ctl.signal).then(j => {
    const keep = pal.items.filter(i => i.grp === "Komutlar");
    pal.items = [];
    j.words.forEach(w => pal.items.push({grp:"Sözcükler", label:w.w, sub:`${w.n} anlam · ${w.pos.map(p => (POS[p] || p).toLocaleLowerCase("tr")).join(", ")}`, lg:w.ds === "en" ? "EN" : "TR", run:() => setView("search", {ds:w.ds, q:w.w, field:"word", mode:"exact", reset:true}), icon:"search", alt:() => setView("search", {ds:w.ds, q:w.w, field:"word", mode:"exact", reset:true, map:true})}));
    j.frames.forEach(n => pal.items.push({grp:"FrameNet çerçeveleri", label:n, lg:"FN", run:() => act({act:"fn", name:n}), icon:"frame"}));
    j.rolesets.forEach(n => pal.items.push({grp:"PropBank rolesetleri", label:n, lg:"PB", run:() => act({act:"pb", lang:"en", field:"id", q:n}), icon:"tag"}));
    j.vn.forEach(n => pal.items.push({grp:"VerbNet sınıfları", label:n, lg:"VN", run:() => act({act:"vn", field:"class", q:n}), icon:"tag"}));
    pal.items.push(...keep);
    pal.items.push({grp:"Diğer aramalar", label:`“${qq}” — tanımlarda ara`, run:() => setView("search", {ds:state.ds === "1998" ? "kenet" : state.ds, q:qq, field:"def", mode:"contains", reset:true}), icon:"search"});
    pal.items.push({grp:"Diğer aramalar", label:`“${qq}” — örnek cümlelerde ara`, run:() => setView("search", {ds:state.ds === "1998" ? "kenet" : state.ds, q:qq, field:"example", mode:"contains", reset:true}), icon:"search"});
    pal.sel = 0; renderPalette();
  }).catch(() => {});
}
function renderPalette(){
  const list = $("#palList"); let last = "";
  list.innerHTML = pal.items.map((it, i) => `${it.grp !== last ? `<div class="pal-grp">${last = it.grp}</div>` : ""}<button class="pal-item" role="option" data-i="${i}" aria-selected="${i === pal.sel}">${it.lg ? `<span class="lg">${it.lg}</span>` : icon(it.icon || "search")}<span><b>${esc(it.label)}</b>${it.sub ? ` <span class="muted">${esc(it.sub)}</span>` : ""}</span>${it.key ? `<span class="k">${esc(it.key)}</span>` : ""}</button>`).join("") || '<div class="empty" style="padding:30px 0">Sonuç yok.</div>';
  list.querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});
}
function runPalette(alt){
  const it = pal.items[pal.sel]; if(!it) return;
  closePalette(); (alt && it.alt ? it.alt : it.run)();
}
export function initPalette(){
  const inp = $("#palInput");
  inp.addEventListener("input", debounce(() => buildPalette(inp.value), 90));
  inp.addEventListener("keydown", e => {
    if(e.key === "ArrowDown"){ e.preventDefault(); pal.sel = Math.min(pal.items.length - 1, pal.sel + 1); renderPalette(); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); pal.sel = Math.max(0, pal.sel - 1); renderPalette(); }
    else if(e.key === "Enter"){ e.preventDefault(); runPalette(e.altKey); }
  });
  $("#palList").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if(b){ pal.sel = +b.dataset.i; runPalette(false); } });
  $("#palList").addEventListener("mousemove", e => { const b = e.target.closest("[data-i]"); if(b && +b.dataset.i !== pal.sel){ pal.sel = +b.dataset.i; $$("#palList [data-i]").forEach(x => x.setAttribute("aria-selected", x === b)); } });
}

// ───────────────────────── kısayollar
const KEYS = [["⌘ K  /  /", "Komut paletini aç"], ["g  s h b w r f m c k o n d", "Bölümlere git (Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler, Morfoloji, Ayrıştırma, Bağımlılık, Korpus, N-gram, Ders)"], ["j  k", "Sonuçlar arasında aşağı / yukarı (odak)"], ["Enter", "Odaktaki anlamın kâğıdını aç"], ["m", "Odaktaki kavramı haritada aç"], ["f", "Odaktaki kavramı favorilere ekle / çıkar"], ["Esc", "Odağı ve kâğıdı kapat"], ["←  →", "Haritada komşu kavramlar arasında gez"], ["↵ / Çift tık", "Haritada seçili kavramı merkeze al"], ["Backspace", "Haritada bir önceki merkeze dön"], ["p", "Sunum modu"], ["t", "Açık / koyu tema"], ["?", "Bu pencere"]];
export function openShortcuts(){
  $("#kbGrid").innerHTML = KEYS.map(([k, d]) => `<span>${k.split("  ").map(x => `<span class="kbd">${esc(x)}</span>`).join(" ")}</span><span>${esc(d)}</span>`).join("");
  $("#shortcuts").showModal();
}
export function initKeys(){
  let g = false, gt;
  document.addEventListener("keydown", e => {
    const t = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); $("#palette").open ? closePalette() : openPalette(); return; }
    if($("#palette").open || $("#shortcuts").open) return;
    if(e.key === "Escape"){
      if(document.body.classList.contains("present")) return togglePresent(false);
      if(views[state.v]?.escape?.()) return;
      if(state.c || sheet.mode) closeSheet();
      return;
    }
    if(typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if(g){ g = false; clearTimeout(gt); const v = VIEWS.find(x => VIEW_KEY[x] === e.key && (MODE.student || !STUDENT_VIEWS.has(x))); if(v){ e.preventDefault(); setView(v); } return; }
    if(e.key === "g"){ g = true; gt = setTimeout(() => g = false, 900); return; }
    if(e.key === "/"){ e.preventDefault(); openPalette(); return; }
    if(e.key === "?"){ openShortcuts(); return; }
    if(e.key === "p"){ togglePresent(); return; }
    if(e.key === "t"){ toggleTheme(); return; }
    if(e.key === "F"){ openFavs(); return; }
    views[state.v]?.key?.(e);
  });
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-act]");
    if(a){ closeSheetQuiet(); act(a.dataset); }
    const cp = e.target.closest("[data-copy]"); if(cp && !cp.closest("#sheet")) copyText(cp.dataset.copy, "Kopyalandı");
  });
}
function closeSheetQuiet(){ if(state.c || sheet.mode){ state.c = ""; state.cds = ""; sheet.mode = null; sheet.cur = null; } }
export const sheetState = sheet;
