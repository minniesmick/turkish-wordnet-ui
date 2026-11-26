// Transformer bloğu hesapları — DL-6 (slayt 12–29). DOM bağımsız saf JS; arayüz transformer.js içinde. Test: node scripts/test_tfm.mjs
// Encoder bloğu: girdi + konumsal kodlama → çok başlı öz-dikkat → Add & LayerNorm → ileri besleme (FFN) → Add & LayerNorm.
// Decoder bloğu: maskeli öz-dikkat → encoder-decoder dikkati → FFN (her adımdan sonra Add & LayerNorm) → Linear + softmax.
// Ağırlıklar eğitilmemiş, tohumdan rastgele üretilir: sayılar anlam taşımaz, işlemin kendisi (boyutlar, adımlar) gerçektir.
import {mulberry32, softmax, matMul, matTranspose, causalMask, positionalEncoding, scaledDotProductAttention} from "./attn.js";

const arr = M => M.map(r => Array.from(r));
const zeros = (r, c) => Array.from({length: r}, () => new Array(c).fill(0));

// aynı sözcük her zaman aynı vektörü alsın: sözcüğün kodundan tohum
export function hashSeed(s, seed = 0){
  let h = 2166136261 ^ seed;
  for(const ch of String(s)){ h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function randMatrix(rng, r, c, scale = 1){
  return Array.from({length: r}, () => Array.from({length: c}, () => (rng() * 2 - 1) * scale));
}
export function embedTokens(tokens, dModel, seed = 42){
  return tokens.map(t => { const rng = mulberry32(hashSeed(t, seed)); return Array.from({length: dModel}, () => (rng() * 2 - 1)); });
}
export const addMat = (A, B) => A.map((r, i) => Array.from(r).map((v, j) => v + B[i][j]));

// LayerNorm (satır başına, γ = 1, β = 0): (x − ortalama) / √(varyans + ε)
export function layerNorm(X, eps = 1e-5){
  const stats = [], out = X.map(row => {
    const x = Array.from(row), n = x.length, mean = x.reduce((a, b) => a + b, 0) / n;
    const variance = x.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    stats.push({mean, variance});
    return x.map(v => (v - mean) / Math.sqrt(variance + eps));
  });
  return {out, stats};
}
// Add & Norm: LayerNorm(x + alt-katman(x))
export function addNorm(X, sub){
  const sum = addMat(X, sub), before = sum.map(r => {
    const n = r.length, mean = r.reduce((a, b) => a + b, 0) / n;
    return {mean, variance: r.reduce((a, b) => a + (b - mean) ** 2, 0) / n};
  });
  const ln = layerNorm(sum);
  const after = ln.out.map(r => {   // LayerNorm sonrası gerçek ortalama ve varyans
    const n = r.length, mean = r.reduce((x, y) => x + y, 0) / n;
    return {mean, variance: r.reduce((x, y) => x + (y - mean) ** 2, 0) / n};
  });
  return {sum, before, out: ln.out, after};
}

export function initAttentionWeights(rng, dModel, numHeads){
  const dk = dModel / numHeads, s = 1 / Math.sqrt(dModel);
  return {
    dk,
    Wq: Array.from({length: numHeads}, () => randMatrix(rng, dModel, dk, s)),
    Wk: Array.from({length: numHeads}, () => randMatrix(rng, dModel, dk, s)),
    Wv: Array.from({length: numHeads}, () => randMatrix(rng, dModel, dk, s)),
    Wo: randMatrix(rng, dModel, dModel, s)
  };
}
export function initFFNWeights(rng, dModel, dFF){
  return {W1: randMatrix(rng, dModel, dFF, 1 / Math.sqrt(dModel)), b1: new Array(dFF).fill(0), W2: randMatrix(rng, dFF, dModel, 1 / Math.sqrt(dFF)), b2: new Array(dModel).fill(0)};
}

// Çok başlı dikkat. Xq: sorgu girdisi (n × d), Xkv: anahtar/değer girdisi (m × d). Öz-dikkatte ikisi aynıdır.
export function multiHeadAttention(Xq, Xkv, W, {mask = null} = {}){
  const heads = W.Wq.map((_, h) => {
    const Q = matMul(Xq, W.Wq[h]), K = matMul(Xkv, W.Wk[h]), V = matMul(Xkv, W.Wv[h]);
    const r = scaledDotProductAttention(arr(Q), arr(K), arr(V), {mask});
    return {Q: arr(Q), K: arr(K), V: arr(V), scores: r.scaledScores, weights: r.weights, output: arr(r.output)};
  });
  const concat = Xq.map((_, i) => heads.flatMap(hd => hd.output[i]));
  return {heads, concat, out: arr(matMul(concat, W.Wo))};
}

export function ffn(X, F){
  const hidden = arr(matMul(X, F.W1)).map(r => r.map((v, j) => Math.max(0, v + F.b1[j])));
  const out = arr(matMul(hidden, F.W2)).map(r => r.map((v, j) => v + F.b2[j]));
  return {hidden, out};
}

export function encoderBlock(X, W, F){
  const attn = multiHeadAttention(X, X, W);
  const an1 = addNorm(X, attn.out);
  const f = ffn(an1.out, F);
  const an2 = addNorm(an1.out, f.out);
  return {input: X, attn, an1, ffn: f, an2, output: an2.out};
}

export function decoderBlock(Y, encOut, Wself, Wcross, F){
  const n = Y.length;
  const self = multiHeadAttention(Y, Y, Wself, {mask: causalMask(n)});
  const an1 = addNorm(Y, self.out);
  const cross = multiHeadAttention(an1.out, encOut, Wcross);
  const an2 = addNorm(an1.out, cross.out);
  const f = ffn(an2.out, F);
  const an3 = addNorm(an2.out, f.out);
  return {input: Y, self, an1, cross, an2, ffn: f, an3, output: an3.out};
}

// Son katman: Linear (d_model → |sözlük|) + softmax; son konumun sonraki-sözcük dağılımı
export function outputLayer(H, Wout, vocab){
  const logits = arr(matMul(H, Wout));
  const probs = logits.map(r => softmax(r));
  const last = probs[probs.length - 1];
  const ranked = vocab.map((w, i) => ({w, p: last[i], logit: logits[logits.length - 1][i]})).sort((a, b) => b.p - a.p);
  return {logits, probs, ranked};
}

// Hepsini tek çağrıda çalıştır
export function runTransformer({src, tgt, vocab, dModel = 8, numHeads = 2, ffRatio = 4, seed = 42, usePos = true}){
  if(dModel % numHeads) throw new Error("d_model, baş sayısına tam bölünmeli");
  const dFF = dModel * ffRatio;
  const rngE = mulberry32(seed), rngD = mulberry32(seed + 1);
  const emb = embedTokens(src, dModel, seed), pe = positionalEncoding(src.length, dModel).map(r => Array.from(r));
  const X = usePos ? addMat(emb, pe) : emb;
  const enc = encoderBlock(X, initAttentionWeights(rngE, dModel, numHeads), initFFNWeights(rngE, dModel, dFF));
  const out = {dModel, numHeads, dk: dModel / numHeads, dFF, src, emb, pe, X, enc};
  if(tgt && tgt.length){
    const embT = embedTokens(tgt, dModel, seed + 7), peT = positionalEncoding(tgt.length, dModel).map(r => Array.from(r));
    const Y = usePos ? addMat(embT, peT) : embT;
    const dec = decoderBlock(Y, enc.output, initAttentionWeights(rngD, dModel, numHeads), initAttentionWeights(rngD, dModel, numHeads), initFFNWeights(rngD, dModel, dFF));
    Object.assign(out, {tgt, embT, peT, Y, dec, final: outputLayer(dec.output, randMatrix(rngD, dModel, vocab.length, 1 / Math.sqrt(dModel)), vocab), vocab});
  }
  return out;
}
export {matTranspose, zeros};
