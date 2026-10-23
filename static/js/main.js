// Açılış: kabuk, görünümler, URL durumu.
import {state, readURL, views, VIEW_LABEL, urlSync, setView, G} from "./core.js";
const needSheet = () => state.c && !(state.v === "graph" && G.sel === state.c);   // haritada seçili düğümün kâğıdını graph.js açar (bağlantı bilgisiyle)
import {mountShell, syncShell, initSheet, initPalette, initKeys, openConcept} from "./ui.js";
import "./search.js";
import "./graph.js";
import "./relate.js";
import "./wsd.js";
import "./roles.js";
import "./frames.js";
import "./parse.js";
import "./deps.js";
import "./ngram.js";
import "./learn.js";

async function boot(){
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
