// Sınıflandırma değerlendirmesi (geçmiş vizelerde sık çıkan): karışıklık matrisi, TP / FP / FN / TN, precision, recall, F1, accuracy,
// macro / weighted / micro ortalama ve Cohen'in kappası (inter-annotator agreement). Saf JS, DOM yok.
// Matris biçimi vize kâğıtlarındaki gibi: cm[i][j] = sistemin i dediği, altın etiketi j olan örnek sayısı (satır = sistem çıktısı, sütun = altın veri).
// IAA için aynı matris: satır = 1. anotatör, sütun = 2. anotatör.

const sum = a => a.reduce((x, y) => x + y, 0);
// satır ve sütunu değiştirir (2025 kâğıdında satır = altın veri, 2021 ve 2022'de satır = sistem çıktısı)
export const transpose = cm => cm.map((_, j) => cm.map(r => r[j]));
const div = (a, b) => b ? a / b : 0;

export function totals(cm){
  const n = cm.length, row = cm.map(sum), col = Array.from({length:n}, (_, j) => sum(cm.map(r => r[j])));
  return {n, row, col, N:sum(row), diag:sum(cm.map((r, i) => r[i]))};
}
// sınıf başına sayılar ve ölçütler
export function perClass(cm){
  const {n, row, col, N} = totals(cm);
  return Array.from({length:n}, (_, i) => {
    const TP = cm[i][i], FP = row[i] - TP, FN = col[i] - TP, TN = N - TP - FP - FN;
    const precision = div(TP, TP + FP), recall = div(TP, TP + FN), f1 = div(2 * precision * recall, precision + recall);
    return {i, TP, FP, FN, TN, support:col[i], predicted:row[i], precision, recall, f1};
  });
}
export const accuracy = cm => { const t = totals(cm); return div(t.diag, t.N); };
// macro: sınıfların düz ortalaması; weighted: örnek sayısıyla ağırlıklı; micro: tüm TP / FP / FN birlikte (tek etiketli veride accuracy'ye eşit)
export function averages(cm){
  const pc = perClass(cm), N = sum(pc.map(c => c.support)), n = pc.length;
  const macro = k => sum(pc.map(c => c[k])) / n, weighted = k => div(sum(pc.map(c => c.support * c[k])), N);
  const TP = sum(pc.map(c => c.TP)), FP = sum(pc.map(c => c.FP)), FN = sum(pc.map(c => c.FN));
  const mp = div(TP, TP + FP), mr = div(TP, TP + FN);
  return {macro:{precision:macro("precision"), recall:macro("recall"), f1:macro("f1")}, weighted:{precision:weighted("precision"), recall:weighted("recall"), f1:weighted("f1")}, micro:{precision:mp, recall:mr, f1:div(2 * mp * mr, mp + mr)}};
}
// sınıf başına F1 ve örnek sayısı verilmişken macro ve weighted F1 (vize 2025, 4B)
export function macroWeighted(rows){
  const N = sum(rows.map(r => r.n)), macro = sum(rows.map(r => r.f1)) / rows.length, weighted = div(sum(rows.map(r => r.n * r.f1)), N);
  return {macro, weighted, N, weights:rows.map(r => div(r.n, N))};
}
// Cohen'in kappası: (gözlenen − şans) / (1 − şans)
export function kappa(cm){
  const {n, row, col, N, diag} = totals(cm), po = div(diag, N);
  const parts = Array.from({length:n}, (_, i) => ({a:div(row[i], N), b:div(col[i], N)}));
  const pe = sum(parts.map(p => p.a * p.b));
  return {po, pe, kappa:div(po - pe, 1 - pe), parts, N, diag};
}
// "altın,sistem" satırlarından matris kur. Satır başına bir çift; ayraç virgül, sekme ya da noktalı virgül; boş ve # ile başlayan satırlar atlanır.
export function fromPairs(text, order = null){
  const pairs = [];
  for(const raw of String(text).split(/\n/)){
    const l = raw.trim(); if(!l || l[0] === "#") continue;
    const p = l.split(/[,\t;]/).map(x => x.trim());
    if(p.length >= 2 && p[0] && p[1]) pairs.push([p[0], p[1]]);
  }
  const labels = order ? order.slice() : [];
  for(const [g, s] of pairs) for(const x of [g, s]) if(!labels.includes(x)) labels.push(x);
  const idx = new Map(labels.map((l, i) => [l, i])), cm = labels.map(() => labels.map(() => 0));
  for(const [g, s] of pairs) cm[idx.get(s)][idx.get(g)]++;
  return {labels, cm, N:pairs.length};
}
// vize kâğıtlarından hazır örnekler
export const PRESETS = {
  pos2021:{title:"2021 · POS (isim, sıfat, fiil)", labels:["noun", "adjective", "verb"], cm:[[25, 5, 5], [10, 15, 5], [10, 10, 15]], note:"Sınıf \"adjective\": TP = 15, FP = 15, TN = 55, FN = 15. \"verb\" precision = 15/35, \"noun\" recall = 25/45."},
  sentiment2022:{title:"2022 · Duygu (5 sınıf, 180 tweet)", labels:["SNeg", "Neg", "Neut", "Pos", "SPos"], cm:[[12, 6, 8, 6, 6], [6, 12, 4, 10, 14], [8, 10, 12, 2, 4], [10, 4, 4, 6, 6], [8, 6, 4, 6, 6]], note:"Sınıf \"Neut\": precision = 12/36, recall = 12/32; accuracy = 48/180."},
  politics2025:{title:"2025 · Siyasetçiler (liste)", labels:["left", "right", "center"], pairs:`# altın, sistem
left,left
left,left
center,right
left,right
right,right
center,right
right,right
right,center
left,center
left,left
center,center
right,right
right,center
right,center
center,left
center,center
right,left`, note:"Sınıf \"center\": precision = 2/6, recall = 2/5, F1 = 4/11; accuracy = 8/17."}
};
PRESETS.politics2025.cm = fromPairs(PRESETS.politics2025.pairs, PRESETS.politics2025.labels).cm;
export const IAA = {
  ab2021:{title:"2021 · A ve B", labels:["positive", "negative"], cm:[[40, 10], [10, 40]], note:"κ = (0,8 − 0,5) / (1 − 0,5) = 0,6"},
  ac2021:{title:"2021 · A ve C", labels:["positive", "negative"], cm:[[20, 20], [20, 40]], note:"κ = (0,6 − 0,52) / (1 − 0,52) ≈ 0,167"}
};
// alıştırma için tohumlu rastgele matris (n sınıf, her hücre 0..hi)
export function randomMatrix(n, seed, hi = 20){
  let a = seed | 0;
  const rnd = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return Array.from({length:n}, (_, i) => Array.from({length:n}, (_, j) => Math.floor(rnd() * (i === j ? hi : hi / 2)) + (i === j ? 4 : 0)));
}
