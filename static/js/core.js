// Çekirdek: DOM yardımcıları, etiketler, durum + URL, API, yerel kayıt, yönlendirme.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const tr = n => (+n).toLocaleString("tr");
export const lower = s => String(s).toLocaleLowerCase("tr");

export function hl(text, ranges){
  if(!ranges || !ranges.length) return esc(text);
  let out = "", last = 0;
  for(const [a, b] of ranges){ out += esc(text.slice(last, a)) + "<mark>" + esc(text.slice(a, b)) + "</mark>"; last = b; }
  return out + esc(text.slice(last));
}
export const sub = n => n > 0 ? `<sub>${n}</sub>` : "";
export const w1 = b => (b.lits && b.lits[0]) ? b.lits[0].w : b.id;
export const other = ds => ds === "kenet" ? "en" : "kenet";
export const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ───────────────────────── etiketler
export const POS = {n:"İsim", v:"Fiil", a:"Sıfat", b:"Zarf", i:"Ünlem", c:"Bağlaç", r:"Zamir", p:"Edat", s:"Sıfat"};
export const DSNAME = {kenet:"Türkçe · KeNet", en:"English · WordNet 3.1", "1998":"Türkçe · 1998"};
export const REL = {
  HYPERNYM:"Üst kavram", HYPONYM:"Alt kavramlar", INSTANCE_HYPERNYM:"Örneği olduğu kavram", INSTANCE_HYPONYM:"Örnekler",
  ANTONYM:"Zıt anlamlı", SIMILAR_TO:"Benzer", DERIVATION_RELATED:"Türetilmiş / ilişkili",
  PART_HOLONYM:"Ait olduğu bütün", PART_MERONYM:"Parçaları", MEMBER_HOLONYM:"Ait olduğu topluluk", MEMBER_MERONYM:"Üyeleri",
  SUBSTANCE_HOLONYM:"Bir parçası olduğu madde", SUBSTANCE_MERONYM:"Maddeleri", DOMAIN_TOPIC:"Alan / konu", MEMBER_TOPIC:"Bu alandaki kavramlar",
  DOMAIN_REGION:"Bölge", MEMBER_REGION:"Bu bölgedeki kavramlar", DOMAIN_USAGE:"Kullanım alanı", MEMBER_USAGE:"Bu kullanımdaki kavramlar",
  ATTRIBUTE:"Nitelik", ALSO_SEE:"Ayrıca bak", VERB_GROUP:"Fiil grubu", ENTAILMENT:"Gerektirir", CAUSE:"Neden olur", PARTICIPLE_OF_VERB:"Fiil ortacı"
};
export const REL_EN = {HYPERNYM:"hypernym", HYPONYM:"hyponym", ANTONYM:"antonym", PART_MERONYM:"part meronym", PART_HOLONYM:"part holonym", MEMBER_MERONYM:"member meronym", MEMBER_HOLONYM:"member holonym", INSTANCE_HYPONYM:"has-instance", INSTANCE_HYPERNYM:"instance", ENTAILMENT:"entails"};
export const REL_ORDER = Object.keys(REL);
export const relLabel = (t, pos) => pos === "v" && t === "HYPONYM" ? "Alt kavramlar (troponym)" : (REL[t] || t);
// kategori çizgi biçimiyle ayrılır: hier = düz, part = kesik, deriv = noktalı, anti = çift, xl = köprü, frame = leke renk kesik
export const REL_FAMILY = {
  HYPERNYM:"hier", HYPONYM:"hier", INSTANCE_HYPERNYM:"hier", INSTANCE_HYPONYM:"hier",
  PART_HOLONYM:"part", PART_MERONYM:"part", MEMBER_HOLONYM:"part", MEMBER_MERONYM:"part", SUBSTANCE_HOLONYM:"part", SUBSTANCE_MERONYM:"part",
  DERIVATION_RELATED:"deriv", ALSO_SEE:"deriv", ATTRIBUTE:"deriv", SIMILAR_TO:"deriv", VERB_GROUP:"deriv", DOMAIN_TOPIC:"deriv", MEMBER_TOPIC:"deriv", DOMAIN_REGION:"deriv", MEMBER_REGION:"deriv", DOMAIN_USAGE:"deriv", MEMBER_USAGE:"deriv",
  ANTONYM:"anti", ENTAILMENT:"cause", CAUSE:"cause", PARTICIPLE_OF_VERB:"deriv"
};
export const FAMILY = {
  hier:{label:"Hiyerarşi (üst–alt)", cls:""}, part:{label:"Parça–bütün", cls:"dash"}, deriv:{label:"Türetme / ilişkili", cls:"dot"},
  anti:{label:"Zıt anlamlı", cls:"dbl"}, cause:{label:"Gerektirme / neden", cls:"dd"}, xl:{label:"Türkçe ↔ İngilizce", cls:"spot"}, frame:{label:"FrameNet çerçevesi", cls:"spot dash"}
};
export const FUNC = {pag:"eylemci (proto-agent)", ppt:"etkilenen / hedef (proto-patient)", dir:"yön", loc:"yer", gol:"varış / amaç (goal)", src:"kaynak", com:"birlikte (comitative)", rec:"alıcı", tmp:"zaman", ext:"ölçü (extent)", mnr:"tarz / araç", prd:"ikincil yüklem", cau:"neden", prp:"amaç (purpose)", vsp:"özgül özellik", pat:"hasta", adv:"zarf", dis:"söylem", mod:"kip", neg:"olumsuzluk"};
export const CASEL = {nom:"yalın", acc:"-ı belirtme", dat:"-a yönelme", abl:"-dan çıkma", loc:"-da bulunma", ins:"-la araç", gen:"-ın tamlayan"};
export const FRAME_REL = {
  "Inheritance:Parent":"Bunu miras alan çerçeveler", "Inheritance:Child":"Miras aldığı çerçeveler",
  "Using:Parent":"Bunu kullanan çerçeveler", "Using:Child":"Kullandığı çerçeveler",
  "Subframe:Complex":"Alt çerçeveleri (parçaları)", "Subframe:Component":"Parçası olduğu karmaşık çerçeve",
  "Perspective_on:Neutral":"Bakış açısı çerçeveleri", "Perspective_on:Perspectivized":"Tarafsız çerçeve",
  "Precedes:Earlier":"Ardından gelen çerçeve", "Precedes:Later":"Öncesinde gelen çerçeve",
  "Causative_of:Causative":"Sonuç (inchoative / durum) çerçevesi", "Causative_of:Inchoative/state":"Nedensel (causative) çerçeve",
  "See_also:MainEntry":"Ayrıca bak", "See_also:ReferringEntry":"Ana kayıt"
};
export const FN_POS = {V:"fiil", N:"isim", A:"sıfat", ADV:"zarf", PREP:"edat", NUM:"sayı", C:"bağlaç", ART:"tanımlık", SCON:"bağlaç", IDIO:"deyim", INTJ:"ünlem"};

// ───────────────────────── simgeler (tek çizgi kalınlığı)
const P = {
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  graph:'<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8.2 7.1l2.6 8.6M15.8 7.1l-2.6 8.6M8.4 6h7.2"/>',
  scale:'<path d="M12 4v16M6 20h12M5 7h14"/><path d="M5 7l-2.6 6a3 3 0 0 0 5.2 0L5 7zM19 7l-2.6 6a3 3 0 0 0 5.2 0L19 7z"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  tag:'<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7-9.3-9.3z"/><circle cx="8" cy="9" r="1.2"/>',
  frame:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>',
  book:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  star:'<path d="M12 3.6l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  cmd:'<path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H17.5A2.5 2.5 0 1 0 15 6.5v11a2.5 2.5 0 1 0 2.5-2.5H6.5A2.5 2.5 0 1 0 9 17.5V9z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  back:'<path d="M15 5l-7 7 7 7"/>', fwd:'<path d="M9 5l7 7-7 7"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  present:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  morph:'<rect x="3.5" y="8" width="6" height="8" rx="1.2"/><rect x="10.5" y="8" width="4" height="8" rx="1.2"/><rect x="15.5" y="8" width="5" height="8" rx="1.2"/>',
  deps:'<path d="M3.5 19h17"/><path d="M5.5 19V12a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v7"/><path d="M10 19v-3a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3"/>',
  tree:'<circle cx="12" cy="5" r="2.2"/><circle cx="5.5" cy="19" r="2.2"/><circle cx="18.5" cy="19" r="2.2"/><path d="M12 7.2V12M12 12H5.5v4.8M12 12h6.5v4.8"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>', dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>', down:'<path d="M6 9l6 6 6-6"/>',
  arrowup:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  focus:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'
};
export const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

// ───────────────────────── durum
export const VIEWS = ["search","graph","relate","wsd","roles","frames","morph","parse","deps","ngram","learn"];
export const VIEW_LABEL = {search:"Ara", graph:"Harita", relate:"Benzerlik", wsd:"Anlam seçimi", roles:"Roller", frames:"Çerçeveler", morph:"Morfoloji", parse:"Ayrıştırma", deps:"Bağımlılık", ngram:"N-gram", learn:"Ders"};
export const VIEW_ICON = {search:"search", graph:"graph", relate:"scale", wsd:"target", roles:"tag", frames:"frame", morph:"morph", parse:"tree", deps:"deps", ngram:"list", learn:"book"};
export const VIEW_KEY = {search:"s", graph:"h", relate:"b", wsd:"w", roles:"r", frames:"f", morph:"m", parse:"c", deps:"k", ngram:"n", learn:"d"};
export const DS_VIEWS = ["search","graph","relate","wsd"];

// Kullanım kipi: "Araç" (client) yalnızca sonuçları verir; "Öğrenci" ders bağlantılarını, formülleri, adım adım açıklamayı, alıştırma ve sınavı da açar.
// Öğretici öğeler .stu sınıfıyla işaretlenir; kip kapalıyken CSS onları gizler (bkz. app.css).
export const STUDENT_VIEWS = new Set(["learn"]);
export const MODE = {student:false};
export const isStudent = () => MODE.student;
export function setMode(student){
  MODE.student = !!student;
  try{ localStorage.setItem("wn:mode", MODE.student ? "student" : "client"); }catch(_){}
  document.body.classList.toggle("student", MODE.student);
  emit("mode", MODE.student);
}
export function initMode(){
  let m = new URLSearchParams(location.search).get("mode");
  if(!m){ try{ m = localStorage.getItem("wn:mode"); }catch(_){} }
  MODE.student = m === "student";
  document.body.classList.toggle("student", MODE.student);
}

export const state = {
  v:"search", ds:"kenet", lex:"", q:"", field:"word", mode:"exact", sense:"", pos:new Set(), example:false, fold:false, focus:"",
  c:"", cds:"",                                           // kenar kâğıdında açık kavram
  ra:"", rb:"", wtext:"", wtarget:"", wlemma:"", wext:true
};
export const R = {lang:"en", sub:"dict", q:"", field:"lemma", mode:"exact", func:"", cs:"", fn:false, text:"Ahmet kapıyı açtı.", pred:-1};
export const F = {lang:"en", q:"", field:"name", mode:"contains", lupos:"", open:""};
export const NBS = {method:"lesk", corpus:"senseval", lemma:"interest-n", bag:true, pos:true, win:10, autoeval:false};
export const G = {id:"", ds:"kenet", up:3, kids:12, sib:false, mode:"map", sel:"", fam:{hier:true, part:true, deriv:true, anti:true, cause:true, xl:true, frame:true}};

export function readURL(){
  const p = new URLSearchParams(location.search);
  state.v = VIEWS.includes(p.get("v")) ? p.get("v") : "search";
  if(STUDENT_VIEWS.has(state.v) && !MODE.student) setMode(true);
  state.ds = ["kenet","en","1998"].includes(p.get("ds")) ? p.get("ds") : "kenet";
  state.lex = p.get("lex") || ""; state.q = p.get("q") || ""; state.field = p.get("field") || "word"; state.mode = p.get("mode") || "exact";
  state.sense = p.get("sense") || ""; state.example = p.get("example") === "1"; state.fold = p.get("fold") === "1";
  state.pos = new Set((p.get("pos") || "").split(",").filter(Boolean));
  state.focus = p.get("focus") || ""; state.c = p.get("c") || ""; state.cds = p.get("cds") || state.ds;
  state.ra = p.get("a") || ""; state.rb = p.get("b") || "";
  state.wtext = p.get("text") || ""; state.wtarget = p.get("target") || ""; state.wlemma = p.get("lemma") || ""; state.wext = p.get("ext") !== "0";
  R.sub = ["dict","label","quiz"].includes(p.get("rs")) ? p.get("rs") : "dict"; R.lang = ["tr","vn"].includes(p.get("rl")) ? p.get("rl") : "en";
  R.q = p.get("rq") || ""; R.field = p.get("rf") || ({en:"lemma", tr:"verb", vn:"member"})[R.lang]; R.mode = p.get("rm") || "exact";
  R.func = p.get("rfunc") || ""; R.cs = p.get("rcase") || ""; R.fn = p.get("rfn") === "1"; if(p.get("rtext")) R.text = p.get("rtext");
  F.lang = p.get("fl") === "tr" ? "tr" : "en"; F.q = p.get("fq") || ""; F.field = p.get("ff") || "name"; F.mode = p.get("fm") || "contains"; F.lupos = p.get("flupos") || "";
  NBS.method = p.get("wm") === "nb" ? "nb" : "lesk"; if(p.get("nc")) NBS.corpus = p.get("nc"); if(p.get("nl")) NBS.lemma = p.get("nl");
  NBS.bag = p.get("nbag") !== "0"; NBS.pos = p.get("npos") !== "0"; if(p.get("nwin")) NBS.win = +p.get("nwin");
  G.id = p.get("g") || ""; G.ds = p.get("gds") || (state.ds === "en" ? "en" : "kenet"); G.mode = p.get("gm") === "outline" ? "outline" : "map";
  if(p.get("gup")) G.up = +p.get("gup"); G.sib = p.get("gsib") === "1"; G.sel = p.get("gsel") || "";
}
export function searchParams(extra = {}){
  return new URLSearchParams({ds:state.ds, lex:state.lex, q:state.q, field:state.field, mode:state.mode, sense:state.sense,
    pos:[...state.pos].join(","), example:state.example ? 1 : 0, fold:state.fold ? 1 : 0, ...extra});
}
export function buildURL(){
  let p = new URLSearchParams();
  const v = state.v;
  if(v === "search"){
    const empty = !state.q && !state.sense && !state.pos.size && !state.example && !state.lex;
    if(!(empty && state.ds === "kenet")) p = searchParams();
    if(state.focus) p.set("focus", state.focus);
  }else{
    p.set("v", v);
    if(["relate","wsd","graph"].includes(v)) p.set("ds", state.ds);
    if(v === "relate" && (state.ra || state.rb)){ p.set("a", state.ra); p.set("b", state.rb); }
    if(v === "graph" && G.id){ p.set("g", G.id); p.set("gds", G.ds); if(G.mode === "outline") p.set("gm", "outline"); if(G.up !== 3) p.set("gup", G.up); if(G.sib) p.set("gsib", 1); if(G.sel) p.set("gsel", G.sel); }
    if(v === "roles"){ p.set("rs", R.sub);
      if(R.sub === "dict"){ p.set("rl", R.lang); if(R.q) p.set("rq", R.q); p.set("rf", R.field); p.set("rm", R.mode); if(R.func) p.set("rfunc", R.func); if(R.cs) p.set("rcase", R.cs); if(R.fn) p.set("rfn", "1"); }
      else if(R.sub === "label" && R.text) p.set("rtext", R.text); }
    if(v === "frames"){ p.set("fl", F.lang); if(F.q) p.set("fq", F.q); p.set("ff", F.field); p.set("fm", F.mode); if(F.lupos) p.set("flupos", F.lupos); }
    if(v === "wsd" && NBS.method === "nb"){ p.set("wm", "nb"); p.set("nc", NBS.corpus); p.set("nl", NBS.lemma); p.set("nbag", NBS.bag ? 1 : 0); p.set("npos", NBS.pos ? 1 : 0); p.set("nwin", NBS.win); if(state.wtext) p.set("text", state.wtext); }
    if(v === "wsd" && NBS.method === "lesk" && state.wtext){ p.set("text", state.wtext); p.set("target", state.wtarget); if(state.wlemma) p.set("lemma", state.wlemma); p.set("ext", state.wext ? 1 : 0); }
  }
  if(state.c){ p.set("c", state.c); p.set("cds", state.cds); }
  return p.toString() ? "?" + p : location.pathname;
}
let lastURL = location.search || location.pathname;
export function urlSync(push = false){
  const u = buildURL();
  if(u === lastURL) return;
  lastURL = u;
  history[push ? "pushState" : "replaceState"](null, "", u);
}

// ───────────────────────── API
let pending = 0;
const bar = () => $("#loadbar");
export async function api(path, params, signal){
  const q = params instanceof URLSearchParams ? params : new URLSearchParams(params || {});
  pending++; bar()?.classList.add("on");
  try{
    for(;;){
      const r = await fetch(path + "?" + q, {signal});
      if(r.status === 503){ $("#boot")?.classList.remove("hidden"); await new Promise(res => setTimeout(res, 1200)); continue; }
      $("#boot")?.classList.add("hidden");
      return await r.json();
    }
  }catch(e){
    if(e.name !== "AbortError") toast("Sunucuya ulaşılamadı");
    throw e;
  }finally{ if(--pending <= 0){ pending = 0; bar()?.classList.remove("on"); } }
}

// ───────────────────────── yerel kayıt (favori, iz, not)
const LS = {
  get(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(_){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
};
const bus = {};
export const on = (e, f) => (bus[e] = bus[e] || []).push(f);
export const emit = (e, d) => (bus[e] || []).forEach(f => f(d));
export const store = {
  favs: () => LS.get("wn:favs", []),
  isFav: id => LS.get("wn:favs", []).some(f => f.id === id),
  toggleFav(item){
    let f = LS.get("wn:favs", []);
    const had = f.some(x => x.id === item.id);
    f = had ? f.filter(x => x.id !== item.id) : [{...item, t:Date.now()}, ...f];
    LS.set("wn:favs", f); emit("store"); return !had;
  },
  hist: () => LS.get("wn:hist", []),
  addHist(item){
    let h = LS.get("wn:hist", []).filter(x => x.id !== item.id);
    h.unshift({...item, t:Date.now()}); LS.set("wn:hist", h.slice(0, 40)); emit("store");
  },
  clearHist(){ LS.set("wn:hist", []); emit("store"); },
  note: id => (LS.get("wn:notes", {})[id] || ""),
  setNote(id, text){ const n = LS.get("wn:notes", {}); if(text.trim()) n[id] = text; else delete n[id]; LS.set("wn:notes", n); emit("store"); },
  notes: () => LS.get("wn:notes", {}),
  pref: (k, d) => LS.get("wn:p:" + k, d),
  setPref: (k, v) => LS.set("wn:p:" + k, v),
  exportMd(){
    const notes = LS.get("wn:notes", {});
    const rows = LS.get("wn:favs", []).map(f => `- **${f.w}** _(${POS[f.pos] || f.pos}, ${DSNAME[f.ds] || f.ds})_ — ${f.def}${notes[f.id] ? `\n  - not: ${notes[f.id].replace(/\n/g, " ")}` : ""}\n  - \`${f.id}\``);
    return `# Çalışma listem\n\n${rows.join("\n") || "_(boş)_"}\n`;
  }
};
export const itemOf = (ds, s) => ({id:s.id, ds, w:w1(s), pos:s.pos, def:(s.def || "").slice(0, 140)});

// ───────────────────────── toast
let toastT;
export function toast(msg){
  const t = $("#toast"); if(!t) return;
  t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1900);
}
export async function copyText(txt, msg = "Kopyalandı"){
  try{ await navigator.clipboard.writeText(txt); toast(msg); }catch(_){ toast("Kopyalanamadı"); }
}

// ───────────────────────── yönlendirme
export const views = {};
export const registerView = (name, mod) => { views[name] = mod; };
let shellSync = () => {};
export const setShellSync = f => { shellSync = f; };
export async function setView(v, patch = {}, {push = true} = {}){
  if(STUDENT_VIEWS.has(v) && !MODE.student){ setMode(true); toast("Öğrenci kipine geçildi"); }
  if(patch.ds) state.ds = patch.ds;
  if(state.v !== v) emit("viewchange", v);
  state.v = v;
  if(v !== "search" && state.ds === "1998") state.ds = "kenet";
  if(views[v]?.apply) views[v].apply(patch);
  shellSync();
  document.title = `${VIEW_LABEL[v]} · Türkçe WordNet`;
  scrollTo({top:0});
  await views[v]?.enter?.();
  urlSync(push);
  shellSync();
}
// data-act eylemleri: slayt dersleri, çipler ve kartlar bunları kullanır
export function act(d){
  const ds = d.ds || state.ds;
  switch(d.act){
    case "search": return setView("search", {ds, q:d.q, field:"word", mode:"exact", reset:true});
    case "idsearch": return setView("search", {ds, q:d.q, field:"id", mode:"exact", reset:true});
    case "relate": return setView("relate", {ds, a:d.a, b:d.b});
    case "graph": return setView("graph", {ds, id:d.id, gds:d.gds || ds});
    case "wsd": return setView("wsd", {ds, ex:d});
    case "nb": return setView("wsd", {ds:"en", nb:d});
    case "pb": return setView("roles", {sub:"dict", lang:d.lang || "en", field:d.field || (d.lang === "tr" ? "verb" : "lemma"), q:d.q, mode:d.mode || "exact"});
    case "vn": return setView("roles", {sub:"dict", lang:"vn", field:d.field || "member", q:d.q, mode:"exact"});
    case "label": return setView("roles", {sub:"label", text:d.text});
    case "fn": return setView("frames", {lang:d.lang || "en", field:d.field || "name", q:d.name || d.q, mode:d.mode || ((d.name || (d.field || "name") === "name") ? "exact" : "contains"), open:d.name || ((d.field === "name" || !d.field) ? d.q : "")});
    case "learn": return setView("learn");
  }
}
