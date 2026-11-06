// Sinir ağı eğitimi laboratuvarı — DL-1, DL-2 (Lecture 6). Arayüz modülü.
import { $, $$, esc, registerView, icon } from "./core.js";
import {
  buildNetwork, forward, backward, trainBatch, predictGrid,
  generateDataset, mulberry32, numericalGrad, gradRelError,
  softmax, sigmoid, tanhAct, relu, applyAct,
  lossMSE, lossCE
} from "./nn.js";

const KEY = "wn:nn";
const MAX_EPOCHS = 2000;
const GRID_RES = 36;
const MAX_PTS = 500;
const LAYER_MIN = 1, LAYER_MAX = 4, NEURON_MIN = 1, NEURON_MAX = 32;

// ─── durum
const S = {
  dataset: "xor", noise: 0.05, nPoints: 200, seed: 42,
  layers: [{ size: 4, act: "relu" }, { size: 4, act: "relu" }], // gizli katmanlar
  outAct: "softmax", loss: "ce",
  lr: 0.05, optType: "adam", batchSize: 32,
  epochs: 0, maxEpochs: MAX_EPOCHS, running: false,
  network: null, optState: {},
  data: null, lossHistory: [], accHistory: [],
  practiceAnswer: null
};

function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v !== "object") return;
    if (["xor", "circles", "moons", "spiral", "linear"].includes(v.dataset)) S.dataset = v.dataset;
    if (Number.isFinite(v.noise)) S.noise = Math.max(0, Math.min(0.5, v.noise));
    if (Number.isFinite(v.lr)) S.lr = Math.max(1e-4, Math.min(1, v.lr));
    if (["sgd", "momentum", "adam"].includes(v.optType)) S.optType = v.optType;
    if (Number.isFinite(v.seed)) S.seed = v.seed | 0;
  } catch (_) {}
}
function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ dataset: S.dataset, noise: S.noise, lr: S.lr, optType: S.optType, seed: S.seed }));
  } catch (_) {}
}

// ─── kök element
let root = null;

// ─── ağırlık kaydı (ağırlık görünümü için)
function networkSummary(net) {
  if (!net) return [];
  return net.map((l, i) => ({
    idx: i + 1,
    inSize: l.inSize,
    outSize: l.outSize,
    act: l.act,
    W: Array.from(l.W.data),
    b: Array.from(l.b)
  }));
}

// ─── veri üret
function resetData() {
  S.data = generateDataset(S.dataset, S.nPoints, S.noise, S.seed);
}

// ─── ağı yeniden başlat
function resetNetwork() {
  S.epochs = 0; S.lossHistory = []; S.accHistory = []; S.optState = {};
  const layerDefs = [
    { size: 2 },
    ...S.layers.map(l => ({ size: l.size, act: l.act })),
    { size: 2, act: S.outAct }
  ];
  S.network = buildNetwork(layerDefs, S.seed);
}

// ─── eğitim döngüsü (kademeli, ana iş parçacığını kilitlemez)
let trainingRaf = null;
function stopTraining() {
  S.running = false;
  if (trainingRaf) { cancelAnimationFrame(trainingRaf); trainingRaf = null; }
  updateTrainBtn();
}

function trainStep() {
  if (!S.running || S.epochs >= S.maxEpochs) { stopTraining(); return; }
  // Bir epoch
  const data = S.data;
  // Karıştır (tohumlu değil — ama epoch sayısı tohumlu)
  const rng = mulberry32(S.seed + S.epochs);
  const shuffled = data.slice().sort(() => rng() - 0.5);
  let totalLoss = 0, totalAcc = 0, nBatches = 0;
  for (let i = 0; i < shuffled.length; i += S.batchSize) {
    const batch = shuffled.slice(i, i + S.batchSize);
    const { loss, accuracy } = trainBatch(S.network, batch, S.loss, { type: S.optType, lr: S.lr }, S.optState);
    totalLoss += loss; totalAcc += accuracy; nBatches++;
  }
  S.epochs++;
  S.lossHistory.push(totalLoss / nBatches);
  S.accHistory.push(totalAcc / nBatches);
  renderAll();
  if (S.epochs < S.maxEpochs && S.running) trainingRaf = requestAnimationFrame(trainStep);
  else stopTraining();
}

function startTraining() {
  if (!S.network) resetNetwork();
  if (!S.data) resetData();
  S.running = true;
  updateTrainBtn();
  trainStep();
}

function updateTrainBtn() {
  const btn = $("#nnStartBtn", root);
  if (btn) btn.textContent = S.running ? "Durdur" : (S.epochs > 0 ? "Devam et" : "Eğit");
}

// ─── render fonksiyonları
function renderDataScatter(canvas) {
  if (!canvas || !S.data) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  // Izgara tahmini varsa
  if (S.network && S.epochs > 0) {
    const grid = predictGrid(S.network, GRID_RES);
    const cell = W / GRID_RES;
    for (const pt of grid) {
      const xi = Math.round((pt.x + 1.5) / 3 * (GRID_RES - 1));
      const yi = Math.round((pt.y + 1.5) / 3 * (GRID_RES - 1));
      const px = xi * cell, py = (GRID_RES - 1 - yi) * cell;
      ctx.fillStyle = pt.pred === 0 ? `rgba(43,59,214,${0.12 + pt.conf * 0.25})` : `rgba(180,35,24,${0.12 + pt.conf * 0.25})`;
      ctx.fillRect(px, py, cell + 1, cell + 1);
    }
  }
  // Veri noktaları
  const toCanvas = (v, size) => (v + 1.5) / 3 * size;
  for (const pt of S.data) {
    const cx = toCanvas(pt.x, W), cy = H - toCanvas(pt.y, H);
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = pt.label === 0 ? "#2b3bd6" : "#b42318";
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2;
    ctx.fill(); ctx.stroke();
  }
}

function renderLossCurve(svg) {
  if (!svg) return;
  const W = 320, H = 100, PAD = 28;
  if (!S.lossHistory.length) { svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="var(--ink-3)" font-size="12">Eğitim başlamadı</text>`; return; }
  const maxL = Math.max(...S.lossHistory, 0.01);
  const pts = S.lossHistory.map((v, i) => {
    const x = PAD + (i / Math.max(S.lossHistory.length - 1, 1)) * (W - PAD * 2);
    const y = PAD + (1 - v / maxL) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="var(--spot)" stroke-width="1.5"/>
<text x="4" y="${PAD}" font-size="10" fill="var(--ink-3)">${maxL.toFixed(2)}</text>
<text x="4" y="${H - 6}" font-size="10" fill="var(--ink-3)">0</text>
<text x="${W/2}" y="${H - 2}" text-anchor="middle" font-size="10" fill="var(--ink-3)">Epoch ${S.epochs}</text>`;
}

function renderWeightView(el) {
  if (!el || !S.network) { if (el) el.innerHTML = `<p class="muted">Ağ başlatılmadı.</p>`; return; }
  const summary = networkSummary(S.network);
  let html = `<div class="nn-weight-layers">`;
  for (const l of summary) {
    const wSlice = l.W.slice(0, Math.min(12, l.W.length));
    const bSlice = l.b.slice(0, Math.min(6, l.b.length));
    html += `<div class="nn-weight-layer"><div class="ng-h ng-h-sm">Katman ${l.idx} · ${l.inSize}→${l.outSize} · ${esc(l.act)}</div>
<div class="ng-scroll"><table class="ng-tbl sm"><tr><th>W (ilk ${wSlice.length})</th><th>b (ilk ${bSlice.length})</th></tr>
<tr><td>${wSlice.map(v => v.toFixed(3)).join(", ")}</td><td>${bSlice.map(v => v.toFixed(3)).join(", ")}</td></tr></table></div></div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

function renderAll() {
  const canvas = $("#nnCanvas", root);
  if (canvas) renderDataScatter(canvas);
  const lossSvg = $("#nnLossSvg", root);
  if (lossSvg) renderLossCurve(lossSvg);
  // Durum etiketi
  const stat = $("#nnStatus", root);
  if (stat) {
    if (S.epochs === 0) stat.textContent = "Eğitim bekleniyor.";
    else {
      const acc = S.accHistory[S.accHistory.length - 1] || 0;
      const lv = S.lossHistory[S.lossHistory.length - 1] || 0;
      stat.textContent = `Epoch ${S.epochs} · Kayıp ${lv.toFixed(4)} · Doğruluk %${(acc * 100).toFixed(1)}`;
    }
  }
  // İlerleme
  const prog = $("#nnProgress", root);
  if (prog) prog.value = S.epochs;
  // Ağırlık görünümü
  renderWeightView($("#nnWeights", root));
}

// ─── pratik alıştırma cevap kontrolü
function checkPractice() {
  const inp = $("#nnPracticeIn", root);
  const fb = $("#nnPracticeFb", root);
  if (!inp || !fb) return;
  const val = parseFloat(inp.value.replace(",", "."));
  if (!S.practiceAnswer) return;
  const { correct, eps } = S.practiceAnswer;
  if (isNaN(val)) { fb.textContent = "Lütfen sayı girin."; return; }
  if (Math.abs(val - correct) < eps) {
    fb.textContent = `✓ Doğru! (${correct.toFixed(4)})`;
    fb.style.color = "var(--ok)";
  } else {
    fb.textContent = `✗ Tekrar dene. İpucu: ${Math.round(val) === Math.round(correct) ? "yakın" : "uzak"}`;
    fb.style.color = "var(--bad)";
  }
}

// ─── pratik soru üret
function generatePractice() {
  // Basit 2-girdi, 1-gizli nöron, sigmoid, MSE örneği
  // x = [0.5, -0.3], W1 = [[0.4, 0.2], [-0.1, 0.5]], b1 = [0.1, -0.2]
  // W2 = [[0.3], [0.6]], b2 = [0.0], hedef = [1]
  const x = [0.5, -0.3];
  const w1 = [[0.4, -0.1], [0.2, 0.5]]; // W1[i][j]: giriş i'den gizli j'ye
  const b1 = [0.1, -0.2];
  const w2 = [[0.3], [0.6]];
  const b2 = [0.0];
  // İleri: z1 = W1^T·x + b1
  const z1 = b1.map((b, j) => x.reduce((s, xi, i) => s + xi * w1[i][j], b));
  const a1 = z1.map(v => sigmoid(v));
  // z2 = W2^T·a1 + b2
  const z2 = b2.map((b, j) => a1.reduce((s, ai, i) => s + ai * w2[i][j], b));
  const a2 = z2.map(v => sigmoid(v));
  const target = [1];
  const loss = lossMSE(a2, target);
  // Gradyan: dL/da2 = 2(a2-t)/n, da2/dz2 = a2*(1-a2)
  const dLdz2 = (2 * (a2[0] - target[0]) / 1) * (a2[0] * (1 - a2[0]));
  // dL/dW2[1][0] = a1[1] * dLdz2
  const gradW2_1 = a1[1] * dLdz2;
  S.practiceAnswer = { correct: gradW2_1, eps: 1e-4 };
  const pratik = $("#nnPracticeQ", root);
  if (!pratik) return;
  pratik.innerHTML = `<p>Aşağıdaki tek adımlık bir ağ için <strong>∂L/∂W₂[1,0]</strong> gradyanını hesapla:</p>
<ul style="margin:.4em 0;padding-left:1.4em;line-height:1.8">
  <li><b>Girdi:</b> x = [0.5, −0.3]</li>
  <li><b>Gizli katman ağırlıkları:</b> W₁ = [[0.4, 0.2], [−0.1, 0.5]], b₁ = [0.1, −0.2]</li>
  <li><b>Çıktı ağırlıkları:</b> W₂ = [[0.3, 0.6]]ᵀ, b₂ = [0.0]</li>
  <li><b>Aktivasyon:</b> sigmoid her yerde · <b>Kayıp:</b> MSE, hedef = [1]</li>
  <li>a₁ = [${a1.map(v=>v.toFixed(4)).join(", ")}], a₂ = ${a2[0].toFixed(4)}</li>
</ul>`;
}

// ─── layer editor HTML
function layerEditorHTML() {
  return S.layers.map((l, i) => `
    <div class="nn-layer-row" data-li="${i}">
      <label>Katman ${i + 1} nöron:
        <input type="number" class="nn-layer-neurons" data-li="${i}" value="${l.size}" min="${NEURON_MIN}" max="${NEURON_MAX}" style="width:60px">
      </label>
      <label>Aktivasyon:
        <select class="nn-layer-act" data-li="${i}">
          ${["relu","tanh","sigmoid","linear"].map(a => `<option${a===l.act?" selected":""}>${a}</option>`).join("")}
        </select>
      </label>
      ${S.layers.length > 1 ? `<button class="btn sm nn-rm-layer" data-li="${i}" aria-label="Katmanı sil">${icon("minus")}</button>` : ""}
    </div>`).join("");
}

// ─── ana HTML oluştur
function buildHTML() {
  root.innerHTML = `
<div class="ng-h">Sinir ağı eğitimi <span class="stu">· DL-1, DL-2</span></div>
<p>Oyuncak bir veri kümesinde çok katmanlı algılayıcı (MLP) eğitimini gerçek hesapla takip et.
<span class="stu">Aktivasyon işlevleri, kayıp ve geri yayılım DL-1–2 slaytlarındaki yöntemlerdir.</span></p>

<div class="ng-h">1 · Veri kümesi ve ağ</div>
<div class="nn-controls">
  <label>Veri kümesi:
    <select id="nnDataset">
      <option value="xor">XOR</option>
      <option value="circles">Daireler</option>
      <option value="moons">İki ay</option>
      <option value="spiral">Spiral</option>
      <option value="linear">Doğrusal</option>
    </select>
  </label>
  <label>Gürültü: <input type="range" id="nnNoise" min="0" max="0.4" step="0.01" value="${S.noise}">
    <output id="nnNoiseOut">${S.noise}</output>
  </label>
  <label>Tohum: <input type="number" id="nnSeed" value="${S.seed}" min="0" max="9999" style="width:70px"></label>
  <button class="btn sm" id="nnRegenData">Veriyi yenile</button>
</div>

<div class="ng-h">1b · Ağ mimarisi</div>
<div id="nnLayers">${layerEditorHTML()}</div>
<div style="display:flex;gap:8px;margin:8px 0">
  ${S.layers.length < LAYER_MAX ? `<button class="btn sm" id="nnAddLayer">${icon("plus")} Katman ekle</button>` : ""}
  <label>Çıktı aktivasyonu:
    <select id="nnOutAct">
      ${["softmax","sigmoid"].map(a=>`<option${a===S.outAct?" selected":""}>${a}</option>`).join("")}
    </select>
  </label>
</div>

<div class="ng-h">2 · Eğitim</div>
<div class="nn-controls">
  <label>Öğrenme oranı: <input type="number" id="nnLr" value="${S.lr}" min="0.0001" max="1" step="0.001" style="width:80px"></label>
  <label>Optimizer:
    <select id="nnOpt">
      <option value="sgd"${S.optType==="sgd"?" selected":""}>SGD</option>
      <option value="momentum"${S.optType==="momentum"?" selected":""}>Momentum</option>
      <option value="adam"${S.optType==="adam"?" selected":""}>Adam</option>
    </select>
  </label>
  <label>Kayıp:
    <select id="nnLoss">
      <option value="ce"${S.loss==="ce"?" selected":""}>Çapraz entropi</option>
      <option value="mse"${S.loss==="mse"?" selected":""}>MSE</option>
    </select>
  </label>
  <label>Maks. epoch:
    <input type="number" id="nnMaxEpoch" value="${S.maxEpochs}" min="10" max="${MAX_EPOCHS}" step="10" style="width:80px">
  </label>
</div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0">
  <button class="btn" id="nnStartBtn">Eğit</button>
  <button class="btn sm" id="nnStep">Adım (1 epoch)</button>
  <button class="btn sm" id="nnReset">Sıfırla</button>
  <progress id="nnProgress" value="0" max="${MAX_EPOCHS}" style="flex:1;min-width:80px"></progress>
  <span id="nnStatus" style="font-size:.88rem;color:var(--ink-2)">—</span>
</div>

<div class="ng-h">3 · Karar sınırı ve kayıp eğrisi</div>
<div class="fig-box" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">
  <div>
    <canvas id="nnCanvas" width="260" height="260" style="border:1px solid var(--rule);border-radius:var(--r);display:block"
      aria-label="Karar sınırı haritası"></canvas>
    <p style="font-size:.8rem;color:var(--ink-3);margin:4px 0 0">● mavi = sınıf 0 · ● kırmızı = sınıf 1 (alan = model tahmini)</p>
  </div>
  <div>
    <svg id="nnLossSvg" class="nn-loss" viewBox="0 0 320 100" width="320" height="100"
      style="display:block;border:1px solid var(--rule);border-radius:var(--r)" aria-label="Kayıp eğrisi"></svg>
    <p style="font-size:.8rem;color:var(--ink-3);margin:4px 0 0">Epoch başına ortalama kayıp</p>
    <button class="btn sm" data-export="svg" data-name="nn-kayip" style="margin-top:6px">${icon("copy")} SVG indir</button>
  </div>
</div>

<div class="ng-h">4 · Ağırlık görünümü</div>
<div id="nnWeights"><p class="muted">Ağ başlatılmadı.</p></div>

<div class="stu">
<div class="ng-h">5 · Formüller ve yöntemin açıklaması</div>
<div class="nn-explain">
  <p><b>İleri yayılım (DL-1 slayt 14):</b> a⁽ˡ⁾ = g(W⁽ˡ⁾·a⁽ˡ⁻¹⁾ + b⁽ˡ⁾)</p>
  <p><b>Kayıp — MSE (DL-2 slayt 5):</b> L = Σ(ŷ−y)²/n · <b>Çapraz entropi:</b> L = −Σ y·log(ŷ)</p>
  <p><b>Geri yayılım — zincir kuralı (DL-2 slayt 17):</b> ∂L/∂W = ∂L/∂a · ∂a/∂z · ∂z/∂W = δ · aᵢₙᵀ</p>
  <p><b>Ağırlık güncelleme — SGD (DL-2 slayt 28):</b> W ← W − η·∂L/∂W</p>
  <p><b>Adam (DL-2 slayt 33):</b> m̂, v̂ momentumları + öğrenme oranı ölçeklemesi</p>
  <p class="nn-limit"><b>Sınırlar:</b> oyuncak 2B veri; küçük ağ; gerçek NLP görevi değil. Spiral gibi zor kümeler daha derin ağ veya çok epoch ister.</p>
</div>

<div class="ng-h">6 · Kendin hesapla</div>
<div class="nn-practice">
  <div id="nnPracticeQ"></div>
  <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
    <label>Cevabın: <input type="text" id="nnPracticeIn" placeholder="0.0000" style="width:120px"></label>
    <button class="btn sm" id="nnPracticeCheck">Kontrol et</button>
    <button class="btn sm" id="nnPracticeNew">Yeni soru</button>
    <span id="nnPracticeFb" style="font-size:.9rem"></span>
  </div>
</div>
</div>`;
}

// ─── olay dinleyicileri
function bindEvents() {
  const q = id => $(id, root);

  q("#nnDataset").addEventListener("change", e => {
    S.dataset = e.target.value; resetData(); resetNetwork(); renderAll(); saveState();
  });
  q("#nnNoise").addEventListener("input", e => {
    S.noise = +e.target.value; q("#nnNoiseOut").value = S.noise.toFixed(2);
    resetData(); resetNetwork(); renderAll(); saveState();
  });
  q("#nnSeed").addEventListener("change", e => {
    S.seed = +e.target.value | 0; resetData(); resetNetwork(); renderAll(); saveState();
  });
  q("#nnRegenData").addEventListener("click", () => {
    S.seed = (S.seed + 1) % 10000; q("#nnSeed").value = S.seed;
    resetData(); resetNetwork(); renderAll(); saveState();
  });

  // Layer editor
  root.addEventListener("change", e => {
    if (e.target.classList.contains("nn-layer-neurons")) {
      const i = +e.target.dataset.li;
      S.layers[i].size = Math.max(NEURON_MIN, Math.min(NEURON_MAX, +e.target.value));
      resetNetwork(); renderAll();
    }
    if (e.target.classList.contains("nn-layer-act")) {
      const i = +e.target.dataset.li;
      S.layers[i].act = e.target.value;
      resetNetwork(); renderAll();
    }
  });
  root.addEventListener("click", e => {
    if (e.target.closest(".nn-rm-layer")) {
      const i = +e.target.closest(".nn-rm-layer").dataset.li;
      S.layers.splice(i, 1);
      q("#nnLayers").innerHTML = layerEditorHTML();
      const addBtn = q("#nnAddLayer");
      if (addBtn) addBtn.style.display = S.layers.length < LAYER_MAX ? "" : "none";
      resetNetwork(); renderAll();
    }
  });
  const addBtn = q("#nnAddLayer");
  if (addBtn) addBtn.addEventListener("click", () => {
    if (S.layers.length >= LAYER_MAX) return;
    S.layers.push({ size: 4, act: "relu" });
    q("#nnLayers").innerHTML = layerEditorHTML();
    resetNetwork(); renderAll();
  });

  q("#nnOutAct").addEventListener("change", e => { S.outAct = e.target.value; resetNetwork(); renderAll(); });
  q("#nnLr").addEventListener("change", e => { S.lr = +e.target.value; saveState(); });
  q("#nnOpt").addEventListener("change", e => { S.optType = e.target.value; saveState(); });
  q("#nnLoss").addEventListener("change", e => { S.loss = e.target.value; resetNetwork(); renderAll(); });
  q("#nnMaxEpoch").addEventListener("change", e => {
    S.maxEpochs = Math.max(10, Math.min(MAX_EPOCHS, +e.target.value | 0));
    const prog = q("#nnProgress"); if (prog) prog.max = S.maxEpochs;
  });

  q("#nnStartBtn").addEventListener("click", () => {
    if (S.running) stopTraining();
    else startTraining();
  });
  q("#nnStep").addEventListener("click", () => {
    if (!S.network) resetNetwork();
    if (!S.data) resetData();
    S.running = true; trainStep(); S.running = false; updateTrainBtn();
  });
  q("#nnReset").addEventListener("click", () => {
    stopTraining(); resetNetwork(); renderAll();
  });

  q("#nnPracticeCheck").addEventListener("click", checkPractice);
  q("#nnPracticeNew").addEventListener("click", generatePractice);
  const pIn = q("#nnPracticeIn");
  if (pIn) pIn.addEventListener("keydown", e => { if (e.key === "Enter") checkPractice(); });
}

// ─── görünüm modülü
const view = {
  apply(p) {
    if (p.dataset && S.dataset !== p.dataset) {
      S.dataset = p.dataset; resetData(); resetNetwork();
    }
  },
  enter() {
    if (!root) return;
    const sel = $("#nnDataset", root);
    if (sel) sel.value = S.dataset;
    renderAll();
    if (!S.practiceAnswer) generatePractice();
  },
  escape() { stopTraining(); return false; }
};

// ─── kayıt
registerView("nn", view);

// ─── mount (import sırasında bir kez çalışır)
(function mount() {
  root = $("#v-nn");
  if (!root) return;
  loadState();
  buildHTML();
  resetData();
  resetNetwork();
  bindEvents();
  renderAll();
  generatePractice();
})();

