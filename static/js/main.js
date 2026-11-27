// Açılış: kabuk, görünümler, URL durumu.
import {state, readURL, views, VIEW_LABEL, urlSync, setView, G, initMode} from "./core.js";
import {initExt} from "./extra.js";
import {clampNumber} from "./safe.js";
const needSheet = () => state.c && !(state.v === "graph" && G.sel === state.c);   // haritada seçili düğümün kâğıdını graph.js açar (bağlantı bilgisiyle)
import {mountShell, syncShell, initSheet, initPalette, initKeys, openConcept} from "./ui.js";
import "./search.js";
import "./graph.js";
import "./relate.js";
import "./wsd.js";
import "./roles.js";
import "./frames.js";
import "./morph.js";
import "./disamb.js";
import "./parse.js";
import "./deps.js";
import "./corpus.js";
import "./ngram.js";
import "./nnlab.js";
import "./textrep.js";
import "./embedding.js";
import "./rnnlab.js";
import "./attention.js";
import "./transformer.js";
import "./decodelab.js";
import "./evallab.js";
import "./tablab.js";
import "./methodlab.js";
import "./exportfig.js";
import "./learn.js";

// Sayı kutusuna sınır dışı ya da boş değer yazılırsa, laboratuvar okumadan önce düzeltilir (yakalama evresi).
document.addEventListener("change", e => {
  const el = e.target;
  if(!el.matches?.('input[type="number"]')) return;
  const min = el.min === "" ? NaN : +el.min, max = el.max === "" ? NaN : +el.max;
  const v = clampNumber(el.value, min, max, clampNumber(el.defaultValue, min, max, Number.isFinite(min) ? min : 0));
  if(el.value !== String(v)) el.value = v;
}, true);

async function boot(){
  initMode(); initExt();
  mountShell(); initSheet(); initPalette(); initKeys();
  readURL();
  syncShell();
  document.title = `${VIEW_LABEL[state.v]} · Türkçe WordNet`;
  await views[state.v].enter();
  syncShell();
  if(needSheet()) openConcept(state.c, state.cds);
}
addEventListener("popstate", async () => {
  readURL(); syncShell();
  document.title = `${VIEW_LABEL[state.v]} · Türkçe WordNet`;
  await views[state.v].enter();
  syncShell();
  if(needSheet()) openConcept(state.c, state.cds);
});
boot();
