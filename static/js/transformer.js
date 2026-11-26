// Transformer bloğu laboratuvarı — DL-6 (slayt 12–29). Arayüz modülü; hesaplar tfm.js, HTML üretimi tfmview.js içinde.
// Encoder: girdi + konumsal kodlama → çok başlı dikkat → Add & Norm → FFN → Add & Norm.
// Decoder: maskeli öz-dikkat → encoder-decoder dikkati → FFN → Linear + softmax. Ağırlıklar eğitilmemiş (tohumdan rastgele).
import {$, esc, registerView} from "./core.js";
import {openSheetRaw} from "./ui.js";
import {runTransformer} from "./tfm.js";
import {VOCAB, words, tfmBody, cellDetail} from "./tfmview.js";

const KEY = "wn:tfm";
const S = {src: "öğrenci kitabı dikkatle okudu", tgt: "<s> the student read", dModel: 8, heads: 2, seed: 42, usePos: true, decoder: true};
let root = null, R = null, later = 0;

const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)); if(v){
  if(typeof v.src === "string") S.src = v.src.slice(0, 80); if(typeof v.tgt === "string") S.tgt = v.tgt.slice(0, 80);
  if([8, 16].includes(v.dModel)) S.dModel = v.dModel; if([1, 2, 4].includes(v.heads)) S.heads = v.heads;
  if(Number.isFinite(v.seed)) S.seed = v.seed | 0; if(typeof v.usePos === "boolean") S.usePos = v.usePos; if(typeof v.decoder === "boolean") S.decoder = v.decoder; } }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(_){} };

function render(){
  const out = $("#tfOut", root); if(!out) return;
  const src = words(S.src), tgt = S.decoder ? words(S.tgt) : [];
  if(src.length < 2){ out.innerHTML = '<div class="empty">En az iki sözcük yaz.</div>'; R = null; return; }
  const vocab = [...new Set([...VOCAB, ...tgt])];
  try{ R = runTransformer({src, tgt, vocab, dModel: S.dModel, numHeads: S.heads, seed: S.seed, usePos: S.usePos}); }
  catch(e){ out.innerHTML = `<div class="notice warn">${esc(e.message)}</div>`; R = null; return; }
  out.innerHTML = tfmBody(R, S);
}

// dikkat hücresine tıklayınca (ya da Enter) hesabı kenar kâğıdında aç
function showCell(td){
  if(!R) return;
  const d = cellDetail(R, td.dataset.tf, +td.dataset.h, +td.dataset.i, +td.dataset.j);
  if(d) openSheetRaw(d);
}

function mount(){
  root = $("#v-tfm"); if(!root) return;
  load();
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Transformer bloğu</h1>
    <p class="lesson-intro" style="margin:0">Bir cümlenin encoder bloğundan (ve isteğe bağlı decoder'dan) geçişini adım adım gör: embedding, konumsal kodlama, çok başlı dikkat, residual + LayerNorm, FFN ve sonraki sözcük olasılığı. Dikkat tablosundaki bir hücreye tıklayınca q·k hesabı, softmax ve ağırlıklı toplam açılır.<span class="stu"> DL-6, slayt 12–29.</span></p>
    <h2 class="ng-h" data-rep-skip>Cümle ve ayarlar</h2>
    <div class="ng-ctl" style="margin-top:0">
      <label class="field sm" style="flex:2 1 260px">Kaynak cümle (en çok 8 token)<input id="tfSrc" type="text" autocomplete="off" spellcheck="false"></label>
      <label class="muted">d_model <select id="tfD" class="btn sm"><option value="8">8</option><option value="16">16</option></select></label>
      <label class="muted">baş sayısı <select id="tfH" class="btn sm"><option value="1">1</option><option value="2">2</option><option value="4">4</option></select></label>
      <label class="muted">tohum <input id="tfSeed" class="dp-num" type="number" step="1"></label>
      <label class="chk"><input type="checkbox" id="tfPos"> konumsal kodlama</label>
      <label class="chk"><input type="checkbox" id="tfDec"> decoder'ı da göster</label></div>
    <div class="ng-ctl" id="tfTgtRow"><label class="field sm" style="flex:2 1 260px">Decoder girdisi (şimdiye kadar üretilen)<input id="tfTgt" type="text" autocomplete="off" spellcheck="false"></label></div>
    <div id="tfOut" aria-live="polite"></div><div style="height:56px"></div></div>`;
  $("#tfSrc", root).value = S.src; $("#tfTgt", root).value = S.tgt; $("#tfD", root).value = S.dModel; $("#tfH", root).value = S.heads;
  $("#tfSeed", root).value = S.seed; $("#tfPos", root).checked = S.usePos; $("#tfDec", root).checked = S.decoder; $("#tfTgtRow", root).classList.toggle("hidden", !S.decoder);
  const upd = fn => { fn(); save(); $("#tfTgtRow", root).classList.toggle("hidden", !S.decoder); clearTimeout(later); later = setTimeout(render, 120); };
  root.addEventListener("input", e => {
    const id = e.target.id;
    if(id === "tfSrc") upd(() => { S.src = e.target.value; });
    else if(id === "tfTgt") upd(() => { S.tgt = e.target.value; });
    else if(id === "tfSeed") upd(() => { S.seed = parseInt(e.target.value, 10) || 0; });
  });
  root.addEventListener("change", e => {
    const id = e.target.id;
    if(id === "tfD") upd(() => { S.dModel = +e.target.value; if(S.dModel % S.heads){ S.heads = 1; $("#tfH", root).value = 1; } });
    else if(id === "tfH") upd(() => { S.heads = +e.target.value; });
    else if(id === "tfPos") upd(() => { S.usePos = e.target.checked; });
    else if(id === "tfDec") upd(() => { S.decoder = e.target.checked; });
  });
  root.addEventListener("click", e => { const td = e.target.closest("td[data-tf]"); if(td) showCell(td); });
  root.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ const td = e.target.closest?.("td[data-tf]"); if(td){ e.preventDefault(); showCell(td); } } });
  render();
}

registerView("tfm", {enter(){ render(); }});
mount();
