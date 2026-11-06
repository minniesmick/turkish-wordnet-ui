// Embedding hesapları — DL-3, DL-4 Part 3 (Lecture 6).
// DOM bağımsız; saf JS. Arayüz embedding.js içinde. Test: node scripts/test_emb.mjs
// Yöntemler: one-hot (DL-3 slayt 4-8), co-occurrence/PPMI (mevcut lm.js'ten içe aktarılır),
// Skip-gram + negatif örnekleme (DL-3 slayt 24-26), PCA (DL-3 slayt 27).

import { pmiBuild, similar as pmiSimilar } from "./lm.js";

export { pmiBuild, pmiSimilar };

// ─────────────────────────── tohumlu PRNG (mulberry32)
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─────────────────────────── ön işleme
export function tokenize(text) {
  return text.toLocaleLowerCase("tr").match(/[\p{L}\p{M}\p{N}]+/gu) || [];
}
export function buildVocab(tokens, maxVocab = 10000) {
  const freq = new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  // Frekansa göre sırala, en sık maxVocab kadar al
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxVocab);
  const vocab = new Map(), ivocab = [];
  for (const [w] of sorted) { vocab.set(w, ivocab.length); ivocab.push(w); }
  return { vocab, ivocab, freq: new Map(sorted) };
}

// ─────────────────────────── kosinüs benzerliği
export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─────────────────────────── Skip-gram + negatif örnekleme (DL-3 slayt 24-26)
// Embed matris: W (|V| × dim) merkez vektörler, C (|V| × dim) bağlam vektörleri
// Kayıp: σ(v_w · v_c) + Σ_neg σ(-v_w · v_neg) → logistik binary cross entropy

export function initEmbeddings(vocabSize, dim, seed) {
  const rng = mulberry32(seed);
  const W = new Float64Array(vocabSize * dim);
  const C = new Float64Array(vocabSize * dim);
  // Küçük rasgele değerler
  for (let i = 0; i < W.length; i++) W[i] = (rng() - 0.5) * 0.1;
  for (let i = 0; i < C.length; i++) C[i] = (rng() - 0.5) * 0.01;
  return { W, C };
}

// Dot ürünü: vektör i (W) · vektör j (C)
function dotWC(W, C, i, j, dim) {
  let s = 0;
  const oi = i * dim, oj = j * dim;
  for (let d = 0; d < dim; d++) s += W[oi + d] * C[oj + d];
  return s;
}

function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x)))); }

// Tek (merkez, bağlam, negatifler) üçlüsü için kayıp + gradyan adımı
// Döndürür: loss değeri
export function skipGramStep(W, C, center, context, negatives, dim, lr) {
  const oc = context * dim;
  // Skor
  const scorePos = dotWC(W, C, center, context, dim);
  const sigPos = sigmoid(scorePos);
  const lossPos = -Math.log(sigPos + 1e-15);

  // Pozitif bağlam gradyanı
  const ow = center * dim;
  const dW = new Float64Array(dim); // merkez vektör gradyanı (negatifler için de birleşecek)
  const gradPos = sigPos - 1; // d(-log σ(s))/ds = σ(s) - 1
  for (let d = 0; d < dim; d++) {
    dW[d] += gradPos * C[oc + d];
    C[oc + d] -= lr * gradPos * W[ow + d];
  }

  // Negatif örnekler
  let lossNeg = 0;
  for (const neg of negatives) {
    if (neg === context) continue;
    const on = neg * dim;
    const scoreNeg = dotWC(W, C, center, neg, dim);
    const sigNeg = sigmoid(scoreNeg);
    lossNeg += -Math.log(1 - sigNeg + 1e-15);
    const gradNeg = sigNeg; // d(-log(1-σ(s)))/ds = σ(s)
    for (let d = 0; d < dim; d++) {
      dW[d] += gradNeg * C[on + d];
      C[on + d] -= lr * gradNeg * W[ow + d];
    }
  }

  // Merkez vektörü güncelle
  for (let d = 0; d < dim; d++) W[ow + d] -= lr * dW[d];

  return lossPos + lossNeg;
}

// Negatif örnekleme dağılımı (3/4 güç — DL-3 slayt 26)
export function buildNegSampler(freq, vocab, seed) {
  const ivocab = [...vocab.keys()];
  const weights = ivocab.map(w => Math.pow(freq.get(w) || 1, 0.75));
  const total = weights.reduce((a, b) => a + b, 0);
  const cum = [];
  let s = 0;
  for (const w of weights) { s += w / total; cum.push(s); }
  const rng = mulberry32(seed);
  return function (n) {
    const result = [];
    for (let i = 0; i < n; i++) {
      const r = rng();
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
      result.push(lo);
    }
    return result;
  };
}

// Pencere çifti üretici: (merkez, bağlam) çiftleri dizisi döner
export function buildPairs(tokenIds, window) {
  const pairs = [];
  for (let i = 0; i < tokenIds.length; i++) {
    for (let j = Math.max(0, i - window); j <= Math.min(tokenIds.length - 1, i + window); j++) {
      if (j !== i) pairs.push([tokenIds[i], tokenIds[j]]);
    }
  }
  return pairs;
}

// ─────────────────────────── kademeli eğitim oluşturucu
// Döndürür: {step, getVectors, getLoss, epoch}
export function createTrainer({ tokens, vocab, ivocab, freq, dim, window, negK, lr, seed }) {
  const tokenIds = tokens.map(t => vocab.get(t) ?? -1).filter(i => i >= 0);
  const { W, C } = initEmbeddings(ivocab.length, dim, seed);
  const negSampler = buildNegSampler(freq, vocab, seed + 1);
  const rng = mulberry32(seed + 2);

  let epoch = 0, pairIdx = 0, lossBuf = 0, lossCnt = 0;
  let pairs = [];

  function shufflePairs() {
    pairs = buildPairs(tokenIds, window);
    // Fisher-Yates karıştır (tohumlu)
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    pairIdx = 0;
  }
  shufflePairs();

  // Bir batch adımı (batchSize çift)
  function step(batchSize = 64) {
    if (pairs.length === 0) return { loss: 0, epochDone: true };
    let done = false;
    for (let b = 0; b < batchSize; b++) {
      if (pairIdx >= pairs.length) {
        epoch++;
        shufflePairs();
        done = true;
        break;
      }
      const [center, ctx] = pairs[pairIdx++];
      const negs = negSampler(negK);
      const loss = skipGramStep(W, C, center, ctx, negs, dim, lr);
      lossBuf += loss; lossCnt++;
    }
    const avgLoss = lossCnt > 0 ? lossBuf / lossCnt : 0;
    if (done) { lossBuf = 0; lossCnt = 0; }
    return { loss: avgLoss, epochDone: done };
  }

  function getVector(wordIdx) {
    const v = [];
    const o = wordIdx * dim;
    for (let d = 0; d < dim; d++) v.push(W[o + d]);
    return v;
  }

  function getAll() { return { W: W.slice(), C: C.slice(), dim, vocabSize: ivocab.length }; }

  return { step, getVector, getAll, getEpoch: () => epoch };
}

// ─────────────────────────── k en yakın komşu
export function nearest(wordIdx, W, dim, vocabSize, k = 10) {
  const v = [];
  for (let d = 0; d < dim; d++) v.push(W[wordIdx * dim + d]);
  const scores = [];
  for (let j = 0; j < vocabSize; j++) {
    if (j === wordIdx) continue;
    const u = [];
    for (let d = 0; d < dim; d++) u.push(W[j * dim + d]);
    scores.push([j, cosine(v, u)]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  return scores.slice(0, k);
}

// ─────────────────────────── analoji: a − b + c (DL-3 slayt 27)
export function analogy(aIdx, bIdx, cIdx, W, dim, vocabSize, k = 5) {
  const vec = new Float64Array(dim);
  for (let d = 0; d < dim; d++) {
    vec[d] = W[aIdx * dim + d] - W[bIdx * dim + d] + W[cIdx * dim + d];
  }
  const scores = [];
  for (let j = 0; j < vocabSize; j++) {
    if (j === aIdx || j === bIdx || j === cIdx) continue;
    const u = [];
    for (let d = 0; d < dim; d++) u.push(W[j * dim + d]);
    scores.push([j, cosine([...vec], u)]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  return scores.slice(0, k);
}

// ─────────────────────────── PCA: 2B indirgeme (DL-3 slayt 27)
// Kovaryans + güç yöntemi (deterministik, 2 bileşen)
export function pca2d(W, dim, vocabSize, seed = 0) {
  if (vocabSize === 0 || dim < 2) return [];
  // Ortalama çıkar
  const mean = new Float64Array(dim);
  for (let i = 0; i < vocabSize; i++)
    for (let d = 0; d < dim; d++) mean[d] += W[i * dim + d] / vocabSize;
  const X = new Float64Array(vocabSize * dim);
  for (let i = 0; i < vocabSize; i++)
    for (let d = 0; d < dim; d++) X[i * dim + d] = W[i * dim + d] - mean[d];

  // Güç yöntemi ile ilk 2 özevektör
  function powerIter(mat, size, exclude, iters = 100, seed2 = 0) {
    const rng = mulberry32(seed2);
    let v = new Float64Array(size).map(() => rng() - 0.5);
    if (exclude) {
      // Gram-Schmidt: exclude ile ortogonalleştir
      let dot = 0, n2 = 0;
      for (let i = 0; i < size; i++) { dot += v[i] * exclude[i]; n2 += exclude[i] * exclude[i]; }
      if (n2 > 0) for (let i = 0; i < size; i++) v[i] -= dot / n2 * exclude[i];
    }
    // Normalize
    let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
    v = v.map(x => x / n);
    for (let iter = 0; iter < iters; iter++) {
      // Mv = X^T X v / n (kovaryans · v)
      const Xv = new Float64Array(vocabSize);
      for (let i = 0; i < vocabSize; i++) {
        for (let d = 0; d < size; d++) Xv[i] += X[i * size + d] * v[d];
      }
      const Mv = new Float64Array(size);
      for (let i = 0; i < vocabSize; i++)
        for (let d = 0; d < size; d++) Mv[d] += X[i * size + d] * Xv[i];
      for (let d = 0; d < size; d++) Mv[d] /= vocabSize;
      if (exclude) {
        let dot = 0, n2 = 0;
        for (let d = 0; d < size; d++) { dot += Mv[d] * exclude[d]; n2 += exclude[d] * exclude[d]; }
        if (n2 > 0) for (let d = 0; d < size; d++) Mv[d] -= dot / n2 * exclude[d];
      }
      let nn = 0; for (const x of Mv) nn += x * x; nn = Math.sqrt(nn) || 1;
      v = Mv.map(x => x / nn);
    }
    return v;
  }

  const pc1 = powerIter(X, dim, null, 100, seed);
  const pc2 = powerIter(X, dim, pc1, 100, seed + 1);

  // Her vektörü 2B'ye yansıt
  const result = [];
  for (let i = 0; i < vocabSize; i++) {
    let p1 = 0, p2 = 0;
    for (let d = 0; d < dim; d++) {
      p1 += X[i * dim + d] * pc1[d];
      p2 += X[i * dim + d] * pc2[d];
    }
    result.push([p1, p2]);
  }
  return result;
}

// ─────────────────────────── Sayısal gradyan denetimi (test için)
export function numericalGradCheck(W, C, center, context, negatives, dim, eps = 1e-5) {
  // Analitik gradyan: skipGramStep çağrısından önce dW/dC hesapla
  // Sayısal: W[i] ± eps, kaybı hesapla
  const results = [];
  // W[center * dim + 0] için kontrol
  for (let d = 0; d < Math.min(3, dim); d++) {
    const idx = center * dim + d;
    const W1 = W.slice(); W1[idx] += eps;
    const W2 = W.slice(); W2[idx] -= eps;
    // loss(W1)
    function computeLoss(Wt) {
      const sp = dotFn(Wt, C, center, context, dim);
      let L = -Math.log(sigmoid(sp) + 1e-15);
      for (const neg of negatives) {
        const sn = dotFn(Wt, C, center, neg, dim);
        L += -Math.log(1 - sigmoid(sn) + 1e-15);
      }
      return L;
    }
    function dotFn(Wt, Ct, i, j, d) {
      let s = 0;
      for (let dd = 0; dd < d; dd++) s += Wt[i*d+dd] * Ct[j*d+dd];
      return s;
    }
    const L1 = computeLoss(W1), L2 = computeLoss(W2);
    const numGrad = (L1 - L2) / (2 * eps);
    // Analitik gradyan: dL/dW[center,d] = (σ(s_pos)-1)*C[context,d] + Σ_neg σ(s_neg)*C[neg,d]
    const sp = dotFn(W, C, center, context, dim);
    let anaGrad = (sigmoid(sp) - 1) * C[context * dim + d];
    for (const neg of negatives) {
      const sn = dotFn(W, C, center, neg, dim);
      anaGrad += sigmoid(sn) * C[neg * dim + d];
    }
    const relErr = Math.abs(anaGrad - numGrad) / (Math.abs(anaGrad) + Math.abs(numGrad) + 1e-15);
    results.push({ d, anaGrad, numGrad, relErr });
  }
  return results;
}

