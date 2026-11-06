// Geçiş tabanlı bağımlılık ayrıştırma (Lecture 3): arc-standard sistemi ve altın ağaçtan eylem dizisi çıkaran "oracle".
// Durum: yığın (0 = yapay kök ile başlar), tampon (sözcük numaraları), çizilen yaylar. Eylemler:
//   SHIFT: tamponun başını yığına koy
//   LEFT-ARC(rel): yığının ikinci öğesi, en üstteki öğenin bağımlısı olur; ikinci öğe çıkar
//   RIGHT-ARC(rel): yığının en üstteki öğesi, ikincinin bağımlısı olur; en üstteki çıkar
// Oracle yalnızca projektif ağaçlarda çalışır; kesişen yay varsa durur ve nedenini bildirir.
// toks: [{id, form, head, rel}]. Dönen: {ok, steps:[{act, rel, stack, buffer, arcs, note}], reason}
export function oracle(toks){
  const by = new Map(toks.map(t => [t.id, t])), kids = new Map(toks.map(t => [t.id, 0]));
  for(const t of toks) if(t.head) kids.set(t.head, (kids.get(t.head) || 0) + 1);
  const stack = [0], buffer = toks.map(t => t.id), arcs = [], done = new Map(toks.map(t => [t.id, 0]));
  const name = id => id === 0 ? "ROOT" : by.get(id)?.form ?? String(id);
  const steps = [{act:"BAŞLA", stack:stack.slice(), buffer:buffer.slice(), arcs:[], note:"yığında yalnızca ROOT var, tampon tüm cümle"}];
  const snap = (act, rel, note) => steps.push({act, rel, stack:stack.slice(), buffer:buffer.slice(), arcs:arcs.map(a => ({...a})), note});
  let guard = 0;
  while(buffer.length || stack.length > 1){
    if(++guard > 4 * toks.length + 10) return {ok:false, steps, reason:"döngü"};
    const s1 = stack[stack.length - 1], s2 = stack[stack.length - 2];
    if(stack.length >= 2 && s2 !== 0 && by.get(s2).head === s1){
      stack.splice(stack.length - 2, 1); arcs.push({h:s1, d:s2, rel:by.get(s2).rel}); done.set(s1, done.get(s1) + 1);
      snap("LEFT-ARC", by.get(s2).rel, `${name(s2)}, ${name(s1)} sözcüğünün bağımlısı (${by.get(s2).rel}); ${name(s2)} yığından çıkar`);
    }else if(stack.length >= 2 && s1 !== 0 && by.get(s1).head === s2 && done.get(s1) === kids.get(s1)){
      stack.pop(); arcs.push({h:s2, d:s1, rel:by.get(s1).rel}); done.set(s2, done.get(s2) + 1);
      snap("RIGHT-ARC", by.get(s1).rel, `${name(s1)}, ${name(s2)} sözcüğünün bağımlısı (${by.get(s1).rel}); tüm bağımlıları bağlandı, ${name(s1)} yığından çıkar`);
    }else if(buffer.length){
      const b = buffer.shift(); stack.push(b);
      snap("SHIFT", "", `${name(b)} tampondan yığına`);
    }else return {ok:false, steps, reason:"ağaç projektif değil: oracle bu durumda eylem bulamıyor (kesişen yay)"};
  }
  return {ok:true, steps, reason:""};
}
// ağaç yaylarını tek tek yeniden kurup altınla karşılaştır (testler için)
export const sameArcs = (steps, toks) => {
  const last = steps[steps.length - 1].arcs, g = toks.map(t => `${t.head}>${t.id}:${t.rel}`).sort();
  return JSON.stringify(last.map(a => `${a.h}>${a.d}:${a.rel}`).sort()) === JSON.stringify(g);
};

// ───────────────────────── öğrenen ayrıştırıcı: arc-standard + ortalama perceptron (Lecture 3, geçiş tabanlı yöntem)
// Her adımda durumdan (yığın, tampon, o ana kadarki yaylar) özellikler çıkarılır; sınıflandırıcı SHIFT / LEFT-ARC:ilişki / RIGHT-ARC:ilişki arasından seçer (açgözlü).
// Eğitim: projektif eğitim cümlelerinde oracle'ın eylem dizisi altın eylemlerdir. toks: [{id, form, lemma, upos, feats, head, rel}].
const lcw = s => s.toLocaleLowerCase("tr");
const ROOT = {id:0, form:"<kök>", lemma:"<kök>", upos:"KÖK", feats:"_"};
const NONE = {form:"<yok>", lemma:"<yok>", upos:"YOK", feats:"_"};
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function stateFeats(by, stack, buffer, arcs){
  const tk = id => id == null ? NONE : id === 0 ? ROOT : by.get(id);
  const s1 = stack[stack.length - 1], s2 = stack[stack.length - 2], s3 = stack[stack.length - 3], b1 = buffer[0], b2 = buffer[1], b3 = buffer[2];
  const T = {s1:tk(s1), s2:tk(s2), s3:tk(s3), b1:tk(b1), b2:tk(b2), b3:tk(b3)};
  const f = ["b"];
  for(const [p, t] of Object.entries(T)){
    const w = lcw(t.form);
    if(p === "s3" || p === "b3"){ f.push(`${p}u=${t.upos}`); continue; }
    f.push(`${p}w=${w}`, `${p}u=${t.upos}`, `${p}l=${lcw(t.lemma)}`, `${p}s3=${w.slice(-3)}`, `${p}x=${t.feats}`, `${p}wu=${w}|${t.upos}`);
  }
  const u = p => T[p].upos, w = p => lcw(T[p].form);
  f.push(`s1u,b1u=${u("s1")},${u("b1")}`, `s2u,s1u=${u("s2")},${u("s1")}`, `s2u,s1u,b1u=${u("s2")},${u("s1")},${u("b1")}`, `s1u,b1u,b2u=${u("s1")},${u("b1")},${u("b2")}`,
    `s1w,b1w=${w("s1")},${w("b1")}`, `s2w,s1w=${w("s2")},${w("s1")}`, `s1w,b1u=${w("s1")},${u("b1")}`, `s1u,b1w=${u("s1")},${w("b1")}`, `s2u,s1w=${u("s2")},${w("s1")}`,
    `s3u,s2u,s1u=${u("s3")},${u("s2")},${u("s1")}`, `s1x,b1x=${T.s1.feats},${T.b1.feats}`);
  // s1 ve s2'nin en soldaki ve en sağdaki çocuğunun ilişkisi
  for(const [p, id] of [["s1", s1], ["s2", s2]]){
    const kids = arcs.filter(a => a.h === id).sort((a, c) => a.d - c.d);
    f.push(`${p}lc=${kids.length ? kids[0].rel : "-"}`, `${p}rc=${kids.length ? kids[kids.length - 1].rel : "-"}`, `${p}n=${Math.min(kids.length, 3)}`);
  }
  const dist = s1 != null && s2 != null ? Math.abs(s1 - s2) : 0;
  f.push(`d=${Math.min(dist, 6)}`, `st=${Math.min(stack.length, 5)}`, `bf=${Math.min(buffer.length, 4)}`);
  return f;
}
class Perc{
  constructor(){ this.w = new Map(); this.i = 1; }
  upd(f, a, d){ let m = this.w.get(f); if(!m){ m = new Map(); this.w.set(f, m); } let c = m.get(a); if(!c){ c = [0, 0, this.i]; m.set(a, c); } c[1] += (this.i - c[2]) * c[0]; c[2] = this.i; c[0] += d; }
  score(fl, a){ let s = 0; for(const f of fl){ const c = this.w.get(f)?.get(a); if(c) s += c[0]; } return s; }
  // her özelliğin ağırlık tablosunu bir kez gezip eylem puanlarını toplar; en yüksek puanlı yasal eylem seçilir
  best(fl, acts){
    const sc = new Map();
    for(const f of fl){ const m = this.w.get(f); if(m) for(const [a, c] of m) sc.set(a, (sc.get(a) || 0) + c[0]); }
    let b = acts[0], bs = -Infinity;
    for(const a of acts){ const v = sc.get(a) || 0; if(v > bs){ bs = v; b = a; } }
    return b;
  }
  tick(){ this.i++; }
  average(){ for(const m of this.w.values()) for(const c of m.values()){ c[1] += (this.i - c[2]) * c[0]; c[0] = c[1] / this.i; } }
}
const actName = s => s.act === "SHIFT" ? "S" : (s.act === "LEFT-ARC" ? "L:" : "R:") + s.rel;
// durum için yasal eylemler: kök yalnızca tampon boşken bağlanır; rels: öğrenilmiş ilişki kümesi
function legal(stack, buffer, rels){
  const out = [];
  if(buffer.length) out.push("S");
  if(stack.length >= 3) for(const r of rels) if(r !== "root") out.push("L:" + r);
  if(stack.length >= 2){
    if(stack[stack.length - 2] === 0){ if(!buffer.length) out.push("R:root"); }
    else for(const r of rels) if(r !== "root") out.push("R:" + r);
  }
  return out;
}
// onEpoch(tur, toplam): her turdan sonra çağrılır (arayüzün çizilmesi için await edilir)
export async function trainParser(sents, {epochs = 4, seed = 5, onEpoch = null} = {}){
  const examples = [], rels = new Set();
  for(const toks of sents){
    const r = oracle(toks); if(!r.ok) continue;
    const by = new Map(toks.map(t => [t.id, t]));
    for(let k = 1; k < r.steps.length; k++){
      const before = r.steps[k - 1], a = r.steps[k];
      examples.push({by, stack:before.stack, buffer:before.buffer, arcs:before.arcs, gold:actName(a)});
      if(a.rel) rels.add(a.rel);
    }
  }
  const m = new Perc(), rnd = mulberry(seed), order = examples.map((_, i) => i), R = [...rels];
  let last = 0;
  for(let e = 0; e < epochs; e++){
    for(let i = order.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let err = 0;
    for(const idx of order){
      const x = examples[idx], fl = x.fl || (x.fl = stateFeats(x.by, x.stack, x.buffer, x.arcs)), acts = x.acts || (x.acts = legal(x.stack, x.buffer, R));
      const g = x.gold, guess = m.best(fl, acts.includes(g) ? acts : [...acts, g]);
      if(guess !== g){ err++; for(const f of fl){ m.upd(f, g, 1); m.upd(f, guess, -1); } }
      m.tick();
    }
    last = err / examples.length;
    if(onEpoch) await onEpoch(e + 1, epochs);
  }
  m.average();
  return {m, rels:R, n:examples.length, sents:sents.length, trainErr:last};
}
// açgözlü ayrıştırma; toks'taki head ve rel alanları kullanılmaz. Dönen: {arcs:[{h, d, rel}], steps}
export function parse(model, toks){
  const by = new Map(toks.map(t => [t.id, t])), stack = [0], buffer = toks.map(t => t.id), arcs = [], steps = [];
  let guard = 0;
  while((buffer.length || stack.length > 1) && ++guard <= 4 * toks.length + 10){
    const acts = legal(stack, buffer, model.rels);
    if(!acts.length) break;
    const a = model.m.best(stateFeats(by, stack, buffer, arcs), acts);
    if(a === "S") stack.push(buffer.shift());
    else if(a[0] === "L"){ const d = stack.splice(stack.length - 2, 1)[0]; arcs.push({h:stack[stack.length - 1], d, rel:a.slice(2)}); }
    else { const d = stack.pop(); arcs.push({h:stack[stack.length - 1], d, rel:a.slice(2)}); }
    steps.push({act:a === "S" ? "SHIFT" : a[0] === "L" ? "LEFT-ARC" : "RIGHT-ARC", rel:a === "S" ? "" : a.slice(2), stack:stack.slice(), buffer:buffer.slice(), arcs:arcs.map(x => ({...x}))});
  }
  // takılırsa bağlanmamış sözcükleri kökün altına bağla (geçerli bir ağaç döndürmek için)
  const has = new Set(arcs.map(a => a.d));
  for(const t of toks) if(!has.has(t.id)) arcs.push({h:0, d:t.id, rel:"dep"});
  return {arcs, steps};
}
// UAS / LAS (noktalama sayılmaz)
export function evalParser(model, sents){
  let n = 0, u = 0, l = 0;
  for(const toks of sents){
    const r = parse(model, toks), p = new Map(r.arcs.map(a => [a.d, a]));
    for(const t of toks){ if(t.upos === "PUNCT") continue; n++; const a = p.get(t.id); if(a && a.h === t.head){ u++; if(a.rel === t.rel) l++; } }
  }
  return {n, uas:u / n, las:l / n};
}
