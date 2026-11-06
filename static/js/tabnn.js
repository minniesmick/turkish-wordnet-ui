// Tablo verisi üzerinde sinir ağı (Colab-1 not defterlerinin tarayıcı karşılığı): ikili sınıflandırma, çok sınıflı sınıflandırma, regresyon.
// Her not defteri aynı kalıbı izler: CSV oku → özellikleri ölçekle → %80 / %20 böl → MLP (2-16-8-çıktı) → kayıp + optimizer → tam toplu eğitim (her epoch bir adım) → değerlendir.
// Saf JS, DOM yok. Ağ, kayıp ve optimizer nn.js'ten gelir. PyTorch'la birebir aynı sayılar çıkmaz (başlatma ve bölme rastgeleliği farklı); kalıp ve davranış aynıdır.
import {buildNetwork, forward, backward, updateWeights, mat, lossOf, mulberry32} from "./nn.js";
import {perClass, accuracy} from "./evalm.js";

export function parseCSV(text){
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim());
  const cols = lines[0].split(",").map(s => s.trim());
  const rows = lines.slice(1).map(l => l.split(",").map(Number));
  return {cols, rows: rows.filter(r => r.length === cols.length && r.every(Number.isFinite))};
}
// sklearn MinMaxScaler ve StandardScaler (ddof = 0) karşılıkları
export function fitScaler(kind, X){
  const d = X[0].length, lo = Array(d).fill(Infinity), hi = Array(d).fill(-Infinity), mean = Array(d).fill(0), sd = Array(d).fill(0);
  for(const r of X) for(let j = 0; j < d; j++){ lo[j] = Math.min(lo[j], r[j]); hi[j] = Math.max(hi[j], r[j]); mean[j] += r[j] / X.length; }
  for(const r of X) for(let j = 0; j < d; j++) sd[j] += (r[j] - mean[j]) ** 2 / X.length;
  for(let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1;
  const f = kind === "minmax" ? r => r.map((v, j) => (v - lo[j]) / ((hi[j] - lo[j]) || 1)) : kind === "standard" ? r => r.map((v, j) => (v - mean[j]) / sd[j]) : r => r.slice();
  return {kind, lo, hi, mean, sd, transform:f};
}
export function splitIdx(n, testFrac = 0.2, seed = 42){
  const idx = Array.from({length:n}, (_, i) => i), rnd = mulberry32(seed);
  for(let i = n - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const nt = Math.round(n * testFrac);
  return {test:idx.slice(0, nt), train:idx.slice(nt)};
}

// ───────────────────────── üç görev (not defterlerindeki ayarlar varsayılan)
export const TASKS = {
  binary:{title:"İkili sınıflandırma", file:"applicants_binary.csv", features:["gpa", "experience"], target:"label", kind:"binary", out:1, outAct:"sigmoid", loss:"bce", lossName:"BCELoss", scale:"minmax", opt:"sgd", lr:0.01, epochs:40,
    note:"GPA ve deneyim (ay) → mülakata çağır (1) ya da reddet (0).", classes:["REJECT", "CALL FOR INTERVIEW"], examples:[[3.7, 48], [1.5, 5], [2.5, 30]]},
  multi:{title:"Çok sınıflı sınıflandırma", file:"sentiment_data.csv", features:["sleep_hours", "work_hours", "households", "age"], target:"label", kind:"multi", out:3, outAct:"softmax", loss:"ce", lossName:"CrossEntropyLoss", scale:"standard", opt:"adam", lr:0.01, epochs:100,
    note:"Uyku, çalışma saati, hane halkı, yaş → mutlu değil (0), nötr (1), mutlu (2).", classes:["not happy", "neutral", "happy"], examples:[[8, 5, 2, 30], [4, 12, 1, 50], [10, 2, 1, 20]]},
  regression:{title:"Regresyon", file:"applicants_regression.csv", features:["gpa", "experience"], target:"success_score", kind:"reg", out:1, outAct:"linear", loss:"mse", lossName:"MSELoss", scale:"standard", opt:"adam", lr:0.01, epochs:100,
    note:"GPA ve deneyim → başarı skoru (0 ile 1 arası, gürültülü).", classes:null, examples:[[3.5, 24], [2.0, 5]]}
};

const targetVec = (task, y) => task.kind === "multi" ? Array.from({length:task.out}, (_, k) => k === y ? 1 : 0) : [y];
// hidden: gizli katman boyları (varsayılan [16, 8], ReLU)
export async function trainTask(task, data, {hidden = [16, 8], opt = task.opt, lr = task.lr, epochs = task.epochs, scale = task.scale, seed = 42, onEpoch = null} = {}){
  const fi = task.features.map(f => data.cols.indexOf(f)), ti = data.cols.indexOf(task.target);
  const X = data.rows.map(r => fi.map(i => r[i])), y = data.rows.map(r => r[ti]);
  const sp = splitIdx(X.length, 0.2, seed);
  // ölçekleyici yalnızca eğitim kümesine uydurulur (Regresyon ve çok sınıflı not defterleri böyle; ikili not defteri tüm veriye uydurur, bu küçük bir veri sızıntısıdır)
  const sc = fitScaler(scale, sp.train.map(i => X[i]));
  const Xtr = sp.train.map(i => sc.transform(X[i])), ytr = sp.train.map(i => y[i]), Xte = sp.test.map(i => sc.transform(X[i])), yte = sp.test.map(i => y[i]);
  const layers = [{size:X[0].length}, ...hidden.map(h => ({size:h, act:"relu"})), {size:task.out, act:task.outAct}];
  const net = buildNetwork(layers, seed), state = {}, optCfg = {type:opt, lr}, losses = [];
  for(let e = 0; e < epochs; e++){
    const grads = net.map(l => ({dW:mat(l.inSize, l.outSize), db:new Float64Array(l.outSize)}));
    let L = 0;
    for(let n = 0; n < Xtr.length; n++){
      const {activations, zs} = forward(net, Xtr[n]), t = targetVec(task, ytr[n]), p = [...activations[activations.length - 1]];
      L += lossOf(task.loss, p, t);
      const g = backward(net, activations, zs, t, task.loss);
      for(let l = 0; l < net.length; l++){ for(let i = 0; i < g[l].dW.data.length; i++) grads[l].dW.data[i] += g[l].dW.data[i]; for(let j = 0; j < g[l].db.length; j++) grads[l].db[j] += g[l].db[j]; }
    }
    updateWeights(net, grads, optCfg, state, Xtr.length);
    losses.push(L / Xtr.length);
    if(onEpoch) await onEpoch(e + 1, epochs, losses[e]);
  }
  const model = {task, net, sc, losses, hidden, opt, lr, epochs, scale, seed, nTrain:Xtr.length, nTest:Xte.length};
  model.test = evaluate(model, Xte, yte);
  return model;
}
const run = (model, xs) => { const o = forward(model.net, xs).activations; return [...o[o.length - 1]]; };
// ölçeklenmiş girdi vektörü için çıktı
export function predictRaw(model, raw){ return run(model, model.sc.transform(raw)); }
export function predict(model, raw){
  const t = model.task, o = predictRaw(model, raw);
  if(t.kind === "binary") return {prob:o[0], label:o[0] > 0.5 ? 1 : 0, text:t.classes[o[0] > 0.5 ? 1 : 0]};
  if(t.kind === "multi"){ const k = o.indexOf(Math.max(...o)); return {probs:o, label:k, text:t.classes[k]}; }
  return {value:o[0]};
}
function evaluate(model, Xte, yte){
  const t = model.task, outs = Xte.map(x => run(model, x));
  if(t.kind === "reg"){
    const mean = yte.reduce((a, b) => a + b, 0) / yte.length;
    const mse = outs.reduce((a, o, i) => a + (o[0] - yte[i]) ** 2, 0) / yte.length, sst = yte.reduce((a, v) => a + (v - mean) ** 2, 0) / yte.length;
    return {mse, rmse:Math.sqrt(mse), r2:1 - mse / sst, sample:outs.slice(0, 5).map((o, i) => ({pred:o[0], actual:yte[i]}))};
  }
  const k = t.out === 1 ? 2 : t.out, cm = Array.from({length:k}, () => Array(k).fill(0));      // cm[sistem][altın], evalm.js ile aynı
  outs.forEach((o, i) => { const p = t.kind === "binary" ? (o[0] > 0.5 ? 1 : 0) : o.indexOf(Math.max(...o)); cm[p][yte[i]]++; });
  return {cm, accuracy:accuracy(cm), perClass:perClass(cm), loss:outs.reduce((a, o, i) => a + lossOf(t.loss, o, targetVec(t, yte[i])), 0) / yte.length};
}
