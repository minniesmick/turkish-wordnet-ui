// Türkçe morfoloji motoru (Lecture 2): sözlük + morfotaktik (durum makinesi) + morfofonemik (ünlü uyumu, ünsüz değişimi).
// Kural tabanlı ve kasıtlı olarak küçük: Zemberek / Nuve gibi gerçek bir çözümleyici değildir. Saf JS, DOM yok.

export const VOWELS = "aeıioöuü";
const BACK = "aıou", VLESS = "çfhkpsşt";
const isV = c => !!c && VOWELS.includes(c);
const last = s => s[s.length - 1];
const lastVowel = s => { for(let i = s.length - 1; i >= 0; i--) if(isV(s[i])) return s[i]; return ""; };
const syl = s => [...s].filter(isV).length;
const A_ = v => BACK.includes(v) ? "a" : "e";
const H_ = v => ({a:"ı", ı:"ı", o:"u", u:"u", e:"i", i:"i", ö:"ü", ü:"ü"})[v] || "ı";
const FRONT = {a:"e", ı:"i", o:"ö", u:"ü"};

// Durumlar: N isim/sıfat gövdesi, PL çoğul, PS iyelik, CS hâl; V fiil gövdesi, NG olumsuz, T zaman, PE kişi eki, CP ek-fiil (-DHr), AV zarf-fiil, RL ilgi eki (-ki)
export const ACCEPT = new Set(["N", "PL", "PS", "CS", "V", "NG", "T", "PE", "CP", "AV", "RL"]);
const AOR_H = new Set(["al", "bil", "bul", "dur", "gel", "gör", "kal", "ol", "öl", "san", "var", "ver", "vur", "git", "et"]);
const causT = p => isV(last(p)) || (syl(p) >= 2 && "lr".includes(last(p)));

// t: şablon. Büyük harf ünlü/ünsüz kimliği (A: a/e, H: ı/i/u/ü, D: d/t, C: c/ç); (y)(n)(s): ünlüden sonra gelen tampon ünsüz; (H)(A): ünsüzden sonra gelen ünlü
// from: gelebileceği durumlar, to: gittiği durum; soft: sondaki k, ünlüyle başlayan ekten önce ğ olur
export const SUF = {
  PLU:{t:"lAr", from:["N"], to:"PL", grp:"num", cat:"çekim", tag:"A3pl", name:"çoğul"},
  P1sg:{t:"(H)m", from:["N", "PL"], to:"PS", grp:"poss", cat:"çekim", tag:"P1sg", name:"1. tekil iyelik (benim)"},
  P2sg:{t:"(H)n", from:["N", "PL"], to:"PS", grp:"poss", cat:"çekim", tag:"P2sg", name:"2. tekil iyelik (senin)"},
  P3sg:{t:"(s)H", from:["N", "PL"], to:"PS", grp:"poss", cat:"çekim", tag:"P3sg", name:"3. tekil iyelik (onun)", p3:true},
  P1pl:{t:"(H)mHz", from:["N", "PL"], to:"PS", grp:"poss", cat:"çekim", tag:"P1pl", name:"1. çoğul iyelik (bizim)"},
  P2pl:{t:"(H)nHz", from:["N", "PL"], to:"PS", grp:"poss", cat:"çekim", tag:"P2pl", name:"2. çoğul iyelik (sizin)"},
  P3pl:{t:"lArH", from:["N"], to:"PS", grp:"poss", cat:"çekim", tag:"P3pl", name:"3. çoğul iyelik (onların)", p3:true},
  GEN:{t:"(n)Hn", from:["N", "PL", "PS"], to:"CS", grp:"case", cat:"çekim", tag:"Gen", name:"tamlayan hâli -(n)In"},
  ACC:{t:"(y)H", from:["N", "PL", "PS"], to:"CS", grp:"case", cat:"çekim", tag:"Acc", name:"belirtme hâli -(y)I", pn:true},
  DAT:{t:"(y)A", from:["N", "PL", "PS"], to:"CS", grp:"case", cat:"çekim", tag:"Dat", name:"yönelme hâli -(y)A", pn:true},
  LOC:{t:"DA", from:["N", "PL", "PS"], to:"CS", grp:"case", cat:"çekim", tag:"Loc", name:"bulunma hâli -DA", pn:true},
  ABL:{t:"DAn", from:["N", "PL", "PS"], to:"CS", grp:"case", cat:"çekim", tag:"Abl", name:"ayrılma hâli -DAn", pn:true},
  INS:{t:"(y)lA", from:["N", "PL", "PS"], to:"CS", grp:"case", cat:"çekim", tag:"Ins", name:"araç hâli -(y)lA"},
  // yapım ekleri
  LIK:{t:"lHk", from:["N"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Noun+Ness", name:"-lIk (isimden isim: soyut)", soft:true},
  CI:{t:"CH", from:["N"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Noun+Agt", name:"-CI (isimden isim: meslek/yapan)"},
  LI:{t:"lH", from:["N"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Adj+With", name:"-lI (isimden sıfat: ... olan)"},
  SIZ:{t:"sHz", from:["N"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Adj+Without", name:"-sIz (isimden sıfat: ... olmayan)"},
  LAS:{t:"lAş", from:["N"], to:"V", grp:"deriv", cat:"yapım", tag:"^DB+Verb+Become", name:"-lAş (isimden fiil: ... olmak)"},
  // fiil: çatı, olumsuzluk, zaman, kişi
  CAUS_t:{t:"t", from:["V"], to:"V", grp:"voice", cat:"yapım", tag:"Caus", name:"ettirgen -t", cond:causT},
  CAUS_d:{t:"DHr", from:["V"], to:"V", grp:"voice", cat:"yapım", tag:"Caus", name:"ettirgen -DIr", cond:p => !causT(p)},
  PASS_n:{t:"n", from:["V"], to:"V", grp:"voice", cat:"yapım", tag:"Pass", name:"edilgen -n", cond:p => isV(last(p))},
  PASS_l:{t:"Hl", from:["V"], to:"V", grp:"voice", cat:"yapım", tag:"Pass", name:"edilgen -Il", cond:p => !isV(last(p)) && last(p) !== "l"},
  PASS_in:{t:"Hn", from:["V"], to:"V", grp:"voice", cat:"yapım", tag:"Pass", name:"edilgen -In (l'den sonra)", cond:p => last(p) === "l"},
  ABIL:{t:"(y)Abil", from:["V"], to:"V", grp:"voice", cat:"çekim", tag:"Able", name:"yeterlilik -(y)Abil"},
  NEG:{t:"mA", from:["V"], to:"NG", grp:"neg", cat:"çekim", tag:"Neg", name:"olumsuzluk -mA"},
  UNABLE:{t:"(y)AmA", from:["V"], to:"NG", grp:"neg", cat:"çekim", tag:"Unable", name:"yetersizlik -(y)AmA"},
  PAST:{t:"DH", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Past", name:"görülen geçmiş -DI", par:"z"},
  EVID:{t:"mHş", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Narr", name:"öğrenilen geçmiş -mIş", par:"k"},
  PROG:{t:"(H)yor", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Prog1", name:"şimdiki zaman -Iyor", par:"k"},
  FUT:{t:"(y)AcAk", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Fut", name:"gelecek zaman -(y)AcAk", par:"k", soft:true},
  AOR:{t:p => isV(last(p)) ? "r" : (syl(p) === 1 && !AOR_H.has(p)) ? "Ar" : "Hr", from:["V"], to:"T", grp:"tam", cat:"çekim", tag:"Aor", name:"geniş zaman -Ar / -Ir / -r", par:"k"},
  COND:{t:"sA", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Desr", name:"dilek-şart -sA", par:"z"},
  NAOR:{t:"z", from:["NG"], to:"T", grp:"tam", cat:"çekim", tag:"Aor", name:"olumsuz geniş zaman -z (gelmez)", par:"nk"},
  OPT:{t:"(y)A", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Opt", name:"istek -(y)A", par:"o", soft:true},
  NECES:{t:"mAlH", from:["V", "NG"], to:"T", grp:"tam", cat:"çekim", tag:"Neces", name:"gereklilik -mAlI", par:"k"},
  // ikinci zaman (bileşik zaman) ve ek-fiil: tamamlanmış bir zamandan ya da ad gövdesinden sonra
  PAST_2:{t:"(y)DH", from:["T", "N", "PL", "PS", "CS"], to:"T", grp:"tam", cat:"çekim", tag:"Past", name:"görülen geçmiş (2. zaman / ek-fiil) -(y)DI", par:"z"},
  EVID_2:{t:"(y)mHş", from:["T", "N", "PL", "PS", "CS"], to:"T", grp:"tam", cat:"çekim", tag:"Narr", name:"öğrenilen geçmiş (2. zaman / ek-fiil) -(y)mIş", par:"k"},
  COND_2:{t:"(y)sA", from:["T", "N", "PL", "PS", "CS"], to:"T", grp:"tam", cat:"çekim", tag:"Cond", name:"şart (2. zaman / ek-fiil) -(y)sA", par:"z"},
  COP:{t:"DHr", from:["N", "PL", "PS", "CS", "T", "PE"], to:"CP", grp:"cop", cat:"çekim", tag:"Cop", name:"ek-fiil -DHr (-dır)"},
  A1sg_z:{t:"m", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A1sg", name:"1. tekil kişi (z)", par:"z"},
  A2sg_z:{t:"n", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A2sg", name:"2. tekil kişi (z)", par:"z"},
  A1pl_z:{t:"k", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A1pl", name:"1. çoğul kişi (z)", par:"z"},
  A2pl_z:{t:"nHz", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A2pl", name:"2. çoğul kişi (z)", par:"z"},
  A1sg_k:{t:"(y)Hm", noPar:["nk"], from:["T", "N", "PL", "PS", "CS"], to:"PE", grp:"pers", cat:"çekim", tag:"A1sg", name:"1. tekil kişi (k)", par:"k"},
  A2sg_k:{t:"sHn", from:["T", "N", "PL", "PS", "CS"], to:"PE", grp:"pers", cat:"çekim", tag:"A2sg", name:"2. tekil kişi (k)", par:"k"},
  A1pl_k:{t:"(y)Hz", noPar:["nk"], from:["T", "N", "PL", "PS", "CS"], to:"PE", grp:"pers", cat:"çekim", tag:"A1pl", name:"1. çoğul kişi (k)", par:"k"},
  A2pl_k:{t:"sHnHz", from:["T", "N", "PL", "PS", "CS"], to:"PE", grp:"pers", cat:"çekim", tag:"A2pl", name:"2. çoğul kişi (k)", par:"k"},
  NA1sg:{t:"m", from:["NG"], to:"PE", grp:"pers", cat:"çekim", tag:"A1sg", impl:"Aor", name:"1. tekil kişi (olumsuz geniş zaman) -m", par:"na"},
  NA1pl:{t:"(y)Hz", from:["NG"], to:"PE", grp:"pers", cat:"çekim", tag:"A1pl", impl:"Aor", name:"1. çoğul kişi (olumsuz geniş zaman) -(y)Hz", par:"na"},
  A1sg_o:{t:"(y)Hm", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A1sg", name:"1. tekil kişi (istek)", par:"o"},
  A2sg_o:{t:"sHn", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A2sg", name:"2. tekil kişi (istek)", par:"o"},
  A1pl_o:{t:"lHm", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A1pl", name:"1. çoğul kişi (istek) -lIm", par:"o"},
  A2pl_o:{t:"sHnHz", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A2pl", name:"2. çoğul kişi (istek)", par:"o"},
  A3pl:{t:"lAr", from:["T"], to:"PE", grp:"pers", cat:"çekim", tag:"A3pl", name:"3. çoğul kişi", par:"any"},
  // fiilden isme
  INF1:{t:"mAk", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Noun+Inf1", name:"mastar -mAk", soft:true},
  INF2:{t:"mA", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Noun+Inf2", name:"eylemlik -mA"},
  PART:{t:"(y)An", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Adj+PresPart", name:"sıfat-fiil -(y)An"},
  PASTP:{t:"DHk", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Adj+PastPart", name:"sıfat-fiil -DHk", soft:true},
  FUTP:{t:"(y)AcAk", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Adj+FutPart", name:"sıfat-fiil -(y)AcAk", soft:true},
  NARRP:{t:"mHş", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Adj+NarrPart", name:"sıfat-fiil -mHş"},
  INF3:{t:"(y)Hş", from:["V", "NG"], to:"N", grp:"deriv", cat:"yapım", tag:"^DB+Noun+Inf3", name:"ad-fiil -(y)Hş", soft:true},
  ARAK:{t:"(y)ArAk", from:["V", "NG"], to:"AV", grp:"deriv", cat:"yapım", tag:"^DB+Adv+ByDoingSo", name:"zarf-fiil -(y)ArAk"},
  IP:{t:"(y)Hp", from:["V", "NG"], to:"AV", grp:"deriv", cat:"yapım", tag:"^DB+Adv+AfterDoingSo", name:"zarf-fiil -(y)Hp"},
  KI:{t:"ki", from:["CS"], to:"RL", grp:"deriv", cat:"yapım", tag:"^DB+Adj+Rel", name:"ilgi eki -ki (evdeki)", after:["LOC", "GEN"]}
};
export const GROUP_NAME = {num:"çoğul", poss:"iyelik", case:"hâl", deriv:"yapım eki", voice:"çatı / yeterlilik", neg:"olumsuzluk", tam:"zaman / kip", pers:"kişi", cop:"ek-fiil"};

// Küçük kök sözlüğü. soft: son p/ç/t/k ünlüyle başlayan ekte b/c/d/ğ olur; fh: ünlü uyumunda ince (istisna); dey: de/ye -> di/yi (y- önünde)
const N = (w, o = {}) => ({w, pos:"N", ...o}), Vb = (w, o = {}) => ({w, pos:"V", ...o}), Aj = (w, o = {}) => ({w, pos:"A", ...o});
export const CURATED = [
  N("okul"), N("ev"), N("masa"), N("kitap", {soft:1}), N("ağaç", {soft:1}), N("çocuk", {soft:1}), N("ayak", {soft:1}), N("renk", {soft:1}),
  N("araba"), N("göz"), N("kalem"), N("kapı"), N("saat", {fh:1}), N("rol", {fh:1}), N("kalp", {soft:1, fh:1}), N("devlet"), N("bahçe"),
  N("şehir", {vd:1}), N("ağız", {vd:1}), N("burun", {vd:1}), N("kütüphane"), N("öğrenci"), N("yaprak", {soft:1}), N("kuş"), N("ders"), N("el"), N("gül"), N("yol"), N("arkadaş"),
  Aj("güzel"), Aj("büyük", {soft:1}), Aj("küçük", {soft:1}), Aj("yeni"), Aj("sağlam"),
  Vb("gel"), Vb("git", {soft:1}), Vb("al"), Vb("ver"), Vb("oku"), Vb("yaz"), Vb("sev"), Vb("ara"), Vb("başla"), Vb("kapa"), Vb("ye", {dey:1}),
  Vb("de", {dey:1}), Vb("bak"), Vb("gör"), Vb("bil"), Vb("ol"), Vb("çalış"), Vb("sevin"), Vb("uyu"), Vb("yap"), Vb("anla"), Vb("kal"),
  Vb("otur"), Vb("gez"), Vb("kes"), Vb("bul"), Vb("et", {soft:1})
];
// BOUN lemmalarından sözlük: çok heceli, p/ç/k ile biten isimler yumuşar (sayısız istisna olabilir)
export function lexiconFromLemmas(rows){
  const have = new Set(CURATED.map(e => e.w + e.pos)), out = [...CURATED];
  const NOSOFT = new Set(["ahlak", "hukuk", "ihtimal", "millet", "devlet", "hayat", "sanat", "vakit"]);
  for(const [w, upos] of rows){
    if(w.length < 2 || !/^[a-zçğıöşüâîû]+$/.test(w)) continue;
    const pos = upos === "VERB" ? "V" : upos === "ADJ" ? "A" : "N";
    if(have.has(w + pos)) continue;
    have.add(w + pos);
    const e = {w, pos};
    if(pos !== "V" && syl(w) >= 2 && "pçk".includes(last(w)) && !NOSOFT.has(w)) e.soft = 1;
    out.push(e);
  }
  return out;
}

// ───────────────────────── üretim
// Bir ek şablonunu, önceki biçime göre çözer; adımları notlara yazar
function resolve(prev, tmpl, S, hv0, notes){
  let out = "", cur = prev, hv = hv0;
  const toks = tmpl.match(/\([^)]\)|./gu) || [];
  const push = (ch, why) => { out += ch; cur = prev + out; if(isV(ch)) hv = ch; if(why) notes.push(why); };
  for(const t of toks){
    if(t[0] === "("){
      const x = t[1];
      if("ynsYNS".includes(x) && x === x.toLowerCase()){
        if(isV(last(cur))) push(x, `(${x}) tampon ünsüzü geldi: ${last(cur)} ünlüyle bitiyor`);
        else notes.push(`(${x}) gelmedi: ${last(cur)} ünsüzle bitiyor`);
      }else if(x === "H"){
        if(!isV(last(cur))) push(H_(hv), `(H) → ${H_(hv)}: son ünlü ${hv} → ${BACK.includes(hv) ? "kalın" : "ince"}${"ou".includes(hv) || "öü".includes(hv) ? ", yuvarlak" : ", düz"}`);
        else notes.push(`(H) düştü: ${last(cur)} ünlüyle bitiyor (kural 7)`);
      }else if(x === "A"){
        if(!isV(last(cur))) push(A_(hv), `(A) → ${A_(hv)}`);
      }
    }else if(t === "A") push(A_(hv), `A → ${A_(hv)}: son ünlü ${hv} ${BACK.includes(hv) ? "kalın" : "ince"} (ünlü uyumu)`);
    else if(t === "H") push(H_(hv), `H → ${H_(hv)}: son ünlü ${hv} (dört yönlü ünlü uyumu)`);
    else if(t === "D"){ const l = last(cur); push(VLESS.includes(l) ? "t" : "d", `D → ${VLESS.includes(l) ? "t" : "d"}: önceki ünsüz ${l} ${VLESS.includes(l) ? "sert" : "yumuşak/ünlü"}`); }
    else if(t === "C"){ const l = last(cur); push(VLESS.includes(l) ? "ç" : "c", `C → ${VLESS.includes(l) ? "ç" : "c"}: önceki ses ${l}`); }
    else push(t, null);
  }
  return out;
}

// stem: sözlük girdisi, ids: ek kimlikleri dizisi
export function generate(stem, ids){
  let form = stem.w, st = stem.pos === "V" ? "V" : "N", par = null, p3 = false, soft = !!stem.soft;
  const segs = [{id:"STEM", text:stem.w}], trace = [{id:"STEM", out:stem.w, notes:[`kök: ${stem.w} (${{N:"isim", A:"sıfat", V:"fiil"}[stem.pos]})`]}];
  const tags = [];
  for(const [ix, id] of ids.entries()){
    const S = SUF[id], notes = [];
    if(!S) return {ok:false, reason:`bilinmeyen ek: ${id}`, at:id};
    if(!S.from.includes(st)) return {ok:false, reason:`${S.name} eki “${stateName(st)}” durumundan sonra gelemez`, at:id, state:st};
    if(S.cond && !S.cond(form)) return {ok:false, reason:`${S.name} bu gövdeye uymuyor`, at:id, state:st};
    if(S.after && !S.after.includes(ids[ix - 1])) return {ok:false, reason:`${S.name} yalnızca ${S.after.map(a => SUF[a].name.split(" ")[0]).join(" / ")} hâlinden sonra gelir`, at:id, state:st};
    if(S.noPar && S.noPar.includes(par)) return {ok:false, reason:`${S.name} bu zamandan sonra gelmez`, at:id, state:st};
    if(S.par === "na") par = "na";
    if(S.grp === "pers" && S.par !== "any" && S.par !== "na" && ((par === "nk" ? "k" : par) || (["N", "PL", "PS", "CS"].includes(st) ? "k" : null)) !== S.par) return {ok:false, reason:`${S.name} bu zamandan sonra gelmez (kişi eki takımı farklı)`, at:id, state:st};
    let prev = form, hv = lastVowel(form);
    if(id === "PROG" && (ids[ix - 1] === "NEG" || ids[ix - 1] === "UNABLE")){ hv = lastVowel(form.slice(0, -1)); notes.push(`olumsuz şimdiki zaman -mHyor: H, kökün son ünlüsüne (${hv}) göre`); }
    if(segs.length === 1 && stem.fh && hv){ const f = FRONT[hv]; if(f){ hv = f; notes.push(`istisna: ${stem.w} kökü ince ünlü gibi davranır`); } }
    if(id === "PROG" && "ae".includes(last(prev))){ prev = prev.slice(0, -1); notes.push(`kök sonu ${last(form)} düştü (kural 8, -Iyor öncesi)`); }
    let t = typeof S.t === "function" ? S.t(form) : S.t;
    if(S.pn && p3){ t = t.startsWith("(y)") ? "n" + t.slice(3) : "n" + t; notes.push("iyelik 3. kişiden sonra pronominal n araya girdi"); }
    const txt = resolve(prev, t, S, hv, notes);
    const vi = isV(txt[0]);
    // yumuşama: önceki parça (kök ya da k ile biten ek) ünlüyle başlayan ekten önce
    if(vi && soft && prev.length){
      const l = last(prev), ln = prev.slice(-2);
      let r = null;
      if(ln === "nk") r = prev.slice(0, -1) + "g", notes.push("nk → ng (kural 17)");
      else if(l === "k") r = prev.slice(0, -1) + "ğ", notes.push("k → ğ: ünlüyle başlayan ek (kural 16)");
      else if(l === "p") r = prev.slice(0, -1) + "b", notes.push("p → b: ünlüyle başlayan ek");
      else if(l === "ç") r = prev.slice(0, -1) + "c", notes.push("ç → c: ünlüyle başlayan ek");
      else if(l === "t") r = prev.slice(0, -1) + "d", notes.push("t → d: ünlüyle başlayan ek");
      if(r) prev = r;
    }
    if(stem.vd && segs.length === 1 && vi && prev.length > 2 && isV(prev[prev.length - 2])){ notes.push(`ünlü düşmesi: ${prev} → ${prev.slice(0, -2) + prev.slice(-1)} (ünlüyle başlayan ek)`); prev = prev.slice(0, -2) + prev.slice(-1); }
    if(stem.dey && segs.length === 1 && txt[0] === "y" && last(prev) === "e"){ prev = prev.slice(0, -1) + "i"; notes.push(`${stem.w} → ${prev}: y- ile başlayan ekten önce e → i`); }
    form = prev + txt;
    segs.push({id, text:txt});
    trace.push({id, tmpl:t, out:txt, form, notes});
    soft = !!S.soft; p3 = !!S.p3; if(S.grp === "tam") par = S.par;
    st = S.to; tags.push(id);
  }
  if(!ACCEPT.has(st)) return {ok:false, reason:"eksik: sözcük bu durumda bitemez", at:null, state:st};
  return {ok:true, surface:form, segs, trace, state:st, par, p3, lex:lexOf(stem, ids)};
}
const stateName = s => ({N:"isim/sıfat gövdesi", PL:"çoğul", PS:"iyelik", CS:"hâl eki", V:"fiil gövdesi", NG:"olumsuzluk", T:"zaman eki", PE:"kişi eki", CP:"ek-fiil", AV:"zarf-fiil", RL:"ilgi eki"})[s] || s;
export { stateName };

// ───────────────────────── sözlüksel (lexical) biçim: okul+Noun+A3sg+P1sg+Nom
export function lexOf(stem, ids){
  let out = stem.w + "+" + ({N:"Noun", A:"Adj", V:"Verb"}[stem.pos]);
  let mode = stem.pos === "V" ? "V" : "N", noun = {}, verb = {voices:[], neg:false, unable:false, tams:[], pers:null, zero:false};
  const flushN = () => { out += "+" + (noun.num || "A3sg") + "+" + (noun.poss || "Pnon") + "+" + (noun.case || "Nom"); noun = {}; };
  const flushV = fin => {
    out += verb.voices.map(v => "+" + v).join("");
    if(verb.unable) out += "+Unable"; else if(!verb.zero) out += "+" + (verb.neg ? "Neg" : "Pos");
    if(fin) out += verb.tams.length ? verb.tams.map(t => "+" + t).join("") + "+" + (verb.pers || "A3sg") : "+Imp+A2sg";
    verb = {voices:[], neg:false, unable:false, tams:[], pers:null, zero:false};
  };
  // ad gövdesinden ek-fiile (sıfır türetme): ev+Noun+A3sg+Pnon+Nom^DB+Verb+Zero
  const toVerb = () => { flushN(); out += "^DB+Verb+Zero"; mode = "V"; verb.zero = true; };
  for(const id of ids){
    const S = SUF[id];
    if(S.grp === "num") noun.num = S.tag;
    else if(S.grp === "poss") noun.poss = S.tag;
    else if(S.grp === "case") noun.case = S.tag;
    else if(S.grp === "voice") verb.voices.push(S.tag);
    else if(S.grp === "neg"){ if(S.tag === "Unable") verb.unable = true; else verb.neg = true; }
    else if(S.grp === "tam"){ if(mode === "N") toVerb(); verb.tams.push(S.tag); }
    else if(S.grp === "pers"){ if(mode === "N"){ toVerb(); verb.tams.push("Pres"); } if(S.impl) verb.tams.push(S.impl); verb.pers = S.tag; }
    else if(S.grp === "cop"){ if(mode === "N"){ toVerb(); verb.tams.push("Pres"); } flushV(true); out += "+Cop"; mode = "X"; }
    else if(S.grp === "deriv"){
      if(mode === "N") flushN(); else if(mode === "V") flushV(false);
      out += S.tag; mode = S.to === "V" ? "V" : (S.to === "AV" || S.to === "RL") ? "X" : "N";
    }
  }
  if(mode === "N") flushN(); else if(mode === "V") flushV(true);
  return out;
}

// bir durumdan sonra gelebilecek ekler (arayüzdeki seçenekler)
export const nextOptions = (stem, ids) => Object.keys(SUF).filter(id => generate(stem, [...ids, id]).ok);

// ───────────────────────── çözümleme: üret ve eşleştir
export function analyze(word, lexicon, {maxDepth = 6, limit = 60} = {}){
  const w = word.toLocaleLowerCase("tr").trim().replace(/['’]/g, ""), out = [], seen = new Set();   // kesme işareti (Ankara'da) ekin sınırıdır, ses değişimine etkisi yok
  if(!w) return out;
  const ok = f => w.startsWith(f.slice(0, -1)) && f.length <= w.length + 1;
  for(const stem of lexicon){
    if(!w.startsWith(stem.w.slice(0, -1))) continue;
    const walk = (ids, g) => {
      if(out.length >= limit) return;
      if(g.ok && g.surface === w){
        const key = g.lex + "|" + ids.join(",");
        if(!seen.has(key)){ seen.add(key); out.push({stem, ids, surface:g.surface, lex:g.lex, segs:g.segs, trace:g.trace}); }
      }
      if(ids.length >= maxDepth) return;
      for(const id of Object.keys(SUF)){
        const r = generate(stem, [...ids, id]);
        if(r.ok && ok(r.surface)) walk([...ids, id], r);
      }
    };
    const g0 = generate(stem, []);
    if(g0.ok) walk([], g0);
  }
  out.sort((a, b) => a.ids.length - b.ids.length);
  return out;
}
