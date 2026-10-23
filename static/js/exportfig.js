// Şekil dışa aktarma: sayfadaki SVG şemalarını (ağaçlar, bağımlılık oku, Zipf) açık renkli, bağımsız SVG ya da PNG olarak indirir.
// Kullanım: .fig-box içindeki bir düğme data-export="svg" | "png" ve data-name="dosya-adı" taşır; kutudaki ilk svg.pt / svg.dp / svg.zipf dışa aktarılır.
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

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-export]"); if(!b) return;
  const svg = b.closest(".fig-box")?.querySelector("svg.pt, svg.dp, svg.zipf");
  if(!svg){ toast("Dışa aktarılacak şekil yok"); return; }
  const name = (b.dataset.name || "sekil").replace(/[^\w.-]+/g, "_");
  try{
    const s = standalone(svg);
    if(b.dataset.export === "svg") save(new Blob([s.xml], {type:"image/svg+xml"}), name + ".svg");
    else save(await pngOf(s), name + ".png");
    toast(`${name}.${b.dataset.export} indirildi`);
  }catch(_){ toast("Şekil dışa aktarılamadı"); }
});
