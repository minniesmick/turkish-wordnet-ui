// test_rnn.mjs: node scripts/test_rnn.mjs
import {
  initRNN, stepRNN, forwardSequence, backwardBPTT,
  clipGradients, applyGradients, sampleText,
  stepLSTM, stepGRU, numericalGradCheckRNN
} from "../static/js/rnn.js";

let failures = 0;
function check(label, cond, detail = "") {
  if (!cond) { console.error(`✗ ${label}${detail ? " — " + detail : ""}`); failures++; }
  else console.log(`✓ ${label}`);
}
function near(a, b, eps = 1e-6, label = "") {
  check(label || `${a.toFixed(6)} ≈ ${b.toFixed(6)}`, Math.abs(a - b) < eps, `diff=${Math.abs(a-b)}`);
}

// ─── 1. Elle hesaplanmış tek adım (h_t)
console.log("\n── 1. Elle hesaplanmış RNN tek adımı ──");
// vocabSize = 2, hiddenSize = 2
// xIdx = 0
// W_xh = [0.5, 0.0, -0.2, 0.0]  (h0 alır 0.5, h1 alır -0.2)
// W_hh = [0.3, -0.1, 0.2, 0.4]
// b_h = [0.1, -0.05]
// hPrev = [0.5, -0.2]
// hRaw[0] = 0.1 + 0.5 + 0.3*0.5 + (-0.1)*(-0.2) = 0.6 + 0.15 + 0.02 = 0.77
// h[0] = tanh(0.77) ≈ 0.6469
// hRaw[1] = -0.05 - 0.2 + 0.2*0.5 + 0.4*(-0.2) = -0.25 + 0.1 - 0.08 = -0.23
// h[1] = tanh(-0.23) ≈ -0.2260
const customModel = {
  vocabSize: 2,
  hiddenSize: 2,
  W_xh: new Float64Array([0.5, 0.0, -0.2, 0.0]),
  W_hh: new Float64Array([0.3, -0.1, 0.2, 0.4]),
  W_hy: new Float64Array([0.4, -0.2, -0.3, 0.5]),
  b_h: new Float64Array([0.1, -0.05]),
  b_y: new Float64Array([0.0, 0.0])
};
const hPrev = new Float64Array([0.5, -0.2]);
const stepRes = stepRNN(customModel, 0, hPrev);

near(stepRes.hRaw[0], 0.77, 1e-10, "hRaw[0] = 0.77");
near(stepRes.hRaw[1], -0.23, 1e-10, "hRaw[1] = -0.23");
near(stepRes.h[0], Math.tanh(0.77), 1e-10, "h[0] = tanh(0.77)");
near(stepRes.h[1], Math.tanh(-0.23), 1e-10, "h[1] = tanh(-0.23)");
near(stepRes.p.reduce((a, b) => a + b, 0), 1.0, 1e-10, "Softmax p toplamı = 1");

// ─── 2. Sayısal gradyan denetimi (BPTT)
console.log("\n── 2. Sayısal gradyan denetimi ──");
const gradModel = initRNN(3, 3, 123);
const inputs = [0, 1, 2, 0];
const targets = [1, 2, 0, 1];
const gradChecks = numericalGradCheckRNN(gradModel, inputs, targets, 1e-5);
check("BPTT sayısal gradyan denetimi: göreli hata < 1e-4",
  gradChecks.every(r => r.relErr < 1e-4),
  gradChecks.map(r => `${r.param}: relErr=${r.relErr.toExponential(2)}`).join(", "));

// ─── 3. Determinizm
console.log("\n── 3. Determinizm ──");
const m1 = initRNN(4, 4, 999);
const m2 = initRNN(4, 4, 999);
check("Aynı tohum = aynı W_xh", m1.W_xh.every((v, i) => v === m2.W_xh[i]));
check("Aynı tohum = aynı W_hh", m1.W_hh.every((v, i) => v === m2.W_hh[i]));

// ─── 4. Gradyan Kırpma (Gradient Clipping)
console.log("\n── 4. Gradyan Kırpma ──");
const hugeGrads = {
  dW_xh: new Float64Array([10, 20, 30]),
  dW_hh: new Float64Array([40, 50]),
  dW_hy: new Float64Array([10]),
  db_h: new Float64Array([5]),
  db_y: new Float64Array([5])
};
const clippedNorm = clipGradients(hugeGrads, 5.0);
check("Norm 5.0'dan büyüktü", clippedNorm > 5.0);
let newNormSq = 0;
for (const k of Object.keys(hugeGrads)) {
  for (let i = 0; i < hugeGrads[k].length; i++) newNormSq += hugeGrads[k][i] ** 2;
}
near(Math.sqrt(newNormSq), 5.0, 1e-6, "Kırpma sonrası norm tam 5.0");

// ─── 5. Basit desen öğrenme ('abababab')
console.log("\n── 5. Desen öğrenme testi ('abababab') ──");
const patternModel = initRNN(2, 6, 42); // a:0, b:1
const patIn =  [0, 1, 0, 1, 0, 1, 0];
const patTgt = [1, 0, 1, 0, 1, 0, 1];

const initSteps = forwardSequence(patternModel, patIn);
const initLoss = backwardBPTT(patternModel, initSteps, patTgt).totalLoss;

// 120 epoch eğit
let lastLoss = initLoss;
for (let ep = 0; ep < 120; ep++) {
  const steps = forwardSequence(patternModel, patIn);
  const { totalLoss, grads } = backwardBPTT(patternModel, steps, patTgt);
  clipGradients(grads, 5.0);
  applyGradients(patternModel, grads, 0.15);
  lastLoss = totalLoss;
}
check(`Kayıp belirgin düştü (${initLoss.toFixed(3)} → ${lastLoss.toFixed(3)})`, lastLoss < initLoss * 0.5);

// ─── 6. LSTM ve GRU adımları
console.log("\n── 6. LSTM ve GRU hücre adımları ──");
const lstmWeights = {
  W_f: [0.2], U_f: [0.1], b_f: [0.0],
  W_i: [0.3], U_i: [-0.1], b_i: [0.1],
  W_c: [0.5], U_c: [0.4], b_c: [-0.2],
  W_o: [0.4], U_o: [0.2], b_o: [0.0]
};
const lstmOut = stepLSTM(lstmWeights, 0.5, [0.2], [0.1]);
check("LSTM çıktıları tanımlı ve aralıkta",
  lstmOut.h[0] >= -1 && lstmOut.h[0] <= 1 &&
  lstmOut.f[0] >= 0 && lstmOut.f[0] <= 1 &&
  lstmOut.i[0] >= 0 && lstmOut.i[0] <= 1 &&
  lstmOut.o[0] >= 0 && lstmOut.o[0] <= 1);

const gruWeights = {
  W_z: [0.3], U_z: [0.2], b_z: [0.0],
  W_r: [0.1], U_r: [0.4], b_r: [-0.1],
  W_h: [0.4], U_h: [0.3], b_h: [0.0]
};
const gruOut = stepGRU(gruWeights, 0.5, [0.3]);
check("GRU çıktıları tanımlı ve aralıkta",
  gruOut.h[0] >= -1 && gruOut.h[0] <= 1 &&
  gruOut.z[0] >= 0 && gruOut.z[0] <= 1 &&
  gruOut.r[0] >= 0 && gruOut.r[0] <= 1);

// ─── 7. Kenar durumlar
console.log("\n── 7. Kenar durumlar ──");
// Boş dizi
const emptySteps = forwardSequence(patternModel, []);
check("Boş dizi: 0 adım döner", emptySteps.length === 0);
// Tek karakter
const singleStep = forwardSequence(patternModel, [0]);
check("Tek karakter: 1 adım döner", singleStep.length === 1);
// Metin üretimi
const charMap = new Map([["a", 0], ["b", 1]]);
const sampled = sampleText(patternModel, charMap, "a", 10, 1.0, 42);
check("Metin üretimi: 'a' ile başlar ve uzunluğu 11", sampled.startsWith("a") && sampled.length === 11);

// ─── Özet
console.log(`\n${"─".repeat(40)}`);
if (failures === 0) console.log("Tüm RNN testleri geçti ✓");
else { console.error(`${failures} test başarısız`); process.exitCode = 1; }

