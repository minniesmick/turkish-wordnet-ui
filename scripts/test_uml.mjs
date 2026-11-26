// UML üreteci denetimi:  node scripts/test_uml.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {umlSvg} from "../static/js/umlsvg.js";
import {DIAGRAMS, TRANSFORMER_UML} from "../static/js/diagrams.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
for(const d of DIAGRAMS){
  ok(d.classes.length <= 7 && d.edges.length <= 8, `${d.id}: bütçe (≤ 7 sınıf, ≤ 8 ilişki)`);
  ok(d.classes.filter(c => c.focal).length <= 1, `${d.id}: en çok bir odak sınıf`);
  for(const c of d.classes) for(const v of [c.x, c.y, c.w]) ok(v % 4 === 0, `${d.id}/${c.name}: 4px ızgara (${v})`);
  // metin taşmasın: tek aralıklı 9px yazıda karakter ≈ 5,6px, kutu içi boşluk 2 × 16px
  for(const c of d.classes) for(const t of [...c.attrs, ...c.ops]) ok(t.length * 5.6 <= c.w - 24, `${d.id}/${c.name}: metin sığıyor ("${t}")`);
  for(const e of d.edges) for(let i = 1; i < e.pts.length; i++) ok(e.pts[i][0] === e.pts[i - 1][0] || e.pts[i][1] === e.pts[i - 1][1], `${d.id}: yalnızca dik bağlantılar`);
  for(const th of ["vars", "light"]){
    const s = umlSvg(d, {theme: th, idp: d.id});
    ok(s.startsWith("<svg") && s.trim().endsWith("</svg>") && !/NaN|undefined/.test(s), `${d.id}/${th}: geçerli, NaN yok`);
    for(const c of d.classes) ok(s.includes(`>${c.name}</text>`), `${d.id}/${th}: ${c.name} çizildi`);
    for(const m of ["tri", "dia-f", "dia-h", "open"]) ok(s.includes(`id="${d.id}-${m}"`), `${d.id}: ${m} işaretçisi tanımlı`);
    ok((s.match(/<marker /g) || []).length === 4, "tam 4 işaretçi");
    ok(th === "light" ? /#2b3bd6/.test(s) && !s.includes("var(--") : s.includes("var(--spot)") && !/#2b3bd6/.test(s), `${d.id}/${th}: renk kipi`);
  }
}
// tanım dışı dosyalar: komut satırı
const out = fs.mkdtempSync(path.join(os.tmpdir(), "uml-"));
execFileSync("node", ["scripts/make_diagrams.mjs", "transformer-uml", "--out", out], {stdio: "pipe"});
const html = fs.readFileSync(path.join(out, "transformer-uml.html"), "utf8"), svg = fs.readFileSync(path.join(out, "transformer-uml.svg"), "utf8");
ok((html.match(/data:font\/woff2;base64,/g) || []).length === 14 && !html.includes("@import") && html.includes("<svg"), "HTML: yazı tipleri gömülü");
ok(svg.startsWith("<?xml") && svg.includes('width="100%"') && svg.includes("Transformer"), "SVG dosyası");
fs.rmSync(out, {recursive: true});
console.log(`uml: ${n} denetim geçti`);
