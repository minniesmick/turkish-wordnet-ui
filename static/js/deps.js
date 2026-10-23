// Bağımlılık ağacı: Lecture 3 (Dependency Parsing), InClass 4. UD Turkish-BOUN cümlesi seç ya da CoNLL-U yapıştır; ok ve ağaç çizimi, özellik kontrolleri.
import {$, $$, esc, api, registerView, MODE} from "./core.js";

// Universal Dependencies ilişkileri: kısa Türkçe açıklama
const REL = {
  root:"kök (cümlenin ana yüklemi)", nsubj:"özne", "nsubj:pass":"edilgen özne", csubj:"cümle özne", obj:"nesne", iobj:"dolaylı nesne",
  obl:"tümleç (zarf tümleci / ek almış ad)", "obl:tmod":"zaman tümleci", advmod:"zarf", "advmod:emph":"vurgu zarfı", amod:"sıfat niteleyici", nmod:"ad niteleyici",
  "nmod:poss":"iyelik (tamlayan)", det:"belirleyici", case:"ilgeç (edat)", cc:"bağlaç", conj:"eşgüdüm (bağlanan öğe)", punct:"noktalama",
  aux:"yardımcı fiil", "aux:q":"soru eki", cop:"ek-fiil (kopula)", mark:"yan cümle işareti", acl:"ad yan cümlesi (sıfat-fiil)", advcl:"zarf yan cümlesi",
  ccomp:"tümleç cümle", xcomp:"açık tümleç", compound:"bileşik", "compound:lvc":"birleşik fiil (ad + yardımcı fiil)", "compound:redup":"ikileme",
  flat:"düz yapı (özel ad vb.)", "flat:name":"özel ad", appos:"açıklayıcı ad", nummod:"sayı niteleyici", discourse:"söylem ögesi", vocative:"hitap",
  dep:"belirsiz bağımlılık", fixed:"sabit ifade", parataxis:"yan yana cümle", orphan:"yetim öğe", list:"liste", goeswith:"bölünmüş sözcük"
};
const relText = r => REL[r] || REL[r.split(":")[0]] || "";
const DS = {q:"", min:5, max:12, results:[], total:0, id:"", conllu:"", hide:false, view:"arc", sel:0, paste:false};
const KEY = "wn:deps";
let root = null, sent = null;

const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)) || {}; for(const k of ["q", "min", "max", "id", "conllu", "view"]) if(v[k] != null) DS[k] = v[k]; }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({q:DS.q, min:DS.min, max:DS.max, id:DS.id, conllu:DS.paste ? DS.conllu : "", view:DS.view})); }catch(_){} };

// ───────────────────────── CoNLL-U
function parseConllu(text){
  const meta = {}, toks = [];
  for(const raw of text.replace(/\r/g, "").split("\n")){
    const line = raw.trim();
    if(!line) continue;
    const m = line.match(/^#\s*(\w+)\s*=\s*(.*)$/);
    if(m){ meta[m[1]] = m[2]; continue; }
    if(line[0] === "#") continue;
    const c = (raw.includes("\t") ? raw.split("\t") : line.split(/\s+/));
    if(c.length < 8 || !/^\d+$/.test(c[0])) continue;          // 1-2 (çok sözcüklü belirteç) ve 1.1 (boş düğüm) atlanır
    toks.push({id:+c[0], form:c[1], lemma:c[2], upos:c[3], feats:c[5], head:+c[6], rel:c[7]});
  }
  return {meta, toks};
}
// özellik kontrolleri (slayt: tek kök, bağlı, tek başlı, döngüsüz, projektif)
function check(toks){
  const n = toks.length, by = new Map(toks.map(t => [t.id, t]));
  const roots = toks.filter(t => t.head === 0), bad = toks.filter(t => t.head !== 0 && !by.has(t.head));
  const cyc = [];
  for(const t of toks){ const seen = new Set(); let c = t; while(c && c.head !== 0 && !seen.has(c.id)){ seen.add(c.id); c = by.get(c.head); } if(c && c.head !== 0) cyc.push(t.id); }
  const anc = (d, h) => { let c = by.get(d); const seen = new Set(); while(c && c.head !== 0 && !seen.has(c.id)){ if(c.head === h) return true; seen.add(c.id); c = by.get(c.head); } return false; };
  const nonproj = [];
  if(!cyc.length) for(const t of toks) if(t.head){
    const lo = Math.min(t.id, t.head), hi = Math.max(t.id, t.head);
    for(const k of toks) if(k.id > lo && k.id < hi && !anc(k.id, t.head) && k.id !== t.head){ nonproj.push(t.id); break; }
  }
  return {n, roots, bad, cyc, nonproj};
}

// ───────────────────────── çizim: yerleşim
const wOf = t => Math.max(t.form.length * 8.6, t.upos.length * 7, 34) + 26;
function layoutX(toks){
  let x = 20; const xs = new Map();
  for(const t of toks){ const w = wOf(t); xs.set(t.id, x + w / 2); x += w; }
  return {xs, width:x + 20};
}
function arcLevels(arcs){
  const order = [...arcs].sort((a, b) => (a.hi - a.lo) - (b.hi - b.lo));
  for(const a of order){
    let lv = 0;
    for(const b of order) if(b !== a && b.lo >= a.lo && b.hi <= a.hi && (b.hi - b.lo) < (a.hi - a.lo)) lv = Math.max(lv, b.level);
    a.level = lv + 1;
  }
}
function arcSVG(toks, chk){
  const {xs, width} = layoutX(toks), arcs = toks.filter(t => t.head).map(t => ({d:t.id, h:t.head, rel:t.rel, lo:Math.min(t.id, t.head), hi:Math.max(t.id, t.head)}));
  arcLevels(arcs);
  const maxL = Math.max(1, ...arcs.map(a => a.level)), LV = 24, top = 30 + (maxL + 1) * LV, y0 = top, H = y0 + 52;
  const ends = new Map(toks.map(t => [t.id, []]));
  for(const a of arcs){ ends.get(a.h).push({a, other:a.d}); ends.get(a.d).push({a, other:a.h}); }
  const off = new Map();
  for(const [id, list] of ends){ list.sort((p, q) => (p.other - q.other) || (p.a.hi - p.a.lo) - (q.a.hi - q.a.lo)); list.forEach((e, k) => off.set(`${id}:${e.a.d}`, (k - (list.length - 1) / 2) * 6)); }
  let svg = "";
  const np = new Set(chk.nonproj);
  for(const a of arcs){
    const x1 = xs.get(a.h) + off.get(`${a.h}:${a.d}`), x2 = xs.get(a.d) + off.get(`${a.d}:${a.d}`), hgt = a.level * LV, ty = y0 - hgt, r = 7, dir = x2 > x1 ? 1 : -1;
    const on = DS.sel === a.d || DS.sel === a.h;
    svg += `<g class="dp-arc ${on ? "on" : ""} ${np.has(a.d) ? "np" : ""}" data-tok="${a.d}"><path d="M${x1} ${y0 - 16}V${ty + r}Q${x1} ${ty} ${x1 + dir * r} ${ty}H${x2 - dir * r}Q${x2} ${ty} ${x2} ${ty + r}V${y0 - 16}"/><path class="hd" d="M${x2 - 4} ${y0 - 22}L${x2} ${y0 - 14}L${x2 + 4} ${y0 - 22}Z"/><text class="dp-lbl" x="${(x1 + x2) / 2}" y="${ty - 4}">${esc(a.rel)}</text></g>`;
  }
  const rt = toks.find(t => t.head === 0);
  if(rt){ const x = xs.get(rt.id), ty = y0 - (maxL + 1) * LV; svg += `<g class="dp-arc root ${DS.sel === rt.id ? "on" : ""}" data-tok="${rt.id}"><path d="M${x} ${ty}V${y0 - 16}"/><path class="hd" d="M${x - 4} ${y0 - 22}L${x} ${y0 - 14}L${x + 4} ${y0 - 22}Z"/><text class="dp-lbl" x="${x + 6}" y="${ty + 10}" style="text-anchor:start">root</text></g>`; }
  for(const t of toks) svg += `<g class="dp-word ${DS.sel === t.id ? "on" : ""}" data-tok="${t.id}"><text class="dp-f" x="${xs.get(t.id)}" y="${y0 + 8}">${esc(t.form)}</text><text class="dp-p" x="${xs.get(t.id)}" y="${y0 + 26}">${esc(t.upos)}</text><text class="dp-i" x="${xs.get(t.id)}" y="${y0 + 42}">${t.id}</text></g>`;
  return `<svg class="dp" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="Bağımlılık okları">${svg}</svg>`;
}
function treeSVG(toks){
  const {xs, width} = layoutX(toks), by = new Map(toks.map(t => [t.id, t])), depth = new Map();
  const dOf = t => { if(depth.has(t.id)) return depth.get(t.id); depth.set(t.id, 1); const d = t.head === 0 || !by.has(t.head) ? 1 : dOf(by.get(t.head)) + 1; depth.set(t.id, d); return d; };
  toks.forEach(dOf);
  const maxD = Math.max(...depth.values()), VY = 66, top = 34, H = top + maxD * VY + 40;
  const py = t => top + (depth.get(t.id) - 1) * VY + 22;
  let lines = "", nodes = "";
  const rt = toks.find(t => t.head === 0);
  if(rt) lines += `<g class="dp-arc root"><line x1="${xs.get(rt.id)}" y1="${top - 14}" x2="${xs.get(rt.id)}" y2="${py(rt) - 20}"/><text class="dp-lbl" x="${xs.get(rt.id) + 6}" y="${top + 2}" style="text-anchor:start">root</text></g>`;
  for(const t of toks){
    const p = by.get(t.head); if(!p) continue;
    const x1 = xs.get(p.id), y1 = py(p) + 20, x2 = xs.get(t.id), y2 = py(t) - 20;
    lines += `<g class="dp-arc ${DS.sel === t.id || DS.sel === p.id ? "on" : ""}" data-tok="${t.id}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="dp-lbl halo" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 4}">${esc(t.rel)}</text></g>`;
  }
  for(const t of toks){
    const w = wOf(t) - 8;
    nodes += `<g class="dp-node ${DS.sel === t.id ? "on" : ""}" data-tok="${t.id}"><rect x="${xs.get(t.id) - w / 2}" y="${py(t) - 20}" width="${w}" height="40" rx="6"/><text class="dp-f" x="${xs.get(t.id)}" y="${py(t) - 2}">${esc(t.form)}</text><text class="dp-p" x="${xs.get(t.id)}" y="${py(t) + 13}">${esc(t.upos)}</text></g>`;
  }
  return `<svg class="dp" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="Bağımlılık ağacı">${lines}${nodes}</svg>`;
}

// ───────────────────────── çıktı
function checksHTML(toks, c){
  const li = (ok, name, note) => `<li class="${ok ? "ok" : "bad"}"><b>${ok ? "✓" : "✗"}</b> <span><b>${name}</b> <small>${note}</small></span></li>`;
  return `<ul class="dp-checks stu">
    ${li(c.roots.length === 1, "Tek kök", c.roots.length === 1 ? `kök: <i>${esc(c.roots[0].form)}</i>` : `${c.roots.length} kök bulundu`)}
    ${li(!c.bad.length && !c.cyc.length, "Bağlı ve döngüsüz", c.bad.length ? "geçersiz HEAD var" : c.cyc.length ? "döngü var" : "her sözcükten HEAD zinciriyle köke ulaşılır")}
    ${li(!c.bad.length, "Tek başlı", "her sözcüğün (kök hariç) tam bir HEAD'i var")}
    ${li(!c.nonproj.length, "Projektif", c.nonproj.length ? `kesişen ok: ${c.nonproj.map(i => `<i>${esc(toks.find(t => t.id === i)?.form)}</i>`).join(", ")}` : "kesişen ok yok; her alt ağaç ardışık bir aralık")}</ul>`;
}
function tableHTML(toks){
  return `<div class="dp-scroll"><table class="ng-tbl dp-tbl"><tr><th>ID</th><th>FORM</th><th>LEMMA</th><th>UPOS</th><th>FEATS</th><th class="sec">HEAD</th><th class="sec">DEPREL</th></tr>
  ${toks.map(t => `<tr data-tok="${t.id}" class="${DS.sel === t.id ? "sel" : ""}"><td>${t.id}</td><td><b>${esc(t.form)}</b></td><td>${esc(t.lemma)}</td><td>${esc(t.upos)}</td><td class="f">${esc(t.feats === "_" ? "" : t.feats.replace(/\|/g, " · "))}</td><td class="sec">${t.head}${t.head ? ` <small>${esc(toks.find(x => x.id === t.head)?.form || "?")}</small>` : ""}</td><td class="sec">${esc(t.rel)}</td></tr>`).join("")}</table></div>`;
}
function relsHTML(toks){
  const used = [...new Set(toks.map(t => t.rel))].sort();
  return `<div class="dp-rels stu">${used.map(r => `<span class="dp-rel"><span class="ck-s">${esc(r)}</span> ${esc(relText(r) || "—")}</span>`).join("")}</div>`;
}
function selHTML(toks){
  const t = toks.find(x => x.id === DS.sel); if(!t) return `<p class="ck-meta">Bir sözcüğe ya da oka tıkla: ilişkisi burada açıklanır.</p>`;
  const h = toks.find(x => x.id === t.head), kids = toks.filter(x => x.head === t.id);
  return `<p class="verdict" style="font-size:1.15rem"><b>${esc(t.form)}</b> ${h ? `→ bağımlısı olduğu baş: <b>${esc(h.form)}</b> · ilişki <span class="ck-s">${esc(t.rel)}</span> <small class="muted stu">${esc(relText(t.rel))}</small>` : `cümlenin <b>kökü</b>`}.${kids.length ? ` Bağımlıları: ${kids.map(k => `<button class="rel" data-tok="${k.id}">${esc(k.form)}<sub>${esc(k.rel)}</sub></button>`).join(" ")}` : " Bağımlısı yok (yaprak)."}</p>`;
}
function render(){
  const out = $("#dpOut", root);
  if(!sent || !sent.toks.length){ out.innerHTML = '<div class="empty" style="padding:30px 0">Bir cümle seç ya da CoNLL-U yapıştır.</div>'; return; }
  const {toks, meta} = sent, c = check(toks);
  out.className = DS.hide && MODE.student ? "dp-hide" : "";
  out.innerHTML = `<p class="ck-meta" style="margin-bottom:4px">${meta.sent_id ? `<span class="tag">${esc(meta.sent_id)}</span> ` : ""}${toks.length} sözcük</p>
    <p class="dp-text">${esc(meta.text || toks.map(t => t.form).join(" "))}</p>
    <div class="ng-ctl"><div class="seg" role="group" aria-label="Görünüm"><button data-dv="arc" aria-pressed="${DS.view === "arc"}">Oklar</button><button data-dv="tree" aria-pressed="${DS.view === "tree"}">Ağaç</button></div>
      <label class="chk stu"><input type="checkbox" id="dpHide" ${DS.hide ? "checked" : ""}> etiketleri gizle (önce kendin dene)</label></div>
    <div class="fig-box"><div class="fig-actions" style="margin:0 0 6px"><button class="btn sm ghost" data-export="svg" data-name="bagimlilik-${esc(meta.sent_id || "cumle")}">SVG indir</button><button class="btn sm ghost" data-export="png" data-name="bagimlilik-${esc(meta.sent_id || "cumle")}">PNG indir</button><button class="btn sm ghost" data-copy="${esc(DS.conllu)}">CoNLL-U kopyala</button></div><div class="dp-scroll dp-fig">${DS.view === "arc" ? arcSVG(toks, c) : treeSVG(toks)}</div></div>
    <div id="dpSel">${selHTML(toks)}</div>
    <h3 class="ng-h3 stu">Özellikler <small>Lecture 3, bağımlılık ağacı</small></h3>${checksHTML(toks, c)}
    <h3 class="ng-h3 stu">Bu cümledeki ilişkiler</h3>${relsHTML(toks)}
    <h3 class="ng-h3">CoNLL-U tablosu</h3>${tableHTML(toks)}`;
}
function setSent(text, id){
  sent = parseConllu(text); DS.conllu = text; DS.id = id || sent.meta.sent_id || ""; DS.sel = 0; save(); render(); renderList();
}
function renderList(){
  $("#dpList", root).innerHTML = DS.results.length
    ? DS.results.map(r => `<button class="dp-pick ${r.id === DS.id ? "on" : ""}" data-id="${esc(r.id)}"><span>${esc(r.text)}</span><small>${r.n}</small></button>`).join("")
    : '<div class="empty" style="padding:18px 0">Bu ölçütte cümle yok.</div>';
  $("#dpCount", root).textContent = DS.total ? `${DS.total} cümle` + (DS.total > DS.results.length ? `, ilk ${DS.results.length} gösteriliyor` : "") : "";
}
async function search(){
  const j = await api("/api/ud", {q:DS.q, min:DS.min, max:DS.max, limit:30});
  DS.results = j.results || []; DS.total = j.total || 0; renderList(); save();
  return j;
}
async function pick(id){ const j = await api("/api/ud", {id}); if(j.conllu) setSent(j.conllu, j.id); }

function mount(){
  if(root) return;
  load();
  root = $("#v-deps");
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Bağımlılık ağacı</h1>
    <p class="lesson-intro" style="margin:0">UD Turkish-BOUN treebank'inden bir cümle seç ya da kendi CoNLL-U'nu yapıştır: sözcükler arası baş–bağımlı ilişkileri ok ve ağaç olarak çizilir.<span class="stu"> Ağaç özellikleri (tek kök, bağlı, tek başlı, döngüsüz, projektif) kontrol edilir, ilişkiler açıklanır (InClass 4).</span></p>
    <h2 class="ng-h">1 · Cümle seç <small id="dpCount"></small></h2>
    <div class="ng-ctl" style="margin-top:0"><label class="field sm" style="flex:1 1 260px">${""}<input id="dpQ" type="text" placeholder="Cümlede ara (örn. kitap)" autocomplete="off" spellcheck="false"></label>
      <label class="muted" style="font-size:.88rem">en az <input id="dpMin" class="dp-num" type="number" min="1" max="60"> en çok <input id="dpMax" class="dp-num" type="number" min="1" max="60"> sözcük</label>
      <button class="btn sm" id="dpRand">Rastgele cümle</button><button class="btn sm ghost" id="dpPaste">CoNLL-U yapıştır</button></div>
    <div id="dpPasteBox" class="hidden"><textarea class="ta" id="dpTa" rows="8" spellcheck="false" placeholder="# text = ...&#10;1&#9;Ali&#9;Ali&#9;PROPN&#9;_&#9;_&#9;2&#9;nsubj&#9;_&#9;_" style="font:500 .85rem/1.5 var(--font-mono)"></textarea>
      <p class="ng-formula" style="margin:6px 0 0">10 sütunlu CoNLL-U (sekme ya da boşlukla ayrılmış, en az 8 sütun). Çok sözcüklü belirteçler (1-2) atlanır.</p></div>
    <div class="dp-list" id="dpList"></div>
    <h2 class="ng-h">2 · Ağaç</h2>
    <div id="dpOut" aria-live="polite"></div>
    <div style="height:56px"></div></div>`;
  $("#dpQ", root).value = DS.q; $("#dpMin", root).value = DS.min; $("#dpMax", root).value = DS.max;
  let t;
  const again = () => { clearTimeout(t); t = setTimeout(search, 220); };
  $("#dpQ", root).addEventListener("input", e => { DS.q = e.target.value; again(); });
  $("#dpMin", root).addEventListener("input", e => { DS.min = +e.target.value || 1; again(); });
  $("#dpMax", root).addEventListener("input", e => { DS.max = +e.target.value || 60; again(); });
  $("#dpRand", root).addEventListener("click", async () => {
    const j = await search(); if(!j.total) return;
    const all = await api("/api/ud", {q:DS.q, min:DS.min, max:DS.max, limit:100});
    const r = all.results[Math.floor(Math.random() * all.results.length)]; if(r) pick(r.id);
  });
  $("#dpPaste", root).addEventListener("click", () => { DS.paste = !DS.paste; $("#dpPasteBox", root).classList.toggle("hidden", !DS.paste); if(DS.paste) $("#dpTa", root).focus(); });
  $("#dpTa", root).addEventListener("input", e => { const s = parseConllu(e.target.value); if(s.toks.length){ sent = s; DS.conllu = e.target.value; DS.id = ""; DS.sel = 0; save(); render(); } });
  root.addEventListener("click", e => {
    const el = e.target.closest("[data-id],[data-dv],[data-tok]"); if(!el) return;
    if(el.dataset.id) return pick(el.dataset.id);
    if(el.dataset.dv){ DS.view = el.dataset.dv; save(); return render(); }
    DS.sel = +el.dataset.tok; render();
  });
  root.addEventListener("change", e => { if(e.target.id === "dpHide"){ DS.hide = e.target.checked; render(); } });
}

export const view = {
  apply(){},
  async enter(){
    mount();
    await search();
    if(DS.conllu && !DS.id){ DS.paste = true; $("#dpPasteBox", root).classList.remove("hidden"); $("#dpTa", root).value = DS.conllu; setSent(DS.conllu, ""); }
    else if(DS.id) await pick(DS.id);
    else if(DS.results[0]) await pick(DS.results[0].id);
  }
};
registerView("deps", view);
