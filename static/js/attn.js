// Attention hesapları — DL-6, DL-7 (Lecture 6).
// DOM bağımsız; saf JS. Arayüz attention.js içinde. Test: node scripts/test_attn.mjs
// Scaled Dot-Product Attention, Multi-Head Attention, Causal Mask, Positional Encoding.

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function softmax(xs) {
  const mx = Math.max(...xs);
  const ex = xs.map(x => (x === -Infinity || x <= -1e8 ? 0 : Math.exp(x - mx)));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(e => (s > 0 ? e / s : 0));
}

// ─────────────────────────── Matris Çarpımı & Transpoz
// A: n x m (array of arrays or 2D array), B: m x p
export function matMul(A, B) {
  const n = A.length, m = B.length, p = B[0].length;
  const C = Array.from({ length: n }, () => new Float64Array(p));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      const a = A[i][k];
      for (let j = 0; j < p; j++) {
        C[i][j] += a * B[k][j];
      }
    }
  }
  return C;
}

export function matTranspose(A) {
  const n = A.length, m = A[0].length;
  const T = Array.from({ length: m }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

// ─────────────────────────── Causal Mask (Nedensel Maske)
// n x n matris: i >= j ise 0, i < j ise -Infinity (geleceği göremez)
export function causalMask(n) {
  const mask = [];
  for (let i = 0; i < n; i++) {
    const row = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      row[j] = j <= i ? 0 : -Infinity;
    }
    mask.push(row);
  }
  return mask;
}

// ─────────────────────────── Scaled Dot-Product Attention (DL-6 slayt 13–16)
// Q: n x d_k, K: m x d_k, V: m x d_v
// mask: n x m opsiyonel maske matrisi (eklenir)
export function scaledDotProductAttention(Q, K, V, { mask = null, scale = true } = {}) {
  const n = Q.length;
  const m = K.length;
  const d_k = Q[0].length;
  const factor = scale ? Math.sqrt(d_k) : 1.0;

  // 1. Q K^T
  const Kt = matTranspose(K);
  const rawScores = matMul(Q, Kt); // n x m

  // 2. / sqrt(d_k)
  const scaledScores = rawScores.map(row => row.map(v => v / factor));

  // 3. Mask ekleme
  const maskedScores = scaledScores.map((row, i) => {
    return row.map((v, j) => {
      if (mask && mask[i]) {
        const mVal = mask[i][j];
        if (mVal === -Infinity || mVal <= -1e8) return -Infinity;
        return v + mVal;
      }
      return v;
    });
  });

  // 4. Softmax (satır satır)
  const weights = maskedScores.map(row => softmax(Array.from(row)));

  // 5. Output = weights * V
  const output = matMul(weights, V);

  return {
    rawScores,
    scaledScores,
    maskedScores,
    weights,
    output
  };
}

// ─────────────────────────── Positional Encoding (DL-6 slayt 22–23)
// PE_{(pos, 2i)} = sin(pos / 10000^{2i/d})
// PE_{(pos, 2i+1)} = cos(pos / 10000^{2i/d})
export function positionalEncoding(seqLen, d_model) {
  const pe = [];
  for (let pos = 0; pos < seqLen; pos++) {
    const row = new Float64Array(d_model);
    for (let i = 0; i < d_model; i += 2) {
      const denom = Math.pow(10000, i / d_model);
      row[i] = Math.sin(pos / denom);
      if (i + 1 < d_model) {
        row[i + 1] = Math.cos(pos / denom);
      }
    }
    pe.push(row);
  }
  return pe;
}

// ─────────────────────────── Multi-Head Attention (DL-6 slayt 17–21)
// X: n x d_model
// heads: h
// W_Q, W_K, W_V: d_model x d_model (veya her head için ayrı)
export function multiHeadAttention(X, { numHeads = 2, d_model = 8, mask = null, seed = 42 } = {}) {
  const n = X.length;
  const d_k = Math.floor(d_model / numHeads);
  const rng = mulberry32(seed);

  const randMat = (r, c) => Array.from({ length: r }, () =>
    new Float64Array(c).map(() => (rng() - 0.5) * 2 / Math.sqrt(r))
  );

  const W_Q = randMat(d_model, d_model);
  const W_K = randMat(d_model, d_model);
  const W_V = randMat(d_model, d_model);
  const W_O = randMat(d_model, d_model);

  const Q_all = matMul(X, W_Q);
  const K_all = matMul(X, W_K);
  const V_all = matMul(X, W_V);

  const headOutputs = [];
  const headWeights = [];

  for (let h = 0; h < numHeads; h++) {
    const start = h * d_k;
    const end = start + d_k;

    // Her head için dilimle
    const Qh = Q_all.map(row => Array.from(row.slice(start, end)));
    const Kh = K_all.map(row => Array.from(row.slice(start, end)));
    const Vh = V_all.map(row => Array.from(row.slice(start, end)));

    const res = scaledDotProductAttention(Qh, Kh, Vh, { mask });
    headOutputs.push(res.output);
    headWeights.push(res.weights);
  }

  // Head çıktılarını birleştir (concatenate)
  const concat = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(d_model);
    for (let h = 0; h < numHeads; h++) {
      const start = h * d_k;
      for (let j = 0; j < d_k; j++) {
        row[start + j] = headOutputs[h][i][j];
      }
    }
    return row;
  });

  const finalOutput = matMul(concat, W_O);

  return {
    headWeights,
    headOutputs,
    concat,
    finalOutput
  };
}

