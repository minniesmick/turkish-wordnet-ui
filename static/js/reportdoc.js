// HTML rapor belgesi: tek dosya, internetsiz açılır; stil ve yazı tipleri (woff2) gömülüdür.
// Saf JS (DOM ve core.js yok): hem tarayıcıdaki "Rapor indir" düğmesi (report.js) hem de komut satırı betikleri (scripts/report_*.mjs) kullanır.
export const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

// CSS içindeki url(...) yazı tiplerini data: URI olarak gömer. load(url) → base64 dizgesi. @import url("../fonts/fonts.css") varsa fontCss ile değiştirilir.
export async function inlineFonts(css, load, {importCss = ""} = {}){
  let out = importCss ? css.replace(/@import\s+url\([^)]*fonts\.css[^)]*\)\s*;?/, importCss) : css;
  const urls = [...new Set([...out.matchAll(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/g)].map(m => m[1]))];
  for(const u of urls){
    const b64 = await load(u);
    out = out.split(u).join(`data:font/woff2;base64,${b64}`);
  }
  return out;
}

const OVERRIDES = `
html{font-size:15px}
body.report{background:var(--paper);color:var(--ink);margin:0;overflow:visible}
.report-page{max-width:1080px;margin:0 auto;padding:32px 24px 48px}
.report-head{border-bottom:2px solid var(--ink);padding-bottom:14px;margin-bottom:18px}
.report-head h1{margin:0 0 4px;font:800 clamp(1.7rem,3.4vw,2.4rem)/1.1 var(--font-ui);letter-spacing:-.01em}
.report-head p{margin:0;color:var(--ink-3);font:500 .86rem var(--font-mono)}
.report-settings{margin:0 0 22px;padding:12px 14px;border:1px solid var(--rule);border-radius:var(--r);background:var(--page)}
.report-settings h2{margin:0 0 8px;font:600 .72rem var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.report-settings dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 18px;margin:0;font-size:.92rem}
.report-settings dt{color:var(--ink-3)}.report-settings dd{margin:0;font-weight:600;overflow-wrap:anywhere}
.report-body .page{max-width:none;padding:0}
.report-body .page-title,.report-body .lesson-intro{display:none}
.rep-val{font-weight:600;border-bottom:1px dotted var(--rule-2)}
.rep-btn{display:inline-block;padding:2px 9px;border:1px solid var(--rule-2);border-radius:var(--r);font-size:.86rem;margin:0 4px 4px 0}
.rep-btn[aria-pressed="true"]{background:var(--wash);border-color:var(--spot);font-weight:600}
.report-foot{margin-top:34px;padding-top:12px;border-top:1px solid var(--rule);color:var(--ink-3);font:500 .8rem var(--font-mono)}
.report-bar{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin:0 0 14px}
.report-bar button,.report-bar a{font:600 .86rem var(--font-ui);padding:5px 12px;border:1px solid var(--rule-2);border-radius:var(--r);background:var(--page);color:var(--ink);text-decoration:none;cursor:pointer}
.report-bar button:hover,.report-bar a:hover{background:var(--wash);border-color:var(--spot)}
@media print{.no-print{display:none!important}body.report{background:#fff}.report-page{padding:0}.ng-scroll,.ck-scroll{overflow:visible}.ng-h{break-after:avoid}table{break-inside:avoid}}
`;

export function reportDocument({title, subtitle = "", settings = [], body, css, generated = new Date(), footer = "", fileName = "rapor.html"}){
  const when = new Date(generated).toLocaleString("tr-TR", {dateStyle: "long", timeStyle: "short"});
  const set = settings.length ? `<section class="report-settings" aria-label="Ayarlar"><h2>Ayarlar</h2><dl>${settings.map(([k, v]) => `<dt>${escH(k)}</dt><dd>${escH(v)}</dd>`).join("")}</dl></section>` : "";
  return `<!doctype html>
<html lang="tr" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escH(title)} · rapor</title>
<style>${css}</style>
<style>${OVERRIDES}</style>
</head>
<body class="report student ext-sim ext-nb ext-ngx ext-cpx ext-md ext-dp ext-evx ext-rail">
<main class="report-page">
<div class="report-bar no-print"><button type="button" onclick="window.print()">Yazdır / PDF olarak kaydet</button><a id="repDl" href="#" download="${escH(fileName)}" hidden>Dosya olarak indir</a></div>
<header class="report-head"><h1>${escH(title)}</h1><p>${escH(subtitle)}${subtitle ? " · " : ""}${escH(when)}</p></header>
${set}
<div class="views report-body">${body}</div>
<footer class="report-foot">${footer ? escH(footer) + " · " : ""}Türkçe WordNet arayüzü, MEF University COMP 451 ders çalışma aracı (öğrenci projesi, resmî ders materyali değildir).</footer>
</main>
<script>if(location.protocol==="blob:"){var a=document.getElementById("repDl");a.href=location.href;a.hidden=false}</script>
</body>
</html>
`;
}
