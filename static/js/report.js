// "HTML rapor indir": açık laboratuvar görünümünün o anki hâlini (ayarlar + tablolar + şemalar) tek dosyalık, internetsiz açılan bir rapora çevirir.
// Stil ve yazı tipleri (woff2) dosyaya gömülür. Yalnızca ekranda görünen içerik alınır (kapalı "ek" bölümler girmez). Belge kabuğu reportdoc.js'te.
import {$, $$, state, VIEW_LABEL, toast} from "./core.js";
import {inlineFonts, reportDocument} from "./reportdoc.js";

// Veri/laboratuvar görünümleri. Ara ve Harita (kenar kâğıdı, tuval) ile Ders kapsam dışı.
export const REPORT_VIEWS = new Set(["relate", "wsd", "roles", "frames", "morph", "disamb", "parse", "deps", "corpus", "ngram", "nn", "tab", "tok", "emb", "rnn", "attn", "tfm", "decode", "eval", "method"]);
export const canReport = v => REPORT_VIEWS.has(v);

let CSS_CACHE = null;
async function fetchText(u){ const r = await fetch(u); if(!r.ok) throw new Error(u + " alınamadı"); return r.text(); }
async function b64(u){
  const buf = new Uint8Array(await (await fetch(new URL(u, location.origin + "/fonts/"))).arrayBuffer());
  let s = ""; for(let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}
async function pageCss(){
  if(CSS_CACHE) return CSS_CACHE;
  const [app, fonts] = await Promise.all([fetchText("/css/app.css"), fetchText("/fonts/fonts.css")]);
  CSS_CACHE = await inlineFonts(app, b64, {importCss: fonts});
  return CSS_CACHE;
}

const labelOf = el => {
  const own = el.getAttribute("aria-label") || el.getAttribute("title");
  const lab = el.closest("label");
  const txt = lab ? [...lab.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(n.tagName) && !n.querySelector?.("input,select,textarea"))).map(n => n.textContent).join(" ").replace(/\s+/g, " ").trim() : "";
  return txt || own || el.getAttribute("placeholder") || el.id || "";
};
const valueOf = el => {
  if(el.tagName === "SELECT") return el.selectedOptions[0]?.textContent.trim() || "";
  if(el.type === "checkbox") return el.checked ? "açık" : "kapalı";
  if(el.type === "radio") return el.checked ? "seçili" : "";
  return el.value;
};
const shown = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

// Ekrandaki bölümün güvenli, durağan bir kopyasını ve ayar listesini üretir
export function snapshot(section){
  const settings = [], seen = new Set();
  const fields = [...section.querySelectorAll("input, select, textarea")];
  const marks = [...section.querySelectorAll("*")].filter(el => !shown(el));
  marks.forEach(el => el.setAttribute("data-rep-hide", ""));
  fields.forEach((el, i) => el.setAttribute("data-rep-f", i));
  const canv = [...section.querySelectorAll("canvas")]; canv.forEach((c, i) => c.setAttribute("data-rep-c", i));
  let clone;
  try{
    clone = section.cloneNode(true);
    for(const el of fields){
      if(!shown(el) || el.type === "hidden" || el.type === "range") continue;
      const k = labelOf(el), v = String(valueOf(el) ?? "").trim();
      if(!v || v.length > 160 || el.tagName === "TEXTAREA" && v.includes("\n")) continue;
      const key = k + "|" + v; if(seen.has(key)) continue; seen.add(key); settings.push([k || "Alan", v]);
    }
    // alanlar → değer metni; kanvaslar → görüntü
    clone.querySelectorAll("[data-rep-f]").forEach(c => { const o = fields[+c.dataset.repF], v = valueOf(o); const s = document.createElement(o.tagName === "TEXTAREA" ? "pre" : "span"); s.className = "rep-val"; s.textContent = v; c.replaceWith(s); });
    clone.querySelectorAll("[data-rep-c]").forEach(c => { const o = canv[+c.dataset.repC]; try{ const im = document.createElement("img"); im.src = o.toDataURL("image/png"); im.width = o.clientWidth; im.alt = "şekil"; c.replaceWith(im); }catch(_){ c.remove(); } });
  }finally{
    marks.forEach(el => el.removeAttribute("data-rep-hide")); fields.forEach(el => el.removeAttribute("data-rep-f")); canv.forEach(c => c.removeAttribute("data-rep-c"));
  }
  clone.querySelectorAll("[data-rep-hide]").forEach(el => el.remove());
  // ayar satırları ve seçim düğmeleri üstteki "Ayarlar" kutusuna taşındı; çift görünmesin
  for(const sg of section.querySelectorAll(".seg")){ if(!shown(sg)) continue; const on = [...sg.querySelectorAll("button")].filter(b => b.getAttribute("aria-pressed") === "true" && shown(b)).map(b => b.textContent.trim()).join(", "); if(on) settings.push([sg.getAttribute("aria-label") || "Seçim", on]); }
  clone.querySelectorAll(".ng-ctl, .seg, [data-rep-skip]").forEach(el => el.remove());   // data-rep-skip: yalnızca ayar satırlarına ait başlık
  clone.querySelectorAll("script, style, link, dialog, .section-index, .nl, .ext-toggle, [data-ext-toggle], .fig-actions, .ck-tool").forEach(el => el.remove());
  clone.querySelectorAll("button").forEach(b => {
    const pressed = b.getAttribute("aria-pressed");
    const act = b.matches(".btn, [data-copy], [data-export], [data-export-tbl], [data-act], [data-learn], [data-nfa], [data-sh], [data-go], [data-preset], [data-ex]");
    if(act || (b.closest(".seg") && pressed !== "true")){ b.remove(); return; }
    const s = document.createElement("span"); s.className = "rep-btn"; if(pressed) s.setAttribute("aria-pressed", pressed); s.innerHTML = b.innerHTML; b.replaceWith(s);
  });
  clone.querySelectorAll("a").forEach(a => { if(a.matches("[data-go], [href^='#']")) a.remove(); else { const s = document.createElement("span"); s.innerHTML = a.innerHTML; a.replaceWith(s); } });
  clone.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  clone.querySelectorAll("[tabindex]").forEach(el => el.removeAttribute("tabindex"));
  clone.querySelectorAll("[onclick],[onchange],[oninput],[ontoggle]").forEach(el => ["onclick", "onchange", "oninput", "ontoggle"].forEach(a => el.removeAttribute(a)));
  return {html: clone.innerHTML, settings};
}

export async function buildReport(v = state.v, fileName = "rapor.html"){
  const section = $("#v-" + v);
  if(!section) throw new Error("görünüm bulunamadı");
  const [css, snap] = await Promise.all([pageCss(), Promise.resolve(snapshot(section))]);
  const title = $(".page-title", section)?.textContent.trim() || VIEW_LABEL[v] || v;
  return reportDocument({title, subtitle: `${VIEW_LABEL[v] || v} · ${location.pathname}${location.search}`, settings: snap.settings, body: snap.html, css, footer: "Rapor, ekrandaki sonucun o anki görüntüsüdür", fileName});
}

const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const fileName = v => `rapor-${v}-${stamp()}.html`;
const busy = on => ["#reportBtn", "#reportDlBtn"].forEach(id => { const b = $(id); if(on) b?.setAttribute("aria-busy", "true"); else b?.removeAttribute("aria-busy"); });

// Raporu indirmeden yeni sekmede göster. Pencere, tıklama anında (açılır pencere engeline takılmamak için) eşzamanlı açılır; rapor hazır olunca yüklenir.
export async function openReport(){
  if(!canReport(state.v)){ toast("Bu görünüm için rapor yok"); return; }
  const w = window.open("", "_blank");
  if(!w){ toast("Tarayıcı yeni sekmeyi engelledi; rapor indiriliyor"); return downloadReport(); }
  w.document.write('<!doctype html><meta charset="utf-8"><title>Rapor hazırlanıyor…</title><body style="font:16px system-ui;padding:3em;color:#3b4357">Rapor hazırlanıyor…</body>');
  busy(true);
  try{
    const html = await buildReport(state.v, fileName(state.v));
    w.location.replace(URL.createObjectURL(new Blob([html], {type: "text/html;charset=utf-8"})));   // blob adresi sekmede açık kaldıkça geçerli
  }catch(e){ w.close(); toast("Rapor oluşturulamadı: " + e.message); }
  finally{ busy(false); }
}

export async function downloadReport(){
  if(!canReport(state.v)){ toast("Bu görünüm için rapor yok"); return; }
  busy(true);
  try{
    const name = fileName(state.v), html = await buildReport(state.v, name);
    const url = URL.createObjectURL(new Blob([html], {type: "text/html;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast(`Rapor indirildi (${Math.round(html.length / 1024)} KB)`);
  }catch(e){ toast("Rapor oluşturulamadı: " + e.message); }
  finally{ busy(false); }
}
