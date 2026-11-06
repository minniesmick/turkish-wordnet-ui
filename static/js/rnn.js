// RNN hesapları — DL-5 (Lecture 6).
// DOM bağımsız; saf JS. Arayüz rnnlab.js içinde. Test: node scripts/test_rnn.mjs
// Vanilla RNN, BPTT, Gradyan Kırpma, Kaybolan Gradyan Analizi, LSTM/GRU Hücre İleri Yayılımı.

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
  const ex = xs.map(x => Math.exp(x - mx));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(e => e / (s || 1));
}

export function sigmoid(x) {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
}

// ─────────────────────────── Vanilla RNN Modeli
// x_t: tek-hot vektör (vocabSize)
// h_t = tanh(W_xh · x_t + W_hh · h_{t-1} + b_h)
// y_t = softmax(W_hy · h_t + b_y)
export function initRNN(vocabSize, hiddenSize, seed = 42) {
  const rng = mulberry32(seed);
  const std = 1 / Math.sqrt(hiddenSize);

  const randArr = len => {
    const a = new Float64Array(len);
    for (let i = 0; i < len; i++) a[i] = (rng() - 0.5) * 2 * std;
    return a;
  };

  return {
    vocabSize,
    hiddenSize,
    W_xh: randArr(hiddenSize * vocabSize), // [h, v] -> W_xh[h * vocabSize + v]
    W_hh: randArr(hiddenSize * hiddenSize), // [h, h_prev] -> W_hh[h * hiddenSize + h_prev]
    W_hy: randArr(vocabSize * hiddenSize),  // [v, h] -> W_hy[v * hiddenSize + h]
    b_h: new Float64Array(hiddenSize),
    b_y: new Float64Array(vocabSize)
  };
}

// Tek adım ileri yayılım
export function stepRNN(model, xIdx, hPrev) {
  const { vocabSize, hiddenSize, W_xh, W_hh, W_hy, b_h, b_y } = model;
  const hRaw = new Float64Array(hiddenSize);
  const h = new Float64Array(hiddenSize);

  for (let i = 0; i < hiddenSize; i++) {
    let sum = b_h[i];
    if (xIdx >= 0 && xIdx < vocabSize) {
      sum += W_xh[i * vocabSize + xIdx];
    }
    for (let j = 0; j < hiddenSize; j++) {
      sum += W_hh[i * hiddenSize + j] * hPrev[j];
    }
    hRaw[i] = sum;
    h[i] = Math.tanh(sum);
  }

  const yRaw = new Float64Array(vocabSize);
  for (let k = 0; k < vocabSize; k++) {
    let sum = b_y[k];
    for (let i = 0; i < hiddenSize; i++) {
      sum += W_hy[k * hiddenSize + i] * h[i];
    }
    yRaw[k] = sum;
  }
  const p = softmax([...yRaw]);

  return { hRaw, h, yRaw, p };
}

// Diziyi açılım (unrolled) halinde ileri yay
// inputs: [charIdx_0, charIdx_1, ...]
export function forwardSequence(model, inputs, h0 = null) {
  const { hiddenSize } = model;
  const T = inputs.length;
  let curH = h0 || new Float64Array(hiddenSize);

  const steps = []; // her adımın {xIdx, hPrev, hRaw, h, yRaw, p}
  for (let t = 0; t < T; t++) {
    const xIdx = inputs[t];
    const prev = curH;
    const s = stepRNN(model, xIdx, prev);
    steps.push({ xIdx, hPrev: prev, ...s });
    curH = s.h;
  }
  return steps;
}

// ─────────────────────────── BPTT (Backpropagation Through Time)
// targets: [charIdx_1, charIdx_2, ...] (inputs ile aynı uzunlukta, bir sonraki karakterler)
export function backwardBPTT(model, steps, targets) {
  const { vocabSize, hiddenSize, W_xh, W_hh, W_hy } = model;
  const T = steps.length;

  const dW_xh = new Float64Array(hiddenSize * vocabSize);
  const dW_hh = new Float64Array(hiddenSize * hiddenSize);
  const dW_hy = new Float64Array(vocabSize * hiddenSize);
  const db_h = new Float64Array(hiddenSize);
  const db_y = new Float64Array(vocabSize);

  const dhNorms = new Float64Array(T); // her adımda ||dh_t|| (kaybolan gradyan analizi için)

  let dhNext = new Float64Array(hiddenSize);
  let totalLoss = 0;

  for (let t = T - 1; t >= 0; t--) {
    const { xIdx, hPrev, h, p } = steps[t];
    const target = targets[t];

    // Kayıp: -log(p[target])
    totalLoss += -Math.log(Math.max(p[target], 1e-15));

    // dy = p - 1_target
    const dy = new Float64Array(vocabSize);
    for (let k = 0; k < vocabSize; k++) {
      dy[k] = p[k] - (k === target ? 1 : 0);
      db_y[k] += dy[k];
      for (let i = 0; i < hiddenSize; i++) {
        dW_hy[k * hiddenSize + i] += dy[k] * h[i];
      }
    }

    // dh = W_hy^T * dy + dhNext
    const dh = new Float64Array(hiddenSize);
    for (let i = 0; i < hiddenSize; i++) {
      let sum = dhNext[i];
      for (let k = 0; k < vocabSize; k++) {
        sum += W_hy[k * hiddenSize + i] * dy[k];
      }
      dh[i] = sum;
    }

    // Kaybolan gradyan normu: ||dh||
    let normSq = 0;
    for (let i = 0; i < hiddenSize; i++) normSq += dh[i] * dh[i];
    dhNorms[t] = Math.sqrt(normSq);

    // dhRaw = (1 - h^2) * dh
    const dhRaw = new Float64Array(hiddenSize);
    for (let i = 0; i < hiddenSize; i++) {
      dhRaw[i] = (1 - h[i] * h[i]) * dh[i];
      db_h[i] += dhRaw[i];
      if (xIdx >= 0 && xIdx < vocabSize) {
        dW_xh[i * vocabSize + xIdx] += dhRaw[i];
      }
      for (let j = 0; j < hiddenSize; j++) {
        dW_hh[i * hiddenSize + j] += dhRaw[i] * hPrev[j];
      }
    }

    // dhNext = W_hh^T * dhRaw
    dhNext = new Float64Array(hiddenSize);
    for (let j = 0; j < hiddenSize; j++) {
      let s = 0;
      for (let i = 0; i < hiddenSize; i++) {
        s += W_hh[i * hiddenSize + j] * dhRaw[i];
      }
      dhNext[j] = s;
    }
  }

  const grads = { dW_xh, dW_hh, dW_hy, db_h, db_y };
  // Gradyanları adım sayısına (T) bölerek ortalama gradyan elde et
  for (const k of Object.keys(grads)) {
    const arr = grads[k];
    for (let i = 0; i < arr.length; i++) arr[i] /= T;
  }

  return {
    totalLoss: totalLoss / T,
    grads,
    dhNorms
  };
}

// ─────────────────────────── Gradyan Kırpma (Gradient Clipping)
export function clipGradients(grads, maxNorm = 5.0) {
  let totalNormSq = 0;
  for (const key of Object.keys(grads)) {
    const arr = grads[key];
    for (let i = 0; i < arr.length; i++) totalNormSq += arr[i] * arr[i];
  }
  const totalNorm = Math.sqrt(totalNormSq);
  if (totalNorm > maxNorm) {
    const scale = maxNorm / totalNorm;
    for (const key of Object.keys(grads)) {
      const arr = grads[key];
      for (let i = 0; i < arr.length; i++) arr[i] *= scale;
    }
  }
  return totalNorm;
}

// ─────────────────────────── Ağırlık Güncelleme (SGD / Adam)
export function applyGradients(model, grads, lr) {
  for (const key of Object.keys(grads)) {
    const targetArr = model[key.replace("d", "")];
    const gradArr = grads[key];
    for (let i = 0; i < targetArr.length; i++) {
      targetArr[i] -= lr * gradArr[i];
    }
  }
}

// ─────────────────────────── Karakter Seviyesinde Metin Üretimi
export function sampleText(model, charMap, startChar, length = 50, temperature = 1.0, seed = 0) {
  const invMap = [];
  for (const [ch, idx] of charMap.entries()) invMap[idx] = ch;
  const rng = mulberry32(seed);

  let curIdx = charMap.get(startChar) ?? 0;
  let curH = new Float64Array(model.hiddenSize);
  let result = startChar;

  for (let t = 0; t < length; t++) {
    const step = stepRNN(model, curIdx, curH);
    curH = step.h;

    // Sıcaklık ayarlı örnekleme
    const probs = softmax(step.yRaw.map(v => v / Math.max(temperature, 1e-4)));

    // Dağılımdan çek
    const r = rng();
    let acc = 0;
    let chosen = probs.length - 1;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      if (r <= acc) {
        chosen = i;
        break;
      }
    }

    result += invMap[chosen] || "?";
    curIdx = chosen;
  }
  return result;
}

// ─────────────────────────── LSTM Hücre Adımı (DL-5 slayt 16–24)
// f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
// i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
// c~_t = tanh(W_c · [h_{t-1}, x_t] + b_c)
// c_t = f_t * c_{t-1} + i_t * c~_t
// o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
// h_t = o_t * tanh(c_t)
export function stepLSTM(weights, x, hPrev, cPrev) {
  const H = hPrev.length;
  const f = new Float64Array(H);
  const i = new Float64Array(H);
  const cBar = new Float64Array(H);
  const c = new Float64Array(H);
  const o = new Float64Array(H);
  const h = new Float64Array(H);

  for (let k = 0; k < H; k++) {
    f[k] = sigmoid(weights.W_f[k] * hPrev[k] + weights.U_f[k] * x + weights.b_f[k]);
    i[k] = sigmoid(weights.W_i[k] * hPrev[k] + weights.U_i[k] * x + weights.b_i[k]);
    cBar[k] = Math.tanh(weights.W_c[k] * hPrev[k] + weights.U_c[k] * x + weights.b_c[k]);
    c[k] = f[k] * cPrev[k] + i[k] * cBar[k];
    o[k] = sigmoid(weights.W_o[k] * hPrev[k] + weights.U_o[k] * x + weights.b_o[k]);
    h[k] = o[k] * Math.tanh(c[k]);
  }
  return { f, i, cBar, c, o, h };
}

// ─────────────────────────── GRU Hücre Adımı (DL-5 slayt 20)
// z_t = σ(W_z · [h_{t-1}, x_t] + b_z)
// r_t = σ(W_r · [h_{t-1}, x_t] + b_r)
// h~_t = tanh(W · [r_t * h_{t-1}, x_t] + b)
// h_t = (1 - z_t) * h_{t-1} + z_t * h~_t
export function stepGRU(weights, x, hPrev) {
  const H = hPrev.length;
  const z = new Float64Array(H);
  const r = new Float64Array(H);
  const hBar = new Float64Array(H);
  const h = new Float64Array(H);

  for (let k = 0; k < H; k++) {
    z[k] = sigmoid(weights.W_z[k] * hPrev[k] + weights.U_z[k] * x + weights.b_z[k]);
    r[k] = sigmoid(weights.W_r[k] * hPrev[k] + weights.U_r[k] * x + weights.b_r[k]);
    hBar[k] = Math.tanh(weights.W_h[k] * (r[k] * hPrev[k]) + weights.U_h[k] * x + weights.b_h[k]);
    h[k] = (1 - z[k]) * hPrev[k] + z[k] * hBar[k];
  }
  return { z, r, hBar, h };
}

// ─────────────────────────── Sayısal Gradyan Denetimi (BPTT vs Sayısal)
export function numericalGradCheckRNN(model, inputs, targets, eps = 1e-5) {
  const lossFn = (m) => {
    const steps = forwardSequence(m, inputs);
    let loss = 0;
    for (let t = 0; t < steps.length; t++) {
      loss += -Math.log(Math.max(steps[t].p[targets[t]], 1e-15));
    }
    return loss / steps.length;
  };

  const steps = forwardSequence(model, inputs);
  const { grads: anaGrads } = backwardBPTT(model, steps, targets);

  const results = [];
  // W_hh üzerinde ilk 3 parametreyi kontrol et
  for (let i = 0; i < Math.min(3, model.W_hh.length); i++) {
    const orig = model.W_hh[i];
    model.W_hh[i] = orig + eps;
    const l1 = lossFn(model);
    model.W_hh[i] = orig - eps;
    const l2 = lossFn(model);
    model.W_hh[i] = orig;

    const numGrad = (l1 - l2) / (2 * eps);
    const anaGrad = anaGrads.dW_hh[i];
    const relErr = Math.abs(anaGrad - numGrad) / (Math.abs(anaGrad) + Math.abs(numGrad) + 1e-15);
    results.push({ param: `W_hh[${i}]`, anaGrad, numGrad, relErr });
  }

  // W_hy üzerinde ilk 2 parametreyi kontrol et
  for (let i = 0; i < Math.min(2, model.W_hy.length); i++) {
    const orig = model.W_hy[i];
    model.W_hy[i] = orig + eps;
    const l1 = lossFn(model);
    model.W_hy[i] = orig - eps;
    const l2 = lossFn(model);
    model.W_hy[i] = orig;

    const numGrad = (l1 - l2) / (2 * eps);
    const anaGrad = anaGrads.dW_hy[i];
    const relErr = Math.abs(anaGrad - numGrad) / (Math.abs(anaGrad) + Math.abs(numGrad) + 1e-15);
    results.push({ param: `W_hy[${i}]`, anaGrad, numGrad, relErr });
  }

  return results;
}
