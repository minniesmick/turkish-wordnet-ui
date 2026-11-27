// Kod çözme (decoding) yöntemleri — DL-7, slayt 28–32. DOM bağımsız saf JS; arayüz decodelab.js içinde. Test: node scripts/test_decode.mjs
// `next(dizi)` sonraki sözcüklerin dağılımını verir: [{w, p}], olasılığa göre sıralı olması gerekmez. Boş liste dizinin bittiği anlamına gelir.
// Bir dizinin olasılığı adım olasılıklarının çarpımıdır (otomatik gerilemeli çözümleme).

// slayt 30–31'deki ağaç
export const SLIDE_TREE = {
  "The":{dog:.4, nice:.5, car:.1},
  "The dog":{and:.05, runs:.05, has:.9},
  "The nice":{woman:.4, house:.3, guy:.3},
  "The car":{is:.3, drives:.5, turns:.2}
};
export const treeNext = tree => seq => Object.entries(tree[seq.join(" ")] || {}).map(([w, p]) => ({w, p}));

const byProb = (a, b) => b.p - a.p || a.w.localeCompare(b.w, "tr");
const options = (next, seq) => next(seq).filter(o => o.p > 0).sort(byProb);

// slayt 30: her adımda en olası sözcük
export function greedy(next, start, steps){
  const seq = start.slice();
  let p = 1;
  for(let t = 0; t < steps; t++){
    const best = options(next, seq)[0];
    if(!best) break;
    seq.push(best.w);
    p *= best.p;
  }
  return {seq, p};
}

// slayt 31: her adımda en olası k dizi tutulur; biten dizi olduğu gibi yarışmaya devam eder. k = 1 açgözlü aramadır.
export function beam(next, start, k, steps){
  let kept = [{seq:start.slice(), p:1, done:false}];
  const trace = [];
  for(let t = 0; t < steps && kept.some(h => !h.done); t++){
    const pool = [];
    for(const h of kept){
      const list = h.done ? [] : options(next, h.seq);
      if(!list.length){ pool.push({...h, done:true}); continue; }
      for(const o of list) pool.push({seq:[...h.seq, o.w], p:h.p * o.p, done:false});
    }
    pool.sort((a, b) => b.p - a.p);
    kept = pool.slice(0, Math.max(1, k));
    trace.push({step:t + 1, candidates:pool.length, kept:kept.map(h => ({seq:h.seq, p:h.p}))});
  }
  return {results:kept.map(h => ({seq:h.seq, p:h.p})), trace};
}

// slayt 29: tüm diziler denenir. Arama uzayı üstel büyür; `budget` aşılırsa null döner.
export function exact(next, start, steps, budget = 20000){
  let best = null, visited = 0, over = false;
  const walk = (seq, p, depth) => {
    if(over || (best && p <= best.p)) return;                 // olasılık yalnızca küçülür: bu dal artık geçemez
    const list = depth < steps ? options(next, seq) : [];
    if(!list.length){ best = {seq, p}; return; }
    for(const o of list){
      if(++visited > budget){ over = true; return; }
      walk([...seq, o.w], p * o.p, depth + 1);
    }
  };
  walk(start.slice(), 1, 0);
  return over ? null : {...best, visited};
}

// slayt 32: en olası k sözcük alınır ve sıcaklık T ile yeniden ağırlıklandırılır: softmax(ln p / T) = p^(1/T) / Σ p^(1/T)
export function truncate(list, k, temperature){
  const top = list.filter(o => o.p > 0).sort(byProb).slice(0, Math.max(1, k));
  if(!top.length) return [];
  const T = Math.max(temperature, .01), max = Math.log(top[0].p);
  const weights = top.map(o => Math.exp((Math.log(o.p) - max) / T));   // en büyüğe göre: küçük T'de taşma olmaz
  const sum = weights.reduce((a, b) => a + b, 0);
  return top.map((o, i) => ({w:o.w, p:o.p, q:weights[i] / sum}));
}

export function sampleSeq(next, start, {k, temperature, steps, rnd}){
  const seq = start.slice();
  let p = 1;
  for(let t = 0; t < steps; t++){
    const list = truncate(next(seq), k, temperature);
    if(!list.length) break;
    let r = rnd(), i = 0;
    while(i < list.length - 1 && (r -= list[i].q) > 0) i++;
    seq.push(list[i].w);
    p *= list[i].p;                                           // dizinin modeldeki olasılığı (yeniden ağırlıklandırılmamış)
  }
  return {seq, p};
}
