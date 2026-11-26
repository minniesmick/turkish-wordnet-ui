// Transformer bloğu denetimi:  node scripts/test_tfm.mjs
import assert from "node:assert/strict";
import {runTransformer, layerNorm, multiHeadAttention, initAttentionWeights, embedTokens, addNorm} from "../static/js/tfm.js";
import {mulberry32} from "../static/js/attn.js";
import {scaledDotProductAttention} from "../static/js/attn.js";

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const vocab = ["<s>", "the", "student", "read", "the", "book", "carefully", "</s>"];
const r = runTransformer({src: ["öğrenci", "kitabı", "dikkatle", "okudu"], tgt: ["<s>", "the", "student"], vocab, dModel: 8, numHeads: 2, seed: 42});

// boyutlar
ok(r.enc.output.length === 4 && r.enc.output[0].length === 8, "encoder çıkış boyutu n × d_model");
ok(r.dk === 4 && r.dFF === 32, "d_k = d_model / h, d_ff = 4 · d_model");
ok(r.enc.attn.heads.length === 2 && r.enc.attn.heads[0].Q[0].length === 4, "her başta Q, d_k boyutlu");
ok(r.enc.attn.concat[0].length === 8, "başlar birleşince d_model boyutu");
// dikkat ağırlıkları
for(const hd of r.enc.attn.heads) for(const row of hd.weights) ok(near(row.reduce((a, b) => a + b, 0), 1), "öz-dikkat satırı toplamı 1");
// decoder maskesi: gelecek konumlara ağırlık 0
for(const hd of r.dec.self.heads) for(let i = 0; i < 3; i++) for(let j = i + 1; j < 3; j++) ok(hd.weights[i][j] === 0, "nedensel maske: gelecek ağırlığı 0");
// cross-attention: sorgu = decoder (3), anahtar = encoder (4)
ok(r.dec.cross.heads[0].weights.length === 3 && r.dec.cross.heads[0].weights[0].length === 4, "cross-attention 3 × 4");
// LayerNorm: ortalama 0, varyans ≈ 1
for(const row of layerNorm([[1, 2, 3, 4], [10, 0, -10, 5]]).out){ const m = row.reduce((a, b) => a + b, 0) / row.length, v = row.reduce((a, b) => a + (b - m) ** 2, 0) / row.length; ok(near(m, 0, 1e-9), "LN ortalama 0"); ok(near(v, 1, 1e-4), "LN varyans ≈ 1"); }
for(const row of r.enc.an2.out){ const m = row.reduce((a, b) => a + b, 0) / 8; ok(near(m, 0, 1e-9), "encoder çıkışı satır ortalaması 0"); }
// Add & Norm raporu: LayerNorm sonrası gerçek istatistik (ortalama 0, varyans ≈ 1), öncesi farklı
for(let i = 0; i < 4; i++){ ok(near(r.enc.an1.after[i].mean, 0, 1e-9) && near(r.enc.an1.after[i].variance, 1, 1e-3), "rapor: LN sonrası μ = 0, σ² ≈ 1"); }
ok(r.enc.an1.before.some(b => Math.abs(b.variance - 1) > 0.01), "rapor: LN öncesi varyans 1 değil");
// Add & Norm toplamı: x + alt-katman
const x = [[1, 2], [3, 4]], s = [[0.5, 0.5], [1, 1]]; const an = addNorm(x, s); ok(an.sum[1][1] === 5 && an.sum[0][0] === 1.5, "Add: x + alt-katman");
// tek başlı çok başlı dikkat = tek başlı scaled dot-product
const W1 = initAttentionWeights(mulberry32(3), 4, 1), X = embedTokens(["a", "b", "c"], 4, 1);
const mh = multiHeadAttention(X, X, W1), hd = mh.heads[0];
const sp = scaledDotProductAttention(hd.Q, hd.K, hd.V, {});
ok(hd.weights.every((row, i) => row.every((v, j) => near(v, sp.weights[i][j]))), "tek başlı MHA = SDPA ağırlıkları");
// çıkış olasılıkları
ok(near(r.final.ranked.reduce((a, b) => a + b.p, 0), 1, 1e-9) && r.final.ranked.length === vocab.length, "son softmax toplamı 1");
ok(r.final.ranked[0].p >= r.final.ranked[1].p, "olasılıklar sıralı");
// aynı sözcük aynı vektör; tohum değişince değişir
const e1 = embedTokens(["x", "x"], 6, 5); ok(e1[0].every((v, i) => v === e1[1][i]), "aynı sözcük aynı embedding");
const r2 = runTransformer({src: ["öğrenci", "kitabı", "dikkatle", "okudu"], tgt: ["<s>"], vocab, seed: 43}); ok(r2.enc.output[0][0] !== r.enc.output[0][0], "tohum değişince çıktı değişir");
// hatalı ayar
assert.throws(() => runTransformer({src: ["a"], vocab, dModel: 6, numHeads: 4}), /bölün/); n++;
console.log(`tfm: ${n} denetim geçti`);
