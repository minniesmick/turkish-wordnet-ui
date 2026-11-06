// test_attn.mjs: node scripts/test_attn.mjs
import {
  softmax, matMul, matTranspose, causalMask,
  scaledDotProductAttention, positionalEncoding, multiHeadAttention
} from "../static/js/attn.js";

let failures = 0;
function check(label, cond, detail = "") {
  if (!cond) { console.error(`✗ ${label}${detail ? " — " + detail : ""}`); failures++; }
  else console.log(`✓ ${label}`);
}
function near(a, b, eps = 1e-6, label = "") {
  check(label || `${a.toFixed(6)} ≈ ${b.toFixed(6)}`, Math.abs(a - b) < eps, `diff=${Math.abs(a-b)}`);
}

// ─── 1. Elle hesaplanmış Attention örneği (DL-6 slayt 13–16)
console.log("\n── 1. Elle hesaplanmış Attention örneği ──");
// n = 2 token, d_k = 2, d_v = 2
// Q = [[1, 0], [0, 2]]
// K = [[1, 1], [0, 1]]
// V = [[1, 2], [3, 4]]
//
// Q K^T:
// row 0: Q[0]·K[0] = 1*1 + 0*1 = 1
//        Q[0]·K[1] = 1*0 + 0*1 = 0   -> [1, 0]
// row 1: Q[1]·K[0] = 0*1 + 2*1 = 2
//        Q[1]·K[1] = 0*0 + 2*1 = 2   -> [2, 2]
//
// scaled by sqrt(d_k) = sqrt(2) ≈ 1.41421356:
// scaledScores[0] = [1 / sqrt(2), 0] ≈ [0.7071, 0]
// scaledScores[1] = [2 / sqrt(2), 2 / sqrt(2)] = [sqrt(2), sqrt(2)] ≈ [1.4142, 1.4142]
//
// Softmax:
// row 0: exp(1/sqrt(2)) / (exp(1/sqrt(2)) + exp(0)) = 2.0281 / (2.0281 + 1) = 2.0281 / 3.0281 ≈ 0.6698
//        exp(0) / 3.0281 = 1 / 3.0281 ≈ 0.3302
// row 1: [0.5, 0.5] (çünkü iki skor da eşit!)
//
// Output:
// row 0: 0.6698 * [1, 2] + 0.3302 * [3, 4] = [0.6698 + 0.9906, 1.3396 + 1.3208] = [1.6604, 2.6604]
// row 1: 0.5 * [1, 2] + 0.5 * [3, 4] = [0.5 + 1.5, 1.0 + 2.0] = [2.0, 3.0]

const Q_hand = [[1, 0], [0, 2]];
const K_hand = [[1, 1], [0, 1]];
const V_hand = [[1, 2], [3, 4]];

const res_hand = scaledDotProductAttention(Q_hand, K_hand, V_hand);

near(res_hand.rawScores[0][0], 1.0, 1e-10, "QK^T [0,0] = 1");
near(res_hand.rawScores[0][1], 0.0, 1e-10, "QK^T [0,1] = 0");
near(res_hand.rawScores[1][0], 2.0, 1e-10, "QK^T [1,0] = 2");
near(res_hand.rawScores[1][1], 2.0, 1e-10, "QK^T [1,1] = 2");

near(res_hand.scaledScores[0][0], 1 / Math.sqrt(2), 1e-6, "Scaled [0,0] = 1/√2");
near(res_hand.scaledScores[1][0], Math.sqrt(2), 1e-6, "Scaled [1,0] = √2");

const exp0 = Math.exp(1 / Math.sqrt(2));
const expected_w00 = exp0 / (exp0 + 1);
const expected_w01 = 1 / (exp0 + 1);
near(res_hand.weights[0][0], expected_w00, 1e-6, `weights[0,0] ≈ ${expected_w00.toFixed(4)}`);
near(res_hand.weights[0][1], expected_w01, 1e-6, `weights[0,1] ≈ ${expected_w01.toFixed(4)}`);
near(res_hand.weights[1][0], 0.5, 1e-10, "weights[1,0] = 0.5 (eşit skorlar)");
near(res_hand.weights[1][1], 0.5, 1e-10, "weights[1,1] = 0.5 (eşit skorlar)");

near(res_hand.output[1][0], 2.0, 1e-10, "output[1,0] = 2.0");
near(res_hand.output[1][1], 3.0, 1e-10, "output[1,1] = 3.0");

// ─── 2. Satır toplamları = 1
console.log("\n── 2. Softmax satır toplamı = 1 ──");
for (let i = 0; i < res_hand.weights.length; i++) {
  const sum = res_hand.weights[i].reduce((a, b) => a + b, 0);
  near(sum, 1.0, 1e-10, `Satır ${i} toplamı = 1`);
}

// ─── 3. Causal Mask ve Maskeli Ağırlık = 0
console.log("\n── 3. Causal Mask ──");
const mask3 = causalMask(3);
check("Causal mask [0, 1] = -Infinity", mask3[0][1] === -Infinity);
check("Causal mask [0, 2] = -Infinity", mask3[0][2] === -Infinity);
check("Causal mask [1, 0] = 0", mask3[1][0] === 0);
check("Causal mask [2, 1] = 0", mask3[2][1] === 0);

const Q3 = [[1, 2], [3, 4], [5, 6]];
const K3 = [[1, 0], [0, 1], [1, 1]];
const V3 = [[1, 1], [2, 2], [3, 3]];
const maskedRes = scaledDotProductAttention(Q3, K3, V3, { mask: mask3 });

near(maskedRes.weights[0][1], 0.0, 1e-15, "Maskeli konum [0, 1] ağırlığı = 0");
near(maskedRes.weights[0][2], 0.0, 1e-15, "Maskeli konum [0, 2] ağırlığı = 0");
near(maskedRes.weights[1][2], 0.0, 1e-15, "Maskeli konum [1, 2] ağırlığı = 0");
near(maskedRes.weights[0][0], 1.0, 1e-10, "İlk token sadece kendine bakar (ağırlık = 1)");

// ─── 4. Softmax Taşma Testi
console.log("\n── 4. Softmax taşma denetimi ──");
const bigVec = [10000, 10001, 10002];
const smBig = softmax(bigVec);
check("Büyük girdilerde NaN yok", !smBig.some(isNaN));
near(smBig.reduce((a, b) => a + b, 0), 1.0, 1e-10, "Büyük girdilerde toplam = 1");

// ─── 5. Tek Token
console.log("\n── 5. Tek token ──");
const singleRes = scaledDotProductAttention([[2, 3]], [[2, 3]], [[5, 6]]);
near(singleRes.weights[0][0], 1.0, 1e-10, "Tek token ağırlığı = 1.0");
near(singleRes.output[0][0], 5.0, 1e-10, "Tek token çıktısı = V[0]");
near(singleRes.output[0][1], 6.0, 1e-10, "Tek token çıktısı = V[1]");

// ─── 6. d_k Ölçeklemesinin Etkisi (Softmax doygunluğu)
console.log("\n── 6. √d_k ölçeklemesinin etkisi ──");
// Büyük d_k durumunda, ölçekleme olmadan skorlar çok büyür ve softmax tek bir elemana doygunlaşır
const largeD_Q = [[10, 10, 10, 10]];
const largeD_K = [[10, 10, 10, 10], [9, 9, 9, 9]];
const largeD_V = [[1, 1], [2, 2]];

const unscaled = scaledDotProductAttention(largeD_Q, largeD_K, largeD_V, { scale: false });
const scaled = scaledDotProductAttention(largeD_Q, largeD_K, largeD_V, { scale: true });

// Ölçekli softmax daha dengeli dağılım vermelidir (doygunluk azalmalı)
check("Ölçekli durumda 2. elemanın ağırlığı daha yüksektir (daha az doymuş)",
  scaled.weights[0][1] > unscaled.weights[0][1]);

// ─── 7. Multi-Head Attention Boyut Denetimi
console.log("\n── 7. Multi-Head Attention boyutu ──");
const X = [
  [1, 0, 1, 0, 0, 1, 0, 1],
  [0, 1, 0, 1, 1, 0, 1, 0],
  [1, 1, 0, 0, 0, 0, 1, 1]
]; // 3 token x 8 dim
const mha = multiHeadAttention(X, { numHeads: 2, d_model: 8, seed: 42 });
check("MHA çıktı satır sayısı = token sayısı (3)", mha.finalOutput.length === 3);
check("MHA çıktı sütun sayısı = d_model (8)", mha.finalOutput[0].length === 8);
check("2 head üretildi", mha.headWeights.length === 2);
check("Head 0 ağırlık boyutu 3x3", mha.headWeights[0].length === 3 && mha.headWeights[0][0].length === 3);

// ─── 8. Positional Encoding Bilinen Değerleri
console.log("\n── 8. Positional Encoding ──");
const pe = positionalEncoding(4, 4);
// pos = 0: sin(0) = 0, cos(0) = 1
near(pe[0][0], 0.0, 1e-10, "pos=0, 2i=0 -> sin(0) = 0");
near(pe[0][1], 1.0, 1e-10, "pos=0, 2i+1=1 -> cos(0) = 1");
near(pe[0][2], 0.0, 1e-10, "pos=0, 2i=2 -> sin(0) = 0");
near(pe[0][3], 1.0, 1e-10, "pos=0, 2i+1=3 -> cos(0) = 1");
// pos = 1: sin(1) ≈ 0.84147, cos(1) ≈ 0.54030
near(pe[1][0], Math.sin(1), 1e-6, `pos=1 -> sin(1) ≈ ${Math.sin(1).toFixed(4)}`);
near(pe[1][1], Math.cos(1), 1e-6, `pos=1 -> cos(1) ≈ ${Math.cos(1).toFixed(4)}`);

// ─── Özet
console.log(`\n${"─".repeat(40)}`);
if (failures === 0) console.log("Tüm Attention testleri geçti ✓");
else { console.error(`${failures} test başarısız`); process.exitCode = 1; }

