// Test: Sinir ağı hesapları — node scripts/test_nn.mjs
// Elle doğrulanmış değerler, sayısal gradyan denetimi, kenar durumlar.
import {
  buildNetwork, forward, backward, numericalGrad, gradRelError,
  sigmoid, tanhAct, relu, softmax,
  lossMSE, lossMSEGrad, lossCE, lossCESoftmaxGrad,
  generateDataset, trainBatch, predictGrid,
  applyAct, applyActD
} from "../static/js/nn.js";

let failures = 0;
function check(label, cond, detail = "") {
  if (!cond) {
    console.error(`✗ ${label}${detail ? " — " + detail : ""}`);
    failures++;
  } else {
    console.log(`✓ ${label}`);
  }
}
function near(a, b, eps = 1e-6, label = "") {
  check(label || `${a} ≈ ${b}`, Math.abs(a - b) < eps, `got ${a}, expected ${b}, diff ${Math.abs(a-b)}`);
}

// ─── 1. Aktivasyon işlevleri
console.log("\n── 1. Aktivasyon işlevleri ──");
near(sigmoid(0), 0.5, 1e-10, "sigmoid(0)=0.5");
near(sigmoid(100), 1, 1e-5, "sigmoid(100)≈1");
near(sigmoid(-100), 0, 1e-5, "sigmoid(-100)≈0");
near(tanhAct(0), 0, 1e-10, "tanh(0)=0");
near(relu(2), 2, 1e-10, "relu(2)=2");
near(relu(-3), 0, 1e-10, "relu(-3)=0");

const sm = softmax([1, 2, 3]);
near(sm.reduce((a, b) => a + b, 0), 1, 1e-10, "softmax toplamı=1");
check("softmax artan", sm[0] < sm[1] && sm[1] < sm[2]);
// Taşma testi: büyük değerler
const smBig = softmax([1000, 1001, 1002]);
near(smBig.reduce((a, b) => a + b, 0), 1, 1e-5, "softmax büyük değer — taşmaz");

// ─── 2. Kayıp işlevleri
console.log("\n── 2. Kayıp işlevleri ──");
near(lossMSE([0.5, 0.5], [1, 0]), 0.25, 1e-10, "MSE([0.5,0.5],[1,0])=0.25");
near(lossMSE([1, 0], [1, 0]), 0, 1e-10, "MSE mükemmel=0");
// CE: pred=[0.9,0.1], target=[1,0] → -log(0.9)
near(lossCE([0.9, 0.1], [1, 0]), -Math.log(0.9), 1e-8, "CE([0.9,0.1],[1,0])=-log(0.9)");

// ─── 3. Elle hesaplanmış tek adım (DL-2 slayt 28–31)
console.log("\n── 3. Elle hesaplanmış ileri yayılım ──");
// 2 girdi → 1 gizli (sigmoid, 2 nöron) → 1 çıktı (sigmoid)
// W.data[i*outSize+j] düzeni: satır=girdi i, sütun=çıktı j
// z[j] = Σᵢ x[i]*W[i,j] + b[j]
// W1[0,0]=0.4, W1[0,1]=-0.1, W1[1,0]=0.2, W1[1,1]=0.5
// b1=[0.1,-0.2], x=[0.5,-0.3]
// z1[0] = 0.5*0.4 + (-0.3)*0.2 + 0.1 = 0.2 - 0.06 + 0.1 = 0.24
// z1[1] = 0.5*(-0.1) + (-0.3)*0.5 + (-0.2) = -0.05 - 0.15 - 0.2 = -0.40
// a1[0] = sigmoid(0.24), a1[1] = sigmoid(-0.40)
// W2[0,0]=0.3, W2[1,0]=0.6, b2=[0.0]
// z2[0] = a1[0]*0.3 + a1[1]*0.6 + 0.0, a2[0] = sigmoid(z2[0])
const x = [0.5, -0.3];
const z1_0_expected = 0.24, z1_1_expected = -0.40;
const a1_0_expected = sigmoid(z1_0_expected);
const a1_1_expected = sigmoid(z1_1_expected);
const z2_0_expected = a1_0_expected * 0.3 + a1_1_expected * 0.6;
const a2_0_expected = sigmoid(z2_0_expected);

// Ağırlıkları elle ayarla: W1=[girdi0→[j0,j1], girdi1→[j0,j1]] = data=[0.4,-0.1,0.2,0.5]
const net = buildNetwork([{size:2},{size:2,act:"sigmoid"},{size:1,act:"sigmoid"}], 0);
net[0].W.data[0] = 0.4; net[0].W.data[1] = -0.1;  // girdi0 → çıktı0, çıktı1
net[0].W.data[2] = 0.2; net[0].W.data[3] = 0.5;   // girdi1 → çıktı0, çıktı1
net[0].b[0] = 0.1; net[0].b[1] = -0.2;
net[1].W.data[0] = 0.3; net[1].W.data[1] = 0.6;   // gizli0→çıktı0, gizli1→çıktı0 (outSize=1)
net[1].b[0] = 0.0;

const { activations, zs } = forward(net, x);
near(zs[1][0], z1_0_expected, 1e-8, `z1[0]=${z1_0_expected}`);
near(zs[1][1], z1_1_expected, 1e-8, `z1[1]=${z1_1_expected}`);
near(activations[1][0], a1_0_expected, 1e-8, `a1[0]≈${a1_0_expected.toFixed(4)}`);
near(activations[1][1], a1_1_expected, 1e-8, `a1[1]≈${a1_1_expected.toFixed(4)}`);
near(activations[2][0], a2_0_expected, 1e-8, `a2[0]≈${a2_0_expected.toFixed(4)}`);

// ─── 4. Sayısal gradyan denetimi
console.log("\n── 4. Sayısal gradyan denetimi ──");
function checkGradients(label, layerDefs, xs, target, lossType, seed) {
  const network = buildNetwork(layerDefs, seed);
  const { activations, zs } = forward(network, xs);
  const analytical = backward(network, activations, zs, target, lossType);
  const numeric = numericalGrad(network, xs, target, lossType, 1e-5);
  const err = gradRelError(analytical, numeric);
  check(`Gradyan denetimi (${label}): göreli hata < 1e-4`, err < 1e-4, `err=${err.toExponential(3)}`);
}

// ReLU + MSE
checkGradients("relu+mse", [{size:2},{size:3,act:"relu"},{size:2,act:"linear"}], [0.5,-0.3], [1,0], "mse", 1);
// Tanh + CE
checkGradients("tanh+ce-soft", [{size:2},{size:3,act:"tanh"},{size:2,act:"softmax"}], [0.3,0.7], [1,0], "ce", 2);
// Sigmoid + MSE
checkGradients("sigmoid+mse", [{size:2},{size:4,act:"sigmoid"},{size:1,act:"sigmoid"}], [0.1,-0.9], [1], "mse", 3);
// Derin ağ: relu+adam
checkGradients("deep-relu", [{size:2},{size:4,act:"relu"},{size:4,act:"relu"},{size:2,act:"softmax"}], [-0.5,0.8], [0,1], "ce", 4);

// ─── 5. Aynı tohumla aynı sonuç (deterministik)
console.log("\n── 5. Determinizm ──");
const net1 = buildNetwork([{size:2},{size:4,act:"relu"},{size:2,act:"softmax"}], 7);
const net2 = buildNetwork([{size:2},{size:4,act:"relu"},{size:2,act:"softmax"}], 7);
const out1 = forward(net1, [0.3,-0.5]).activations;
const out2 = forward(net2, [0.3,-0.5]).activations;
const diff = out1[out1.length-1].map((v,i) => Math.abs(v - out2[out2.length-1][i]));
check("Aynı tohum = aynı çıktı", Math.max(...diff) < 1e-15, `max diff=${Math.max(...diff)}`);

// ─── 6. XOR öğrenme testi
console.log("\n── 6. XOR öğrenme testi ──");
const xorData = generateDataset("xor", 200, 0.0, 42);
const xorNet = buildNetwork([{size:2},{size:8,act:"tanh"},{size:2,act:"softmax"}], 1);
const xorState = {};
let xorLoss = Infinity;
// 500 epoch eğit (küçük batch, deterministik veri)
for (let ep = 0; ep < 500; ep++) {
  const { loss } = trainBatch(xorNet, xorData, "ce", {type:"adam", lr:0.05}, xorState);
  xorLoss = loss;
}
// Doğruluk kontrolü
let xorCorrect = 0;
for (const pt of xorData) {
  const { activations } = forward(xorNet, [pt.x, pt.y]);
  const out = [...activations[activations.length-1]];
  if (out.indexOf(Math.max(...out)) === pt.label) xorCorrect++;
}
const xorAcc = xorCorrect / xorData.length;
check(`XOR doğruluk > 0.9 (${(xorAcc*100).toFixed(1)}%)`, xorAcc > 0.9, `loss=${xorLoss.toFixed(4)}`);

// ─── 7. Softmax büyük değerlerde taşmaz
console.log("\n── 7. Softmax taşma ──");
const smLarge = softmax([1e8, 1e8+1, 1e8+2]);
check("softmax büyük değer NaN değil", !smLarge.some(isNaN));
near(smLarge.reduce((a,b)=>a+b,0), 1, 1e-5, "softmax büyük değer toplamı=1");

// ─── 8. Boş veri / kenar durumlar
console.log("\n── 8. Kenar durumlar ──");
const singleNet = buildNetwork([{size:1},{size:1,act:"sigmoid"}], 0);
const { activations: singleOut } = forward(singleNet, [0.5]);
check("Tek nöron çıktı [0,1] arasında", singleOut[1][0] >= 0 && singleOut[1][0] <= 1);

// Sıfır öğrenme oranı: ağırlıklar değişmez
const zeroNet = buildNetwork([{size:2},{size:2,act:"relu"},{size:2,act:"softmax"}], 5);
const origW = zeroNet[0].W.data.slice();
const { loss: zl } = trainBatch(zeroNet, [{x:0.5,y:-0.3,label:0}], "ce", {type:"sgd",lr:0}, {});
check("Sıfır öğrenme oranı: ağırlıklar değişmez", origW.every((v,i) => v === zeroNet[0].W.data[i]));

// Tek sınıf veri
const monoData = generateDataset("linear", 50, 0, 1).map(p => ({...p, label:0}));
let monoOk = true;
try {
  const monoNet = buildNetwork([{size:2},{size:4,act:"relu"},{size:1,act:"sigmoid"}], 1);
  trainBatch(monoNet, monoData, "mse", {type:"sgd",lr:0.01}, {});
} catch(e) { monoOk = false; }
check("Tek sınıf eğitim çökmez", monoOk);

// ─── Özet
console.log(`\n${"─".repeat(40)}`);
if (failures === 0) {
  console.log("Tüm sinir ağı testleri geçti ✓");
} else {
  console.error(`${failures} test başarısız`);
  process.exitCode = 1;
}
