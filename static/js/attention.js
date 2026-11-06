// Attention laboratuvarı — DL-6, DL-7 (Lecture 6). Arayüz modülü.
import { $, esc, registerView, icon } from "./core.js";
import {
  scaledDotProductAttention, causalMask, positionalEncoding,
  mulberry32, matMul
} from "./attn.js";

const KEY = "wn:attn";
const PRESET_SENTENCE = "öğrenci kitabı dikkatle okudu";

const S = {
  text: PRESET_SENTENCE,
  weightSource: "random", // "random" | "manual" | "emb"
  mode: "bidirectional",  // "bidirectional" (encoder) | "causal" (decoder)
  dim: 4,
  seed: 42,
  usePos: true,
  selectedQueryIdx: 0,
  manualQ: "1 0\n0 2",
  manualK: "1 1\n0 1",
  manualV: "1 2\n3 4",
  practiceAnswer: null
};

let root = null;
let currentTokens = [];
let currentRes = null;
let currentV = null;

function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v !== "object") return;
    if (typeof v.text === "string") S.text = v.text.slice(0, 100);
    if (["random", "manual", "emb"].includes(v.weightSource)) S.weightSource = v.weightSource;
    if (["bidirectional", "causal"].includes(v.mode)) S.mode = v.mode;
    if (Number.isFinite(v.dim)) S.dim = Math.max(2, Math.min(16, v.dim | 0));
    if (Number.isFinite(v.seed)) S.seed = v.seed | 0;
    if (typeof v.usePos === "boolean") S.usePos = v.usePos;
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      text: S.text,
      weightSource: S.weightSource,
      mode: S.mode,
      dim: S.dim,
      seed: S.seed,
      usePos: S.usePos
    }));
  } catch (_) {}
}

function tokenize(text) {
  return String(text || "")
    .toLocaleLowerCase("tr")
    .match(/[\p{L}\p{M}\p{N}]+/gu) || [];
}

function getVectors() {
  const tokens = tokenize(S.text).slice(0, 8); // token sınırı: en fazla 8 token
  if (!tokens.length) return null;

  const N = tokens.length;
  const D = S.dim;
  const rng = mulberry32(S.seed);

  let Q = [], K = [], V = [];

  if (S.weightSource === "manual") {
    // Küçük elle girilmiş matrisler
    const parseM = str => str.trim().split("\n").map(line =>
      line.trim().split(/\s+/).map(Number).filter(n => !isNaN(n))
    ).filter(row => row.length > 0);

    const mQ = parseM(S.manualQ);
    const mK = parseM(S.manualK);
    const mV = parseM(S.manualV);

    if (mQ.length && mK.length && mV.length && mQ[0].length === mK[0].length) {
      return {
        tokens: tokens.slice(0, mQ.length),
        Q: mQ,
        K: mK,
        V: mV
      };
    }
  }

  // Rastgele tohumlu vektörler
  for (let i = 0; i < N; i++) {
    const qRow = new Float64Array(D);
    const kRow = new Float64Array(D);
    const vRow = new Float64Array(D);
    for (let d = 0; d < D; d++) {
      qRow[d] = (rng() - 0.5) * 2;
      kRow[d] = (rng() - 0.5) * 2;
      vRow[d] = (rng() - 0.5) * 2;
    }
    Q.push(qRow);
    K.push(kRow);
    V.push(vRow);
  }

  // Konumsal kodlama ekleme (DL-6 slayt 22)
  if (S.usePos) {
    const PE = positionalEncoding(N, D);
    for (let i = 0; i < N; i++) {
      for (let d = 0; d < D; d++) {
        Q[i][d] += PE[i][d];
        K[i][d] += PE[i][d];
      }
    }
  }

  return { tokens, Q, K, V };
}

function computeAttention() {
  const data = getVectors();
  if (!data) {
    currentTokens = [];
    currentRes = null;
    return;
  }
  currentTokens = data.tokens;
  currentV = data.V;

  const N = currentTokens.length;
  const mask = S.mode === "causal" ? causalMask(N) : null;
  currentRes = scaledDotProductAttention(data.Q, data.K, data.V, { mask, scale: true });
}

function renderHeatmap() {
  const svg = $("#attnHeatmapSvg", root);
  if (!svg || !currentRes || !currentTokens.length) return;

  const N = currentTokens.length;
  const cell = 46;
  const labelW = 90;
  const W = labelW + N * cell + 20;
  const H = labelW + N * cell + 20;

  let elements = [];

  // Sütun başlıkları (Key tokenları)
  for (let j = 0; j < N; j++) {
    const cx = labelW + j * cell + cell / 2;
    elements.push(`
      <text x="${cx}" y="${labelW - 12}" text-anchor="start" transform="rotate(-40 ${cx} ${labelW - 12})" font-size="11" font-weight="bold" fill="var(--ink)">${esc(currentTokens[j])}</text>
    `);
  }

  // Satırlar (Query tokenları) ve hücreler
  for (let i = 0; i < N; i++) {
    const cy = labelW + i * cell + cell / 2;
    const isSelected = i === S.selectedQueryIdx;

    // Satır etiketi
    elements.push(`
      <text x="${labelW - 10}" y="${cy + 4}" text-anchor="end" font-size="11" font-weight="${isSelected ? 'bold' : 'normal'}" fill="${isSelected ? 'var(--spot)' : 'var(--ink)'}">${esc(currentTokens[i])}</text>
    `);

    // Hücreler
    for (let j = 0; j < N; j++) {
      const x = labelW + j * cell;
      const y = labelW + i * cell;
      const w = currentRes.weights[i][j];
      const isMasked = S.mode === "causal" && j > i;

      let fill = "var(--sunk)";
      if (!isMasked) {
        fill = `rgba(43,59,214,${Math.max(0.04, w)})`;
      }

      elements.push(`
        <rect class="attn-cell" data-i="${i}" data-j="${j}" x="${x}" y="${y}" width="${cell - 2}" height="${cell - 2}" rx="3" fill="${fill}" stroke="${isSelected ? 'var(--spot)' : 'var(--rule)'}" stroke-width="${isSelected ? 1.5 : 1}" style="cursor:pointer"/>
        <text x="${x + cell / 2 - 1}" y="${y + cell / 2 + 4}" text-anchor="middle" font-size="10" font-weight="${w > 0.4 ? 'bold' : 'normal'}" fill="${w > 0.5 ? '#fff' : 'var(--ink)'}" style="pointer-events:none">${isMasked ? '—' : w.toFixed(2)}</text>
      `);
    }
  }

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.width = `${Math.min(W, 480)}px`;
  svg.innerHTML = elements.join("");
}

function renderQueryDetail() {
  const box = $("#attnDetailBox", root);
  if (!box || !currentRes || !currentTokens.length) return;

  const i = Math.min(S.selectedQueryIdx, currentTokens.length - 1);
  const qToken = currentTokens[i];
  const weights = currentRes.weights[i];
  const outputVec = currentRes.output[i];

  let sumTerms = [];
  for (let j = 0; j < currentTokens.length; j++) {
    const w = weights[j];
    if (w <= 0.001) continue;
    const vRow = currentV[j];
    const vStr = `[${Array.from(vRow).map(v => v.toFixed(1)).join(", ")}]`;
    sumTerms.push(`<code>${w.toFixed(2)} × ${esc(currentTokens[j])} ${vStr}</code>`);
  }

  const outStr = `[${Array.from(outputVec).map(v => v.toFixed(2)).join(", ")}]`;

  box.innerHTML = `
    <div style="background:var(--sunk);padding:10px 14px;border-radius:var(--r);border-left:3px solid var(--spot)">
      <p style="margin:0 0 6px"><strong>Seçili Sorgu (Query):</strong> “${esc(qToken)}” (satır ${i})</p>
      <p style="margin:0 0 6px"><strong>Ağırlıklı Toplam:</strong> ${sumTerms.join(" + ") || "—"}</p>
      <p style="margin:0"><strong>Çıktı Temsili z_${i}:</strong> <code>${outStr}</code></p>
    </div>
  `;
}

function renderMatrixStepTable(mat, title, formula, colHeader = "Token", rowHeader = "Token") {
  const N = currentTokens.length;
  let rows = "";
  for (let i = 0; i < N; i++) {
    let cells = "";
    for (let j = 0; j < (mat[i] ? mat[i].length : 0); j++) {
      const v = mat[i][j];
      const str = v === -Infinity || v <= -1e8 ? "−∞" : v.toFixed(2);
      cells += `<td>${str}</td>`;
    }
    rows += `<tr><th>${esc(currentTokens[i])}</th>${cells}</tr>`;
  }

  let headCols = "";
  for (let j = 0; j < (mat[0] ? mat[0].length : 0); j++) {
    headCols += `<th>${esc(currentTokens[j] || "d" + j)}</th>`;
  }

  return `
    <div style="margin:10px 0">
      <p style="margin:0 0 4px"><strong>${title}</strong> <code>${formula}</code></p>
      <div class="ng-scroll">
        <table class="ng-tbl sm">
          <thead><tr><th>${rowHeader}\\${colHeader}</th>${headCols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderIntermediateSteps() {
  const box = $("#attnStepsBox", root);
  if (!box || !currentRes || !currentTokens.length) return;

  const html = `
    ${renderMatrixStepTable(currentRes.rawScores, "1. Ham Benzerlik Skorları", "Q · Kᵀ")}
    ${renderMatrixStepTable(currentRes.scaledScores, "2. Boyut Ölçekleme", "Q Kᵀ / √d_k")}
    ${S.mode === "causal" ? renderMatrixStepTable(currentRes.maskedScores, "3. Nedensel Maske Ekleme", "maskeleme (−∞)") : ""}
    ${renderMatrixStepTable(currentRes.weights, "4. Dikkat Ağırlıkları (Softmax)", "softmax(Q Kᵀ / √d_k)")}
    ${renderMatrixStepTable(currentRes.output, "5. Nihai Çıktı Matrisi", "Weights · V", "Boyut", "Token")}
  `;
  box.innerHTML = html;
}

function renderPractice() {
  const qBox = $("#attnPracticeQ", root);
  if (!qBox) return;

  // Small practice question:
  // q = [2, 0], k1 = [1, 1], k2 = [0, 2]
  // d_k = 2, sqrt(2) ≈ 1.4142
  // score1 = 2*1 + 0*1 = 2 -> scaled1 = 2 / 1.4142 = 1.4142
  // score2 = 2*0 + 0*2 = 0 -> scaled2 = 0 / 1.4142 = 0
  // softmax: exp(1.4142) / (exp(1.4142) + exp(0)) = 4.113 / (4.113 + 1) = 4.113 / 5.113 ≈ 0.8044
  const expected = Math.exp(Math.sqrt(2)) / (Math.exp(Math.sqrt(2)) + 1);
  S.practiceAnswer = { correct: expected, eps: 0.02 };

  qBox.innerHTML = `
    <p>Aşağıdaki sorgu ve 2 anahtar vektörü için 1. anahtarın dikkat ağırlığını <strong>w₁ = softmax(q·k₁ / √d_k)</strong> hesapla:</p>
    <ul style="margin:.4em 0;padding-left:1.4em;line-height:1.8">
      <li><code>q = [2, 0]</code></li>
      <li><code>k₁ = [1, 1]</code> (skor = 2.0)</li>
      <li><code>k₂ = [0, 2]</code> (skor = 0.0)</li>
      <li><code>d_k = 2</code> (√d_k ≈ 1.414)</li>
    </ul>
  `;
}

function checkPractice() {
  const inp = $("#attnPracticeIn", root);
  const fb = $("#attnPracticeFb", root);
  if (!inp || !fb || !S.practiceAnswer) return;
  const val = parseFloat(inp.value.replace(",", "."));
  if (isNaN(val)) {
    fb.textContent = "Lütfen geçerli bir sayı girin.";
    return;
  }
  if (Math.abs(val - S.practiceAnswer.correct) < S.practiceAnswer.eps) {
    fb.textContent = `✓ Doğru! (w₁ ≈ ${S.practiceAnswer.correct.toFixed(4)})`;
    fb.style.color = "var(--ok)";
  } else {
    fb.textContent = `✗ Tekrar dene. (İpucu: exp(1.414) / [exp(1.414) + 1] ≈ ${S.practiceAnswer.correct.toFixed(2)})`;
    fb.style.color = "var(--bad)";
  }
}

function renderAll() {
  computeAttention();
  renderHeatmap();
  renderQueryDetail();
  renderIntermediateSteps();
}

function buildHTML() {
  root.innerHTML = `
    <div class="ng-h">Attention & Transformer Mekanizması <span class="stu">· DL-6, DL-7</span></div>
    <p>Scaled Dot-Product Attention ve çok başlıklı dikkat adımlarını görselleştir.
    <span class="stu">Q, K, V matris çarpımı, softmax, nedensel maskeleme ve konumsal kodlama adım adım incelenir.</span></p>

    <div class="ng-h">1 · Cümle ve Vektör Kaynağı</div>
    <div class="nn-controls" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <label style="flex:1;min-width:200px">Cümle (en çok 8 token):
        <input type="text" id="attnText" value="${esc(S.text)}" style="width:100%;box-sizing:border-box">
      </label>
      <label>Ağırlık Kaynağı:
        <select id="attnSource">
          <option value="random"${S.weightSource === "random" ? " selected" : ""}>Rastgele (Tohumlu)</option>
          <option value="manual"${S.weightSource === "manual" ? " selected" : ""}>Küçük matrisleri elle gir</option>
        </select>
      </label>
      <label>Mimari Kip:
        <select id="attnMode">
          <option value="bidirectional"${S.mode === "bidirectional" ? " selected" : ""}>Çift Yönlü (Encoder - BERT)</option>
          <option value="causal"${S.mode === "causal" ? " selected" : ""}>Nedensel / Maskeli (Decoder - GPT)</option>
        </select>
      </label>
      <label>Vektör boyutu (d_k):
        <input type="number" id="attnDim" min="2" max="16" value="${S.dim}" style="width:55px">
      </label>
      <label>
        <input type="checkbox" id="attnPos" ${S.usePos ? "checked" : ""}> Konumsal Kodlama (PE)
      </label>
      <label>Tohum:
        <input type="number" id="attnSeed" value="${S.seed}" style="width:65px">
      </label>
    </div>

    <div id="attnManualBox" style="margin:8px 0;display:${S.weightSource === "manual" ? "block" : "none"}">
      <p class="ck-meta" style="margin:4px 0">Küçük 2x2 matrisleri satır satır boşlukla girin:</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div><label>Q:<br><textarea id="attnManQ" rows="2" cols="10" style="font-family:var(--font-mono)">${esc(S.manualQ)}</textarea></label></div>
        <div><label>K:<br><textarea id="attnManK" rows="2" cols="10" style="font-family:var(--font-mono)">${esc(S.manualK)}</textarea></label></div>
        <div><label>V:<br><textarea id="attnManV" rows="2" cols="10" style="font-family:var(--font-mono)">${esc(S.manualV)}</textarea></label></div>
      </div>
    </div>

    <div class="ck-meta" style="margin:6px 0;padding:6px 10px;background:var(--sunk);border-radius:var(--r)">
      ℹ <strong>Önemli Bilgi:</strong> Model ağırlıkları eğitilmediği için (rastgele veya elle girildiği için) ortaya çıkan dikkat örüntüleri semantik açıdan anlamlı değildir; laboratuvarın amacı matematiksel transformasyon adımlarını somutlaştırmaktır.
    </div>

    <div class="ng-h">2 · Dikkat Isı Haritası (Attention Heatmap)</div>
    <p class="ck-meta" style="margin:4px 0">Satırlar = Sorgu (Query), Sütunlar = Anahtar (Key). Satıra veya hücreye tıklayarak ağırlıklı toplamı görün:</p>
    <div class="fig-box" style="margin:8px 0">
      <svg id="attnHeatmapSvg" class="attn-map" height="340" style="display:block;border:1px solid var(--rule);border-radius:var(--r);background:var(--page)"></svg>
      <div style="margin-top:6px;display:flex;gap:8px">
        <button class="btn sm" data-export="svg" data-name="attention-heatmap">${icon("copy")} SVG indir</button>
        <button class="btn sm" data-export="png" data-name="attention-heatmap">${icon("copy")} PNG indir</button>
      </div>
    </div>

    <div class="ng-h">3 · Seçili Sorgunun Ağırlıklı Toplamı (Context Vector)</div>
    <div id="attnDetailBox"></div>

    <div class="stu">
      <div class="ng-h">4 · Ara Matrisler ve Adım Adım Hesaplama</div>
      <div id="attnStepsBox"></div>

      <div class="ng-h">5 · Formüller ve Yöntemin Açıklaması</div>
      <div class="nn-explain" style="line-height:1.6">
        <p><b>Scaled Dot-Product Attention (DL-6 slayt 13–16):</b> <code>Attention(Q, K, V) = softmax(Q Kᵀ / √d_k) · V</code>.</p>
        <p><b>Neden √d_k ile ölçeklenir?</b> d_k büyüdükçe iç çarpımların büyüklüğü artar, bu da softmax fonksiyonunu aşırı küçük gradyanlara (doygunluğa) iter. √d_k bölmesi varyansı 1'e normalize eder.</p>
        <p><b>Encoder vs Decoder (DL-7 slayt 4–32):</b> Encoder çift yönlü (tüm tokenlar birbirini görür); Decoder ise otoregresif / nedenseldir (causal mask ile gelecekteki tokenlara −∞ atanarak ağırlıkları 0 yapılır).</p>
      </div>

      <div class="ng-h">6 · Kendin hesapla</div>
      <div class="nn-practice">
        <div id="attnPracticeQ"></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <label>Cevabın: <input type="text" id="attnPracticeIn" placeholder="0.0000" style="width:110px"></label>
          <button class="btn sm" id="attnPracticeCheck">Kontrol et</button>
          <span id="attnPracticeFb" style="font-size:.9rem"></span>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  const q = id => $(id, root);

  q("#attnText")?.addEventListener("input", e => {
    S.text = e.target.value;
    renderAll();
    saveState();
  });

  q("#attnSource")?.addEventListener("change", e => {
    S.weightSource = e.target.value;
    const mBox = q("#attnManualBox");
    if (mBox) mBox.style.display = S.weightSource === "manual" ? "block" : "none";
    renderAll();
    saveState();
  });

  q("#attnMode")?.addEventListener("change", e => {
    S.mode = e.target.value;
    renderAll();
    saveState();
  });

  q("#attnDim")?.addEventListener("change", e => { S.dim = +e.target.value; renderAll(); saveState(); });
  q("#attnPos")?.addEventListener("change", e => { S.usePos = e.target.checked; renderAll(); saveState(); });
  q("#attnSeed")?.addEventListener("change", e => { S.seed = +e.target.value; renderAll(); saveState(); });

  q("#attnManQ")?.addEventListener("input", e => { S.manualQ = e.target.value; renderAll(); });
  q("#attnManK")?.addEventListener("input", e => { S.manualK = e.target.value; renderAll(); });
  q("#attnManV")?.addEventListener("input", e => { S.manualV = e.target.value; renderAll(); });

  root.addEventListener("click", e => {
    const cell = e.target.closest(".attn-cell");
    if (cell) {
      const i = +cell.dataset.i;
      S.selectedQueryIdx = i;
      renderHeatmap();
      renderQueryDetail();
    }
  });

  q("#attnPracticeCheck")?.addEventListener("click", checkPractice);
}

const view = {
  apply(p) {
    if (p.text) {
      S.text = p.text;
      const tIn = $("#attnText", root);
      if (tIn) tIn.value = p.text;
      renderAll();
    }
  },
  enter() {
    if (!root) return;
    renderAll();
    renderPractice();
  }
};

registerView("attn", view);

(function mount() {
  root = $("#v-attn");
  if (!root) return;
  loadState();
  buildHTML();
  bindEvents();
  renderAll();
  renderPractice();
})();

