// UML sınıf diyagramı SVG üreteci (saf JS, DOM yok): bildirimli bir tanımdan (diagrams.js) SVG metni üretir.
// Yapay zekâ gerekmez: aynı tanım uygulamada (temaya uyumlu), HTML raporlarında ve scripts/make_diagrams.mjs ile dosya olarak çıkar.
// Görünüm kuralları diagram-design skill'inin sınıf diyagramı türünden (type-uml-class) ve `wordnet-ui` stil profilinden gelir:
// 4px ızgara, rx=6 kutular, ortogonal yuvarlak dirsekler, sahip ucunda dolu elmas, çarpan etiketleri maskeli, en çok bir odak (accent) sınıf.
import {escH as esc} from "./reportdoc.js";

const LITERAL = {paper: "#f5f7fb", ink: "#0d1220", muted: "#3b4357", accent: "#2b3bd6", sans: "'Schibsted Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', ui-monospace, monospace",
  tint: "rgba(43,59,214,0.04)", tint2: "rgba(43,59,214,0.10)", tintLine: "rgba(43,59,214,0.40)", div: "rgba(13,18,32,0.22)", rule: "rgba(13,18,32,0.10)", box: "#ffffff"};
// uygulamanın CSS değişkenleri (açık/koyu tema kendiliğinden)
const VARS = {paper: "var(--paper)", ink: "var(--ink)", muted: "var(--ink-2)", accent: "var(--spot)", sans: "var(--font-ui)", mono: "var(--font-mono)",
  tint: "color-mix(in srgb, var(--spot) 4%, transparent)", tint2: "color-mix(in srgb, var(--spot) 12%, transparent)", tintLine: "color-mix(in srgb, var(--spot) 45%, transparent)",
  div: "color-mix(in srgb, var(--ink) 22%, transparent)", rule: "color-mix(in srgb, var(--ink) 10%, transparent)", box: "var(--page)"};

// boş bölme çizilmez; her satır 20px, bölme dolgusu 12px
const parts = c => { const ha = c.attrs.length ? 20 * c.attrs.length + 12 : 0, ho = c.ops.length ? 20 * c.ops.length + 12 : 0; return {ha, ho, h: 40 + ha + ho}; };
function boxSvg(c, K){
  const {ha, ho, h} = parts(c), {x, y, w} = c, o = [];
  const dv = c.focal ? K.tintLine : K.div;
  if(c.focal){
    o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${K.tint}" stroke="${K.accent}" stroke-width="1"/>`);
    o.push(`<path d="M ${x},${y + 40} V ${y + 6} Q ${x},${y} ${x + 6},${y} H ${x + w - 6} Q ${x + w},${y} ${x + w},${y + 6} V ${y + 40} Z" fill="${K.tint2}"/>`);
  }else o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${K.box}" stroke="${K.ink}" stroke-width="1"/>`);
  o.push(`<line x1="${x}" y1="${y + 40}" x2="${x + w}" y2="${y + 40}" stroke="${dv}" stroke-width="1"/>`);
  if(ha && ho) o.push(`<line x1="${x}" y1="${y + 40 + ha}" x2="${x + w}" y2="${y + 40 + ha}" stroke="${dv}" stroke-width="1"/>`);
  if(c.stereotype) o.push(`<text x="${x + w / 2}" y="${y + 14}" fill="${c.focal ? K.accent : K.muted}" font-size="8" font-family="${K.mono}" text-anchor="middle" letter-spacing="0.08em">${esc(c.stereotype)}</text>`);
  o.push(`<text x="${x + w / 2}" y="${y + 28}" fill="${K.ink}" font-size="12" font-weight="600" font-family="${K.sans}" text-anchor="middle">${esc(c.name)}</text>`);
  c.attrs.forEach((a, i) => o.push(`<text x="${x + 16}" y="${y + 40 + 20 * i + 20}" fill="${K.ink}" font-size="9" font-family="${K.mono}">${esc(a)}</text>`));
  c.ops.forEach((a, i) => o.push(`<text x="${x + 16}" y="${y + 40 + ha + 20 * i + 20}" fill="${K.ink}" font-size="9" font-family="${K.mono}">${esc(a)}</text>`));
  return {svg: o.join("\n      "), h};
}

// ortogonal, köşeleri yuvarlak (r = 8) yol
function pathOf(pts, r = 8){
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for(let i = 1; i < pts.length - 1; i++){
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1], sg = v => (v > 0) - (v < 0);
    d += ` L ${x1 - sg(x1 - x0) * r},${y1 - sg(y1 - y0) * r} Q ${x1},${y1} ${x1 + sg(x2 - x1) * r},${y1 + sg(y2 - y1) * r}`;
  }
  return d + ` L ${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
}
const KIND = {
  inheritance: {dash: "", start: "", end: "tri", color: "ink"}, realization: {dash: "5,4", start: "", end: "tri", color: "ink"},
  composition: {dash: "", start: "dia-f", end: "", color: "muted"}, aggregation: {dash: "", start: "dia-h", end: "", color: "muted"},
  association: {dash: "", start: "", end: "open", color: "muted"}, dependency: {dash: "4,3", start: "", end: "open", color: "muted"}
};
const LEGEND = [["inheritance", "Kalıtım"], ["realization", "Gerçekleme"], ["composition", "Bileşim · sahip olur"], ["aggregation", "Toplama · içerir"], ["association", "İlişki"], ["dependency", "Bağımlılık · kullanır"]];

export function umlSvg(spec, {theme = "vars", idp = "uml"} = {}){
  const K = theme === "light" ? LITERAL : VARS, W = spec.width || 980, bottom = Math.max(...spec.classes.map(c => c.y + parts(c).h));
  const legendY = bottom + 32, H = legendY + 56;
  const mark = (id, inner) => `<marker id="${idp}-${id}" ${inner}</marker>`;
  const defs = [
    mark("tri", `markerWidth="16" markerHeight="12" refX="15" refY="6" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0 0, 16 6, 0 12" fill="${K.paper}" stroke="${K.ink}" stroke-width="1"/>`),
    mark("dia-f", `markerWidth="18" markerHeight="10" refX="0" refY="5" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0 5, 9 0, 18 5, 9 10" fill="${K.ink}"/>`),
    mark("dia-h", `markerWidth="18" markerHeight="10" refX="0" refY="5" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0 5, 9 0, 18 5, 9 10" fill="${K.paper}" stroke="${K.ink}" stroke-width="1"/>`),
    mark("open", `markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4 L0,8" fill="none" stroke="${K.muted}" stroke-width="1"/>`)
  ].join("\n        ");
  const edge = e => { const k = KIND[e.kind || "composition"], col = K[k.color];
    return `<path d="${pathOf(e.pts)}" fill="none" stroke="${col}" stroke-width="1"${k.dash ? ` stroke-dasharray="${k.dash}"` : ""}${k.start ? ` marker-start="url(#${idp}-${k.start})"` : ""}${k.end ? ` marker-end="url(#${idp}-${k.end})"` : ""}/>`; };
  const label = l => { const w = l.w || 12 + 6 * (String(l.t).length - 1);
    return `<rect x="${l.x - w / 2}" y="${l.y - 9}" width="${w}" height="12" rx="2" fill="${K.paper}"/><text x="${l.x}" y="${l.y}" fill="${K.ink}" font-size="8" font-family="${K.mono}" text-anchor="middle" font-weight="600">${esc(l.t)}</text>`; };
  const legend = LEGEND.map(([k, t], i) => { const x = 40 + i * (900 / 6), kk = KIND[k];
    return `<line x1="${x}" y1="${legendY + 32}" x2="${x + 28}" y2="${legendY + 32}" stroke="${K[kk.color]}" stroke-width="1"${kk.dash ? ` stroke-dasharray="${kk.dash}"` : ""}${kk.start ? ` marker-start="url(#${idp}-${kk.start})"` : ""}${kk.end ? ` marker-end="url(#${idp}-${kk.end})"` : ""}/><text x="${x + 36}" y="${legendY + 36}" fill="${K.muted}" font-size="8.5" font-family="${K.sans}">${t}</text>`; }).join("\n      ");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${idp}-t ${idp}-d" class="uml-svg">
      <title id="${idp}-t">${esc(spec.title)}</title>
      <desc id="${idp}-d">${esc(spec.desc)}</desc>
      <defs>
        ${defs}
      </defs>
      <rect width="100%" height="100%" fill="${K.paper}"/>
      ${spec.edges.map(edge).join("\n      ")}
      ${spec.edges.flatMap(e => e.labels || []).map(label).join("\n      ")}
      ${spec.classes.map(c => boxSvg(c, K).svg).join("\n      ")}
      <line x1="40" y1="${legendY}" x2="${W - 40}" y2="${legendY}" stroke="${K.rule}" stroke-width="0.8"/>
      <text x="40" y="${legendY + 16}" fill="${K.muted}" font-size="8" font-family="${K.mono}" letter-spacing="0.18em">LEGEND · İLİŞKİLER</text>
      ${legend}
    </svg>`;
}
