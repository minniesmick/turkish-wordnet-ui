#!/usr/bin/env node
// Diyagram tanımlarından (static/js/diagrams.js) dosya üretir; yapay zekâ ve ağ gerekmez.
//   node scripts/make_diagrams.mjs            → docs/diagrams/<id>.html (stil ve yazı tipleri gömülü) ve <id>.svg (düz renkli)
//   node scripts/make_diagrams.mjs --png      → ayrıca <id>.png (Playwright + Chromium kuruluysa: ~/.local/share/playwright-venv)
//   node scripts/make_diagrams.mjs transformer-uml --out dizin
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {DIAGRAMS} from "../static/js/diagrams.js";
import {umlSvg} from "../static/js/umlsvg.js";
import {inlineFonts, reportDocument} from "../static/js/reportdoc.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), STATIC = path.join(ROOT, "static");
const args = process.argv.slice(2), png = args.includes("--png");
const oi = args.indexOf("--out"), outDir = path.resolve(oi >= 0 ? args[oi + 1] : path.join(ROOT, "docs", "diagrams"));
const only = args.filter((a, i) => !a.startsWith("--") && (oi < 0 || i !== oi + 1));
const list = only.length ? DIAGRAMS.filter(d => only.includes(d.id)) : DIAGRAMS;
if(!list.length){ console.error("Tanım bulunamadı. Mevcut: " + DIAGRAMS.map(d => d.id).join(", ")); process.exit(1); }
fs.mkdirSync(outDir, {recursive: true});

const fonts = fs.readFileSync(path.join(STATIC, "fonts/fonts.css"), "utf8");
const css = await inlineFonts(fs.readFileSync(path.join(STATIC, "css/app.css"), "utf8"), async u => fs.readFileSync(path.join(STATIC, "fonts", u)).toString("base64"), {importCss: fonts});
const py = path.join(os.homedir(), ".local/share/playwright-venv/bin/python"), exporter = path.join(os.homedir(), ".claude/skills/diagram-design/scripts/export_png.py");

for(const d of list){
  const html = reportDocument({title: d.title, subtitle: d.subtitle || "UML sınıf diyagramı", settings: [], body: `<div class="page wide"><div class="ng-scroll">${umlSvg(d, {theme: "vars", idp: d.id})}</div><p class="ck-meta">Kaynak: ${d.source || ""}</p></div>`, css, footer: "scripts/make_diagrams.mjs ile üretildi", fileName: d.id + ".html"});
  const base = path.join(outDir, d.id);
  fs.writeFileSync(base + ".html", html);
  fs.writeFileSync(base + ".svg", `<?xml version="1.0" encoding="UTF-8"?>\n` + umlSvg(d, {theme: "light", idp: d.id}).replace("<svg ", `<svg width="100%" `) + "\n");
  let note = "";
  if(png){
    if(fs.existsSync(py) && fs.existsSync(exporter)){ execFileSync(py, [exporter, base + ".html", base + ".png", "2"], {stdio: "pipe"}); note = " + png"; }
    else note = " (PNG atlandı: Playwright ortamı ya da diagram-design skill'i bulunamadı)";
  }
  console.log(`${path.relative(process.cwd(), base)}.html + .svg${note}`);
}
