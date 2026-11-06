// Embedding laboratuvarı — DL-3, DL-4 Part 3 (Lecture 6). Arayüz modülü.
import { $, esc, registerView, icon } from "./core.js";
import {
  tokenize, buildVocab, createTrainer, nearest, analogy,
  pca2d, pmiBuild, pmiSimilar
} from "./emb.js";
import { loadCorpus, tokensOf } from "./corpusdata.js";

const KEY = "wn:emb";
const PRESET_TEXT = "kedi süt içer ve uyur. köpek kemik yer ve koşar. araba yolda hızla gider. motor ses çıkarır ve yolda hızlanır. tren rayda gider. uçak havada uçar. kuş havada uçar ve şarkı söyler. balık suda yüzer ve sessizdir. kedi fare yakalar. köpek eve bekçilik yapar. araba benzin tüketir. motor benzin tüketir. insan kitap okur ve düşünür. öğrenci ders çalışır ve öğrenir.";

const S = {
  source: "preset", // "preset" | "boun" | "custom"
  customText: PRESET_TEXT,
  dim: 16,
  window: 2,
  negK: 3,
  lr: 0.05,
  epochs: 15,
  seed: 42,
  running: false,
  curEpoch: 0,
  lossHistory: [],
  queryWord: "kedi",
  analogyA: "araba",
  analogyB: "yolda",
  analogyC: "uçak",
  practiceAnswer: null
};

let root = null;
let trainer = null;
let cachedTokens = [];
let cachedVocab = null;
let cachedIvocab = [];
let cachedFreq = null;
let cachedPmi = null;
let cachedPca = [];
let trainRaf = null;

function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v !== "object") return;
    if (["preset", "boun", "custom"].includes(v.source)) S.source = v.source;
    if (typeof v.customText === "string") S.customText = v.customText.slice(0, 50000);
    if (Number.isFinite(v.dim)) S.dim = Math.max(4, Math.min(64, v.dim | 0));
    if (Number.isFinite(v.window)) S.window = Math.max(1, Math.min(5, v.window | 0));
    if (Number.isFinite(v.negK)) S.negK = Math.max(1, Math.min(10, v.negK | 0));
    if (Number.isFinite(v.lr)) S.lr = Math.max(0.001, Math.min(0.5, v.lr));
    if (Number.isFinite(v.epochs)) S.epochs = Math.max(1, Math.min(100, v.epochs | 0));
    if (Number.isFinite(v.seed)) S.seed = v.seed | 0;
    if (typeof v.queryWord === "string") S.queryWord = v.queryWord;
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      source: S.source,
      customText: S.customText,
      dim: S.dim,
      window: S.window,
      negK: S.negK,
      lr: S.lr,
      epochs: S.epochs,
      seed: S.seed,
      queryWord: S.queryWord
    }));
  } catch (_) {}
}

async function prepareCorpus() {
  if (S.source === "boun") {
    try {
      const c = await loadCorpus("boun");
      const sents = tokensOf(c, { punct: false, lower: true });
      cachedTokens = sents.flat();
      cachedPmi = pmiBuild(sents, S.window);
    } catch (_) {
      cachedTokens = tokenize(PRESET_TEXT);
      cachedPmi = pmiBuild([cachedTokens], S.window);
    }
  } else {
    const raw = S.source === "custom" ? S.customText : PRESET_TEXT;
    cachedTokens = tokenize(raw);
    const sents = raw.split(/[.!?]+/).map(s => tokenize(s)).filter(s => s.length > 0);
    cachedPmi = pmiBuild(sents.length ? sents : [cachedTokens], S.window);
  }
  const v = buildVocab(cachedTokens, 500);
  cachedVocab = v.vocab;
  cachedIvocab = v.ivocab;
  cachedFreq = v.freq;
}

function initModel() {
  stopTraining();
  S.curEpoch = 0;
  S.lossHistory = [];
  cachedPca = [];
  if (!cachedVocab || cachedVocab.size === 0) return;
  trainer = createTrainer({
    tokens: cachedTokens,
    vocab: cachedVocab,
    ivocab: cachedIvocab,
    freq: cachedFreq,
    dim: S.dim,
    window: S.window,
    negK: S.negK,
    lr: S.lr,
    seed: S.seed
  });
}

function stopTraining() {
  S.running = false;
  if (trainRaf) {
    cancelAnimationFrame(trainRaf);
    trainRaf = null;
  }
  updateTrainBtn();
}

function trainLoop() {
  if (!S.running || !trainer) {
    stopTraining();
    return;
  }
  // Run steps in animation frames
  const stepsPerFrame = Math.max(4, Math.floor(cachedTokens.length / 20));
  let done = false;
  for (let i = 0; i < stepsPerFrame; i++) {
    const res = trainer.step(16);
    if (res.epochDone) {
      S.curEpoch = trainer.getEpoch();
      S.lossHistory.push(res.loss);
      if (S.curEpoch >= S.epochs) {
        done = true;
        break;
      }
    }
  }
  renderStatus();
  renderLoss();
  if (done) {
    stopTraining();
    computePCA();
    renderOutputs();
  } else {
    trainRaf = requestAnimationFrame(trainLoop);
  }
}

function startTraining() {
  if (!trainer || S.curEpoch >= S.epochs) {
    initModel();
  }
  S.running = true;
  updateTrainBtn();
  trainLoop();
}

function updateTrainBtn() {
  const btn = $("#embTrainBtn", root);
  if (!btn) return;
  btn.textContent = S.running ? "Durdur" : (S.curEpoch > 0 && S.curEpoch < S.epochs ? "Devam et" : "Eğit");
}

function computePCA() {
  if (!trainer) return;
  const { W, dim, vocabSize } = trainer.getAll();
  cachedPca = pca2d(W, dim, vocabSize, S.seed);
}

function renderLoss() {
  const svg = $("#embLossSvg", root);
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

function renderStatus() {
  const stat = $("#embStatus", root);
  const prog = $("#embProgress", root);
  if (prog) {
    prog.max = S.epochs;
    prog.value = S.curEpoch;
  }
  if (stat) {
    const lastLoss = S.lossHistory.length ? S.lossHistory[S.lossHistory.length - 1].toFixed(4) : "—";
    stat.textContent = `Devir ${S.curEpoch}/${S.epochs} · Kayıp: ${lastLoss} · Sözlük: ${cachedIvocab.length}`;
  }
}

function renderNeighbors() {
  const box = $("#embNeighborsBox", root);
  if (!box) return;
  const w = S.queryWord.toLocaleLowerCase("tr").trim();
  if (!cachedVocab || !cachedVocab.has(w)) {
    box.innerHTML = `<p class="ck-meta">“${esc(w)}” sözcüğü sözlükte bulunamadı. Sözlükteki sözcüklerden birini seçin.</p>`;
    return;
  }
  const wIdx = cachedVocab.get(w);

  // Embedding neighbors
  let embRows = [];
  if (trainer && S.curEpoch > 0) {
    const { W, dim, vocabSize } = trainer.getAll();
    const near = nearest(wIdx, W, dim, vocabSize, 8);
    embRows = near.map(([idx, cos]) => ({
      word: cachedIvocab[idx],
      val: cos.toFixed(3)
    }));
  }

  // PPMI neighbors
  let pmiRows = [];
  if (cachedPmi) {
    const pNear = pmiSimilar(cachedPmi, w, 1, 8);
    pmiRows = pNear.map(p => ({
      word: p.w,
      val: p.cos.toFixed(3)
    }));
  }

  const maxLen = Math.max(embRows.length, pmiRows.length);
  let rowsHtml = "";
  if (maxLen === 0) {
    rowsHtml = `<tr><td colspan="4" class="muted">Eğitilmiş embedding veya PPMI verisi yok (önce Eğit düğmesine basın).</td></tr>`;
  } else {
    for (let i = 0; i < maxLen; i++) {
      const e = embRows[i];
      const p = pmiRows[i];
      rowsHtml += `
        <tr>
          <td>${e ? `<b>${esc(e.word)}</b>` : "—"}</td>
          <td>${e ? e.val : "—"}</td>
          <td>${p ? `<b>${esc(p.word)}</b>` : "—"}</td>
          <td>${p ? p.val : "—"}</td>
        </tr>`;
    }
  }

  box.innerHTML = `
    <div class="ng-scroll">
      <table class="ng-tbl">
        <thead>
          <tr>
            <th colspan="2">Word2Vec (Skip-Gram Kosinüs)</th>
            <th colspan="2">PPMI Benzerliği (lm.js)</th>
          </tr>
          <tr>
            <th>Sözcük</th><th>Kosinüs</th>
            <th>Sözcük</th><th>Kosinüs</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function renderAnalogy() {
  const box = $("#embAnalogyBox", root);
  if (!box) return;
  if (!trainer || S.curEpoch === 0) {
    box.innerHTML = `<p class="muted">Analoji hesabı için önce modeli eğitin.</p>`;
    return;
  }
  const a = S.analogyA.toLocaleLowerCase("tr").trim();
  const b = S.analogyB.toLocaleLowerCase("tr").trim();
  const c = S.analogyC.toLocaleLowerCase("tr").trim();

  if (!cachedVocab.has(a) || !cachedVocab.has(b) || !cachedVocab.has(c)) {
    box.innerHTML = `<p class="ck-meta">Sözcüklerden en az biri sözlükte yok (a: ${cachedVocab.has(a) ? "var" : "yok"}, b: ${cachedVocab.has(b) ? "var" : "yok"}, c: ${cachedVocab.has(c) ? "var" : "yok"}).</p>`;
    return;
  }
  const aIdx = cachedVocab.get(a), bIdx = cachedVocab.get(b), cIdx = cachedVocab.get(c);
  const { W, dim, vocabSize } = trainer.getAll();
  const res = analogy(aIdx, bIdx, cIdx, W, dim, vocabSize, 5);

  let html = `<p class="ck-meta" style="margin-bottom:6px">Hesap: <code>${esc(a)} − ${esc(b)} + ${esc(c)} ≈ ?</code></p>`;
  html += `<div class="chips">`;
  for (const [idx, score] of res) {
    html += `<span class="chip" style="cursor:pointer" data-act="emb-pick" data-w="${esc(cachedIvocab[idx])}">
      <b>${esc(cachedIvocab[idx])}</b> <small>${score.toFixed(3)}</small>
    </span>`;
  }
  html += `</div>`;
  box.innerHTML = html;
}

function renderPcaMap() {
  const svg = $("#embPcaSvg", root);
  if (!svg) return;
  if (!cachedPca.length) {
    svg.innerHTML = `<text x="240" y="150" text-anchor="middle" fill="var(--ink-3)" font-size="12">2B harita için önce modeli eğitin</text>`;
    return;
  }
  const W = 480, H = 300, PAD = 35;
  // Min / max
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const N = Math.min(cachedPca.length, 60);
  for (let i = 0; i < N; i++) {
    const [x, y] = cachedPca[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const rx = Math.max(maxX - minX, 1e-4);
  const ry = Math.max(maxY - minY, 1e-4);

  const pts = [];
  for (let i = 0; i < N; i++) {
    const [x, y] = cachedPca[i];
    const px = PAD + ((x - minX) / rx) * (W - PAD * 2);
    const py = PAD + ((y - minY) / ry) * (H - PAD * 2);
    const word = cachedIvocab[i];
    const isSel = word === S.queryWord;
    pts.push(`
      <g class="emb-pt" data-w="${esc(word)}" style="cursor:pointer">
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${isSel ? 5 : 3}" fill="${isSel ? 'var(--spot)' : 'var(--ink-2)'}" stroke="var(--page)" stroke-width="1.2"/>
        <text x="${(px + 6).toFixed(1)}" y="${(py + 3).toFixed(1)}" font-size="${isSel ? 12 : 10}" font-weight="${isSel ? 'bold' : 'normal'}" fill="${isSel ? 'var(--spot)' : 'var(--ink)'}">${esc(word)}</text>
      </g>
    `);
  }

  svg.innerHTML = `
    <line x1="${PAD}" y1="${H / 2}" x2="${W - PAD}" y2="${H / 2}" stroke="var(--rule)" stroke-dasharray="2 2"/>
    <line x1="${W / 2}" y1="${PAD}" x2="${W / 2}" y2="${H - PAD}" stroke="var(--rule)" stroke-dasharray="2 2"/>
    ${pts.join("")}
  `;
}

function renderOutputs() {
  renderNeighbors();
  renderAnalogy();
  renderPcaMap();
}

function renderPractice() {
  const qBox = $("#embPracticeQ", root);
  if (!qBox) return;
  // Example practice question
  // v_w = [0.6, -0.4], v_c = [0.5, 0.2], v_neg = [-0.3, 0.8]
  // score_pos = 0.6*0.5 + (-0.4)*0.2 = 0.3 - 0.08 = 0.22
  // score_neg = 0.6*(-0.3) + (-0.4)*0.8 = -0.18 - 0.32 = -0.50
  // sigmoid(0.22) = 1/(1+e^-0.22) = 0.5548
  // sigmoid(-0.50) = 1/(1+e^0.50) = 0.3775
  // loss_pos = -log(0.5548) = 0.5891
  // loss_neg = -log(1 - 0.3775) = -log(0.6225) = 0.4740
  // total_loss = 0.5891 + 0.4740 = 1.0631
  const sig = x => 1 / (1 + Math.exp(-x));
  const sp = 0.22;
  const sn = -0.50;
  const lp = -Math.log(sig(sp));
  const ln = -Math.log(1 - sig(sn));
  const tot = lp + ln;

  S.practiceAnswer = { correct: tot, eps: 0.02 };
  qBox.innerHTML = `
    <p>Aşağıdaki tek merkez sözcük ve bir negatif örnek için toplam <strong>Skip-gram negatif örnekleme kaybını</strong> hesapla:</p>
    <ul style="margin:.4em 0;padding-left:1.4em;line-height:1.8">
      <li>Merkez vektör: <code>v_w = [0.6, −0.4]</code></li>
      <li>Pozitif bağlam vektörü: <code>v_c = [0.5, 0.2]</code> (skor = 0.22)</li>
      <li>Negatif örnek vektörü: <code>v_neg = [−0.3, 0.8]</code> (skor = −0.50)</li>
      <li>Kayıp: <code>L = −log(σ(v_w·v_c)) − log(1 − σ(v_w·v_neg))</code></li>
    </ul>
  `;
}

function checkPractice() {
  const inp = $("#embPracticeIn", root);
  const fb = $("#embPracticeFb", root);
  if (!inp || !fb || !S.practiceAnswer) return;
  const val = parseFloat(inp.value.replace(",", "."));
  if (isNaN(val)) {
    fb.textContent = "Lütfen geçerli bir sayı girin.";
    return;
  }
  if (Math.abs(val - S.practiceAnswer.correct) < S.practiceAnswer.eps) {
    fb.textContent = `✓ Doğru! (Kayıp ≈ ${S.practiceAnswer.correct.toFixed(4)})`;
    fb.style.color = "var(--ok)";
  } else {
    fb.textContent = `✗ Tekrar dene. Beklenen değer yaklaşık ${S.practiceAnswer.correct.toFixed(2)} civarındadır.`;
    fb.style.color = "var(--bad)";
  }
}

function buildHTML() {
  root.innerHTML = `
    <div class="ng-h">Word Embedding <span class="stu">· DL-3, DL-4 Part 3</span></div>
    <p>Sözcükleri yoğun vektörlerle temsil et; benzer bağlamlarda geçen sözcüklerin yakınlaştığını gözlemle.
    <span class="stu">Skip-gram, negatif örnekleme ve PCA izdüşümü gerçek hesapla işletilir.</span></p>

    <div class="ng-h">1 · Korpus ve hiperparametreler</div>
    <div class="nn-controls" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <label>Kaynak:
        <select id="embSource">
          <option value="preset"${S.source === "preset" ? " selected" : ""}>Küçük oyuncak metin (hayvanlar/araçlar)</option>
          <option value="boun"${S.source === "boun" ? " selected" : ""}>BOUN Korpusu (UD Türkçe)</option>
          <option value="custom"${S.source === "custom" ? " selected" : ""}>Özel metin</option>
        </select>
      </label>
      <label>Boyut (dim):
        <input type="number" id="embDim" min="4" max="64" value="${S.dim}" style="width:65px">
      </label>
      <label>Pencere:
        <input type="number" id="embWindow" min="1" max="5" value="${S.window}" style="width:55px">
      </label>
      <label>Negatif k:
        <input type="number" id="embNegK" min="1" max="10" value="${S.negK}" style="width:55px">
      </label>
      <label>Öğrenme oranı (lr):
        <input type="number" id="embLr" min="0.005" max="0.5" step="0.01" value="${S.lr}" style="width:75px">
      </label>
      <label>Devir (epoch):
        <input type="number" id="embEpochs" min="1" max="100" value="${S.epochs}" style="width:65px">
      </label>
      <label>Tohum:
        <input type="number" id="embSeed" value="${S.seed}" style="width:70px">
      </label>
    </div>

    <div id="embCustomBox" style="margin:8px 0;display:${S.source === "custom" ? "block" : "none"}">
      <textarea id="embCustomText" rows="3" style="width:100%;box-sizing:border-box" placeholder="Kendi metninizi buraya yapıştırın...">${esc(S.customText)}</textarea>
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0">
      <button class="btn" id="embTrainBtn">Eğit</button>
      <button class="btn sm" id="embResetBtn">Sıfırla</button>
      <progress id="embProgress" value="0" max="${S.epochs}" style="flex:1;min-width:100px"></progress>
      <span id="embStatus" style="font-size:.88rem;color:var(--ink-2)">Hazır</span>
    </div>

    <div class="ng-h">2 · Kayıp eğrisi</div>
    <div class="fig-box" style="margin:8px 0">
      <svg id="embLossSvg" class="emb-pca" viewBox="0 0 320 100" width="320" height="100" style="display:block;border:1px solid var(--rule);border-radius:var(--r)"></svg>
    </div>

    <div class="ng-h">3 · En yakın komşular (Word2Vec vs PPMI)</div>
    <div style="display:flex;gap:8px;align-items:center;margin:8px 0">
      <label>Sözcük:
        <input type="text" id="embQueryWord" value="${esc(S.queryWord)}" style="width:140px">
      </label>
      <button class="btn sm" id="embQueryBtn">Sorgula</button>
    </div>
    <div id="embNeighborsBox"></div>

    <div class="ng-h">4 · Sözcük analojisi (a − b + c)</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0">
      <input type="text" id="embAnaA" value="${esc(S.analogyA)}" style="width:100px" title="a">
      <span>−</span>
      <input type="text" id="embAnaB" value="${esc(S.analogyB)}" style="width:100px" title="b">
      <span>+</span>
      <input type="text" id="embAnaC" value="${esc(S.analogyC)}" style="width:100px" title="c">
      <button class="btn sm" id="embAnaBtn">Hesapla</button>
    </div>
    <div id="embAnalogyBox"></div>

    <div class="ng-h">5 · 2B Vektör haritası (PCA)</div>
    <div class="fig-box" style="margin:8px 0">
      <svg id="embPcaSvg" class="emb-pca" viewBox="0 0 480 300" width="100%" style="max-width:520px;height:auto;display:block;border:1px solid var(--rule);border-radius:var(--r)"></svg>
      <div style="margin-top:6px;display:flex;gap:8px">
        <button class="btn sm" data-export="svg" data-name="embedding-pca">${icon("copy")} SVG indir</button>
        <button class="btn sm" data-export="png" data-name="embedding-pca">${icon("copy")} PNG indir</button>
      </div>
    </div>

    <div class="stu">
      <div class="ng-h">6 · Formüller ve yöntemin açıklaması</div>
      <div class="nn-explain" style="line-height:1.6">
        <p><b>Skip-gram (DL-3 slayt 24):</b> Merkez sözcük <code>w</code> verildiğinde bağlam sözcüğü <code>c</code>'nin olasılığı: <code>P(c|w) = exp(u_cᵀ v_w) / Σ exp(u_w'ᵀ v_w)</code>.</p>
        <p><b>Negatif Örnekleme (DL-3 slayt 26):</b> Softmax paydasındaki toplam pahalıdır; bunun yerine ikili lojistik hedef kullanılır: <code>L = −log σ(u_cᵀ v_w) − Σᵢ₌₁ᵏ log σ(−u_{n_i}ᵀ v_w)</code>.</p>
        <p><b>Kosinüs benzerliği (DL-3 slayt 7):</b> <code>cos(u, v) = (u · v) / (‖u‖ ‖v‖)</code>.</p>
        <p><b>Sözcük analojisi (DL-3 slayt 27):</b> <code>v = v_a − v_b + v_c</code> vektörüne en yakın sözcük aranır.</p>
        <p class="ck-meta"><b>Bilinen sınırlar:</b> BOUN korpusu derlem kümesi için küçüktür (birkaç bin token); öğrenilen vektörler büyük modeller (Word2Vec GoogleNews vb.) kadar kararlı değildir. Analojiler küçük verilerde çoğunlukla gürültülü sonuç verir.</p>
      </div>

      <div class="ng-h">7 · Kendin hesapla</div>
      <div class="nn-practice">
        <div id="embPracticeQ"></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <label>Cevabın: <input type="text" id="embPracticeIn" placeholder="0.0000" style="width:110px"></label>
          <button class="btn sm" id="embPracticeCheck">Kontrol et</button>
          <span id="embPracticeFb" style="font-size:.9rem"></span>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  const q = id => $(id, root);

  q("#embSource")?.addEventListener("change", async e => {
    S.source = e.target.value;
    const cBox = q("#embCustomBox");
    if (cBox) cBox.style.display = S.source === "custom" ? "block" : "none";
    await prepareCorpus();
    initModel();
    renderOutputs();
    saveState();
  });

  q("#embCustomText")?.addEventListener("input", async e => {
    S.customText = e.target.value;
    if (S.source === "custom") {
      await prepareCorpus();
      initModel();
      renderOutputs();
      saveState();
    }
  });

  q("#embDim")?.addEventListener("change", e => { S.dim = +e.target.value; initModel(); saveState(); });
  q("#embWindow")?.addEventListener("change", e => { S.window = +e.target.value; initModel(); saveState(); });
  q("#embNegK")?.addEventListener("change", e => { S.negK = +e.target.value; initModel(); saveState(); });
  q("#embLr")?.addEventListener("change", e => { S.lr = +e.target.value; initModel(); saveState(); });
  q("#embEpochs")?.addEventListener("change", e => { S.epochs = +e.target.value; saveState(); });
  q("#embSeed")?.addEventListener("change", e => { S.seed = +e.target.value; initModel(); saveState(); });

  q("#embTrainBtn")?.addEventListener("click", () => {
    if (S.running) stopTraining();
    else startTraining();
  });

  q("#embResetBtn")?.addEventListener("click", () => {
    stopTraining();
    initModel();
    renderStatus();
    renderLoss();
    renderOutputs();
  });

  q("#embQueryBtn")?.addEventListener("click", () => {
    S.queryWord = q("#embQueryWord").value;
    renderNeighbors();
    renderPcaMap();
    saveState();
  });

  q("#embAnaBtn")?.addEventListener("click", () => {
    S.analogyA = q("#embAnaA").value;
    S.analogyB = q("#embAnaB").value;
    S.analogyC = q("#embAnaC").value;
    renderAnalogy();
    saveState();
  });

  root.addEventListener("click", e => {
    const pt = e.target.closest(".emb-pt");
    if (pt) {
      const w = pt.dataset.w;
      if (w) {
        S.queryWord = w;
        const qw = q("#embQueryWord");
        if (qw) qw.value = w;
        renderNeighbors();
        renderPcaMap();
      }
    }
    const pick = e.target.closest("[data-act='emb-pick']");
    if (pick) {
      const w = pick.dataset.w;
      if (w) {
        S.queryWord = w;
        const qw = q("#embQueryWord");
        if (qw) qw.value = w;
        renderNeighbors();
        renderPcaMap();
      }
    }
  });

  q("#embPracticeCheck")?.addEventListener("click", checkPractice);
}

const view = {
  async apply(p) {
    if (p.w) {
      S.queryWord = p.w;
      renderNeighbors();
      renderPcaMap();
    }
  },
  async enter() {
    if (!root) return;
    if (!cachedVocab) {
      await prepareCorpus();
      initModel();
    }
    renderStatus();
    renderLoss();
    renderOutputs();
    renderPractice();
  },
  escape() {
    stopTraining();
    return false;
  }
};

registerView("emb", view);

(async function mount() {
  root = $("#v-emb");
  if (!root) return;
  loadState();
  buildHTML();
  bindEvents();
  await prepareCorpus();
  initModel();
  renderStatus();
  renderLoss();
  renderOutputs();
  renderPractice();
})();

