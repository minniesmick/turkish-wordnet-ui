// Benzerlik: iki sözcük arasındaki ilişki, ölçüler ve ortak üst kavramda buluşan çatal şema.
import {$, $$, esc, tr, sub, w1, POS, REL, icon, state, api, urlSync, registerView} from "./core.js";
import {openConcept} from "./ui.js";

const EX = {
  en: [["vacation","holiday"],["couch","sofa"],["dog","animal"],["mango","fruit"],["polar bear","animal"],["remove","eliminate"],["hot","cold"],["car","bicycle"],["car","gasoline"],["snore","sleep"],["walk","stroll"],["dog","cat"],["nickel","dime"]],
  kenet: [["köpek","hayvan"],["elma","meyve"],["sıcak","soğuk"],["araba","bisiklet"],["kanepe","koltuk"],["tatil","izin"]]
};
const RL = {synonym:"eş anlamlı", antonym:"zıt anlamlı", a_hypo_b:"alt kavram", a_hyper_b:"üst kavram", cousin:"ortak üst kavram"};
let root = null;

function mount(){
  if(root) return;
  root = $("#v-relate");
  root.innerHTML = `<div class="page">
    <h1 class="page-title">İki sözcük ne kadar yakın?</h1>
    <p class="lesson-intro" style="margin:0">Eş anlamlı mı, zıt mı, biri ötekinin alt kavramı mı, yoksa yalnızca ortak bir üst kavramı mı paylaşıyorlar?</p>
    <div class="pair"><label class="field">${icon("search")}<input id="ra" type="text" placeholder="1. sözcük" autocomplete="off" spellcheck="false"></label>
      <button class="iconbtn" id="rSwap" aria-label="Yer değiştir" title="Yer değiştir">${icon("swap")}</button>
      <label class="field">${icon("search")}<input id="rb" type="text" placeholder="2. sözcük" autocomplete="off" spellcheck="false"></label>
      <button class="btn pri" id="rGo" style="height:46px">Karşılaştır</button></div>
    <div class="chips" id="rEx" style="margin-top:14px"></div>
    <div id="rOut" aria-live="polite"></div></div>`;
  $("#rGo", root).addEventListener("click", run);
  $("#rSwap", root).addEventListener("click", () => { const a = $("#ra", root), b = $("#rb", root); [a.value, b.value] = [b.value, a.value]; run(); });
  for(const id of ["#ra", "#rb"]) $(id, root).addEventListener("keydown", e => { if(e.key === "Enter") run(); });
  $("#rEx", root).addEventListener("click", e => { const c = e.target.closest("[data-ra]"); if(!c) return; $("#ra", root).value = c.dataset.ra; $("#rb", root).value = c.dataset.rb; run(); });
  $("#rOut", root).addEventListener("click", e => {
    const n = e.target.closest("[data-open]"); if(n) openConcept(n.dataset.open, n.dataset.ods);
  });
}
function examples(){
  $("#rEx", root).innerHTML = (EX[state.ds] || []).map(([a, b]) => `<button class="chip" data-ra="${esc(a)}" data-rb="${esc(b)}">${esc(a)} ${icon("swap")} ${esc(b)}</button>`).join("");
}
function sentence(r, A, B){
  const a = `<b>${esc(A)}</b>`, b = `<b>${esc(B)}</b>`;
  switch(r.rel){
    case "synonym": return `${a} ve ${b} <b>eş anlamlı</b>: aynı synset'in üyeleri.`;
    case "a_hypo_b": return `${a}, ${b} sözcüğünün <b>alt kavramı</b>: ${a} bir ${b}.`;
    case "a_hyper_b": return `${a}, ${b} sözcüğünün <b>üst kavramı</b>.`;
    case "antonym": return `${a} ve ${b} <b>zıt anlamlı</b>.`;
    case "cousin": return `Doğrudan bağ yok; ikisi de <b>${esc(w1(r.lcs))}</b> altında.`;
    default: return `${a} → ${b}: <b>${esc(REL[r.rel] || r.rel)}</b> ilişkisi.`;
  }
}
const simWord = s => s >= .33 ? "yakın: benzer sözcükler" : s >= .15 ? "orta: ilişkili olabilir" : "uzak: ilişkili olsa bile benzer değil";
const meter = v => `<div class="meter"><i><b style="width:${Math.min(1, v) * 100}%"></b></i></div>`;

export async function run(){
  mount();
  state.ra = $("#ra", root).value.trim(); state.rb = $("#rb", root).value.trim(); urlSync(false);
  const out = $("#rOut", root);
  if(!state.ra || !state.rb){ out.innerHTML = ""; return; }
  out.innerHTML = '<div class="skeleton" style="height:120px;margin-top:30px"></div>';
  const j = await api("/api/relate", {ds:state.ds, a:state.ra, b:state.rb});
  if(j.error){ out.innerHTML = `<div class="empty"><b>${j.missing.map(esc).join(", ")}</b> bu sözlükte yok.<br><span style="font-size:.92rem">${state.ds === "kenet" ? "Türkçe sözcüğü yalın hâlde yaz." : "Sözcüğü yalın biçimde yaz (örn. run)."}</span></div>`; return; }
  const b = j.best;
  if(!b){ out.innerHTML = `<p class="verdict"><b>${esc(state.ra)}</b> ile <b>${esc(state.rb)}</b> arasında hiyerarşi ya da doğrudan bağ yok.</p><p class="lesson-intro">${j.nA} × ${j.nB} anlam çifti denendi. Farklı türdeki sözcükler (isim ↔ fiil) karşılaştırılamaz.</p>`; return; }
  const rows = [];
  if(b.d != null){
    rows.push(["Yol uzunluğu", `<td class="v">${b.d}</td>`, "hiyerarşide kenar sayısı", ""]);
    rows.push(["Path benzerliği", `<td class="v">${b.sim.toFixed(2)}</td>`, "1 / (yol + 1)", meter(b.sim)]);
    if(b.wup != null) rows.push(["Wu-Palmer", `<td class="v">${b.wup.toFixed(2)}</td>`, "2·derinlik(LCS) / (2·derinlik(LCS)+yol)", meter(b.wup)]);
  }
  if(b.ic){
    rows.push(["Resnik (IC)", `<td class="v">${b.ic.res.toFixed(2)}</td>`, `IC(LCS) · ${esc(w1(b.ic.lcs))}`, ""]);
    rows.push(["Lin (IC)", `<td class="v">${b.ic.lin.toFixed(2)}</td>`, "2·IC(LCS) / (IC(a)+IC(b))", meter(b.ic.lin)]);
    rows.push(["Jiang-Conrath", `<td class="v">${b.ic.jcn == null ? "∞" : b.ic.jcn.toFixed(2)}</td>`, "1 / (IC(a)+IC(b)−2·IC(LCS))", ""]);
  }
  let h = `<p class="verdict">${sentence(b, state.ra, state.rb)}</p>`;
  if(b.d != null) h += `<p class="lesson-intro" style="margin:0">${simWord(b.sim)}.</p>`;
  else if(b.rel === "antonym") h += `<p class="lesson-intro" style="margin:0">Zıt anlamlılar bir özelliğin karşıt uçlarıdır; yol uzunluğu tanımlı değil.</p>`;
  if(rows.length) h += `<table class="ledger"><tr><th>Ölçü</th><th></th><th>Formül</th><th style="width:30%"></th></tr>${rows.map(r => `<tr><th style="font:600 .92rem var(--font-ui);letter-spacing:0;text-transform:none;color:var(--ink)" ${/Wu|Lin|Resnik|Jiang/.test(r[0]) ? 'lang="en"' : ""}>${r[0]}</th>${r[1]}<td class="f">${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</table>`;
  if(b.path) h += fork(b);
  h += `<div class="row" style="margin-top:6px"><button class="btn pri sm" data-act="graph" data-id="${esc(b.a.id)}" data-ds="${state.ds}">${icon("graph")}${esc(w1(b.a))} haritada</button><button class="btn sm" data-act="graph" data-id="${esc(b.b.id)}" data-ds="${state.ds}">${icon("graph")}${esc(w1(b.b))} haritada</button></div>`;
  if(j.rows.length > 1) h += `<h3 class="lbl" style="margin:34px 0 4px">Diğer anlam çiftleri · ${j.nA} × ${j.nB} denendi</h3><table class="argtbl"><tr><th>1. sözcük anlamı</th><th>2. sözcük anlamı</th><th>İlişki</th><th>Benzerlik</th></tr>${j.rows.map(r => `<tr><td><button class="rel" data-open="${esc(r.a.id)}" data-ods="${state.ds}">${esc(w1(r.a))}</button> <span class="vt">${esc(r.a.d.slice(0, 54))}</span></td><td><button class="rel" data-open="${esc(r.b.id)}" data-ods="${state.ds}">${esc(w1(r.b))}</button> <span class="vt">${esc(r.b.d.slice(0, 54))}</span></td><td><span class="tag">${esc(RL[r.rel] || REL[r.rel] || r.rel)}</span></td><td>${r.sim.toFixed(2)}</td></tr>`).join("")}</table>`;
  out.innerHTML = h;
}

// ortak üst kavramda buluşan çatal: A ve B kolları aynı tabanda hizalı
function fork(b){
  const p = b.path, k = b.lcs_at;
  const node = (n, cls, cap) => `<button class="fnode ${cls}" data-open="${esc(n.id)}" data-ods="${state.ds}" title="${esc(n.d)}"><b>${esc(n.lits.map(l => l.w).join(" / "))}</b><small>${cap}</small></button>`;
  const left = p.slice(0, k).reverse(), right = p.slice(k + 1);
  const stem = '<span class="fstem"></span>';
  const col = (list, endCap) => list.map((n, i) => `${i ? stem : ""}${node(n, i === list.length - 1 ? "end" : "", i === list.length - 1 ? endCap : "&nbsp;")}`).join("");
  const lcs = p[k];
  return `<div class="fork" aria-label="Ortak üst kavram şeması">
    <div class="top">${node(lcs, "lcs", b.rel === "synonym" ? "aynı synset" : "ortak üst kavram")}</div>
    ${right.length ? `<div style="grid-column:1/-1;display:flex;justify-content:center"><div style="width:calc(50% + 28px);height:20px;border:1px solid var(--ink-2);border-bottom:0"></div></div>` : `<div style="grid-column:1/-1;display:flex;justify-content:center"><span class="fstem"></span></div>`}
    <div class="col l">${left.length ? col(left, "1. sözcük") : ""}</div>
    <div class="col r">${right.length ? col(right, "2. sözcük") : ""}</div>
  </div>`;
}

export const view = {
  apply(p){ if(p.a !== undefined) state.ra = p.a; if(p.b !== undefined) state.rb = p.b; if(p.ds) state.ds = p.ds; },
  async enter(){ mount(); $("#ra", root).value = state.ra; $("#rb", root).value = state.rb; examples(); if(state.ra && state.rb) await run(); else { $("#rOut", root).innerHTML = ""; if(state.ra) $("#rb", root).focus(); else $("#ra", root).focus(); } },
  dsChange(){ return this.enter(); }
};
registerView("relate", view);
