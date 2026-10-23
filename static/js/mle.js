// PCFG kural olasılıklarını parantezli ağaçlardan en çok olabilirlik (MLE) ile öğrenir: P(A -> β) = C(A -> β) / C(A). Lecture 3. Saf JS.

// "(S (NP (Det the) (N dog)) (VP (V barks)))" biçimindeki ağaçları ayrıştırır; birden çok ağaç art arda yazılabilir
export function parseTrees(text){
  const toks = text.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/).filter(Boolean);
  let i = 0;
  const node = () => {
    i++;                                                       // (
    const label = toks[i++];
    if(!label || label === "(" || label === ")") throw new Error("Düğüm etiketi bekleniyordu");
    const kids = [];
    while(i < toks.length && toks[i] !== ")") kids.push(toks[i] === "(" ? node() : toks[i++]);
    if(toks[i] !== ")") throw new Error("Kapanmayan parantez");
    i++;
    return {label, kids};
  };
  const trees = [];
  while(i < toks.length){
    if(toks[i] !== "(") throw new Error(`Ağaç “(” ile başlamalı, “${toks[i]}” bulundu`);
    trees.push(node());
  }
  return trees;
}

// kural sayımları, LHS toplamları, olasılıklar ve her ağacın olasılığı
export function learn(trees){
  const rules = new Map(), lhs = new Map();
  const visit = n => {
    if(typeof n === "string") return;
    const rhs = n.kids.map(k => typeof k === "string" ? k : k.label), key = n.label + "\u0001" + rhs.join(" ");
    const r = rules.get(key) || {lhs:n.label, rhs, c:0};
    r.c++; rules.set(key, r); lhs.set(n.label, (lhs.get(n.label) || 0) + 1);
    n.kids.forEach(visit);
  };
  trees.forEach(visit);
  const list = [...rules.values()].map(r => ({...r, total:lhs.get(r.lhs), p:r.c / lhs.get(r.lhs)}));
  const pOf = new Map(list.map(r => [r.lhs + "\u0001" + r.rhs.join(" "), r.p]));
  const treeP = n => typeof n === "string" ? 1 : n.kids.reduce((a, k) => a * treeP(k), pOf.get(n.label + "\u0001" + n.kids.map(k => typeof k === "string" ? k : k.label).join(" ")));
  return {rules:list, lhs:[...lhs.keys()], probs:trees.map(treeP)};
}

// gramer metni: "A -> B C [0.667] | D [0.333]" (Ayrıştırma sekmesinin biçimi)
export function toGrammar(learned){
  const by = new Map();
  for(const r of learned.rules){ if(!by.has(r.lhs)) by.set(r.lhs, []); by.get(r.lhs).push(r); }
  return [...by].map(([l, rs]) => `${l} -> ${rs.map(r => `${r.rhs.join(" ")} [${+r.p.toFixed(6)}]`).join(" | ")}`).join("\n");
}
