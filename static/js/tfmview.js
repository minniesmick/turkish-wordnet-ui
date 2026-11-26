// Transformer bloğunun HTML üretimi (saf JS; DOM ve core.js yok). transformer.js (arayüz) ve scripts/report_tfm.mjs (komut satırı raporu) kullanır.
import {escH as esc} from "./reportdoc.js";
import {umlSvg} from "./umlsvg.js";
import {TRANSFORMER_UML} from "./diagrams.js";

export const VOCAB = ["<s>", "the", "a", "student", "book", "read", "carefully", "</s>"];
export const words = t => (String(t).toLocaleLowerCase("tr").match(/<\/?s>|[\p{L}\p{M}\p{N}]+/gu) || []).slice(0, 8);
const f2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

// matris tablosu: işaretli değerler (mavi ≥ 0, gri < 0) ya da olasılıklar (0–1). attn verilirse hücreler tıklanabilir (kenar kâğıdı hesabı açar).
function mat(M, rows, cols, {prob = false, mask = false, cap = "", attn = null} = {}){
  const cell = (v, i, j) => {
    if(mask && j > i) return `<td class="tf-m" title="maskelendi: gelecek konum">·</td>`;
    const a = prob ? Math.round(Math.max(0.05, v) * 70) : Math.round(Math.min(1, Math.abs(v) / 2.2) * 55);
    const bg = prob || v >= 0 ? `color-mix(in srgb,var(--spot) ${a}%,transparent)` : `color-mix(in srgb,var(--ink-3) ${a}%,transparent)`;
    const hit = attn ? ` class="tf-hit" tabindex="0" data-tf="${attn.kind}" data-h="${attn.h}" data-i="${i}" data-j="${j}" title="Hesabı göster"` : "";
    return `<td${hit} style="background:${bg}">${f2(v)}</td>`;
  };
  return `<div class="ng-scroll" role="region" tabindex="0" aria-label="${esc(cap || "matris")}, yatay kaydırılabilir"><table class="ng-tbl tf-tbl">${cap ? `<caption>${esc(cap)}</caption>` : ""}<tr><th></th>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${M.map((r, i) => `<tr><th>${esc(rows[i])}</th>${Array.from(r).map((v, j) => cell(v, i, j)).join("")}</tr>`).join("")}</table></div>`;
}
const dims = n => Array.from({length: n}, (_, i) => `d${i + 1}`);
const step = (n, title, text) => `<h2 class="ng-h">${n} · ${title}</h2>${text ? `<p class="ck-meta" style="margin:0 0 8px">${text}</p>` : ""}`;

function normTable(an, toks){
  return `<div class="ng-scroll" role="region" tabindex="0" aria-label="Add ve LayerNorm istatistikleri"><table class="ng-tbl tf-tbl"><tr><th>Token</th><th>x + alt-katman: ortalama</th><th>varyans</th><th>LayerNorm sonrası: ortalama</th><th>varyans</th></tr>${an.sum.map((_, i) => `<tr><th>${esc(toks[i])}</th><td>${f2(an.before[i].mean)}</td><td>${f2(an.before[i].variance)}</td><td>${f2(an.after[i].mean)}</td><td>${f2(an.after[i].variance)}</td></tr>`).join("")}</table></div>`;
}
function headsHTML(attn, qt, kt, kind, {mask = false, report = false} = {}){
  return attn.heads.map((h, i) => mat(h.weights, qt, kt, {prob: true, mask, attn: report ? null : {kind, h: i}, cap: `Baş ${i + 1}: dikkat ağırlıkları (satır = sorgu, sütun = anahtar; her satırın toplamı 1${report ? "" : "; bir hücreye tıklayınca hesabı açılır"})`})).join("");
}

export function tfmSettings(S, R){
  return [["Kaynak cümle", R.src.join(" ")], ...(R.tgt ? [["Decoder girdisi", R.tgt.join(" ")]] : []), ["d_model", R.dModel], ["Baş sayısı", `${R.numHeads} (d_k = ${R.dk})`], ["d_ff", R.dFF], ["Tohum", S.seed], ["Konumsal kodlama", S.usePos ? "açık" : "kapalı"]];
}

export function tfmBody(R, S, {report = false} = {}){
  const src = R.src, tgt = R.tgt || [], e = R.enc;
  let h = `<div class="chips" aria-label="Boyutlar"><span class="chip">n = ${src.length} token</span><span class="chip">d_model = ${R.dModel}</span><span class="chip">h = ${R.numHeads} baş</span><span class="chip">d_k = d_model / h = ${R.dk}</span><span class="chip">d_ff = 4 · d_model = ${R.dFF}</span></div>
    <div class="notice" style="margin-top:10px">Ağırlıklar <b>eğitilmemiş</b>, tohumdan rastgele üretilir. Sayılar anlam taşımaz; gerçek olan işlemin kendisi: boyutlar, adımlar ve her adımın girdi/çıktısı. Eğitilmiş bir modelde (BERT, GPT) aynı adımlar çok daha büyük matrislerle çalışır.</div>`;
  h += step(1, "Girdi: embedding + konumsal kodlama", `Her token bir ${R.dModel} boyutlu vektöre çevrilir (aynı sözcük aynı vektör), üstüne konuma göre sin/cos deseni eklenir ${S.usePos ? "" : "(şu an kapalı)"}. Dikkat sırayı bilmediği için konumsal kodlama şart.`);
  h += mat(R.emb, src, dims(R.dModel), {cap: "Embedding"}) + (S.usePos ? mat(R.pe, src, dims(R.dModel), {cap: "Konumsal kodlama (sin / cos)"}) : "") + mat(R.X, src, dims(R.dModel), {cap: "X = embedding + konumsal kodlama"});
  h += step(2, "Çok başlı öz-dikkat", `Her baş kendi W_Q, W_K, W_V matrisleriyle ${R.dk} boyutlu Q, K, V üretir; softmax(QKᵀ / √${R.dk}) ağırlıklarıyla V'leri toplar. Başlar birleştirilir (concat) ve W_O ile d_model boyutuna döner.`);
  h += headsHTML(e.attn, src, src, "enc", {report}) + mat(e.attn.concat, src, dims(R.dModel), {cap: `Başların birleşimi (n × ${R.dModel})`}) + mat(e.attn.out, src, dims(R.dModel), {cap: "W_O sonrası: dikkat çıktısı"});
  h += step(3, "Add & Norm (1)", "Residual bağlantı: girdi ile dikkat çıktısı toplanır, sonra her token satırı LayerNorm ile ortalaması 0, varyansı 1 olacak şekilde ölçeklenir.");
  h += normTable(e.an1, src) + mat(e.an1.out, src, dims(R.dModel), {cap: "LayerNorm(X + dikkat)"});
  h += step(4, "İleri besleme (FFN) ve Add & Norm (2)", `Her konuma ayrı ayrı: ${R.dModel} → ${R.dFF} (ReLU) → ${R.dModel}. Sonra yine residual + LayerNorm. Bu, bir encoder bloğunun çıkışıdır; gerçek modellerde 6 (Transformer) ya da 12 (BERT-base) blok üst üste gelir.`);
  h += mat(e.ffn.out, src, dims(R.dModel), {cap: "FFN çıktısı"}) + normTable(e.an2, src) + mat(e.output, src, dims(R.dModel), {cap: "Encoder çıkışı"});
  if(R.dec){
    const d = R.dec;
    h += step(5, "Decoder: maskeli öz-dikkat", "Decoder yalnızca önceki çıktı tokenlarını görür: gelecek konumlar −∞ ile maskelenir, softmax sonrası ağırlıkları 0 olur (· işaretli hücreler). Bu, metin üretirken hile yapmayı engeller.");
    h += headsHTML(d.self, tgt, tgt, "dself", {mask: true, report});
    h += step(6, "Encoder-decoder dikkati", "Sorgular decoder'dan, anahtar ve değerler encoder çıkışından gelir: her çıktı tokenı, kaynak cümlenin hangi sözcüklerine bakacağına karar verir.");
    h += headsHTML(d.cross, tgt, src, "cross", {report}) + mat(d.output, tgt, dims(R.dModel), {cap: "Decoder bloğunun çıkışı (maskeli dikkat, çapraz dikkat ve FFN sonrası)"});
    const top = R.final.ranked, mx = top[0].p || 1;
    h += step(7, "Linear + softmax: sonraki sözcük", `Son konumun (“${esc(tgt[tgt.length - 1])}”) vektörü bir Linear katmanla sözlük boyutuna (${R.vocab.length}) çıkarılır, softmax olasılık verir. En yüksek olasılıklı sözcük seçilirse bu <b>greedy</b> kodlamadır.`);
    h += `<div class="tf-bars" role="list" aria-label="Sonraki sözcük olasılıkları">${top.map(t => `<div role="listitem"><span>${esc(t.w)}</span><div class="meter"><i><b style="width:${(t.p / mx) * 100}%"></b></i></div><span>${t.p.toFixed(3)}</span></div>`).join("")}</div>`;
  }
  h += step(R.dec ? 8 : 5, "Sınıf yapısı (UML)", "Bu laboratuvarın arkasındaki nesne modeli: kim kimin sahibi, kaç tane. Diyagram bildirimli bir tanımdan üretilir (diagrams.js), yapay zekâ gerekmez.") + `<div class="ng-scroll" role="region" tabindex="0" aria-label="Transformer sınıf diyagramı, yatay kaydırılabilir">${umlSvg(TRANSFORMER_UML, {theme: "vars"})}</div>`;
  h += `<div class="stu"><h2 class="ng-h">Formüller</h2><p class="ck-meta">Dikkat: softmax(Q Kᵀ / √d_k) V. Çok başlı: concat(baş₁ … baş_h) W_O. Add &amp; Norm: LayerNorm(x + Alt-katman(x)); LayerNorm(x) = (x − μ) / √(σ² + ε). FFN(x) = max(0, x W₁ + b₁) W₂ + b₂. Konumsal kodlama: PE(pos, 2i) = sin(pos / 10000^(2i/d)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d)). Slayt 12–29 (DL-6) ve Jay Alammar'ın “The Illustrated Transformer” yazısı.</p></div>`;
  return h;
}

// Bir dikkat hücresinin hesabı (kenar kâğıdı): q·k → ölçekleme → softmax → ağırlıklı toplam
export function cellDetail(R, kind, hIdx, i, j){
  const pick = {enc: [R.enc.attn, R.src, R.src], dself: [R.dec?.self, R.tgt, R.tgt], cross: [R.dec?.cross, R.tgt, R.src]}[kind];
  if(!pick || !pick[0]) return null;
  const [attn, qt, kt] = pick, hd = attn.heads[hIdx];
  const dk = hd.Q[0].length, v = a => `[${Array.from(a).map(f2).join(", ")}]`;
  const allowed = kind === "dself" ? i + 1 : kt.length;           // maskeli öz-dikkatte yalnızca ≤ i konumları
  const terms = hd.Q[i].map((q, d) => `${f2(q)}·${f2(hd.K[j][d])}`).join(" + ");
  const raw = hd.Q[i].reduce((s, q, d) => s + q * hd.K[j][d], 0);
  const rows = Array.from({length: allowed}, (_, k) => `<tr class="${k === j ? "now" : ""}"><th>${esc(kt[k])}</th><td>${f2(hd.scores[i][k])}</td><td>${hd.weights[i][k].toFixed(3)}</td></tr>`).join("");
  const contrib = Array.from({length: allowed}, (_, k) => `${hd.weights[i][k].toFixed(2)} × ${esc(kt[k])}`).join(" + ");
  const title = `${qt[i]} → ${kt[j]}`;
  const sub = `${kind === "enc" ? "Encoder öz-dikkati" : kind === "dself" ? "Decoder maskeli öz-dikkati" : "Encoder-decoder dikkati"} · baş ${hIdx + 1}`;
  const body = `<div class="ss"><h3>Sorgu ve anahtar</h3>
    <p class="def"><b>q</b> (“${esc(qt[i])}”) = ${v(hd.Q[i])}</p><p class="def"><b>k</b> (“${esc(kt[j])}”) = ${v(hd.K[j])}</p>
    <p class="up">q · k = ${terms} = <b>${f2(raw)}</b><br>÷ √d_k = ÷ √${dk} = <b>${f2(raw / Math.sqrt(dk))}</b> (ölçekli skor)</p></div>
    <div class="ss"><h3>Softmax</h3><p class="up">“${esc(qt[i])}” sorgusunun tüm anahtarlara skorları${kind === "dself" ? " (yalnızca bu konuma kadar olanlar; gerisi maskeli)" : ""} ve softmax ağırlıkları:</p>
    <div class="ng-scroll"><table class="ng-tbl tf-tbl"><tr><th>Anahtar</th><th>skor</th><th>ağırlık</th></tr>${rows}</table></div>
    <p class="up">Ağırlık = exp(skor) / Σ exp(skor) = <b>${hd.weights[i][j].toFixed(3)}</b></p></div>
    <div class="ss"><h3>Ağırlıklı toplam</h3><p class="up">z = ${contrib}<br>(her terim, tokenın V vektörüyle çarpılır)</p><p class="def"><b>z</b> = ${v(hd.output[i])}</p></div>
    <p class="up">Bu baş yalnızca ${dk} boyutlu bir dilim görür; başların çıktıları birleştirilip W_O ile d_model boyutuna çevrilir.</p>`;
  return {title, sub, body};
}
