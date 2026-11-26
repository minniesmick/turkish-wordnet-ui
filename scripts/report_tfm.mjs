#!/usr/bin/env node
// Komut satırından Transformer bloğu raporu (tarayıcı açmadan). Tek dosya, internetsiz açılır; stil ve yazı tipleri gömülüdür.
// Kullanım:
//   node scripts/report_tfm.mjs --src "öğrenci kitabı dikkatle okudu" --tgt "<s> the student read" --out rapor.html
//   Seçenekler: --dmodel 8|16  --heads 1|2|4  --seed 42  --no-pos  --no-decoder  --out dosya.html
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runTransformer} from "../static/js/tfm.js";
import {VOCAB, words, tfmBody, tfmSettings} from "../static/js/tfmview.js";
import {inlineFonts, reportDocument} from "../static/js/reportdoc.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "static");
const argv = process.argv.slice(2), opt = {};
for(let i = 0; i < argv.length; i++){ const a = argv[i]; if(a.startsWith("--")){ const k = a.slice(2); const nx = argv[i + 1]; if(nx === undefined || nx.startsWith("--")) opt[k] = true; else { opt[k] = nx; i++; } } }
if(opt.help || opt.h){ console.log("node scripts/report_tfm.mjs --src \"cümle\" [--tgt \"<s> ...\"] [--dmodel 8|16] [--heads 1|2|4] [--seed N] [--no-pos] [--no-decoder] [--out rapor.html]"); process.exit(0); }

const S = {src: String(opt.src ?? "öğrenci kitabı dikkatle okudu"), tgt: String(opt.tgt ?? "<s> the student read"), dModel: +(opt.dmodel ?? 8), heads: +(opt.heads ?? 2), seed: +(opt.seed ?? 42), usePos: !opt["no-pos"], decoder: !opt["no-decoder"]};
const src = words(S.src), tgt = S.decoder ? words(S.tgt) : [];
if(src.length < 2){ console.error("En az iki sözcük gerekli (--src)."); process.exit(1); }
const vocab = [...new Set([...VOCAB, ...tgt])];
const R = runTransformer({src, tgt, vocab, dModel: S.dModel, numHeads: S.heads, seed: S.seed, usePos: S.usePos});

const fonts = fs.readFileSync(path.join(ROOT, "fonts/fonts.css"), "utf8");
const load = async u => fs.readFileSync(path.join(ROOT, "fonts", u)).toString("base64");
const css = await inlineFonts(fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8"), load, {importCss: fonts});
const html = reportDocument({title: "Transformer bloğu", subtitle: "DL-6 · komut satırı raporu", settings: tfmSettings(S, R), body: `<div class="page wide">${tfmBody(R, S, {report: true})}</div>`, css, footer: "scripts/report_tfm.mjs ile üretildi"});
const out = path.resolve(String(opt.out ?? "transformer-rapor.html"));
fs.writeFileSync(out, html);
console.log(`${out} (${Math.round(html.length / 1024)} KB)`);
