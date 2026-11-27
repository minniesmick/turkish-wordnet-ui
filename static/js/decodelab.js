// Kod çözme laboratuvarı: aynı dil modelinden açgözlü arama, ışın araması, tam arama ve top-k örnekleme (DL-7, slayt 28–32). Arayüz modülü.
// Model ya slayttaki ağaçtır ya da yazılan metinden sayılan bigram / trigram (yumuşatmasız).
import {$, $$, esc, registerView} from "./core.js";
import {restore} from "./safe.js";
import {mulberry32} from "./attn.js";
import {BOS, EOS, buildModel, dist} from "./lm.js";
import {SLIDE_TREE, treeNext, greedy, beam, exact, truncate, sampleSeq} from "./decode.js";

const KEY = "wn:decode";
const TEXT = "öğrenci kitabı okudu\nöğrenci kitabı sevdi\nöğrenci dersi dinledi\nhoca dersi anlattı\nhoca kitabı okudu\nkedi sütü içti";
const S = {source:"slide", text:TEXT, n:2, start:"", steps:2, k:2, topk:3, temp:1, seed:7};
const LIMITS = {n:[2, 3], steps:[1, 20], k:[1, 8], topk:[1, 50], temp:[.1, 3], seed:[0, 999999]};
let root = null;

const load = () => { try{ Object.assign(S, restore(S, JSON.parse(localStorage.getItem(KEY)), LIMITS)); }catch(_){} if(!["slide", "text"].includes(S.source)) S.source = "slide"; };
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(_){} };

const words = line => line.toLocaleLowerCase("tr").replace(/<\/?s>/g, " ").replace(/[.,;:!?"“”()]+/g, " ").split(/\s+/).filter(Boolean);
const p4 = x => x >= 1e-4 || x === 0 ? String(+x.toFixed(4)) : x.toExponential(2);
const text = seq => seq.map(w => w === EOS ? "</s>" : w).join(" ");

// seçili kaynağa göre {next, start, shown}; kullanılamıyorsa {error}
function model(){
  if(S.source === "slide") return {next:treeNext(SLIDE_TREE), start:["The"]};
  const sents = S.text.split("\n").slice(0, 500).map(words).filter(s => s.length);
  if(!sents.length) return {error:"Korpus boş. Her satıra bir cümle yaz."};
  const m = buildModel(sents, S.n, {eos:true});
  const next = seq => {
    if(seq.at(-1) === EOS) return [];
    const hist = [...Array(S.n - 1).fill(BOS), ...seq].slice(-(S.n - 1));
    const d = dist(m, hist, {smooth:"none"});
    return d.words.map((w, i) => ({w, p:d.probs[i]}));
  };
  const start = words(S.start).slice(-20);
  if(!next(start).length) return {error:`“${start.join(" ")}” sözcüklerinden sonra ne geleceği korpusta yok. Başlangıcı boş bırak ya da korpusta geçen sözcükler yaz.`};
  return {next, start};
}

const table = (label, head, rows) => `<div class="ng-scroll" role="region" tabindex="0" aria-label="${label}"><table class="ng-tbl"><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr>${rows.join("")}</table></div>`;
const row = (cells, cls = "") => `<tr class="${cls}">${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;

function render(){
  save();
  $("#dcTextBox", root).classList.toggle("hidden", S.source !== "text");
  $$("#dcSource button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.source));
  $$("#dcN button", root).forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === S.n));
  const out = $("#dcOut", root), M = model();
  if(M.error){ out.innerHTML = `<p class="notice warn" role="status">${esc(M.error)}</p>`; return; }

  const g = greedy(M.next, M.start, S.steps), b = beam(M.next, M.start, S.k, S.steps), e = exact(M.next, M.start, S.steps);
  const best = e ? e.p : Math.max(g.p, b.results[0].p);
  const mark = p => Math.abs(p - best) < 1e-12 ? " ★" : "";
  const searches = [
    row(["Açgözlü (greedy)", esc(text(g.seq)), p4(g.p) + (e ? mark(g.p) : "")]),
    ...b.results.map((h, i) => row([i ? "" : `Işın araması (beam, k = ${S.k})`, esc(text(h.seq)), p4(h.p) + (e ? mark(h.p) : "")])),
    e ? row(["Tam arama (MAP)", esc(text(e.seq)), p4(e.p) + " ★"]) : row(["Tam arama (MAP)", '<span class="muted">arama uzayı çok büyük, denenmedi</span>', "–"])
  ];

  const first = M.next(M.start), cut = truncate(first, S.topk, S.temp), rnd = mulberry32(S.seed);
  const all = first.slice().sort((x, y) => y.p - x.p).slice(0, 20), kept = new Map(cut.map(o => [o.w, o.q]));
  const samples = Array.from({length:5}, () => sampleSeq(M.next, M.start, {k:S.topk, temperature:S.temp, steps:S.steps, rnd}));

  out.innerHTML = `
    <h2 class="ng-h">En olası diziyi arama</h2>
    ${table("Arama yöntemlerinin sonuçları", ["Yöntem", "Dizi", "Olasılık"], searches)}
    <p class="ck-meta">★ bu uzunluktaki en yüksek olasılık.</p>
    <p class="ng-formula stu">Dizinin olasılığı adım olasılıklarının çarpımıdır. Açgözlü arama her adımda yalnız en olası sözcüğü alır; ışın araması k diziyi birlikte taşır (k = 1 açgözlü aramadır). Tam arama hepsini dener: uzay üstel büyür (slayt 29–31).</p>
    <div class="stu"><h3 class="ng-h3">Işın aramasının adımları</h3>
    ${table("Işın aramasında her adımda tutulan diziler", ["Adım", "Aday sayısı", "Tutulan diziler (olasılık)"],
      b.trace.map(t => row([t.step, t.candidates, t.kept.map(h => `${esc(text(h.seq))} <small class="muted">(${p4(h.p)})</small>`).join("<br>")])))}</div>

    <h2 class="ng-h">Örnekleme: top-k ve sıcaklık</h2>
    <p class="ck-meta">İlk adımda “${esc(M.start.join(" ") || "cümle başı")}” sonrasının dağılımı${first.length > 20 ? ` (en olası 20 / ${first.length})` : ""}.</p>
    ${table("İlk adımın dağılımı ve top-k sonrası olasılıklar", ["Sözcük", "Model", `top-${S.topk}, T = ${S.temp}`],
      all.map(o => row([esc(text([o.w])), p4(o.p), kept.has(o.w) ? p4(kept.get(o.w)) : '<span class="muted">atıldı</span>'])))}
    <p class="ng-formula stu">En olası k sözcük kalır, sonra softmax(ln p / T) ile yeniden ağırlıklandırılır. T &lt; 1 dağılımı sivriltir, T &gt; 1 düzleştirir (slayt 32).</p>
    <h3 class="ng-h3">Beş örnek (tohum ${S.seed})</h3>
    ${table("Örneklenen diziler", ["Dizi", "Modeldeki olasılığı"], samples.map(s => row([esc(text(s.seq)), p4(s.p)])))}`;
}

const num = (id, label, key, step = 1) => `<label class="muted" style="font-size:.88rem">${label} <input id="${id}" class="dp-num" type="number" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" step="${step}" value="${S[key]}"></label>`;

function mount(){
  root = $("#v-decode");
  load();
  root.innerHTML = `<div class="page wide">
    <h1 class="page-title">Kod çözme</h1>
    <p class="lesson-intro">Dil modeli her adımda sonraki sözcüğün olasılıklarını verir; hangisinin seçileceği ayrı bir karardır. <span class="stu">DL-7, slayt 28–32.</span></p>
    <div class="ng-ctl">
      <div class="seg" id="dcSource" role="group" aria-label="Model"><button data-v="slide">Slayttaki ağaç</button><button data-v="text">Kendi metnim</button></div>
    </div>
    <div id="dcTextBox">
      <textarea class="ta" id="dcText" rows="5" spellcheck="false" maxlength="20000" aria-label="Korpus, her satır bir cümle">${esc(S.text)}</textarea>
      <div class="ng-ctl">
        <div class="seg" id="dcN" role="group" aria-label="Model derecesi"><button data-v="2">Bigram</button><button data-v="3">Trigram</button></div>
        <label class="field sm" style="flex:1 1 220px">Başlangıç<input id="dcStart" type="text" autocomplete="off" spellcheck="false" maxlength="200" placeholder="boş: cümle başı" value="${esc(S.start)}"></label>
      </div>
    </div>
    <div class="ng-ctl">${num("dcSteps", "en çok adım", "steps")} ${num("dcK", "ışın genişliği k", "k")} ${num("dcTopk", "top-k", "topk")} ${num("dcTemp", "sıcaklık T", "temp", .1)} ${num("dcSeed", "tohum", "seed")}</div>
    <div id="dcOut"></div>
  </div>`;
  $("#dcSource", root).addEventListener("click", e => { const v = e.target.closest("button")?.dataset.v; if(v){ S.source = v; if(v === "text" && S.steps < 6){ S.steps = 6; $("#dcSteps", root).value = 6; } render(); } });
  $("#dcN", root).addEventListener("click", e => { const v = e.target.closest("button")?.dataset.v; if(v){ S.n = +v; render(); } });
  $("#dcText", root).addEventListener("input", e => { S.text = e.target.value; render(); });
  $("#dcStart", root).addEventListener("input", e => { S.start = e.target.value; render(); });
  for(const [id, key] of [["dcSteps", "steps"], ["dcK", "k"], ["dcTopk", "topk"], ["dcTemp", "temp"], ["dcSeed", "seed"]])
    $("#" + id, root).addEventListener("change", e => { S[key] = +e.target.value; render(); });
}

registerView("decode", {enter:() => { if(!root) mount(); render(); }});
