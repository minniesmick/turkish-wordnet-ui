// "FSM yolunu kendin yaz" (Lecture 2, Sample.pdf): bir çözümleme verilir, Oflazer durum makinesindeki durum dizisini yaz, sonra kontrol et.
// Yol hesabı fsm.js içinde; burada yalnızca arayüz var. Morfoloji sekmesinin Öğrenci kipi bölümü olarak bağlanır.
import {$, esc} from "./core.js";
import {trace, stepStates, STATE_NAME, END, POOL, VERIFIED, checkPath, sampleLines, edgeTable, edgesFrom} from "./fsm.js";

const FQ = {src:"pool", own:"uyu+Verb+Prog1+A3sg+Cop", i:-1, typed:"", checked:null, hint:0, hintMsg:"", reveal:false, counted:false, score:0, n:0};
let box = null, cur = null;
const nm = s => `${s} ${STATE_NAME[s] || ""}`.trim();
const pick = () => { let i; do i = Math.floor(Math.random() * POOL.length); while(POOL.length > 1 && i === FQ.i); return i; };

function fresh(){
  FQ.typed = ""; FQ.checked = null; FQ.hint = 0; FQ.hintMsg = ""; FQ.reveal = false; FQ.counted = false;
  const lex = FQ.src === "pool" ? POOL[FQ.i < 0 ? (FQ.i = pick()) : FQ.i] : FQ.own.trim();
  if(!lex){ cur = null; return; }
  if(!/^[^+\s]+(\+[^+\s]+)+$/.test(lex.replace(/\^DB/g, ""))){ cur = {lex, err:"Çözümleme “kök+Etiket+Etiket” biçiminde olmalı (örn. uyu+Verb+Prog1+A3sg+Cop)."}; return; }
  const t = trace(lex);
  cur = t.ok ? {lex, t, want:stepStates(t)} : {lex, err:t.reason};
}
const edgesText = st => [...new Set(edgesFrom(st))].map(nm).join(" · ") || "çıkan kenar yok (bitiş durumu)";

function mapHTML(){
  const rows = edgeTable().map(r => `<tr><td><b>${r.from}</b> <small class="muted">${esc(STATE_NAME[r.from] || "")}</small>${END.has(+r.from) ? ' <small class="muted">· bitiş</small>' : ""}</td><td>${r.to.map(g => `→ <b>${g.to}</b> <small class="muted">${esc(STATE_NAME[g.to] || "")}</small>${END.has(+g.to) ? ' <small class="muted">(bitiş)</small>' : ""}: ${g.items.map(x => `${esc(x.on || "ε")} <small class="muted">${esc(x.tag || "0")}${x.silent && x.tag !== "0" ? " (sessiz)" : ""}${x.cond ? ` · ${esc(x.cond)} ise` : ""}${x.assumed ? " · varsayım" : ""}</small>`).join(" · ")}`).join("<br>")}</td></tr>`).join("");
  return `<details class="fq-map"><summary>Durum haritası <small class="muted">şekil yerine kenar tablosu</small></summary><div class="ng-scroll"><table class="ng-tbl"><thead><tr><th>Durum</th><th>Çıkan kenarlar (ek ve etiketi)</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="ng-formula" style="margin:6px 0 0">Kenarlar Nouns.pdf, Verbs1.pdf ve Verbs2.pdf şekillerinden elle kodlandı. ε: ek yok (sıfır morfem), sessiz: belirteç tüketmeden geçilen kenar.</p></details>`;
}
function feedback(){
  const r = FQ.checked;
  if(!r) return "";
  const typedChips = `<div class="chips" style="margin:10px 0 4px">${r.cells.map((c, i) => `<span class="chip fq-c ${c.ok ? "ok" : "no"}" style="cursor:default"><b>${esc(c.v)}</b>${c.ok ? ` <small>${esc(STATE_NAME[c.v] || "")}</small>` : ""}</span>`).join('<span class="muted">→</span>')}</div>`;
  const last = r.cells[r.good - 1]?.v || "1";
  let msg;
  if(r.status === "ok") msg = `<b>Doğru ✓</b> Yol bitiş durumunda (${esc(nm(cur.want[cur.want.length - 1]))}).`;
  else if(r.status === "prefix") msg = `Şu ana kadar doğru (${r.good} durum), ama yol bitmedi: son durum henüz bitiş durumu değil.`;
  else if(r.status === "long") msg = `Yol ${esc(nm(cur.want[cur.want.length - 1]))} durumunda bitiyor; sonrası fazla.`;
  else{
    const v = r.cells[r.bad].v;
    msg = `<b>${r.bad + 1}. durum yanlış.</b> ${esc(last)} durumundan ${esc(v)} durumuna ${edgesFrom(last).includes(v) ? "kenar var, ama sıradaki ek için başka bir kenar gerekir." : "kenar yok."}`;
  }
  return typedChips + `<p class="fq-msg ${r.status === "ok" ? "ok" : ""}">${msg}${r.prefixed ? ' <span class="muted">(1 başlangıç durumu başa eklendi)</span>' : ""}</p>`;
}
function answerHTML(){
  if(!FQ.reveal || !cur?.t) return "";
  return `<h4 style="margin:14px 0 6px">Cevap <small class="muted">Sample.pdf biçimi</small></h4><pre class="mp-fsm">${esc(sampleLines(cur.t).join("\n"))}</pre>
    <p class="muted" style="font-size:.84rem;margin:4px 0 0">${esc(cur.want.map(nm).join(" → "))}${cur.t.steps.some(s => s.assumed) ? " · (varsayım) ile işaretli kenar şekilde yok" : ""}</p>`;
}
function render(keepOwn = false){
  if(!box) return;
  if(!cur) fresh();
  const seg = `<div class="seg" role="group" aria-label="Kaynak"><button data-fq="src" data-s="pool" aria-pressed="${FQ.src === "pool"}">Hazır örnekler</button><button data-fq="src" data-s="own" aria-pressed="${FQ.src === "own"}">Kendi çözümlemem</button></div>`;
  const own = FQ.src === "own" ? `<label class="field sm" style="margin-top:10px">Çözümleme<input id="fqOwn" type="text" autocomplete="off" spellcheck="false" value="${esc(FQ.own)}" placeholder="örn. gel+Verb+Pos+Past+A1sg"></label>` : "";
  let body;
  if(!cur) body = `<p class="muted">Bir çözümleme yaz.</p>`;
  else if(cur.err) body = `<div class="notice warn" style="margin-top:12px">${esc(cur.err)}</div>`;
  else{
    const done = FQ.checked?.status === "ok" || FQ.reveal;
    body = `<p class="mp-q" style="margin:14px 0 4px">Çözümleme: <span class="mp-lex" style="display:inline;font-size:1.05rem">${esc(cur.lex)}</span></p>
      <p class="muted" style="margin:0 0 8px;font-size:.88rem">${FQ.src === "pool" ? (VERIFIED.has(cur.lex) ? "Cevap anahtarı Sample.pdf ile birebir doğrulandı." : "Cevap anahtarı şekillerden elle kodlandı; Sample.pdf'te bu yol yok, şekille karşılaştır.") : "Cevap anahtarı şekillerden elle kodlandı."} Başlangıç durumu 1'den bitiş durumuna kadar durum numaralarını sırayla yaz (sıfır morfemleri de say).</p>
      <div class="pair" style="grid-template-columns:1fr auto auto auto"><label class="field sm"><input id="fqIn" type="text" autocomplete="off" spellcheck="false" placeholder="örn. 1 2 3 4 5 6" value="${esc(FQ.typed)}" ${done ? "disabled" : ""}></label>
        <button class="btn pri sm" data-fq="check" ${done ? "disabled" : ""}>Kontrol et</button><button class="btn sm" data-fq="hint" ${done ? "disabled" : ""}>İpucu</button><button class="btn sm ghost" data-fq="reveal" ${FQ.reveal ? "disabled" : ""}>Cevabı göster</button></div>
      ${FQ.hintMsg && !done ? `<p class="fq-msg hint">${esc(FQ.hintMsg)}</p>` : ""}
      ${feedback()}${answerHTML()}
      ${FQ.checked || FQ.reveal ? `<button class="btn pri sm" data-fq="next" style="margin-top:12px">Sonraki</button>` : ""}`;
  }
  box.innerHTML = `<div class="row" style="margin-bottom:6px">${seg}<span class="muted" style="font-size:.9rem">${FQ.score} / ${FQ.n} doğru</span></div>${own}${body}${mapHTML()}`;
  const i = $(keepOwn ? "#fqOwn" : "#fqIn", box); if(i && !i.disabled){ i.focus(); const v = i.value; i.value = ""; i.value = v; }
}
const typedList = () => (FQ.typed.match(/\d+/g) || []);
function count(ok){ if(FQ.counted) return; FQ.counted = true; FQ.n++; if(ok && !FQ.hint) FQ.score++; }
function check(){
  const typed = typedList();
  if(!typed.length) return;
  const r = FQ.checked = checkPath(cur.want, typed);
  FQ.hintMsg = "";
  count(r.status === "ok");
}
function onClick(e){
  const b = e.target.closest("[data-fq]"); if(!b) return;
  const d = b.dataset;
  if(d.fq === "src"){ FQ.src = d.s; cur = null; render(); return; }
  if(d.fq === "next"){ if(FQ.src === "pool") FQ.i = pick(); cur = null; render(); return; }
  if(!cur?.want) return;
  if(d.fq === "check"){ FQ.typed = $("#fqIn", box).value; check(); render(); }
  else if(d.fq === "hint"){
    FQ.typed = $("#fqIn", box).value;
    const r = checkPath(cur.want, typedList()), k = Math.min(r.good, cur.want.length - 1);
    if(FQ.hint === 0){ FQ.hint = 1; FQ.hintMsg = `${nm(cur.want[Math.max(0, r.good - 1)])} durumundan çıkan kenarlar → ${edgesText(cur.want[Math.max(0, r.good - 1)])}`; }   // önce çıkan kenarlar
    else{ FQ.typed = cur.want.slice(0, k + 1).join(" "); FQ.hint++; FQ.hintMsg = "Sıradaki durum yazıldı."; FQ.checked = null; }
    render();
  }
  else if(d.fq === "reveal"){ FQ.reveal = true; count(false); render(); }
}

export function mountFsmQuiz(el){
  box = el;
  box.addEventListener("click", onClick);
  box.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.id === "fqIn") box.querySelector('[data-fq="check"]')?.click(); });
  let t;
  box.addEventListener("input", e => {
    if(e.target.id === "fqOwn"){ FQ.own = e.target.value; clearTimeout(t); t = setTimeout(() => { cur = null; render(true); }, 350); }
    else if(e.target.id === "fqIn") FQ.typed = e.target.value;
  });
  return {render};
}
