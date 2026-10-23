// Dil modeli çekirdeği (Lecture 5): n-gram sayımı, olasılık (yumuşatma yok / Laplace / backoff / interpolation), UNK, rastgele üretim, perplexity, PMI.
// Saf JS, DOM yok; arayüz ngram.js, korpus.js içinde. Denetim: node scripts/test_lm.mjs

export const BOS = "<s>", EOS = "</s>", UNK = "<UNK>", SEP = "\u0001";
export const defaultLam = n => n <= 1 ? [1] : n === 2 ? [.3, .7] : [.1, .3, .6];

// sents: dizgi dizileri. n: model sırası. unk: sayımı bu eşikten küçük ya da eşit sözcükler <UNK> olur (0 = kapalı). eos: </s> tahmin edilsin mi (varsayılan n>1)
export function buildModel(sents, n, {unk = 0, eos} = {}){
  const useEos = eos ?? n > 1;
  const wc = new Map();
  for(const s of sents) for(const w of s) wc.set(w, (wc.get(w) || 0) + 1);
  let keep = null, unkTypes = 0;
  if(unk > 0){
    keep = new Set();
    for(const [w, c] of wc) if(c > unk) keep.add(w); else unkTypes++;
    sents = sents.map(s => s.map(w => keep.has(w) ? w : UNK));
  }
  const orders = Array.from({length:n + 1}, () => new Map());
  const vocab = new Map();
  let N = 0;
  for(const s of sents){
    for(const w of s){ vocab.set(w, (vocab.get(w) || 0) + 1); N++; }
    const p = [...Array(n - 1).fill(BOS), ...s, ...(useEos ? [EOS] : [])];
    for(let i = n - 1; i < p.length; i++){
      for(let k = 1; k <= n; k++){
        const key = k === 1 ? "" : p.slice(i - k + 1, i).join(SEP), w = p[i], o = orders[k];
        let e = o.get(key);
        if(!e){ e = {total:0, next:new Map()}; o.set(key, e); }
        e.total++; e.next.set(w, (e.next.get(w) || 0) + 1);
      }
    }
  }
  if(unk > 0 && !vocab.has(UNK)) vocab.set(UNK, 0);
  const words = [...vocab.keys()], cols = useEos ? [...words, EOS] : words;
  return {n, orders, vocab, words, cols, V:cols.length, N, S:sents.length, sents, unk, unkTypes, eos:useEos, known:new Set(words)};
}
// kullanıcı sözcüğünü modelin sözlüğüne eşler (UNK açıksa bilinmeyen sözcük <UNK> olur)
export const mapWord = (m, w) => m.unk > 0 && !m.known.has(w) ? UNK : w;
export const padHist = (m, toks) => { if(m.n === 1) return []; const t = toks.slice(-(m.n - 1)); return [...Array(m.n - 1 - t.length).fill(BOS), ...t]; };

const ents = (m, hist) => { const e = [null]; for(let k = 1; k <= m.n; k++) e.push(m.orders[k].get(hist.slice(m.n - k).join(SEP))); return e; };
// cfg: {smooth: "none" | "laplace" | "backoff" | "interp", alpha, lam}
function pFrom(m, e, w, cfg){
  const n = m.n, sm = cfg.smooth || "none";
  if(sm === "backoff"){
    const a = cfg.alpha ?? .4;
    for(let k = n; k >= 1; k--){
      const x = e[k], c = x?.next.get(w) || 0;
      if(c > 0) return {c, h:x.total, num:c, den:x.total, p:Math.pow(a, n - k) * c / x.total, order:k, how:k === n ? `${k}-gram` : `${k}-gram'a düştü (α${n - k > 1 ? "^" + (n - k) : ""})`};
    }
    return {c:0, h:e[n]?.total || 0, num:0, den:e[n]?.total || 0, p:0, order:0, how:"hiçbir düzeyde yok"};
  }
  if(sm === "interp"){
    const lam = cfg.lam || defaultLam(n), terms = [];
    for(let k = 1; k <= n; k++) if(e[k]?.total > 0) terms.push({k, c:e[k].next.get(w) || 0, h:e[k].total, lam:lam[k - 1] ?? 0});
    const W = terms.reduce((a, t) => a + t.lam, 0) || 1;
    const p = terms.reduce((a, t) => a + (t.lam / W) * t.c / t.h, 0), top = terms[terms.length - 1];
    return {c:top?.c || 0, h:top?.h || 0, num:top?.c || 0, den:top?.h || 0, p, order:top?.k || 0, terms:terms.map(t => ({...t, w:t.lam / W})),
      how:terms.map(t => `${+(t.lam / W).toFixed(3)}·${t.c}/${t.h}`).reverse().join(" + ")};
  }
  const x = e[n], c = x?.next.get(w) || 0, h = x?.total || 0, k = sm === "laplace" ? 1 : 0;
  const num = c + k, den = h + k * m.V;
  return {c, h, num, den, p:den ? num / den : 0, und:!den, order:n, how:""};
}
export const prob = (m, hist, w, cfg) => pFrom(m, ents(m, hist), w, cfg);

// bağlamdan sonra gelebilecek sözcükler ve (normalize) olasılıkları. none: yalnızca görülenler; diğerleri: tüm sözlük
export function dist(m, hist, cfg){
  const e = ents(m, hist), sm = cfg.smooth || "none";
  let words = sm === "none" ? [...(e[m.n]?.next.keys() || [])] : m.cols;
  const probs = words.map(w => pFrom(m, e, w, cfg).p), sum = probs.reduce((a, b) => a + b, 0);
  if(!sum) return {words:[], probs:[]};
  return {words, probs:probs.map(p => p / sum)};
}
// tabloda göstermek için bağlamda görülen sözcükler (none: n. düzey; backoff/interp: n. ve n-1. düzey; laplace: hepsi küçük sözlükte)
export function support(m, hist, cfg, cap = 400){
  const e = ents(m, hist), sm = cfg.smooth || "none", set = new Set();
  if(sm === "laplace" && m.V <= cap) return m.cols.slice();
  for(const k of [m.n, m.n - 1]) if(k >= 1 && e[k]) for(const w of e[k].next.keys()){ set.add(w); if(set.size >= cap * 3) break; }
  return [...set];
}
export function sample(m, cfg, maxLen = 30, rnd = Math.random){
  const out = [], hist = Array(m.n - 1).fill(BOS);
  while(out.length < maxLen){
    const d = dist(m, m.n === 1 ? [] : hist.slice(-(m.n - 1)), cfg);
    if(!d.words.length) break;
    let r = rnd(), i = 0;
    while(i < d.words.length - 1 && (r -= d.probs[i]) > 0) i++;
    const w = d.words[i];
    if(w === EOS) break;
    out.push(w); hist.push(w);
  }
  return out;
}

// bir dizgi dizisinin adım adım olasılığı
export function seqProb(m, raw, cfg){
  const toks = raw.map(w => mapWord(m, w));
  const p = m.n > 1 ? [...Array(m.n - 1).fill(BOS), ...toks, EOS] : toks, steps = [];
  for(let i = m.n > 1 ? m.n - 1 : 0; i < p.length; i++){
    const hist = m.n > 1 ? p.slice(i - m.n + 1, i) : [];
    const rw = raw[i - (m.n > 1 ? m.n - 1 : 0)];
    steps.push({hist, w:p[i], ...prob(m, hist, p[i], cfg), oov:rw !== undefined && !m.known.has(rw)});
  }
  let prod = 1, ls = 0;
  for(const s of steps){ prod *= s.p; ls += s.p > 0 ? Math.log2(s.p) : -Infinity; s.prod = prod; s.ls = ls; }
  return {steps, prod, ls, N:steps.length, ppl:Math.pow(2, -ls / steps.length)};
}
// birçok cümle üzerinde perplexity (adım ayrıntısı tutmaz)
export function perplexity(m, sents, cfg){
  let ls = 0, N = 0, zeros = 0;
  for(const s of sents){
    const toks = s.map(w => mapWord(m, w)), p = m.n > 1 ? [...Array(m.n - 1).fill(BOS), ...toks, EOS] : toks;
    for(let i = m.n > 1 ? m.n - 1 : 0; i < p.length; i++){
      const q = prob(m, m.n > 1 ? p.slice(i - m.n + 1, i) : [], p[i], cfg).p;
      N++; if(q > 0) ls += Math.log2(q); else { zeros++; ls = -Infinity; }
    }
  }
  return {ppl:Math.pow(2, -ls / N), ls, N, zeros};
}

// ───────────────────────── PMI (slayt 34–39)
export function pmiBuild(sents, k){
  const rows = new Map(), occ = new Map();
  let T2 = 0;
  const bump = (a, b) => { let r = rows.get(a); if(!r){ r = new Map(); rows.set(a, r); } r.set(b, (r.get(b) || 0) + 1); occ.set(a, (occ.get(a) || 0) + 1); T2++; };
  for(const s of sents) for(let i = 0; i < s.length; i++) for(let j = i + 1; j <= Math.min(i + k, s.length - 1); j++){ bump(s[i], s[j]); bump(s[j], s[i]); }
  return {rows, occ, T2, k};
}
export const pmi = (pm, a, b) => { const c = pm.rows.get(a)?.get(b) || 0; return c ? Math.log2(c * pm.T2 / (pm.occ.get(a) * pm.occ.get(b))) : -Infinity; };
export function topPairs(pm, minC, limit){
  const out = [];
  for(const [a, r] of pm.rows) for(const [b, c] of r) if(a < b && c >= minC) out.push({a, b, c, pmi:Math.log2(c * pm.T2 / (pm.occ.get(a) * pm.occ.get(b)))});
  return out.sort((x, y) => y.pmi - x.pmi || y.c - x.c).slice(0, limit);
}
export function collocates(pm, w, minC, limit){
  const r = pm.rows.get(w); if(!r) return [];
  return [...r].filter(([, c]) => c >= minC).map(([b, c]) => ({b, c, pmi:Math.log2(c * pm.T2 / (pm.occ.get(w) * pm.occ.get(b)))})).sort((x, y) => y.pmi - x.pmi || y.c - x.c).slice(0, limit);
}
// benzer bağlamlı sözcükler: PPMI vektörleri arasında kosinüs (slayt 35: benzer anlamlı sözcükler benzer bağlamlarda geçer)
export function similar(pm, w, minOcc, limit){
  const vec = x => { const r = pm.rows.get(x), v = new Map(); let nn = 0; for(const [y, c] of r){ const q = Math.log2(c * pm.T2 / (pm.occ.get(x) * pm.occ.get(y))); if(q > 0){ v.set(y, q); nn += q * q; } } return {v, n:Math.sqrt(nn)}; };
  if(!pm.rows.has(w)) return [];
  const q = vec(w), out = [];
  if(!q.n) return [];
  for(const [x] of pm.rows){
    if(x === w || pm.occ.get(x) < minOcc) continue;
    const t = vec(x); if(!t.n) continue;
    let dot = 0; const [s, l] = q.v.size < t.v.size ? [q.v, t.v] : [t.v, q.v];
    for(const [y, a] of s){ const b = l.get(y); if(b) dot += a * b; }
    if(dot) out.push({w:x, cos:dot / (q.n * t.n)});
  }
  return out.sort((a, b) => b.cos - a.cos).slice(0, limit);
}
