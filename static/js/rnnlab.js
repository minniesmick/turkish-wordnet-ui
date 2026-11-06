// RNN laboratuvarı — DL-5 (Lecture 6). Arayüz modülü.
import { $, esc, registerView, icon } from "./core.js";
import {
  initRNN, forwardSequence, backwardBPTT, clipGradients,
  applyGradients, sampleText, stepRNN
} from "./rnn.js";
import { loadCorpus, tokensOf } from "./corpusdata.js";

const KEY = "wn:rnn";
const PRESET_CORPUS = "ali topu at. ayşe ip atla. ali okula git. ayşe kitap oku. ali eve gel.";

const S = {
  source: "preset", // "preset" | "boun" | "custom"
  text: PRESET_CORPUS,
  hiddenSize: 8,
  seqLen: 12,
  lr: 0.05,
  epochs: 100,
  seed: 42,
  running: false,
  curEpoch: 0,
  lossHistory: [],
  inspectStep: 0,
  sampleLen: 40,
  sampleTemp: 1.0,
  sampleSeed: 1,
  practiceAnswer: null
};

let root = null;
let model = null;
let charToIdx = new Map();
let idxToChar = [];
let trainData = [];
let lastSteps = [];
let lastNorms = [];
let trainRaf = null;

function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v !== "object") return;
    if (["preset", "boun", "custom"].includes(v.source)) S.source = v.source;
    if (typeof v.text === "string") S.text = v.text.slice(0, 10000);
    if (Number.isFinite(v.hiddenSize)) S.hiddenSize = Math.max(2, Math.min(32, v.hiddenSize | 0));
    if (Number.isFinite(v.seqLen)) S.seqLen = Math.max(4, Math.min(30, v.seqLen | 0));
    if (Number.isFinite(v.lr)) S.lr = Math.max(0.001, Math.min(0.5, v.lr));
    if (Number.isFinite(v.epochs)) S.epochs = Math.max(10, Math.min(1000, v.epochs | 0));
    if (Number.isFinite(v.seed)) S.seed = v.seed | 0;
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      source: S.source,
      text: S.text,
      hiddenSize: S.hiddenSize,
      seqLen: S.seqLen,
      lr: S.lr,
      epochs: S.epochs,
      seed: S.seed
    }));
  } catch (_) {}
}

async function prepareData() {
  let raw = S.text;
  if (S.source === "boun") {
    try {
      const c = await loadCorpus("boun");
      const sents = tokensOf(c, { punct: false, lower: true });
      raw = sents.slice(0, 30).map(s => s.join(" ")).join(". ");
    } catch (_) {
      raw = PRESET_CORPUS;
    }
  } else if (S.source === "preset") {
    raw = PRESET_CORPUS;
  }
  raw = raw.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  if (!raw) raw = PRESET_CORPUS;

  const chars = [...new Set(Array.from(raw))].sort();
  charToIdx = new Map();
  idxToChar = chars;
  for (let i = 0; i < chars.length; i++) charToIdx.set(chars[i], i);

  trainData = Array.from(raw).map(c => charToIdx.get(c));
}

function resetModel() {
  stopTraining();
  S.curEpoch = 0;
  S.lossHistory = [];
  lastSteps = [];
  lastNorms = [];
  if (charToIdx.size < 2) return;
  model = initRNN(charToIdx.size, S.hiddenSize, S.seed);
  runInference();
}

function runInference() {
  if (!model || trainData.length < 2) return;
  const seq = trainData.slice(0, Math.min(S.seqLen, trainData.length - 1));
  const targets = trainData.slice(1, seq.length + 1);
  lastSteps = forwardSequence(model, seq);
  const b = backwardBPTT(model, lastSteps, targets);
  lastNorms = Array.from(b.dhNorms);
}

function stopTraining() {
  S.running = false;
  if (trainRaf) {
    cancelAnimationFrame(trainRaf);
    trainRaf = null;
  }
  updateTrainBtn();
}

function trainStep() {
  if (!S.running || !model) {
    stopTraining();
    return;
  }

  // 1 devirde birkaç rastgele kesit al
  const T = S.seqLen;
  const maxStart = trainData.length - T - 1;
  const chunksPerFrame = 4;

  if (maxStart > 0) {
    let epLoss = 0;
    for (let i = 0; i < chunksPerFrame; i++) {
      const start = Math.floor(Math.random() * maxStart);
      const inputs = trainData.slice(start, start + T);
      const targets = trainData.slice(start + 1, start + T + 1);
      const steps = forwardSequence(model, inputs);
      const { totalLoss, grads, dhNorms } = backwardBPTT(model, steps, targets);
      clipGradients(grads, 5.0);
      applyGradients(model, grads, S.lr);
      epLoss += totalLoss;
      lastSteps = steps;
      lastNorms = Array.from(dhNorms);
    }
    S.curEpoch++;
    S.lossHistory.push(epLoss / chunksPerFrame);
  }

  renderStatus();
  renderLoss();
  renderUnrolled();
  renderNorms();

  if (S.curEpoch >= S.epochs) {
    stopTraining();
  } else {
    trainRaf = requestAnimationFrame(trainStep);
  }
}

function startTraining() {
  if (!model || S.curEpoch >= S.epochs) {
    resetModel();
  }
  S.running = true;
  updateTrainBtn();
  trainStep();
}

function updateTrainBtn() {
  const btn = $("#rnnTrainBtn", root);
  if (!btn) return;
  btn.textContent = S.running ? "Durdur" : (S.curEpoch > 0 && S.curEpoch < S.epochs ? "Devam et" : "Eğit");
}

function renderStatus() {
  const stat = $("#rnnStatus", root);
  const prog = $("#rnnProgress", root);
  if (prog) {
    prog.max = S.epochs;
    prog.value = S.curEpoch;
  }
  if (stat) {
    const l = S.lossHistory.length ? S.lossHistory[S.lossHistory.length - 1].toFixed(4) : "—";
    stat.textContent = `Devir ${S.curEpoch}/${S.epochs} · Kayıp: ${l} · Karakter sözlüğü: ${charToIdx.size}`;
  }
}

function renderLoss() {
  const svg = $("#rnnLossSvg", root);
  if (!svg) return;
  const W = 320, H = 100, PAD = 24;
  if (!S.lossHistory.length) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--ink-3)" font-size="12">Eğitim bekleniyor</text>`;
    return;
  }
  const maxL = Math.max(...S.lossHistory, 0.01);
  const minL = Math.min(...S.lossHistory);
  const pts = S.lossHistory.map((v, i) => {
    const x = PAD + (i / Math.max(S.lossHistory.length - 1, 1)) * (W - PAD * 2);
    const range = Math.max(maxL - minL, 0.001);
    const y = PAD + (1 - (v - minL) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  svg.innerHTML = `
    <polyline points="${pts}" fill="none" stroke="var(--spot)" stroke-width="1.8"/>
    <text x="4" y="${PAD}" font-size="10" fill="var(--ink-3)">${maxL.toFixed(2)}</text>
    <text x="4" y="${H - 6}" font-size="10" fill="var(--ink-3)">${minL.toFixed(2)}</text>
    <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="10" fill="var(--ink-3)">Devir ${S.curEpoch} / ${S.epochs}</text>
  `;
}

function renderUnrolled() {
  const svg = $("#rnnUnrollSvg", root);
  if (!svg || !lastSteps.length) return;

  const T = lastSteps.length;
  const colW = 55;
  const totalW = Math.max(500, T * colW + 40);
  const H = 220;

  let elements = [];
  for (let t = 0; t < T; t++) {
    const s = lastSteps[t];
    const x = 30 + t * colW;
    const chIn = idxToChar[s.xIdx] || " ";
    const displayIn = chIn === " " ? "␣" : chIn;

    // En yüksek olasılıklı tahmin edilen karakter
    const maxPIdx = s.p.indexOf(Math.max(...s.p));
    const chOut = idxToChar[maxPIdx] || " ";
    const displayOut = chOut === " " ? "␣" : chOut;

    // h_t ortalama değeri (renk için)
    let avgH = 0;
    for (let i = 0; i < s.h.length; i++) avgH += s.h[i];
    avgH /= s.h.length;
    const hFill = avgH >= 0 ? `rgba(43,59,214,${0.2 + Math.min(0.8, avgH)})` : `rgba(180,35,24,${0.2 + Math.min(0.8, -avgH)})`;

    // Giriş x_t
    elements.push(`
      <circle cx="${x}" cy="180" r="14" fill="var(--page)" stroke="var(--rule)" stroke-width="1.5"/>
      <text x="${x}" y="184" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--ink)">${esc(displayIn)}</text>
      <line x1="${x}" y1="166" x2="${x}" y2="132" stroke="var(--rule)" stroke-width="1.5"/>
      <polygon points="${x-3},135 ${x+3},135 ${x},130" fill="var(--rule)"/>
    `);

    // Gizli durum h_t
    elements.push(`
      <rect x="${x - 18}" y="95" width="36" height="34" rx="4" fill="${hFill}" stroke="var(--spot)" stroke-width="1.5"/>
      <text x="${x}" y="112" text-anchor="middle" font-size="10" font-weight="bold" fill="var(--ink)">h_${t}</text>
      <text x="${x}" y="123" text-anchor="middle" font-size="9" fill="var(--ink-2)">${avgH.toFixed(2)}</text>
    `);

    // Zaman adımı bağlantısı (h_{t-1} -> h_t)
    if (t < T - 1) {
      const nextX = x + colW;
      elements.push(`
        <line x1="${x + 18}" y1="112" x2="${nextX - 18}" y2="112" stroke="var(--spot)" stroke-width="1.5"/>
        <polygon points="${nextX-21},109 ${nextX-21},115 ${nextX-18},112" fill="var(--spot)"/>
      `);
    }

    // Çıkış y_t
    elements.push(`
      <line x1="${x}" y1="95" x2="${x}" y2="60" stroke="var(--rule)" stroke-width="1.5"/>
      <polygon points="${x-3},63 ${x+3},63 ${x},58" fill="var(--rule)"/>
      <circle cx="${x}" cy="44" r="14" fill="var(--sunk)" stroke="var(--rule)" stroke-width="1.5"/>
      <text x="${x}" y="48" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--spot)">${esc(displayOut)}</text>
    `);
  }

  svg.setAttribute("viewBox", `0 0 ${totalW} ${H}`);
  svg.style.width = `${totalW}px`;
  svg.innerHTML = elements.join("");
}

function renderNorms() {
  const svg = $("#rnnNormSvg", root);
  if (!svg || !lastNorms.length) return;

  const W = 360, H = 140, PAD = 28;
  const T = lastNorms.length;
  const maxN = Math.max(...lastNorms, 0.001);

  const barW = Math.max(4, Math.floor((W - PAD * 2) / T) - 4);
  let bars = [];
  for (let t = 0; t < T; t++) {
    const val = lastNorms[t];
    const h = (val / maxN) * (H - PAD * 2);
    const x = PAD + t * Math.floor((W - PAD * 2) / T);
    const y = H - PAD - h;
    bars.push(`
      <rect x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="var(--spot)" opacity="${0.4 + 0.6 * (val / maxN)}"/>
      <text x="${x + barW / 2}" y="${H - 12}" text-anchor="middle" font-size="9" fill="var(--ink-3)">t=${t}</text>
      <text x="${x + barW / 2}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="var(--ink-2)">${val.toFixed(2)}</text>
    `);
  }

  svg.innerHTML = `
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--rule)"/>
    <text x="${PAD}" y="16" font-size="10" fill="var(--ink-3)">‖∂L/∂h_t‖ (Maks: ${maxN.toFixed(2)})</text>
    ${bars.join("")}
  `;
}

function renderPractice() {
  const qBox = $("#rnnPracticeQ", root);
  if (!qBox) return;

  // Single step practice:
  // x_t = 1 (1-hot at index 0)
  // W_xh = [0.4], W_hh = [0.3], b_h = [0.1], h_{t-1} = 0.5
  // hRaw = 0.1 + 0.4*1 + 0.3*0.5 = 0.1 + 0.4 + 0.15 = 0.65
  // h_t = tanh(0.65) ≈ 0.5717
  const expected = Math.tanh(0.65);
  S.practiceAnswer = { correct: expected, eps: 0.01 };

  qBox.innerHTML = `
    <p>Aşağıdaki tek boyutlu parametrelerle <strong>h_t = tanh(W_xh · x_t + W_hh · h_{t−1} + b_h)</strong> gizli durumunu hesapla:</p>
    <ul style="margin:.4em 0;padding-left:1.4em;line-height:1.8">
      <li><code>x_t = 1.0</code></li>
      <li><code>h_{t−1} = 0.5</code></li>
      <li><code>W_xh = 0.4</code>, <code>W_hh = 0.3</code>, <code>b_h = 0.1</code></li>
    </ul>
  `;
}

function checkPractice() {
  const inp = $("#rnnPracticeIn", root);
  const fb = $("#rnnPracticeFb", root);
  if (!inp || !fb || !S.practiceAnswer) return;
  const val = parseFloat(inp.value.replace(",", "."));
  if (isNaN(val)) {
    fb.textContent = "Lütfen geçerli bir sayı girin.";
    return;
  }
  if (Math.abs(val - S.practiceAnswer.correct) < S.practiceAnswer.eps) {
    fb.textContent = `✓ Doğru! (h_t ≈ ${S.practiceAnswer.correct.toFixed(4)})`;
    fb.style.color = "var(--ok)";
  } else {
    fb.textContent = `✗ Tekrar dene. (İpucu: önce toplamı bulup tanh uygulayın, beklenen ≈ ${S.practiceAnswer.correct.toFixed(2)})`;
    fb.style.color = "var(--bad)";
  }
}

function generateSample() {
  const box = $("#rnnSampleBox", root);
  if (!box || !model) return;
  const startChar = S.text[0] || "a";
  const sampled = sampleText(model, charToIdx, startChar, S.sampleLen, S.sampleTemp, S.sampleSeed);
  S.sampleSeed++;
  box.innerHTML = `<blockquote style="margin:4px 0;padding:8px 12px;background:var(--sunk);border-left:3px solid var(--spot);font-family:var(--font-mono);font-size:.92rem;word-break:break-all">${esc(sampled)}</blockquote>`;
}

function buildHTML() {
  root.innerHTML = `
    <div class="ng-h">Özyinelemeli Sinir Ağı (RNN) <span class="stu">· DL-5</span></div>
    <p>Sıralı dizi verisini zaman adımlarında açarak (unroll) işle; zamanda geri yayılım (BPTT) ve gradyan kaybolmasını gözlemle.
    <span class="stu">Vanilla RNN, LSTM ve GRU hesapları gerçek döngüyle işletilir.</span></p>

    <div class="ng-h">1 · Korpus ve hiperparametreler</div>
    <div class="nn-controls" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <label>Korpus:
        <select id="rnnSource">
          <option value="preset"${S.source === "preset" ? " selected" : ""}>Basit cümleler ("ali topu at...")</option>
          <option value="boun"${S.source === "boun" ? " selected" : ""}>BOUN Korpusundan cümleler</option>
          <option value="custom"${S.source === "custom" ? " selected" : ""}>Özel metin</option>
        </select>
      </label>
      <label>Gizli nöron (H):
        <input type="number" id="rnnHidden" min="2" max="32" value="${S.hiddenSize}" style="width:60px">
      </label>
      <label>Dizi uzunluğu (T):
        <input type="number" id="rnnSeqLen" min="4" max="30" value="${S.seqLen}" style="width:60px">
      </label>
      <label>Öğrenme oranı:
        <input type="number" id="rnnLr" min="0.005" max="0.5" step="0.01" value="${S.lr}" style="width:75px">
      </label>
      <label>Devir:
        <input type="number" id="rnnEpochs" min="10" max="1000" step="10" value="${S.epochs}" style="width:70px">
      </label>
      <label>Tohum:
        <input type="number" id="rnnSeed" value="${S.seed}" style="width:70px">
      </label>
    </div>

    <div id="rnnCustomBox" style="margin:8px 0;display:${S.source === "custom" ? "block" : "none"}">
      <textarea id="rnnCustomText" rows="2" style="width:100%;box-sizing:border-box" placeholder="Kendi metninizi buraya yazın...">${esc(S.text)}</textarea>
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0">
      <button class="btn" id="rnnTrainBtn">Eğit</button>
      <button class="btn sm" id="rnnResetBtn">Sıfırla</button>
      <progress id="rnnProgress" value="0" max="${S.epochs}" style="flex:1;min-width:100px"></progress>
      <span id="rnnStatus" style="font-size:.88rem;color:var(--ink-2)">Hazır</span>
    </div>

    <div class="ng-h">2 · Zamanda açılım (Unrolled RNN)</div>
    <p class="ck-meta" style="margin:4px 0">Girdi x_t (altta) → Gizli durum h_t (ortada, ortalama değer) → Çıktı y_t (en olası tahmin üstte):</p>
    <div class="fig-box" style="margin:8px 0;overflow-x:auto">
      <svg id="rnnUnrollSvg" class="rnn-unroll" height="220" style="display:block;border:1px solid var(--rule);border-radius:var(--r);background:var(--page)"></svg>
      <div style="margin-top:6px;display:flex;gap:8px">
        <button class="btn sm" data-export="svg" data-name="rnn-unroll">${icon("copy")} SVG indir</button>
        <button class="btn sm" data-export="png" data-name="rnn-unroll">${icon("copy")} PNG indir</button>
      </div>
    </div>

    <div class="ng-h">3 · Kaybolan / Patlayan Gradyanlar (‖∂L/∂h_t‖)</div>
    <div class="fig-box" style="margin:8px 0">
      <svg id="rnnNormSvg" class="rnn-unroll" viewBox="0 0 360 140" width="360" height="140" style="display:block;border:1px solid var(--rule);border-radius:var(--r);background:var(--page)"></svg>
      <p class="ck-meta" style="margin:4px 0">Zaman adımları geriye gittikçe gradyan normunun nasıl küçüldüğünü (kaybolduğunu) inceleyin.</p>
    </div>

    <div class="ng-h">4 · Kayıp eğrisi ve Metin Üretimi</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;margin:8px 0">
      <div class="fig-box">
        <svg id="rnnLossSvg" class="rnn-unroll" viewBox="0 0 320 100" width="320" height="100" style="display:block;border:1px solid var(--rule);border-radius:var(--r)"></svg>
      </div>
      <div style="flex:1;min-width:240px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <button class="btn sm" id="rnnSampleBtn">Metin üret</button>
          <label>Sıcaklık:
            <input type="range" id="rnnTemp" min="0.2" max="2.0" step="0.1" value="1.0" style="width:80px">
            <span id="rnnTempOut">1.0</span>
          </label>
        </div>
        <div id="rnnSampleBox"><blockquote style="margin:4px 0;padding:8px 12px;background:var(--sunk);border-left:3px solid var(--spot);font-size:.92rem">Üretmek için düğmeye tıklayın.</blockquote></div>
      </div>
    </div>

    <div class="stu">
      <div class="ng-h">5 · Formüller ve Yöntemin Açıklaması</div>
      <div class="nn-explain" style="line-height:1.6">
        <p><b>Vanilla RNN hücresi (DL-5 slayt 10–15):</b> <code>h_t = tanh(W_xh · x_t + W_hh · h_{t−1} + b_h)</code>.</p>
        <p><b>Çıktı katmanı:</b> <code>y_t = softmax(W_hy · h_t + b_y)</code>.</p>
        <p><b>BPTT (Zamanda Geri Yayılım):</b> Kayıp zaman adımları üzerinden geriye akar: <code>∂L/∂h_t = ∂L_t/∂h_t + W_hhᵀ (∂L/∂h_{t+1} ⊙ (1 − h_{t+1}²))</code>. Çarpım zinciri gradyanların üstel olarak kaybolmasına veya patlamasına neden olur.</p>
        <p><b>LSTM (DL-5 slayt 16–24):</b> Hücre durumu <code>c_t</code> ve kapılar (<code>f_t</code> unutma, <code>i_t</code> giriş, <code>o_t</code> çıkış) ile uzun vadeli bağımlılıkları korur.</p>
        <p class="ck-meta"><b>Bilinen sınırlar:</b> Küçük tarayıcı modeli ve kısa eğitim süresi nedeniyle üretilen karakter dizileri dilbilgisel açıdan kusursuz olmayabilir; amaç mekanizmayı adım adım göstermektir.</p>
      </div>

      <div class="ng-h">6 · Kendin hesapla</div>
      <div class="nn-practice">
        <div id="rnnPracticeQ"></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <label>Cevabın: <input type="text" id="rnnPracticeIn" placeholder="0.0000" style="width:110px"></label>
          <button class="btn sm" id="rnnPracticeCheck">Kontrol et</button>
          <span id="rnnPracticeFb" style="font-size:.9rem"></span>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  const q = id => $(id, root);

  q("#rnnSource")?.addEventListener("change", async e => {
    S.source = e.target.value;
    const cBox = q("#rnnCustomBox");
    if (cBox) cBox.style.display = S.source === "custom" ? "block" : "none";
    await prepareData();
    resetModel();
    saveState();
  });

  q("#rnnCustomText")?.addEventListener("input", async e => {
    S.text = e.target.value;
    if (S.source === "custom") {
      await prepareData();
      resetModel();
      saveState();
    }
  });

  q("#rnnHidden")?.addEventListener("change", e => { S.hiddenSize = +e.target.value; resetModel(); saveState(); });
  q("#rnnSeqLen")?.addEventListener("change", e => { S.seqLen = +e.target.value; runInference(); renderUnrolled(); renderNorms(); saveState(); });
  q("#rnnLr")?.addEventListener("change", e => { S.lr = +e.target.value; saveState(); });
  q("#rnnEpochs")?.addEventListener("change", e => { S.epochs = +e.target.value; saveState(); });
  q("#rnnSeed")?.addEventListener("change", e => { S.seed = +e.target.value; resetModel(); saveState(); });

  q("#rnnTrainBtn")?.addEventListener("click", () => {
    if (S.running) stopTraining();
    else startTraining();
  });

  q("#rnnResetBtn")?.addEventListener("click", () => {
    resetModel();
    renderStatus();
    renderLoss();
    renderUnrolled();
    renderNorms();
  });

  q("#rnnSampleBtn")?.addEventListener("click", generateSample);
  q("#rnnTemp")?.addEventListener("input", e => {
    S.sampleTemp = +e.target.value;
    const out = q("#rnnTempOut");
    if (out) out.textContent = S.sampleTemp.toFixed(1);
  });

  q("#rnnPracticeCheck")?.addEventListener("click", checkPractice);
}

const view = {
  async apply(p) {
    if (p.preset) {
      S.source = "preset";
      await prepareData();
      resetModel();
    }
  },
  async enter() {
    if (!root) return;
    if (!model) {
      await prepareData();
      resetModel();
    }
    renderStatus();
    renderLoss();
    renderUnrolled();
    renderNorms();
    renderPractice();
  },
  escape() {
    stopTraining();
    return false;
  }
};

registerView("rnn", view);

(async function mount() {
  root = $("#v-rnn");
  if (!root) return;
  loadState();
  buildHTML();
  bindEvents();
  await prepareData();
  resetModel();
  renderStatus();
  renderLoss();
  renderUnrolled();
  renderNorms();
  renderPractice();
})();

