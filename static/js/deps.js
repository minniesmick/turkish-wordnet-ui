// Bağımlılık ağacı: Lecture 3 (Dependency Parsing), InClass 4. UD Turkish-BOUN cümlesi seç ya da CoNLL-U yapıştır; ok ve ağaç çizimi, özellik kontrolleri.
import {$, $$, esc, api, registerView, MODE} from "./core.js";
import {scoreDeps, treeProblems} from "./depscore.js";
import {oracle, trainParser, parse as parseLP, evalParser} from "./depparse.js";
import {trainGraph, parseGraph, evalGraph} from "./depgraph.js";
import {loadCorpus} from "./corpusdata.js";
import {split as splitMD} from "./md.js";
import {groups, matchZ} from "./zmap.js";

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
const EX0 = () => ({head:{}, rel:{}, chk:false, hints:0, shown:false});
const DS = {tr:null, ex:EX0(), q:"", min:5, max:12, results:[], total:0, id:"", conllu:"", hide:false, view:"arc", sel:0, paste:false};
const KEY = "wn:deps";
// Çekim grupları (IG): Zemberek varsa, cümledeki her sözcüğün çözümlemesi türetme sınırlarından (^DB) gruplara bölünür
const ZI = {avail:null, words:{}};
// Öğrenen ayrıştırıcı (depparse.js): BOUN'un her 5. cümlesi sınama, kalanı eğitim (Belirsizlik ve N-gram ile aynı ayrım)
const LP = {kind:"trans", trans:{model:null, test:null}, graph:{model:null, test:null}, busy:false, msg:"", train:new Set(), err:""};
const toksOfCorpus = s => s.f.map((f, i) => ({id:i + 1, form:f, lemma:s.l[i], upos:s.p[i], feats:s.x[i] || "_", head:s.h[i], rel:s.r[i]}));
async function trainLP(){
  if(LP.busy) return;
  const kind = LP.kind;
  LP.busy = true; LP.err = ""; LP.msg = "BOUN yükleniyor…"; renderLP();
  try{
    const C = await loadCorpus("boun");
    if(!C.sents[0].h) throw new Error("sunucu HEAD göndermiyor; server.py'yi yeniden başlat");
    const {train, test} = splitMD(C.sents);
    LP.train = new Set(train.map(s => s.id));
    await new Promise(r => setTimeout(r, 20));
    const onEpoch = async (e, n) => { LP.msg = `eğitiliyor: tur ${e} / ${n}`; renderLP(); await new Promise(r => setTimeout(r, 20)); };
    if(kind === "graph"){
      LP.graph.model = await trainGraph(train.map(toksOfCorpus), {onEpoch});
      LP.msg = "sınama kümesi ayrıştırılıyor…"; renderLP(); await new Promise(r => setTimeout(r, 20));
      LP.graph.test = evalGraph(LP.graph.model, test.map(toksOfCorpus));
    }else{
      LP.trans.model = await trainParser(train.map(toksOfCorpus), {onEpoch});
      LP.trans.test = evalParser(LP.trans.model, test.map(toksOfCorpus));
    }
  }catch(e){ LP.err = String(e.message || e); }
  LP.busy = false; renderLP();
}
function renderLP(){ const el = $("#dpLp", root); if(el && sent) el.innerHTML = lpHTML(sent.toks); }
function lpHTML(toks){
  const K = LP[LP.kind], graph = LP.kind === "graph";
  const seg = `<div class="ng-ctl" style="margin-top:0"><div class="seg" role="group" aria-label="Ayrıştırıcı türü"><button data-lpk="trans" aria-pressed="${!graph}">Geçiş tabanlı (arc-standard)</button><button data-lpk="graph" aria-pressed="${graph}">Grafik tabanlı (Chu-Liu/Edmonds)</button></div></div>`;
  const TRANS = `<p class="ck-meta">Yukarıdaki oracle altın ağacı bildiği için eylemleri hazır alır. Burada eylemleri bir sınıflandırıcı seçer: arc-standard durumundan (yığının ve tamponun üst sözcükleri, sözcük türleri, ekler, çocukların ilişkileri) özellikler çıkarılır, ortalama perceptron SHIFT, LEFT-ARC ya da RIGHT-ARC (ilişkiyle) seçer. Eğitim BOUN'un cümlelerinde oracle'ın eylemleriyle yapılır; açgözlü, geri dönüşsüz çalışır.</p>`;
  const GRAPH = `<p class="ck-meta">Grafik tabanlı yöntem her olası oku (baş → bağımlı) özelliklerle puanlar ve tüm cümle için toplam puanı en yüksek ağacı Chu-Liu/Edmonds algoritmasıyla bulur; karar adım adım değil ağacın bütünü üzerindedir ve kesişen yaylara da izin verir. Ok puanları ortalama perceptronla öğrenilir (ok başına özellikler: baş ve bağımlının sözcük, tür, lemma, ek; aralarındaki mesafe ve türler); ilişki etiketi ikinci bir sınıflandırıcıyla seçilir.</p>`;
  const head = seg + (graph ? GRAPH : TRANS);
  if(LP.err) return head + `<div class="notice warn">${esc(LP.err)}</div><button class="btn sm" data-lp="train">Yeniden dene</button>`;
  if(LP.busy) return head + `<p class="verdict" style="font-size:1.05rem">${esc(LP.msg)}</p>`;
  if(!K.model) return head + `<button class="btn sm" data-lp="train">Ayrıştırıcıyı eğit <small>(BOUN, yaklaşık ${graph ? 4 : 5} saniye)</small></button>`;
  const r = graph ? parseGraph(K.model, toks) : parseLP(K.model, toks), p = new Map(r.arcs.map(a => [a.d, a]));
  let n = 0, u = 0, l = 0;
  const rows = toks.map(t => {
    const a = p.get(t.id), gh = t.head, hasGold = toks.some(x => x.head);
    const ok = a && a.h === t.head, okL = ok && a.rel === t.rel, skip = t.upos === "PUNCT";
    if(hasGold && !skip){ n++; if(ok) u++; if(okL) l++; }
    const nm = id => id === 0 ? "ROOT" : esc(toks.find(x => x.id === id)?.form ?? id);
    return `<tr class="dp-ex-${!hasGold || skip ? "" : okL ? "ok" : ok ? "half" : "bad"}"><td>${t.id}</td><td><b>${esc(t.form)}</b></td><td>${hasGold ? `${nm(gh)} <small>${esc(t.rel)}</small>` : "—"}</td><td>${a ? `${nm(a.h)} <small>${esc(a.rel)}</small>` : "—"}</td><td>${!hasGold || skip ? "" : okL ? "✓" : ok ? "baş doğru" : "✗"}</td></tr>`;
  }).join("");
  const own = LP.train.has(sent.meta.sent_id), t = K.test;
  return head + `<p class="verdict" style="font-size:1.05rem">Sınama kümesi (noktalamasız, ${t.n} sözcük): UAS <b>${(100 * t.uas).toFixed(1)}%</b> · LAS <b>${(100 * t.las).toFixed(1)}%</b></p>
    <p class="ck-meta">Bu cümle: ${own ? "<b>eğitim kümesinde</b> (sonuçlar iyimser olur)" : sent.meta.sent_id ? "<b>sınama kümesinde</b>, ayrıştırıcı görmedi" : "kendi cümlen"}${n ? ` · UAS <b>${Math.round(100 * u / n)}%</b> · LAS <b>${Math.round(100 * l / n)}%</b>` : ""}.</p>
    <div class="ck-scroll" role="region" tabindex="0" aria-label="Ayrıştırıcı çıktısı tablosu"><table class="ng-tbl dp-ex-tbl"><tr><th>#</th><th>Sözcük</th><th>Altın (baş · ilişki)</th><th>Ayrıştırıcı</th><th></th></tr>${rows}</table></div>
    <p class="ck-meta">${graph ? "Grafik tabanlı yöntem kesişen yayları kurabilir; ancak bu kadar küçük eğitim kümesinde, ok başına özelliklerle (birinci derece) geçiş tabanlı yöntemin zengin durum özelliklerinin gerisinde kalır." : "Kesişen yaylı (projektif olmayan) cümleleri arc-standard kuramaz; BOUN cümlelerinin yaklaşık %3'ü böyledir."}</p>`;
}
const lcw = s => s.toLocaleLowerCase("tr");
let root = null, sent = null;

const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)) || {}; for(const k of ["q", "min", "max", "id", "conllu", "view"]) if(v[k] != null) DS[k] = v[k]; }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({q:DS.q, min:DS.min, max:DS.max, id:DS.id, conllu:DS.paste ? DS.conllu : "", view:DS.view})); }catch(_){} };

// ───────────────────────── CoNLL-U
function parseConllu(text){
  const meta = {}, toks = [], mwt = [];
  for(const raw of text.replace(/\r/g, "").split("\n")){
    const line = raw.trim();
    if(!line) continue;
    const m = line.match(/^#\s*(\w+)\s*=\s*(.*)$/);
    if(m){ meta[m[1]] = m[2]; continue; }
    if(line[0] === "#") continue;
    const c = (raw.includes("\t") ? raw.split("\t") : line.split(/\s+/));
    const rg = c[0].match(/^(\d+)-(\d+)$/);
    if(rg && c.length >= 2){ mwt.push({from:+rg[1], to:+rg[2], form:c[1]}); continue; }   // çok sözcüklü belirteç (ör. 4-5 ağlayacaktı): tabloda gösterilir, ağaçta yok
    if(c.length < 8 || !/^\d+$/.test(c[0])) continue;          // 1.1 (boş düğüm) atlanır
    toks.push({id:+c[0], form:c[1], lemma:c[2], upos:c[3], feats:c[5], head:+c[6], rel:c[7]});
  }
  return {meta, toks, mwt};
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
    svg += `<g class="dp-arc ${on ? "on" : ""} ${np.has(a.d) ? "np" : ""}" data-tok="${a.d}" aria-hidden="true"><path d="M${x1} ${y0 - 16}V${ty + r}Q${x1} ${ty} ${x1 + dir * r} ${ty}H${x2 - dir * r}Q${x2} ${ty} ${x2} ${ty + r}V${y0 - 16}"/><path class="hd" d="M${x2 - 4} ${y0 - 22}L${x2} ${y0 - 14}L${x2 + 4} ${y0 - 22}Z"/><text class="dp-lbl" x="${(x1 + x2) / 2}" y="${ty - 4}">${esc(a.rel)}</text></g>`;
  }
  const rt = toks.find(t => t.head === 0);
  if(rt){ const x = xs.get(rt.id), ty = y0 - (maxL + 1) * LV; svg += `<g class="dp-arc root ${DS.sel === rt.id ? "on" : ""}" data-tok="${rt.id}" aria-hidden="true"><path d="M${x} ${ty}V${y0 - 16}"/><path class="hd" d="M${x - 4} ${y0 - 22}L${x} ${y0 - 14}L${x + 4} ${y0 - 22}Z"/><text class="dp-lbl" x="${x + 6}" y="${ty + 10}" style="text-anchor:start">root</text></g>`; }
  for(const t of toks) svg += `<g class="dp-word ${DS.sel === t.id ? "on" : ""}" data-tok="${t.id}" role="button" tabindex="0" aria-pressed="${DS.sel === t.id}" aria-label="Sözcük ${t.id}: ${esc(t.form)}, ${esc(t.upos)}"><text class="dp-f" x="${xs.get(t.id)}" y="${y0 + 8}">${esc(t.form)}</text><text class="dp-p" x="${xs.get(t.id)}" y="${y0 + 26}">${esc(t.upos)}</text><text class="dp-i" x="${xs.get(t.id)}" y="${y0 + 42}">${t.id}</text></g>`;
  return `<svg class="dp" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="group" aria-label="Bağımlılık okları; sözcük seçmek için sekme ve Enter tuşlarını kullan">${svg}</svg>`;
}
function treeSVG(toks){
  const {xs, width} = layoutX(toks), by = new Map(toks.map(t => [t.id, t])), depth = new Map();
  const dOf = t => { if(depth.has(t.id)) return depth.get(t.id); depth.set(t.id, 1); const d = t.head === 0 || !by.has(t.head) ? 1 : dOf(by.get(t.head)) + 1; depth.set(t.id, d); return d; };
  toks.forEach(dOf);
  const maxD = Math.max(...depth.values()), VY = 66, top = 34, H = top + maxD * VY + 40;
  const py = t => top + (depth.get(t.id) - 1) * VY + 22;
  let lines = "", nodes = "";
  const rt = toks.find(t => t.head === 0);
  if(rt) lines += `<g class="dp-arc root" aria-hidden="true"><line x1="${xs.get(rt.id)}" y1="${top - 14}" x2="${xs.get(rt.id)}" y2="${py(rt) - 20}"/><text class="dp-lbl" x="${xs.get(rt.id) + 6}" y="${top + 2}" style="text-anchor:start">root</text></g>`;
  for(const t of toks){
    const p = by.get(t.head); if(!p) continue;
    const x1 = xs.get(p.id), y1 = py(p) + 20, x2 = xs.get(t.id), y2 = py(t) - 20;
    lines += `<g class="dp-arc ${DS.sel === t.id || DS.sel === p.id ? "on" : ""}" data-tok="${t.id}" aria-hidden="true"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="dp-lbl halo" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 4}">${esc(t.rel)}</text></g>`;
  }
  for(const t of toks){
    const w = wOf(t) - 8;
    nodes += `<g class="dp-node ${DS.sel === t.id ? "on" : ""}" data-tok="${t.id}" role="button" tabindex="0" aria-pressed="${DS.sel === t.id}" aria-label="Sözcük ${t.id}: ${esc(t.form)}, ${esc(t.upos)}"><rect x="${xs.get(t.id) - w / 2}" y="${py(t) - 20}" width="${w}" height="40" rx="6"/><text class="dp-f" x="${xs.get(t.id)}" y="${py(t) - 2}">${esc(t.form)}</text><text class="dp-p" x="${xs.get(t.id)}" y="${py(t) + 13}">${esc(t.upos)}</text></g>`;
  }
  return `<svg class="dp" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="group" aria-label="Bağımlılık ağacı; sözcük seçmek için sekme ve Enter tuşlarını kullan">${lines}${nodes}</svg>`;
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
function tableHTML(toks, mwt = []){
  const mw = new Map(mwt.map(m => [m.from, m]));
  const mwRow = m => `<tr class="dp-mwt"><td>${m.from}-${m.to}</td><td colspan="6"><b>${esc(m.form)}</b> <small class="muted">çok sözcüklü belirteç: ${toks.filter(t => t.id >= m.from && t.id <= m.to).map(t => esc(t.form)).join(" + ")}</small></td></tr>`;
  return `<div class="dp-scroll" role="region" tabindex="0" aria-label="CoNLL-U tablosu, yatay kaydırılabilir"><table class="ng-tbl dp-tbl"><tr><th>ID</th><th>FORM</th><th>LEMMA</th><th>UPOS</th><th>FEATS</th><th class="sec">HEAD</th><th class="sec">DEPREL</th></tr>
  ${toks.map(t => `${mw.has(t.id) ? mwRow(mw.get(t.id)) : ""}<tr data-tok="${t.id}" class="${DS.sel === t.id ? "sel" : ""}"><td>${t.id}</td><td><b>${esc(t.form)}</b></td><td>${esc(t.lemma)}</td><td>${esc(t.upos)}</td><td class="f">${esc(t.feats === "_" ? "" : t.feats.replace(/\|/g, " · "))}</td><td class="sec">${t.head}${t.head ? ` <small>${esc(toks.find(x => x.id === t.head)?.form || "?")}</small>` : ""}</td><td class="sec">${esc(t.rel)}</td></tr>`).join("")}</table></div>`;
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
// ───────────────────────── çekim grupları (IG)
// Birden çok çözümlemesi olan sözcükte altın lemma ve UPOS ile uyuşan çözümleme seçilir; yoksa yalnızca UPOS, o da yoksa ilk çözümleme.
function pickZ(list, t){
  if(!list?.length) return null;
  const m = list.map(a => ({a:{lemma:a.l, stem:"", oflazer:a.o, pos:a.p}, ...matchZ({lemma:a.l, stem:"", oflazer:a.o, pos:a.p}, t.lemma, t.upos)}));
  return (m.find(x => x.lemma && x.upos) || m.find(x => x.upos) || m[0]).a;
}
function igHTML(toks){
  if(ZI.avail === null) return `<p class="ck-meta">Zemberek denetleniyor…</p>`;
  if(!ZI.avail) return `<p class="ck-meta">Çekim grupları için Zemberek gerekir (lib/zemberek-full.jar ve bir JDK); bulunamadı.</p>`;
  const rows = toks.map(t => {
    const a = pickZ(ZI.words[lcw(t.form)], t);
    if(!a) return `<tr><td>${t.id}</td><td><b>${esc(t.form)}</b></td><td colspan="2" class="muted">Zemberek çözümü yok</td></tr>`;
    const gs = groups(a.oflazer);
    return `<tr><td>${t.id}</td><td><b>${esc(t.form)}</b></td><td>${gs.map((g, i) => `<span class="tag" title="${i === 0 ? "kök grubu" : "türetmeyle gelen grup"}">${i === 0 ? esc(a.oflazer.split("+")[0]) + "+" : ""}${esc([g.pos, ...g.items].join("+"))}</span>`).join(" ← ")}</td><td>${gs.length}</td></tr>`;
  }).join("");
  return `<p class="ck-meta">Türkçe'de bir sözcük, türetme sınırlarıyla (^DB) çekim gruplarına (IG) bölünür; her grubun kendi sözcük türü ve çekim ekleri vardır. Aşağıda her sözcüğün altın lemma ve UPOS ile uyuşan Zemberek çözümlemesinin grupları var. Bağımlılık okları klasik Türkçe çözümlemede belirli bir gruba bağlanır; burada okların grup düzeyinde gösterimi yok.</p>
    <div class="ck-scroll" role="region" tabindex="0" aria-label="Çekim grupları tablosu"><table class="ng-tbl"><tr><th>#</th><th>Sözcük</th><th>Gruplar (türetme sırasıyla)</th><th>IG sayısı</th></tr>${rows}</table></div>`;
}
async function loadIG(){
  if(!sent) return;
  try{ if(ZI.avail === null) ZI.avail = !!(await api("/api/zemberek", {})).available; }catch(_){ ZI.avail = false; }
  if(ZI.avail){
    const need = [...new Set(sent.toks.map(t => lcw(t.form)))].filter(w => !(w in ZI.words));
    try{ for(let i = 0; i < need.length; i += 100) Object.assign(ZI.words, (await api("/api/zemberek", {ws:need.slice(i, i + 100).join("\t")})).words || {}); }catch(_){ ZI.avail = false; }
  }
  const el = $("#dpIg", root); if(el && sent) el.innerHTML = igHTML(sent.toks);
}
// ───────────────────────── geçiş tabanlı ayrıştırma (arc-standard), altın ağacı üreten eylem dizisiyle
function trHTML(toks){
  const r = oracle(toks), total = r.steps.length, k = DS.tr == null ? total : Math.max(1, Math.min(DS.tr, total));
  const nm = id => id === 0 ? "ROOT" : esc(toks.find(t => t.id === id)?.form ?? id);
  const rows = r.steps.slice(0, k).map((s, i) => `<tr class="${i === k - 1 ? "now" : ""}"><td>${i}</td><td class="mt-g">${s.stack.map(nm).join(" ") || "·"}</td><td>${s.buffer.map(nm).join(" ") || "·"}</td><td><span class="tag">${esc(s.act)}${s.rel ? " " + esc(s.rel) : ""}</span> ${esc(s.note)}</td></tr>`).join("");
  const arcs = r.steps[k - 1].arcs;
  return `<p class="ck-meta">Geçiş tabanlı ayrıştırıcı cümleyi soldan sağa işler: yığın, tampon ve üç eylem (SHIFT, LEFT-ARC, RIGHT-ARC) ile ağacı adım adım kurar. Burada eylemleri altın ağaçtan çıkaran bir kılavuz (oracle) gösterilir; gerçek bir ayrıştırıcı her adımda eylemi bir sınıflandırıcıyla seçer. Her sözcük bir kez shift ve bir kez ok olduğundan 2n adım gerekir (doğrusal zaman); grafik tabanlı yöntemler tüm olası okları puanlar.</p>
    ${r.ok ? `<label class="muted" style="font-size:.88rem;display:inline-flex;gap:8px;align-items:center">Adım <input type="range" id="dpTrIn" min="1" max="${total}" value="${k}" style="width:200px" aria-label="Geçiş adımı"> <b id="dpTrN">${k} / ${total}</b></label>
    <div class="ck-scroll" role="region" tabindex="0" aria-label="Geçiş tabanlı ayrıştırma adımları"><table class="ng-tbl mt-tbl"><tr><th>#</th><th>Yığın</th><th>Tampon</th><th>Eylem</th></tr>${rows}</table></div>
    <p class="ck-meta">Kurulan yaylar (${arcs.length}/${toks.length}): ${arcs.map(a => `${nm(a.h)} → ${nm(a.d)} <small>${esc(a.rel)}</small>`).join("; ") || "henüz yok"}</p>` : `<div class="notice warn">${esc(r.reason)}. Arc-standard yalnızca projektif ağaçları kurabilir; kesişen yayları için swap gibi ek eylemler gerekir.</div>`}`;
}
// ───────────────────────── alıştırma: ağacı kendin kur (öğrenci kipi)
function exHTML(toks){
  const ex = DS.ex, gold = toks.map(t => ({id:t.id, head:t.head, rel:t.rel}));
  const sc = ex.chk ? scoreDeps(gold, ex) : null, prob = ex.chk ? treeProblems(toks, ex.head) : [];
  const relOpts = ["", ...Object.keys(REL)];
  const rows = toks.map(t => {
    const r = sc?.rows[t.id - 1], cls = r ? (r.ok ? "ok" : r.headOk ? "half" : "bad") : "";
    const hv = ex.head[t.id], rv = ex.rel[t.id];
    return `<tr class="dp-ex-${cls}"><td>${t.id}</td><td><b>${esc(t.form)}</b> <small class="muted">${esc(t.upos)}</small></td>
      <td><select data-exh="${t.id}" aria-label="${esc(t.form)} sözcüğünün başı"><option value="">—</option><option value="0" ${hv === "0" ? "selected" : ""}>0 · kök</option>${toks.filter(x => x.id !== t.id).map(x => `<option value="${x.id}" ${hv === String(x.id) ? "selected" : ""}>${x.id} · ${esc(x.form)}</option>`).join("")}</select></td>
      <td><select data-exr="${t.id}" aria-label="${esc(t.form)} sözcüğünün ilişkisi">${relOpts.map(o => `<option value="${esc(o)}" ${rv === o ? "selected" : ""}>${o ? esc(o) : "—"}</option>`).join("")}</select></td>
      <td class="dp-ex-note">${r ? (r.ok ? "✓" : r.headOk ? `baş doğru, ilişki <b>${esc(t.rel)}</b> olmalı` : ex.shown ? `<b>${t.head ? esc(toks.find(x => x.id === t.head)?.form || "?") : "kök"}</b> · ${esc(t.rel)}` : "✗") : ""}</td></tr>`;
  }).join("");
  const verdict = sc ? `<p class="verdict" style="font-size:1.1rem">${sc.done < sc.n ? `<small class="muted">${sc.n - sc.done} sözcük boş · </small>` : ""}UAS <b>${Math.round(sc.uas * 100)}%</b> (doğru baş) · LAS <b>${Math.round(sc.las * 100)}%</b> (baş ve ilişki)${sc.las === 1 ? ' · <span class="ng-ok">Hepsi doğru ✓</span>' : ""}${ex.hints ? ` · ${ex.hints} ipucu` : ""}</p>${prob.length ? `<p class="ck-meta">Ağaç özelliği: ${prob.join(", ")}.</p>` : ""}` : "";
  return `<p class="ck-meta">Her sözcük için başını ve ilişkisini seç; sonra kontrol et. Önce yukarıdaki “etiketleri gizle” kutusunu işaretle, yoksa cevap ağaçta görünür. UAS yalnızca başı, LAS hem başı hem ilişkiyi sayar (ayrıştırıcılar böyle puanlanır).</p>
    <div class="ck-scroll" role="region" tabindex="0" aria-label="Bağımlılık alıştırması tablosu"><table class="ng-tbl dp-ex-tbl"><tr><th>#</th><th>Sözcük</th><th>Baş (HEAD)</th><th>İlişki (DEPREL)</th><th></th></tr>${rows}</table></div>
    <div class="ck-tool"><button class="btn sm" data-exact="chk">Kontrol et</button><button class="btn sm ghost" data-exact="hint">İpucu: bir başı söyle</button><button class="btn sm ghost" data-exact="show">Cevabı göster</button><button class="btn sm ghost" data-exact="reset">Sıfırla</button></div>
    <div aria-live="polite">${verdict}</div>`;
}
function render(){
  const out = $("#dpOut", root);
  if(!sent || !sent.toks.length){ out.innerHTML = '<div class="empty" style="padding:30px 0">Bir cümle seç ya da CoNLL-U yapıştır.</div>'; return; }
  const {toks, meta} = sent, c = check(toks);
  out.className = DS.hide && MODE.student ? "dp-hide" : "";
  queueMicrotask(loadIG);
  out.innerHTML = `<p class="ck-meta" style="margin-bottom:4px">${meta.sent_id ? `<span class="tag">${esc(meta.sent_id)}</span> ` : ""}${toks.length} sözcük</p>
    <p class="dp-text">${esc(meta.text || toks.map(t => t.form).join(" "))}</p>
    <div class="ng-ctl"><div class="seg" role="group" aria-label="Görünüm"><button data-dv="arc" aria-pressed="${DS.view === "arc"}">Oklar</button><button data-dv="tree" aria-pressed="${DS.view === "tree"}">Ağaç</button></div>
      <label class="chk stu"><input type="checkbox" id="dpHide" ${DS.hide ? "checked" : ""}> etiketleri gizle (önce kendin dene)</label></div>
    <div class="fig-box"><div class="fig-actions" style="margin:0 0 6px"><button class="btn sm ghost" data-export="svg" data-name="bagimlilik-${esc(meta.sent_id || "cumle")}">SVG indir</button><button class="btn sm ghost" data-export="png" data-name="bagimlilik-${esc(meta.sent_id || "cumle")}">PNG indir</button><button class="btn sm ghost" data-copy="${esc(DS.conllu)}">CoNLL-U kopyala</button></div><div class="dp-scroll dp-fig" role="region" tabindex="0" aria-label="Bağımlılık ağacı, yatay kaydırılabilir">${DS.view === "arc" ? arcSVG(toks, c) : treeSVG(toks)}</div></div>
    <div id="dpSel" aria-live="polite">${selHTML(toks)}</div>
    <h3 class="ng-h3 stu">Özellikler <small>Lecture 3, bağımlılık ağacı</small></h3>${checksHTML(toks, c)}
    <h3 class="ng-h3 stu">Bu cümledeki ilişkiler</h3>${relsHTML(toks)}
    <h3 class="ng-h3 stu">Çekim grupları <small>IG, Zemberek</small></h3><div class="stu" id="dpIg">${igHTML(toks)}</div>
    <h3 class="ng-h3 stu">Geçiş tabanlı ayrıştırma <small>arc-standard</small></h3><div class="stu" id="dpTr">${trHTML(toks)}</div>
    <h3 class="ng-h3 stu">Öğrenen ayrıştırıcı <small>perceptron, BOUN</small></h3><div class="stu" id="dpLp">${lpHTML(toks)}</div>
    <h3 class="ng-h3 stu">Kendin ekle <small>ağacı kendin kur</small></h3><div class="stu" id="dpEx">${exHTML(toks)}</div>
    <h3 class="ng-h3">CoNLL-U tablosu</h3>${sent.mwt.length ? `<p class="ck-meta stu">${sent.mwt.length} çok sözcüklü belirteç var: yazıda bitişik görünen sözcük, ağaçta ayrı düğümlere bölünür (örn. <i>${esc(sent.mwt[0].form)}</i>). Ağaç bu bölünmüş parçalar üzerine kurulur.</p>` : ""}${tableHTML(toks, sent.mwt)}`;
}
function setSent(text, id){
  sent = parseConllu(text); DS.ex = EX0(); DS.tr = null; DS.conllu = text; DS.id = id || sent.meta.sent_id || ""; DS.sel = 0; save(); render(); renderList();
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
    <div id="dpOut"></div>
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
  $("#dpTa", root).addEventListener("input", e => { const s = parseConllu(e.target.value); if(s.toks.length){ sent = s; DS.ex = EX0(); DS.tr = null; DS.conllu = e.target.value; DS.id = ""; DS.sel = 0; save(); render(); } });
  root.addEventListener("click", e => {
    const el = e.target.closest("[data-id],[data-dv],[data-tok]"); if(!el) return;
    if(el.dataset.id) return pick(el.dataset.id);
    if(el.dataset.dv){ DS.view = el.dataset.dv; save(); return render(); }
    DS.sel = +el.dataset.tok; render();
  });
  root.addEventListener("keydown", e => {
    const el = e.target.closest(".dp-word,.dp-node");
    if(!el || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    DS.sel = +el.dataset.tok;
    render();
    root.querySelector(`.dp-word[data-tok="${DS.sel}"],.dp-node[data-tok="${DS.sel}"]`)?.focus();
  });
  root.addEventListener("input", e => {
    if(e.target.id !== "dpTrIn") return;
    DS.tr = +e.target.value; $("#dpTrN", root).textContent = DS.tr + " / " + e.target.max;
    const r = $("#dpTr", root); r.innerHTML = trHTML(sent.toks); const i = $("#dpTrIn", root); i.focus();
  });
  root.addEventListener("change", e => {
    if(e.target.id === "dpHide"){ DS.hide = e.target.checked; render(); return; }
    const h = e.target.dataset.exh, r = e.target.dataset.exr;
    if(h) DS.ex.head[h] = e.target.value; else if(r) DS.ex.rel[r] = e.target.value;
  });
  root.addEventListener("click", e => {
    const lk = e.target.closest("[data-lpk]"); if(lk){ LP.kind = lk.dataset.lpk; renderLP(); return; }
    if(e.target.closest("[data-lp]")){ trainLP(); return; }
    const b = e.target.closest("[data-exact]"); if(!b || !sent) return;
    const ex = DS.ex, toks = sent.toks, act = b.dataset.exact;
    if(act === "chk") ex.chk = true;
    else if(act === "reset") DS.ex = EX0();
    else if(act === "hint"){
      const t = toks.find(x => String(ex.head[x.id]) !== String(x.head)); if(t){ ex.head[t.id] = String(t.head); ex.hints++; }
      ex.chk = true;
    }else if(act === "show"){ for(const t of toks){ ex.head[t.id] = String(t.head); ex.rel[t.id] = t.rel; } ex.chk = true; ex.shown = true; }
    $("#dpEx", root).innerHTML = exHTML(toks);
    $("#dpEx", root).querySelector(`[data-exact="${act}"]`)?.focus();
  });
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
