// Dil modeli çekirdeği için denetim: node scripts/test_lm.mjs
// Beklenen değerler Lecture 5 slayt 24-26, 31 ve InClass 5'ten.
import {buildModel, prob, dist, sample, seqProb, perplexity, pmiBuild, pmi, topPairs, collocates, similar, mapWord, BOS, EOS, UNK, defaultLam} from "../static/js/lm.js";

const toks = t => t.split("\n").map(l => l.trim().split(/\s+/));
const near = (a, b) => Math.abs(a - b) < 1e-9;
let bad = 0, total = 0;
const check = (name, got, want) => { total++; const ok = typeof want === "number" ? near(got, want) : got === want; if(!ok){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };

const slide = toks("I am Sam\nSam I am\nI fly");
const none = {smooth:"none"}, lap = {smooth:"laplace"};
const m1 = buildModel(slide, 1), m2 = buildModel(slide, 2), m3 = buildModel(slide, 3);
check("unigram P(I)", prob(m1, [], "I", none).p, 3 / 8);
check("unigram P(fly)", prob(m1, [], "fly", none).p, 1 / 8);
check("bigram P(I|<s>)", prob(m2, [BOS], "I", none).p, 2 / 3);
check("bigram P(Sam|<s>)", prob(m2, [BOS], "Sam", none).p, 1 / 3);
check("bigram P(</s>|am)", prob(m2, ["am"], EOS, none).p, 1 / 2);
check("bigram P(fly|I)", prob(m2, ["I"], "fly", none).p, 1 / 3);
check("trigram P(I|<s><s>)", prob(m3, [BOS, BOS], "I", none).p, 2 / 3);
check("trigram P(I|<s> Sam)", prob(m3, [BOS, "Sam"], "I", none).p, 1);
check("Laplace P(I|<s>)", prob(m2, [BOS], "I", lap).p, 3 / 8);          // (2+1)/(3+V=5)
check("Laplace V", m2.V, 5);
// dağılım toplamları 1
for(const [name, cfg] of [["none", none], ["laplace", lap], ["backoff", {smooth:"backoff", alpha:.4}], ["interp", {smooth:"interp", lam:[.3, .7]}]]){
  const d = dist(m2, [BOS], cfg);
  check("dist toplam " + name, d.probs.reduce((a, b) => a + b, 0), 1);
}
// interpolation: birim 1. düzey </s> içerir (toplam 11): P(I|<s>) = .7 * 2/3 + .3 * 3/11
check("interp P(I|<s>)", prob(m2, [BOS], "I", {smooth:"interp", lam:[.3, .7]}).p, .7 * 2 / 3 + .3 * 3 / 11);
// backoff: P(fly|am): bigram 0, unigram 1/11 çarpı alpha
check("backoff P(fly|am)", prob(m2, ["am"], "fly", {smooth:"backoff", alpha:.4}).p, .4 / 11);
check("backoff var olan bigram", prob(m2, ["am"], "Sam", {smooth:"backoff", alpha:.4}).p, 1 / 2);
// görülmemiş bağlamda interpolation yalnızca birim düzeye düşer (ağırlıklar yeniden normalize)
check("interp bağlam görülmüş, sözcük yok", prob(m2, ["fly"], "I", {smooth:"interp", lam:[.3, .7]}).p, .3 * 3 / 11);
check("interp bağlam hiç yok", prob(m2, ["zzz"], "I", {smooth:"interp", lam:[.3, .7]}).p, 3 / 11);   // ağırlıklar yeniden normalize
check("defaultLam toplam", defaultLam(3).reduce((a, b) => a + b, 0), 1);
// InClass 5
const ic5 = toks("the dog barks\nthe cat laughs\nthe cat saw the dog\nthe\ncat the dog the\ncat cat cat");
const mi = buildModel(ic5, 2);
check("IC5 P(the|<s>)", prob(mi, [BOS], "the", none).p, 4 / 6);
check("IC5 P(cat|<s>)", prob(mi, [BOS], "cat", none).p, 2 / 6);
check("IC5 P(dog|the)", prob(mi, ["the"], "dog", none).p, 3 / 7);
check("IC5 P(cat|the)", prob(mi, ["the"], "cat", none).p, 2 / 7);
check("IC5 P(</s>|the)", prob(mi, ["the"], EOS, none).p, 2 / 7);
check("IC5 P(cat|cat)", prob(mi, ["cat"], "cat", none).p, 2 / 6);
// cümle olasılığı
check("seqProb I am Sam", seqProb(m2, ["I", "am", "Sam"], none).prod, 2 / 3 * 2 / 3 * 1 / 2 * 1 / 2);
check("seqProb sıfır", seqProb(m2, ["I", "am", "fly"], none).prod, 0);
check("seqProb Laplace > 0", seqProb(m2, ["I", "am", "fly"], lap).prod > 0 ? 1 : 0, 1);
check("perplexity unigram", perplexity(m1, [["I"]], none).ppl, 8 / 3);
// UNK
const rare = toks("a b a b a\na c a b\nd e");
const mu = buildModel(rare, 2, {unk:1});
check("UNK türleri", mu.unkTypes, 3);                       // c, d, e (sayım ≤ 1)
check("UNK map", mapWord(mu, "zzz"), UNK);
check("UNK vocab", mu.known.has(UNK), true);
check("UNK P(<UNK>) > 0", prob(mu, ["a"], UNK, none).p > 0 ? 1 : 0, 1);
// üretim
const gen = sample(m2, {smooth:"none"}, 30, () => 0.5);
check("sample sonlanır", gen.length <= 30 ? 1 : 0, 1);
const g1 = sample(buildModel(slide, 1, {eos:true}), {smooth:"none"}, 30, Math.random);
check("unigram üretimi bitişi", Array.isArray(g1) ? 1 : 0, 1);
// PMI
const pm = pmiBuild(toks("a b\na b\na b\nc d\nc e\nf g\nf g\nf g"), 1);
check("pmi simetri", pmi(pm, "a", "b"), pmi(pm, "b", "a"));
check("pmi nadir çifti şişirir (c-d > a-b)", pmi(pm, "c", "d") > pmi(pm, "a", "b") ? 1 : 0, 1);
check("topPairs boş değil", topPairs(pm, 2, 5).length > 0 ? 1 : 0, 1);
check("collocates", collocates(pm, "a", 1, 3)[0].b, "b");
check("similar", similar(pm, "d", 1, 3).length >= 0 ? 1 : 0, 1);
// Kneser-Ney ve λ öğrenme
import {learnLam} from "../static/js/lm.js";
{
  const corp = toks("the dog barks\nthe cat sleeps\nthe dog sleeps\na cat barks\nthe dog saw the cat\na dog saw a cat\nthe cat saw the dog");
  for(const n of [1, 2, 3]){
    const m = buildModel(corp, n);
    for(const hist of n === 1 ? [[]] : n === 2 ? [["the"], ["dog"], [BOS], ["zzz"]] : [[BOS, "the"], ["the", "dog"], ["saw", "the"], ["zzz", "yyy"]]){
      const d = dist(m, hist, {smooth:"kn", D:.75}), sum = d.probs.reduce((a, b) => a + b, 0);
      check(`KN toplam 1 (n=${n}, ${hist.join(" ")})`, sum, 1);
      check(`KN görülmeyen sözcük sıfır değil (n=${n})`, prob(m, hist, m.cols[0], {smooth:"kn"}).p > 0 ? 1 : 0, 1);
    }
  }
  const m2 = buildModel(corp, 2);
  const seen = prob(m2, ["the"], "dog", {smooth:"kn"}).p, unseen = prob(m2, ["the"], "sleeps", {smooth:"kn"}).p;
  check("KN görülen > görülmeyen", seen > unseen ? 1 : 0, 1);
  // süreklilik: "saw" yalnızca "dog" ve "cat" sonrasında; "cat" ve "dog" çok farklı bağlamdan gelir
  const low = prob(m2, ["zzz"], "dog", {smooth:"kn"}).p;
  check("KN bilinmeyen bağlamda alt düzeye düşer", low > 0 ? 1 : 0, 1);
  check("KN perplexity sonlu", isFinite(perplexity(m2, toks("the dog sleeps\na cat saw the dog"), {smooth:"kn"}).ppl) ? 1 : 0, 1);
  // learnLam
  const train = corp.filter((_, i) => i % 3 !== 0), dev = corp.filter((_, i) => i % 3 === 0);
  const m3 = buildModel(train, 3), L = learnLam(m3, dev);
  check("λ toplam 1", L.lam.reduce((a, b) => a + b, 0), 1);
  check("λ uzunluğu n", L.lam.length, 3);
  check("EM log-olabilirlik azalmaz", L.ll.every((v, i) => i === 0 || v >= L.ll[i - 1] - 1e-9) ? 1 : 0, 1);
  const pDefault = perplexity(m3, dev, {smooth:"interp", lam:defaultLam(3)}).ppl, pLearn = perplexity(m3, dev, {smooth:"interp", lam:L.lam}).ppl;
  check("öğrenilen λ held-out'ta varsayılandan kötü değil", pLearn <= pDefault + 1e-9 ? 1 : 0, 1);
}
console.log("dil modeli denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
