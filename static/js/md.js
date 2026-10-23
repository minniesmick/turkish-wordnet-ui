// Morfolojik belirsizlik giderme (Lecture 2, slayt 31–32): bir sözcüğün birden çok çözümlemesi varken bağlama uygun olanı seç.
// Çözümleyici simülasyonu: aday kümesi eğitim sözlüğünden gelir (görülen sözcüğün etiketleri; görülmeyen için sonek sözlüğü).
// Üç yöntem: en sık çözümleme (taban çizgisi), karar listesi (Yuret & Ture) ve ortalama perceptron (Sak, Gungor, Saraclar).
// Çözümleme = "UPOS FEATS" (UD etiketi), örn. "NOUN Case=Loc|Number=Sing|Person=3". Saf hesap; arayüz disamb.js içinde.

export const lc = s => s.toLocaleLowerCase("tr");
const PUNCT = /^[^\p{L}\p{N}]+$/u;
export const tagOf = (p, x) => `${p} ${x && x !== "_" ? x : "_"}`;
export const uposOf = tag => tag.slice(0, tag.indexOf(" "));
export const featsOf = tag => tag.slice(tag.indexOf(" ") + 1);
export const sentTags = s => s.p.map((p, i) => tagOf(p, s.x[i]));

// her 5. cümle sınama kümesi (n-gram laboratuvarıyla aynı ayrım)
export function split(sents, every = 5){
  const train = [], test = [];
  sents.forEach((s, i) => (i % every === every - 1 ? test : train).push(s));
  return {train, test};
}

const bump = (m, k, d = 1) => m.set(k, (m.get(k) || 0) + d);
const nest = (m, k) => { let v = m.get(k); if(!v){ v = new Map(); m.set(k, v); } return v; };
const sum = m => { let n = 0; for(const c of m.values()) n += c; return n; };
const CAP = 20, MINSUF = 3;

// ───────────────────────── sözlük ve aday kümesi
export function buildLexicon(train){
  const form = new Map(), suf = [null, new Map(), new Map(), new Map(), new Map()], lem = new Map(), glob = new Map();
  let N = 0;
  for(const s of train){
    const tags = sentTags(s);
    for(let i = 0; i < s.f.length; i++){
      const w = lc(s.f[i]), t = tags[i];
      bump(nest(form, w), t); bump(glob, t); bump(nest(lem, w + "\t" + t), s.l[i]);
      for(let k = 1; k <= 4; k++) if(w.length > k) bump(nest(suf[k], w.slice(-k)), t);
      N++;
    }
  }
  return {form, suf, lem, glob, N};
}
const ranked = (m, ex) => {
  const out = [];
  for(const [t, c] of m){ const n = c - (ex === t ? 1 : 0); if(n > 0) out.push([t, n]); }
  return out.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
};
// excl: eğitimde tek kez geçen sözcük "bilinmeyen" sayılır ve kendi etiketi sonek sayımından düşülür (sınamadaki durumu taklit eder)
export function candidates(lex, w, excl = null){
  if(PUNCT.test(w)) return {known:true, list:[["PUNCT _", 1]]};
  const f = lex.form.get(w);
  if(f && !(excl && sum(f) === 1)) return {known:true, list:ranked(f, null)};
  for(let k = 4; k >= 1; k--){
    if(w.length <= k) continue;
    const m = lex.suf[k].get(w.slice(-k));
    if(!m) continue;
    const l = ranked(m, excl);
    if(l.length && (k === 1 || l.reduce((a, b) => a + b[1], 0) >= MINSUF)) return {known:false, list:l.slice(0, CAP)};
  }
  return {known:false, list:ranked(lex.glob, excl).slice(0, CAP)};
}
export const lemmaOf = (lex, w, tag) => { const m = lex.lem.get(w + "\t" + tag); return m ? ranked(m, null)[0][0] : null; };

// ───────────────────────── özellikler (üç yöntem aynısını kullanır)
const suf = (w, k) => w.length >= k ? w.slice(-k) : w;
export function feats(fs, orig, i, pt, pt2){
  const w = fs[i], pw = i ? fs[i - 1] : "<s>", nw = i + 1 < fs.length ? fs[i + 1] : "</s>";
  const out = ["b", "w=" + w, "pt=" + pt, "pt,w=" + pt + "," + w, "pt,s3=" + pt + "," + suf(w, 3), "pt2,pt=" + pt2 + "," + pt, "pu=" + uposOf0(pt),
    "pw=" + pw, "nw=" + nw, "ps3=" + suf(pw, 3), "ns3=" + suf(nw, 3), "ps2=" + suf(pw, 2), "ns2=" + suf(nw, 2)];
  for(let k = 1; k <= 5; k++) if(w.length > k) out.push(`s${k}=${w.slice(-k)}`);
  if(w.length > 3) out.push("p3=" + w.slice(0, 3));
  if(i > 0 && orig[i] !== fs[i] && orig[i][0] === orig[i][0].toLocaleUpperCase("tr")) out.push("cap");
  if(/\d/.test(w)) out.push("digit");
  return out;
}
const uposOf0 = t => t[0] === "<" ? t : uposOf(t);

// ───────────────────────── karar listesi (Yarowsky tarzı: kural = özellik → etiket, sıra = log olabilirlik oranı)
const ALPHA = 0.1, MINSUP = 2;
function trainDL(prep){
  const pos = new Map(), neg = new Map();
  for(const P of prep){
    let pt = "<S>", pt2 = "<S>";
    for(let i = 0; i < P.fs.length; i++){
      const C = P.c[i], g = P.tags[i];
      if(C.length > 1) for(const f of feats(P.fs, P.orig, i, pt, pt2)) for(const t of C) bump(nest(t === g ? pos : neg, f), t);
      pt2 = pt; pt = g;
    }
  }
  const rules = new Map();
  for(const [f, m] of pos) for(const [t, p] of m){
    const n = neg.get(f)?.get(t) || 0, score = Math.log((p + ALPHA) / (n + ALPHA));
    if(p >= MINSUP && score > 0) nest(rules, f).set(t, {score, p, n});
  }
  return {rules};
}
function dlPick(dl, fl, C){
  let best = null;
  for(const f of fl){
    const r = dl.rules.get(f);
    if(r) for(const t of C){ const x = r.get(t); if(x && (!best || x.score > best.score)) best = {t, f, ...x}; }
  }
  return best;
}
export function topRules(dl, n = 25){
  const all = [];
  for(const [f, m] of dl.rules) for(const [t, x] of m) all.push({f, t, ...x});
  return all.sort((a, b) => b.score - a.score || b.p - a.p).slice(0, n);
}

// ───────────────────────── ortalama perceptron (hata olunca ağırlık kaydır; sonda tüm adımların ortalaması)
class AP {
  constructor(){ this.w = new Map(); this.i = 0; }
  score(fl, t){ let s = 0; for(const f of fl){ const c = this.w.get(f)?.get(t); if(c) s += c[0]; } return s; }
  pick(fl, C){ let b = C[0], bs = -Infinity; for(const t of C){ const s = this.score(fl, t); if(s > bs){ bs = s; b = t; } } return b; }
  upd(f, t, d){
    const m = nest(this.w, f); let c = m.get(t);
    if(!c){ c = [0, 0, 0]; m.set(t, c); }
    c[1] += (this.i - c[2]) * c[0]; c[2] = this.i; c[0] += d;
  }
  update(truth, guess, fl){
    this.i++;
    if(truth === guess) return;
    for(const f of fl){ this.upd(f, truth, 1); this.upd(f, guess, -1); }
  }
  average(){ for(const m of this.w.values()) for(const c of m.values()){ c[1] += (this.i - c[2]) * c[0]; c[0] = c[1] / this.i; } }
}
function mulberry32(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function trainAP(prep, epochs, seed){
  const rnd = mulberry32(seed), order = prep.map((_, i) => i), m = new AP();
  for(let e = 0; e < epochs; e++){
    for(let i = order.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for(const idx of order){
      const P = prep[idx]; let pt = "<S>", pt2 = "<S>";
      for(let i = 0; i < P.fs.length; i++){
        const C = P.c[i], g = P.tags[i];
        let guess = C[0];
        if(C.length > 1){ const fl = feats(P.fs, P.orig, i, pt, pt2); guess = m.pick(fl, C); m.update(g, guess, fl); }
        pt2 = pt; pt = guess;
      }
    }
  }
  m.average();
  return m;
}

// ───────────────────────── eğitim
export function train(sents, {epochs = 6, seed = 7} = {}){
  const lex = buildLexicon(sents);
  const prep = sents.map(s => {
    const fs = s.f.map(lc), tags = sentTags(s);
    const c = fs.map((w, i) => { const l = candidates(lex, w, tags[i]).list.map(x => x[0]); if(!l.includes(tags[i])) l.push(tags[i]); return l; });
    return {fs, orig:s.f, tags, c};
  });
  return {lex, dl:trainDL(prep), ap:trainAP(prep, epochs, seed), n:sents.length, tokens:lex.N};
}

// ───────────────────────── tahmin: her yöntem kendi önceki etiketini kullanarak soldan sağa
export function analyze(model, forms){
  const {lex, dl, ap} = model, fs = forms.map(lc), out = [];
  const path = {dl:["<S>", "<S>"], ap:["<S>", "<S>"]};
  for(let i = 0; i < forms.length; i++){
    const r = candidates(lex, fs[i]), C = r.list.map(x => x[0]);
    const tok = {w:forms[i], known:r.known, cands:r.list.map(([t, n]) => ({tag:t, n, lemma:lemmaOf(lex, fs[i], t)})), base:C[0]};
    const fd = feats(fs, forms, i, path.dl[1], path.dl[0]), rule = C.length > 1 ? dlPick(dl, fd, C) : null;
    tok.dl = {tag:rule ? rule.t : C[0], rule:rule ? {f:rule.f, score:rule.score, p:rule.p, n:rule.n} : null};
    const fa = feats(fs, forms, i, path.ap[1], path.ap[0]);
    const sc = C.map(t => [t, ap.score(fa, t)]);
    let best = sc[0];
    for(const x of sc) if(x[1] > best[1]) best = x;
    const second = sc.filter(x => x[0] !== best[0]).sort((a, b) => b[1] - a[1])[0];
    tok.ap = {tag:best[0], scores:sc, why:second ? whyAP(ap, fa, best[0], second[0]) : []};
    path.dl = [path.dl[1], tok.dl.tag]; path.ap = [path.ap[1], tok.ap.tag];
    out.push(tok);
  }
  return out;
}
// seçilen etiketi ikinci sıradakine tercih ettiren en büyük özellik katkıları
function whyAP(ap, fl, a, b){
  const d = [];
  for(const f of fl){ const m = ap.w.get(f); if(!m) continue; const x = (m.get(a)?.[0] || 0) - (m.get(b)?.[0] || 0); if(Math.abs(x) > 1e-9) d.push([f, x]); }
  return d.sort((p, q) => Math.abs(q[1]) - Math.abs(p[1])).slice(0, 5);
}

// ───────────────────────── değerlendirme (noktalama sayılmaz)
export const METHODS = ["base", "dl", "ap"];
export function evaluate(model, sents){
  const mk = () => ({n:0, ceil:0, ...Object.fromEntries(METHODS.map(m => [m, 0])), ...Object.fromEntries(METHODS.map(m => [m + "U", 0])), ceilU:0});
  const R = {all:mk(), amb:mk(), one:mk(), unk:mk()};
  for(const s of sents){
    const gold = sentTags(s), res = analyze(model, s.f);
    for(let i = 0; i < gold.length; i++){
      if(s.p[i] === "PUNCT") continue;
      const t = res[i], cat = !t.known ? "unk" : t.cands.length > 1 ? "amb" : "one";
      const pick = {base:t.base, dl:t.dl.tag, ap:t.ap.tag};
      for(const k of ["all", cat]){
        const r = R[k]; r.n++;
        if(t.cands.some(c => c.tag === gold[i])) r.ceil++;
        if(t.cands.some(c => uposOf(c.tag) === s.p[i])) r.ceilU++;
        for(const m of METHODS){ if(pick[m] === gold[i]) r[m]++; if(uposOf(pick[m]) === s.p[i]) r[m + "U"]++; }
      }
    }
  }
  return R;
}

// ───────────────────────── CoNLL-U → cümleler (sınama betikleri için; tarayıcıda /api/corpus kullanılır)
export function parseConllu(text){
  const out = [];
  for(const blk of text.replace(/\r/g, "").split("\n\n")){
    const s = {f:[], l:[], p:[], x:[]};
    for(const line of blk.split("\n")){
      if(!line || line[0] === "#") continue;
      const c = line.split("\t");
      if(c.length < 6 || !/^\d+$/.test(c[0])) continue;
      s.f.push(c[1]); s.l.push(c[2]); s.p.push(c[3]); s.x.push(c[5]);
    }
    if(s.f.length) out.push(s);
  }
  return out;
}
