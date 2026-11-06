// Grafik tabanlı bağımlılık ayrıştırma (Lecture 3): her olası ok (baş → bağımlı) puanlanır, en yüksek toplam puanlı ağaç Chu-Liu/Edmonds ile bulunur.
// Geçiş tabanlı yöntemden farkı: karar tek tek adımlarda değil, tüm cümlenin ağacı üzerinde verilir; projektif olmama kısıtı yoktur (kesişen yaylar da kurulur).
// Ok puanı = özelliklerin ağırlıkları toplamı (ortalama yapılandırılmış perceptron); ilişki etiketi ikinci bir sınıflandırıcıyla seçilir.
// toks: [{id, form, lemma, upos, feats, head, rel}]. Saf JS, DOM yok.

const lcw = s => s.toLocaleLowerCase("tr");
const ROOT = {form:"<kök>", lemma:"<kök>", upos:"KÖK", feats:"_"};

// ───────────────────────── Chu-Liu/Edmonds: kökü 0 olan en büyük ağırlıklı kapsayan ağaç (arborescence)
// edges: [{h, d, w}], düğümler 0..n-1, kök düğüm 0. Dönen: seçilen kenarlar (her düğüm için bir gelen kenar) ya da null (ağaç yok)
export function chuLiuEdmonds(n, edges, root = 0){
  const best = new Array(n).fill(null);
  for(const e of edges){ if(e.d === root || e.h === e.d) continue; if(!best[e.d] || e.w > best[e.d].w) best[e.d] = e; }
  for(let v = 0; v < n; v++) if(v !== root && !best[v]) return null;
  // döngü ara
  const color = new Array(n).fill(0), cyc = [];
  let cycle = null;
  for(let s = 0; s < n && !cycle; s++){
    if(color[s] || s === root) continue;
    const path = []; let v = s;
    while(v !== root && !color[v]){ color[v] = 1; path.push(v); v = best[v].h; }
    if(v !== root && color[v] === 1){ cycle = path.slice(path.indexOf(v)); }
    for(const p of path) color[p] = 2;
  }
  if(!cycle) return best.filter(Boolean);
  // döngüyü tek düğüme çek
  const inC = new Set(cycle), id = new Array(n), c = [];
  let m = 0;
  for(let v = 0; v < n; v++) if(!inC.has(v)) id[v] = m++;
  const cn = m++;
  for(const v of cycle) id[v] = cn;
  const ne = [];
  for(const e of edges){
    if(inC.has(e.h) && inC.has(e.d)) continue;
    if(inC.has(e.d)) ne.push({h:id[e.h], d:cn, w:e.w - best[e.d].w, orig:e});
    else if(inC.has(e.h)) ne.push({h:cn, d:id[e.d], w:e.w, orig:e});
    else ne.push({h:id[e.h], d:id[e.d], w:e.w, orig:e});
  }
  const sub = chuLiuEdmonds(m, ne, id[root]);
  if(!sub) return null;
  // genişlet: döngüye giren kenar o düğümün kendi en iyi kenarının yerini alır
  const out = [], entering = sub.find(e => e.d === cn).orig;
  for(const e of sub) if(e.d !== cn) out.push(e.orig);
  out.push(entering);
  for(const v of cycle) if(v !== entering.d) out.push(best[v]);
  return out;
}

// ───────────────────────── özellikler
function arcFeats(toks, h, d){
  const H = h === 0 ? ROOT : toks[h - 1], D = toks[d - 1];
  const hw = lcw(H.form), dw = lcw(D.form), hu = H.upos, du = D.upos, hl = lcw(H.lemma), dl = lcw(D.lemma);
  const dir = h < d ? "R" : "L", dist = Math.min(Math.abs(h - d), 8), dd = `${dir}${dist}`;
  const f = ["b", `hw=${hw}`, `hu=${hu}`, `hl=${hl}`, `dw=${dw}`, `du=${du}`, `dl=${dl}`, `hx=${H.feats}`, `dx=${D.feats}`, `hs3=${hw.slice(-3)}`, `ds3=${dw.slice(-3)}`,
    `hu,du=${hu},${du}`, `hw,dw=${hw},${dw}`, `hu,dw=${hu},${dw}`, `hw,du=${hw},${du}`, `hl,dl=${hl},${dl}`, `hu,dx=${hu},${D.feats}`, `hx,du=${H.feats},${du}`,
    `dd=${dd}`, `hu,du,dd=${hu},${du},${dd}`, `hw,du,dd=${hw},${du},${dd}`, `hu,dw,dd=${hu},${dw},${dd}`, `du,dd=${du},${dd}`, `hu,dd=${hu},${dd}`];
  const lo = Math.min(h, d), hi = Math.max(h, d);
  if(hi - lo > 1 && hi - lo < 8) for(let k = lo + 1; k < hi; k++) f.push(`hu,bu,du=${hu},${toks[k - 1].upos},${du}`);
  const hp = h > 1 ? toks[h - 2].upos : "<s>", hn = h > 0 && h < toks.length ? toks[h].upos : "</s>", dp = d > 1 ? toks[d - 2].upos : "<s>", dn = d < toks.length ? toks[d].upos : "</s>";
  f.push(`hp,hu,du,dn=${hp},${hu},${du},${dn}`, `hu,hn,dp,du=${hu},${hn},${dp},${du}`, `hu,hn,du,dn=${hu},${hn},${du},${dn}`, `hp,hu,dp,du=${hp},${hu},${dp},${du}`);
  return f;
}
function relFeats(toks, h, d){
  const H = h === 0 ? ROOT : toks[h - 1], D = toks[d - 1], dir = h < d ? "R" : "L";
  const dw = lcw(D.form), hw = lcw(H.form);
  return ["b", `dw=${dw}`, `du=${D.upos}`, `dl=${lcw(D.lemma)}`, `dx=${D.feats}`, `ds3=${dw.slice(-3)}`, `hu=${H.upos}`, `hw=${hw}`, `hx=${H.feats}`, `du,hu=${D.upos},${H.upos}`, `dx,hu=${D.feats},${H.upos}`,
    `dx,hx=${D.feats},${H.feats}`, `dw,hu=${dw},${H.upos}`, `du,hw=${D.upos},${hw}`, `du,hu,dir=${D.upos},${H.upos},${dir}`, `dir=${dir}`, `dist=${Math.min(Math.abs(h - d), 5)}`,
    `dp=${d > 1 ? toks[d - 2].upos : "<s>"}`, `dn=${d < toks.length ? toks[d].upos : "</s>"}`];
}
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ───────────────────────── eğitim
export async function trainGraph(sents, {epochs = 4, seed = 3, onEpoch = null} = {}){
  const vocab = new Map(), W = [], U = [];
  const intern = s => { let i = vocab.get(s); if(i === undefined){ i = W.length; vocab.set(s, i); W.push(0); U.push(0); } return i; };
  // her cümle için tüm okların özellikleri (bir kez hesaplanır, tamsayıya çevrilir)
  const data = sents.map(toks => {
    const n = toks.length, F = Array.from({length:n + 1}, () => new Array(n + 1));
    for(let d = 1; d <= n; d++) for(let h = 0; h <= n; h++) if(h !== d) F[h][d] = Int32Array.from(arcFeats(toks, h, d).map(intern));
    return {toks, F, n};
  });
  const rnd = mulberry(seed), order = data.map((_, i) => i);
  let c = 1;                                           // ortalama için sayaç (u = Σ c·Δ)
  for(let e = 0; e < epochs; e++){
    for(let i = order.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for(const idx of order){
      const {toks, F, n} = data[idx], edges = [];
      for(let d = 1; d <= n; d++) for(let h = 0; h <= n; h++){ if(h === d) continue; let s = 0; for(const f of F[h][d]) s += W[f]; edges.push({h, d, w:s}); }
      const tree = chuLiuEdmonds(n + 1, edges, 0), pred = new Map((tree || []).map(x => [x.d, x.h]));
      for(let d = 1; d <= n; d++){
        const g = toks[d - 1].head, p = pred.get(d);
        if(p !== g){
          for(const f of F[g][d]){ W[f] += 1; U[f] += c; }
          if(p !== undefined) for(const f of F[p][d]){ W[f] -= 1; U[f] -= c; }
        }
      }
      c++;
    }
    if(onEpoch) await onEpoch(e + 1, epochs);
  }
  const w = new Float64Array(W.length);
  for(let i = 0; i < w.length; i++) w[i] = W[i] - U[i] / c;     // ortalama ağırlıklar
  // etiketleyici: altın okların (baş, bağımlı) çiftlerinde ilişkiyi seçen çok sınıflı perceptron
  const lab = new Map(), rels = new Set(), ex = [];
  for(const toks of sents) for(const t of toks){ rels.add(t.rel); ex.push({f:relFeats(toks, t.head, t.id), g:t.rel}); }
  const R = [...rels]; let ci = 1;
  const upd = (f, a, dlt) => { let m = lab.get(f); if(!m){ m = new Map(); lab.set(f, m); } let q = m.get(a); if(!q){ q = [0, 0, ci]; m.set(a, q); } q[1] += (ci - q[2]) * q[0]; q[2] = ci; q[0] += dlt; };
  const pick = fl => { const sc = new Map(); for(const f of fl){ const m = lab.get(f); if(m) for(const [a, q] of m) sc.set(a, (sc.get(a) || 0) + q[0]); } let b = R[0], bs = -Infinity; for(const a of R){ const v = sc.get(a) || 0; if(v > bs){ bs = v; b = a; } } return b; };
  const ord2 = ex.map((_, i) => i);
  for(let e = 0; e < epochs; e++){
    for(let i = ord2.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [ord2[i], ord2[j]] = [ord2[j], ord2[i]]; }
    for(const i of ord2){ const x = ex[i], g = pick(x.f); if(g !== x.g){ for(const f of x.f){ upd(f, x.g, 1); upd(f, g, -1); } } ci++; }
  }
  for(const m of lab.values()) for(const q of m.values()){ q[1] += (ci - q[2]) * q[0]; q[0] = q[1] / ci; }
  return {vocab, w, lab, rels:R, sents:sents.length, arcs:ex.length};
}
function relOf(model, toks, h, d){
  if(h === 0) return "root";
  const sc = new Map();
  for(const f of relFeats(toks, h, d)){ const m = model.lab.get(f); if(m) for(const [a, q] of m) sc.set(a, (sc.get(a) || 0) + q[0]); }
  let b = null, bs = -Infinity;
  for(const a of model.rels){ if(a === "root") continue; const v = sc.get(a) || 0; if(v > bs){ bs = v; b = a; } }
  return b;
}
// ağacı çıkar: toks'taki head ve rel kullanılmaz. Dönen: {arcs:[{h, d, rel}], scores: (n+1)×(n+1)}
export function parseGraph(model, toks){
  const n = toks.length, edges = [], S = Array.from({length:n + 1}, () => new Array(n + 1).fill(null));
  for(let d = 1; d <= n; d++) for(let h = 0; h <= n; h++){
    if(h === d) continue;
    let s = 0; for(const str of arcFeats(toks, h, d)){ const i = model.vocab.get(str); if(i !== undefined) s += model.w[i]; }
    edges.push({h, d, w:s}); S[h][d] = s;
  }
  let tree = chuLiuEdmonds(n + 1, edges, 0) || [];
  // UD: tek kök. Birden çok kök bulunduysa her aday kökü tek başına zorlayıp toplam puanı en yüksek ağacı al
  const roots = tree.filter(e => e.h === 0);
  if(roots.length > 1){
    let bestT = null, bestW = -Infinity;
    for(const r of roots){
      const t = chuLiuEdmonds(n + 1, edges.filter(e => e.h !== 0 || e.d === r.d), 0);
      if(!t) continue;
      const w = t.reduce((x, e) => x + e.w, 0);
      if(w > bestW){ bestW = w; bestT = t; }
    }
    if(bestT) tree = bestT;
  }
  const arcs = tree.map(e => ({h:e.h, d:e.d, rel:relOf(model, toks, e.h, e.d)}));
  return {arcs, scores:S};
}
export function evalGraph(model, sents){
  let n = 0, u = 0, l = 0;
  for(const toks of sents){
    const r = parseGraph(model, toks), p = new Map(r.arcs.map(a => [a.d, a]));
    for(const t of toks){ if(t.upos === "PUNCT") continue; n++; const a = p.get(t.id); if(a && a.h === t.head){ u++; if(a.rel === t.rel) l++; } }
  }
  return {n, uas:u / n, las:l / n};
}
