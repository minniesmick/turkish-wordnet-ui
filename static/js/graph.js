// Harita: bir kavramın hiyerarşisi ve bağları ilişkisel bir ağaç olarak. Tıklayınca odak + bağlantı bilgisi, çift tıkla merkeze al.
import {$, $$, esc, tr, lower, sub, w1, other, POS, DSNAME, REL, REL_FAMILY, FAMILY, relLabel, icon, state, G, api, urlSync, store, itemOf, toast, setView, registerView} from "./core.js";
import {openConcept, closeSheet, openSheetRaw, relBtn} from "./ui.js";

const NW = 176, NH = 66, CW = 268, CH = 112, GX = 18;
const LEFT = ["PART_HOLONYM","MEMBER_HOLONYM","SUBSTANCE_HOLONYM","DOMAIN_TOPIC","DOMAIN_REGION","DOMAIN_USAGE","ANTONYM","ALSO_SEE"];
const HIER = new Set(["HYPERNYM","HYPONYM","INSTANCE_HYPERNYM","INSTANCE_HYPONYM"]);
const gs = {data:null, parent:null, model:null, trail:[], pan:{x:0, y:0, k:1}, hoverId:"", fitted:false, panel:"", loading:false, moved:false};
let root = null, drag = null;

// ───────────────────────── model
const label = b => b.lits.slice(0, 2).map(l => l.w).join(" / ");
const nodeOf = (b, o) => ({id:b.id, ds:state.ds, w:label(b), s:b.lits[0].s, pos:b.pos, def:b.d || b.def || "", wd:NW, ht:NH, ...o});

function buildModel(d, parentD){
  const nodes = [], edges = []; let ec = 0;
  const N = n => (nodes.push(n), n);
  const E = e => (edges.push({id:"e" + ec++, ...e}), edges[edges.length - 1]);
  const s = d.self;
  const c = N({id:s.id, ds:d.ds, kind:"center", w:label(s), s:s.lits[0].s, pos:s.pos, def:s.def, x:0, y:0, wd:CW, ht:CH, chain:[s.id], edgeIds:[], hops:0});
  const link = (n, e, parent) => { n.edgeIds = [e.id, ...(parent.edgeIds || [])]; n.chain = [n.id, ...(parent.chain || [])]; };
  const paths = d.paths || [], prim = paths[0] || [];
  const STEP = NW + GX;

  // yukarı: birincil yol boyunca G.up seviye; ek ebeveynler birincil ebeveynle aynı satırda yan yana
  const ups = prim.slice(-G.up).reverse();
  let prev = c;
  ups.forEach((b, i) => {
    const n = N(nodeOf(b, {kind:"up", x:0, y:-(i + 1) * 150, hops:i + 1, rel:"HYPERNYM"}));
    const e = E({from:n.id, to:prev.id, fam:"hier", type:"v", label:i === 0 ? "üst kavram" : "", x1:n.x, y1:n.y + n.ht / 2, x2:prev.x, y2:prev.y - prev.ht / 2});
    link(n, e, prev); prev = n;
  });
  if(prim.length > ups.length){
    const n = N({id:"more-up", kind:"more", w:`+${prim.length - ups.length} üst düzey`, x:0, y:-(ups.length + 1) * 150, wd:150, ht:44, chain:[], edgeIds:[], act:"up"});
    E({from:n.id, to:prev.id, fam:"hier", type:"v", dotted:true, label:"", x1:0, y1:n.y + 22, x2:prev.x, y2:prev.y - prev.ht / 2});
  }
  const primLast = prim[prim.length - 1]?.id;
  const extraPar = [...new Map(paths.map(p => p[p.length - 1]).filter(b => b && b.id !== primLast).map(b => [b.id, b])).values()].slice(0, 4);
  extraPar.forEach((b, k) => {
    const side = k % 2 ? 1 : -1, x = side * (Math.floor(k / 2) + 1) * STEP;
    const n = N(nodeOf(b, {kind:"up", x, y:-150, hops:1, rel:"HYPERNYM"}));
    const e = E({from:n.id, to:c.id, fam:"hier", type:"v", label:"", x1:n.x, y1:n.y + n.ht / 2, x2:0, y2:-CH / 2});
    link(n, e, c);
  });
  const parHalf = extraPar.length ? Math.ceil(extraPar.length / 2) * STEP + NW / 2 : 0;

  // kardeşler: aynı üst kavramın diğer çocukları, merkez satırında
  let sibHalf = 0;
  if(G.sib && parentD && ups[0]){
    const g = (parentD.rels || []).find(r => r.type === "HYPONYM");
    const sibs = (g ? g.items : []).filter(b => b.id !== s.id).slice(0, 8);
    const par = nodes.find(q => q.id === ups[0].id);
    sibs.forEach((b, j) => {
      const side = j % 2 ? 1 : -1, x = side * (CW / 2 + 36 + NW / 2 + Math.floor(j / 2) * STEP);
      const n = N(nodeOf(b, {kind:"sib", x, y:0, hops:2, rel:"SIBLING"}));
      const e = E({from:par.id, to:n.id, fam:"hier", type:"v", label:j < 2 ? "kardeş" : "", lab:"end", x1:par.x, y1:par.y + par.ht / 2, x2:x, y2:-NH / 2});
      link(n, e, par);
    });
    sibHalf = sibs.length ? CW / 2 + 36 + NW + (Math.ceil(sibs.length / 2) - 1) * STEP : 0;
  }
  const bandHalf = Math.max(CW / 2, parHalf, sibHalf);

  // yanlara: diğer ilişki grupları + çeviri + çerçeveler (önce yükseklikleri hesapla: alt kavramlar bunun altına iner)
  const groups = [];
  if(d.cross && d.cross.length) groups.push({side:"L", type:"XL", fam:"xl", label:d.cross_ds === "en" ? "İngilizce karşılık" : "Türkçe karşılık", items:d.cross, n:d.cross.length, ds:d.cross_ds, kind:"xl"});
  (d.rels || []).filter(r => !HIER.has(r.type)).sort((a, b) => b.n - a.n).forEach(r => groups.push({side:LEFT.includes(r.type) ? "L" : "R", type:r.type, fam:REL_FAMILY[r.type] || "deriv", label:relLabel(r.type, d.pos), items:r.items, n:r.n, ds:d.ds, kind:"lat"}));
  if(d.srl && d.srl.frames.length) groups.push({side:"R", type:"FRAME", fam:"frame", label:"FrameNet çerçeveleri", items:d.srl.frames.map(n => ({id:"FN:" + n, name:n})), n:d.srl.frames.length, ds:d.ds, kind:"frame"});
  const CAP = 4, GGAP = 54;
  const side = {};
  for(const sd of ["L", "R"]){
    const gl = groups.filter(g => g.side === sd);
    const hs = gl.map(g => Math.min(CAP, g.items.length) * (NH + 12) + (g.n > CAP ? 40 : 0) - 12);
    side[sd] = {gl, hs, total:hs.reduce((a, b) => a + b, 0) + Math.max(0, gl.length - 1) * GGAP};
  }
  const latHalf = Math.max(side.L.total, side.R.total) / 2;

  // aşağı: alt kavramlar; satırlar arası yarım adım kaydırılır, böylece veriyollar düğümlerin arasından geçer
  const kidsAll = (d.rels || []).filter(r => r.type === "HYPONYM" || r.type === "INSTANCE_HYPONYM");
  const kidItems = kidsAll.flatMap(r => r.items), kidTotal = kidsAll.reduce((a, r) => a + r.n, 0);
  const shown = kidItems.slice(0, G.kids), PER = 5, Y0 = Math.max(190, latHalf + 78);
  const rows = []; for(let i = 0; i < shown.length; i += PER) rows.push(shown.slice(i, i + PER));
  rows.forEach((row, ri) => row.forEach((b, i) => {
    const x = (i - (row.length - 1) / 2) * STEP + (ri % 2 ? STEP / 2 : 0), y = Y0 + ri * 100;
    const n = N(nodeOf(b, {kind:"down", x, y, hops:1, rel:"HYPONYM"}));
    const e = E({from:c.id, to:n.id, fam:"hier", type:"v", label:ri === 0 && i === Math.floor(row.length / 2) ? (d.pos === "v" ? "alt kavram (troponym)" : "alt kavram") : "", x1:0, y1:CH / 2, x2:x, y2:y - NH / 2});
    link(n, e, c);
  }));
  if(kidTotal > shown.length){
    const ri = Math.max(0, rows.length - 1), last = rows[ri] || [], y = Y0 + ri * 100;
    const lx = last.length ? (last.length - 1) / 2 * STEP + (ri % 2 ? STEP / 2 : 0) : 0, x = lx + NW / 2 + 28 + 75;
    const n = N({id:"more-kids", kind:"more", w:`+${kidTotal - shown.length} alt kavram`, x, y, wd:150, ht:44, chain:[], edgeIds:[], act:"kids"});
    E({from:c.id, to:n.id, fam:"hier", type:"h", dotted:true, label:"", x1:lx + NW / 2, y1:y, x2:x - 75, y2:y});
  }

  for(const sd of ["L", "R"]){
    const {gl, hs, total} = side[sd]; if(!gl.length) continue;
    const sgn = sd === "L" ? -1 : 1;
    let y0 = -total / 2;
    gl.forEach((g, gi) => {
      const spineX = sgn * (bandHalf + 50 + gi * 8), nx = sgn * (bandHalf + 50 + 34 + NW / 2 + gi * 8);
      const startY = sibHalf ? (sd === "L" ? -1 : 1) * Math.min(52, 44 + gi * 3) : (gi - (gl.length - 1) / 2) * 9;
      const items = g.items.slice(0, CAP);
      const ys = items.map((_, i) => y0 + NH / 2 + i * (NH + 12));
      const trunk = E({from:c.id, to:"grp-" + sd + gi, fam:g.fam, type:"h", x1:sgn * CW / 2, y1:startY, x2:spineX, y2:startY});
      const spine = E({from:c.id, to:"grp-" + sd + gi, fam:g.fam, type:"vline", x1:spineX, y1:startY, x2:spineX, y2:g.n > CAP ? ys[ys.length - 1] + 40 : ys[ys.length - 1]});
      const ids = [trunk.id, spine.id];
      items.forEach((b, i) => {
        const frame = g.kind === "frame";
        const n = N(frame ? {id:b.id, kind:"frame", ds:d.ds, w:b.name, pos:"", def:"", x:nx, y:ys[i], wd:NW, ht:44, hops:1, rel:"FRAME", fname:b.name}
                           : nodeOf(b, {kind:g.kind === "xl" ? "xl" : "lat", ds:g.ds, x:nx, y:ys[i], hops:1, rel:g.type}));
        const e = E({from:c.id, to:n.id, fam:g.fam, type:"h", x1:spineX, y1:ys[i], x2:nx - sgn * n.wd / 2, y2:ys[i]});
        n.edgeIds = [e.id, ...ids]; n.chain = [n.id, c.id]; n.group = g.type; n.groupLabel = g.label;
      });
      if(g.n > CAP){
        const my = ys[ys.length - 1] + 40, n = N({id:"more-" + sd + gi, kind:"more", w:`+${g.n - CAP} ${g.label.toLocaleLowerCase("tr")}`, x:nx, y:my, wd:NW, ht:34, chain:[], edgeIds:[], act:"sheet"});
        E({from:c.id, to:n.id, fam:g.fam, type:"h", dotted:true, x1:spineX, y1:my, x2:nx - sgn * NW / 2, y2:my});
      }
      edges.push({id:"e" + ec++, fam:g.fam, type:"label", label:`${g.label} · ${g.n}`, x:nx, y:y0 - 15, ids, group:g.type});
      y0 += hs[gi] + GGAP;
    });
  }
  return {nodes, edges, byId:Object.fromEntries(nodes.map(n => [n.id, n])), groups};
}

// ───────────────────────── çizim
function mount(){
  if(root) return;
  root = $("#v-graph");
  root.innerHTML = `<div class="gwrap" id="gwrap">
    <div class="gbar"><div class="gcrumb" id="gCrumb"></div><span style="flex:1"></span>
      <div class="gtools">
        <div class="seg" id="gMode"><button data-m="map">Şema</button><button data-m="outline">Ağaç</button></div>
        <div class="seg" id="gZoom"><button data-z="out" aria-label="Uzaklaş">${icon("minus")}</button><button data-z="fit" aria-label="Sığdır">${icon("fit")}</button><button data-z="in" aria-label="Yaklaş">${icon("plus")}</button></div>
      </div></div>
    <div class="gview" id="gview"><div class="gcanvas" id="gcanvas"></div></div>
    <div class="gside" id="gside"></div>
    <div id="gstart" class="hidden"></div>
  </div><div class="outline hidden" id="goutline"></div>`;
  $("#gMode", root).addEventListener("click", e => { const b = e.target.closest("[data-m]"); if(!b) return; G.mode = b.dataset.m; paint(); urlSync(false); });
  $("#gZoom", root).addEventListener("click", e => { const b = e.target.closest("[data-z]"); if(!b) return; if(b.dataset.z === "fit") fit(true); else zoomBy(b.dataset.z === "in" ? 1.2 : 1 / 1.2); });
  $("#gCrumb", root).addEventListener("click", e => { const b = e.target.closest("[data-t]"); if(!b) return; const i = +b.dataset.t, t = gs.trail[i]; gs.trail = gs.trail.slice(0, i); center(t.id, t.ds, {trail:true}); });
  const gv = $("#gview", root);
  gv.addEventListener("pointerdown", e => { if(e.target.closest(".gn,.elab")) return; drag = {x:e.clientX, y:e.clientY, px:gs.pan.x, py:gs.pan.y, moved:false}; gv.setPointerCapture(e.pointerId); gv.classList.add("drag"); });
  gv.addEventListener("pointermove", e => { if(!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if(Math.abs(dx) + Math.abs(dy) > 3){ drag.moved = true; gs.moved = true; } gs.pan.x = drag.px + dx; gs.pan.y = drag.py + dy; applyPan(); });
  gv.addEventListener("pointerup", e => { if(!drag) return; const moved = drag.moved; drag = null; gv.classList.remove("drag"); if(!moved) clearSel(); });
  gv.addEventListener("wheel", e => {
    e.preventDefault();
    gs.moved = true;
    if(e.ctrlKey || e.metaKey){ const r = gv.getBoundingClientRect(); zoomBy(Math.exp(-e.deltaY * .01), e.clientX - r.left, e.clientY - r.top); }
    else{ gs.pan.x -= e.deltaX; gs.pan.y -= e.deltaY; applyPan(); }
  }, {passive:false});
  gv.addEventListener("dblclick", e => { if(!e.target.closest(".gn")) fit(true); });
  let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if(state.v === "graph") fit(true, false); }, 160); }).observe(gv);
  let so = document.querySelector("#app")?.classList.contains("sheet-open"), st;
  new MutationObserver(() => { const now = document.querySelector("#app").classList.contains("sheet-open"); if(now === so) return; so = now; clearTimeout(st); st = setTimeout(() => { if(state.v === "graph") fit(true, false); }, 260); }).observe(document.querySelector("#app"), {attributes:true, attributeFilter:["class"]});
  const cv = $("#gcanvas", root);
  cv.addEventListener("click", e => { const n = e.target.closest(".gn"); if(n) clickNode(n.dataset.id); });
  cv.addEventListener("dblclick", e => { const n = e.target.closest(".gn"); if(n){ e.stopPropagation(); recenterNode(n.dataset.id); } });
  cv.addEventListener("mouseover", e => { const n = e.target.closest(".gn"); if(n && !G.sel) highlight(n.dataset.id); });
  cv.addEventListener("mouseout", e => { const n = e.target.closest(".gn"); if(n && !G.sel) highlight(""); });
  $("#gside", root).addEventListener("click", e => {
    const l = e.target.closest("[data-fam]"); if(l){ G.fam[l.dataset.fam] = !G.fam[l.dataset.fam]; paint(); return; }
    const gp = e.target.closest("[data-gp]"); if(gp){ gs.panel = gs.panel === gp.dataset.gp ? "" : gp.dataset.gp; sidePanel(); return; }
    const t = e.target.closest("[data-gt]"); if(!t) return;
    if(t.dataset.gt === "sib"){ G.sib = !G.sib; load(); }
    else if(t.dataset.gt === "up+"){ G.up = Math.min(8, G.up + 1); paint(); }
    else if(t.dataset.gt === "up-"){ G.up = Math.max(1, G.up - 1); paint(); }
    urlSync(false);
  });
  $("#goutline", root).addEventListener("click", e => {
    const b = e.target.closest("[data-id]"), r = e.target.closest("[data-rc]");
    if(r){ const n = gs.model?.byId[r.dataset.rc]; center(r.dataset.rc, n ? n.ds : state.ds); }
    else if(b){ if(gs.model?.byId[b.dataset.id]) clickNode(b.dataset.id); else openConcept(b.dataset.id, b.dataset.ods || state.ds); }
  });
  $("#gstart", root).addEventListener("click", startClick);
  $("#gstart", root).addEventListener("input", startInput);
}

const view_ = () => $("#gview", root);
function applyPan(anim = false){
  const cv = $("#gcanvas", root);
  cv.classList.toggle("anim", anim);
  cv.style.transform = `translate(${gs.pan.x}px, ${gs.pan.y}px) scale(${gs.pan.k})`;
  cv.classList.toggle("lo", gs.pan.k < .95);   // küçük ölçekte ikincil metin düşer
}
function zoomBy(f, cx, cy){
  gs.moved = true;
  const r = view_().getBoundingClientRect(); cx ??= r.width / 2; cy ??= r.height / 2;
  const k = Math.min(2.2, Math.max(.25, gs.pan.k * f)), real = k / gs.pan.k;
  gs.pan.x = cx - (cx - gs.pan.x) * real; gs.pan.y = cy - (cy - gs.pan.y) * real; gs.pan.k = k; applyPan(true);
}
function fit(anim, force = true){
  if(!gs.model || (!force && gs.moved)) return;
  gs.moved = false;
  const r = view_().getBoundingClientRect(); if(!r.width) return;
  const ns = gs.model.nodes.filter(n => n.el !== false);
  const x0 = Math.min(...ns.map(n => n.x - n.wd / 2)), x1 = Math.max(...ns.map(n => n.x + n.wd / 2)), y0 = Math.min(...ns.map(n => n.y - n.ht / 2)), y1 = Math.max(...ns.map(n => n.y + n.ht / 2));
  const gbar = $("#gwrap .gbar", root), sh = document.querySelector("#sheet"), sheetOpen = document.querySelector("#app")?.classList.contains("sheet-open");
  const availW = innerWidth > 860 && sheetOpen ? Math.max(320, innerWidth - (sh?.offsetWidth || 432) - r.left) : r.width;   // kâğıdın solunda kalan görünür alan
  const padX = 60, padTop = (gbar ? gbar.offsetHeight : 44) + 40, padBot = 60, FLOOR = .75;
  const fitK = Math.min(1.15, (availW - padX * 2) / (x1 - x0), (r.height - padTop - padBot) / (y1 - y0));
  gs.pan.k = Math.max(FLOOR, fitK);
  const mx = fitK < FLOOR ? 0 : (x0 + x1) / 2;        // çok genişse okunur ölçekte merkezde dur, kalanını kaydırarak gez
  gs.pan.x = availW / 2 - mx * gs.pan.k;
  const overlay = innerWidth <= 860 && document.querySelector("#app")?.classList.contains("sheet-open") ? innerHeight * .5 : 0;   // dar ekranda kâğıt haritanın üstüne biner
  const avail = r.height - overlay;
  gs.pan.y = fitK < FLOOR ? padTop + (avail - padTop - padBot) / 2 : padTop + (avail - padTop - padBot) / 2 - (y0 + y1) / 2 * gs.pan.k;   // çok genişse merkez kavramı ortala
  applyPan(anim);
}

function edgePath(e){
  if(e.type === "v"){   // dikey dirsek bağlantısı
    const my = (e.y1 + e.y2) / 2;
    return `M${e.x1} ${e.y1}V${my}H${e.x2}V${e.y2}`;
  }
  if(e.type === "h"){ return `M${e.x1} ${e.y1}H${e.x2}${e.y2 !== e.y1 ? `V${e.y2}` : ""}`; }
  if(e.type === "vline") return `M${e.x1} ${e.y1}V${e.y2}`;
  return "";
}
const famClass = (e) => ({hier:"", part:"dash", deriv:"dot", anti:"", cause:"dd", xl:"spot", frame:"spot dash"})[e.fam] + (e.dotted ? " dot" : "");

function paint(){
  mount();
  const inMap = G.mode === "map";
  $("#gwrap", root).classList.toggle("hidden", !inMap); $("#goutline", root).classList.toggle("hidden", inMap);
  $$("#gMode [data-m]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.m === G.mode));
  if(!gs.data){ return; }
  gs.model = buildModel(gs.data, gs.parent);
  const m = gs.model;
  // aile görünürlüğü: gizli ailelerin kenar ve düğümlerini at
  const hidden = new Set(Object.keys(G.fam).filter(f => !G.fam[f]));
  const hideEdge = new Set(m.edges.filter(e => hidden.has(e.fam)).map(e => e.id));
  m.nodes.forEach(n => { n.el = !(n.edgeIds && n.edgeIds.length && n.edgeIds.some(id => hideEdge.has(id))); });
  m.nodes.filter(n => n.kind === "more").forEach(n => { n.el = true; });
  if(inMap){
    const cv = $("#gcanvas", root);
    const edges = m.edges.filter(e => !hideEdge.has(e.id));
    const svg = `<svg class="edges" viewBox="-4000 -3000 8000 6000" aria-hidden="true">${edges.filter(e => e.type !== "label").map(e => {
      const cls = famClass(e), d = edgePath(e);
      return `<path class="${cls}" data-e="${e.id}" d="${d}"/>${e.fam === "anti" ? `<path class="${cls} dbl2" data-e="${e.id}" d="${d}"/>` : ""}`;
    }).join("")}</svg>`;
    const labs = edges.filter(e => e.label).map(e => {
      const x = e.type === "label" ? e.x : e.lab ? e.x2 : (e.x1 + e.x2) / 2, y = e.type === "label" ? e.y : e.lab ? e.y2 - 22 : (e.y1 + e.y2) / 2;
      return `<span class="elab" data-e="${e.id}" ${e.ids ? `data-ids="${e.ids.join(",")}"` : ""} style="left:${x}px;top:${y}px">${esc(e.label)}</span>`;
    }).join("");
    const nodes = m.nodes.filter(n => n.el).map((n, i) => {
      const cls = `gn ${n.kind} ${G.sel === n.id ? "sel" : ""}`;
      if(n.kind === "more") return `<button class="${cls}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;--w:${n.wd}px"><span class="w" style="font-weight:600;font-size:.88rem">${esc(n.w)}</span></button>`;
      if(n.kind === "frame") return `<button class="${cls}" data-id="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px;--w:${n.wd}px;--d:${i * 14}ms"><span class="w">${esc(n.w)}</span></button>`;
      return `<button class="${cls}" data-id="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px;--w:${n.wd}px;--d:${i * 14}ms" title="${esc(n.def)}"><span class="w">${esc(n.w)}${sub(n.s)}</span><span class="p">${esc((POS[n.pos] || n.pos).toLocaleLowerCase("tr"))}${n.kind === "xl" ? `<span class="tag" style="color:var(--spot);border-color:var(--spot)">${n.ds === "en" ? "EN" : "TR"}</span>` : ""}</span>${n.kind === "center" ? `<span class="d">${esc(n.def)}</span>` : ""}</button>`;
    }).join("");
    cv.innerHTML = svg + labs + nodes;
    cv.classList.add("arrive");
    cv.dataset.edgeCount = edges.length;
    setTimeout(() => cv.classList.remove("arrive"), 700);
    applyPan(false);
    if(!gs.fitted){ gs.moved = false; fit(false); gs.fitted = true; }
    if(G.sel) highlight(G.sel, true); else highlight("");
    sidePanel();
  }else renderOutline();
  crumbs();
}

function sidePanel(){
  const m = gs.model; if(!m) return;
  const counts = {}; m.edges.filter(e => e.type !== "label" && e.type !== "vline").forEach(e => counts[e.fam] = (counts[e.fam] || 0) + 1);
  const rows = Object.entries(FAMILY).filter(([f]) => counts[f]).map(([f, v]) => {
    const dash = {"":"", dash:"7 5", dot:"1.5 5", dbl:"", dd:"10 4 2 4", spot:"", "spot dash":"7 5"}[v.cls] ?? "";
    const stroke = v.cls.includes("spot") ? "var(--spot)" : "var(--ink-2)";
    return `<button class="lgrow" data-fam="${f}" aria-pressed="${G.fam[f]}"><svg viewBox="0 0 34 8"><path d="M0 ${f === "anti" ? 2.5 : 4}H34" stroke="${stroke}" stroke-width="1.6" fill="none" ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linecap="${v.cls === "dot" ? "round" : "butt"}"/>${f === "anti" ? `<path d="M0 5.5H34" stroke="${stroke}" stroke-width="1.6" fill="none"/>` : ""}</svg><span>${v.label}</span><em>${counts[f]}</em></button>`;
  }).join("");
  const panel = gs.panel === "legend" ? `<div class="gpanel"><h3>Çizgi biçimleri · tıkla, gizle</h3>${rows}</div>`
    : gs.panel === "density" ? `<div class="gpanel"><h3>Yoğunluk</h3><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span>Üst düzey</span><span class="seg" style="padding:1px"><button data-gt="up-" aria-label="Azalt">${icon("minus")}</button><button disabled style="min-width:26px;color:var(--ink)">${G.up}</button><button data-gt="up+" aria-label="Artır">${icon("plus")}</button></span></div><label class="chk" style="margin-top:8px"><input type="checkbox" data-gt="sib" ${G.sib ? "checked" : ""}> Kardeş kavramları göster</label></div>` : "";
  $("#gside", root).innerHTML = `${panel}<div class="row" style="gap:6px"><button class="chip" data-gp="legend" aria-pressed="${gs.panel === "legend"}">Çizgi biçimleri</button><button class="chip" data-gp="density" aria-pressed="${gs.panel === "density"}">Yoğunluk</button></div>`;
}

function crumbs(){
  const d = gs.data; if(!d) return;
  const t = gs.trail.slice(-5), base = gs.trail.length - t.length;
  $("#gCrumb", root).innerHTML = t.map((x, i) => `<button data-t="${base + i}" title="Bu kavrama dön">${esc(x.w)}</button><i>›</i>`).join("") + `<button aria-current="true">${esc(label(d.self))}${sub(d.self.lits[0].s)}</button>`;
}

function renderOutline(){
  const d = gs.data, m = gs.model; if(!d) return;
  const s = d.self, prim = (d.paths || [])[0] || [];
  const item = (b, ds = d.ds, extra = "") => `<li><button data-id="${esc(b.id)}" ${extra}>${esc(label(b))}${sub(b.lits[0].s)}</button> <span class="muted" style="font-size:.82rem">${esc((POS[b.pos] || "").toLocaleLowerCase("tr"))}</span> <button class="toggler" data-rc="${esc(b.id)}" style="margin-left:6px">merkeze al</button></li>`;
  let open = "", close = "";
  prim.forEach(b => { open += `<ul role="group"><li><button data-id="${esc(b.id)}">${esc(label(b))}</button> <button class="toggler" data-rc="${esc(b.id)}">merkeze al</button>`; close += "</li></ul>"; });
  const kids = (d.rels || []).filter(r => r.type === "HYPONYM" || r.type === "INSTANCE_HYPONYM");
  const lat = (d.rels || []).filter(r => !HIER.has(r.type));
  $("#goutline", root).innerHTML = `<h2 class="page-title" style="margin-top:6px">${esc(label(s))}<sub> ${esc(DSNAME[d.ds] || "")}</sub></h2><p class="def">${esc(s.def)}</p>
    <ul role="tree" style="margin-top:22px">${prim.length ? open.replace(/^<ul role="group">/, "") : ""}
      <ul role="group"><li><b style="font:800 1.2rem var(--font-ui)">${esc(label(s))}</b>
        ${kids.length ? `<div class="rg">Alt kavramlar</div><ul>${kids.flatMap(r => r.items).slice(0, 40).map(b => item(b)).join("")}</ul>` : ""}
        ${lat.map(r => `<div class="rg">${esc(relLabel(r.type, d.pos))} · ${r.n}</div><ul>${r.items.slice(0, 12).map(b => item(b)).join("")}</ul>`).join("")}
        ${d.cross && d.cross.length ? `<div class="rg">${d.cross_ds === "en" ? "İngilizce karşılık" : "Türkçe karşılık"}</div><ul>${d.cross.map(b => `<li><button data-id="${esc(b.id)}" data-x="1">${esc(label(b))}</button> <span class="tag">${d.cross_ds === "en" ? "EN" : "TR"}</span></li>`).join("")}</ul>` : ""}
      </li></ul>${close.replace(/<\/li><\/ul>$/, "")}</ul>`;
  $$("#goutline [data-id]", root).forEach(b => { b.dataset.ods = d.ds; });
}

// ───────────────────────── odak ve seçim
function highlight(id, sticky){
  const cv = $("#gcanvas", root), gv = view_(); if(!cv || !gs.model) return;
  const m = gs.model, n = m.byId[id];
  $$(".gn", cv).forEach(x => x.classList.remove("near")); $$("[data-e]", cv).forEach(x => x.classList.remove("hot"));
  if(!n || n.kind === "center"){ if(!id){ gv.removeAttribute("data-focus"); } else gv.setAttribute("data-focus", "1"); if(n && n.kind === "center") $(`.gn[data-id="${CSS.escape(n.id)}"]`, cv)?.classList.add("near"); return; }
  gv.setAttribute("data-focus", "1");
  (n.chain || []).forEach(cid => $(`.gn[data-id="${CSS.escape(cid)}"]`, cv)?.classList.add("near"));
  $(`.gn[data-id="${CSS.escape(m.nodes[0].id)}"]`, cv)?.classList.add("near");
  $(`.gn[data-id="${CSS.escape(n.id)}"]`, cv)?.classList.add("near");
  (n.edgeIds || []).forEach(eid => $$(`[data-e="${eid}"]`, cv).forEach(x => x.classList.add("hot")));
  if(n.group) $$(".elab[data-ids]", cv).forEach(x => { if(x.dataset.ids.split(",").some(i => (n.edgeIds || []).includes(i))) x.classList.add("hot"); });
  $$(".elab[data-e]", cv).forEach(x => { if((n.edgeIds || []).includes(x.dataset.e)) x.classList.add("hot"); });
}
function clearSel(){
  if(!G.sel) return false;
  G.sel = ""; highlight(""); $$(".gn.sel", root).forEach(x => x.classList.remove("sel")); urlSync(false);
  return true;
}
function clickNode(id){
  const n = gs.model?.byId[id]; if(!n) return;
  if(n.kind === "more"){
    if(n.act === "up"){ G.up += 3; paint(); } else if(n.act === "kids"){ G.kids += 12; paint(); }
    else openConcept(gs.data.self.id, gs.data.ds);
    return;
  }
  G.sel = id; $$(".gn.sel", root).forEach(x => x.classList.remove("sel")); $(`.gn[data-id="${CSS.escape(id)}"]`, root)?.classList.add("sel");
  highlight(id, true); urlSync(false);
  if(n.kind === "center"){ openConcept(n.id, n.ds); return; }
  if(n.kind === "frame"){ showFrame(n); return; }
  openConcept(n.id, n.ds).then(() => linkInfo(n));
}
function recenterNode(id){
  const n = gs.model?.byId[id]; if(!n || n.kind === "more" || n.kind === "center") return;
  if(n.kind === "frame"){ setView("frames", {lang:"en", field:"name", q:n.fname, mode:"exact", open:n.fname}); return; }
  center(n.id, n.ds);
}

const REL_PHRASE = {HYPERNYM:"üst kavramı", HYPONYM:"alt kavramı", SIBLING:"kardeş kavramı (aynı üst kavramın çocuğu)", FRAME:"FrameNet çerçevesi", XL:"çeviri karşılığı"};
async function linkInfo(n){
  const c = gs.model.nodes[0];
  let relPhrase = n.rel && REL_PHRASE[n.rel] ? REL_PHRASE[n.rel] : (n.groupLabel ? n.groupLabel.toLocaleLowerCase("tr") : "bağlı kavram");
  if(n.kind === "xl") relPhrase = "çeviri karşılığı (Türkçe ↔ İngilizce bağlantı)";
  const base = `<div class="ss" id="linkInfo"><h3>Merkezle bağlantı</h3>
    <p class="def" style="margin-bottom:10px"><b>${esc(n.w)}</b>, <b>${esc(c.w)}</b> kavramının <b>${esc(relPhrase)}</b>.</p>
    <dl class="link-info"><dt>Uzaklık</dt><dd>${n.hops} adım</dd></dl><div id="liMetrics"></div>
    <div class="row" style="margin-top:12px"><button class="btn pri sm" data-gc="${esc(n.id)}">${icon("focus")}Merkeze al</button><button class="btn sm" data-act="relate" data-ds="${n.ds}" data-a="${esc(c.w.split(" / ")[0])}" data-b="${esc(n.w.split(" / ")[0])}">${icon("scale")}Karşılaştır</button></div></div>`;
  const host = () => $("#sheet .sheet-body"); if(!host()) return;
  host().insertAdjacentHTML("afterbegin", base);
  $("#sheet [data-gc]")?.addEventListener("click", () => recenterNode(n.id));
  if(n.kind === "xl" || n.ds !== c.ds) return;
  try{
    const j = await api("/api/relate", {ds:n.ds, a:c.id, b:n.id});
    const b = j.best; if(!b || G.sel !== n.id) return;
    const meter = (v, f) => `<div class="meter"><b style="font:700 1.05rem var(--font-ui);min-width:38px">${v.toFixed(2)}</b><i><b style="width:${Math.min(1, v) * 100}%"></b></i></div>`;
    $("#liMetrics").innerHTML = `<dl class="link-info" style="margin-top:6px">
      ${b.d != null ? `<dt>Yol</dt><dd>${b.d} kenar (hiyerarşide)</dd><dt>Path</dt><dd>${meter(b.sim)}</dd>` : ""}
      ${b.wup != null ? `<dt lang="en">Wu-Palmer</dt><dd>${meter(b.wup)}</dd>` : ""}
      ${b.ic ? `<dt lang="en">Lin (IC)</dt><dd>${meter(b.ic.lin)}</dd>` : ""}
      ${b.lcs ? `<dt>Ortak üst</dt><dd>${esc(b.lcs.lits.map(l => l.w).join(" / "))}</dd>` : ""}
    </dl><p class="up" style="margin-top:6px">${b.sim >= .33 ? "Yakın kavramlar." : b.sim >= .15 ? "Orta uzaklıkta; ilişkili olabilir." : "Uzak; hiyerarşide pek yakın değil."}</p>`;
  }catch(_){}
}
function showFrame(n){
  openSheetRaw({title:n.fname, sub:"FrameNet çerçevesi", body:`<div class="ss"><h3>Merkezle bağlantı</h3><p class="def">Bu çerçeve, <b>${esc(gs.model.nodes[0].w)}</b> kavramının Türkçe FrameNet'teki sözcük birimi olduğu çerçevedir.</p><div class="row" style="margin-top:12px"><button class="btn pri sm" data-act="fn" data-name="${esc(n.fname)}">${icon("frame")}Çerçevelerde aç</button></div></div>`});
}
function showStart(msg){ $("#gwrap .gbar", root)?.classList.add("hidden"); }

// ───────────────────────── yükleme / gezinme
async function load(){
  if(!G.id) return startPanel();
  gs.loading = true;
  let d;
  try{ d = await api("/api/synset", {ds:state.ds, id:G.id}); }catch(_){ return; }
  if(d.error){ toast("Kavram bulunamadı"); G.id = ""; return startPanel(); }
  gs.data = d; gs.parent = null;
  const par = (d.paths || [])[0]?.slice(-1)[0];
  if(G.sib && par){ try{ gs.parent = await api("/api/synset", {ds:state.ds, id:par.id}); }catch(_){} }
  gs.loading = false;
  $("#gstart", root).classList.add("hidden"); $("#gwrap .gbar", root).classList.remove("hidden");
  const t = gs.trail[gs.trail.length - 1];
  if(!t || t.id !== d.self.id) { /* iz yalnızca center() ile büyür */ }
  store.addHist(itemOf(state.ds, d.self));
  paint();
  document.title = `${label(d.self)} · Harita`;
}
export async function center(id, ds, {trail = false} = {}){
  if(gs.data && !trail && gs.data.self.id !== id) gs.trail.push({id:gs.data.self.id, ds:gs.data.ds, w:label(gs.data.self)});
  G.id = id; state.ds = ds || state.ds; G.ds = state.ds; G.sel = ""; gs.fitted = false;
  await load(); urlSync(true);
  closeSheet(); sheetPrompt();
}
function sheetPrompt(){ /* kâğıt kapalı kalır; düğüme tıklayınca açılır */ }

// başlangıç paneli
function startPanel(){
  mount();
  $("#gwrap .gbar", root).classList.add("hidden");
  $("#gcanvas", root).innerHTML = ""; $("#gside", root).innerHTML = "";
  const s = $("#gstart", root); s.classList.remove("hidden");
  const ex = state.ds === "en" ? ["dog","bank","interest","car","run"] : ["köpek","araba","yüz","kalem","koşmak"];
  s.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px"><div style="width:min(640px,100%)">
    <h1 class="page-title" style="font-size:clamp(2rem,4vw,3rem);margin:0 0 6px">Bir kavramla başla</h1>
    <p class="lesson-intro" style="margin:0 0 18px">Bir sözcük yaz, anlamlardan birini seç: hiyerarşisi ve bağlarıyla bir ağaç olarak açılır.</p>
    <label class="field">${icon("search")}<input id="gsq" type="text" placeholder="${state.ds === "en" ? "bir sözcük (örn. dog)" : "bir sözcük (örn. köpek)"}" autocomplete="off" spellcheck="false"></label>
    <div class="big-chips" style="margin-top:14px">${ex.map(w => `<button data-q="${esc(w)}">${esc(w)}</button>`).join("")}</div>
    <div id="gsr" style="margin-top:18px"></div></div></div>`;
  setTimeout(() => $("#gsq", root)?.focus(), 50);
}
let gsT;
function startInput(e){
  if(e.target.id !== "gsq") return;
  clearTimeout(gsT); gsT = setTimeout(() => startSearch(e.target.value.trim()), 160);
}
async function startSearch(q){
  const out = $("#gsr", root); if(!q){ out.innerHTML = ""; return; }
  const j = await api("/api/search", {ds:state.ds === "1998" ? "kenet" : state.ds, q, field:"word", mode:"exact", limit:12, fold:1});
  out.innerHTML = j.results.length ? `<ul class="senses">${j.results.map((s, i) => `<li class="sense" style="grid-template-columns:34px minmax(0,1fr);cursor:pointer" data-pick="${esc(s.id)}"><span class="num">${(s.lits.find(l => l.m) || s.lits[0]).s || i + 1}</span><div><div class="sense-line"><span class="pos-l">${esc((POS[s.pos] || "").toLocaleLowerCase("tr"))}</span>${s.lx ? `<span class="lex-l">${esc(s.lx)}</span>` : ""}</div><p class="def" style="margin:2px 0 0;font-size:1rem">${esc(s.def)}</p></div></li>`).join("")}</ul>` : '<div class="empty" style="padding:20px 0">Bu sözcük bulunamadı.</div>';
}
function startClick(e){
  const q = e.target.closest("[data-q]"), p = e.target.closest("[data-pick]");
  if(q){ $("#gsq", root).value = q.dataset.q; startSearch(q.dataset.q); }
  else if(p){ gs.trail = []; center(p.dataset.pick, state.ds === "1998" ? "kenet" : state.ds); }
}

// ───────────────────────── görünüm arayüzü
function neighbours(){ return (gs.model?.nodes || []).filter(n => n.el && n.kind !== "more" && n.kind !== "center"); }
export const view = {
  apply(p){
    if(p.id){ G.id = p.id; state.ds = p.ds || p.gds || state.ds; G.ds = state.ds; G.sel = ""; gs.trail = []; gs.fitted = false; gs.data = null; }
  },
  async enter(){
    mount(); G.ds = state.ds; gs.fitted = false;
    if(G.id) await load(); else startPanel();
    if(G.sel && gs.model?.byId[G.sel]) clickNode(G.sel);
  },
  async dsChange(){
    // dil değişince karşılık kavrama köprü kur
    const x = gs.data?.cross?.[0];
    if(x){ gs.trail.push({id:gs.data.self.id, ds:gs.data.ds, w:label(gs.data.self)}); await center(x.id, gs.data.cross_ds, {trail:true}); }
    else{ toast("Bu kavramın öbür dilde karşılığı yok"); state.ds = gs.data?.ds || state.ds; (await import("./ui.js")).syncShell(); }
  },
  escape(){ if(clearSel()){ closeSheet(); return true; } return false; },
  resize(){ if(state.v === "graph") setTimeout(() => fit(true, false), 380); },
  key(e){
    const ns = neighbours(); if(!ns.length) return;
    if(e.key === "Backspace" && gs.trail.length){ e.preventDefault(); const t = gs.trail.pop(); center(t.id, t.ds, {trail:true}); return; }
    if(e.key === "Enter" && G.sel){ recenterNode(G.sel); return; }
    if(!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const cur = gs.model.byId[G.sel] || gs.model.nodes[0];
    let cand;
    if(e.key === "ArrowUp") cand = cur.kind === "center" || cur.kind === "down" ? ns.filter(n => n.kind === "up" && n.y < cur.y).sort((a, b) => b.y - a.y)[0] : ns.filter(n => n.y < cur.y).sort((a, b) => Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0];
    else if(e.key === "ArrowDown") cand = ns.filter(n => n.y > cur.y + 5).sort((a, b) => a.y - b.y || Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0];
    else{ const dir = e.key === "ArrowRight" ? 1 : -1; cand = ns.filter(n => (n.x - cur.x) * dir > 5).sort((a, b) => Math.abs(a.y - cur.y) - Math.abs(b.y - cur.y) || Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0]; }
    if(cand) clickNode(cand.id);
  },
  onSheetClose(){ if(G.sel) clearSel(); }
};
registerView("graph", view);
