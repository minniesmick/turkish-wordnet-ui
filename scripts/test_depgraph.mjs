// Grafik tabanlı ayrıştırma denetimi: node scripts/test_depgraph.mjs
import fs from "node:fs";
import {chuLiuEdmonds, trainGraph, parseGraph, evalGraph} from "../static/js/depgraph.js";
let bad = 0, total = 0;
const check = (name, got, want) => { total++; if(JSON.stringify(got) !== JSON.stringify(want)){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };

// Chu-Liu/Edmonds: rastgele küçük çizgelerde kaba kuvvetle (tüm baş atamaları) aynı toplam puanı vermeli
let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const isTree = (n, heads) => { for(let v = 1; v < n; v++){ const seen = new Set(); let c = v; while(c !== 0 && !seen.has(c)){ seen.add(c); c = heads[c]; } if(c !== 0) return false; } return true; };
function brute(n, W){
  let best = -Infinity; const heads = new Array(n).fill(0);
  const rec = v => {
    if(v === n){ if(isTree(n, heads)){ let t = 0; for(let d = 1; d < n; d++) t += W[heads[d]][d]; if(t > best) best = t; } return; }
    for(let h = 0; h < n; h++) if(h !== v){ heads[v] = h; rec(v + 1); }
  };
  rec(1); return best;
}
let ok = true, cyc = 0;
for(let trial = 0; trial < 60; trial++){
  const n = 4 + Math.floor(rnd() * 3);                       // kök dahil 4-6 düğüm
  const W = Array.from({length:n}, () => Array.from({length:n}, () => Math.round((rnd() * 20 - 8) * 10) / 10));
  const edges = []; for(let d = 1; d < n; d++) for(let h = 0; h < n; h++) if(h !== d) edges.push({h, d, w:W[h][d]});
  const t = chuLiuEdmonds(n, edges, 0), heads = new Array(n).fill(-1);
  for(const e of t) heads[e.d] = e.h;
  const sum = t.reduce((a, e) => a + e.w, 0), b = brute(n, W);
  if(t.length !== n - 1 || !isTree(n, heads) || Math.abs(sum - b) > 1e-9) ok = false;
  // en iyi gelen kenarlar döngü oluşturuyor muydu (algoritmanın döngü yolu denendi mi)
  const greedy = new Array(n).fill(-1); for(let d = 1; d < n; d++){ let bh = 0; for(let h = 0; h < n; h++) if(h !== d && W[h][d] > W[bh][d] || bh === d) bh = h; greedy[d] = bh; }
  if(!isTree(n, greedy)) cyc++;
}
check("CLE: 60 rastgele çizgede kaba kuvvetle aynı en iyi ağaç", ok, true);
check("CLE: döngü daralması yolu gerçekten denendi (en az 10 çizge)", cyc >= 10, true);
// elle: 1<->2 birbirini en çok seven iki sözcük, kök 3 ile başlamalı
const E = [{h:0, d:1, w:1}, {h:0, d:2, w:1}, {h:1, d:2, w:10}, {h:2, d:1, w:10}];
const T = chuLiuEdmonds(3, E, 0);
check("CLE: döngüde tek kök kenarı seçilir", T.filter(e => e.h === 0).length, 1);
check("CLE: ağaç toplamı 11", T.reduce((a, e) => a + e.w, 0), 11);
check("CLE: ağaç bulunamayan çizge null", chuLiuEdmonds(3, [{h:0, d:1, w:1}], 0), null);

// eğitim: BOUN, her 5. cümle sınama
const txt = fs.readFileSync(new URL("../data/ud/tr_boun-ud-test.conllu", import.meta.url), "utf8");
const all = [];
for(const blk of txt.split(/\n\n+/)){
  const tk = [];
  for(const l of blk.split("\n")){ const c = l.split("\t"); if(c.length >= 8 && /^\d+$/.test(c[0])) tk.push({id:+c[0], form:c[1], lemma:c[2], upos:c[3], feats:c[5], head:+c[6], rel:c[7]}); }
  if(tk.length) all.push(tk);
}
const tr = all.filter((_, i) => i % 5 !== 4), te = all.filter((_, i) => i % 5 === 4);
const M = await trainGraph(tr, {epochs:3}), R = evalGraph(M, te);
check("grafik: UAS %55 üstü", R.uas > 0.55, true);
check("grafik: LAS UAS'ten büyük olamaz", R.las <= R.uas, true);
let valid = true;
for(const tk of te.slice(0, 60)){
  const a = parseGraph(M, tk).arcs, heads = new Map(a.map(x => [x.d, x.h]));
  if(a.length !== tk.length || a.filter(x => x.h === 0).length !== 1) valid = false;
  for(const t of tk){ const seen = new Set(); let c = t.id; while(c && heads.has(c) && !seen.has(c)){ seen.add(c); c = heads.get(c); } if(c) valid = false; }
}
check("grafik: her çıktı tek kökle, döngüsüz, her sözcük bir başa bağlı", valid, true);
const a1 = (await trainGraph(tr.slice(0, 60), {epochs:2})), a2 = (await trainGraph(tr.slice(0, 60), {epochs:2}));
check("grafik: deterministik eğitim", evalGraph(a1, te.slice(0, 20)).uas, evalGraph(a2, te.slice(0, 20)).uas);
console.log("grafik tabanlı ayrıştırma denetimi:", total - bad, "/", total, `(UAS ${(100 * R.uas).toFixed(1)}, LAS ${(100 * R.las).toFixed(1)})`);
if(bad) process.exitCode = 1;
