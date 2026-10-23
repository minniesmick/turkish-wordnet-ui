// Korpus verisi: BOUN (Türkçe, UD test kümesi) ve Brown (İngilizce, SemCor cümleleri). Korpus gezgini ve N-gram aynı önbelleği kullanır.
import {api} from "./core.js";

export const CORPORA = {
  boun:{label:"BOUN · Türkçe", long:"UD Turkish-BOUN test kümesi", lang:"tr"},
  brown:{label:"Brown · İngilizce", long:"Brown Corpus (SemCor cümleleri)", lang:"en"}
};
const cache = new Map();

// {name, total, sents:[{id, f, l, p}]}; f: biçimler, l: lemmalar (yalnızca BOUN), p: UPOS (yalnızca BOUN)
export async function loadCorpus(name, n = 0){
  const key = name + ":" + (name === "brown" ? n : 0);
  if(cache.has(key)) return cache.get(key);
  const j = await api("/api/corpus", {name, n});
  const sents = name === "boun" ? j.sents : j.sents.map((t, i) => ({id:"b" + i, f:t.split(" "), l:null, p:null}));
  const c = {name, total:j.total, sents};
  cache.set(key, c);
  return c;
}
const lowerOf = name => s => name === "boun" ? s.toLocaleLowerCase("tr") : s.toLowerCase();
// birim: "form" ya da "lemma"; punct: noktalama belirteçleri dahil mi; upos: yalnızca bu etiket
export function tokensOf(c, {lemma = false, lower = true, punct = false, upos = ""} = {}){
  const lo = lowerOf(c.name);
  return c.sents.map(s => {
    const out = [];
    for(let i = 0; i < s.f.length; i++){
      if(s.p && !punct && s.p[i] === "PUNCT") continue;
      if(upos && s.p?.[i] !== upos) continue;
      const w = lemma && s.l ? s.l[i] : s.f[i];
      out.push(lower ? lo(w) : w);
    }
    return out;
  });
}
