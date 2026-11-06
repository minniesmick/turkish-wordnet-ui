// Tablo verisi sinir ağı denetimi: node scripts/test_tabnn.mjs
import fs from "node:fs";
import {parseCSV, fitScaler, splitIdx, TASKS, trainTask, predict} from "../static/js/tabnn.js";
import {buildNetwork, forward, backward, numericalGrad, gradRelError} from "../static/js/nn.js";
let bad = 0, total = 0;
const check = (name, got, want) => { total++; const ok = typeof want === "number" ? Math.abs(got - want) < 1e-9 : JSON.stringify(got) === JSON.stringify(want); if(!ok){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };
const csv = f => parseCSV(fs.readFileSync(new URL("../static/colab1/" + f, import.meta.url), "utf8"));

// CSV
const B = csv(TASKS.binary.file), M = csv(TASKS.multi.file), R = csv(TASKS.regression.file);
check("ikili: satır sayısı ve sütunlar", [B.rows.length, B.cols], [1000, ["gpa", "experience", "label"]]);
check("çok sınıflı: satır sayısı", M.rows.length, 2000);
check("regresyon: satır sayısı ve hedef", [R.rows.length, R.cols[2]], [1000, "success_score"]);
check("ikili: etiketler yalnızca 0 ve 1", B.rows.every(r => r[2] === 0 || r[2] === 1), true);
check("çok sınıflı: etiketler 0, 1, 2", M.rows.every(r => [0, 1, 2].includes(r[4])), true);
// ölçekleyiciler (sklearn ile aynı tanım)
{
  const X = [[1, 10], [2, 20], [3, 30], [4, 40]], mm = fitScaler("minmax", X), st = fitScaler("standard", X);
  check("MinMax: en küçük 0, en büyük 1", [mm.transform([1, 10]), mm.transform([4, 40])], [[0, 0], [1, 1]]);
  const Z = X.map(r => st.transform(r)), mean = Z.reduce((a, r) => a + r[0], 0) / 4, sd = Math.sqrt(Z.reduce((a, r) => a + (r[0] - mean) ** 2, 0) / 4);
  check("Standard: ortalama 0", mean, 0); check("Standard: standart sapma 1 (ddof = 0)", sd, 1);
}
// bölme: kesişmez, toplam tam, deterministik
{
  const s = splitIdx(1000, 0.2, 42), all = new Set([...s.train, ...s.test]);
  check("bölme: 800 / 200", [s.train.length, s.test.length], [800, 200]); check("bölme: kesişim yok", all.size, 1000);
  check("bölme: deterministik", JSON.stringify(splitIdx(1000, 0.2, 42)) === JSON.stringify(s), true);
}
// BCE + sigmoid gradyanı sayısal gradyanla uyuşur
{
  const net = buildNetwork([{size:2}, {size:5, act:"relu"}, {size:1, act:"sigmoid"}], 3), x = [0.4, -0.7], t = [1];
  const {activations, zs} = forward(net, x), a = backward(net, activations, zs, t, "bce"), n = numericalGrad(net, x, t, "bce");
  check("BCE: analitik ve sayısal gradyan uyuşuyor (göreli hata < 1e-5)", gradRelError(a, n) < 1e-5, true);
}
// eğitim: not defterlerinin varsayılan ayarları
{
  const b = await trainTask(TASKS.binary, B);
  check("ikili: SGD, lr 0,01, 40 epoch kayıp neredeyse hiç düşmez (ln 2 civarı)", b.losses[0] - b.losses[b.losses.length - 1] < 0.02 && b.losses[39] > 0.66, true);
  const ba = await trainTask(TASKS.binary, B, {opt:"adam"});
  check("ikili: Adam aynı veride öğrenir (accuracy > 0,75)", ba.test.accuracy > 0.75, true);
  check("ikili: kayıp Adam'da düşer", ba.losses[39] < ba.losses[0] - 0.15, true);
  check("ikili: örnek tahmin olasılığı 0 ile 1 arası", (p => p.prob > 0 && p.prob < 1)(predict(ba, [3.7, 48])), true);
  check("ikili: yüksek GPA ve deneyim, düşük GPA ve deneyimden olasılıkça yüksek", predict(ba, [3.9, 58]).prob > predict(ba, [0.3, 3]).prob, true);
  const m = await trainTask(TASKS.multi, M);
  check("çok sınıflı: accuracy > 0,85", m.test.accuracy > 0.85, true);
  check("çok sınıflı: softmax olasılıkları 1 eder", Math.abs(predict(m, [8, 5, 2, 30]).probs.reduce((x, y) => x + y, 0) - 1) < 1e-9, true);
  check("çok sınıflı: karışıklık matrisi 400 örnek", m.test.cm.flat().reduce((x, y) => x + y, 0), 400);
  check("çok sınıflı: az uyuyup çok çalışan 'not happy', çok uyuyup az çalışan 'happy'", [predict(m, [4, 12, 1, 50]).label, predict(m, [10, 0, 5, 69]).label], [0, 2]);
  const r = await trainTask(TASKS.regression, R);
  check("regresyon: test R² > 0,9", r.test.r2 > 0.9, true); check("regresyon: RMSE < 0,08", r.test.rmse < 0.08, true);
  check("regresyon: yüksek GPA, düşük GPA'dan yüksek skor verir", predict(r, [3.8, 30]).value > predict(r, [0.5, 30]).value, true);
  check("eğitim deterministik", (await trainTask(TASKS.regression, R, {epochs:10})).losses[9], (await trainTask(TASKS.regression, R, {epochs:10})).losses[9]);
}
console.log("tablo verisi sinir ağı denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
