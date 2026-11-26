// Rapor belgesi ve komut satırı raporu denetimi:  node scripts/test_report.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {escH, inlineFonts, reportDocument} from "../static/js/reportdoc.js";
import {runTransformer} from "../static/js/tfm.js";
import {words, tfmBody, cellDetail} from "../static/js/tfmview.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(escH('<a href="x">&</a>') === "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;", "kaçış");
// yazı tipi gömme: @import yerine konur, url'ler data: olur
const css = await inlineFonts('@import url("../fonts/fonts.css");a{b:c}', async u => "QUJD", {importCss: "@font-face{src:url(./x.woff2) format('woff2')}@font-face{src:url(./y.woff2)}"});
ok(!css.includes("@import") && css.includes("data:font/woff2;base64,QUJD") && !css.includes("./x.woff2") && css.includes("a{b:c}"), "yazı tipi gömme");
// belge: ayarlar ve gövde, dış bağlantı yok
const doc = reportDocument({title: "Deneme <b>", settings: [["tohum", 42]], body: "<p>içerik</p>", css: "body{}", generated: new Date("2026-11-26T10:00:00Z")});
ok(doc.startsWith("<!doctype html>") && doc.includes("Deneme &lt;b&gt;") && doc.includes("<dt>tohum</dt><dd>42</dd>") && doc.includes("<p>içerik</p>") && !/(src|href)="https?:/.test(doc), "belge");
// Transformer görünümü: tıklanabilir hücreler, maskeli hücreler tıklanamaz
const R = runTransformer({src: words("öğrenci kitabı dikkatle okudu"), tgt: words("<s> the student"), vocab: ["<s>", "the", "student", "x"], dModel: 8, numHeads: 2, seed: 42});
const body = tfmBody(R, {usePos: true, seed: 42});
const hits = body.match(/data-tf="enc"/g).length, d = body.match(/data-tf="dself"/g).length, c = body.match(/data-tf="cross"/g).length;
ok(hits === 2 * 16 && c === 2 * 12, "enc ve cross hücreleri tıklanabilir");
ok(d === 2 * 6, "maskeli öz-dikkatte yalnızca alt üçgen (3 token: 1 + 2 + 3 = 6) tıklanabilir");
// hücre dökümü: skor ve softmax tutarlı
const det = cellDetail(R, "enc", 0, 1, 2); ok(det && det.title.includes("→") && det.body.includes("softmax") || det.body.includes("Softmax"), "hücre dökümü");
const hd = R.enc.attn.heads[0], raw = hd.Q[1].reduce((s, q, k) => s + q * hd.K[2][k], 0) / Math.sqrt(hd.Q[1].length);
ok(Math.abs(raw - hd.scores[1][2]) < 1e-9, "q·k/√d_k = ölçekli skor");
ok(cellDetail(R, "dself", 0, 2, 1).body.includes("student") && !cellDetail(R, "dself", 0, 0, 0).body.includes("<th>the</th>"), "decoder maskesi: yalnızca ≤ i anahtarları");
// komut satırı
const out = path.join(os.tmpdir(), `tfm-rapor-${process.pid}.html`);
execFileSync("node", ["scripts/report_tfm.mjs", "--src", "kedi sütü içti", "--tgt", "<s> the cat", "--dmodel", "16", "--heads", "4", "--out", out], {stdio: "pipe"});
const html = fs.readFileSync(out, "utf8"); fs.unlinkSync(out);
ok(html.includes("d_model = 16") && html.includes("h = 4 baş") && (html.match(/data:font\/woff2;base64,/g) || []).length === 14 && !html.includes("@import") && !html.includes("url(./"), "komut satırı raporu: ayarlar ve gömülü yazı tipleri");
console.log(`report: ${n} denetim geçti`);
