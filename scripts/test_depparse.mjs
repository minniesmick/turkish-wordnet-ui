// Geçiş tabanlı ayrıştırma oracle denetimi: node scripts/test_depparse.mjs
import fs from "node:fs";
import {oracle, sameArcs} from "../static/js/depparse.js";
let bad = 0, total = 0;
const check = (name, got, want) => { total++; if(JSON.stringify(got) !== JSON.stringify(want)){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };
const T = l => l.map(([id, form, head, rel]) => ({id, form, head, rel}));
// "Ali kitabı okudu": okudu kök; Ali nsubj, kitabı obj
const s1 = T([[1, "Ali", 3, "nsubj"], [2, "kitabı", 3, "obj"], [3, "okudu", 0, "root"]]);
const r1 = oracle(s1);
check("basit: başarı", r1.ok, true);
check("basit: yaylar altınla aynı", sameArcs(r1.steps, s1), true);
check("basit: adım sayısı 2n", r1.steps.length - 1, 2 * s1.length);
check("basit: son durum yığında yalnızca ROOT", r1.steps[r1.steps.length - 1].stack, [0]);
check("basit: tampon boş", r1.steps[r1.steps.length - 1].buffer, []);
// sağa dallanan: a(1)→b(2)→c(3)  (a kök)
const s2 = T([[1, "a", 0, "root"], [2, "b", 1, "obj"], [3, "c", 2, "nmod"]]);
const r2 = oracle(s2);
check("sağ zincir: başarı", r2.ok && sameArcs(r2.steps, s2), true);
check("sağ zincir: yalnızca RIGHT-ARC ve SHIFT", r2.steps.slice(1).every(s => s.act === "SHIFT" || s.act === "RIGHT-ARC"), true);
// projektif olmayan: 1→3, 2→4 kesişir
const s3 = T([[1, "a", 0, "root"], [2, "b", 4, "x"], [3, "c", 1, "y"], [4, "d", 1, "z"]]);
check("kesişen yay: oracle başarısız", oracle(s3).ok, false);
// BOUN: projektif cümlelerin hepsinde yaylar yeniden kurulur
const txt = fs.readFileSync(new URL("../data/ud/tr_boun-ud-test.conllu", import.meta.url), "utf8");
let n = 0, proj = 0, okAll = true;
for(const blk of txt.split(/\n\n+/)){
  const toks = [];
  for(const l of blk.split("\n")){ const c = l.split("\t"); if(c.length >= 8 && /^\d+$/.test(c[0])) toks.push({id:+c[0], form:c[1], head:+c[6], rel:c[7]}); }
  if(!toks.length) continue;
  n++;
  const r = oracle(toks);
  if(r.ok){ proj++; if(!sameArcs(r.steps, toks) || r.steps.length - 1 !== 2 * toks.length) okAll = false; }
}
check("BOUN: projektif cümlelerde yaylar altınla aynı, 2n adım", okAll, true);
check("BOUN: projektif cümle oranı %85 üstü", proj / n > 0.85, true);
console.log("geçiş tabanlı ayrıştırma denetimi:", total - bad, "/", total, `(BOUN: ${proj}/${n} projektif)`);
if(bad) process.exitCode = 1;
