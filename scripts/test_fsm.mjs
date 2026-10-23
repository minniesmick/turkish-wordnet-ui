// Oflazer FSM yol çıkarıcı için denetim: node scripts/test_fsm.mjs
// Beklenen durum dizileri, Sample.pdf'teki üç el çözümünden alınmıştır.
import {trace, stepStates} from "../static/js/fsm.js";

const cases = [
  ["küçük+Noun+A3pl", ["1", "2", "3", "4", "5", "6"]],
  ["uyu+Verb+Prog1+A3sg+Cop", ["1", "101", "107", "112", "1131", "120", "1200", "125", "130"]],
  ["uyu+Verb+Prog1+Cop", ["1", "101", "107", "112", "1131", "120", "1200", "125", "130"]],
  ["uyu+Verb^DB+Noun+Inf1+A3sg+Loc^DB+Verb+Zero+Pres+A3sg+Cop", ["1", "101", "107", "112", "113", "118", "5", "21", "22"]]
];
let bad = 0;
for(const [s, want] of cases){
  const t = trace(s), got = t.ok ? stepStates(t) : null;
  const ok = t.ok && JSON.stringify(got) === JSON.stringify(want);
  if(!ok){ bad++; console.log("FAIL", s, "\n  beklenen", want.join(" "), "\n  bulunan ", got ? got.join(" ") : t.reason); }
}
// kapsam: hata vermeden yol çıkarması beklenen birkaç çözümleme (durum dizisi elle doğrulanmadı)
for(const s of ["ev+Noun+A3sg+P3sg+Abl", "gel+Verb+Neg+Prog1+A1sg", "gel+Verb+Past+A3pl", "ev+Noun+A3sg+Loc^DB+Verb+Zero+Past+A3sg", "gel+Verb^DB+Verb+Able+Aor+A2sg", "oku+Verb+Fut+A1sg"]){
  const t = trace(s);
  console.log(t.ok ? "ok  " : "STOP", s, t.ok ? stepStates(t).join(" ") : t.reason);
}
console.log("Sample.pdf yolları:", cases.length - bad, "/", cases.length);
if(bad) process.exitCode = 1;
