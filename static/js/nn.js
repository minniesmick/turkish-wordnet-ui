// Sinir ağı hesapları — DL-1, DL-2 (Lecture 6).
// DOM bağımsız; saf JS. Arayüz nnlab.js içinde. Test: node scripts/test_nn.mjs

// ─────────────────────────── tohumlu PRNG (mulberry32)
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─────────────────────────── matris yardımcıları
// Matrisler: {data: Float64Array, rows, cols}
export function mat(rows, cols, fill = 0) {
  return { data: new Float64Array(rows * cols).fill(fill), rows, cols };
}
export function matGet(m, r, c) { return m.data[r * m.cols + c]; }
export function matSet(m, r, c, v) { m.data[r * m.cols + c] = v; }
export function matMul(A, B) {
  if (A.cols !== B.rows) throw new Error("Boyut uyuşmazlığı");
  const C = mat(A.rows, B.cols);
  for (let i = 0; i < A.rows; i++)
    for (let k = 0; k < A.cols; k++) {
      const a = matGet(A, i, k);
      for (let j = 0; j < B.cols; j++)
        C.data[i * C.cols + j] += a * matGet(B, k, j);
    }
  return C;
}
export function matT(A) {
  const B = mat(A.cols, A.rows);
  for (let i = 0; i < A.rows; i++)
    for (let j = 0; j < A.cols; j++)
      matSet(B, j, i, matGet(A, i, j));
  return B;
}
export function matAdd(A, B) {
  const C = mat(A.rows, A.cols);
  for (let i = 0; i < A.data.length; i++) C.data[i] = A.data[i] + B.data[i];
  return C;
}
export function matScale(A, s) {
  const C = mat(A.rows, A.cols);
  for (let i = 0; i < A.data.length; i++) C.data[i] = A.data[i] * s;
  return C;
}
export function matClone(A) {
  return { data: A.data.slice(), rows: A.rows, cols: A.cols };
}
// vektör: 1 boyutlu dizi
export function vecAdd(a, b) { return a.map((v, i) => v + b[i]); }
export function vecScale(a, s) { return a.map(v => v * s); }
export function vecDot(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }

// ─────────────────────────── aktivasyon işlevleri (DL-1 slayt 22–29)
export function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
export function sigmoidD(a) { return a * (1 - a); } // türevi çıktıya göre
export function tanhAct(x) { return Math.tanh(x); }
export function tanhD(a) { return 1 - a * a; }
export function relu(x) { return x > 0 ? x : 0; }
export function reluD(a) { return a > 0 ? 1 : 0; }
// softmax: sayısal kararlı (taşmaz) — DL-1 slayt 25
export function softmax(xs) {
  const mx = Math.max(...xs);
  const ex = xs.map(x => Math.exp(x - mx));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(e => e / s);
}
// aktivasyon seçici
export function applyAct(act, x) {
  if (act === "relu") return relu(x);
  if (act === "tanh") return tanhAct(x);
  if (act === "sigmoid") return sigmoid(x);
  return x; // linear
}
export function applyActD(act, a) { // türevi, a = aktivasyon çıktısı
  if (act === "relu") return reluD(a);
  if (act === "tanh") return tanhD(a);
  if (act === "sigmoid") return sigmoidD(a);
  return 1; // linear
}

// ─────────────────────────── kayıp işlevleri (DL-2 slayt 4–6)
// MSE
export function lossMSE(pred, target) {
  let s = 0;
  for (let i = 0; i < pred.length; i++) s += (pred[i] - target[i]) ** 2;
  return s / pred.length;
}
export function lossMSEGrad(pred, target) {
  const n = pred.length;
  return pred.map((p, i) => 2 * (p - target[i]) / n);
}
// Çapraz entropi (softmax çıktı varsayımı)
export function lossCE(pred, target) {
  let s = 0;
  for (let i = 0; i < pred.length; i++) s -= target[i] * Math.log(Math.max(pred[i], 1e-15));
  return s;
}
// İkili çapraz entropi (BCE): tek sigmoid çıktı, hedef 0 ya da 1
export function lossBCE(pred, target) {
  let s = 0;
  for (let i = 0; i < pred.length; i++) s -= target[i] * Math.log(Math.max(pred[i], 1e-15)) + (1 - target[i]) * Math.log(Math.max(1 - pred[i], 1e-15));
  return s / pred.length;
}
// softmax + CE birleşik gradyanı: pred (softmax sonrası) - target
export function lossCESoftmaxGrad(pred, target) {
  return pred.map((p, i) => p - target[i]);
}

// ─────────────────────────── ağ mimarisi ve başlatma
// layers: [{size, act}], son katmanın aktivasyonu "softmax" olabilir
// seed: tohumlu PRNG ile Xavier başlatma
export function buildNetwork(layerDefs, seed = 42) {
  const rng = mulberry32(seed);
  const layers = [];
  for (let i = 1; i < layerDefs.length; i++) {
    const inSize = layerDefs[i - 1].size;
    const outSize = layerDefs[i].size;
    const act = layerDefs[i].act || "relu";
    // Xavier başlatma: std = sqrt(2 / (fan_in + fan_out))
    const std = Math.sqrt(2 / (inSize + outSize));
    const W = mat(inSize, outSize);
    const b = new Float64Array(outSize);
    for (let j = 0; j < W.data.length; j++) {
      // Box-Muller ile normal dağılım
      const u1 = rng() + 1e-15, u2 = rng();
      W.data[j] = std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    layers.push({ W, b, act, inSize, outSize });
  }
  return layers;
}

// ─────────────────────────── ileri yayılım (DL-1 slayt 14–20)
// Döndürür: {activations, zs} — her katmanın z (lineer) ve a (aktivasyon sonrası) değerleri
export function forward(network, x) {
  const activations = [new Float64Array(x)]; // 0. katman = girdi
  const zs = [null];
  let a = new Float64Array(x);
  for (const layer of network) {
    const z = new Float64Array(layer.outSize);
    // z = W^T · a + b
    for (let j = 0; j < layer.outSize; j++) {
      let sum = layer.b[j];
      for (let i = 0; i < layer.inSize; i++) sum += a[i] * layer.W.data[i * layer.outSize + j];
      z[j] = sum;
    }
    zs.push(z);
    // Son katman + softmax
    if (layer.act === "softmax") {
      a = new Float64Array(softmax([...z]));
    } else {
      a = new Float64Array(z.map(v => applyAct(layer.act, v)));
    }
    activations.push(a);
  }
  return { activations, zs };
}

// ─────────────────────────── geri yayılım (DL-2 slayt 11–27)
// loss: "mse" | "ce", target: hedef vektör
export function backward(network, activations, zs, target, loss = "mse") {
  const grads = network.map(l => ({
    dW: mat(l.inSize, l.outSize),
    db: new Float64Array(l.outSize)
  }));
  const n = network.length;
  const pred = [...activations[n]];
  const tgt = [...target];
  // Çıktı katmanı gradyanı
  let delta;
  const lastLayer = network[n - 1];
  if (lastLayer.act === "sigmoid" && loss === "bce") {
    // sigmoid + BCE: türevler sadeleşir, delta = pred - target (PyTorch BCELoss ile sigmoid birlikte)
    delta = new Float64Array(pred.map((p, i) => p - tgt[i]));
  } else if (lastLayer.act === "softmax" && loss === "ce") {
    // softmax + CE: delta = pred - target
    delta = new Float64Array(lossCESoftmaxGrad(pred, tgt));
  } else {
    const lGrad = loss === "ce" ?
      pred.map((p, i) => -tgt[i] / Math.max(p, 1e-15)) :
      lossMSEGrad(pred, tgt);
    // * aktivasyon türevi
    delta = new Float64Array(pred.map((a, i) => lGrad[i] * applyActD(lastLayer.act, a)));
  }
  // Her katman için gradyanları hesapla
  for (let l = n - 1; l >= 0; l--) {
    const layer = network[l];
    const aIn = activations[l]; // katmana giren aktivasyon
    // dW = aIn^T · delta, db = delta
    for (let i = 0; i < layer.inSize; i++)
      for (let j = 0; j < layer.outSize; j++)
        grads[l].dW.data[i * layer.outSize + j] += aIn[i] * delta[j];
    for (let j = 0; j < layer.outSize; j++) grads[l].db[j] += delta[j];
    // Önceki katman için delta
    if (l > 0) {
      const newDelta = new Float64Array(layer.inSize);
      for (let i = 0; i < layer.inSize; i++) {
        let s = 0;
        for (let j = 0; j < layer.outSize; j++) s += layer.W.data[i * layer.outSize + j] * delta[j];
        newDelta[i] = s * applyActD(network[l - 1].act, activations[l][i]);
      }
      delta = newDelta;
    }
  }
  return grads;
}

// ─────────────────────────── tek adım ayrıntı (öğrenci kipi)
// Bir örnek için z, a, delta, dW değerlerini döndürür
export function forwardDetail(network, x) {
  const { activations, zs } = forward(network, x);
  return { activations, zs };
}
export function backwardDetail(network, activations, zs, target, loss) {
  return backward(network, activations, zs, target, loss);
}

// ─────────────────────────── ağırlık güncelleme
// opt: {type:"sgd"|"momentum"|"adam", lr, mu, beta1, beta2, eps}
// state: optimizer durumu (momentum / adam için)
export function updateWeights(network, grads, opt, optState, batchSize = 1) {
  const lr = opt.lr ?? 0.01;
  const type = opt.type || "sgd";
  if (!optState.t) optState.t = 0;
  optState.t++;
  const t = optState.t;
  for (let l = 0; l < network.length; l++) {
    const layer = network[l];
    const g = grads[l];
    const bs = batchSize;
    if (type === "sgd") {
      for (let i = 0; i < layer.W.data.length; i++) layer.W.data[i] -= lr * g.dW.data[i] / bs;
      for (let j = 0; j < layer.b.length; j++) layer.b[j] -= lr * g.db[j] / bs;
    } else if (type === "momentum") {
      const mu = opt.mu || 0.9;
      if (!optState.vW) {
        optState.vW = network.map(l => new Float64Array(l.W.data.length));
        optState.vb = network.map(l => new Float64Array(l.b.length));
      }
      for (let i = 0; i < layer.W.data.length; i++) {
        optState.vW[l][i] = mu * optState.vW[l][i] + lr * g.dW.data[i] / bs;
        layer.W.data[i] -= optState.vW[l][i];
      }
      for (let j = 0; j < layer.b.length; j++) {
        optState.vb[l][j] = mu * optState.vb[l][j] + lr * g.db[j] / bs;
        layer.b[j] -= optState.vb[l][j];
      }
    } else if (type === "adam") {
      const b1 = opt.beta1 || 0.9, b2 = opt.beta2 || 0.999, eps = opt.eps || 1e-8;
      if (!optState.mW) {
        optState.mW = network.map(l => new Float64Array(l.W.data.length));
        optState.vW = network.map(l => new Float64Array(l.W.data.length));
        optState.mb = network.map(l => new Float64Array(l.b.length));
        optState.vb = network.map(l => new Float64Array(l.b.length));
      }
      const bc1 = 1 - b1 ** t, bc2 = 1 - b2 ** t;
      for (let i = 0; i < layer.W.data.length; i++) {
        const gi = g.dW.data[i] / bs;
        optState.mW[l][i] = b1 * optState.mW[l][i] + (1 - b1) * gi;
        optState.vW[l][i] = b2 * optState.vW[l][i] + (1 - b2) * gi * gi;
        const mHat = optState.mW[l][i] / bc1, vHat = optState.vW[l][i] / bc2;
        layer.W.data[i] -= lr * mHat / (Math.sqrt(vHat) + eps);
      }
      for (let j = 0; j < layer.b.length; j++) {
        const gj = g.db[j] / bs;
        optState.mb[l][j] = b1 * optState.mb[l][j] + (1 - b1) * gj;
        optState.vb[l][j] = b2 * optState.vb[l][j] + (1 - b2) * gj * gj;
        const mHat = optState.mb[l][j] / bc1, vHat = optState.vb[l][j] / bc2;
        layer.b[j] -= lr * mHat / (Math.sqrt(vHat) + eps);
      }
    }
  }
}

// ─────────────────────────── oyuncak veri kümeleri (tohumlu, 2B girdi)
// DL-2 bağlamında sınır kararı görselleştirmek için
export function generateDataset(type, n = 200, noise = 0.1, seed = 42) {
  const rng = mulberry32(seed);
  const gauss = () => {
    const u = rng() + 1e-15, v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pts = [];
  if (type === "xor") {
    for (let i = 0; i < n; i++) {
      const x = rng() * 2 - 1, y = rng() * 2 - 1;
      const lbl = (x > 0) === (y > 0) ? 0 : 1;
      pts.push({ x: x + gauss() * noise, y: y + gauss() * noise, label: lbl });
    }
  } else if (type === "circles") {
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
      const angle = rng() * 2 * Math.PI;
      pts.push({ x: 0.5 * Math.cos(angle) + gauss() * noise, y: 0.5 * Math.sin(angle) + gauss() * noise, label: 0 });
    }
    for (let i = half; i < n; i++) {
      const angle = rng() * 2 * Math.PI;
      pts.push({ x: 1.1 * Math.cos(angle) + gauss() * noise, y: 1.1 * Math.sin(angle) + gauss() * noise, label: 1 });
    }
  } else if (type === "moons") {
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
      const angle = Math.PI * i / half;
      pts.push({ x: Math.cos(angle) + gauss() * noise, y: Math.sin(angle) + gauss() * noise, label: 0 });
    }
    for (let i = half; i < n; i++) {
      const angle = Math.PI * (i - half) / (n - half);
      pts.push({ x: 1 - Math.cos(angle) + gauss() * noise, y: 0.5 - Math.sin(angle) + gauss() * noise, label: 1 });
    }
  } else if (type === "spiral") {
    const half = Math.floor(n / 2);
    for (let cls = 0; cls < 2; cls++) {
      for (let i = 0; i < half; i++) {
        const t = i / half, angle = t * 4 * Math.PI + cls * Math.PI;
        const r = t;
        pts.push({ x: r * Math.cos(angle) + gauss() * noise, y: r * Math.sin(angle) + gauss() * noise, label: cls });
      }
    }
  } else { // linear
    for (let i = 0; i < n; i++) {
      const x = rng() * 2 - 1, y = rng() * 2 - 1;
      pts.push({ x: x + gauss() * noise, y: y + gauss() * noise, label: x + y > 0 ? 1 : 0 });
    }
  }
  return pts;
}

// ─────────────────────────── mini-batch eğitim adımı
// dataset: [{x, y, label}], layerDefs, döndürür {loss, accuracy}
export function trainBatch(network, batch, lossType, opt, optState) {
  const grads = network.map(l => ({
    dW: mat(l.inSize, l.outSize),
    db: new Float64Array(l.outSize)
  }));
  let totalLoss = 0, correct = 0;
  for (const pt of batch) {
    const inp = [pt.x, pt.y];
    const { activations, zs } = forward(network, inp);
    const outSize = network[network.length - 1].outSize;
    const target = new Float64Array(outSize);
    target[pt.label] = 1;
    const pred = [...activations[activations.length - 1]];
    totalLoss += (lossType === "ce") ? lossCE(pred, [...target]) : lossMSE(pred, [...target]);
    const predClass = pred.indexOf(Math.max(...pred));
    if (predClass === pt.label) correct++;
    // Gradyanları biriktir
    const bGrads = backward(network, activations, zs, target, lossType);
    for (let l = 0; l < network.length; l++) {
      for (let i = 0; i < grads[l].dW.data.length; i++) grads[l].dW.data[i] += bGrads[l].dW.data[i];
      for (let j = 0; j < grads[l].db.length; j++) grads[l].db[j] += bGrads[l].db[j];
    }
  }
  updateWeights(network, grads, opt, optState, batch.length);
  return { loss: totalLoss / batch.length, accuracy: correct / batch.length };
}

// ─────────────────────────── ızgara tahmini (karar sınırı için)
// Döndürür: [{x, y, pred}] grid noktaları
export function predictGrid(network, resolution = 40) {
  const pts = [];
  for (let yi = 0; yi < resolution; yi++) {
    for (let xi = 0; xi < resolution; xi++) {
      const x = -1.5 + xi * 3 / (resolution - 1);
      const y = -1.5 + yi * 3 / (resolution - 1);
      const { activations } = forward(network, [x, y]);
      const out = [...activations[activations.length - 1]];
      pts.push({ x, y, pred: out.indexOf(Math.max(...out)), conf: Math.max(...out) });
    }
  }
  return pts;
}

// kayıp türüne göre kayıp değeri (mse, ce, bce)
export function lossOf(type, pred, target) { return type === "ce" ? lossCE(pred, target) : type === "bce" ? lossBCE(pred, target) : lossMSE(pred, target); }

// ─────────────────────────── sayısal gradyan (test/doğrulama için)
export function numericalGrad(network, x, target, lossType, eps = 1e-5) {
  const nGrads = network.map(l => ({
    dW: mat(l.inSize, l.outSize),
    db: new Float64Array(l.outSize)
  }));
  for (let l = 0; l < network.length; l++) {
    // W için
    for (let i = 0; i < network[l].W.data.length; i++) {
      const orig = network[l].W.data[i];
      network[l].W.data[i] = orig + eps;
      const { activations: a1 } = forward(network, x);
      const p1 = [...a1[a1.length - 1]];
      network[l].W.data[i] = orig - eps;
      const { activations: a2 } = forward(network, x);
      const p2 = [...a2[a2.length - 1]];
      network[l].W.data[i] = orig;
      const L1 = lossOf(lossType, p1, target);
      const L2 = lossOf(lossType, p2, target);
      nGrads[l].dW.data[i] = (L1 - L2) / (2 * eps);
    }
    // b için
    for (let j = 0; j < network[l].b.length; j++) {
      const orig = network[l].b[j];
      network[l].b[j] = orig + eps;
      const { activations: a1 } = forward(network, x);
      const p1 = [...a1[a1.length - 1]];
      network[l].b[j] = orig - eps;
      const { activations: a2 } = forward(network, x);
      const p2 = [...a2[a2.length - 1]];
      network[l].b[j] = orig;
      const L1 = lossOf(lossType, p1, target);
      const L2 = lossOf(lossType, p2, target);
      nGrads[l].db[j] = (L1 - L2) / (2 * eps);
    }
  }
  return nGrads;
}

// Gradyan göreli hatasını hesapla
export function gradRelError(analytic, numeric) {
  let maxErr = 0;
  for (let l = 0; l < analytic.length; l++) {
    for (let i = 0; i < analytic[l].dW.data.length; i++) {
      const a = analytic[l].dW.data[i], n = numeric[l].dW.data[i];
      const err = Math.abs(a - n) / (Math.abs(a) + Math.abs(n) + 1e-15);
      if (err > maxErr) maxErr = err;
    }
    for (let j = 0; j < analytic[l].db.length; j++) {
      const a = analytic[l].db[j], n = numeric[l].db[j];
      const err = Math.abs(a - n) / (Math.abs(a) + Math.abs(n) + 1e-15);
      if (err > maxErr) maxErr = err;
    }
  }
  return maxErr;
}
