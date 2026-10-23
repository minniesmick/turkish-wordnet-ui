// Türkçe morfoloji motoru için hızlı denetim: node scripts/test_turkish.mjs
import {CURATED, generate, analyze, nextOptions, SUF} from "../static/js/turkish.js";
const L = new Proxy(Object.fromEntries(CURATED.map(e=>[e.w,e])), {get:(o,k)=>o[k]||{w:k,pos:"N"}});
const cases = [
 ["okul",["PLU","P1sg"],"okullarım"],["masa",["P1sg"],"masam"],["kitap",["P1sg","ABL"],"kitabımdan"],["ağaç",["DAT"],"ağaca"],
 ["ayak",["GEN"],"ayağın"],["renk",["ACC"],"rengi"],["ev",["PLU","P3sg"],"evleri"],["ev",["P3pl"],"evleri"],
 ["kütüphane",["P3sg","DAT"],"kütüphanesine"],["gel",["FUT","A1sg_k"],"geleceğim"],["git",["PROG"],"gidiyor"],["git",["PAST"],"gitti"],
 ["kapa",["PROG"],"kapıyor"],["sevin",["CAUS_d","PROG"],"sevindiriyor"],["gel",["NEG","PROG","A1sg_k"],"gelmiyorum"],["ye",["FUT"],"yiyecek"],
 ["oku",["PROG","A3pl"],"okuyorlar"],["yaz",["AOR"],"yazar"],["gel",["AOR","A2sg_k"],"gelirsin"],["saat",["PLU"],"saatler"],["kalp",["P1sg"],"kalbim"],
 ["güzel",["LIK","ACC"],"güzelliği"],["kitap",["CI"],"kitapçı"],["gör",["PAST","A2pl_z"],"gördünüz"],["gez",["INF2"],"gezme"],["gez",["NEG"],"gezme"],
 ["gel",["ABIL","AOR"],"gelebilir"],["yaz",["PASS_l","PAST"],"yazıldı"],["oku",["PASS_n","PAST"],"okundu"],["de",["PROG"],"diyor"],["su",["INS"],"suyla"],
 ["okul",["LAS"],"okullaş"],["çocuk",["P3sg"],"çocuğu"],["gül",["PLU","P2pl"],"gülleriniz"],
 ["oku",["NEG","PROG"],"okumuyor"],["gör",["NEG","PROG","A2pl_k"],"görmüyorsunuz"],["yap",["NEG","PROG"],"yapmıyor"],["gel",["NEG","PROG"],"gelmiyor"],
 ["şehir",["P1sg"],"şehrim"],["şehir",["ACC"],"şehri"],["şehir",["LOC"],"şehirde"],["şehir",["PLU"],"şehirler"],["burun",["DAT"],"burna"]
];
let bad=0;
for(const [s,ids,exp] of cases){ const g=generate(L[s],ids); const got=g.ok?g.surface:"ERR:"+g.reason; if(got!==exp){bad++; console.log("FAIL",s,ids.join("+"),"->",got,"expected",exp);} }
console.log("generation checks:",cases.length-bad,"/",cases.length);
if(bad) process.exitCode = 1;
console.log(generate(L.okul,["PLU","P1sg"]).lex);
console.log(generate(L.sevin,["CAUS_d","PROG"]).lex);
console.log(generate(L.gez,["INF2","PLU"]).lex);
console.log(generate(L.kitap,["NEG"]).reason, "|", generate(L.kütüphane,["P3sg","P3sg"]).reason);
for(const w of ["okulum","evleri","gezme","sevindiriyor","kitabımdan","geleceğim","kapıyor"]){ console.log(w, "=>", analyze(w, CURATED).map(a=>a.lex).join("  ||  ")); }
