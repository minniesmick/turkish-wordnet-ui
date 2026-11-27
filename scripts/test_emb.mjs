// test_emb.mjs: node scripts/test_emb.mjs
import {
  mulberry32, tokenize, buildVocab, cosine,
  initEmbeddings, skipGramStep, buildPairs, buildNegSampler,
  createTrainer, nearest, analogy, pca2d, numericalGradCheck, cbowStep, buildCbowExamples
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

// ─── 4b. CBOW: sayısal gradyan ve örnek üretimi
console.log("\n── 4b. CBOW ──");
{
  const V = 6, dim = 4, r = mulberry32(11), W0 = new Float64Array(V * dim).map(() => r() - 0.5), C0 = new Float64Array(V * dim).map(() => r() - 0.5);
  const ctx = [0, 1, 3], center = 2, negs = [4, 5];
  const loss = (W, C) => cbowStep(W.slice(), C.slice(), ctx, center, negs, dim, 0);
  const lr = 1e-3, W1 = W0.slice(), C1 = C0.slice();
  cbowStep(W1, C1, ctx, center, negs, dim, lr);
  let worst = 0;
  for (const [M0, M1, isW] of [[W0, W1, true], [C0, C1, false]]) {
    for (let i = 0; i < M0.length; i++) {
      const analytic = (M0[i] - M1[i]) / lr;
      const plus = M0.slice(), minus = M0.slice(); plus[i] += 1e-5; minus[i] -= 1e-5;
      const numeric = (loss(isW ? plus : W0, isW ? C0 : plus) - loss(isW ? minus : W0, isW ? C0 : minus)) / 2e-5;
      worst = Math.max(worst, Math.abs(analytic - numeric));
    }
  }
  check("CBOW sayısal gradyan (tüm W ve C)", worst < 1e-6, `en büyük fark=${worst.toExponential(2)}`);
  const ex = buildCbowExamples([7, 8, 9], 1);
  check("CBOW örnekleri: bağlam → merkez", JSON.stringify(ex) === JSON.stringify([[[8], 7], [[7, 9], 8], [[8], 9]]));
  check("CBOW bağlamsız tek sözcük örnek vermez", buildCbowExamples([1], 2).length === 0);
}

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

// ─── 9. CBOW eğitimi: oyuncak metinde kayıp düşer, aynı bağlamdaki sözcükler yaklaşır
console.log("\n── 9. CBOW eğitimi ──");
{
  const toks = tokenize("kedi süt içer. köpek süt içer. araba yolda gider. tren rayda gider. ".repeat(30));
  const v = buildVocab(toks);
  const t = createTrainer({ tokens: toks, vocab: v.vocab, ivocab: v.ivocab, freq: v.freq, dim: 8, window: 2, negK: 3, lr: 0.05, seed: 42, mode: "cbow" });
  const losses = [];
  while (t.getEpoch() < 40) { const r = t.step(64); if (r.epochDone) losses.push(r.loss); }
  check("CBOW kaybı düşer", losses.at(-1) < losses[0], `${losses[0].toFixed(3)} → ${losses.at(-1).toFixed(3)}`);
}

// ─── Özet
console.log(`\n${"─".repeat(40)}`);
if (failures === 0) console.log("Tüm embedding testleri geçti ✓");
else { console.error(`${failures} test başarısız`); process.exitCode = 1; }

