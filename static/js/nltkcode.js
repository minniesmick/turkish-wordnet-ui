// "NLTK ile aynısı": ekrandaki işlemin NLTK karşılığını çalışır Python kodu olarak üretir (derste NLTK kullanılacak).
// Yalnızca metin üretir; hesap uygulamanın kendi motorunda yapılır.
import {esc} from "./core.js";

const py = s => JSON.stringify(String(s));   // Python dizgesi olarak da geçerli
export function nltkPanel(code, note = "") {
  return `<details class="nl"${window.__nlOpen ? " open" : ""} ontoggle="window.__nlOpen=this.open"><summary>NLTK ile aynısı <small>Python</small></summary>
    ${note ? `<p class="ng-formula" style="margin:8px 0">${esc(note)}</p>` : ""}
    <pre class="mp-fsm" tabindex="0">${esc(code)}</pre>
    <div class="row"><button class="btn sm ghost" data-copy="${esc(code)}">Kodu kopyala</button></div></details>`;
}

// n-gram: sayım, sonraki sözcük dağılımı, cümle olasılığı
export function ngramCode({sents, n, smooth, hist, sent}) {
  const lap = smooth === "laplace";
  const lines = [
    "# python -m pip install nltk",
    "from nltk import ConditionalFreqDist, FreqDist, ngrams",
    lap ? "from nltk.probability import LaplaceProbDist" : "from nltk.probability import MLEProbDist",
    "",
    "corpus = [",
    ...sents.map(s => `    ${py(s.join(" "))},`),
    "]",
    "sents = [s.split() for s in corpus]",
    `n = ${n}`,
    "",
    "# her cümle <s> ve </s> ile sarılır; n-gram'ın son sözcüğü, öncesindeki n-1 sözcüğe bağlı sayılır"
  ];
  if (n === 1) {
    lines.push("fd = FreqDist(w for s in sents for w in s + [\"</s>\"])", "N = fd.N()");
    if (lap) lines.push("V = len(fd)", "pd = LaplaceProbDist(fd, bins=V)", "");
    else lines.push("pd = MLEProbDist(fd)", "");
    lines.push("for w, c in fd.most_common():", `    print(f"P({w}) = {c}/{N} = {pd.prob(w):.4f}")`);
  } else {
    lines.push(
      "cfd = ConditionalFreqDist()",
      "for s in sents:",
      "    toks = [\"<s>\"] * (n - 1) + s + [\"</s>\"]",
      "    for g in ngrams(toks, n):",
      n === 2 ? "        cfd[g[0]][g[1]] += 1" : "        cfd[g[:-1]][g[-1]] += 1",
      ""
    );
    if (lap) lines.push("V = len({w for s in sents for w in s}) + 1   # sözcük türleri + </s>", "mkpd = lambda h: LaplaceProbDist(cfd[h], bins=V)");
    else lines.push("mkpd = lambda h: MLEProbDist(cfd[h])");
    const h = n === 2 ? py(hist[hist.length - 1] ?? "<s>") : `(${hist.map(py).join(", ")},)`;
    lines.push("",
      `hist = ${h}   # geçmiş`,
      "pd = mkpd(hist)",
      "N = cfd[hist].N()",
      "for w in sorted(set(cfd[hist]) | {w for s in sents for w in s} | {\"</s>\"}, key=lambda w: -pd.prob(w)):",
      `    print(f"P({w} | {hist}) = {cfd[hist][w]}/{N} = {pd.prob(w):.4f}")`,
      "print(\"en olası:\", pd.max())"
    );
  }
  if (sent && n > 0) {
    lines.push("", "# cümle olasılığı (çarpım)",
      `sent = ${py(sent)}.split()`,
      n === 1 ? "p = 1.0\nfor w in sent + [\"</s>\"]:\n    p *= pd.prob(w)" :
      "p = 1.0\ntoks = [\"<s>\"] * (n - 1) + sent + [\"</s>\"]\nfor g in ngrams(toks, n):\n    h = g[0] if n == 2 else g[:-1]\n    p *= mkpd(h).prob(g[-1])",
      "print(\"P(cümle) =\", p)");
  }
  if (smooth === "backoff" || smooth === "interp") {
    lines.unshift(`# Not: ${smooth === "backoff" ? "backoff" : "interpolation"} için hazır bir ConditionalFreqDist sınıfı yok; nltk.lm içinde StupidBackoff / interpolated modeller var.`, "# Aşağıdaki kod yumuşatmasız sayımları ve olasılıkları verir.");
  }
  return lines.join("\n");
}

// iki sözcük arasındaki benzerlik (İngilizce)
export function relateCode(a, b, pos) {
  const p = pos === "n" || pos === "v" ? pos : "";
  const ps = p ? `, ${py(p)}` : "";
  return [
    "# python -m pip install nltk",
    "# python -m nltk.downloader wordnet wordnet_ic",
    "from nltk.corpus import wordnet as wn, wordnet_ic",
    "",
    `a, b = ${py(a)}, ${py(b)}`,
    `pairs = [(x, y) for x in wn.synsets(a${ps}) for y in wn.synsets(b${ps})]`,
    "x, y = max(pairs, key=lambda p: p[0].path_similarity(p[1]) or 0)   # en yakın anlam çifti",
    "print(x, y)",
    "print(\"yol uzunluğu\", x.shortest_path_distance(y))",
    "print(\"path   \", x.path_similarity(y))",
    "print(\"wup    \", x.wup_similarity(y))",
    "print(\"ortak üst\", x.lowest_common_hypernyms(y))",
    ...(p ? ["", "ic = wordnet_ic.ic(\"ic-brown.dat\")   # bilgi içeriği (aynı sözcük türü gerekir)", "print(\"resnik \", x.res_similarity(y, ic))", "print(\"lin    \", x.lin_similarity(y, ic))", "print(\"jcn    \", x.jcn_similarity(y, ic))"] : [])
  ].join("\n");
}

// Lesk ile anlam seçimi (İngilizce)
export function leskCode(text, target) {
  return [
    "# python -m pip install nltk",
    "# python -m nltk.downloader wordnet punkt_tab",
    "from nltk import word_tokenize",
    "from nltk.wsd import lesk",
    "",
    `sent = ${py(text)}`,
    `s = lesk(word_tokenize(sent), ${py(target)})`,
    "print(s, \"-\", s.definition() if s else \"karar yok\")"
  ].join("\n");
}
