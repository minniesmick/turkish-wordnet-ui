// Şekil dışa aktarma: sayfadaki SVG şemalarını (ağaçlar, bağımlılık oku, Zipf) açık renkli, bağımsız SVG ya da PNG olarak indirir.
// Kullanım: .fig-box içindeki bir düğme data-export="svg" | "png" ve data-name="dosya-adı" taşır; kutudaki ilk svg.pt / svg.dp / svg.zipf dışa aktarılır.
// Tablolar için: düğme data-export-tbl="svg" | "png", data-target="CSS seçici" taşır; en yakın kapsayıcıdaki tablo hücre hücre çizilir.
// Dosyalara kullanılan yazı tipleri (woff2) gömülür, böylece her bilgisayarda aynı görünür.
import {toast} from "./core.js";

const PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linejoin", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "paint-order", "letter-spacing", "opacity"];
const NS = "http://www.w3.org/2000/svg";

// Stilleri satır içine alır, açık temada ölçer (koyu temada da beyaz zeminli şekil çıkar)
function standalone(svg){
  const html = document.documentElement, prev = html.dataset.theme;
  html.dataset.theme = "light";
  try{
    const clone = svg.cloneNode(true), src = svg.querySelectorAll("*"), dst = clone.querySelectorAll("*");
    src.forEach((el, i) => {
      const cs = getComputedStyle(el); let st = "";
      for(const p of PROPS){ const v = cs.getPropertyValue(p); if(v) st += `${p}:${v};`; }
      dst[i].setAttribute("style", st); dst[i].removeAttribute("class");
    });
    const vb = svg.viewBox.baseVal, w = Math.round(vb?.width || svg.clientWidth), h = Math.round(vb?.height || svg.clientHeight);
    clone.setAttribute("xmlns", NS); clone.setAttribute("width", w); clone.setAttribute("height", h);
    if(!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
    clone.removeAttribute("class"); clone.removeAttribute("style");
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", vb?.x || 0); bg.setAttribute("y", vb?.y || 0); bg.setAttribute("width", w); bg.setAttribute("height", h); bg.setAttribute("fill", "#ffffff");
    clone.insertBefore(bg, clone.firstChild);
    return {xml:`<?xml version="1.0" encoding="UTF-8"?>\n` + new XMLSerializer().serializeToString(clone), w, h};
  }finally{
    if(prev === undefined) delete html.dataset.theme; else html.dataset.theme = prev;
  }
}
function save(blob, name){
  const a = document.createElement("a"), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function pngOf({xml, w, h}, scale = 2){
  const url = URL.createObjectURL(new Blob([xml], {type:"image/svg+xml;charset=utf-8"}));
  try{
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
    const c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale;
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, "image/png"));
  }finally{ URL.revokeObjectURL(url); }
}


// ---- Yazı tipi gömme ----
let FONT_RULES = null;
async function fontRules(){
  if(FONT_RULES) return FONT_RULES;
  const css = await (await fetch("/fonts/fonts.css")).text();
  FONT_RULES = [...css.matchAll(/@font-face\{([^}]*)\}/g)].map(m => {
    const b = m[1], g = re => (b.match(re) || [])[1];
    return {body:b, family:g(/font-family:'([^']+)'/), style:g(/font-style:(\w+)/), url:g(/url\(([^)]+)\)/)};
  }).filter(r => r.family && r.url);
  return FONT_RULES;
}
const b64 = buf => { let s = ""; const u = new Uint8Array(buf); for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const FONT_DATA = {};
async function embedFonts(xml){
  const used = new Set([...xml.matchAll(/font-family:([^;"]+)/g)].flatMap(m => m[1].split(",").map(x => x.trim().replace(/['"]/g, ""))));
  let css = "";
  for(const r of await fontRules()){
    if(!used.has(r.family)) continue;
    const key = r.url;
    if(!FONT_DATA[key]){
      const res = await fetch(new URL(r.url, location.origin + "/fonts/"));
      FONT_DATA[key] = b64(await res.arrayBuffer());
    }
    css += "@font-face{" + r.body.replace(/src:[^;]*;/, `src:url(data:font/woff2;base64,${FONT_DATA[key]}) format('woff2');`) + "}";
  }
  if(!css) return xml;
  return xml.replace(/(<svg[^>]*>)/, `$1<defs><style>${css}</style></defs>`);
}

// ---- Tablo → SVG ----
const ff = cs => cs.fontFamily.replace(/"/g, "'");
const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function tableSvg(table){
  const html = document.documentElement, prev = html.dataset.theme;
  html.dataset.theme = "light";
  try{
    const T = table.getBoundingClientRect(), pad = 8;
    const cap = table.querySelector("caption");
    let top = 0, body = "";
    if(cap){
      const cs = getComputedStyle(cap);
      top = 28;
      body += `<text x="0" y="18" style="font-family:${ff(cs)};font-size:${cs.fontSize};font-weight:${cs.fontWeight};fill:${cs.color}">${esc(cap.textContent.trim())}</text>`;
    }
    const W = Math.ceil(T.width), H = Math.ceil(T.height) + top;
    table.querySelectorAll("th, td").forEach(c => {
      const r = c.getBoundingClientRect(), cs = getComputedStyle(c);
      const x = r.left - T.left, y = r.top - T.top + top;
      const bg = cs.backgroundColor, hasBg = bg && !/rgba\(.*,\s*0\)$/.test(bg) && bg !== "transparent";
      const bw = parseFloat(cs.borderBottomWidth) || 0;
      body += `<rect x="${x}" y="${y}" width="${r.width}" height="${r.height}" style="fill:${hasBg ? bg : "none"};stroke:${bw ? cs.borderBottomColor : "none"};stroke-width:${bw ? 1 : 0}"/>`;
      const txt = c.textContent.replace(/\s+/g, " ").trim();
      if(!txt) return;
      const al = cs.textAlign, anchor = al === "right" || al === "end" ? "end" : al === "center" ? "middle" : "start";
      const tx = anchor === "end" ? x + r.width - pad : anchor === "middle" ? x + r.width / 2 : x + pad;
      body += `<text x="${tx}" y="${y + r.height / 2}" dominant-baseline="central" text-anchor="${anchor}" style="font-family:${ff(cs)};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};fill:${cs.color}">${esc(txt)}</text>`;
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${body}</svg>`;
    return {xml, w:W, h:H};
  }finally{
    if(prev === undefined) delete html.dataset.theme; else html.dataset.theme = prev;
  }
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-export]"); if(!b) return;
  const svg = b.closest(".fig-box")?.querySelector("svg.pt, svg.dp, svg.zipf, svg.emb-pca, svg.nn-loss, svg.rnn-unroll, svg.attn-map");
  if(!svg){ toast("Dışa aktarılacak şekil yok"); return; }
  const name = (b.dataset.name || "sekil").replace(/[^\w.-]+/g, "_");
  try{
    const s = standalone(svg); s.xml = await embedFonts(s.xml);
    if(b.dataset.export === "svg") save(new Blob([s.xml], {type:"image/svg+xml"}), name + ".svg");
    else save(await pngOf(s), name + ".png");
    toast(`${name}.${b.dataset.export} indirildi`);
  }catch(_){ toast("Şekil dışa aktarılamadı"); }
});

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-export-tbl]"); if(!b) return;
  let table = null;
  for(let p = b.parentElement; p && !table && p.id !== "views"; p = p.parentElement) table = p.querySelector(b.dataset.target || "table");
  if(!table){ toast("Dışa aktarılacak tablo yok"); return; }
  const name = (b.dataset.name || "tablo").replace(/[^\w.-]+/g, "_");
  try{
    const s = tableSvg(table); s.xml = await embedFonts(s.xml);
    if(b.dataset.exportTbl === "svg") save(new Blob([s.xml], {type:"image/svg+xml"}), name + ".svg");
    else save(await pngOf(s), name + ".png");
    toast(`${name}.${b.dataset.exportTbl} indirildi`);
  }catch(_){ toast("Tablo dışa aktarılamadı"); }
});
