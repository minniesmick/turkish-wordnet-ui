// Değerlendirme çekirdeği denetimi: node scripts/test_evalm.mjs
// Beklenen değerler geçmiş vize cevap kâğıtlarından (COMP 451, Güz 2021, 2022, 2025).
import {transpose, totals, perClass, accuracy, averages, macroWeighted, kappa, fromPairs, PRESETS, IAA, randomMatrix} from "../static/js/evalm.js";
let bad = 0, total = 0;
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const check = (name, got, want) => { total++; const ok = typeof want === "number" ? near(got, want) : JSON.stringify(got) === JSON.stringify(want); if(!ok){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };

// 2021: POS, "adjective" için TP 15, FP 15, TN 55, FN 15; verb precision 15/35; noun recall 25/45
{
  const pc = perClass(PRESETS.pos2021.cm);
  check("2021 adjective TP", pc[1].TP, 15); check("2021 adjective FP", pc[1].FP, 15); check("2021 adjective TN", pc[1].TN, 55); check("2021 adjective FN", pc[1].FN, 15);
  check("2021 verb precision", pc[2].precision, 15 / 35); check("2021 noun recall", pc[0].recall, 25 / 45);
  check("2021 toplam", totals(PRESETS.pos2021.cm).N, 100);
}
// 2022: Neut precision 12/36, recall 12/32, accuracy 48/180
{
  const cm = PRESETS.sentiment2022.cm, pc = perClass(cm), neut = pc[2];
  check("2022 Neut precision", neut.precision, 12 / 36); check("2022 Neut recall", neut.recall, 12 / 32);
  check("2022 Neut F1", neut.f1, 2 * (12 / 36) * (12 / 32) / (12 / 36 + 12 / 32));
  check("2022 accuracy", accuracy(cm), 48 / 180); check("2022 N", totals(cm).N, 180);
  check("2022 micro F1 = accuracy", averages(cm).micro.f1, 48 / 180);
}
// 2025 A: siyasetçiler, center precision 2/6, recall 2/5, F1 4/11, accuracy 8/17
{
  const p = PRESETS.politics2025, {cm, labels, N} = fromPairs(p.pairs, p.labels), c = perClass(cm)[2];
  check("2025 N", N, 17); check("2025 etiketler", labels, ["left", "right", "center"]);
  check("2025 center precision", c.precision, 2 / 6); check("2025 center recall", c.recall, 2 / 5); check("2025 center F1", c.f1, 4 / 11);
  check("2025 accuracy", accuracy(cm), 8 / 17);
  // cevap kâğıdındaki tablo satır = altın veri olarak yazılmış: bizim matrisin devriği olmalı
  check("2025 matris (kâğıt biçimi: satır = altın)", transpose(cm), [[3, 1, 1], [1, 3, 3], [1, 2, 2]]);
}
// 2025 B: macro F1 = 0.356 (ortalama 0.35667), weighted F1 = 0.3825
{
  const r = macroWeighted([{f1:0.46, n:20}, {f1:0.48, n:10}, {f1:0.13, n:10}]);
  check("2025 macro F1", r.macro, (0.46 + 0.48 + 0.13) / 3); check("2025 weighted F1", r.weighted, 0.5 * 0.46 + 0.25 * 0.48 + 0.25 * 0.13); check("2025 ağırlıklar", r.weights, [0.5, 0.25, 0.25]);
}
// 2021 IAA: A&B = 0.6, A&C = 0.1667
{
  const ab = kappa(IAA.ab2021.cm), ac = kappa(IAA.ac2021.cm);
  check("IAA A&B gözlenen", ab.po, 0.8); check("IAA A&B şans", ab.pe, 0.5); check("IAA A&B kappa", ab.kappa, 0.6);
  check("IAA A&C gözlenen", ac.po, 0.6); check("IAA A&C şans", ac.pe, 0.52); check("IAA A&C kappa", ac.kappa, 0.08 / 0.48);
  check("A&B, A&C'den yüksek", ab.kappa > ac.kappa, true);
}
// genel özellikler
{
  const cm = [[5, 1], [2, 8]], pc = perClass(cm);
  check("TP+FP+FN+TN = N", pc.every(c => c.TP + c.FP + c.FN + c.TN === 16), true);
  check("macro precision", averages(cm).macro.precision, (5 / 6 + 8 / 10) / 2);
  check("weighted recall = accuracy", averages(cm).weighted.recall, accuracy(cm));
  check("boş sınıf bölme hatası vermez", perClass([[0, 0], [0, 3]])[0].f1, 0);
  check("mükemmel sınıflayıcı kappa 1", kappa([[4, 0], [0, 6]]).kappa, 1);
  check("rastgele matris deterministik", JSON.stringify(randomMatrix(3, 7)) === JSON.stringify(randomMatrix(3, 7)), true);
}
console.log("değerlendirme denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
