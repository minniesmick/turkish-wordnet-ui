// Oflazer FSM yol çıkarıcı için denetim: node scripts/test_fsm.mjs
// Beklenen durum dizileri, Sample.pdf'teki üç el çözümünden alınmıştır.
import {trace, stepStates, POOL, VERIFIED, checkPath, edgeTable, edgesFrom, sampleLines} from "../static/js/fsm.js";

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
// "kendin yaz" alıştırması: havuzdaki her çözümlemenin yolu çıkmalı ve varsayım kenarı içermemeli
let pbad = 0;
for(const s of POOL){ const t = trace(s); if(!t.ok || t.steps.some(x => x.assumed)){ pbad++; console.log("FAIL havuz", s, t.ok ? "varsayım kenarı" : t.reason); } }
// Sample.pdf'ten doğrulananlar havuzda ve yolları beklenenle aynı
for(const [s, want] of cases) if(VERIFIED.has(s) && stepStates(trace(s)).join(" ") !== want.join(" ")){ pbad++; console.log("FAIL doğrulanmış yol", s); }
const chk = (name, got, want) => { if(got !== want){ pbad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };
const W = ["1", "2", "3", "4", "5", "6"];
chk("checkPath tam", checkPath(W, ["1", "2", "3", "4", "5", "6"]).status, "ok");
chk("checkPath başlangıç 1 eklenir", checkPath(W, ["2", "3", "4", "5", "6"]).status, "ok");
chk("checkPath eksik", checkPath(W, ["1", "2", "3"]).status, "prefix");
chk("checkPath yanlış durum", checkPath(W, ["1", "2", "3", "9"]).bad, 3);
chk("checkPath yanlış durum durumu", checkPath(W, ["1", "2", "3", "9"]).status, "wrong");
chk("checkPath fazla", checkPath(W, ["1", "2", "3", "4", "5", "6", "7"]).status, "long");
chk("edgesFrom 3", [...new Set(edgesFrom(3))].join(","), "4,9,2");
chk("edgeTable her durum", edgeTable().every(r => r.to.length > 0), true);
chk("sampleLines biçimi", sampleLines(trace("küçük+Noun+A3pl"))[0], "From State 1-State 2: küçük+Noun");
console.log("alıştırma denetimi:", pbad ? "BAŞARISIZ " + pbad : "tamam", "(havuz " + POOL.length + " çözümleme)");
if(pbad) process.exitCode = 1;
console.log("Sample.pdf yolları:", cases.length - bad, "/", cases.length);
if(bad) process.exitCode = 1;
