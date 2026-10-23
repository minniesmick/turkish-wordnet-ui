// Zemberek çözümlemesini UD (BOUN) etiketlerine eşleme: yalnızca karşılaştırma için. Eşleme kararları buradadır ve bana aittir; Zemberek'in kendi etiket kümesi UD değildir.
// BOUN'da sıfat-fiil, ad-fiil ve zarf-fiil sözcükleri VERB (VerbForm=Part / Vnoun / Conv) olarak etiketlidir; ek-fiil (-DHr, -(y)DH) sözcüğün kendi türünü korur.
// Saf JS, DOM yok.

const POS = {Noun:"NOUN", Adj:"ADJ", Adv:"ADV", Adverb:"ADV", Verb:"VERB", Pron:"PRON", Det:"DET", Conj:"CCONJ", Postp:"ADP", Num:"NUM", Ques:"AUX", Interj:"INTJ", Punc:"PUNCT", Dup:"ADV"};
// fiilden türeyip BOUN'da VERB kalan türetme ekleri
const VERBAL = new Set(["Inf1", "Inf2", "Inf3", "PastPart", "PresPart", "FutPart", "NarrPart", "AorPart", "ByDoingSo", "AfterDoing", "When", "While", "SinceDoingSo", "AsLongAs", "WithoutHavingDoneSo", "WithoutBeingAbleToHaveDoneSo", "AfterDoingSo", "Able", "Acquire", "Become"]);

// "kök+Noun+A3sg^DB+Verb+Zero+Past+A3sg" -> [{pos, items:[...]}]
export function groups(oflazer){
  return oflazer.split("^DB+").map((g, i) => { const p = g.split("+"); if(i === 0) p.shift(); return {pos:p[0], items:p.slice(1)}; });
}
export function zUpos(oflazer){
  const gs = groups(oflazer);
  // ek-fiil (Zero) grubu sözcüğün kendi türünü değiştirmez: bir önceki gruba bak
  let k = gs.length - 1;
  while(k > 0 && gs[k].pos === "Verb" && gs[k].items[0] === "Zero") k--;
  const g = gs[k], prev = gs[k - 1];
  if(prev && prev.pos === "Verb" && g.pos !== "Verb" && g.items.some(x => VERBAL.has(x))) return "VERB";
  if(g.pos === "Noun" && g.items.includes("Prop")) return "PROPN";
  return POS[g.pos] || "X";
}
// sözlük maddesi "gelmek" -> "gel"; BOUN lemması kök biçimindedir
export function zLemma(a){
  const l = (a.lemma || a.stem || "").toLocaleLowerCase("tr");
  const rootVerb = a.oflazer ? groups(a.oflazer)[0].pos === "Verb" : a.pos === "Verb";   // a.pos son türetmenin türüdür; sözlük maddesinin türü ilk grupta
  return rootVerb && /m[ae]k$/.test(l) ? l.slice(0, -3) : l;
}
export const lcTr = s => s.toLocaleLowerCase("tr");
// Zemberek çözümlemesi gold ile hangi ölçütlerle uyuşuyor: lemma (sözlük maddesi ya da yüzey kök) ve UPOS
export function matchZ(a, goldLemma, goldUpos){
  const gl = lcTr(goldLemma);
  return {lemma:zLemma(a) === gl || lcTr(a.stem || "") === gl, upos:zUpos(a.oflazer) === goldUpos};
}

// ───────────────────────── Zemberek ile bizim yöntemlerin karşılaştırması
// Sınama cümlelerinde Zemberek'in cümle düzeyindeki seçimi, aday kümesi ve bizim üç yöntemimiz; ölçüt: kök (lemma) ve UPOS. Noktalama sayılmaz.
// Zemberek kendi tokenlaştırmasını yapar: sözcük sayısı BOUN'la uymayan cümle atlanır.
export const newTally = () => ({n:0, sents:0, skipped:0, rows:{zem:{l:0, u:0, b:0}, zemAny:{l:0, u:0, b:0}, base:{l:0, u:0, b:0}, dl:{l:0, u:0, b:0}, ap:{l:0, u:0, b:0}}});
// s: {f, l, p}; mine: md.analyze çıktısı; zws: Zemberek cümle çıktısı words[] ({best, all})
export function tallySentence(T, s, mine, zws, uposOf){
  if(!zws || zws.length !== s.f.length){ T.skipped++; return false; }
  T.sents++;
  const R = T.rows;
  for(let i = 0; i < s.f.length; i++){
    if(s.p[i] === "PUNCT") continue;
    T.n++;
    const gl = lcTr(s.l[i]), add = (r, l, u) => { r.l += l ? 1 : 0; r.u += u ? 1 : 0; r.b += l && u ? 1 : 0; };
    const b = matchZ(zws[i].best, s.l[i], s.p[i]);
    add(R.zem, b.lemma, b.upos);
    const all = zws[i].all.map(a => matchZ(a, s.l[i], s.p[i]));
    R.zemAny.l += all.some(x => x.lemma) ? 1 : 0; R.zemAny.u += all.some(x => x.upos) ? 1 : 0; R.zemAny.b += all.some(x => x.lemma && x.upos) ? 1 : 0;
    const t = mine[i];
    for(const [m, tag] of [["base", t.base], ["dl", t.dl.tag], ["ap", t.ap.tag]]){
      const c = t.cands.find(x => x.tag === tag);
      add(R[m], c && c.lemma && lcTr(c.lemma) === gl, uposOf(tag) === s.p[i]);
    }
  }
  return true;
}
