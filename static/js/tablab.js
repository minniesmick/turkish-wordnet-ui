// Tablo verisi sekmesi: Colab-1 not defterlerinin (ikili sınıflandırma, çok sınıflı sınıflandırma, regresyon) tarayıcıdaki karşılığı. Arayüz modülü; hesaplar tabnn.js ve nn.js'te.
import {$, $$, esc, registerView} from "./core.js";
import {parseCSV, TASKS, trainTask, predict} from "./tabnn.js";

const KEY = "wn:tab";
const S = {task:"binary", hidden:"16, 8", opt:null, lr:null, epochs:null, scale:null, vals:{}};
let root = null, data = {}, model = null, busy = "", err = "";

const load = () => { try{ const v = JSON.parse(localStorage.getItem(KEY)); if(v && TASKS[v.task]) Object.assign(S, {task:v.task, hidden:String(v.hidden || S.hidden)}); }catch(_){} };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({task:S.task, hidden:S.hidden})); }catch(_){} };
const T = () => TASKS[S.task];
const cfg = () => { const t = T(); return {opt:S.opt || t.opt, lr:S.lr ?? t.lr, epochs:S.epochs ?? t.epochs, scale:S.scale || t.scale}; };
const f4 = x => Number.isFinite(x) ? String(+x.toFixed(4)) : "–";
const hiddenOf = () => { const h = S.hidden.split(/[,\s]+/).map(x => parseInt(x, 10)).filter(x => x >= 1 && x <= 64).slice(0, 4); return h.length ? h : [16, 8]; };

const CODE = {
  binary:`class NeuralNet(nn.Module):
  nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 8), nn.ReLU(),
  nn.Linear(8, 1), nn.Sigmoid()
criterion = nn.BCELoss()
optimizer = optim.SGD(model.parameters(), lr=0.01)   # Adam satırı yorumda
for epoch in range(40):            # her epoch tüm eğitim kümesiyle tek adım
    outputs = model(X_train); loss = criterion(outputs, y_train)
    optimizer.zero_grad(); loss.backward(); optimizer.step()`,
  multi:`nn.Linear(4, 16), nn.ReLU(), nn.Linear(16, 8), nn.ReLU(), nn.Linear(8, 3)   # 3 sınıf, softmax yok
criterion = nn.CrossEntropyLoss()      # softmax'ı içinde taşır
optimizer = optim.Adam(model.parameters(), lr=0.01)
preds = torch.argmax(logits, dim=1)    # en büyük logit = tahmin sınıfı`,
  regression:`nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 8), nn.ReLU(), nn.Linear(8, 1)   # sigmoid yok
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)
scaler = StandardScaler()   # fit yalnızca eğitimde, test'e transform`
};
const FORM = {binary:"BCE = −[ y·log(p) + (1 − y)·log(1 − p) ] ortalaması. p = sigmoid(z); gradyan: ∂L/∂z = p − y.", multi:"CE = −log(p_doğru sınıf) ortalaması. p = softmax(z); gradyan: ∂L/∂z = p − y (y: one-hot).", regression:"MSE = ortalama (ŷ − y)². Çıktı doğrusal; gradyan: 2(ŷ − y) / N."};

// ───────────────────────── çizim
function lossSVG(L){
  const W = 640, H = 200, pad = 36, mx = Math.max(...L), mn = Math.min(...L), span = (mx - mn) || 1;
  const x = i => pad + (L.length > 1 ? i / (L.length - 1) : 0) * (W - pad - 12), y = v => 12 + (1 - (v - mn) / span) * (H - 40);
  const pts = L.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="zipf tab-loss" viewBox="0 0 ${W} ${H}" role="img" aria-label="Eğitim kaybı eğrisi: ${f4(L[0])} değerinden ${f4(L[L.length - 1])} değerine"><rect width="${W}" height="${H}" fill="none"/>
    <line x1="${pad}" y1="${H - 24}" x2="${W - 8}" y2="${H - 24}" stroke="currentColor" opacity=".3"/><line x1="${pad}" y1="8" x2="${pad}" y2="${H - 24}" stroke="currentColor" opacity=".3"/>
    <polyline points="${pts}" fill="none" stroke="var(--spot)" stroke-width="2"/>
    <text x="${pad - 4}" y="16" text-anchor="end" font-size="11" fill="currentColor">${f4(mx)}</text><text x="${pad - 4}" y="${H - 28}" text-anchor="end" font-size="11" fill="currentColor">${f4(mn)}</text>
    <text x="${pad}" y="${H - 8}" font-size="11" fill="currentColor">epoch 1</text><text x="${W - 8}" y="${H - 8}" text-anchor="end" font-size="11" fill="currentColor">${L.length}</text></svg>`;
}
function controlsHTML(){
  const t = T(), c = cfg();
  const chips = Object.entries(TASKS).map(([k, v]) => `<button class="chip" data-task="${k}" aria-pressed="${S.task === k}">${esc(v.title)}</button>`).join("");
  const seg = (name, items, cur) => `<div class="seg" role="group" aria-label="${name}">${items.map(([k, l]) => `<button data-${name === "Optimizer" ? "opt" : "scale"}="${k}" aria-pressed="${cur === k}">${l}</button>`).join("")}</div>`;
  return `<div class="chips">${chips}</div><p class="ck-meta">${esc(t.note)} Özellikler: <code>${t.features.join(", ")}</code>; hedef: <code>${t.target}</code>. <span class="stu">Not defteri: <code>Colab-1/NN-${S.task === "binary" ? "BinaryClassification" : S.task === "multi" ? "MultiClassClassification" : "Regression"}</code>.</span></p>
    <div class="ng-ctl"><label class="muted">Gizli katmanlar <input id="tbHid" class="dp-num" style="width:90px" value="${esc(S.hidden)}" aria-label="Gizli katman boyları"></label>
      ${seg("Optimizer", [["sgd", "SGD"], ["adam", "Adam"]], c.opt)}
      <label class="muted">lr <input id="tbLr" class="dp-num" style="width:84px" type="number" step="0.001" min="0.0001" max="1" value="${c.lr}"></label>
      <label class="muted">epoch <input id="tbEp" class="dp-num" style="width:72px" type="number" min="1" max="500" value="${c.epochs}"></label>
      ${seg("Ölçekleme", [["minmax", "MinMax"], ["standard", "Standard"], ["none", "Yok"]], c.scale)}</div>
    <div class="ng-ctl"><button class="btn pri sm" data-tb="train" ${busy ? "disabled" : ""}>${busy || "Eğit"}</button><button class="btn sm ghost" data-tb="reset">Not defteri ayarlarına dön</button></div>`;
}
function resultHTML(){
  if(err) return `<div class="notice warn">${esc(err)}</div>`;
  if(!model) return `<p class="muted">Eğit düğmesine bas: model tarayıcıda eğitilir (birkaç saniye).</p>`;
  const t = model.task, r = model.test, L = model.losses;
  let h = `<p class="ck-meta">Eğitim ${model.nTrain}, sınama ${model.nTest} örnek (%80 / %20). Mimari <code>${[t.features.length, ...model.hidden, t.out].join("-")}</code>, ${esc(t.lossName)}, ${model.opt === "adam" ? "Adam" : "SGD"} lr = ${model.lr}, ${model.epochs} epoch, ölçekleme: ${model.scale}.</p>
    <div class="fig-box">${lossSVG(L)}</div><p class="verdict" style="font-size:1.05rem">Eğitim kaybı: ${f4(L[0])} → <b>${f4(L[L.length - 1])}</b> ${t.kind === "binary" && L[L.length - 1] > 0.66 ? ' <small class="muted">ln 2 ≈ 0,693: ağ neredeyse hiç öğrenmedi; optimizer ya da lr ile epoch sayısını değiştir</small>' : ""}</p>`;
  if(t.kind === "reg"){
    h += `<p class="verdict" style="font-size:1.1rem">Test MSE = <b>${f4(r.mse)}</b> · RMSE = ${f4(r.rmse)} · R² = <b>${f4(r.r2)}</b></p>
      <div class="ck-scroll"><table class="ng-tbl"><tr><th>#</th><th>Tahmin</th><th>Gerçek</th><th>Fark</th></tr>${r.sample.map((s, i) => `<tr><td>${i + 1}</td><td>${f4(s.pred)}</td><td>${f4(s.actual)}</td><td>${f4(s.pred - s.actual)}</td></tr>`).join("")}</table></div>`;
  }else{
    const names = t.classes, k = r.cm.length;
    h += `<p class="verdict" style="font-size:1.1rem">Test accuracy = <b>${f4(r.accuracy)}</b> · test kaybı = ${f4(r.loss)}</p>
      <div class="ck-scroll"><table class="ng-tbl"><caption>sklearn classification_report</caption><tr><th>Sınıf</th><th>Precision</th><th>Recall</th><th>F1</th><th>Destek</th></tr>${r.perClass.map(c => `<tr><td>${esc(names[c.i] ?? c.i)}</td><td>${f4(c.precision)}</td><td>${f4(c.recall)}</td><td>${f4(c.f1)}</td><td>${c.support}</td></tr>`).join("")}</table></div>
      <div class="ck-scroll"><table class="ng-tbl"><caption>Karışıklık matrisi (satır: sistem çıktısı, sütun: altın veri; Değerlendirme sekmesindeki biçim)</caption><tr><th></th>${Array.from({length:k}, (_, j) => `<th>${esc(names[j] ?? j)}</th>`).join("")}</tr>${r.cm.map((row, i) => `<tr><th>${esc(names[i] ?? i)}</th>${row.map((v, j) => `<td class="${i === j ? "ev-diag" : ""}">${v}</td>`).join("")}</tr>`).join("")}</table></div>`;
  }
  return h;
}
function predHTML(){
  const t = T(), vals = t.features.map((_, i) => S.vals[S.task]?.[i] ?? t.examples[0][i]);
  const inputs = t.features.map((f, i) => `<label class="muted">${f} <input class="dp-num" data-pv="${i}" type="number" step="any" value="${vals[i]}"></label>`).join(" ");
  let out = '<p class="muted">Önce modeli eğit.</p>';
  if(model && model.task === t){
    const p = predict(model, vals.map(Number));
    out = t.kind === "binary" ? `<p class="verdict" style="font-size:1.1rem">Mülakat olasılığı: <b>${f4(p.prob)}</b> → <b>${esc(p.text)}</b></p>`
      : t.kind === "multi" ? `<p class="verdict" style="font-size:1.1rem">Tahmin: <b>${esc(p.text)}</b></p><div class="ck-scroll"><table class="ng-tbl"><tr><th>Sınıf</th><th>Olasılık (softmax)</th></tr>${p.probs.map((q, i) => `<tr><td>${esc(t.classes[i])}</td><td>${f4(q)}</td></tr>`).join("")}</table></div>`
      : `<p class="verdict" style="font-size:1.1rem">Tahmin edilen skor: <b>${f4(p.value)}</b></p>`;
    out += `<p class="ck-meta stu">Ölçeklenmiş girdi: ${model.sc.transform(vals.map(Number)).map(f4).join(", ")} (eğitim kümesinin ${model.scale === "minmax" ? "en küçük / en büyük" : model.scale === "standard" ? "ortalama / sapma" : ""} değerleriyle).</p>`;
  }
  return `<div class="ng-ctl">${inputs}</div><div class="chips">${t.examples.map((e, i) => `<button class="chip" data-ex="${i}">${e.join(", ")}</button>`).join("")}</div>${out}`;
}
function renderAll(){
  $("#tbCtl", root).innerHTML = controlsHTML();
  renderOut();
  $("#tbForm", root).innerHTML = `<p>${esc(FORM[S.task])}</p><pre class="ck-code">${esc(CODE[S.task])}</pre><p class="ck-meta">Ölçekleme, ağırlıkların başlangıç değerleri ve %80 / %20 bölmesinin rastgeleliği PyTorch / sklearn'dekinden farklıdır; bu yüzden sayılar Colab'dakiyle birebir aynı çıkmaz, davranış (kayıp eğrisi, doğruluk düzeyi) aynıdır.</p>`;
}
function renderOut(){ $("#tbRes", root).innerHTML = resultHTML(); $("#tbPred", root).innerHTML = predHTML(); }

async function ensureData(t){
  if(data[t.file]) return data[t.file];
  const r = await fetch("/colab1/" + t.file); if(!r.ok) throw new Error(t.file + " yüklenemedi");
  return data[t.file] = parseCSV(await r.text());
}
async function train(){
  if(busy) return;
  const t = T(), c = cfg(); err = ""; busy = "Veri yükleniyor…"; renderAll();
  try{
    const d = await ensureData(t);
    model = await trainTask(t, d, {hidden:hiddenOf(), opt:c.opt, lr:c.lr, epochs:c.epochs, scale:c.scale, onEpoch:async (e, n, l) => { if(e % 5 === 0 || e === n){ busy = `eğitiliyor ${e} / ${n} · kayıp ${f4(l)}`; $("#tbCtl", root).querySelector('[data-tb="train"]').textContent = busy; await new Promise(r => setTimeout(r, 0)); } }});
  }catch(e){ err = String(e.message || e); model = null; }
  busy = ""; renderAll();
}

function mount(){
  root = $("#v-tab"); if(!root) return;
  load();
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Tablo verisi <small>Colab-1</small></h1>
    <p class="lesson-intro" style="margin:0">Tablo biçimindeki veride (GPA, deneyim; uyku, çalışma saati...) küçük bir yapay sinir ağı eğit: ikili sınıflandırma, çok sınıflı sınıflandırma ve regresyon. Colab not defterleriyle aynı veri ve ayarlarla çalışır; optimizer, öğrenme oranı ve ölçeklemeyi değiştirip kayıp eğrisine etkisini izle.</p>
    <h2 class="ng-h">1 · Görev ve ayarlar</h2><div id="tbCtl"></div>
    <h2 class="ng-h">2 · Sonuç</h2><div id="tbRes"></div>
    <h2 class="ng-h">3 · Yeni örnek için tahmin</h2><div id="tbPred"></div>
    <h2 class="ng-h stu">4 · PyTorch karşılığı ve formül</h2><div class="stu" id="tbForm"></div>
    <div style="height:56px"></div></div>`;
  renderAll();
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-task],[data-opt],[data-scale],[data-tb],[data-ex]"); if(!b) return; const d = b.dataset;
    if(d.task){ S.task = d.task; S.opt = S.lr = S.epochs = S.scale = null; model = null; err = ""; save(); renderAll(); }
    else if(d.opt){ S.opt = d.opt; $("#tbCtl", root).innerHTML = controlsHTML(); }
    else if(d.scale){ S.scale = d.scale; $("#tbCtl", root).innerHTML = controlsHTML(); }
    else if(d.tb === "train") train();
    else if(d.tb === "reset"){ S.opt = S.lr = S.epochs = S.scale = null; S.hidden = "16, 8"; renderAll(); }
    else if(d.ex !== undefined){ S.vals[S.task] = [...T().examples[+d.ex]]; $("#tbPred", root).innerHTML = predHTML(); }
  });
  root.addEventListener("input", e => {
    const t = e.target;
    if(t.id === "tbHid"){ S.hidden = t.value; save(); }
    else if(t.id === "tbLr") S.lr = Math.max(0.0001, parseFloat(t.value) || 0.01);
    else if(t.id === "tbEp") S.epochs = Math.max(1, Math.min(500, parseInt(t.value, 10) || 40));
    else if(t.dataset.pv !== undefined){ const v = S.vals[S.task] ||= [...T().examples[0]]; v[+t.dataset.pv] = t.value; const el = $("#tbPred", root); const pos = t.dataset.pv; el.innerHTML = predHTML(); el.querySelector(`[data-pv="${pos}"]`)?.focus(); }
  });
}
const view = {apply(){}, enter(){ if(!root) mount(); }};
registerView("tab", view);
mount();
