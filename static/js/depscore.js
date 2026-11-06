// Bağımlılık alıştırması puanı (Lecture 3, InClass 4): UAS = doğru HEAD oranı, LAS = HEAD ve DEPREL birlikte doğru oranı.
// gold: [{id, head, rel}], ans: {head:{id:n}, rel:{id:"nsubj"}}. Cevaplanmamış sözcük yanlış sayılır.
// Ayrıntı ilişkisi ("nsubj:pass") ana türle ("nsubj") eşleşirse LAS'ta kabul edilmez; yalnızca tam eşleşme doğrudur (BOUN etiketleriyle aynı).
export function scoreDeps(gold, ans){
  const rows = gold.map(g => {
    const h = ans.head?.[g.id], r = ans.rel?.[g.id];
    const answered = h !== undefined && h !== "" && r !== undefined && r !== "";
    const headOk = h !== undefined && h !== "" && +h === g.head;
    const relOk = r === g.rel;
    return {id:g.id, answered, headOk, relOk, ok:headOk && relOk};
  });
  const n = gold.length || 1;
  return {rows, uas:rows.filter(r => r.headOk).length / n, las:rows.filter(r => r.ok).length / n, done:rows.filter(r => r.answered).length, n:gold.length};
}
// cevap bir ağaç mı? tek kök, her sözcük bir başa bağlı, döngüsüz (alıştırmada uyarı için)
export function treeProblems(toks, headOf){
  const roots = toks.filter(t => +headOf[t.id] === 0 && headOf[t.id] !== undefined && headOf[t.id] !== "");
  const out = [];
  if(roots.length > 1) out.push("birden fazla kök");
  const ids = new Set(toks.map(t => t.id));
  for(const t of toks){
    const seen = new Set(); let c = t.id;
    while(c && headOf[c] !== undefined && headOf[c] !== "" && +headOf[c] !== 0 && !seen.has(c) && ids.has(+headOf[c])){ seen.add(c); c = +headOf[c]; }
    if(seen.has(c)){ out.push("döngü var"); break; }
  }
  return out;
}
