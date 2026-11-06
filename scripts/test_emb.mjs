// test_emb.mjs: node scripts/test_emb.mjs
import {
  mulberry32, tokenize, buildVocab, cosine,
  initEmbeddings, skipGramStep, buildPairs, buildNegSampler,
  createTrainer, nearest, analogy, pca2d, numericalGradCheck
} from "../static/js/emb.js";

let failures = 0;
function check(label, cond, detail = "") {
  if (!cond) { console.error(`✗ ${label}${detail ? " — " + detail : ""}`); failures++; }
  else console.log(`✓ ${label}`);
}
function near(a, b, eps = 1e-6, label = "") {
  check(label || `${a.toFixed(6)} ≈ ${b.toFixed(6)}`, Math.abs(a - b) < eps, `diff=${Math.abs(a-b)}`);
}

// ─── 1. Kosinüs özellikleri
console.log("\n── 1. Kosinüs özellikleri ──");
const v1 = [1, 0, 0], v2 = [0, 1, 0], v3 = [1, 0, 0];
near(cosine(v1, v3), 1, 1e-10, "kendisiyle kosinüs=1");
near(cosine(v1, v2), 0, 1e-10, "dik vektörler kosinüs=0");
check("kosinüs [-1,1] aralığında", cosine([1,2],[-3,1]) >= -1 && cosine([1,2],[-3,1]) <= 1);
// Simetri
const a = [0.3, -0.5, 0.8], b = [0.1, 0.9, -0.2];
check("kosinüs simetrik", Math.abs(cosine(a, b) - cosine(b, a)) < 1e-12);
// Sıfır vektör
near(cosine([0,0,0],[1,2,3]), 0, 1e-10, "sıfır vektör kosinüs=0");

// ─── 2. Tokenize ve sözlük
console.log("\n── 2. Tokenize ve sözlük ──");
const tokens = tokenize("kedi köpek kedi araba kedi köpek");
check("tokenize: 6 token", tokens.length === 6);
check("tokenize: küçük harf", tokens.every(t => t === t.toLocaleLowerCase("tr")));
const { vocab, ivocab, freq } = buildVocab(tokens, 100);
check("vocab: 3 benzersiz", vocab.size === 3);
check("kedi en sık", freq.get("kedi") === 3);

// ─── 3. Embedding başlatma — deterministik
console.log("\n── 3. Determinizm ──");
const { W: W1, C: C1 } = initEmbeddings(10, 4, 42);
const { W: W2, C: C2 } = initEmbeddings(10, 4, 42);
check("aynı tohum = aynı W", W1.every((v,i) => v === W2[i]));
check("aynı tohum = aynı C", C1.every((v,i) => v === C2[i]));
const { W: W3 } = initEmbeddings(10, 4, 99);
check("farklı tohum = farklı W", !W1.every((v,i) => v === W3[i]));

// ─── 4. Sayısal gradyan denetimi
console.log("\n── 4. Sayısal gradyan denetimi ──");
const rng = mulberry32(7);
const Wg = new Float64Array(5*4).map(() => rng()-0.5);
const Cg = new Float64Array(5*4).map(() => (rng()-0.5)*0.1);
const gradResults = numericalGradCheck(Wg, Cg, 0, 2, [1, 3], 4, 1e-5);
check("Sayısal gradyan denetimi: tüm boyutlarda göreli hata < 1e-4",
  gradResults.every(r => r.relErr < 1e-4),
  gradResults.map(r => `d=${r.d}: relErr=${r.relErr.toExponential(3)}`).join(", "));

// ─── 5. Küçük korpus eğitimi — benzer bağlam sözcükleri yakın olmalı
console.log("\n── 5. Küçük korpus eğitim testi ──");
// kedi ve köpek aynı bağlamlarda (güzel, iyi, hızlı), araba farklı
const corpus = "kedi güzel iyi kedi güzel hızlı köpek iyi güzel köpek hızlı güzel kedi iyi köpek güzel ".repeat(20)
  + "araba hız motor araba motor hız araba fren motor ".repeat(20);
const toks = tokenize(corpus);
const { vocab: voc, ivocab: iv, freq: fr } = buildVocab(toks, 50);
const trainer = createTrainer({ tokens: toks, vocab: voc, ivocab: iv, freq: fr, dim: 8, window: 2, negK: 3, lr: 0.05, seed: 1 });
// 5 epoch eğit
for (let ep = 0; ep < 5; ep++) {
  let done = false;
  while (!done) {
    const r = trainer.step(32);
    if (r.epochDone) done = true;
  }
}
const { W: Wt, dim: Dt, vocabSize: Vt } = trainer.getAll();
const iKedi = voc.get("kedi"), iKopek = voc.get("köpek"), iAraba = voc.get("araba");
if (iKedi !== undefined && iKopek !== undefined && iAraba !== undefined) {
  const simKK = cosine(Array.from(Wt.slice(iKedi*Dt, iKedi*Dt+Dt)), Array.from(Wt.slice(iKopek*Dt, iKopek*Dt+Dt)));
  const simKA = cosine(Array.from(Wt.slice(iKedi*Dt, iKedi*Dt+Dt)), Array.from(Wt.slice(iAraba*Dt, iAraba*Dt+Dt)));
  check(`kedi-köpek benzerliği (${simKK.toFixed(3)}) > kedi-araba (${simKA.toFixed(3)})`, simKK > simKA,
    `kedi-köpek=${simKK.toFixed(3)}, kedi-araba=${simKA.toFixed(3)}`);
} else {
  check("Sözlükte kedi/köpek/araba var", false, "sözcükler sözlükte yok");
}

// ─── 6. PCA deterministik ve yönden bağımsız
console.log("\n── 6. PCA deterministik ──");
const { W: Wp, dim: Dp, vocabSize: Vp } = trainer.getAll();
const pts1 = pca2d(Wp, Dp, Vp, 0);
const pts2 = pca2d(Wp, Dp, Vp, 0);
check("PCA deterministik", pts1.every((p, i) => Math.abs(p[0] - pts2[i][0]) < 1e-10 && Math.abs(p[1] - pts2[i][1]) < 1e-10));
check("PCA boyut", pts1.length === Vp && pts1[0].length === 2);

// ─── 7. En yakın komşu
console.log("\n── 7. En yakın komşu ──");
const { W: Wn, dim: Dn, vocabSize: Vn } = trainer.getAll();
if (iKedi !== undefined) {
  const neighbors = nearest(iKedi, Wn, Dn, Vn, 3);
  check("nearest: 3 sonuç döner", neighbors.length === 3);
  check("nearest: kendisi dahil değil", neighbors.every(([j]) => j !== iKedi));
  check("nearest: azalan kosinüs", neighbors[0][1] >= neighbors[1][1]);
}

// ─── 8. Boş / kenar durumlar
console.log("\n── 8. Kenar durumlar ──");
check("boş metin tokenize", tokenize("").length === 0);
const { vocab: v1tok, ivocab: iv1 } = buildVocab([], 100);
check("boş token listesi vocab", v1tok.size === 0);
// Tek sözcük
const singleTok = tokenize("merhaba");
const { vocab: sv, ivocab: siv } = buildVocab(singleTok);
check("tek sözcük vocab", sv.size === 1);
// PCA boş
const emptyPts = pca2d(new Float64Array(0), 4, 0, 0);
check("PCA boş vocab", emptyPts.length === 0);

// ─── Özet
console.log(`\n${"─".repeat(40)}`);
if (failures === 0) console.log("Tüm embedding testleri geçti ✓");
else { console.error(`${failures} test başarısız`); process.exitCode = 1; }

