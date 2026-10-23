// Oflazer'in Türkçe sonlu durum makineleri (Nouns / Verbs1 / Verbs2 şekilleri): bir Zemberek çözümlemesinin durumlar arasındaki yolunu çıkarır.
// Kenarlar ders PDF'lerindeki şekillerden elle kodlandı; Sample.pdf'teki üç yol (küçükler, uyuyordur, uyumaktadır) test olarak birebir tutuyor.
// Şekillerde olmayan ya da burada kodlanmayan geçişlerde yol, o ekte "kodlanmadı" diye kesilir. Saf JS, DOM yok.

export const STATE_NAME = {
  1:"Başlangıç", 2:"Nominal Root", 3:"Plural", 4:"Possessive", 5:"Case 1", 6:"End", 7:"End (Acc)", 8:"End (-CA)", 9:"Possessive 3", 10:"End", 11:"End", 12:"Case 2", 13:"Relative",
  14:"Nominal Verb 1", 15:"End", 16:"Nominal Verb 2", 17:"Nom. Verb 2 Pers", 18:"End", 20:"End", 21:"Nominal Verb 4", 22:"End", 23:"End",
  101:"Verbal Root", 102:"Reflexive", 103:"Reciprocal", 104:"Causative Dir", 105:"Causative t", 106:"Passive Hl", 107:"Passive Hn", 108:"Negative ma", 109:"Negative yama", 111:"Negative Aorist",
  112:"Positive", 113:"Verbal Stem", 118:"Infinitive", 119:"End", 120:"Other Tense", 121:"Optative", 122:"Imperative", 123:"Definite Past", 1230:"Subjunctive", 125:"Other Tense Pers.", 126:"Optative Pers.",
  127:"Imperative Pers.", 128:"Past Pers.", 130:"End", 1080:"Negative ma (2)", 1130:"Verbal Stem (neg Hyor)", 1131:"Verbal Stem (Hyor, Aor)", 1200:"Other Tense (0)", 1260:"End", 1270:"End", 1280:"End",
  109:"Negative yama", 110:"Negative Pers.", 114:"Adverb 1", 115:"Adverb 2", 1100:"End", 1101:"Neg. Aorist 2nd tense (Verbs2 1100)", 1111:"End", 124:"Other Tense 3rd Pers.", 129:"End",
  132:"2nd Tense Definite Past", 133:"2nd Tense Narrative Past", 1320:"2nd Tense (before Past)", 1321:"2nd Tense (after +ysA)", 1322:"2nd Tense Conditional", 1330:"2nd Tense (before Narr)", 135:"End", 136:"End", 1271:"Imperative (AsIf)", 1272:"End"
};
export const END = new Set([6, 7, 8, 10, 11, 15, 18, 20, 22, 23, 117, 119, 129, 130, 135, 136, 1100, 1111, 1260, 1270, 1272, 1280]);

// [from, to, token, tag, flags]  flags: s = sessiz (hiçbir belirteç tüketmeden 0 ile geçilebilir), e = bitiş durumuna gider, r = sonraki belirteç Rel ise, p = sonraki belirteç Prog1 ise, q = sonraki belirteç Past ise, w = sonraki belirteç While / AsIf ise, n = önceki belirteç kişi eki ise, a = şekilde yok (varsayım), i = şekilde var, bağlantısı çizgi kesişiminden yorumlandı (çıkarım)
const E = [];
const edge = (f, t, on, tag, fl = "") => E.push({f:String(f), t:String(t), on, tag, silent:fl.includes("s"), nextRel:fl.includes("r"), nextProg:fl.includes("p"), nextPast:fl.includes("q"), nextWhile:fl.includes("w"), afterPers:fl.includes("n"), assumed:fl.includes("a"), inferred:fl.includes("i")});

// ───── isimler (Figure 4.2)
edge(1, 2, "Noun", ""); edge(1, 2, "Adj", ""); edge(1, 101, "Verb", "");
edge(2, 3, "A3sg", "0 (sing)", "s"); edge(2, 3, "A3pl", "+lAr");
for(const [id, tag] of [["Pnon", "0"], ["P1sg", "+Hm"], ["P2sg", "+Hn"], ["P1pl", "+HmHz"], ["P2pl", "+HnHz"]]) edge(3, 4, id, tag, id === "Pnon" ? "s" : "");
edge(3, 9, "P3sg", "+sH"); edge(3, 9, "P3pl", "+lArH");
const CASE4 = [["Nom", "0"], ["Dat", "+yA"], ["Loc", "+DA"], ["Abl", "+DAn"], ["Gen", "+nHn"], ["Ins", "+ylA"]];
for(const [id, tag] of CASE4) edge(4, 5, id, tag, id === "Nom" ? "s" : "");
edge(4, 7, "Acc", "+yH"); edge(4, 8, "Equ", "+CA");
edge(4, 12, "Loc", "+DA", "r"); edge(4, 12, "Gen", "+nHn", "r");
for(const [id, tag] of [["Nom", "0"], ["Dat", "+nA"], ["Loc", "+ndA"], ["Abl", "+ndAn"], ["Gen", "+nHn"], ["Ins", "+ylA"]]){ edge(9, 5, id, tag, id === "Nom" ? "s" : ""); edge(13, 5, id, tag, id === "Nom" ? "s" : ""); }
edge(9, 10, "Acc", "+n"); edge(9, 11, "Equ", "+CA"); edge(9, 12, "Loc", "+ndA", "r"); edge(9, 12, "Gen", "+nHn", "r");
edge(12, 13, "Rel", "+ki"); edge(13, 12, "Loc", "+ndA", "r"); edge(13, 12, "Gen", "+nHn", "r"); edge(13, 3, "A3pl", "+lAr");
edge(5, 6, "", "0", "se");
const PERS_NOM = [["A1sg", "+yHm"], ["A2sg", "+sHn"], ["A3sg", "0"], ["A1pl", "+yHz"], ["A2pl", "+sHnHz"], ["A3pl", "+lAr"]];
for(const [id, tag] of PERS_NOM){ edge(5, 20, id, tag); edge(13, 20, id, tag); }
edge(5, 21, "Cop", "+DHr"); edge(13, 21, "Cop", "+DHr"); edge(21, 22, "A3pl", "+lAr"); edge(21, 22, "", "0", "se");
edge(5, 23, "While", "+yken");
edge(5, 14, "Past", "+yDH"); edge(5, 14, "Cond", "+ysA"); edge(5, 16, "Narr", "+ymHş");
for(const [id, tag] of [["A1sg", "+m"], ["A2sg", "+n"], ["A3sg", "0"], ["A1pl", "+k"], ["A2pl", "+nHz"], ["A3pl", "+lAr"]]) edge(14, 15, id, tag);
for(const [id, tag] of [["A1sg", "+Hm"], ["A2sg", "+sHn"], ["A3sg", "0"], ["A1pl", "+Hz"], ["A2pl", "+sHnHz"], ["A3pl", "+lAr"]]) edge(16, 17, id, tag);
edge(17, 18, "Cop", "+DHr"); edge(17, 18, "", "0", "se");
// türetme: 2'ye geri dönüş
edge(2, 2, "Ness", "+lHk"); edge(2, 2, "Agt", "+CH"); edge(3, 2, "With", "+lH"); edge(3, 2, "Without", "+sHz");
// ───── fiiller (Figure 4.3)
edge(101, 102, "Reflex", "+Hn"); edge(101, 103, "Recip", "+Hş");
edge(101, 104, "Caus", "+DHr", "a"); edge(101, 105, "Caus", "+t", "a");
edge(102, 104, "Caus", "+DHr"); edge(103, 104, "Caus", "+DHr"); edge(104, 105, "Caus", "+t"); edge(105, 104, "Caus", "+DHr");
for(const f of [102, 103, 104, 105]){ edge(f, 106, "Pass", "+Hl"); edge(f, 106, "", "0", "s"); }
edge(101, 106, "", "0", "s"); edge(101, 107, "", "0", "s");
edge(106, 107, "Pass", "+Hn"); edge(106, 107, "", "0", "s");
edge(107, 108, "Neg", "+mA"); edge(107, 1130, "Neg", "+mH(neg)", "p");
edge(107, 112, "Pos", "0"); edge(107, 112, "Able", "+yAbil");
edge(108, 113, "", "0", "s"); edge(108, 111, "Aor", "+z");
edge(112, 113, "", "0", "s"); edge(112, 1131, "", "0", "s");
edge(113, 118, "Inf1", "+mAk");
for(const [id, tag] of [["Loc", "+DA"], ["Abl", "+DAn"], ["Ins", "+ylA"], ["Dat", "+yA"]]) edge(118, 5, id, tag);
edge(118, 5, "Nom", "0", "s");
for(const [id, tag] of [["Inf2", "+mA"], ["Inf3", "+yHş"], ["PresPart", "+yAn"], ["FutPart", "+yAcAk"], ["PastPart", "+DHk"], ["NarrPart", "+mHş"], ["Fut", "+yAcAk"]]) edge(113, 2, id, tag);
edge(113, 114, "ByDoingSo", "+yArAk"); edge(114, 119, "", "+DAn, 0", "se"); edge(113, 115, "When", "+yHncA"); edge(115, 119, "", "+yA, 0", "se");
for(const [id, tag] of [["AfterDoingSo", "+yHp"], ["AfterDoing", "+yHp"], ["SinceDoingSo", "+yAlH"], ["AsLongAs", "+DHkçA"]]) edge(113, 119, id, tag);
for(const id of ["WithoutHavingDoneSo", "WithoutBeingAbleToHaveDoneSo"]) edge(112, 117, id, "+mAdAn");
edge(113, 120, "Narr", "+mHş"); edge(113, 121, "Opt", "+yA"); edge(113, 122, "Imp", "0"); edge(113, 123, "Past", "+DH"); edge(113, 1230, "Cond", "+sA");
// ───── fiiller devam (Figure 4.4)
edge(1130, 120, "Prog1", "+Hyor"); edge(1131, 120, "Prog1", "+Hyor"); edge(1131, 120, "Aor", "+Hr, +Ar");
edge(120, 1200, "", "0", "s");
for(const [id, tag] of PERS_NOM) edge(1200, 125, id, tag);
edge(1200, 125, "", "0", "s");
edge(125, 130, "Cop", "+DHr"); edge(125, 130, "", "0", "se");
for(const [id, tag] of [["A1sg", "+yHm"], ["A2sg", "+sHn"], ["A3sg", "0"], ["A1pl", "+yHz"], ["A2pl", "+sHnHz"], ["A3pl", "+lAr"]]) edge(121, 126, id, tag);
edge(121, 126, "", "0", "s"); edge(126, 1260, "", "0", "se");
for(const [id, tag] of [["A2sg", "0"], ["A2pl", "+yHnHz"], ["A3sg", "+sHn"], ["A3pl", "+sHnlAr"]]) edge(122, 127, id, tag);
edge(122, 127, "", "0", "s"); edge(127, 1270, "", "0", "se");
for(const [id, tag] of [["A1sg", "+m"], ["A2sg", "+n"], ["A3sg", "0"], ["A1pl", "+k"], ["A2pl", "+nHz"], ["A3pl", "+lAr"]]){ edge(123, 128, id, tag); edge(1230, 128, id, tag); }
edge(123, 128, "", "0", "s"); edge(1230, 128, "", "0", "s"); edge(128, 1280, "", "0", "se");
// ───── Verbs1 / Verbs2'den sonradan eklenenler
// yetersizlik (+yAmA), kip türevleri, etken ad (+yHcH), Desr
edge(107, 109, "Unable", "+yAmA"); edge(109, 113, "Able", "+yAbil"); edge(109, 113, "", "0", "s"); edge(109, 111, "Aor", "+z");
for(const [id, tag] of [["Repeat", "+yAdur"], ["Hastily", "+yHver"], ["EverSince", "+yAgel"], ["Almost", "+yAyaz"], ["Stay", "+yAkal"], ["Start", "+yAkoy"]]) edge(107, 112, id, tag);
for(const [id, tag] of [["Repeat", "+yAdur"], ["Hastily", "+yHver"], ["EverSince", "+yAgel"]]) edge(108, 113, id, tag);
edge(112, 2, "Agt", "+yHcH"); edge(113, 1230, "Desr", "+sA");
// olumsuz geniş zaman: şekilde kişi ekleri (+m, +zsHn, +z, +yHz, +zsHnHz, +zlAr) geniş zaman ekini de içerir; Zemberek Aor ve kişiyi ayrı belirteç yazar, bu yüzden "Aor+Kişi" tek kenar
edge(108, 1080, "", "0", "s");
for(const [id, tag] of [["A1sg", "+m"], ["A2sg", "+zsHn"], ["A3sg", "+z"], ["A1pl", "+yHz"], ["A2pl", "+zsHnHz"], ["A3pl", "+zlAr"]]){ edge(1080, 110, "Aor+" + id, tag); edge(109, 110, "Aor+" + id, tag); }
edge(110, 1100, "", "0 (decl)", "se");
// 111 -> Verbs2'deki "1100" kutusu; Verbs1'deki bitiş çemberi de 1100 diye çizilmiş, burada kutu 1101 diye ayrıldı
edge(111, 1101, "Narr", "+mH");
const PERS_NARR = [["A1sg", "+yHm"], ["A2sg", "+sHn"], ["A3sg", "0"], ["A1pl", "+yHz"], ["A2pl", "+sHnHz"], ["A3pl", "+lAr"]];
for(const [id, tag] of PERS_NARR) edge(1101, 1111, id, tag);
// "0, +mH" okları: kişi ekinden ya da kipten sonra isteğe bağlı +mH (Narr)
edge(120, 1200, "Narr", "+mH"); edge(126, 1260, "Narr", "+mH", "n"); edge(128, 1280, "Narr", "+mH", "n");
edge(122, 1271, "AsIf", "+cAsHnA"); edge(1271, 1272, "", "0", "se"); edge(1271, 1272, "Narr", "+mH", "n");
edge(120, 124, "A1pl", "+k", "w"); edge(120, 124, "A3pl", "+lAr", "w"); edge(124, 129, "AsIf", "+cAsHnA"); edge(124, 129, "While", "+yken");
// bileşik zamanlar (Figure 4.4 altı): 1320 +yDH, 1321 +ysA, 1330 +ymHş. Birinci zaman durumlarından bu üç durumun girişlerine giden uzun yatay çizgiler kesişiyor;
// hangi durumdan hangisine gidildiği dil bilgisine göre yorumlandı (çıkarım): geniş / şimdiki / duyulan geçmiş / istek / koşul / belirli geçmişten sonra ikinci zaman gelir
for(const s of [111, 120, 121, 123, 1230]){
  edge(s, 1320, "", "0", "si"); edge(s, 1320, "Narr", "+mH", "qi"); edge(s, 1330, "", "0", "si"); edge(s, 1321, "Cond", "+ysA", "i");
}
const PERS_PAST = [["A1sg", "+m"], ["A2sg", "+n"], ["A3sg", "0"], ["A1pl", "+k"], ["A2pl", "+nHz"], ["A3pl", "+lAr"]];
edge(1320, 132, "Past", "+yDH");
for(const [id, tag] of PERS_PAST){ edge(132, 135, id, tag); edge(1321, 1322, id, tag); }
edge(132, 135, "", "0", "se"); edge(1321, 1322, "", "0", "s"); edge(1322, 135, "", "0", "se"); edge(1322, 135, "Narr", "+mH", "n");
edge(1330, 133, "Narr", "+ymHş");
for(const [id, tag] of PERS_NARR) edge(133, 136, id, tag);
edge(133, 136, "", "0", "se"); edge(133, 129, "AsIf", "+cAsHnA");
// isim kökü gibi davranan, şekilde olmayan kökler (varsayım)
edge(1, 2, "Pron", "", "a"); edge(1, 2, "Num", "", "a");

// belirli durumlarda sessizce yutulan belirteçler (şekilde karşılığı olmayan Zemberek etiketleri)
const SKIP = {112:new Set(["Pos"]), 118:new Set(["A3sg", "Pnon"]), 5:new Set(["Verb", "Pres", "Zero"]), 13:new Set(["Verb", "Pres", "Zero"]), 21:new Set(["A3sg"]), 2:new Set(["Time", "Abbrv", "Quant", "Card", "Ord", "Prop", "Pers", "Demons", "Reflex", "Ques", "Real", "Dist", "Range", "Ratio"])};
const LEXPOS = new Set(["Noun", "Adj", "Verb", "Pron", "Adv", "Det", "Conj", "Postp", "Num", "Ques", "Interj", "Punc", "Dup"]);
const VOICES = new Set(["Caus", "Pass", "Reflex", "Recip", "Able", "Repeat", "Hastily", "EverSince", "Almost", "Stay", "Start"]);
const TAMS = new Set(["Aor", "Prog1", "Prog2", "Past", "Narr", "Fut", "Cond", "Imp", "Opt", "Neces", "Pres", "Cop", "Inf1", "Inf2", "Inf3", "PastPart", "PresPart", "FutPart", "AorPart", "NarrPart", "Neg"]);
const NUM = new Set(["A3sg", "A3pl"]), POSS = new Set(["Pnon", "P1sg", "P2sg", "P3sg", "P1pl", "P2pl", "P3pl"]), CASES = new Set(["Nom", "Acc", "Dat", "Loc", "Abl", "Gen", "Ins", "Equ"]);

// Zemberek Oflazer biçimi: köpek+Noun+A3sg^DB+Verb+Zero+Pres+A3pl  ->  kök + belirteç listesi (db: türetme sınırından sonraki ilk belirteç)
export function parseOflazer(s){
  const groups = s.split("^DB+"), first = groups[0].split("+"), stem = first.shift(), toks = [];
  first.forEach(t => toks.push({id:t, db:false, implicit:false}));
  for(const g of groups.slice(1)) g.split("+").forEach((t, i) => toks.push({id:t, db:i === 0, implicit:false}));
  return {stem, toks};
}
// Oflazer'in tam etiketlenmiş biçimini kurmak için sıfır morfemleri ekler (Pnon, Nom, Pos); sıfır dönüşümü (Zero) ve özel ad işaretini atar
export function normalize(toks){
  const out = [];
  let i = 0;
  const groups = [];
  for(const t of toks){
    if(t.db || !groups.length){   // türetme sınırından sonraki ilk belirteç ve ilk belirteç her zaman sözcük türüdür (Noun, Verb, Adverb, Postp ...)
      if(t.db && t.id === "Verb" && groups[groups.length - 1]?.pos === "Verb") continue;   // fiil -> fiil türetmesi (Able vb.) aynı gövdede sayılır
      groups.push({pos:t.id, db:t.db, items:[]});
    }else groups[groups.length - 1].items.push(t);
  }
  groups.forEach((g, gi) => {
    const nominalVerb = g.items.some(t => t.id === "Zero");
    const items = g.items.filter(t => t.id !== "Zero" && t.id !== "Prop");
    out.push({id:g.pos, db:g.db, implicit:false});
    if(g.pos === "Noun" || g.pos === "Pron"){
      let body = items.slice();
      const p3pl = body.some(t => t.id === "P3pl");
      if(p3pl) body = body.filter(t => t.id !== "A3sg");
      let skipNum = false;
      const nextFirst = groups[gi + 1]?.items.find(t => t.id !== "Zero")?.id;
      if(body.length === 1 && body[0].id === "A3sg" && (nextFirst === "Ness" || nextFirst === "Agt")) body = [], skipNum = true;   // şekilde -lHk / -CH, çoğuldan önce 2 -> 2 döngüsüdür; sıfır A3sg tüketilmez
      const isNom = t => NUM.has(t.id) || POSS.has(t.id) || CASES.has(t.id);
      const nextG = groups[gi + 1], hasCase = body.some(t => CASES.has(t.id));
      const complete = !nextG || (nextG.pos === "Verb" && nextG.items.some(t => t.id === "Zero"));   // başka bir türetme geliyorsa Pnon/Nom yazılmaz
      const lead = body.findIndex(isNom);                               // başta türetme ekleri olabilir (Inf1, PastPart, Ness ...)
      if(!p3pl && !skipNum && !body.some(t => NUM.has(t.id))) body.splice(lead < 0 ? body.length : lead, 0, {id:"A3sg", db:false, implicit:true});
      const lastOf = pred => { let k = -1; body.forEach((t, i) => { if(pred(t)) k = i; }); return k; };
      if((complete || hasCase) && !body.some(t => POSS.has(t.id))) body.splice(lastOf(t => NUM.has(t.id)) + 1, 0, {id:"Pnon", db:false, implicit:true});
      if(complete && !hasCase) body.splice(lastOf(t => NUM.has(t.id) || POSS.has(t.id)) + 1, 0, {id:"Nom", db:false, implicit:true});
      out.push(...body);
    }else if(g.pos === "Verb"){
      const body = items.slice();
      if(!nominalVerb && !body.some(t => t.id === "Pos" || t.id === "Neg" || t.id === "Unable")){
        let at = 0; while(at < body.length && VOICES.has(body[at].id)) at++;
        body.splice(at, 0, {id:"Pos", db:false, implicit:true});
      }
      out.push(...body);
    }else out.push(...items);
  });
  return out;
}

const fmt = (stem, toks) => {
  let s = stem;
  toks.forEach((t, i) => { s += (t.db ? "^DB+" : "+") + t.id; });
  return s;
};
const byFrom = new Map();
for(const e of E){ if(!byFrom.has(e.f)) byFrom.set(e.f, []); byFrom.get(e.f).push(e); }
const direct = (st, tok, next, prev) => (byFrom.get(st) || [])
  .filter(e => e.on === tok && (!e.nextRel || next === "Rel") && (!e.nextProg || next === "Prog1") && (!e.nextPast || next === "Past") && (!e.nextWhile || next === "While" || next === "AsIf") && (!e.afterPers || PERS.has(prev)))
  .sort((a, b) => (b.nextRel || b.nextProg || b.nextPast || b.nextWhile) - (a.nextRel || a.nextProg || a.nextPast || a.nextWhile))[0];   // koşullu kenar (sonraki belirteç Rel / Prog1) önce denenir
// sessiz (0) kenarlarla tok'u tüketebilen bir duruma en kısa yol (BFS)
function route(st, tok, next, prev){
  const q = [[st, []]], seen = new Set([st]);
  while(q.length){
    const [cur, path] = q.shift();
    const d = direct(cur, tok, next, prev);
    if(d) return {path, edge:d};
    for(const e of byFrom.get(cur) || []){
      if(e.silent && !e.end && !seen.has(e.t) && !END.has(+e.t)){ seen.add(e.t); q.push([e.t, [...path, e]]); }
    }
  }
  return null;
}
function toEnd(st){
  if(END.has(+st)) return {path:[]};
  const q = [[st, []]], seen = new Set([st]);
  while(q.length){
    const [cur, path] = q.shift();
    for(const e of byFrom.get(cur) || []){
      if(!e.silent) continue;
      const np = [...path, e];
      if(END.has(+e.t)) return {path:np};
      if(!seen.has(e.t)){ seen.add(e.t); q.push([e.t, np]); }
    }
  }
  return null;
}

const PERS = new Set(["A1sg", "A2sg", "A3sg", "A1pl", "A2pl", "A3pl"]);
// Zemberek -mAktA (Prog2); Oflazer'de ad-fiil + bulunma durumu + ek-fiil olarak çözümlenir (Sample.pdf'teki uyumaktadır yolu)
function expandProg2(raw){
  const out = [];
  for(const t of raw){
    if(t.id !== "Prog2"){ out.push(t); continue; }
    out.push({id:"Noun", db:true, implicit:false}, {id:"Inf1", db:false, implicit:false}, {id:"A3sg", db:false, implicit:false}, {id:"Loc", db:false, implicit:false}, {id:"Verb", db:true, implicit:false}, {id:"Zero", db:false, implicit:false}, {id:"Pres", db:false, implicit:false});
  }
  return out;
}
// ana işlev: Zemberek Oflazer dizesinden adım listesi üretir
export function trace(oflazer){
  const {stem, toks: raw0} = parseOflazer(oflazer), raw = expandProg2(raw0), toks = normalize(raw), steps = [];
  let st = "1", i = 0;
  const lex = n => fmt(stem, toks.slice(0, n));
  while(i < toks.length){
    const tok = toks[i], next = toks[i + 1]?.db ? toks[i + 2]?.id : toks[i + 1]?.id;   // türetme sınırı işaretini atlayarak bir sonraki ek
    if(tok.id === "Aor" && PERS.has(toks[i + 1]?.id)){          // olumsuz geniş zaman: Aor ve kişi eki tek kenarda
      const pr = route(st, "Aor+" + toks[i + 1].id);
      if(pr){
        const to = pr.edge.t;
        steps.push({from:st, via:pr.path.map(e => e.t), to, tag:pr.edge.tag, states:[st, ...pr.path.map(e => e.t), to], lex:lex(i + 2), assumed:pr.edge.assumed || pr.path.some(e => e.assumed), inferred:pr.edge.inferred || pr.path.some(e => e.inferred), token:"Aor+" + toks[i + 1].id});
        st = to; i += 2; continue;
      }
    }
    if(i > 0 && tok.db && !direct(st, tok.id, next, toks[i - 1]?.id)){
      steps.push({from:st, via:[], to:st, tag:"", note:`^DB: tür ${tok.id} olur; geçiş, türetme ekinin kenarında yapılır`, lex:lex(i + 1), skipped:true});
      i++; continue;
    }
    if(i > 0 && (((SKIP[st]?.has(tok.id) || tok.id === "Pres") && !direct(st, tok.id, next, toks[i - 1]?.id)) || (tok.id === "A3sg" && next === "Cop" && (st === "5" || st === "13")))){
      steps.push({from:st, via:[], to:st, tag:"", note:`${tok.id} bu durumda şekilde ayrı bir geçiş değil, yutulur`, lex:lex(i + 1), skipped:true});
      i++; continue;
    }
    const r = route(st, tok.id, next, i > 0 ? toks[i - 1].id : null);
    if(!r) return {stem, toks, steps, ok:false, stopAt:tok.id, state:st, reason:`${tok.id} etiketi ${st} durumundan sonra kodlanmadı (şekilde yok ya da bu çalışmada eklenmedi)`};
    const states = [st, ...r.path.map(e => e.t), r.edge.t];
    steps.push({from:st, via:r.path.map(e => e.t), to:r.edge.t, tag:r.edge.tag, states, lex:lex(i + 1), assumed:r.edge.assumed || r.path.some(e => e.assumed), inferred:r.edge.inferred || r.path.some(e => e.inferred), implicit:tok.implicit, token:tok.id});
    st = r.edge.t; i++;
  }
  const e = toEnd(st);
  if(!e) return {stem, toks, steps, ok:false, stopAt:null, state:st, reason:`${st} durumundan bitiş durumuna sessiz geçiş yok`};
  if(e.path.length){
    const states = [st, ...e.path.map(x => x.t)];
    steps.push({from:st, via:e.path.slice(0, -1).map(x => x.t), to:e.path[e.path.length - 1].t, tag:"0", states, lex:lex(toks.length), end:true});
    st = e.path[e.path.length - 1].t;
  }
  return {stem, toks, steps, ok:true, end:st};
}
export const stepStates = t => [...new Set(["1", ...t.steps.flatMap(s => s.states || [s.from, ...(s.via || []), s.to])])];

// ───────────────────────── arayüz yardımcıları (alıştırma ve durum haritası)
const num = (a, b) => +a - +b;
export const POOL = [
  "küçük+Noun+A3pl", "ev+Noun+A3sg+P3sg+Abl", "kitap+Noun+A3pl+P1sg+Dat", "araba+Noun+A3sg+Pnon+Loc", "göz+Noun+A3pl+P3sg+Acc", "okul+Noun+A3sg+P1sg+Nom", "köy+Noun+A3sg+Pnon+Gen",
  "ev+Noun+A3sg+Loc^DB+Verb+Zero+Past+A3sg", "uyu+Verb+Prog1+A3sg+Cop", "uyu+Verb^DB+Noun+Inf1+A3sg+Loc^DB+Verb+Zero+Pres+A3sg+Cop",
  "gel+Verb+Pos+Past+A1sg", "git+Verb+Neg+Past+A2sg", "oku+Verb+Pos+Aor+A3sg", "gel+Verb+Neg+Prog1+A1sg", "gel+Verb+Past+A3pl", "gel+Verb+Pos+Narr+A3sg",
  "bak+Verb+Pos+Prog1+A2pl", "sev+Verb+Pass+Pos+Past+A3sg", "gel+Verb+Pos+Opt+A1sg", "gel+Verb+Pos+Imp+A2sg", "al+Verb+Pos+Cond+A1sg", "oku+Verb+Pos+Fut+A1sg", "çalış+Verb+Neg+Aor+A3sg", "gel+Verb+Unable+Aor+A3sg", "uyu+Verb+Prog2+A3sg+Cop"
];
// PDF'deki (Sample.pdf) el çözümüyle birebir doğrulanan örnekler; öbürlerinin yolu şekillerden elle kodlandı
export const VERIFIED = new Set(["küçük+Noun+A3pl", "uyu+Verb+Prog1+A3sg+Cop", "uyu+Verb^DB+Noun+Inf1+A3sg+Loc^DB+Verb+Zero+Pres+A3sg+Cop"]);
// kenarlar durum durum: [{from, to:[{to, items:[{on, tag, silent, cond, assumed}]}]}]
export function edgeTable(){
  return [...byFrom.keys()].sort(num).map(f => {
    const to = new Map();
    for(const e of byFrom.get(f)){
      if(!to.has(e.t)) to.set(e.t, []);
      to.get(e.t).push({on:e.on, tag:e.tag, silent:e.silent, cond:e.nextRel ? "sonraki ek Rel" : e.nextProg ? "sonraki ek Prog1" : e.nextPast ? "sonraki ek Past" : e.nextWhile ? "sonraki ek While / AsIf" : e.afterPers ? "önceki ek kişi" : "", assumed:e.assumed, inferred:e.inferred});
    }
    return {from:f, to:[...to].sort((a, b) => num(a[0], b[0])).map(([t, items]) => ({to:t, items}))};
  });
}
export const edgesFrom = st => (byFrom.get(String(st)) || []).map(e => e.t);
export const sampleLines = t => t.steps.filter(s => !s.skipped).map(s => `From State ${(s.states || [s.from, s.to]).join("-State ")}: ${s.lex}${s.tag ? ` (with tag ${s.tag})` : ""}${s.assumed ? "  (varsayım)" : s.inferred ? "  (çıkarım)" : ""}`);
// yolda işaretli kenar varsa açıklama
export const flagNote = t => [t.steps.some(s => s.assumed) ? "(varsayım): kenar şekilde yok" : "", t.steps.some(s => s.inferred && !s.assumed) ? "(çıkarım): kenar şekilde var, hangi durumdan çıktığı kesişen çizgilerden yorumlandı" : ""].filter(Boolean).join(" · ");
// yazılan durum dizisini beklenenle karşılaştırır: ok (tam), prefix (doğru ama eksik), wrong (k. durum yanlış), long (fazlası var)
export function checkPath(want, typed){
  const got = typed[0] === "1" ? typed.slice() : ["1", ...typed];
  const cells = got.map((v, i) => ({v, ok:i < want.length && v === want[i]}));
  const bad = cells.findIndex(c => !c.ok);
  let status = "ok";
  if(bad >= 0) status = bad >= want.length ? "long" : "wrong";
  else if(got.length < want.length) status = "prefix";
  return {cells, status, bad, good:bad < 0 ? got.length : bad, prefixed:typed[0] !== "1"};
}
